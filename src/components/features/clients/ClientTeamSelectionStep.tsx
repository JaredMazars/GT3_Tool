/**
 * Client Team Selection Step
 * First step in client acceptance flow - select partner, manager, and incharge
 * Changes are pending and only applied when partner approves the acceptance
 */

'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { Button, Banner, Card, SearchCombobox } from '@/components/ui';
import type { SearchComboboxOption } from '@/components/ui';

export interface TeamSelections {
  selectedPartnerCode: string;
  selectedManagerCode: string;
  selectedInchargeCode: string;
}

interface ClientTeamSelectionStepProps {
  GSClientID: string;
  clientData: {
    clientCode: string;
    clientNameFull: string | null;
    groupCode: string;
    groupDesc: string | null;
    clientPartner: string;
    clientManager: string;
    clientIncharge: string;
    industry: string | null;
    forvisMazarsIndustry: string | null;
    forvisMazarsSector: string | null;
  } | null;
  onContinue: (selections: TeamSelections) => void;
  isLoading?: boolean;
}

interface Employee {
  EmpCode: string;
  EmpNameFull: string;
  EmpCatCode: string;
  EmpCatDesc: string;
  OfficeCode: string;
}

export function ClientTeamSelectionStep({
  GSClientID,
  clientData,
  onContinue,
  isLoading = false,
}: ClientTeamSelectionStepProps) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedIncharge, setSelectedIncharge] = useState('');
  
  const [partners, setPartners] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [incharges, setIncharges] = useState<Employee[]>([]);
  
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingIncharges, setLoadingIncharges] = useState(false);
  
  const [partnerSearch, setPartnerSearch] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [inchargeSearch, setInchargeSearch] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  // Helper function to filter and transform employees for SearchCombobox
  const filterOptions = (employees: Employee[], search: string): SearchComboboxOption[] => {
    const filtered = search.trim()
      ? employees.filter(emp => 
          emp.EmpNameFull.toLowerCase().includes(search.toLowerCase()) ||
          emp.EmpCode.toLowerCase().includes(search.toLowerCase())
        )
      : employees;
    
    return filtered.map(emp => ({
      id: emp.EmpCode,
      label: emp.EmpNameFull,
      subtitle: `${emp.EmpCode} - ${emp.EmpCatDesc}`
    }));
  };

  // Initialize with current values when clientData loads
  useEffect(() => {
    if (clientData) {
      setSelectedPartner(clientData.clientPartner || '');
      setSelectedManager(clientData.clientManager || '');
      setSelectedIncharge(clientData.clientIncharge || '');
    }
  }, [clientData]);

  // Load partners
  useEffect(() => {
    const loadPartners = async () => {
      setLoadingPartners(true);
      try {
        const res = await fetch(`/api/clients/${GSClientID}/acceptance/employees?role=partner`);
        if (res.ok) {
          const data = await res.json();
          setPartners(data.data || []);
        } else {
          setError('Failed to load partners list');
        }
      } catch (err) {
        setError('Failed to load partners list');
      } finally {
        setLoadingPartners(false);
      }
    };
    loadPartners();
  }, [GSClientID]);

  // Load managers
  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const res = await fetch(`/api/clients/${GSClientID}/acceptance/employees?role=manager`);
        if (res.ok) {
          const data = await res.json();
          setManagers(data.data || []);
        } else {
          setError('Failed to load managers list');
        }
      } catch (err) {
        setError('Failed to load managers list');
      } finally {
        setLoadingManagers(false);
      }
    };
    loadManagers();
  }, [GSClientID]);

  // Load incharges (excluding selected manager)
  useEffect(() => {
    const loadIncharges = async () => {
      setLoadingIncharges(true);
      try {
        const url = `/api/clients/${GSClientID}/acceptance/employees?role=incharge${selectedManager ? `&excludeManager=${selectedManager}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setIncharges(data.data || []);
          
          // If selected incharge is now the manager, clear it
          if (selectedIncharge === selectedManager) {
            setSelectedIncharge('');
          }
        } else {
          setError('Failed to load incharge list');
        }
      } catch (err) {
        setError('Failed to load incharge list');
      } finally {
        setLoadingIncharges(false);
      }
    };
    loadIncharges();
  }, [GSClientID, selectedManager, selectedIncharge]);

  const handleContinue = () => {
    if (!selectedPartner || !selectedManager || !selectedIncharge) {
      setError('Please select Partner, Manager, and Incharge before continuing');
      return;
    }

    if (selectedManager === selectedIncharge) {
      setError('Manager and Incharge cannot be the same person');
      return;
    }

    onContinue({
      selectedPartnerCode: selectedPartner,
      selectedManagerCode: selectedManager,
      selectedInchargeCode: selectedIncharge,
    });
  };

  if (!clientData) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-forvis-gray-500">Loading client information...</div>
          </div>
        </div>
      </Card>
    );
  }

  const canContinue = selectedPartner && selectedManager && selectedIncharge && selectedManager !== selectedIncharge;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-forvis-gray-900">Team Selection</h2>
            <p className="text-sm text-forvis-gray-600">Select the engagement team for this client</p>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Banner
              variant="error"
              message={error}
              dismissible
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Client Information */}
        <div
          className="rounded-lg p-4 mb-6 border border-forvis-blue-100"
          style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
        >
          <h3 className="text-sm font-semibold text-forvis-gray-900 mb-3">Client Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-forvis-gray-600">Client Name:</span>
              <span className="ml-2 font-medium text-forvis-gray-900">{clientData.clientNameFull || 'N/A'}</span>
            </div>
            <div>
              <span className="text-forvis-gray-600">Client Code:</span>
              <span className="ml-2 font-medium text-forvis-gray-900">{clientData.clientCode}</span>
            </div>
            <div>
              <span className="text-forvis-gray-600">Group:</span>
              <span className="ml-2 font-medium text-forvis-gray-900">{clientData.groupDesc || clientData.groupCode}</span>
            </div>
            <div>
              <span className="text-forvis-gray-600">Industry:</span>
              <span className="ml-2 font-medium text-forvis-gray-900">{clientData.forvisMazarsIndustry || clientData.industry || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <Banner
          variant="info"
          message="Any changes to Partner, Manager, or Incharge will be applied when the selected partner approves this client acceptance assessment."
          className="mb-6"
        />

        {/* Team Selection */}
        <div className="space-y-6 mb-6">
          <h3 className="text-sm font-semibold text-forvis-gray-900">Select Team Members</h3>

          {/* Partner Selection */}
          <div>
            <SearchCombobox
              label="Partner (will approve this acceptance) *"
              value={selectedPartner || null}
              onChange={(value) => setSelectedPartner(value as string || '')}
              onSearchChange={setPartnerSearch}
              options={filterOptions(partners, partnerSearch)}
              placeholder="Select Partner..."
              searchPlaceholder="Search by name or code..."
              isLoading={loadingPartners}
              disabled={isLoading}
              minimumSearchChars={0}
            />
          </div>

          {/* Manager Selection */}
          <div>
            <SearchCombobox
              label="Manager *"
              value={selectedManager || null}
              onChange={(value) => setSelectedManager(value as string || '')}
              onSearchChange={setManagerSearch}
              options={filterOptions(managers, managerSearch)}
              placeholder="Select Manager..."
              searchPlaceholder="Search by name or code..."
              isLoading={loadingManagers}
              disabled={isLoading}
              minimumSearchChars={0}
            />
          </div>

          {/* Incharge Selection */}
          <div>
            <SearchCombobox
              label="Incharge *"
              value={selectedIncharge || null}
              onChange={(value) => setSelectedIncharge(value as string || '')}
              onSearchChange={setInchargeSearch}
              options={filterOptions(incharges, inchargeSearch)}
              placeholder="Select Incharge..."
              searchPlaceholder="Search by name or code..."
              isLoading={loadingIncharges}
              disabled={isLoading || !selectedManager}
              minimumSearchChars={0}
            />
            {!selectedManager && (
              <p className="mt-1 text-xs text-forvis-gray-500">Select a manager first</p>
            )}
          </div>
        </div>

        {/* Current Assignments Reference */}
        {clientData.clientPartner && (
          <div className="rounded-lg bg-forvis-gray-50 p-4 mb-6">
            <h4 className="text-xs font-semibold text-forvis-gray-700 mb-2">Current Assignments (for reference)</h4>
            <div className="text-xs text-forvis-gray-600 space-y-1">
              <div>
                <span className="font-medium">Partner:</span> {clientData.clientPartner}
              </div>
              <div>
                <span className="font-medium">Manager:</span> {clientData.clientManager || 'Not assigned'}
              </div>
              <div>
                <span className="font-medium">Incharge:</span> {clientData.clientIncharge || 'Not assigned'}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="primary"
            onClick={handleContinue}
            disabled={!canContinue || isLoading}
          >
            Continue to Research →
          </Button>
        </div>
      </div>
    </Card>
  );
}
