'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

interface Client {
  id: number;
  clientCode?: string;
  name: string;
  registrationNumber?: string;
  taxNumber?: string;
  industry?: string;
  legalEntityType?: string;
  primaryContact?: string;
  email?: string;
  phone?: string;
  _count: {
    Project: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    clientCode: '',
    registrationNumber: '',
    taxNumber: '',
    industry: '',
    legalEntityType: '',
    jurisdiction: '',
    taxRegime: '',
    financialYearEnd: '',
    baseCurrency: 'ZAR',
    primaryContact: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.taxNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data.success ? data.data.clients : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to create client');
      }

      resetForm();
      setShowModal(false);
      await fetchClients();
    } catch (error) {
      console.error('Error creating client:', error);
      setError(error instanceof Error ? error.message : 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to update client');
      }

      resetForm();
      setShowEditModal(false);
      setSelectedClient(null);
      await fetchClients();
    } catch (error) {
      console.error('Error updating client:', error);
      setError(error instanceof Error ? error.message : 'Failed to update client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      setShowDeleteModal(false);
      setSelectedClient(null);
      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      clientCode: '',
      registrationNumber: '',
      taxNumber: '',
      industry: '',
      legalEntityType: '',
      jurisdiction: '',
      taxRegime: '',
      financialYearEnd: '',
      baseCurrency: 'ZAR',
      primaryContact: '',
      email: '',
      phone: '',
      address: '',
    });
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setError('');
    // Fetch full client details
    fetch(`/api/clients/${client.id}`)
      .then(res => res.json())
      .then(data => {
        const clientData = data.success ? data.data : data;
        setFormData({
          name: clientData.name || '',
          clientCode: clientData.clientCode || '',
          registrationNumber: clientData.registrationNumber || '',
          taxNumber: clientData.taxNumber || '',
          industry: clientData.industry || '',
          legalEntityType: clientData.legalEntityType || '',
          jurisdiction: clientData.jurisdiction || '',
          taxRegime: clientData.taxRegime || '',
          financialYearEnd: clientData.financialYearEnd || '',
          baseCurrency: clientData.baseCurrency || 'ZAR',
          primaryContact: clientData.primaryContact || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
          address: clientData.address || '',
        });
        setShowEditModal(true);
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forvis-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forvis-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-forvis-gray-900">Clients</h1>
          <p className="mt-2 text-sm text-forvis-gray-700">
            Manage your clients and their associated projects
          </p>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-forvis-gray-300 rounded-lg focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setError('');
              setShowModal(true);
            }}
            className="ml-4 btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Client
          </button>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="card text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-forvis-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-forvis-gray-900">No clients</h3>
            <p className="mt-1 text-sm text-forvis-gray-600">
              {searchTerm ? 'No clients match your search.' : 'Get started by creating a new client.'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-forvis-gray-200">
              <thead className="bg-forvis-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Client Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Tax Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Registration #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-forvis-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-forvis-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/clients/${client.id}`} className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                          <BuildingOfficeIcon className="h-5 w-5 text-forvis-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-forvis-gray-900">{client.name}</div>
                          <div className="text-sm text-forvis-gray-500">{client.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                      {client.clientCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                      {client.taxNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                      {client.registrationNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                      {client.industry || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-forvis-gray-600">
                      {client.primaryContact || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                        <FolderIcon className="h-3 w-3 mr-1" />
                        {client._count.Project}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(client)}
                        className="text-forvis-blue-600 hover:text-forvis-blue-900 mr-4"
                      >
                        <PencilIcon className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <h2 className="text-2xl font-bold text-gray-900">
                  {showModal ? 'Create New Client' : 'Edit Client'}
                </h2>
              </div>

              <form onSubmit={showModal ? handleCreate : handleUpdate} className="p-6 space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Fields marked with <span className="text-red-500">*</span> are required.
                </p>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Code
                    </label>
                    <input
                      type="text"
                      value={formData.clientCode}
                      onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                      placeholder="e.g., CLI001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Must be unique. For integration with existing client database.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Number
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Entity Type
                    </label>
                    <input
                      type="text"
                      value={formData.legalEntityType}
                      onChange={(e) => setFormData({ ...formData, legalEntityType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jurisdiction
                    </label>
                    <input
                      type="text"
                      value={formData.jurisdiction}
                      onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Regime
                    </label>
                    <input
                      type="text"
                      value={formData.taxRegime}
                      onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Financial Year End (MM-DD)
                    </label>
                    <input
                      type="text"
                      placeholder="03-31"
                      value={formData.financialYearEnd}
                      onChange={(e) => setFormData({ ...formData, financialYearEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Currency
                    </label>
                    <input
                      type="text"
                      value={formData.baseCurrency}
                      onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Contact
                    </label>
                    <input
                      type="text"
                      value={formData.primaryContact}
                      onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setShowEditModal(false);
                      setSelectedClient(null);
                      setError('');
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isSubmitting ? 'Saving...' : (showModal ? 'Create Client' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Delete Client</h2>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedClient.name}</span>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Client'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

