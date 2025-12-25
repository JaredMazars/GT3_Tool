'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  BarChart3,
  Link,
} from 'lucide-react';
import { AlertModal } from '@/components/shared/AlertModal';
import { LoadingSpinner } from '@/components/ui';

interface ExternalServiceLine {
  id: number;
  ServLineCode: string | null;
  ServLineDesc: string | null;
  GLPrefix: string | null;
  SLGroup: string | null;
  masterCode: string | null;
  SubServlineGroupCode: string | null;
  SubServlineGroupDesc: string | null;
  taskCount?: number;
  masterServiceLine: {
    code: string;
    name: string;
    description: string | null;
  } | null;
}

interface MasterServiceLine {
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

interface MappingStats {
  total: number;
  mapped: number;
  unmapped: number;
  mappingsByMaster: Record<string, number>;
}

type FilterStatus = 'all' | 'mapped' | 'unmapped';

export default function ServiceLineMappingPage() {
  const [externalServiceLines, setExternalServiceLines] = useState<ExternalServiceLine[]>([]);
  const [masterServiceLines, setMasterServiceLines] = useState<MasterServiceLine[]>([]);
  const [stats, setStats] = useState<MappingStats>({
    total: 0,
    mapped: 0,
    unmapped: 0,
    mappingsByMaster: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterMaster, setFilterMaster] = useState<string>('');
  const [selectedExternal, setSelectedExternal] = useState<number[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch external and master service lines
      const [dataResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/service-line-mapping'),
        fetch('/api/admin/service-line-mapping/stats'),
      ]);

      if (!dataResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const dataResult = await dataResponse.json();
      const statsResult = await statsResponse.json();

      if (dataResult.success && statsResult.success) {
        setExternalServiceLines(dataResult.data.externalServiceLines);
        setMasterServiceLines(dataResult.data.masterServiceLines);
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch service line data:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error Loading Data',
        message: 'Failed to load service line mapping data. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMapping = async (externalId: number, masterCode: string | null) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/admin/service-line-mapping/${externalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterCode }),
      });

      if (!response.ok) throw new Error('Failed to update mapping');

      await fetchData();
      setSelectedExternal([]);
    } catch (error) {
      console.error('Failed to update mapping:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update mapping. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkMapping = async () => {
    if (!selectedMaster || selectedExternal.length === 0) return;

    try {
      setIsUpdating(true);
      const response = await fetch('/api/admin/service-line-mapping/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalIds: selectedExternal,
          masterCode: selectedMaster,
        }),
      });

      if (!response.ok) throw new Error('Failed to bulk map');

      await fetchData();
      setSelectedExternal([]);
      setSelectedMaster(null);
      setShowBulkConfirm(false);
    } catch (error) {
      console.error('Failed to bulk map:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to bulk map service lines. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMasterClick = (masterCode: string) => {
    if (selectedExternal.length > 0) {
      setSelectedMaster(masterCode);
      setShowBulkConfirm(true);
    }
  };

  const toggleExternalSelection = (id: number) => {
    setSelectedExternal((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedExternal.length === filteredExternal.length) {
      setSelectedExternal([]);
    } else {
      setSelectedExternal(filteredExternal.map((e) => e.id));
    }
  };

  // Filter external service lines
  const filteredExternal = externalServiceLines.filter((external) => {
    const matchesSearch =
      !searchTerm ||
      external.SubServlineGroupCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      external.SubServlineGroupDesc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      external.ServLineCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      external.ServLineDesc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      external.SLGroup?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'mapped' && external.masterCode !== null) ||
      (filterStatus === 'unmapped' && external.masterCode === null);

    const matchesMaster =
      !filterMaster || external.masterCode === filterMaster;

    return matchesSearch && matchesStatus && matchesMaster;
  });

  const getMasterName = (code: string) => {
    return masterServiceLines.find((m) => m.code === code)?.name || code;
  };

  return (
    <div className="min-h-screen bg-forvis-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Link className="h-8 w-8 text-forvis-blue-600" />
            <h1 className="text-3xl font-bold text-forvis-gray-900">
              Service Line Mapping
            </h1>
          </div>
          <p className="text-forvis-gray-700">
            Map external service lines to master service lines for data consolidation
          </p>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
            style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Total External</p>
                <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{stats.total}</p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
              >
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-4 shadow-corporate border border-green-100"
            style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Mapped</p>
                <p className="text-2xl font-bold mt-2 text-green-600">{stats.mapped}</p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #16A34A, #15803D)' }}
              >
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-4 shadow-corporate border border-yellow-100"
            style={{ background: 'linear-gradient(135deg, #FEFCE8 0%, #FEF9C3 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Unmapped</p>
                <p className="text-2xl font-bold mt-2 text-yellow-600">{stats.unmapped}</p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #EAB308, #CA8A04)' }}
              >
                <XCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
            style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Completion</p>
                <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                  {stats.total > 0 ? Math.round((stats.mapped / stats.total) * 100) : 0}%
                </p>
              </div>
              <div
                className="rounded-full p-2.5"
                style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
              <input
                type="text"
                placeholder="Search external service lines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="mapped">Mapped Only</option>
              <option value="unmapped">Unmapped Only</option>
            </select>

            {/* Filter by Master */}
            <select
              value={filterMaster}
              onChange={(e) => setFilterMaster(e.target.value)}
              className="px-4 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            >
              <option value="">All Master Service Lines</option>
              {masterServiceLines.map((master) => (
                <option key={master.code} value={master.code}>
                  {master.name}
                </option>
              ))}
            </select>
          </div>

          {selectedExternal.length > 0 && (
            <div className="mt-4 p-3 bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg">
              <p className="text-sm font-medium text-forvis-blue-800">
                {selectedExternal.length} external service line(s) selected. Click a master
                service line on the right to map them.
              </p>
              <button
                onClick={() => setSelectedExternal([])}
                className="mt-2 text-sm text-forvis-blue-600 hover:text-forvis-blue-800 font-medium"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Two-Column Layout */}
        {isLoading ? (
          <div className="text-center py-16">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-forvis-gray-600">Loading service line data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: External Service Lines */}
            <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
                }}
              >
                <h2 className="text-lg font-bold text-white">
                  External Service Lines ({filteredExternal.length})
                </h2>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-medium text-white hover:underline"
                >
                  {selectedExternal.length === filteredExternal.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {filteredExternal.length === 0 ? (
                  <div className="p-8 text-center text-forvis-gray-600">
                    No external service lines match your filters.
                  </div>
                ) : (
                  filteredExternal.map((external, index) => (
                    <div
                      key={external.id}
                      className={`p-4 border-b border-forvis-gray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                      } hover:bg-forvis-blue-50 transition-colors`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedExternal.includes(external.id)}
                          onChange={() => toggleExternalSelection(external.id)}
                          className="mt-1 h-4 w-4 text-forvis-blue-600 focus:ring-forvis-blue-500 border-forvis-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-bold text-forvis-gray-900">
                              {external.SubServlineGroupCode || 'N/A'}
                            </h3>
                            {external.masterCode ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Mapped
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Unmapped
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-forvis-gray-700 mb-2">
                            {external.SubServlineGroupDesc || 'No description'}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-forvis-gray-500">Service Line:</span>{' '}
                              <span className="font-medium text-forvis-gray-800">
                                {external.ServLineCode || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-forvis-gray-500">SL Group:</span>{' '}
                              <span className="font-medium text-forvis-gray-800">
                                {external.SLGroup || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-forvis-gray-500">SL Description:</span>{' '}
                              <span className="font-medium text-forvis-gray-800">
                                {external.ServLineDesc || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-forvis-gray-500">GL Prefix:</span>{' '}
                              <span className="font-medium text-forvis-gray-800">
                                {external.GLPrefix || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-forvis-gray-500">Tasks:</span>{' '}
                              <span className="font-medium text-forvis-blue-600">
                                {external.taskCount || 0}
                              </span>
                            </div>
                          </div>
                          {external.masterCode && (
                            <div className="mt-2 pt-2 border-t border-forvis-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-forvis-gray-500">Mapped to:</p>
                                  <p className="text-sm font-medium text-forvis-blue-700">
                                    {getMasterName(external.masterCode)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleUpdateMapping(external.id, null)}
                                  disabled={isUpdating}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Master Service Lines */}
            <div className="bg-white rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden">
              <div
                className="px-4 py-3"
                style={{
                  background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
                }}
              >
                <h2 className="text-lg font-bold text-white">
                  Master Service Lines ({masterServiceLines.length})
                </h2>
                {selectedExternal.length > 0 && (
                  <p className="text-xs text-white opacity-90 mt-1">
                    Click to map {selectedExternal.length} selected item(s)
                  </p>
                )}
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {masterServiceLines.length === 0 ? (
                  <div className="p-8 text-center text-forvis-gray-600">
                    No master service lines available.
                  </div>
                ) : (
                  masterServiceLines.map((master, index) => {
                    const mappedCount = stats.mappingsByMaster[master.code] || 0;
                    const isClickable = selectedExternal.length > 0;

                    return (
                      <div
                        key={master.code}
                        onClick={() => isClickable && handleMasterClick(master.code)}
                        className={`p-4 border-b border-forvis-gray-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                        } ${
                          isClickable
                            ? 'hover:bg-forvis-blue-50 cursor-pointer'
                            : ''
                        } transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-forvis-gray-900 mb-1">
                              {master.name}
                            </h3>
                            <p className="text-xs text-forvis-gray-600 mb-2">
                              Code: {master.code}
                            </p>
                            {master.description && (
                              <p className="text-xs text-forvis-gray-700 mb-2">
                                {master.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  master.active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {master.active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-forvis-gray-600">
                                {mappedCount} mapped
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Mapping Confirmation Modal */}
        {showBulkConfirm && selectedMaster && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow-corporate-lg">
              <h2 className="text-xl font-bold text-forvis-gray-900 mb-4">
                Confirm Bulk Mapping
              </h2>
              <p className="text-forvis-gray-700 mb-4">
                Are you sure you want to map <strong>{selectedExternal.length}</strong>{' '}
                external service line(s) to:
              </p>
              <div className="p-3 bg-forvis-blue-50 border border-forvis-blue-200 rounded-lg mb-6">
                <p className="font-bold text-forvis-blue-900">
                  {getMasterName(selectedMaster)}
                </p>
                <p className="text-sm text-forvis-blue-700">Code: {selectedMaster}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowBulkConfirm(false);
                    setSelectedMaster(null);
                  }}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-forvis-gray-700 bg-forvis-gray-100 rounded-lg hover:bg-forvis-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkMapping}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-forvis-blue-600 rounded-lg hover:bg-forvis-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? 'Mapping...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
        />
      </div>
    </div>
  );
}










