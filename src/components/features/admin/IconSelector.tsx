'use client';

import { useState } from 'react';
import {
  Link,
  Globe,
  Server,
  Cloud,
  Terminal,
  FileText,
  BarChart3,
  Settings,
  Box,
  Database,
  Folder,
  Inbox,
  Paperclip,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui';

interface IconOption {
  name: string;
  component: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}

const ICON_OPTIONS: IconOption[] = [
  { name: 'Link', component: Link, label: 'Link' },
  { name: 'Globe', component: Globe, label: 'Globe' },
  { name: 'Server', component: Server, label: 'Server' },
  { name: 'Cloud', component: Cloud, label: 'Cloud' },
  { name: 'Terminal', component: Terminal, label: 'Command Line' },
  { name: 'FileText', component: FileText, label: 'Document' },
  { name: 'BarChart3', component: BarChart3, label: 'Chart' },
  { name: 'Settings', component: Settings, label: 'Settings' },
  { name: 'Box', component: Box, label: 'Cube' },
  { name: 'Database', component: Database, label: 'Database' },
  { name: 'Folder', component: Folder, label: 'Folder' },
  { name: 'Inbox', component: Inbox, label: 'Inbox' },
  { name: 'Paperclip', component: Paperclip, label: 'Attachment' },
  { name: 'Rocket', component: Rocket, label: 'Rocket' },
  { name: 'ShieldCheck', component: ShieldCheck, label: 'Shield' },
  { name: 'Sparkles', component: Sparkles, label: 'Sparkles' },
];

interface IconSelectorProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  error?: string;
}

export function IconSelector({ value, onChange, label, error }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedIcon = ICON_OPTIONS.find((icon) => icon.name === value);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-forvis-gray-300 rounded-lg hover:border-forvis-blue-500 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {selectedIcon ? (
            <>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                <selectedIcon.component className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-forvis-gray-900">
                {selectedIcon.label}
              </span>
            </>
          ) : (
            <span className="text-sm text-forvis-gray-500">Select an icon...</span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-forvis-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 p-3">
              {ICON_OPTIONS.map((icon) => {
                const Icon = icon.component;
                const isSelected = value === icon.name;

                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => {
                      onChange(icon.name);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-forvis-blue-50 border-2 border-forvis-blue-500'
                        : 'hover:bg-forvis-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-forvis-blue-700' : 'text-forvis-gray-700'
                      }`}
                    >
                      {icon.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Helper to get icon component by name
 */
export function getIconComponent(iconName: string) {
  const icon = ICON_OPTIONS.find((i) => i.name === iconName);
  return icon?.component || Link;
}



