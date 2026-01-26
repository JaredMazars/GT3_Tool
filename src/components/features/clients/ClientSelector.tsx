'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';

interface ClientSelectorProps {
  value?: number | null;
  onChange: (clientId: number | null) => void;  // Internal ID
  allowCreate?: boolean; // Note: Quick create is currently disabled due to new required fields
}

export function ClientSelector({ value, onChange, allowCreate = false }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  // Quick create is disabled - new client schema requires many mandatory fields
  // const [showCreateForm, setShowCreateForm] = useState(false);
  // const [newClientName, setNewClientName] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (data.success) {
        setClients(data.data.clients);
      }
    } catch (error) {
      // Failed to fetch clients
    } finally {
      setLoading(false);
    }
  };

  // Quick create is disabled - new client schema requires many mandatory fields
  // Users should use the full client creation form instead
  // const handleCreateClient = async () => {
  //   // Requires: clientCode, groupCode, groupDesc, clientPartner, clientManager,
  //   // clientIncharge, active, clientOCFlag, rolePlayer, typeCode, typeDesc
  // };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number.parseInt(e.target.value) : null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a client...</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.clientNameFull || client.clientCode}
          </option>
        ))}
      </select>

      {allowCreate && (
        <p className="text-xs text-gray-500 mt-2">
          To create a new client, please use the Clients page.
        </p>
      )}
    </div>
  );
}






