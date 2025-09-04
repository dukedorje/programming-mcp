/**
 * Tool Registry - Central hub for managing MCP tool commands
 * Implements the Command pattern with EventBus integration
 */

import { 
  ToolCommand, 
  ToolRegistration, 
  ToolLifecycle, 
  ToolNotFoundError, 
  DuplicateToolError,
  ToolError,
  ToolHealthStatus
} from './ToolCommand.js';
import { eventBus, type EventBus } from '../infra/eventBus.js';

export class ToolRegistry {
  private tools = new Map<string, ToolRegistration>();
  private healthCache = new Map<string, ToolHealthStatus>();
  private readonly eventBus: EventBus;

  constructor(eventBusInstance?: EventBus) {
    this.eventBus = eventBusInstance || eventBus;
    
    // Listen for system events
    this.eventBus.on('system:shutdown', this.handleShutdown.bind(this), 'ToolRegistry');
  }

  /**
   * Register a new tool command
   */
  async register(tool: ToolCommand, source: string = 'unknown'): Promise<void> {
    if (this.tools.has(tool.name)) {
      throw new DuplicateToolError(tool.name);
    }

    // Create registration record
    const registration: ToolRegistration = {
      tool,
      registeredAt: Date.now(),
      source,
      enabled: true
    };

    // Emit lifecycle event
    this.eventBus.emit('tool:lifecycle', {
      name: tool.name,
      state: ToolLifecycle.LOADING,
      metadata: { source, version: tool.version }
    });

    try {
      // Call onLoad hook if present
      if (tool.onLoad) {
        await tool.onLoad();
      }

      // Register the tool
      this.tools.set(tool.name, registration);

      // Update lifecycle state
      this.eventBus.emit('tool:lifecycle', {
        name: tool.name,
        state: ToolLifecycle.READY
      });

      // Emit registration event
      this.eventBus.emit('tool:registered', {
        name: tool.name,
        version: tool.version,
        source
      });

      console.log(`✅ Tool '${tool.name}' registered from ${source}`);
    } catch (error) {
      // Handle registration failure
      this.eventBus.emit('tool:lifecycle', {
        name: tool.name,
        state: ToolLifecycle.ERROR,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      this.eventBus.emit('tool:error', {
        name: tool.name,
        error: error instanceof Error ? error : new Error(String(error))
      });

      throw new ToolError(
        `Failed to register tool '${tool.name}': ${error instanceof Error ? error.message : String(error)}`,
        'EXECUTION_ERROR',
        tool.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Unregister a tool command
   */
  async unregister(name: string, reason?: string): Promise<boolean> {
    const registration = this.tools.get(name);
    if (!registration) {
      return false;
    }

    // Emit lifecycle event
    this.eventBus.emit('tool:lifecycle', {
      name,
      state: ToolLifecycle.UNLOADING,
      metadata: { reason }
    });

    try {
      // Call onUnload hook if present
      if (registration.tool.onUnload) {
        await registration.tool.onUnload();
      }

      // Remove from registry
      this.tools.delete(name);
      this.healthCache.delete(name);

      // Update lifecycle state
      this.eventBus.emit('tool:lifecycle', {
        name,
        state: ToolLifecycle.DISPOSED
      });

      // Emit unregistration event
      this.eventBus.emit('tool:unregistered', {
        name,
        reason
      });

      console.log(`❌ Tool '${name}' unregistered${reason ? `: ${reason}` : ''}`);
      return true;
    } catch (error) {
      // Handle unload failure
      this.eventBus.emit('tool:error', {
        name,
        error: error instanceof Error ? error : new Error(String(error))
      });

      // Force removal even if unload fails
      this.tools.delete(name);
      this.healthCache.delete(name);

      console.warn(`⚠️ Tool '${name}' forcibly removed due to unload error:`, error);
      return true;
    }
  }

  /**
   * Get a registered tool by name
   */
  get(name: string): ToolCommand | undefined {
    const registration = this.tools.get(name);
    return registration?.enabled ? registration.tool : undefined;
  }

  /**
   * Get tool registration info
   */
  getRegistration(name: string): ToolRegistration | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tools
   */
  list(): ToolCommand[] {
    return Array.from(this.tools.values())
      .filter(reg => reg.enabled)
      .map(reg => reg.tool);
  }

  /**
   * List all tool registrations (including disabled)
   */
  listRegistrations(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names only
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    categories: Record<string, number>;
    sources: Record<string, number>;
  } {
    const registrations = Array.from(this.tools.values());
    const categories: Record<string, number> = {};
    const sources: Record<string, number> = {};

    registrations.forEach(reg => {
      // Count categories
      const category = reg.tool.metadata?.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;

      // Count sources
      sources[reg.source] = (sources[reg.source] || 0) + 1;
    });

    return {
      totalTools: registrations.length,
      enabledTools: registrations.filter(r => r.enabled).length,
      disabledTools: registrations.filter(r => !r.enabled).length,
      categories,
      sources
    };
  }

  /**
   * Enable/disable a tool
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const registration = this.tools.get(name);
    if (!registration) {
      return false;
    }

    registration.enabled = enabled;
    
    this.eventBus.emit('tool:lifecycle', {
      name,
      state: enabled ? ToolLifecycle.READY : ToolLifecycle.DISPOSED,
      metadata: { enabled }
    });

    return true;
  }

  /**
   * Check tool health
   */
  async checkHealth(name: string, useCache: boolean = true): Promise<ToolHealthStatus> {
    const registration = this.tools.get(name);
    if (!registration) {
      throw new ToolNotFoundError(name);
    }

    // Check cache first
    if (useCache) {
      const cached = this.healthCache.get(name);
      if (cached && (Date.now() - cached.lastChecked) < 30000) { // 30 second cache
        return cached;
      }
    }

    let healthStatus: ToolHealthStatus = {
      healthy: true,
      lastChecked: Date.now()
    };

    try {
      // Use tool's health check if available
      if (registration.tool.healthCheck) {
        healthStatus = await registration.tool.healthCheck();
      }
    } catch (error) {
      healthStatus = {
        healthy: false,
        message: error instanceof Error ? error.message : String(error),
        lastChecked: Date.now()
      };
    }

    // Cache result
    this.healthCache.set(name, healthStatus);

    // Emit health event
    this.eventBus.emit('tool:health', {
      name,
      status: healthStatus
    });

    return healthStatus;
  }

  /**
   * Check health of all tools
   */
  async checkAllHealth(): Promise<Record<string, ToolHealthStatus>> {
    const results: Record<string, ToolHealthStatus> = {};
    const names = this.getToolNames();

    await Promise.allSettled(
      names.map(async name => {
        try {
          results[name] = await this.checkHealth(name, false);
        } catch (error) {
          results[name] = {
            healthy: false,
            message: error instanceof Error ? error.message : String(error),
            lastChecked: Date.now()
          };
        }
      })
    );

    return results;
  }

  /**
   * Clear all tools (for testing or shutdown)
   */
  async clear(): Promise<void> {
    const names = Array.from(this.tools.keys());
    
    await Promise.allSettled(
      names.map(name => this.unregister(name, 'registry cleared'))
    );
  }

  /**
   * Handle system shutdown
   */
  private async handleShutdown(): Promise<void> {
    console.log('🔄 ToolRegistry: Shutting down, unregistering all tools...');
    await this.clear();
    console.log('✅ ToolRegistry: Shutdown complete');
  }

  /**
   * Create a new registry instance (for testing)
   */
  static create(eventBusInstance?: EventBus): ToolRegistry {
    return new ToolRegistry(eventBusInstance);
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
