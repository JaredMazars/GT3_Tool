'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';

export interface MultiSelectOption {
  id: string | number;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  onSearchChange?: (search: string) => void; // For server-side search
  isLoading?: boolean; // Show loading spinner while fetching
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label,
  className = '',
  disabled = false,
  onSearchChange,
  isLoading = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localValue, setLocalValue] = useState<(string | number)[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Notify parent of search changes for server-side search
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(searchTerm);
    }
  }, [searchTerm, onSearchChange]);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Close dropdown when clicking outside and commit changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Commit changes when closing
        if (JSON.stringify(localValue.sort()) !== JSON.stringify(value.sort())) {
          onChange(localValue);
        }
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, localValue, value, onChange]);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (optionId: string | number) => {
    // Update local value immediately for responsive UI
    if (localValue.includes(optionId)) {
      setLocalValue(localValue.filter((id) => id !== optionId));
    } else {
      setLocalValue([...localValue, optionId]);
    }
    // Don't call onChange here - wait until dropdown closes
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalValue([]);
    onChange([]);
  };

  const getSelectedLabels = () => {
    // Use localValue for immediate UI feedback
    if (localValue.length === 0) return placeholder;
    if (localValue.length === 1) {
      const option = options.find((opt) => opt.id === localValue[0]);
      return option?.label || placeholder;
    }
    return `${localValue.length} selected`;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2 text-left border rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent transition-all duration-200 flex items-center justify-between ${
          disabled
            ? 'bg-forvis-gray-100 text-forvis-gray-500 cursor-not-allowed'
            : 'bg-white border-forvis-gray-300 text-forvis-gray-900 hover:border-forvis-gray-400'
        } ${isOpen ? 'ring-2 ring-forvis-blue-500' : ''}`}
      >
        <span className="text-sm truncate">
          {getSelectedLabels()}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {localValue.length > 0 && !disabled && (
            <X
              className="h-4 w-4 text-forvis-gray-400 hover:text-forvis-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`h-4 w-4 text-forvis-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full min-w-[320px] mt-1 bg-white border border-forvis-gray-300 rounded-lg shadow-corporate-lg max-h-64 overflow-hidden">
          {/* Search Input - Always show for better UX */}
          {options.length > 0 && (
            <div className="p-2 border-b border-forvis-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-forvis-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-forvis-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forvis-blue-600"></div>
                <span className="text-sm text-forvis-gray-500">Loading...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-forvis-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = localValue.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-forvis-blue-50 cursor-pointer transition-colors duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option.id)}
                      className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-forvis-gray-900 flex-1">
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-forvis-blue-600 flex-shrink-0" />
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Selected Count Footer */}
          {localValue.length > 0 && (
            <div className="px-4 py-2 border-t border-forvis-gray-200 bg-forvis-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-forvis-gray-600">
                  {localValue.length} {localValue.length === 1 ? 'item' : 'items'} selected
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-forvis-blue-600 hover:text-forvis-blue-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

