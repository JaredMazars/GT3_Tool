'use client';

import { ProjectType } from '@/types';

interface ProjectTypeSelectorProps {
  value: ProjectType;
  onChange: (type: ProjectType) => void;
}

const PROJECT_TYPES = [
  { value: 'TAX_CALCULATION' as ProjectType, label: 'Tax Calculation', description: 'Calculate tax liability and adjustments' },
  { value: 'TAX_OPINION' as ProjectType, label: 'Tax Opinion', description: 'Provide tax advice and opinions' },
  { value: 'TAX_ADMINISTRATION' as ProjectType, label: 'Tax Administration', description: 'Tax compliance and administration' },
];

export function ProjectTypeSelector({ value, onChange }: ProjectTypeSelectorProps) {
  return (
    <div className="space-y-3">
      {PROJECT_TYPES.map((type) => (
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



