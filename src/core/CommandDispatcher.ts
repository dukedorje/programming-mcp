/**
 * Command Dispatcher - Replaces the monolithic switch statement
 * Routes MCP requests to appropriate tool commands with structured error handling
 */

import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { 
  ToolCommand, 
  CommandContext, 
  ToolExecutionResult,
  ToolNotFoundError,
  ToolValidationError,
  ToolExecutionError,
  ToolTimeoutError,
  ToolError,
  MCPToolResponse
} from './ToolCommand.js';
import { ToolRegistry } from './ToolRegistry.js';
import { eventBus, type EventBus } from '../infra/eventBus.js';
import { ZodError } from 'zod';

export interface DispatcherConfig {
  /** Default execution timeout in milliseconds */
  defaultTimeout?: number;
  /** Enable execution tracing */
  enableTracing?: boolean;
  /** Maximum concurrent executions */
  maxConcurrentExecutions?: number;
}

export class CommandDispatcher {
  private readonly registry: ToolRegistry;
  private readonly eventBus: EventBus;
  private readonly config: Required<DispatcherConfig>;
  private activeExecutions = new Map<string, { toolName: string; startTime: number }>();
  private executionCounter = 0;

  constructor(
    registry: ToolRegistry,
    eventBusInstance?: EventBus,
    config: DispatcherConfig = {}
  ) {
    this.registry = registry;
    this.eventBus = eventBusInstance || eventBus;
    this.config = {
      defaultTimeout: config.defaultTimeout || 30000, // 30 seconds
      enableTracing: config.enableTracing ?? true,
      maxConcurrentExecutions: config.maxConcurrentExecutions || 10
    };
  }

  /**
   * Dispatch an MCP tool request to the appropriate command
   */
  async dispatch(request: CallToolRequest): Promise<MCPToolResponse> {
    const { name: toolName, arguments: args } = request.params;
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check concurrent execution limit
      if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
        throw new ToolError(
          `Maximum concurrent executions (${this.config.maxConcurrentExecutions}) reached`,
          'RESOURCE_ERROR',
          toolName
        );
      }

      // Get the tool command
      const tool = this.registry.get(toolName);
      if (!tool) {
        throw new ToolNotFoundError(toolName);
      }

      // Track active execution
      this.activeExecutions.set(requestId, { toolName, startTime });

      // Emit execution start event
      this.eventBus.emit('tool:execute:start', {
        name: toolName,
        requestId,
        args
      });

      // Execute the tool with timeout
      const result = await this.executeWithTimeout(tool, args, requestId, startTime);

      // Clean up active execution tracking
      this.activeExecutions.delete(requestId);

      // Emit execution end event
      const executionTime = Date.now() - startTime;
      this.eventBus.emit('tool:execute:end', {
        name: toolName,
        requestId,
        success: result.success,
        executionTime
      });

      // Return MCP-compatible response
      if (result.success && result.result) {
        return this.formatMCPResponse(result.result);
      } else {
        throw result.error || new ToolExecutionError(toolName, 'Unknown execution error');
      }

    } catch (error) {
      // Clean up active execution tracking
      this.activeExecutions.delete(requestId);

      // Convert to ToolError if not already
      const toolError = this.normalizeError(error, toolName);

      // Emit error event
      this.eventBus.emit('tool:error', {
        name: toolName,
        error: toolError,
        requestId
      });

      // Emit execution end event with failure
      const executionTime = Date.now() - startTime;
      this.eventBus.emit('tool:execute:end', {
        name: toolName,
        requestId,
        success: false,
        executionTime
      });

      // Return error response in MCP format
      return this.formatErrorResponse(toolError);
    }
  }

  /**
   * Execute a tool with timeout and validation
   */
  private async executeWithTimeout<TArgs, TResult>(
    tool: ToolCommand<TArgs, TResult>,
    args: unknown,
    requestId: string,
    startTime: number
  ): Promise<ToolExecutionResult<TResult>> {
    try {
      // Validate arguments using tool's schema
      let validatedArgs: TArgs;
      try {
        validatedArgs = tool.schema.parse(args);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ToolValidationError(
            tool.name,
            `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            error
          );
        }
        throw new ToolValidationError(tool.name, 'Failed to validate arguments', error as Error);
      }

      // Create execution context
      const context: CommandContext = {
        eventBus: this.eventBus,
        requestId,
        startTime,
        config: tool.metadata?.constraints
      };

      // Determine timeout (tool-specific or default)
      const timeout = tool.metadata?.constraints?.maxExecutionTime || this.config.defaultTimeout;

      // Execute with timeout
      const result = await this.withTimeout(
        tool.execute(validatedArgs, context),
        timeout,
        tool.name
      );

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        metadata: {
          toolName: tool.name,
          version: tool.version,
          requestId
        }
      };

    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error, tool.name),
        executionTime: Date.now() - startTime,
        metadata: {
          toolName: tool.name,
          version: tool.version,
          requestId
        }
      };
    }
  }

  /**
   * Execute a promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    toolName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ToolTimeoutError(toolName, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Normalize errors to ToolError instances
   */
  private normalizeError(error: unknown, toolName: string): ToolError {
    if (error instanceof ToolError) {
      return error;
    }

    if (error instanceof Error) {
      return new ToolExecutionError(toolName, error.message, error);
    }

    return new ToolExecutionError(toolName, String(error));
  }

  /**
   * Format successful result as MCP response
   */
  private formatMCPResponse(result: unknown): MCPToolResponse {
    // If result is already in MCP format, return as-is
    if (this.isMCPResponse(result)) {
      return result as MCPToolResponse;
    }

    // Convert to MCP format
    return {
      content: [{
        type: "text",
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }]
    };
  }

  /**
   * Format error as MCP response
   */
  private formatErrorResponse(error: ToolError): MCPToolResponse {
    const errorMessage = this.config.enableTracing 
      ? `${error.message}\n\nError Code: ${error.code}\nTool: ${error.toolName || 'unknown'}`
      : error.message;

    return {
      content: [{
        type: "text",
        text: `Error: ${errorMessage}`
      }]
    };
  }

  /**
   * Check if result is already in MCP response format
   */
  private isMCPResponse(result: unknown): boolean {
    return (
      typeof result === 'object' &&
      result !== null &&
      'content' in result &&
      Array.isArray((result as any).content)
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.executionCounter}`;
  }

  /**
   * Get active executions for monitoring
   */
  getActiveExecutions(): ReadonlyMap<string, { toolName: string; startTime: number }> {
    return new Map(this.activeExecutions);
  }

  /**
   * Get dispatcher statistics
   */
  getStats(): {
    activeExecutions: number;
    totalExecutions: number;
    averageExecutionTime: number;
    errorRate: number;
  } {
    // This would need execution history tracking for accurate stats
    // For now, return basic info
    return {
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionCounter,
      averageExecutionTime: 0, // Would need history tracking
      errorRate: 0 // Would need error tracking
    };
  }

  /**
   * Create dispatcher with default configuration
   */
  static create(registry: ToolRegistry, config?: DispatcherConfig): CommandDispatcher {
    return new CommandDispatcher(registry, eventBus, config);
  }
}

/**
 * Create a simple dispatch function for MCP server integration
 */
export function createDispatchHandler(
  registry: ToolRegistry,
  config?: DispatcherConfig
): (request: CallToolRequest) => Promise<MCPToolResponse> {
  const dispatcher = new CommandDispatcher(registry, eventBus, config);
  return (request: CallToolRequest) => dispatcher.dispatch(request);
}
