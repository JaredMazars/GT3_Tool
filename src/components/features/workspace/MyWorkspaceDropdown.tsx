'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Briefcase, ChevronDown, Building2 } from 'lucide-react';
import { useUserAccessibleGroups } from '@/hooks/service-lines/useUserAccessibleGroups';
import { LoadingSpinner } from '@/components/ui';
import { isSharedService } from '@/lib/utils/serviceLineUtils';

interface MyWorkspaceDropdownProps {
  className?: string;
}

export function MyWorkspaceDropdown({ className = '' }: MyWorkspaceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const pathname = usePathname();
  const currentServiceLine = (params.serviceLine as string)?.toUpperCase();
  const currentSubGroup = params.subServiceLineGroup as string;

  const { data: groupedGroups, isLoading } = useUserAccessibleGroups();

  // Filter out shared services - only show client-facing service lines
  const filteredGroups = groupedGroups?.filter(
    (serviceLineGroup) => !isSharedService(serviceLineGroup.serviceLine)
  );

  // Check if we're on any My Workspace tab
  const isOnMyWorkspace = pathname.includes('?tab=my-tasks') || 
    pathname.includes('?tab=my-planning') || 
    pathname.includes('?tab=my-reports') || 
    pathname.includes('?tab=my-approvals');

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

  const handleGroupClick = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all text-white"
        style={{ 
          color: 'white',
          backgroundColor: (isOpen || isOnMyWorkspace) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
          borderBottom: (isOpen || isOnMyWorkspace) ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid transparent'
        }}
        onMouseEnter={(e) => {
          if (!isOpen && !isOnMyWorkspace) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen && !isOnMyWorkspace) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        aria-label="My Workspace - navigate to service line groups"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Briefcase className="h-4 w-4" />
        <span>My Workspace</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-0 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {isLoading ? (
            <div className="p-4 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : !filteredGroups || filteredGroups.length === 0 ? (
            <div className="p-4 text-center text-sm text-forvis-gray-600">
              No accessible groups found
            </div>
          ) : (
            <div className="py-2">
              {filteredGroups.map((serviceLineGroup) => (
                <div key={serviceLineGroup.serviceLine} className="mb-2 last:mb-0">
                  {/* Service Line Header */}
                  <div
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                    style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
                  >
                    {serviceLineGroup.serviceLineName}
                  </div>

                  {/* Groups */}
                  <div className="py-1">
                    {serviceLineGroup.groups.map((group) => {
                      const isActive = 
                        currentServiceLine === serviceLineGroup.serviceLine && 
                        currentSubGroup === group.code;

                      return (
                        <Link
                          key={group.code}
                          href={`/dashboard/${serviceLineGroup.serviceLine.toLowerCase()}/${group.code}?tab=my-tasks`}
                          onClick={handleGroupClick}
                          className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'font-medium text-white'
                              : 'text-forvis-gray-700 hover:bg-forvis-blue-50'
                          }`}
                          style={isActive ? {
                            background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)',
                          } : {}}
                          role="menuitem"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <Building2 className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-forvis-blue-500'}`} />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{group.description || group.code}</span>
                              <span className={`text-xs ${isActive ? 'text-white/80' : 'text-forvis-gray-500'}`}>
                                {group.activeTasks || 0} active task{(group.activeTasks || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <span className="ml-2 flex-shrink-0 text-xs font-medium bg-white/30 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
