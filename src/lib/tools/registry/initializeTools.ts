import { toolRegistry } from './toolRegistry';
import { taxCalculationToolConfig } from '../tax-calculation/config';
import { taxOpinionToolConfig } from '../tax-opinion/config';

/**
 * Initialize and register all tools
 * Call this during application startup
 */
export function initializeTools() {
  // Register Tax Calculation Tool
  toolRegistry.register(taxCalculationToolConfig);

  // Register Tax Opinion Tool
  toolRegistry.register(taxOpinionToolConfig);
}

/**
 * Get all registered tools
 */
export function getRegisteredTools() {
  return toolRegistry.getAllTools();
}







































