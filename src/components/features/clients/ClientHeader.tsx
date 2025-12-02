import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Client } from '@/types';

interface ClientHeaderProps {
  client: Client;
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <div className="card mb-6">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
              <BuildingOfficeIcon className="h-8 w-8 text-forvis-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-forvis-gray-900 mb-2">
                {client.clientNameFull || client.clientCode}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-forvis-gray-600">
                <span><span className="font-medium">Client Code:</span> {client.clientCode}</span>
                {client.industry && (
                  <span><span className="font-medium">Industry:</span> {client.industry}</span>
                )}
                <span><span className="font-medium">Group:</span> {client.groupDesc}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.active === 'YES' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.active === 'YES' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

