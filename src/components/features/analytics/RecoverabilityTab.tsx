'use client';

import { BanknotesIcon } from '@heroicons/react/24/outline';

interface RecoverabilityTabProps {
  clientId: string;
}

export function RecoverabilityTab({ clientId }: RecoverabilityTabProps) {
  return (
    <div className="text-center py-16 rounded-xl border-3 border-dashed shadow-lg" style={{ borderColor: '#2E5AAC', borderWidth: '3px', background: 'linear-gradient(135deg, #F8FBFE 0%, #EEF6FC 100%)' }}>
      <BanknotesIcon className="mx-auto h-16 w-16" style={{ color: '#2E5AAC' }} />
      <h3 className="mt-4 text-lg font-bold" style={{ color: '#1C3667' }}>Recoverability Analytics Coming Soon</h3>
      <p className="mt-2 text-sm font-medium" style={{ color: '#2E5AAC' }}>
        This section will display detailed recoverability information and analytics for this client
      </p>
    </div>
  );
}


