'use client';

import { useState, useEffect } from 'react';
import { useTask } from '@/hooks/tasks/useTaskData';
import { SarsResponse } from '@/types';
import { Plus, Mail, Calendar, Clock } from 'lucide-react';

interface SarsResponsesPageProps {
  params: { id: string };
}

export default function SarsResponsesPage({ params }: SarsResponsesPageProps) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: _task } = useTask(params.id);
  const [responses, setResponses] = useState<SarsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    referenceNumber: '',
    subject: '',
    content: '',
    responseType: 'QUERY',
    status: 'PENDING',
    deadline: '',
  });

  useEffect(() => {
    fetchResponses();
  }, [params.id]);

  const fetchResponses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${params.id}/sars-responses`);
      if (!response.ok) throw new Error('Failed to fetch responses');
      const data = await response.json();
      setResponses(data.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch responses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateResponse = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/sars-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create response');
      await fetchResponses();
      setShowAddModal(false);
      setFormData({
        referenceNumber: '',
        subject: '',
        content: '',
        responseType: 'QUERY',
        status: 'PENDING',
        deadline: '',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create response');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
      SUBMITTED: 'bg-green-100 text-green-800 border-green-300',
      RESOLVED: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status as keyof typeof colors] || colors.PENDING;
  };

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
          <h2 className="text-2xl font-bold text-forvis-gray-900">SARS Responses</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Track correspondence and responses to SARS</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <Plus className="w-5 h-5" />
          New Response
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {responses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-corporate border-2 p-12 text-center" style={{ borderColor: '#2E5AAC' }}>
            <Mail className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No SARS Responses Yet</h3>
            <p className="text-sm text-forvis-gray-600">
              Create your first SARS response to start tracking correspondence.
            </p>
          </div>
        ) : (
          responses.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-corporate border-2 overflow-hidden"
              style={{ borderColor: '#2E5AAC' }}
            >
              <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-white" />
                    <h3 className="text-sm font-bold text-white">{item.subject}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-forvis-gray-700">Reference Number:</span>
                  <span className="text-forvis-gray-900">{item.referenceNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-forvis-gray-700">Type:</span>
                  <span className="text-forvis-gray-900">{item.responseType}</span>
                </div>
                {item.deadline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-forvis-gray-700">Deadline:</span>
                    <span className="text-forvis-gray-900 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(item.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-forvis-gray-200">
                  <p className="text-sm text-forvis-gray-700">{item.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-forvis-gray-900">Create SARS Response</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Reference Number *</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  placeholder="e.g., SARS-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Response Type *</label>
                  <select
                    value={formData.responseType}
                    onChange={(e) => setFormData({ ...formData, responseType: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  >
                    <option value="QUERY">Query</option>
                    <option value="REQUEST">Request</option>
                    <option value="AUDIT">Audit</option>
                    <option value="OBJECTION">Objection</option>
                  </select>
                </div>
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
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
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
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent text-sm"
                  placeholder="Describe the SARS correspondence..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    referenceNumber: '',
                    subject: '',
                    content: '',
                    responseType: 'QUERY',
                    status: 'PENDING',
                    deadline: '',
                  });
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateResponse}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                Create Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
