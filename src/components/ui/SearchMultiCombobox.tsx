'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search, AlertCircle, Info } from 'lucide-react';

export interface SearchMultiComboboxOption {
  id: string | number;
  label: string;
  subtitle?: string;
}

export interface SearchMultiComboboxMetadata {
  hasMore: boolean;
  total: number;
  returned: number;
}

export interface SearchMultiComboboxProps {
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  onSearchChange: (search: string) => void;
  options: SearchMultiComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  minimumSearchChars?: number;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
  emptyMessage?: string;
  metadata?: SearchMultiComboboxMetadata;
}

export function SearchMultiCombobox({
  value,
  onChange,
  onSearchChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  minimumSearchChars = 2,
  isLoading = false,
  disabled = false,
  error,
  label,
  className = '',
  emptyMessage,
  metadata,
}: SearchMultiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localValue, setLocalValue] = useState<(string | number)[]>(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange(searchTerm);
  }, [searchTerm, onSearchChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Just close the dropdown - changes are already committed via handleToggle
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
  }, [isOpen]);

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [options]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (options.length > 0 && highlightedIndex >= 0 && options[highlightedIndex]) {
          handleToggle(options[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Backspace':
        // Remove last item if search is empty
        if (searchTerm.length === 0 && localValue.length > 0) {
          e.preventDefault();
          const newValue = localValue.slice(0, -1);
          setLocalValue(newValue);
          onChange(newValue); // Already calling onChange immediately
        }
        break;
    }
  };

  const handleToggle = (optionId: string | number) => {
    // Update local value and notify parent immediately for instant filter application
    const newValue = localValue.includes(optionId)
      ? localValue.filter((id) => id !== optionId)
      : [...localValue, optionId];
    
    setLocalValue(newValue);
    onChange(newValue); // Call onChange immediately
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

  const showMinimumCharsHint = searchTerm.length > 0 && searchTerm.length < minimumSearchChars;
  const shouldShowOptions = searchTerm.length >= minimumSearchChars;

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
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-4 py-2 text-left border rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent transition-all duration-200 flex items-center justify-between ${
          disabled
            ? 'bg-forvis-gray-100 text-forvis-gray-500 cursor-not-allowed'
            : error
            ? 'border-red-500 bg-white text-forvis-gray-900'
            : 'bg-white border-forvis-gray-300 text-forvis-gray-900 hover:border-forvis-gray-400'
        } ${isOpen ? 'ring-2 ring-forvis-blue-500' : ''}`}
      >
        <span className={`text-sm truncate ${localValue.length === 0 ? 'text-forvis-gray-500' : ''}`}>
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

      {/* Error Message */}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full min-w-[320px] mt-1 bg-white border border-forvis-gray-300 rounded-lg shadow-corporate-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-forvis-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-forvis-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-forvis-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          {/* Options List or States */}
          <div className="max-h-60 overflow-y-auto">
            {/* Initial State - No search yet */}
            {searchTerm.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Search className="h-8 w-8 mx-auto text-forvis-gray-300 mb-2" />
                <p className="text-sm text-forvis-gray-600 font-medium">
                  Type {minimumSearchChars}+ characters to search
                </p>
                <p className="text-xs text-forvis-gray-500 mt-1">
                  Start typing to see results
                </p>
              </div>
            )}

            {/* Minimum Characters Hint */}
            {showMinimumCharsHint && (
              <div className="px-4 py-8 text-center">
                <Search className="h-8 w-8 mx-auto text-forvis-blue-400 mb-2 animate-pulse" />
                <p className="text-sm text-forvis-gray-600 font-medium">
                  Keep typing...
                </p>
                <p className="text-xs text-forvis-gray-500 mt-1">
                  Need {minimumSearchChars - searchTerm.length} more character{minimumSearchChars - searchTerm.length > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && shouldShowOptions && (
              <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forvis-blue-600"></div>
                <span className="text-sm text-forvis-gray-600">Searching...</span>
              </div>
            )}

            {/* No Results */}
            {!isLoading && shouldShowOptions && options.length === 0 && (
              <div className="px-4 py-8 text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-forvis-gray-300 mb-2" />
                <p className="text-sm text-forvis-gray-600 font-medium">
                  No matches found
                </p>
                <p className="text-xs text-forvis-gray-500 mt-1">
                  {emptyMessage || 'Try different keywords'}
                </p>
              </div>
            )}

            {/* Results */}
            {!isLoading && shouldShowOptions && options.length > 0 && (
              <>
                {/* Results count hint */}
                {metadata?.hasMore && (
                  <div className="px-4 py-2 bg-forvis-blue-50 border-b border-forvis-blue-100">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-forvis-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-forvis-blue-700 font-medium">
                          Showing top {metadata.returned} of {metadata.total} matches
                        </p>
                        <p className="text-xs text-forvis-blue-600 mt-0.5">
                          Use more specific search terms to narrow results
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {options.map((option, index) => {
                  const isSelected = localValue.includes(option.id);
                  const isHighlighted = index === highlightedIndex;
                  
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-150 ${
                        isHighlighted
                          ? 'bg-forvis-blue-100'
                          : 'hover:bg-forvis-blue-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(option.id)}
                        className="w-4 h-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-forvis-gray-900 truncate">
                          {option.label}
                        </p>
                        {option.subtitle && (
                          <p className="text-xs text-forvis-gray-500 truncate">
                            {option.subtitle}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-forvis-blue-600 flex-shrink-0" />
                      )}
                    </label>
                  );
                })}
              </>
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



























