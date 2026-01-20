'use client';

import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button, Banner } from '@/components/ui';
import { useTemplateVersions } from '@/hooks/templates/useTemplateVersions';
import { VersionTimeline } from './VersionTimeline';
import { CreateVersionModal } from './CreateVersionModal';
import { VersionDiffViewer } from './VersionDiffViewer';

interface VersionsTabProps {
  templateId: number;
}

export function VersionsTab({ templateId }: VersionsTabProps) {
  const { versions, isLoading, error, refetch } = useTemplateVersions(templateId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<number | null>(null);
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const filteredVersions = filterActiveOnly
    ? versions.filter((v) => v.isActive)
    : versions;

  const handleVersionCreated = () => {
    setShowCreateModal(false);
    setSuccessMessage('New version created successfully');
    setTimeout(() => setSuccessMessage(''), 5000);
    refetch();
  };

  const handleVersionActivated = () => {
    setSuccessMessage('Version activated successfully');
    setTimeout(() => setSuccessMessage(''), 5000);
    refetch();
  };

  const handleVersionRestored = () => {
    setSuccessMessage('Version restored successfully');
    setTimeout(() => setSuccessMessage(''), 5000);
    refetch();
  };

  const handleCompare = (versionId: number) => {
    setCompareVersionId(versionId);
    setShowDiffModal(true);
  };

  if (error) {
    return (
      <div className="py-8">
        <Banner variant="error" message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <Banner
          variant="success"
          message={successMessage}
          dismissible
          onDismiss={() => setSuccessMessage('')}
        />
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-forvis-gray-900">
            Version History
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            variant="secondary"
            size="sm"
          >
            <Filter className="w-4 h-4 mr-1" />
            {filterActiveOnly ? 'Show All' : 'Active Only'}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create New Version
          </Button>
        </div>
      </div>

      {/* Version Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600" />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-forvis-gray-600 mb-4">
            No versions yet. Create your first version to track changes.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(to right, #2E5AAC, #25488A)',
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create First Version
          </Button>
        </div>
      ) : (
        <VersionTimeline
          versions={filteredVersions}
          templateId={templateId}
          onVersionActivated={handleVersionActivated}
          onVersionRestored={handleVersionRestored}
          onCompare={handleCompare}
        />
      )}

      {/* Create Version Modal */}
      {showCreateModal && (
        <CreateVersionModal
          templateId={templateId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleVersionCreated}
        />
      )}

      {/* Diff Viewer Modal */}
      {showDiffModal && compareVersionId && (
        <VersionDiffViewer
          templateId={templateId}
          versionId={compareVersionId}
          onClose={() => {
            setShowDiffModal(false);
            setCompareVersionId(null);
          }}
        />
      )}
    </div>
  );
}
