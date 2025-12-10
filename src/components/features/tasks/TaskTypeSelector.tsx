'use client';

import { TaskType, ServiceLine } from '@/types';
import { formatTaskType } from '@/lib/utils/serviceLineUtils';
import { getTaskTypesForServiceLine } from '@/lib/utils/serviceLineUtils';

interface TaskTypeSelectorProps {
  value: TaskType;
  onChange: (type: TaskType) => void;
  serviceLine?: ServiceLine | string;
}

const PROJECT_TYPE_DESCRIPTIONS: Record<TaskType, string> = {
  // Tax
  [TaskType.TAX_CALCULATION]: 'Calculate tax liability and adjustments',
  [TaskType.TAX_OPINION]: 'Provide tax advice and opinions',
  [TaskType.TAX_ADMINISTRATION]: 'Tax compliance and administration',
  // Audit
  [TaskType.AUDIT_ENGAGEMENT]: 'Full audit engagement services',
  [TaskType.AUDIT_REVIEW]: 'Review and assess audit findings',
  [TaskType.AUDIT_REPORT]: 'Prepare audit reports and documentation',
  // Accounting
  [TaskType.FINANCIAL_STATEMENTS]: 'Prepare financial statements',
  [TaskType.BOOKKEEPING]: 'Bookkeeping and record keeping',
  [TaskType.MANAGEMENT_ACCOUNTS]: 'Management accounting and reporting',
  // Advisory
  [TaskType.ADVISORY_PROJECT]: 'General advisory services',
  [TaskType.CONSULTING_ENGAGEMENT]: 'Consulting and strategic advice',
  [TaskType.STRATEGY_REVIEW]: 'Strategic review and planning',
  // QRM
  [TaskType.QRM_AUDIT]: 'Quality and risk management audit',
  [TaskType.QRM_COMPLIANCE]: 'Compliance review and monitoring',
  [TaskType.QRM_RISK_ASSESSMENT]: 'Risk assessment and mitigation',
  // Business Development
  [TaskType.BD_CAMPAIGN]: 'Marketing campaign development',
  [TaskType.BD_PROPOSAL]: 'Proposal development and management',
  [TaskType.BD_MARKET_RESEARCH]: 'Market research and analysis',
  // IT
  [TaskType.IT_IMPLEMENTATION]: 'IT system implementation',
  [TaskType.IT_SUPPORT]: 'IT support and maintenance',
  [TaskType.IT_INFRASTRUCTURE]: 'Infrastructure planning and setup',
  // Finance
  [TaskType.FINANCE_REPORTING]: 'Financial reporting and analysis',
  [TaskType.FINANCE_BUDGETING]: 'Budget planning and management',
  [TaskType.FINANCE_ANALYSIS]: 'Financial analysis and forecasting',
  // HR
  [TaskType.HR_RECRUITMENT]: 'Recruitment and hiring',
  [TaskType.HR_TRAINING]: 'Training and development',
  [TaskType.HR_POLICY]: 'Policy development and implementation',
  // Country
  [TaskType.COUNTRY_REPORT]: 'Country-specific reporting',
  [TaskType.COUNTRY_ANALYSIS]: 'Country analysis and research',
  [TaskType.COUNTRY_DASHBOARD]: 'Country dashboard and metrics',
  [TaskType.COUNTRY_METRICS]: 'Country performance metrics',
};

export function TaskTypeSelector({ value, onChange, serviceLine }: TaskTypeSelectorProps) {
  // Filter project types based on service line
  const availableTypes = serviceLine
    ? getTaskTypesForServiceLine(serviceLine as ServiceLine)
    : Object.values(TaskType);

  const projectTypes = availableTypes.map(type => ({
    value: type,
    label: formatTaskType(type),
    description: PROJECT_TYPE_DESCRIPTIONS[type] || '',
  }));
  return (
    <div className="space-y-3">
      {projectTypes.map((type) => (
        <label
          key={type.value}
          className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
            value === type.value
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="radio"
            name="projectType"
            value={type.value}
            checked={value === type.value}
            onChange={() => onChange(type.value)}
            className="mt-1 mr-3"
          />
          <div>
            <div className="font-medium text-gray-900">{type.label}</div>
            <div className="text-sm text-gray-600">{type.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}





