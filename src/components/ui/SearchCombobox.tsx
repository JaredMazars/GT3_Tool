'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search, AlertCircle } from 'lucide-react';

export interface SearchComboboxOption {
  id: string | number;
  label: string;
  subtitle?: string;
}

export interface SearchComboboxProps {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  onSearchChange: (search: string) => void;
  options: SearchComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  minimumSearchChars?: number;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
  emptyMessage?: string;
}

export function SearchCombobox({
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
}: SearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange(searchTerm);
  }, [searchTerm, onSearchChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
          handleSelect(options[highlightedIndex].id);
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
    }
  };

  const handleSelect = (optionId: string | number) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = selectedOption?.label || placeholder;

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
        <span className={`text-sm truncate ${!selectedOption ? 'text-forvis-gray-500' : ''}`}>
          {displayValue}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {value && !disabled && (
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
                {options.map((option, index) => {
                  const isSelected = value === option.id;
                  const isHighlighted = index === highlightedIndex;
                  
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-150 ${
                        isHighlighted
                          ? 'bg-forvis-blue-100'
                          : 'hover:bg-forvis-blue-50'
                      }`}
                    >
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
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



























