/**
 * Bug Reports Admin Client Component
 * Manages bug reports submitted by users
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Trash2, Eye, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useBugReports, useUpdateBugReport, useDeleteBugReport } from '@/hooks/bug-reports/useBugReports';
import { BugReportStatus, BugReportPriority, BugReportWithReporter } from '@/types/bugReport';

export function BugReportsAdminClient() {
  const [statusFilter, setStatusFilter] = useState<BugReportStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<BugReportPriority | ''>('');
  const [selectedReport, setSelectedReport] = useState<BugReportWithReporter | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<BugReportWithReporter | null>(null);

  const { data: bugReports, isLoading } = useBugReports({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const updateMutation = useUpdateBugReport();
  const deleteMutation = useDeleteBugReport();

  // Close delete confirmation modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteConfirmReport) {
        setDeleteConfirmReport(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteConfirmReport]);

  const handleViewDetails = async (report: BugReportWithReporter) => {
    setSelectedReport(report);
    setResolutionNotes(report.resolutionNotes || '');
    setScreenshotUrl(null);

    // Load screenshot URL if available
    if (report.screenshotPath) {
      try {
        const response = await fetch(`/api/bug-reports/${report.id}/screenshot`);
        if (response.ok) {
          const data = await response.json();
          setScreenshotUrl(data.data.url);
        }
      } catch (err) {
        console.error('Failed to load screenshot:', err);
      }
    }
  };

  const handleUpdateStatus = async (id: number, status: BugReportStatus) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleUpdatePriority = async (id: number, priority: BugReportPriority) => {
    try {
      await updateMutation.mutateAsync({ id, priority });
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleSaveResolutionNotes = async () => {
    if (!selectedReport) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedReport.id,
        resolutionNotes,
      });
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to save resolution notes:', error);
    }
  };

  const handleDeleteClick = (report: BugReportWithReporter) => {
    setDeleteConfirmReport(report);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmReport) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmReport.id);
      if (selectedReport?.id === deleteConfirmReport.id) {
        setSelectedReport(null);
      }
      setDeleteConfirmReport(null);
    } catch (error) {
      console.error('Failed to delete bug report:', error);
    }
  };

  const getStatusBadge = (status: BugReportStatus) => {
    const styles = {
      OPEN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      TESTING: 'bg-blue-100 text-blue-800 border-blue-300',
      RESOLVED: 'bg-green-100 text-green-800 border-green-300',
    };

    const icons = {
      OPEN: AlertCircle,
      TESTING: Clock,
      RESOLVED: CheckCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: BugReportPriority) => {
    const styles = {
      LOW: 'bg-gray-100 text-gray-800 border-gray-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-forvis-gray-900">Bug Reports</h1>
        <p className="mt-2 text-sm text-forvis-gray-700">
          Manage and track user-reported bugs
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BugReportStatus | '')}
            className="rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          >
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="TESTING">Testing</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
            Priority
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as BugReportPriority | '')}
            className="rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
          >
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-forvis-gray-600">Loading bug reports...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && bugReports && bugReports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-corporate">
          <AlertCircle className="w-12 h-12 text-forvis-gray-400 mx-auto mb-4" />
          <p className="text-forvis-gray-600">No bug reports found</p>
        </div>
      )}

      {/* Bug Reports Table */}
      {!isLoading && bugReports && bugReports.length > 0 && (
        <div className="bg-white rounded-lg shadow-corporate overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-forvis-gray-200">
              <thead style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Reporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Reported
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-forvis-gray-200">
                {bugReports.map((report, index) => (
                  <tr
                    key={report.id}
                    onClick={() => handleViewDetails(report)}
                    className={`cursor-pointer hover:bg-forvis-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-forvis-gray-900">
                      #{report.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-900">
                      <div>
                        <div className="font-medium">{report.reporter.name || 'Unknown'}</div>
                        <div className="text-xs text-forvis-gray-600">{report.reporter.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-forvis-gray-900">
                      <div className="max-w-md truncate" title={report.description}>
                        {report.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status as BugReportStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={report.priority}
                        onChange={(e) => handleUpdatePriority(report.id, e.target.value as BugReportPriority)}
                        className="text-xs rounded-md border-0 bg-transparent focus:ring-2 focus:ring-forvis-blue-500"
                        disabled={updateMutation.isPending}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                      {new Date(report.reportedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewDetails(report)}
                        className="text-forvis-blue-600 hover:text-forvis-blue-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      {report.status === BugReportStatus.OPEN && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, BugReportStatus.TESTING)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Mark as testing"
                          disabled={updateMutation.isPending}
                        >
                          <Clock className="w-4 h-4 inline" />
                        </button>
                      )}
                      {(report.status === BugReportStatus.OPEN || report.status === BugReportStatus.TESTING) && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, BugReportStatus.RESOLVED)}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as resolved"
                          disabled={updateMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 inline" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(report)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedReport(null)}
          />
          <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-3xl w-full mx-4 z-50 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div
              className="px-6 py-4 border-b-2 border-forvis-gray-200 sticky top-0 bg-white z-10"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Bug Report #{selectedReport.id}</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-white hover:text-forvis-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  {getStatusBadge(selectedReport.status as BugReportStatus)}
                </div>
                {getPriorityBadge(selectedReport.priority as BugReportPriority)}
              </div>

              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  Reporter
                </label>
                <p className="text-sm text-forvis-gray-900">
                  {selectedReport.reporter.name || 'Unknown'} ({selectedReport.reporter.email})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  URL
                </label>
                <a
                  href={selectedReport.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-forvis-blue-600 hover:underline break-all"
                >
                  {selectedReport.url}
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  Description
                </label>
                <p className="text-sm text-forvis-gray-900 whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.screenshotPath && (
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    Screenshot
                  </label>
                  {screenshotUrl ? (
                    <img
                      src={screenshotUrl}
                      alt="Bug screenshot"
                      className="w-full h-auto rounded-lg border border-forvis-gray-300"
                    />
                  ) : (
                    <p className="text-sm text-forvis-gray-600">Loading screenshot...</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-forvis-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
                  placeholder="Add notes about the resolution..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedReport(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveResolutionNotes}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setDeleteConfirmReport(null)}
          />
          <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-md w-full mx-4 z-50">
            {/* Modal Header */}
            <div
              className="px-6 py-4 rounded-t-lg"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-white" />
                <h3 className="text-lg font-semibold text-white">Delete Bug Report</h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-forvis-gray-900">
                Are you sure you want to delete this bug report? This action cannot be undone.
              </p>

              <div className="bg-forvis-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="text-xs font-medium text-forvis-gray-600">Report ID:</span>
                  <span className="ml-2 text-sm font-semibold text-forvis-gray-900">#{deleteConfirmReport.id}</span>
                </div>
                <div>
                  <span className="text-xs font-medium text-forvis-gray-600">Reporter:</span>
                  <span className="ml-2 text-sm text-forvis-gray-900">{deleteConfirmReport.reporter.name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-xs font-medium text-forvis-gray-600">Description:</span>
                  <p className="text-sm text-forvis-gray-900 mt-1 line-clamp-2">
                    {deleteConfirmReport.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirmReport(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
