'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDown,
  Building2,
  Users,
  Settings,
  Grid2x2,
  Bug,
  Info,
} from 'lucide-react';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { BugReportModal } from '@/components/features/bug-reports/BugReportModal';
import { MyWorkspaceDropdown } from '@/components/features/workspace';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { useFeature } from '@/hooks/permissions/useFeature';
import { Feature } from '@/lib/permissions/features';
import { useExternalLinks, useRefreshExternalLinks } from '@/hooks/admin/useExternalLinks';

interface NavItem {
  label: string;
  href?: string;
  items?: { label: string; href: string; description?: string; section?: string }[];
}

export default function DashboardNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [bugReportModalOpen, setBugReportModalOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentServiceLine } = useServiceLine();

  // Check permissions for admin access
  const { hasFeature: hasAdminAccess } = useFeature(Feature.ACCESS_ADMIN);
  const { hasFeature: hasUsersAccess } = useFeature(Feature.MANAGE_USERS);
  const { hasFeature: hasServiceLineAccess } = useFeature(Feature.MANAGE_SERVICE_LINES);
  const { hasFeature: hasServiceLineMappingAccess } = useFeature(Feature.MANAGE_SERVICE_LINES);
  const { hasFeature: hasTemplatesAccess } = useFeature(Feature.MANAGE_TEMPLATES);
  const { hasFeature: hasExternalLinksAccess } = useFeature(Feature.MANAGE_EXTERNAL_LINKS);
  const { hasFeature: hasToolsAccess } = useFeature(Feature.MANAGE_TOOLS);
  const { hasFeature: hasVaultManagementAccess } = useFeature(Feature.MANAGE_VAULT_DOCUMENTS);
  const { hasFeature: hasDatabaseAccess } = useFeature(Feature.MANAGE_DATABASE);

  // Fetch external links with React Query caching
  const { data: externalLinks = [] } = useExternalLinks();
  const refreshExternalLinks = useRefreshExternalLinks();

  // Listen for custom event to refresh links (for manual invalidation after edits)
  useEffect(() => {
    const handleRefreshLinks = () => {
      refreshExternalLinks();
    };

    window.addEventListener('refreshExternalLinks', handleRefreshLinks);

    return () => {
      window.removeEventListener('refreshExternalLinks', handleRefreshLinks);
    };
  }, [refreshExternalLinks]);

  // Base nav items - always visible
  const baseNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/dashboard',
    },
  ];

  // External links dropdown - show only if there are active links
  const linksNavItems: NavItem[] = externalLinks.length > 0
    ? [
        {
          label: 'Links',
          items: externalLinks.map((link) => ({
            label: link.name,
            href: link.url,
            description: undefined,
          })),
        },
      ]
    : [];

  // Admin nav items - grouped by function with section headers
  const adminMenuItems = [];
  
  // Access Control section
  if (hasUsersAccess) {
    adminMenuItems.push({
      label: 'User Management',
      href: '/dashboard/admin/users',
      description: 'Manage users and permissions',
      section: 'Access Control',
    });
  }
  if (hasServiceLineAccess) {
    adminMenuItems.push({
      label: 'Service Line Permissions',
      href: '/dashboard/admin/service-lines',
      description: 'Manage service line permissions',
      section: 'Access Control',
    });
  }
  if (hasAdminAccess) {
    adminMenuItems.push({
      label: 'Page Permissions',
      href: '/dashboard/admin/page-permissions',
      description: 'Manage page-level access control',
      section: 'Access Control',
    });
  }
  if (hasUsersAccess) {
    adminMenuItems.push({
      label: 'Leader Groups',
      href: '/dashboard/admin/leaders',
      description: 'Manage firm-wide leader groups',
      section: 'Access Control',
    });
  }
  
  // Service Lines section
  if (hasServiceLineMappingAccess) {
    adminMenuItems.push({
      label: 'Service Line Master',
      href: '/dashboard/admin/service-line-master',
      description: 'Manage master service line definitions',
      section: 'Service Lines',
    });
  }
  if (hasServiceLineMappingAccess) {
    adminMenuItems.push({
      label: 'Service Line Mapping',
      href: '/dashboard/admin/service-line-mapping',
      description: 'Map external to master service lines',
      section: 'Service Lines',
    });
  }
  
  // Content & Tools section
  if (hasTemplatesAccess) {
    adminMenuItems.push({
      label: 'Template Management',
      href: '/dashboard/admin/templates',
      description: 'Manage engagement letter templates',
      section: 'Content & Tools',
    });
  }
  if (hasToolsAccess) {
    adminMenuItems.push({
      label: 'Tool Management',
      href: '/dashboard/admin/tools',
      description: 'Manage tools and service line assignments',
      section: 'Content & Tools',
    });
  }
  if (hasToolsAccess) {
    adminMenuItems.push({
      label: 'Review Note Categories',
      href: '/dashboard/admin/review-categories',
      description: 'Manage review note categories',
      section: 'Content & Tools',
    });
  }
  if (hasVaultManagementAccess) {
    adminMenuItems.push({
      label: 'Vault Management',
      href: '/dashboard/admin/document-vault',
      description: 'Manage document approval workflows',
      section: 'Content & Tools',
    });
  }
  
  // Integration & Support section
  if (hasExternalLinksAccess) {
    adminMenuItems.push({
      label: 'External Links',
      href: '/dashboard/admin/external-links',
      description: 'Manage external software links',
      section: 'Integration & Support',
    });
  }
  if (hasDatabaseAccess) {
    adminMenuItems.push({
      label: 'Database Management',
      href: '/dashboard/admin/database',
      description: 'Monitor and maintain database performance',
      section: 'Integration & Support',
    });
  }
  if (hasAdminAccess) {
    adminMenuItems.push({
      label: 'Bug Reports',
      href: '/dashboard/admin/bug-reports',
      description: 'View and manage user-reported bugs',
      section: 'Integration & Support',
    });
  }

  // Show Admin menu if user has admin access (SYSTEM_ADMIN only)
  const adminNavItems: NavItem[] = hasAdminAccess && adminMenuItems.length > 0
    ? [
        {
          label: 'Admin',
          items: adminMenuItems,
        },
      ]
    : [];

  // Left side nav items (Home only - My Workspace is now a separate dropdown component)
  const leftNavItems: NavItem[] = [...baseNavItems];
  
  // Right side nav items (Links and Admin)
  const rightNavItems: NavItem[] = [...linksNavItems, ...adminNavItems];

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
        minHeight: '36px',
        background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)',
        position: 'relative',
        zIndex: 40
      }} 
      ref={menuRef}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-9">
          <div className="flex items-center space-x-1">
          {/* Service Line Indicator */}
          {currentServiceLine && (
            <div className="flex items-center px-4 py-2 mr-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
              <Grid2x2 className="h-4 w-4 mr-2" />
              {formatServiceLineName(currentServiceLine)}
            </div>
          )}
          {leftNavItems.map((item) => {
            const isActive = item.href === pathname;
            
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all text-white"
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
                  <ChevronDown
                    className={`ml-1 h-4 w-4 transition-transform ${
                      openMenu === item.label ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openMenu === item.label && item.items && (
                  <div className="absolute left-0 mt-0 w-72 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-2 z-50">
                    {item.items.map((subItem) => {
                      // Check if this is an external link
                      const isExternal = subItem.href.startsWith('http://') || subItem.href.startsWith('https://');
                      
                      if (isExternal) {
                        return (
                          <a
                            key={subItem.href}
                            href={subItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
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
                          </a>
                        );
                      }

                      return (
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
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* My Workspace Dropdown */}
          <MyWorkspaceDropdown />
          </div>
          
          {/* Right side items */}
          <div className="flex items-center space-x-1">
            {rightNavItems.map((item) => {
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
                    <ChevronDown
                      className={`ml-1 h-4 w-4 transition-transform ${
                        openMenu === item.label ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {openMenu === item.label && item.items && (
                    <div className="absolute right-0 mt-0 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-2 z-50">
                      {(() => {
                        // Group items by section
                        const sections = item.items.reduce((acc, subItem) => {
                          const section = subItem.section || 'Other';
                          if (!acc[section]) {
                            acc[section] = [];
                          }
                          acc[section].push(subItem);
                          return acc;
                        }, {} as Record<string, typeof item.items>);

                        // Define section order
                        const sectionOrder = ['Access Control', 'Service Lines', 'Content & Tools', 'Integration & Support', 'Other'];
                        
                        return sectionOrder.map((sectionName) => {
                          const sectionItems = sections[sectionName];
                          if (!sectionItems || sectionItems.length === 0) return null;

                          return (
                            <div key={sectionName} className="mb-2 last:mb-0">
                              {/* Section Header */}
                              <div
                                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                                style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
                              >
                                {sectionName}
                              </div>

                              {/* Section Items */}
                              <div className="py-1">
                                {sectionItems.map((subItem) => {
                                  // Check if this is an external link
                                  const isExternal = subItem.href.startsWith('http://') || subItem.href.startsWith('https://');
                                  
                                  if (isExternal) {
                                    return (
                                      <a
                                        key={subItem.href}
                                        href={subItem.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
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
                                      </a>
                                    );
                                  }

                                  return (
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
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Notification Bell */}
            <NotificationBell />

            {/* About Icon */}
            <Link
              href="/dashboard/about"
              className="relative p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="About GT3"
              title="About GT3"
            >
              <Info className="h-5 w-5" />
            </Link>

            {/* Bug Report Icon */}
            <button
              onClick={() => setBugReportModalOpen(true)}
              className="relative p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Report a bug"
              title="Report a bug"
            >
              <Bug className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={bugReportModalOpen}
        onClose={() => setBugReportModalOpen(false)}
        initialUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </nav>
  );
}

