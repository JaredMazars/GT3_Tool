'use client';

import { Banknote } from 'lucide-react';

interface RecoverabilityTabProps {
  clientId?: string;  // Can be internal ID or GSClientID depending on context
  groupCode?: string;
}

export function RecoverabilityTab({ clientId, groupCode }: RecoverabilityTabProps) {
  const entityType = clientId ? 'client' : 'group';
  
  return (
    <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
      <Banknote className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
      <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>Recoverability Analytics Coming Soon</h3>
      <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
        This section will display detailed recoverability information and analytics for this {entityType}
      </p>
    </div>
  );
}


