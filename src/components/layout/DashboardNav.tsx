'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  label: string;
  href?: string;
  items?: { label: string; href: string; description?: string }[];
}

export default function DashboardNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems: NavItem[] = [
    {
      label: 'Projects',
      href: '/dashboard',
    },
    {
      label: 'Clients',
      href: '/dashboard/clients',
    },
    {
      label: 'Admin',
      items: [
        {
          label: 'User Management',
          href: '/dashboard/admin/users',
          description: 'Manage users and permissions',
        },
      ],
    },
  ];

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
      className="w-full bg-forvis-blue-600 shadow-lg border-b-2 border-forvis-blue-800" 
      style={{ 
        minHeight: '48px',
        backgroundColor: '#25488A',
        position: 'relative',
        zIndex: 40
      }} 
      ref={menuRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 space-x-1">
          {navItems.map((item) => {
            const isActive = item.href === pathname;
            
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-white bg-forvis-blue-800'
                      : 'text-white hover:bg-forvis-blue-700'
                  }`}
                  style={{ color: 'white' }}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.label} className="relative">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex items-center px-4 py-3 text-sm font-semibold transition-colors ${
                    openMenu === item.label
                      ? 'text-white bg-forvis-blue-800'
                      : 'text-white hover:bg-forvis-blue-700'
                  }`}
                  style={{ color: 'white' }}
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
      </div>
    </nav>
  );
}

