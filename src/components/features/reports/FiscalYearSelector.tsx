'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface FiscalYearSelectorProps {
  value: number | 'all';
  onChange: (value: number | 'all') => void;
  allowAllYears?: boolean; // Only true for overview page
  currentFY: number;
  className?: string;
}

export function FiscalYearSelector({ 
  value, 
  onChange, 
  allowAllYears = false,
  currentFY,
  className = ''
}: FiscalYearSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const options = [
    ...(allowAllYears ? [{ value: 'all' as const, label: 'All Years (Comparison)', description: `Compare FY${currentFY}, FY${currentFY - 1}, FY${currentFY - 2}` }] : []),
    { value: currentFY, label: `FY${currentFY}`, description: `Sep ${currentFY - 1} - Aug ${currentFY}` },
    { value: currentFY - 1, label: `FY${currentFY - 1}`, description: `Sep ${currentFY - 2} - Aug ${currentFY - 1}` },
    { value: currentFY - 2, label: `FY${currentFY - 2}`, description: `Sep ${currentFY - 3} - Aug ${currentFY - 2}` },
  ];

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

  const handleOptionClick = (optionValue: number | 'all') => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Get display label for current value
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || `FY${currentFY}`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
        Fiscal Year
      </label>
      
      {/* Button */}
      <button
        onClick={toggleDropdown}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium bg-white border border-forvis-gray-300 rounded-lg transition-all duration-200 hover:border-forvis-blue-500 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
        aria-label="Select fiscal year"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-forvis-blue-500" />
          <span className="text-forvis-gray-900">{displayLabel}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-forvis-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 z-50 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`w-full flex flex-col px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'text-white'
                    : 'text-forvis-gray-700 hover:bg-forvis-blue-50'
                }`}
                style={isSelected ? {
                  background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                } : {}}
                role="menuitem"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{option.label}</span>
                  {isSelected && (
                    <span className="text-xs font-medium bg-white/30 px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-forvis-gray-500'}`}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
