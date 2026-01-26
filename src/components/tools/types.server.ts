/**
 * Server-Safe Tool Types
 * Contains only types that don't require React
 * Safe to import in API routes and server components
 */

export interface ToolModuleConfig {
  code: string;
  name: string;
  description: string;
  version: string;
  defaultSubTabs?: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
}

