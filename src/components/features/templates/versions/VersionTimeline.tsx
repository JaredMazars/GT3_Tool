'use client';

import { useState } from 'react';
import {
  Clock,
  User,
  FileText,
  Mail,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  GitCompare,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { VersionHistoryItem } from '@/lib/services/templates/templateVersionService';
import { useActivateVersion, useRestoreVersion } from '@/hooks/templates/useTemplateVersions';

interface VersionTimelineProps {
  versions: VersionHistoryItem[];
  templateId: number;
  onVersionActivated: () => void;
  onVersionRestored: () => void;
  onCompare: (versionId: number) => void;
}

export function VersionTimeline({
  versions,
  templateId,
  onVersionActivated,
  onVersionRestored,
  onCompare,
}: VersionTimelineProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());

  const toggleExpanded = (versionId: number) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  return (
    <div className="space-y-4">
      {versions.map((version, index) => (
        <VersionCard
          key={version.id}
          version={version}
          templateId={templateId}
          isFirst={index === 0}
          isExpanded={expandedVersions.has(version.id)}
          onToggleExpanded={() => toggleExpanded(version.id)}
          onActivated={onVersionActivated}
          onRestored={onVersionRestored}
          onCompare={() => onCompare(version.id)}
        />
      ))}
    </div>
  );
}

interface VersionCardProps {
  version: VersionHistoryItem;
  templateId: number;
  isFirst: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onActivated: () => void;
  onRestored: () => void;
  onCompare: () => void;
}

function VersionCard({
  version,
  templateId,
  isFirst,
  isExpanded,
  onToggleExpanded,
  onActivated,
  onRestored,
  onCompare,
}: VersionCardProps) {
  const { activateVersion, isActivating } = useActivateVersion(
    templateId,
    version.id
  );
  const { restoreVersion, isRestoring } = useRestoreVersion(
    templateId,
    version.id
  );

  const handleActivate = async () => {
    if (
      !window.confirm(
        `Activate version ${version.version}? This will make it the active version for template generation.`
      )
    ) {
      return;
    }

    try {
      await activateVersion();
      onActivated();
    } catch (error) {
      console.error('Failed to activate version:', error);
    }
  };

  const handleRestore = async () => {
    if (
      !window.confirm(
        `Restore version ${version.version}? This will copy all sections from this version back to the current template for editing. The current template state will be replaced.`
      )
    ) {
      return;
    }

    try {
      await restoreVersion();
      onRestored();
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  return (
    <div
      className={`relative rounded-lg border-2 ${
        version.isActive
          ? 'border-forvis-blue-500 bg-forvis-blue-50'
          : 'border-forvis-gray-200 bg-white'
      }`}
    >
      {/* Timeline Line */}
      {!isFirst && (
        <div className="absolute -top-4 left-6 w-0.5 h-4 bg-forvis-gray-300" />
      )}

      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Version Badge */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-sm"
            style={{
              background: version.isActive
                ? 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'
                : 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            }}
          >
            v{version.version}
          </div>

          {/* Version Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-semibold text-forvis-gray-900">
                {version.name}
              </h4>
              {version.isActive && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{
                    background: 'linear-gradient(to right, #10B981, #059669)',
                  }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  ACTIVE
                </span>
              )}
            </div>

            {version.description && (
              <p className="text-sm text-forvis-gray-600 mb-2">
                {version.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-forvis-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(version.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {version.createdBy}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {version._count.TemplateSectionVersion} sections
              </div>
              {version._count.TaskEngagementLetter > 0 && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Used in {version._count.TaskEngagementLetter} letter
                  {version._count.TaskEngagementLetter > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {version.changeNotes && (
              <div className="mt-2 p-2 rounded bg-forvis-gray-50 border border-forvis-gray-200">
                <p className="text-xs text-forvis-gray-700 italic">
                  "{version.changeNotes}"
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!version.isActive && (
              <>
                <Button
                  onClick={handleActivate}
                  disabled={isActivating}
                  size="sm"
                  style={{
                    background: 'linear-gradient(to right, #2E5AAC, #25488A)',
                  }}
                >
                  {isActivating ? 'Activating...' : 'Activate'}
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  variant="secondary"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </Button>
              </>
            )}
            <Button onClick={onCompare} variant="secondary" size="sm">
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </Button>
            <button
              onClick={onToggleExpanded}
              className="p-1 rounded hover:bg-forvis-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-forvis-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-forvis-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-forvis-gray-200">
            <p className="text-sm text-forvis-gray-600">
              Version details and section information would appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
