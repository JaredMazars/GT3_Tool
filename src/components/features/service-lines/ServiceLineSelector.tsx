'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Folder, 
  Building2,
  ArrowLeft,
  BarChart3,
  Newspaper,
  ArrowRight,
  ChevronRight,
  FileBarChart,
  Calendar,
  FolderOpen,
  Activity,
} from 'lucide-react';
import { formatServiceLineName, isSharedService } from '@/lib/utils/serviceLineUtils';

export function ServiceLineSelector() {
  const params = useParams();
  const serviceLine = (params.serviceLine as string)?.toLowerCase() || '';
  
  // Guard against missing service line
  if (!serviceLine) {
    return null;
  }
  
  const isShared = isSharedService(serviceLine.toUpperCase());
  
  // Services with only vault functionality
  const vaultOnlyServices = ['it', 'finance', 'hr'];
  const isVaultOnly = vaultOnlyServices.includes(serviceLine);

  // Determine grid columns based on cards shown
  const getGridCols = () => {
    if (isVaultOnly) {
      return 'md:grid-cols-1 max-w-2xl mx-auto'; // Just Vault for simple services
    }
    if (serviceLine === 'qrm') {
      return 'md:grid-cols-2'; // Monitoring + Vault for QRM
    }
    if (serviceLine === 'business_dev') {
      return 'md:grid-cols-3'; // BD Pipeline + Company News + Vault
    }
    if (serviceLine === 'country_management') {
      return 'md:grid-cols-3'; // Staff Planner + Exco Reporting + Vault
    }
    return 'md:grid-cols-3'; // Internal Tasks + Client Tasks + Vault for main service lines
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard" className="hover:text-forvis-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">
            {formatServiceLineName(serviceLine.toUpperCase())}
          </span>
        </nav>

        {/* Gold Container with Header and Cards */}
        <div className="rounded-lg border-2 p-6 bg-gradient-premium-gold border-[#C9BCAA]">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">
              {formatServiceLineName(serviceLine.toUpperCase())}
            </h2>
            <p className="text-sm text-white opacity-90">
              {serviceLine === 'business_dev' 
                ? 'Track opportunities and view company news'
                : serviceLine === 'country_management'
                ? 'Access resource planning and executive reporting'
                : serviceLine === 'qrm'
                ? 'Access monitoring dashboards and document vault'
                : 'Choose the type of tasks you want to view'}
            </p>
          </div>

          {/* Selection Cards */}
          <div className={`grid grid-cols-1 gap-3 ${getGridCols()}`}>
            {/* Vault Only Card - Show for simple shared services */}
            {isVaultOnly && (
              <Link
                href={`/dashboard/document-vault?serviceLine=${serviceLine.toUpperCase()}`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-6 relative z-[1]">
                  <div className="flex items-center gap-4 mb-3">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <FolderOpen className="h-8 w-8 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-forvis-gray-900 group-hover:text-forvis-blue-600 transition-colors duration-200">
                        {formatServiceLineName(serviceLine.toUpperCase())} Vault
                      </h3>
                      <p className="text-sm text-forvis-gray-600 mt-1">
                        Access policies, procedures, templates, and documents
                      </p>
                    </div>

                    <ArrowRight className="h-6 w-6 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>
                </div>
              </Link>
            )}

            {/* QRM Monitoring Card - Only show for QRM service line */}
            {serviceLine === 'qrm' && (
              <Link
                href={`/dashboard/qrm/monitoring`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <Activity className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Quality & Risk Monitoring
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    View compliance statistics and quality metrics
                  </p>
                </div>
              </Link>
            )}

            {/* BD Pipeline Card - Only show for Business Development service line */}
            {!isVaultOnly && serviceLine === 'business_dev' && (
              <Link
                href={`/dashboard/${serviceLine}/bd`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        BD Pipeline
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    Track opportunities, prospects, and manage your sales pipeline
                  </p>
                </div>
              </Link>
            )}

            {/* Company News Card - Only show for Business Development service line */}
            {!isVaultOnly && serviceLine === 'business_dev' && (
              <Link
                href={`/dashboard/${serviceLine}/news`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <Newspaper className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Company News
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    View company announcements, updates, and important bulletins
                  </p>
                </div>
              </Link>
            )}

            {/* Staff Planner Card - Only show for Country Management service line */}
            {!isVaultOnly && serviceLine === 'country_management' && (
              <Link
                href={`/dashboard/${serviceLine}/staff-planner`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Staff Planner
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    View resource planning across all service lines and staff
                  </p>
                </div>
              </Link>
            )}

            {/* Exco Reporting Card - Only show for Country Management service line */}
            {!isVaultOnly && serviceLine === 'country_management' && (
              <Link
                href={`/dashboard/${serviceLine}/exco-reporting`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <FileBarChart className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Exco Reporting
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    Executive committee reporting and business analysis
                  </p>
                </div>
              </Link>
            )}

            {/* Internal Tasks Card - Only show for non-shared service lines */}
            {!isVaultOnly && !isShared && (
              <Link
                href={`/dashboard/${serviceLine}/internal`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <Folder className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Internal Tasks
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    View and manage internal tasks for {formatServiceLineName(serviceLine.toUpperCase())}
                  </p>
                </div>
              </Link>
            )}

            {/* Client Tasks Card - Only show for non-shared service lines */}
            {!isVaultOnly && !isShared && (
              <Link
                href={`/dashboard/${serviceLine}/clients`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Client Tasks
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    Select a client to view their {formatServiceLineName(serviceLine.toUpperCase())} tasks
                  </p>
                </div>
              </Link>
            )}

            {/* Vault Card - Show for service lines with multiple options (not vault-only) */}
            {!isVaultOnly && (
              <Link
                href={`/dashboard/document-vault?serviceLine=${serviceLine.toUpperCase()}`}
                className="group block rounded-lg border border-forvis-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden bg-gradient-dashboard-card"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-dashboard-hover" />

                <div className="p-4 relative z-[1]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>

                    {/* Title and Arrow */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-forvis-gray-900 truncate group-hover:text-forvis-blue-600 transition-colors duration-200">
                        Vault
                      </h3>
                    </div>

                    <ArrowRight className="h-4 w-4 text-forvis-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forvis-gray-600 line-clamp-2 leading-relaxed">
                    Access {formatServiceLineName(serviceLine.toUpperCase())} policies, procedures, and templates
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

