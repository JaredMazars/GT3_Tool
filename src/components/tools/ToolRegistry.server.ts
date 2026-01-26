/**
 * Server-Safe Tool Registry
 * Contains only tool configurations (no React components)
 * Safe to import in API routes and server components
 */

import { taxCalculationToolConfig } from './TaxCalculationTool/config';
import { taxAdvisoryToolConfig } from './TaxAdvisoryTool/config';
import { taxComplianceToolConfig } from './TaxComplianceTool/config';
import type { ToolModuleConfig } from './types.server';

/**
 * Tool Config Registry (Server-Safe)
 * Only contains configs, no React components
 */
const TOOL_CONFIGS: ToolModuleConfig[] = [
  taxCalculationToolConfig,
  taxAdvisoryToolConfig,
  taxComplianceToolConfig,
];

/**
 * Get all tool configs (server-safe)
 * @returns Array of all registered tool configs
 */
export function getAllToolConfigs(): ToolModuleConfig[] {
  return TOOL_CONFIGS;
}

/**
 * Get tool config by code (server-safe)
 * @param code - Tool code
 * @returns Tool config or null if not found
 */
export function getToolConfigByCode(code: string): ToolModuleConfig | null {
  return TOOL_CONFIGS.find((config) => config.code === code) || null;
}

/**
 * Get all registered tool codes (server-safe)
 * @returns Array of registered tool codes
 */
export function getRegisteredToolCodes(): string[] {
  return TOOL_CONFIGS.map((config) => config.code);
}

