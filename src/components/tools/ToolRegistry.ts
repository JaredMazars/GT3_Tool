/**
 * Modular Tool Registry
 * Auto-discovers and maps tool codes to their React components
 * 
 * To add a new tool:
 * 1. Create a tool directory under src/components/tools/{ToolName}/
 * 2. Export the tool component and config from index.tsx
 * 3. Import and register it in the TOOL_MODULES array below
 * 
 * The registry will automatically map tool codes to components.
 */

import { TaxCalculationTool, taxCalculationToolConfig } from './TaxCalculationTool';
import { TaxAdvisoryTool, taxAdvisoryToolConfig } from './TaxAdvisoryTool';
import { TaxComplianceTool, taxComplianceToolConfig } from './TaxComplianceTool';
import { ReviewNotebookTool, reviewNotebookToolConfig } from './ReviewNotebookTool';
import type { ToolComponent, ToolComponentProps, ToolModule, ToolModuleConfig } from './types';

/**
 * Tool Module Registry
 * Each tool module exports both its component and config
 * This allows for auto-discovery and type-safe tool access
 */
const TOOL_MODULES: ToolModule[] = [
  {
    component: TaxCalculationTool,
    config: taxCalculationToolConfig,
  },
  {
    component: TaxAdvisoryTool,
    config: taxAdvisoryToolConfig,
  },
  {
    component: TaxComplianceTool,
    config: taxComplianceToolConfig,
  },
  {
    component: ReviewNotebookTool,
    config: reviewNotebookToolConfig,
  },
];

/**
 * Registry mapping tool codes to their components
 * Built automatically from TOOL_MODULES
 */
const TOOL_REGISTRY: Record<string, ToolComponent> = {};

// Build registry from modules
TOOL_MODULES.forEach((module) => {
  TOOL_REGISTRY[module.config.code] = module.component;
});

/**
 * Get a tool component by its code
 * @param code - Tool code (must match DB tool.code)
 * @returns Tool component or null if not found
 */
export function getToolComponent(code: string): ToolComponent | null {
  return TOOL_REGISTRY[code] || null;
}

/**
 * Check if a tool code is registered
 * @param code - Tool code to check
 * @returns true if tool is registered
 */
export function isToolRegistered(code: string): boolean {
  return code in TOOL_REGISTRY;
}

/**
 * Get all registered tool codes
 * @returns Array of registered tool codes
 */
export function getRegisteredToolCodes(): string[] {
  return Object.keys(TOOL_REGISTRY);
}

/**
 * Get tool config by code
 * @param code - Tool code
 * @returns Tool config or null if not found
 */
export function getToolConfig(code: string): ToolModuleConfig | null {
  const module = TOOL_MODULES.find((m) => m.config.code === code);
  return module?.config || null;
}

/**
 * Get all tool modules
 * @returns Array of all registered tool modules
 */
export function getAllToolModules(): ToolModule[] {
  return TOOL_MODULES;
}

// Re-export types for convenience
export type { ToolComponent, ToolComponentProps, ToolModule, ToolModuleConfig } from './types';





