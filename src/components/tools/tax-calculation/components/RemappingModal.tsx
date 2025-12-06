'use client';

import { useState, useEffect, useMemo } from 'react';
import { MappedData } from '@/types';
import { mappingGuide } from '@/lib/services/tasks/mappingGuide';
import { formatAmount } from '@/lib/utils/formatters';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { AlertModal } from '@/components/shared/AlertModal';

interface RemappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappedData: MappedData[];
  onMappingUpdate: (accountId: number, newSarsItem: string, newSection: string, newSubsection: string) => Promise<void>;
}

interface SarsItem {
  sarsItem: string;
}

type SectionItems = {
  [key: string]: { sarsItem: string }[];
};

interface TargetSarsItem {
  sarsItem: string;
  section: string;
  subsection: string;
}

// Display names for subsections
const subsectionDisplayNames: Record<string, string> = {
  nonCurrentAssets: 'Non-Current Assets',
  currentAssets: 'Current Assets',
  capitalAndReservesCreditBalances: 'Capital & Reserves (Credit)',
  capitalAndReservesDebitBalances: 'Capital & Reserves (Debit)',
  nonCurrentLiabilities: 'Non-Current Liabilities',
  currentLiabilities: 'Current Liabilities',
  grossProfitOrLoss: 'Gross Profit/Loss',
  incomeItemsCreditAmounts: 'Income Items (Credit)',
  expenseItemsDebitAmounts: 'Expense Items (Debit)',
  incomeItemsOnlyCreditAmounts: 'Income Items (Credit Only)'
};

export default function RemappingModal({ isOpen, onClose, mappedData, onMappingUpdate }: RemappingModalProps) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [targetSarsItem, setTargetSarsItem] = useState<TargetSarsItem | null>(null);
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [isRemapping, setIsRemapping] = useState(false);
  const [remappingProgress, setRemappingProgress] = useState({ current: 0, total: 0 });

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAccountIds([]);
      setTargetSarsItem(null);
      setSearchLeft('');
      setSearchRight('');
      setExpandedGroups({});
      setExpandedSections({});
      setExpandedSubsections({});
      setIsRemapping(false);
      setRemappingProgress({ current: 0, total: 0 });
    }
  }, [isOpen]);

  // Group accounts by current SARS item
  const groupedAccounts = useMemo(() => {
    const filtered = mappedData.filter(account => {
      if (!searchLeft) return true;
      const searchLower = searchLeft.toLowerCase();
      return (
        account.accountCode.toLowerCase().includes(searchLower) ||
        account.accountName.toLowerCase().includes(searchLower) ||
        account.sarsItem.toLowerCase().includes(searchLower)
      );
    });

    const groups: Record<string, MappedData[]> = {};
    filtered.forEach(account => {
      const key = account.sarsItem || 'Unmapped';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(account);
    });

    return groups;
  }, [mappedData, searchLeft]);

  // Filter SARS items for right panel
  const filteredSarsItems = useMemo(() => {
    const allSectionItems = {
      'Balance Sheet': mappingGuide.balanceSheet,
      'Income Statement': mappingGuide.incomeStatement
    } as const;

    if (!searchRight) return allSectionItems;

    const searchLower = searchRight.toLowerCase();
    return Object.entries(allSectionItems).reduce((acc, [mainSection, sectionData]) => {
      const filteredSubsections = Object.entries(sectionData as SectionItems).reduce((subAcc, [subsection, items]) => {
        const filteredItems = items.filter(item =>
          item.sarsItem.toLowerCase().includes(searchLower)
        );
        if (filteredItems.length > 0) {
          subAcc[subsection] = filteredItems;
        }
        return subAcc;
      }, {} as SectionItems);

      if (Object.keys(filteredSubsections).length > 0) {
        acc[mainSection] = filteredSubsections;
      }
      return acc;
    }, {} as Record<string, SectionItems>);
  }, [searchRight]);

  // Handle select all in a group
  const handleSelectGroup = (accounts: MappedData[], selected: boolean) => {
    if (selected) {
      const newIds = accounts.map(a => a.id).filter(id => !selectedAccountIds.includes(id));
      setSelectedAccountIds([...selectedAccountIds, ...newIds]);
    } else {
      const idsToRemove = new Set(accounts.map(a => a.id));
      setSelectedAccountIds(selectedAccountIds.filter(id => !idsToRemove.has(id)));
    }
  };

  // Handle individual account selection
  const handleAccountSelect = (accountId: number, selected: boolean) => {
    if (selected) {
      setSelectedAccountIds([...selectedAccountIds, accountId]);
    } else {
      setSelectedAccountIds(selectedAccountIds.filter(id => id !== accountId));
    }
  };

  // Handle select all accounts
  const handleSelectAll = () => {
    const allIds = Object.values(groupedAccounts).flat().map(a => a.id);
    setSelectedAccountIds(allIds);
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedAccountIds([]);
  };

  // Collapse all groups
  const handleCollapseAllGroups = () => {
    const allCollapsed = Object.keys(groupedAccounts).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedGroups(allCollapsed);
  };

  // Expand all groups
  const handleExpandAllGroups = () => {
    const allExpanded = Object.keys(groupedAccounts).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedGroups(allExpanded);
  };

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Toggle subsection expansion
  const toggleSubsection = (key: string) => {
    setExpandedSubsections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Collapse all SARS sections
  const handleCollapseAllSars = () => {
    setExpandedSections({});
    setExpandedSubsections({});
  };

  // Expand all SARS sections
  const handleExpandAllSars = () => {
    const allSections: Record<string, boolean> = {};
    const allSubsections: Record<string, boolean> = {};
    
    Object.entries(filteredSarsItems).forEach(([mainSection, sectionData]) => {
      allSections[mainSection] = true;
      Object.keys(sectionData).forEach((subsection) => {
        allSubsections[`${mainSection}-${subsection}`] = true;
      });
    });
    
    setExpandedSections(allSections);
    setExpandedSubsections(allSubsections);
  };

  // Handle SARS item selection
  const handleSarsItemSelect = (sarsItem: string, section: string, subsection: string) => {
    setTargetSarsItem({ sarsItem, section, subsection });
  };

  // Handle bulk remap
  const handleBulkRemap = async () => {
    if (!targetSarsItem || selectedAccountIds.length === 0) return;

    const confirmMessage = `Remap ${selectedAccountIds.length} account${selectedAccountIds.length > 1 ? 's' : ''} to "${targetSarsItem.sarsItem}"?`;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Remapping',
      message: confirmMessage,
      variant: 'warning',
      onConfirm: async () => {
        setIsRemapping(true);
        setRemappingProgress({ current: 0, total: selectedAccountIds.length });

        try {
          for (let i = 0; i < selectedAccountIds.length; i++) {
            const accountId = selectedAccountIds[i];
            if (accountId === undefined) continue; // Skip undefined entries
            await onMappingUpdate(
              accountId,
              targetSarsItem.sarsItem,
              targetSarsItem.section,
              targetSarsItem.subsection
            );
            setRemappingProgress({ current: i + 1, total: selectedAccountIds.length });
          }

          // Success - close modal
          setTimeout(() => {
            onClose();
          }, 500);
        } catch (error) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error remapping accounts. Please try again.',
            variant: 'error',
          });
        } finally {
          setIsRemapping(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  if (!isOpen) return null;

  const selectedCount = selectedAccountIds.length;
  const totalAccounts = mappedData.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-forvis-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-xl shadow-2xl flex flex-col animate-scaleIn overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b-2 border-forvis-gray-300 shadow-sm" style={{ background: 'linear-gradient(to right, #EBF2FA, #ffffff)' }}>
          <div>
            <h2 className="text-xl font-bold text-forvis-gray-900">Account Mapping</h2>
            <p className="text-sm text-forvis-gray-600 mt-0.5">
              Select accounts and assign them to SARS items
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isRemapping}
            className="p-2 hover:bg-forvis-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-forvis-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Accounts */}
          <div className="w-1/2 flex flex-col border-r border-forvis-gray-200">
            {/* Left Panel Header */}
            <div className="px-4 py-3 border-b border-forvis-gray-200 bg-forvis-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-forvis-gray-900">
                  Trial Balance Accounts ({totalAccounts})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExpandAllGroups}
                    disabled={isRemapping}
                    className="text-xs px-2 py-1 text-forvis-blue-600 hover:text-forvis-blue-700 hover:bg-forvis-blue-50 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAllGroups}
                    disabled={isRemapping}
                    className="text-xs px-2 py-1 text-forvis-gray-600 hover:text-forvis-gray-700 hover:bg-forvis-gray-100 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    Collapse All
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    disabled={isRemapping}
                    className="text-xs px-2 py-1 text-forvis-blue-600 hover:text-forvis-blue-700 hover:bg-forvis-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearSelection}
                    disabled={isRemapping || selectedCount === 0}
                    className="text-xs px-2 py-1 text-forvis-gray-600 hover:text-forvis-gray-700 hover:bg-forvis-gray-100 rounded transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchLeft}
                  onChange={(e) => setSearchLeft(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full rounded-md border-0 py-2 pl-9 pr-8 text-sm text-forvis-gray-900 ring-1 ring-inset ring-forvis-gray-300 placeholder:text-forvis-gray-400 focus:ring-2 focus:ring-inset focus:ring-forvis-blue-600"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-forvis-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchLeft && (
                  <button
                    onClick={() => setSearchLeft('')}
                    className="absolute right-3 top-2.5 text-forvis-gray-400 hover:text-forvis-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {selectedCount > 0 && (
                <div className="mt-2 text-xs font-medium text-forvis-blue-600">
                  {selectedCount} account{selectedCount > 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Left Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {Object.entries(groupedAccounts).map(([groupKey, accounts]) => {
                const isExpanded = expandedGroups[groupKey] ?? true;
                const groupSelectedCount = accounts.filter(a => selectedAccountIds.includes(a.id)).length;
                const allSelected = groupSelectedCount === accounts.length;
                const someSelected = groupSelectedCount > 0 && groupSelectedCount < accounts.length;

                return (
                  <div key={groupKey} className="border-b border-forvis-gray-200">
                    {/* Group Header */}
                    <div className="bg-forvis-blue-50 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={(e) => handleSelectGroup(accounts, e.target.checked)}
                          disabled={isRemapping}
                          className="h-4 w-4 rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-forvis-blue-600 disabled:opacity-50"
                        />
                        <button
                          onClick={() => toggleGroup(groupKey)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          <svg
                            className={`w-4 h-4 text-forvis-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-forvis-gray-900 truncate" title={groupKey}>
                              {groupKey}
                            </div>
                            <div className="text-xs text-forvis-gray-600">
                              {accounts.length} account{accounts.length > 1 ? 's' : ''}
                              {groupSelectedCount > 0 && ` • ${groupSelectedCount} selected`}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Group Items */}
                    {isExpanded && (
                      <div className="divide-y divide-forvis-gray-100">
                        {accounts.map((account) => {
                          const isSelected = selectedAccountIds.includes(account.id);
                          return (
                            <div
                              key={account.id}
                              className={`px-4 py-2 hover:bg-forvis-blue-50 transition-colors ${isSelected ? 'bg-forvis-blue-50' : ''}`}
                            >
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleAccountSelect(account.id, e.target.checked)}
                                  disabled={isRemapping}
                                  className="mt-0.5 h-4 w-4 rounded border-forvis-gray-300 text-forvis-blue-600 focus:ring-forvis-blue-600 disabled:opacity-50"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-medium text-forvis-gray-900">{account.accountCode}</span>
                                    <span className="text-xs text-forvis-gray-700 truncate">{account.accountName}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-forvis-gray-500 truncate" title={account.sarsItem}>
                                      {account.sarsItem || 'Not mapped'}
                                    </span>
                                    <span className={`text-xs font-medium tabular-nums ${account.balance < 0 ? 'text-red-600' : 'text-forvis-gray-900'}`}>
                                      {account.balance < 0 ? `(${formatAmount(Math.abs(account.balance))})` : formatAmount(account.balance)}
                                    </span>
                                  </div>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel - SARS Items */}
          <div className="w-1/2 flex flex-col">
            {/* Right Panel Header */}
            <div className="px-4 py-3 border-b border-forvis-gray-200 bg-forvis-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-forvis-gray-900">
                  SARS Items Hierarchy
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExpandAllSars}
                    disabled={isRemapping}
                    className="text-xs px-2 py-1 text-forvis-blue-600 hover:text-forvis-blue-700 hover:bg-forvis-blue-50 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAllSars}
                    disabled={isRemapping}
                    className="text-xs px-2 py-1 text-forvis-gray-600 hover:text-forvis-gray-700 hover:bg-forvis-gray-100 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    Collapse All
                  </button>
                </div>
              </div>
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchRight}
                  onChange={(e) => setSearchRight(e.target.value)}
                  placeholder="Search SARS items..."
                  className="w-full rounded-md border-0 py-2 pl-9 pr-8 text-sm text-forvis-gray-900 ring-1 ring-inset ring-forvis-gray-300 placeholder:text-forvis-gray-400 focus:ring-2 focus:ring-inset focus:ring-forvis-blue-600"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-forvis-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchRight && (
                  <button
                    onClick={() => setSearchRight('')}
                    className="absolute right-3 top-2.5 text-forvis-gray-400 hover:text-forvis-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {targetSarsItem && (
                <div className="mt-2 text-xs">
                  <span className="font-medium text-forvis-gray-700">Selected: </span>
                  <span className="text-forvis-blue-600 font-medium">{targetSarsItem.sarsItem}</span>
                </div>
              )}
            </div>

            {/* Right Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {Object.entries(filteredSarsItems).map(([mainSection, sectionData]) => {
                const isSectionExpanded = expandedSections[mainSection] ?? false;

                return (
                  <div key={mainSection} className="border-b border-forvis-gray-200">
                    {/* Main Section Header */}
                    <button
                      onClick={() => toggleSection(mainSection)}
                      className="w-full bg-forvis-blue-100 px-4 py-2 flex items-center justify-between hover:bg-forvis-blue-150 transition-colors sticky top-0 z-10"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-4 h-4 text-forvis-blue-700 transition-transform ${isSectionExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-sm font-bold text-forvis-blue-900">{mainSection}</span>
                      </div>
                      <span className="text-xs text-forvis-blue-700">
                        {Object.keys(sectionData).length} subsection{Object.keys(sectionData).length > 1 ? 's' : ''}
                      </span>
                    </button>

                    {/* Subsections */}
                    {isSectionExpanded && (
                      <div>
                        {Object.entries(sectionData).map(([subsection, items]) => {
                          const subsectionKey = `${mainSection}-${subsection}`;
                          const isSubsectionExpanded = expandedSubsections[subsectionKey] ?? false;

                          return (
                            <div key={subsection} className="border-b border-forvis-gray-100 last:border-b-0">
                              {/* Subsection Header */}
                              <button
                                onClick={() => toggleSubsection(subsectionKey)}
                                className="w-full bg-forvis-gray-50 px-4 py-2 pl-8 flex items-center justify-between hover:bg-forvis-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <svg
                                    className={`w-3 h-3 text-forvis-gray-600 transition-transform ${isSubsectionExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span className="text-xs font-semibold text-forvis-gray-900">
                                    {subsectionDisplayNames[subsection] || subsection}
                                  </span>
                                </div>
                                <span className="text-xs text-forvis-gray-600">
                                  {items.length} item{items.length > 1 ? 's' : ''}
                                </span>
                              </button>

                              {/* Items */}
                              {isSubsectionExpanded && (
                                <div className="bg-white">
                                  {items.map((item: SarsItem) => {
                                    const isSelected = targetSarsItem?.sarsItem === item.sarsItem;
                                    const isMapped = mappedData.some(acc => acc.sarsItem === item.sarsItem);

                                    return (
                                      <button
                                        key={item.sarsItem}
                                        onClick={() => handleSarsItemSelect(item.sarsItem, mainSection, subsection)}
                                        disabled={isRemapping}
                                        className={`w-full px-4 py-2 pl-16 text-left text-xs hover:bg-forvis-blue-50 transition-colors disabled:opacity-50 ${
                                          isSelected ? 'bg-forvis-blue-100 font-medium text-forvis-blue-900' : 'text-forvis-gray-700'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="flex-1">{item.sarsItem}</span>
                                          {isMapped && (
                                            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                                              <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                              In Use
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer - Action Bar */}
        <div className="flex-shrink-0 px-6 py-4 border-t-2 border-forvis-gray-300 bg-white shadow-lg">
          {isRemapping ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-forvis-blue-600"></div>
                <span className="text-sm font-semibold text-forvis-gray-900">
                  Remapping accounts... {remappingProgress.current} of {remappingProgress.total}
                </span>
              </div>
              <div className="flex-1 max-w-md ml-6">
                <div className="w-full bg-forvis-gray-200 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${(remappingProgress.current / remappingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-forvis-gray-700">
                {selectedCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-forvis-blue-100 border border-forvis-blue-300">
                      <span className="font-bold text-forvis-blue-700 text-base">{selectedCount}</span>
                      <span className="ml-1.5 font-medium text-forvis-blue-700">account{selectedCount > 1 ? 's' : ''} selected</span>
                    </div>
                    {targetSarsItem && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forvis-blue-50 border border-forvis-blue-200">
                        <svg className="w-4 h-4 text-forvis-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="font-medium text-forvis-gray-900 text-sm">{targetSarsItem.sarsItem}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="font-medium">Select accounts and a SARS item to remap</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isRemapping}
                  className="px-5 py-2.5 text-sm font-semibold text-forvis-gray-700 bg-white border-2 border-forvis-gray-300 rounded-lg hover:bg-forvis-gray-50 hover:border-forvis-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-all shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRemap}
                  disabled={selectedCount === 0 || !targetSarsItem || isRemapping}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: selectedCount > 0 && targetSarsItem 
                      ? 'linear-gradient(to bottom right, #2E5AAC, #25488A)' 
                      : '#ADB5BD'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Remap {selectedCount > 0 ? `${selectedCount} Account${selectedCount > 1 ? 's' : ''}` : 'Accounts'}</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
        />

        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
        />
      </div>
    </div>
  );
}

