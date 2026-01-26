'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check, ChevronDown } from 'lucide-react';
import { Button, LoadingSpinner, Banner } from '@/components/ui';

interface ServiceLine {
  code: string;
  name: string;
  taskCount: number;
}

interface ServiceLineFilterSelectorProps {
  value: string[]; // Array of masterCode values, empty = all
  onChange: (values: string[]) => void;
  className?: string;
}

export function ServiceLineFilterSelector({ 
  value, 
  onChange, 
  className = ''
}: ServiceLineFilterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch available service lines
  useEffect(() => {
    const fetchServiceLines = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/my-reports/available-service-lines');
        if (!response.ok) {
          throw new Error('Failed to fetch service lines');
        }
        const result = await response.json();
        if (result.success && result.data) {
          setServiceLines(result.data);
        } else {
          throw new Error(result.error || 'Failed to load service lines');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service lines');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceLines();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleToggleServiceLine = (code: string) => {
    if (value.includes(code)) {
      // Remove from selection
      onChange(value.filter(sl => sl !== code));
    } else {
      // Add to selection
      onChange([...value, code]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === serviceLines.length) {
      // Deselect all
      onChange([]);
    } else {
      // Select all
      onChange(serviceLines.map(sl => sl.code));
    }
  };

  // Get display label for current selection
  const getDisplayLabel = () => {
    if (value.length === 0 || value.length === serviceLines.length) {
      return 'All Service Lines';
    }
    if (value.length === 1) {
      const selected = serviceLines.find(sl => sl.code === value[0]);
      return selected?.name || '1 Service Line';
    }
    return `${value.length} Service Lines`;
  };

  const allSelected = value.length === serviceLines.length || value.length === 0;

  if (error) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          Service Line Filter
        </label>
        <Banner variant="error" message={error} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
        Service Line Filter
      </label>
      
      {/* Button */}
      <button
        onClick={toggleDropdown}
        disabled={isLoading}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium bg-white border border-forvis-gray-300 rounded-lg transition-all duration-200 hover:border-forvis-blue-500 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select service lines"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Filter className="h-4 w-4 text-forvis-blue-500" />
          )}
          <span className="text-forvis-gray-900">{getDisplayLabel()}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-forvis-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && !isLoading && serviceLines.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 z-50 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Select All Option */}
          <button
            onClick={handleSelectAll}
            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-forvis-gray-200 ${
              allSelected
                ? 'bg-forvis-blue-50 text-forvis-blue-700'
                : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
            }`}
            role="menuitem"
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                allSelected
                  ? 'bg-forvis-blue-600 border-forvis-blue-600'
                  : 'border-forvis-gray-400'
              }`}>
                {allSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="font-semibold text-sm">All Service Lines</span>
            </div>
            <span className="text-xs text-forvis-gray-500">
              {serviceLines.reduce((sum, sl) => sum + sl.taskCount, 0)} tasks
            </span>
          </button>

          {/* Individual Service Lines */}
          <div className="max-h-80 overflow-y-auto">
            {serviceLines.map((serviceLine) => {
              const isSelected = value.includes(serviceLine.code);
              
              return (
                <button
                  key={serviceLine.code}
                  onClick={() => handleToggleServiceLine(serviceLine.code)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-forvis-blue-50 text-forvis-blue-700'
                      : 'text-forvis-gray-700 hover:bg-forvis-gray-50'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-forvis-blue-600 border-forvis-blue-600'
                        : 'border-forvis-gray-400'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{serviceLine.name}</span>
                      <span className="text-xs text-forvis-gray-500">{serviceLine.code}</span>
                    </div>
                  </div>
                  <span className="text-xs text-forvis-gray-500">
                    {serviceLine.taskCount} tasks
                  </span>
                </button>
              );
            })}
          </div>

          {/* Apply Button */}
          <div className="border-t border-forvis-gray-200 p-3">
            <Button
              onClick={() => setIsOpen(false)}
              variant="primary"
              className="w-full"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
