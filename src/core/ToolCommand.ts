/**
 * Core types and interfaces for the MCP Tool Command system
 * Follows the Command pattern for pluggable tool architecture
 */

import { z } from "zod";
import type { EventBus } from "../infra/eventBus.js";

/**
 * Context provided to each tool execution
 */
export interface CommandContext {
  /** Event bus for inter-tool communication */
  eventBus: EventBus;
  /** Request metadata */
  requestId?: string;
  /** Tool execution start time */
  startTime: number;
  /** Tool-specific configuration */
  config?: Record<string, any>;
}

/**
 * Tool command interface - all MCP tools must implement this
 */
export interface ToolCommand<TArgs = any, TResult = any> {
  /** Unique tool identifier */
  readonly name: string;
  
  /** Human-readable description */
  readonly description: string;
  
  /** Zod schema for argument validation */
  readonly schema: z.ZodSchema<TArgs>;
  
  /** Tool version (semantic versioning) */
  readonly version?: string;
  
  /** Tool metadata */
  readonly metadata?: ToolMetadata;
  
  /** Execute the tool with validated arguments */
  execute(args: TArgs, context: CommandContext): Promise<TResult>;
  
  /** Optional lifecycle hooks */
  onLoad?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
  
  /** Health check for the tool */
  healthCheck?(): Promise<ToolHealthStatus>;
}

/**
 * Tool metadata for discovery and management
 */
export interface ToolMetadata {
  /** Tool category */
  category?: string;
  
  /** Author information */
  author?: string;
  
  /** Tool tags for filtering */
  tags?: string[];
  
  /** Execution constraints */
  constraints?: {
    maxExecutionTime?: number; // milliseconds
    maxMemory?: number; // bytes
    requiresSandbox?: boolean;
  };
  
  /** Dependencies */
  dependencies?: string[];
  
  /** Configuration schema */
  configSchema?: z.ZodSchema<any>;
}

/**
 * Tool health status
 */
export interface ToolHealthStatus {
  healthy: boolean;
  message?: string;
  lastChecked: number;
  metrics?: {
    executionCount?: number;
    averageExecutionTime?: number;
    errorRate?: number;
  };
}

/**
 * Tool registration info
 */
export interface ToolRegistration {
  tool: ToolCommand;
  registeredAt: number;
  source: string; // file path or identifier
  enabled: boolean;
}

/**
 * Tool execution result wrapper
 */
export interface ToolExecutionResult<T = any> {
  success: boolean;
  result?: T;
  error?: ToolError;
  executionTime: number;
  metadata?: {
    toolName: string;
    version?: string;
    requestId?: string;
  };
}

/**
 * Base class for tool errors
 */
export class ToolError extends Error {
  constructor(
    message: string,
    public readonly code: ToolErrorCode,
    public readonly toolName?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

/**
 * Specific error types
 */
export class ToolNotFoundError extends ToolError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found`, 'TOOL_NOT_FOUND', toolName);
    this.name = 'ToolNotFoundError';
  }
}

export class DuplicateToolError extends ToolError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' is already registered`, 'DUPLICATE_TOOL', toolName);
    this.name = 'DuplicateToolError';
  }
}

export class ToolValidationError extends ToolError {
  constructor(toolName: string, validationMessage: string, cause?: Error) {
    super(`Validation failed for tool '${toolName}': ${validationMessage}`, 'VALIDATION_ERROR', toolName, cause);
    this.name = 'ToolValidationError';
  }
}

export class ToolExecutionError extends ToolError {
  constructor(toolName: string, executionMessage: string, cause?: Error) {
    super(`Execution failed for tool '${toolName}': ${executionMessage}`, 'EXECUTION_ERROR', toolName, cause);
    this.name = 'ToolExecutionError';
  }
}

export class ToolTimeoutError extends ToolError {
  constructor(toolName: string, timeout: number) {
    super(`Tool '${toolName}' execution timed out after ${timeout}ms`, 'TIMEOUT_ERROR', toolName);
    this.name = 'ToolTimeoutError';
  }
}

/**
 * Tool error codes
 */
export type ToolErrorCode = 
  | 'TOOL_NOT_FOUND'
  | 'DUPLICATE_TOOL'
  | 'VALIDATION_ERROR'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'SANDBOX_ERROR'
  | 'PERMISSION_ERROR'
  | 'RESOURCE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Tool lifecycle states
 */
export enum ToolLifecycle {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  UNLOADING = 'unloading',
  DISPOSED = 'disposed'
}

/**
 * Event types for tool system
 */
export interface ToolEventMap {
  'tool:registered': {
    name: string;
    version?: string;
    source: string;
  };
  'tool:unregistered': {
    name: string;
    reason?: string;
  };
  'tool:execute:start': {
    name: string;
    requestId?: string;
    args: any;
  };
  'tool:execute:end': {
    name: string;
    requestId?: string;
    success: boolean;
    executionTime: number;
  };
  'tool:error': {
    name: string;
    error: ToolError;
    requestId?: string;
  };
  'tool:lifecycle': {
    name: string;
    state: ToolLifecycle;
    metadata?: any;
  };
  'tool:health': {
    name: string;
    status: ToolHealthStatus;
  };
}

/**
 * Utility type for MCP tool responses
 */
export interface MCPToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}
