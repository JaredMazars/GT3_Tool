import { TaskType } from '@/types';
import type { ToolConfig, ToolMetadata, ToolAvailability, IToolRegistry } from './types';

/**
 * Tool Registry
 * Central registry for managing task tools
 */
class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolMetadata> = new Map();

  /**
   * Register a tool in the registry
   */
  register(config: ToolConfig): void {
    if (this.tools.has(config.id)) {
      throw new Error(`Tool with id "${config.id}" is already registered`);
    }

    const metadata: ToolMetadata = {
      id: config.id,
      registeredAt: new Date(),
      config,
    };

    this.tools.set(config.id, metadata);
  }

  /**
   * Get a tool by its ID
   */
  getTool(id: string): ToolConfig | undefined {
    const metadata = this.tools.get(id);
    return metadata?.config;
  }

  /**
   * Get all tools available for a specific task type
   */
  getToolsForTaskType(taskType: TaskType): ToolConfig[] {
    const tools: ToolConfig[] = [];

    for (const metadata of this.tools.values()) {
      if (
        metadata.config.enabled &&
        metadata.config.taskTypes.includes(taskType)
      ) {
        tools.push(metadata.config);
      }
    }

    return tools;
  }

  /**
   * Check if a tool is available for a specific task type
   */
  isToolAvailable(toolId: string, taskType: TaskType): ToolAvailability {
    const tool = this.getTool(toolId);

    if (!tool) {
      return {
        available: false,
        reason: `Tool "${toolId}" not found in registry`,
      };
    }

    if (!tool.enabled) {
      return {
        available: false,
        reason: `Tool "${toolId}" is disabled`,
        tool,
      };
    }

    if (!tool.taskTypes.includes(taskType)) {
      return {
        available: false,
        reason: `Tool "${toolId}" is not available for task type "${taskType}"`,
        tool,
      };
    }

    return {
      available: true,
      tool,
    };
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolConfig[] {
    return Array.from(this.tools.values()).map((metadata) => metadata.config);
  }

  /**
   * Unregister a tool
   */
  unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  /**
   * Clear all tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
  }
}

// Singleton instance
const toolRegistry = new ToolRegistry();

export { toolRegistry };
export default toolRegistry;

/**
 * Utility function to check if a tool is available for a task
 * Throws an error if the tool is not available
 */
export function requireTool(toolId: string, taskType: TaskType): ToolConfig {
  const availability = toolRegistry.isToolAvailable(toolId, taskType);

  if (!availability.available) {
    throw new Error(
      availability.reason || `Tool "${toolId}" is not available`
    );
  }

  return availability.tool!;
}

/**
 * Utility function to get all tools for a task type
 */
export function getTaskTools(taskType: TaskType): ToolConfig[] {
  return toolRegistry.getToolsForTaskType(taskType);
}

/**
 * Utility function to check if any tool handles a specific API route
 */
export function getToolForRoute(route: string): ToolConfig | undefined {
  const allTools = toolRegistry.getAllTools();

  for (const tool of allTools) {
    if (!tool.enabled) continue;

    // Check if route starts with the tool's base path
    if (route.startsWith(tool.apiRoutes.basePath)) {
      return tool;
    }

    // Check specific endpoints
    for (const endpoint of tool.apiRoutes.endpoints) {
      if (route.includes(endpoint)) {
        return tool;
      }
    }
  }

  return undefined;
}








