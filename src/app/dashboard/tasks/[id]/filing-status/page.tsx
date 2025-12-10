'use client';

import { useState, useEffect } from 'react';
import { useTask } from '@/hooks/tasks/useTaskData';
import { FilingStatus } from '@/types';
import { Plus, FileCheck, Calendar, CheckCircle } from 'lucide-react';

interface FilingStatusPageProps {
  params: { id: string };
}

export default function FilingStatusPage({ params }: FilingStatusPageProps) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: _task } = useTask(params.id);
  const [filings, setFilings] = useState<FilingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    filingType: '',
    description: '',
    status: 'PENDING',
    deadline: '',
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchFilings();
  }, [params.id]);

  const fetchFilings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${params.id}/filing-status`);
      if (!response.ok) throw new Error('Failed to fetch filings');
      const data = await response.json();
      setFilings(data.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch filings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFiling = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/filing-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create filing');
      await fetchFilings();
      setShowAddModal(false);
      setFormData({
        filingType: '',
        description: '',
        status: 'PENDING',
        deadline: '',
        referenceNumber: '',
        notes: '',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create filing');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
      SUBMITTED: 'bg-purple-100 text-purple-800 border-purple-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status as keyof typeof colors] || colors.PENDING;
  };

  const pendingFilings = filings.filter(f => f.status === 'PENDING' || f.status === 'IN_PROGRESS');
  const submittedFilings = filings.filter(f => f.status === 'SUBMITTED' || f.status === 'APPROVED' || f.status === 'REJECTED');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">Filing Status</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Track tax filings and submissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <Plus className="w-5 h-5" />
          Add Filing
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600">Total Filings</p>
              <p className="text-2xl font-bold text-forvis-blue-600 mt-1">{filings.length}</p>
            </div>
            <FileCheck className="w-8 h-8 text-forvis-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-corporate border-2 border-yellow-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingFilings.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-corporate border-2 border-purple-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {filings.filter(f => f.status === 'SUBMITTED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-corporate border-2 border-green-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {filings.filter(f => f.status === 'APPROVED').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Pending Filings */}
      {pendingFilings.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
          <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
            <h3 className="text-sm font-bold text-white">Pending Filings ({pendingFilings.length})</h3>
          </div>
          <div className="divide-y divide-forvis-gray-200">
            {pendingFilings.map((filing) => (
              <div key={filing.id} className="p-4 hover:bg-forvis-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-forvis-gray-900">{filing.filingType}</h4>
                    {filing.description && (
                      <p className="text-sm text-forvis-gray-700 mt-1">{filing.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(filing.status)}`}>
                    {filing.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-forvis-gray-600">
                  {filing.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(filing.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {filing.referenceNumber && (
                    <span>Ref: {filing.referenceNumber}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted Filings */}
      {submittedFilings.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
          <div className="px-4 py-3 bg-green-100 border-b border-green-200">
            <h3 className="text-sm font-bold text-green-900">Submitted Filings ({submittedFilings.length})</h3>
          </div>
          <div className="divide-y divide-forvis-gray-200">
            {submittedFilings.map((filing) => (
              <div key={filing.id} className="p-4 hover:bg-forvis-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-forvis-gray-900">{filing.filingType}</h4>
                    {filing.description && (
                      <p className="text-sm text-forvis-gray-700 mt-1">{filing.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(filing.status)}`}>
                    {filing.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-forvis-gray-600">
                  {filing.submittedDate && (
                    <span>Submitted: {new Date(filing.submittedDate).toLocaleDateString()}</span>
                  )}
                  {filing.approvedDate && (
                    <span>Approved: {new Date(filing.approvedDate).toLocaleDateString()}</span>
                  )}
                  {filing.referenceNumber && (
                    <span>Ref: {filing.referenceNumber}</span>
                  )}
                </div>
                {filing.notes && (
                  <p className="text-xs text-forvis-gray-600 mt-2 pt-2 border-t border-forvis-gray-200">
                    {filing.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filings.length === 0 && (
        <div className="bg-white rounded-lg shadow-corporate border-2 p-12 text-center" style={{ borderColor: '#2E5AAC' }}>
          <FileCheck className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Filings Yet</h3>
          <p className="text-sm text-forvis-gray-600">
            Add filings to track your submission status.
          </p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-forvis-gray-900">Add Filing</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Filing Type *</label>
                <input
                  type="text"
                  value={formData.filingType}
                  onChange={(e) => setFormData({ ...formData, filingType: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  placeholder="e.g., IT14, IT12, VAT201"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    filingType: '',
                    description: '',
                    status: 'PENDING',
                    deadline: '',
                    referenceNumber: '',
                    notes: '',
                  });
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFiling}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                Add Filing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
