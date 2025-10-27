/**
 * EventBus wrapper for MCP tool system
 * Extends the provided EventBus with tool-specific event types
 */

type EventHandler<T = any> = (data: T) => void;

// Track listener sources for debugging and cleanup verification
type ListenerSource = {
  handler: EventHandler;
  source?: string; // Component name or identifier
  createdAt: number;
};

class EventBus {
  private listeners: Map<string, Set<ListenerSource>> = new Map();
  private totalListenerCount = 0;

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    source?: string
  ): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }

    const listenerSource: ListenerSource = {
      handler,
      source,
      createdAt: Date.now(),
    };

    const handlers = this.listeners.get(event as string)!;
    handlers.add(listenerSource);
    this.totalListenerCount++;

    // Return unsubscribe function
    return () => {
      const removed = handlers.delete(listenerSource);
      if (removed) {
        this.totalListenerCount--;
      }
      if (handlers.size === 0) {
        this.listeners.delete(event as string);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((listenerSource) => {
        try {
          listenerSource.handler(data);
        } catch (error) {
          console.error(
            `Error in event handler for ${String(event)} (source: ${
              listenerSource.source || "unknown"
            }):`,
            error
          );
        }
      });
    }
  }

  /**
   * Subscribe to an event only once
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    source?: string
  ): () => void {
    const unsubscribe = this.on(
      event,
      (data) => {
        handler(data);
        unsubscribe();
      },
      source
    );
    return unsubscribe;
  }

  /**
   * Remove all listeners for an event or all events
   */
  off<K extends keyof EventMap>(event?: K): void {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event as string)?.size || 0;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners<K extends keyof EventMap>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get total listener count across all events
   */
  getTotalListenerCount(): number {
    return this.totalListenerCount;
  }

  /**
   * Get debug information about current listeners
   */
  getDebugInfo(): {
    totalListeners: number;
    eventCounts: Record<string, number>;
    oldListeners: Array<{ event: string; source?: string; age: number }>;
  } {
    const eventCounts: Record<string, number> = {};
    const oldListeners: Array<{ event: string; source?: string; age: number }> =
      [];
    const now = Date.now();
    const OLD_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    this.listeners.forEach((handlers, event) => {
      eventCounts[event] = handlers.size;
      handlers.forEach((listener) => {
        const age = now - listener.createdAt;
        if (age > OLD_THRESHOLD) {
          oldListeners.push({
            event,
            source: listener.source,
            age: Math.round(age / 1000), // in seconds
          });
        }
      });
    });

    return {
      totalListeners: this.totalListenerCount,
      eventCounts,
      oldListeners,
    };
  }
}

// =============================================================================
// MCP TOOL EVENT DEFINITIONS
// =============================================================================

export interface ToolEventMap {
  // Tool lifecycle events
  "tool:registered": {
    name: string;
    version?: string;
    source: string;
  };
  "tool:unregistered": {
    name: string;
    reason?: string;
  };
  "tool:execute:start": {
    name: string;
    requestId?: string;
    args: any;
  };
  "tool:execute:end": {
    name: string;
    requestId?: string;
    success: boolean;
    executionTime: number;
  };
  "tool:error": {
    name: string;
    error: Error;
    requestId?: string;
  };
  "tool:lifecycle": {
    name: string;
    state: "loading" | "ready" | "error" | "unloading" | "disposed";
    metadata?: any;
  };
  "tool:health": {
    name: string;
    status: {
      healthy: boolean;
      message?: string;
      lastChecked: number;
    };
  };

  // Registry events
  "registry:initialized": {
    toolCount: number;
  };
  "registry:discovery:start": {
    source: string;
  };
  "registry:discovery:complete": {
    source: string;
    discovered: number;
    errors: number;
  };

  // System events
  "system:startup": {
    timestamp: number;
    version: string;
  };
  "system:shutdown": {
    timestamp: number;
    reason?: string;
  };
  "system:error": {
    error: Error;
    context?: string;
  };
}

// Merge with the original EventMap type if it exists
declare global {
  interface EventMap extends ToolEventMap {}
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const eventBus = new EventBus();

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

if (process.env.NODE_ENV === "development") {
  // Log all tool events in development
  const originalEmit = eventBus.emit.bind(eventBus);
  eventBus.emit = function (event: any, data: any) {
    if (
      String(event).startsWith("tool:") ||
      String(event).startsWith("registry:")
    ) {
      console.error(`[MCP EventBus] ${String(event)}:`, data);
    }
    return originalEmit(event, data);
  };

  // Add to global for debugging
  if (typeof globalThis !== "undefined") {
    (globalThis as any).__mcpEventBus = eventBus;
  }
}

export type { EventBus };
export { EventBus as EventBusClass };
