'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { useFeature } from '@/hooks/permissions/useFeature';
import { Feature } from '@/lib/permissions/features';

interface NavItem {
  label: string;
  href?: string;
  items?: { label: string; href: string; description?: string }[];
}

export default function DashboardNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentServiceLine } = useServiceLine();

  // Check permissions for admin access
  const { hasFeature: hasAdminAccess } = useFeature(Feature.ACCESS_ADMIN);
  const { hasFeature: hasUsersAccess } = useFeature(Feature.MANAGE_USERS);
  const { hasFeature: hasServiceLineAccess } = useFeature(Feature.MANAGE_SERVICE_LINES);
  const { hasFeature: hasServiceLineMappingAccess } = useFeature(Feature.MANAGE_SERVICE_LINES);
  const { hasFeature: hasTemplatesAccess } = useFeature(Feature.MANAGE_TEMPLATES);

  // Base nav items - always visible
  const baseNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/dashboard',
    },
  ];

  // Service line specific nav items
  const serviceLineNavItems: NavItem[] = currentServiceLine
    ? [
        {
          label: isSharedService(currentServiceLine) ? 'Services' : 'Clients',
          href: `/dashboard/${currentServiceLine.toLowerCase()}`,
        },
      ]
    : [];

  // Admin nav items - only show if user has admin access
  const adminMenuItems = [];
  if (hasUsersAccess) {
    adminMenuItems.push({
      label: 'User Management',
      href: '/dashboard/admin/users',
      description: 'Manage users and permissions',
    });
  }
  if (hasServiceLineAccess) {
    adminMenuItems.push({
      label: 'Service Line Access',
      href: '/dashboard/admin/service-lines',
      description: 'Manage service line permissions',
    });
  }
  if (hasServiceLineMappingAccess) {
    adminMenuItems.push({
      label: 'Service Line Mapping',
      href: '/dashboard/admin/service-line-mapping',
      description: 'Map external to master service lines',
    });
  }
  if (hasTemplatesAccess) {
    adminMenuItems.push({
      label: 'Template Management',
      href: '/dashboard/admin/templates',
      description: 'Manage engagement letter templates',
    });
  }

  const adminNavItems: NavItem[] = hasAdminAccess && adminMenuItems.length > 0
    ? [
        {
          label: 'Admin',
          items: adminMenuItems,
        },
      ]
    : [];

  const navItems: NavItem[] = [...baseNavItems, ...serviceLineNavItems, ...adminNavItems];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [openMenu]);

  const toggleMenu = (label: string) => {
    setOpenMenu(openMenu === label ? null : label);
  };

  return (
    <nav 
      className="w-full" 
      style={{ 
        minHeight: '48px',
        background: 'linear-gradient(135deg, #5B93D7 0%, #3d6bb8 100%)',
        position: 'relative',
        zIndex: 40
      }} 
      ref={menuRef}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center space-x-1">
          {/* Service Line Indicator */}
          {currentServiceLine && (
            <div className="flex items-center px-4 py-2 mr-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
              <Squares2X2Icon className="h-4 w-4 mr-2" />
              {formatServiceLineName(currentServiceLine)}
            </div>
          )}
          {navItems.map((item) => {
            const isActive = item.href === pathname;
            
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center px-4 py-3 text-sm font-semibold transition-all text-white"
                  style={{ 
                    color: 'white',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    borderBottom: isActive ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.label} className="relative">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className="flex items-center px-4 py-3 text-sm font-semibold transition-all text-white"
                  style={{ 
                    color: 'white',
                    backgroundColor: openMenu === item.label ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    borderBottom: openMenu === item.label ? '2px solid rgba(255, 255, 255, 0.5)' : '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (openMenu !== item.label) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (openMenu !== item.label) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.label}
                  <ChevronDownIcon
                    className={`ml-1 h-4 w-4 transition-transform ${
                      openMenu === item.label ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openMenu === item.label && item.items && (
                  <div className="absolute left-0 mt-0 w-72 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-2 z-50">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={() => setOpenMenu(null)}
                        className="block px-4 py-3 hover:bg-forvis-blue-50 transition-colors group"
                      >
                        <div className="font-medium text-forvis-gray-900 group-hover:text-forvis-blue-700">
                          {subItem.label}
                        </div>
                        {subItem.description && (
                          <div className="text-xs text-forvis-gray-700 mt-0.5">
                            {subItem.description}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          
          {/* Notification Bell */}
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
}

