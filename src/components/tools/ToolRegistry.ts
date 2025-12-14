/**
 * Tool Registry
 * Maps tool codes to their React components
 */

import { TaxCalculationTool } from './TaxCalculationTool';
import { TaxAdvisoryTool } from './TaxAdvisoryTool';
import { TaxComplianceTool } from './TaxComplianceTool';

export interface ToolComponentProps {
  taskId: string;
}

export type ToolComponent = React.ComponentType<ToolComponentProps>;

/**
 * Registry mapping tool codes to their components
 */
export const TOOL_REGISTRY: Record<string, ToolComponent> = {
  TAX_CALC: TaxCalculationTool,
  TAX_ADV: TaxAdvisoryTool,
  TAX_COMP: TaxComplianceTool,
};

/**
 * Get a tool component by its code
 */
export function getToolComponent(code: string): ToolComponent | null {
  return TOOL_REGISTRY[code] || null;
}

/**
 * Check if a tool code is registered
 */
export function isToolRegistered(code: string): boolean {
  return code in TOOL_REGISTRY;
}

/**
 * Get all registered tool codes
 */
export function getRegisteredToolCodes(): string[] {
  return Object.keys(TOOL_REGISTRY);
}
