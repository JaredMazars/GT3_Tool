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
  Briefcase,
} from 'lucide-react';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';
import { useFeature } from '@/hooks/permissions/useFeature';
import { Feature } from '@/lib/permissions/features';
import { useExternalLinks, useRefreshExternalLinks } from '@/hooks/admin/useExternalLinks';
import { usePrimaryWorkspace } from '@/hooks/workspace/usePrimaryWorkspace';

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
  
  // Fetch user's primary workspace for My Workspace link
  const { data: primaryWorkspace } = usePrimaryWorkspace();

  // Check permissions for admin access
  const { hasFeature: hasAdminAccess } = useFeature(Feature.ACCESS_ADMIN);
  const { hasFeature: hasUsersAccess } = useFeature(Feature.MANAGE_USERS);
  const { hasFeature: hasServiceLineAccess } = useFeature(Feature.MANAGE_SERVICE_LINES);
  const { hasFeature: hasServiceLineMappingAccess } = useFeature(Feature.MANAGE_SERVICE_LINES);
  const { hasFeature: hasTemplatesAccess } = useFeature(Feature.MANAGE_TEMPLATES);
  const { hasFeature: hasExternalLinksAccess } = useFeature(Feature.MANAGE_EXTERNAL_LINKS);
  const { hasFeature: hasToolsAccess } = useFeature(Feature.MANAGE_TOOLS);
  const { hasFeature: hasVaultManagementAccess } = useFeature(Feature.MANAGE_VAULT_DOCUMENTS);

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
  
  // My Workspace nav item - routes to primary workspace's my-tasks tab
  const myWorkspaceNavItems: NavItem[] = primaryWorkspace
    ? [
        {
          label: 'My Workspace',
          href: `/dashboard/${primaryWorkspace.serviceLine.toLowerCase()}/${primaryWorkspace.subServiceLineGroup}?tab=my-tasks`,
        },
      ]
    : [];

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
  if (hasServiceLineMappingAccess) {
    adminMenuItems.push({
      label: 'Service Line Master',
      href: '/dashboard/admin/service-line-master',
      description: 'Manage master service line definitions',
    });
  }
  if (hasTemplatesAccess) {
    adminMenuItems.push({
      label: 'Template Management',
      href: '/dashboard/admin/templates',
      description: 'Manage engagement letter templates',
    });
  }
  if (hasToolsAccess) {
    adminMenuItems.push({
      label: 'Tool Management',
      href: '/dashboard/admin/tools',
      description: 'Manage tools and service line assignments',
    });
  }
  if (hasToolsAccess) {
    adminMenuItems.push({
      label: 'Review Note Categories',
      href: '/dashboard/admin/review-categories',
      description: 'Manage review note categories',
    });
  }
  if (hasExternalLinksAccess) {
    adminMenuItems.push({
      label: 'External Links',
      href: '/dashboard/admin/external-links',
      description: 'Manage external software links',
    });
  }
  if (hasVaultManagementAccess) {
    adminMenuItems.push({
      label: 'Vault Management',
      href: '/dashboard/admin/document-vault',
      description: 'Manage document approval workflows',
    });
  }
  if (hasAdminAccess) {
    adminMenuItems.push({
      label: 'Page Permissions',
      href: '/dashboard/admin/page-permissions',
      description: 'Manage page-level access control',
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

  // Left side nav items (Home, My Workspace)
  const leftNavItems: NavItem[] = [...baseNavItems, ...myWorkspaceNavItems];
  
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
            // Check if this is the My Workspace link
            const isMyWorkspace = item.label === 'My Workspace';
            
            // For My Workspace, check if user is on any My Workspace tab
            const isActive = isMyWorkspace
              ? pathname.includes('?tab=my-tasks') || 
                pathname.includes('?tab=my-planning') || 
                pathname.includes('?tab=my-reports') || 
                pathname.includes('?tab=my-approvals')
              : item.href === pathname;
            
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
                  {isMyWorkspace && <Briefcase className="h-4 w-4" />}
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
                    <div className="absolute right-0 mt-0 w-72 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-2 z-50">
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
            
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </div>
      </div>
    </nav>
  );
}

