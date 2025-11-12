'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronRightIcon,
  BuildingOfficeIcon,
  FolderIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { getProjectTypeColor, formatProjectType, formatDate } from '@/lib/utils/projectUtils';

interface Client {
  id: number;
  name: string;
  registrationNumber?: string;
  taxNumber?: string;
  industry?: string;
  legalEntityType?: string;
  jurisdiction?: string;
  taxRegime?: string;
  financialYearEnd?: string;
  baseCurrency?: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  address?: string;
  projects: Array<{
    id: number;
    name: string;
    description?: string;
    projectType: string;
    taxYear?: number;
    updatedAt: string;
    _count: {
      mappings: number;
      taxAdjustments: number;
    };
  }>;
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClient();
  }, [params.id]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      const data = await response.json();
      const clientData = data.success ? data.data : data;
      // Ensure projects is always an array
      setClient({
        ...clientData,
        projects: clientData.projects || [],
      });
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Client Not Found</h2>
          <p className="mt-2 text-gray-600">The client you're looking for doesn't exist.</p>
          <Link href="/dashboard/clients" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-forvis-gray-600 mb-6">
          <Link href="/dashboard/clients" className="hover:text-forvis-gray-900 transition-colors">
            Clients
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="text-forvis-gray-900 font-medium">{client.name}</span>
        </nav>

        {/* Client Header */}
        <div className="card mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                  <BuildingOfficeIcon className="h-8 w-8 text-forvis-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">{client.name}</h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-forvis-gray-600">
                    {client.taxNumber && (
                      <span><span className="font-medium">Tax Number:</span> {client.taxNumber}</span>
                    )}
                    {client.registrationNumber && (
                      <span><span className="font-medium">Registration:</span> {client.registrationNumber}</span>
                    )}
                    {client.industry && (
                      <span><span className="font-medium">Industry:</span> {client.industry}</span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/dashboard/clients`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Client
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="px-4 py-3 border-b border-forvis-gray-200">
                <h2 className="text-base font-semibold text-forvis-gray-900">Client Information</h2>
              </div>
              <div className="px-4 py-3">
                <dl className="space-y-3">
                  {client.legalEntityType && (
                    <div>
                      <dt className="text-xs font-medium text-forvis-gray-500">Legal Entity</dt>
                      <dd className="mt-1 text-sm text-forvis-gray-900">{client.legalEntityType}</dd>
                    </div>
                  )}
                  {client.jurisdiction && (
                    <div>
                      <dt className="text-xs font-medium text-forvis-gray-500">Jurisdiction</dt>
                      <dd className="mt-1 text-sm text-forvis-gray-900">{client.jurisdiction}</dd>
                    </div>
                  )}
                  {client.taxRegime && (
                    <div>
                      <dt className="text-xs font-medium text-forvis-gray-500">Tax Regime</dt>
                      <dd className="mt-1 text-sm text-forvis-gray-900">{client.taxRegime}</dd>
                    </div>
                  )}
                  {client.financialYearEnd && (
                    <div>
                      <dt className="text-xs font-medium text-forvis-gray-500">Financial Year End</dt>
                      <dd className="mt-1 text-sm text-forvis-gray-900">{client.financialYearEnd}</dd>
                    </div>
                  )}
                  {client.baseCurrency && (
                    <div>
                      <dt className="text-xs font-medium text-forvis-gray-500">Base Currency</dt>
                      <dd className="mt-1 text-sm text-forvis-gray-900">{client.baseCurrency}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Contact Information */}
            {(client.primaryContact || client.email || client.phone || client.address) && (
              <div className="card mt-6">
                <div className="px-4 py-3 border-b border-forvis-gray-200">
                  <h2 className="text-base font-semibold text-forvis-gray-900">Contact Information</h2>
                </div>
                <div className="px-4 py-3">
                  <dl className="space-y-3">
                    {client.primaryContact && (
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Primary Contact</dt>
                        <dd className="mt-1 text-sm text-forvis-gray-900">{client.primaryContact}</dd>
                      </div>
                    )}
                    {client.email && (
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-forvis-gray-900">
                          <a href={`mailto:${client.email}`} className="text-blue-600 hover:text-blue-700">
                            {client.email}
                          </a>
                        </dd>
                      </div>
                    )}
                    {client.phone && (
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-forvis-gray-900">
                          <a href={`tel:${client.phone}`} className="text-blue-600 hover:text-blue-700">
                            {client.phone}
                          </a>
                        </dd>
                      </div>
                    )}
                    {client.address && (
                      <div>
                        <dt className="text-xs font-medium text-forvis-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-forvis-gray-900 whitespace-pre-wrap">{client.address}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="px-4 py-3 border-b border-forvis-gray-200">
                <h2 className="text-base font-semibold text-forvis-gray-900">
                  Projects ({client.projects.length})
                </h2>
              </div>
              <div className="p-4">
                {client.projects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No projects</h3>
                    <p className="mt-1 text-sm text-forvis-gray-600">
                      This client doesn't have any projects yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {client.projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/dashboard/projects/${project.id}`}
                        className="block p-4 border border-forvis-gray-200 rounded-lg hover:border-forvis-blue-500 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-base font-semibold text-forvis-gray-900">
                                {project.name}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getProjectTypeColor(project.projectType)}`}>
                                {formatProjectType(project.projectType)}
                              </span>
                              {project.taxYear && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  {project.taxYear}
                                </span>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-forvis-gray-600 mb-2">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-forvis-gray-500">
                              <span>{project._count.mappings} accounts</span>
                              <span>{project._count.taxAdjustments} adjustments</span>
                              <span>Updated {formatDate(project.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

