/**
 * Client Team Selection Step
 * First step in client acceptance flow - select partner, manager, and incharge
 * Changes are pending and only applied when partner approves the acceptance
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { Button, Banner, Card, SearchCombobox } from '@/components/ui';
import type { SearchComboboxOption } from '@/components/ui';
import { EmployeeStatusBadge } from '@/components/shared/EmployeeStatusBadge';
import { GRADIENTS } from '@/lib/design-system/gradients';

export interface TeamSelections {
  selectedPartnerCode: string;
  selectedManagerCode: string;
  selectedInchargeCode: string;
}

interface EmployeeStatus {
  isActive: boolean;
  hasUserAccount: boolean;
}

interface ClientTeamSelectionStepProps {
  GSClientID: string;
  clientData: {
    clientCode: string;
    clientNameFull: string | null;
    groupCode: string;
    groupDesc: string | null;
    clientPartner: string;
    clientPartnerName?: string;
    clientPartnerStatus?: EmployeeStatus;
    clientManager: string;
    clientManagerName?: string;
    clientManagerStatus?: EmployeeStatus;
    clientIncharge: string;
    clientInchargeName?: string;
    clientInchargeStatus?: EmployeeStatus;
    industry: string | null;
    forvisMazarsIndustry: string | null;
    forvisMazarsSector: string | null;
  } | null;
  onContinue: (selections: TeamSelections) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  // Initial selection props (from parent's teamSelections state)
  initialPartnerCode?: string;
  initialManagerCode?: string;
  initialInchargeCode?: string;
}

interface Employee {
  EmpCode: string;
  EmpNameFull: string;
  EmpCatCode: string;
  EmpCatDesc: string;
  OfficeCode: string;
  Active: string;
  hasUserAccount?: boolean;
}

export function ClientTeamSelectionStep({
  GSClientID,
  clientData,
  onContinue,
  isLoading = false,
  readOnly = false,
  initialPartnerCode,
  initialManagerCode,
  initialInchargeCode,
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
  
  // Track if we've initialized from clientData to prevent clearing on reload
  const hasInitialized = useRef(false);
  
  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Initialize with current values when clientData loads or initial props are provided
  // PRIORITY 1: Use initial props if provided (from parent's teamSelections state)
  // PRIORITY 2: Fall back to clientData if no initial props
  // Validate that Partner, Manager, and Incharge are 3 separate individuals
  useEffect(() => {
    if (!hasInitialized.current) {
      // PRIORITY 1: Use initial props if provided (from parent's teamSelections state)
      if (initialPartnerCode || initialManagerCode || initialInchargeCode) {
        const partner = initialPartnerCode || '';
        const manager = initialManagerCode || '';
        const incharge = initialInchargeCode || '';
        
        // Always set partner
        setSelectedPartner(partner);
        
        // Only set manager if it's different from partner
        if (manager && manager !== partner) {
          setSelectedManager(manager);
        } else {
          setSelectedManager('');
        }
        
        // Only set incharge if it's different from both partner and manager
        if (incharge && incharge !== partner && incharge !== manager) {
          setSelectedIncharge(incharge);
        } else {
          setSelectedIncharge('');
        }
        
        hasInitialized.current = true;
        return;
      }
      
      // PRIORITY 2: Fall back to clientData if no initial props
      if (clientData) {
        const partner = clientData.clientPartner || '';
        const manager = clientData.clientManager || '';
        const incharge = clientData.clientIncharge || '';
        
        // Always set partner
        setSelectedPartner(partner);
        
        // Only set manager if it's different from partner
        if (manager && manager !== partner) {
          setSelectedManager(manager);
        } else {
          setSelectedManager('');
        }
        
        // Only set incharge if it's different from both partner and manager
        if (incharge && incharge !== partner && incharge !== manager) {
          setSelectedIncharge(incharge);
        } else {
          setSelectedIncharge('');
        }
        
        hasInitialized.current = true;
      }
    }
  }, [clientData, initialPartnerCode, initialManagerCode, initialInchargeCode]);

  // Load partners
  useEffect(() => {
    const loadPartners = async () => {
      setLoadingPartners(true);
      try {
        const params = new URLSearchParams({ role: 'partner' });
        
        // Include current partner to ensure it's in the list even if they don't match filters
        if (clientData?.clientPartner) {
          params.append('currentPartner', clientData.clientPartner);
        }
        
        const res = await fetch(`/api/clients/${GSClientID}/acceptance/employees?${params}`);
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
  }, [GSClientID, clientData?.clientPartner]);

  // Load managers (excluding selected partner) - only apply exclusion after initialization
  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const params = new URLSearchParams({ role: 'manager' });
        if (hasInitialized.current && selectedPartner) params.append('excludePartner', selectedPartner);
        if (clientData?.clientManager) params.append('currentManager', clientData.clientManager);
        
        const url = `/api/clients/${GSClientID}/acceptance/employees?${params.toString()}`;
        const res = await fetch(url);
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
  }, [GSClientID, selectedPartner, clientData?.clientManager]);

  // Load incharges (excluding selected partner and manager) - only apply exclusion after initialization
  useEffect(() => {
    const loadIncharges = async () => {
      setLoadingIncharges(true);
      try {
        const params = new URLSearchParams({ role: 'incharge' });
        if (hasInitialized.current && selectedPartner) params.append('excludePartner', selectedPartner);
        if (hasInitialized.current && selectedManager) params.append('excludeManager', selectedManager);
        if (clientData?.clientIncharge) params.append('currentIncharge', clientData.clientIncharge);
        
        const url = `/api/clients/${GSClientID}/acceptance/employees?${params.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setIncharges(data.data || []);
          
          // Only clear if we've finished initialization and there's actually a conflict
          if (hasInitialized.current && selectedIncharge && (selectedIncharge === selectedPartner || selectedIncharge === selectedManager)) {
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
  }, [GSClientID, selectedPartner, selectedManager, selectedIncharge, clientData?.clientIncharge]);

  // Auto-save team selections
  const saveTeamSelections = async () => {
    // Only save if all three are selected and we're not in read-only mode
    if (!selectedPartner || !selectedManager || !selectedIncharge || readOnly) return;
    
    try {
      await fetch(`/api/clients/${GSClientID}/acceptance/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCode: selectedPartner,
          managerCode: selectedManager,
          inchargeCode: selectedIncharge,
        }),
      });
    } catch (err) {
      console.error('Failed to save team selections:', err);
      // Don't show error to user - this is auto-save, not critical
    }
  };

  const scheduleSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      await saveTeamSelections();
    }, 2000); // Save after 2 seconds of inactivity
  };

  // Trigger auto-save when selections change
  useEffect(() => {
    if (hasInitialized.current && (selectedPartner || selectedManager || selectedIncharge)) {
      scheduleSave();
    }
  }, [selectedPartner, selectedManager, selectedIncharge]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle partner selection changes
  const handlePartnerChange = (value: string | number | null) => {
    const newPartner = (value as string) || '';
    setSelectedPartner(newPartner);
    
    // Clear manager if it's the same as the new partner
    if (newPartner && selectedManager === newPartner) {
      setSelectedManager('');
    }
    
    // Clear incharge if it's the same as the new partner
    if (newPartner && selectedIncharge === newPartner) {
      setSelectedIncharge('');
    }
  };

  // Handle manager selection changes
  const handleManagerChange = (value: string | number | null) => {
    const newManager = (value as string) || '';
    
    // Prevent selecting the same person as partner
    if (newManager && newManager === selectedPartner) {
      setError('Manager cannot be the same person as Partner');
      return;
    }
    
    setSelectedManager(newManager);
    
    // Clear incharge if it's the same as the new manager
    if (newManager && selectedIncharge === newManager) {
      setSelectedIncharge('');
    }
  };

  // Handle incharge selection changes
  const handleInchargeChange = (value: string | number | null) => {
    const newIncharge = (value as string) || '';
    
    // Prevent selecting the same person as partner
    if (newIncharge && newIncharge === selectedPartner) {
      setError('Incharge cannot be the same person as Partner');
      return;
    }
    
    // Prevent selecting the same person as manager
    if (newIncharge && newIncharge === selectedManager) {
      setError('Incharge cannot be the same person as Manager');
      return;
    }
    
    setSelectedIncharge(newIncharge);
  };

  const handleContinue = () => {
    if (!selectedPartner || !selectedManager || !selectedIncharge) {
      setError('Please select Partner, Manager, and Incharge before continuing');
      return;
    }

    if (selectedPartner === selectedManager || selectedPartner === selectedIncharge || selectedManager === selectedIncharge) {
      setError('Partner, Manager, and Incharge must be 3 different people');
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

  const canContinue = selectedPartner && selectedManager && selectedIncharge && 
    selectedPartner !== selectedManager && 
    selectedPartner !== selectedIncharge && 
    selectedManager !== selectedIncharge;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: GRADIENTS.icon.standard }}
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
          style={{ background: GRADIENTS.dashboard.card }}
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
              onChange={handlePartnerChange}
              onSearchChange={setPartnerSearch}
              options={filterOptions(partners, partnerSearch)}
              placeholder="Select Partner..."
              searchPlaceholder="Search by name or code..."
              isLoading={loadingPartners}
              disabled={isLoading || readOnly}
              minimumSearchChars={0}
            />
          </div>

          {/* Manager Selection */}
          <div>
            <SearchCombobox
              label="Manager *"
              value={selectedManager || null}
              onChange={handleManagerChange}
              onSearchChange={setManagerSearch}
              options={filterOptions(managers, managerSearch)}
              placeholder="Select Manager..."
              searchPlaceholder="Search by name or code..."
              isLoading={loadingManagers}
              disabled={isLoading || readOnly}
              minimumSearchChars={0}
            />
          </div>

          {/* Incharge Selection */}
          <div>
            <SearchCombobox
              label="Incharge *"
              value={selectedIncharge || null}
              onChange={handleInchargeChange}
              onSearchChange={setInchargeSearch}
              options={filterOptions(incharges, inchargeSearch)}
              placeholder="Select Incharge..."
              searchPlaceholder="Search by name or code..."
              isLoading={loadingIncharges}
              disabled={isLoading || !selectedManager || readOnly}
              minimumSearchChars={0}
            />
            {!selectedManager && !readOnly && (
              <p className="mt-1 text-xs text-forvis-gray-500">Select a manager first</p>
            )}
          </div>
        </div>

        {/* Current Assignments Reference */}
        {clientData.clientPartner && (
          <div className="rounded-lg bg-forvis-gray-50 p-4 mb-6">
            <h4 className="text-xs font-semibold text-forvis-gray-700 mb-3">Current Assignments (for reference)</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-forvis-gray-600 w-20">Partner:</span>
                <EmployeeStatusBadge
                  name={`${clientData.clientPartnerName || clientData.clientPartner} [${clientData.clientPartner}]`}
                  isActive={clientData.clientPartnerStatus?.isActive ?? true}
                  hasUserAccount={clientData.clientPartnerStatus?.hasUserAccount ?? false}
                  variant="text"
                  iconSize="sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-forvis-gray-600 w-20">Manager:</span>
                {clientData.clientManager ? (
                  <EmployeeStatusBadge
                    name={`${clientData.clientManagerName || clientData.clientManager} [${clientData.clientManager}]`}
                    isActive={clientData.clientManagerStatus?.isActive ?? true}
                    hasUserAccount={clientData.clientManagerStatus?.hasUserAccount ?? false}
                    variant="text"
                    iconSize="sm"
                  />
                ) : (
                  <span className="text-xs text-forvis-gray-500">Not assigned</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-forvis-gray-600 w-20">Incharge:</span>
                {clientData.clientIncharge ? (
                  <EmployeeStatusBadge
                    name={`${clientData.clientInchargeName || clientData.clientIncharge} [${clientData.clientIncharge}]`}
                    isActive={clientData.clientInchargeStatus?.isActive ?? true}
                    hasUserAccount={clientData.clientInchargeStatus?.hasUserAccount ?? false}
                    variant="text"
                    iconSize="sm"
                  />
                ) : (
                  <span className="text-xs text-forvis-gray-500">Not assigned</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex justify-end gap-3">
            <Button
              variant="primary"
              onClick={handleContinue}
              disabled={!canContinue || isLoading}
            >
              Continue to Research →
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
