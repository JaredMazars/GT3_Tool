'use client';

import { useState, useEffect } from 'react';
import { useTask } from '@/hooks/tasks/useTaskData';
import { ComplianceChecklistItem } from '@/types';
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ComplianceChecklistPageProps {
  params: { id: string };
}

export default function ComplianceChecklistPage({ params }: ComplianceChecklistPageProps) {
  // Note: In client components, params is already resolved (not a Promise)
  const { data: _task } = useTask(params.id);
  const [items, setItems] = useState<ComplianceChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    assignedTo: '',
  });

  useEffect(() => {
    fetchItems();
  }, [params.id]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${params.id}/compliance-checklist`);
      if (!response.ok) throw new Error('Failed to fetch checklist');
      const data = await response.json();
      setItems(data.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch checklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/compliance-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create item');
      await fetchItems();
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        assignedTo: '',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create item');
    }
  };

  const handleToggleComplete = async (itemId: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/compliance-checklist/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: completed ? 'COMPLETED' : 'PENDING',
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update item');
      await fetchItems();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update item');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      HIGH: 'text-red-600 bg-red-50 border-red-300',
      MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-300',
      LOW: 'text-green-600 bg-green-50 border-green-300',
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  const pendingItems = items.filter(i => i.status !== 'COMPLETED');
  const completedItems = items.filter(i => i.status === 'COMPLETED');
  const completionRate = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

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
          <h2 className="text-2xl font-bold text-forvis-gray-900">Compliance Checklist</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">Track compliance tasks and deadlines</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-corporate border-2 p-4" style={{ borderColor: '#2E5AAC' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-forvis-gray-900">Overall Progress</span>
          <span className="text-sm font-semibold text-forvis-gray-900">{completionRate}%</span>
        </div>
        <div className="w-full bg-forvis-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${completionRate}%`,
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-forvis-gray-600">
          <span>{completedItems.length} completed</span>
          <span>{pendingItems.length} pending</span>
        </div>
      </div>

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
          <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}>
            <h3 className="text-sm font-bold text-white">Pending Tasks ({pendingItems.length})</h3>
          </div>
          <div className="divide-y divide-forvis-gray-200">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-forvis-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleToggleComplete(item.id, true)}
                    className="mt-1 w-5 h-5 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-forvis-gray-900">{item.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-forvis-gray-700 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-forvis-gray-600">
                      {item.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.assignedTo && (
                        <span>Assigned to: {item.assignedTo}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate border-2" style={{ borderColor: '#2E5AAC' }}>
          <div className="px-4 py-3 bg-green-100 border-b border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-bold text-green-900">Completed Tasks ({completedItems.length})</h3>
            </div>
          </div>
          <div className="divide-y divide-forvis-gray-200">
            {completedItems.map((item) => (
              <div key={item.id} className="p-4 bg-green-50 hover:bg-green-100 transition-colors">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggleComplete(item.id, false)}
                    className="mt-1 w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-600"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-500 line-through">{item.title}</h4>
                    {item.completedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed on {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="bg-white rounded-lg shadow-corporate border-2 p-12 text-center" style={{ borderColor: '#2E5AAC' }}>
          <CheckCircle className="w-16 h-16 mx-auto text-forvis-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Tasks Yet</h3>
          <p className="text-sm text-forvis-gray-600">
            Add tasks to start tracking your compliance checklist.
          </p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-corporate-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4 text-forvis-gray-900">Add Compliance Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">Assigned To</label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-600 focus:border-transparent"
                  placeholder="User email"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    title: '',
                    description: '',
                    dueDate: '',
                    priority: 'MEDIUM',
                    assignedTo: '',
                  });
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-corporate"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
