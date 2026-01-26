/**
 * Standard tool component interface
 * All tools must implement this interface
 */

export interface ToolComponentProps {
  taskId: string;
  toolId?: number;
  subTabs?: Array<{
    id: number;
    name: string;
    code: string;
    icon?: string;
    sortOrder: number;
  }>;
  initialNoteId?: number;
}

export type ToolComponent = React.ComponentType<ToolComponentProps>;

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

export interface ToolModule {
  component: ToolComponent;
  config: ToolModuleConfig;
}

