/**
 * Tool Configuration
 * Defines metadata and configuration for a task tool
 */
export interface ToolConfig {
  /** Unique identifier for the tool */
  id: string;
  
  /** Display name of the tool */
  name: string;
  
  /** Description of what the tool does */
  description: string;
  
  /** Service lines that can use this tool */
  serviceLines: string[];
  
  /** API routes associated with this tool */
  apiRoutes: {
    /** Base path for the tool's API routes */
    basePath: string;
    
    /** Specific endpoints provided by this tool */
    endpoints: string[];
  };
  
  /** Required permissions to use this tool */
  permissions?: {
    /** Feature permission required */
    feature?: string;
    
    /** Minimum task role required */
    taskRole?: 'VIEWER' | 'EDITOR' | 'REVIEWER' | 'ADMIN';
  };
  
  /** Whether the tool is enabled */
  enabled: boolean;
  
  /** Tool version */
  version: string;
}

/**
 * Tool Metadata
 * Additional information about a tool
 */
export interface ToolMetadata {
  /** Tool identifier */
  id: string;
  
  /** When the tool was registered */
  registeredAt: Date;
  
  /** Tool configuration */
  config: ToolConfig;
}

/**
 * Tool Availability Check Result
 */
export interface ToolAvailability {
  /** Whether the tool is available */
  available: boolean;
  
  /** Reason if not available */
  reason?: string;
  
  /** Tool configuration if available */
  tool?: ToolConfig;
}

/**
 * Tool Registry Interface
 */
export interface IToolRegistry {
  /** Register a tool */
  register(config: ToolConfig): void;
  
  /** Get a tool by ID */
  getTool(id: string): ToolConfig | undefined;
  
  /** Get all tools for a service line */
  getToolsForServiceLine(serviceLine: string): ToolConfig[];
  
  /** Check if a tool is available for a service line */
  isToolAvailable(toolId: string, serviceLine: string): ToolAvailability;
  
  /** Get all registered tools */
  getAllTools(): ToolConfig[];
  
  /** Unregister a tool */
  unregister(id: string): boolean;
}
