'use client';

interface StatusBadgeProps {
  status: string;
  type?: 'default' | 'opinion' | 'sars' | 'filing' | 'checklist';
}

export function StatusBadge({ status, type = 'default' }: StatusBadgeProps) {
  const getStatusColor = () => {
    // Opinion draft statuses
    if (type === 'opinion') {
      const colors = {
        DRAFT: 'bg-forvis-gray-100 text-forvis-gray-800 border-forvis-gray-300',
        UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        FINAL: 'bg-green-100 text-green-800 border-green-300',
      };
      return colors[status as keyof typeof colors] || colors.DRAFT;
    }
    
    // SARS response statuses
    if (type === 'sars') {
      const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        IN_PROGRESS: 'bg-forvis-blue-100 text-forvis-blue-800 border-forvis-blue-300',
        SUBMITTED: 'bg-green-100 text-green-800 border-green-300',
        RESOLVED: 'bg-forvis-gray-100 text-forvis-gray-800 border-forvis-gray-300',
      };
      return colors[status as keyof typeof colors] || colors.PENDING;
    }
    
    // Filing statuses
    if (type === 'filing') {
      const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        IN_PROGRESS: 'bg-forvis-blue-100 text-forvis-blue-800 border-forvis-blue-300',
        SUBMITTED: 'bg-purple-100 text-purple-800 border-purple-300',
        APPROVED: 'bg-green-100 text-green-800 border-green-300',
        REJECTED: 'bg-red-100 text-red-800 border-red-300',
      };
      return colors[status as keyof typeof colors] || colors.PENDING;
    }
    
    // Checklist priorities
    if (type === 'checklist') {
      const colors = {
        HIGH: 'text-red-600 bg-red-50 border-red-300',
        MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-300',
        LOW: 'text-green-600 bg-green-50 border-green-300',
      };
      return colors[status as keyof typeof colors] || colors.MEDIUM;
    }
    
    // Default colors
    const defaultColors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      IN_PROGRESS: 'bg-forvis-blue-100 text-forvis-blue-800 border-forvis-blue-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300',
      ACTIVE: 'bg-forvis-blue-100 text-forvis-blue-800 border-forvis-blue-300',
      INACTIVE: 'bg-forvis-gray-100 text-forvis-gray-800 border-forvis-gray-300',
    };
    return defaultColors[status as keyof typeof defaultColors] || 'bg-forvis-gray-100 text-forvis-gray-800 border-forvis-gray-300';
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor()}`}>
      {status}
    </span>
  );
}

