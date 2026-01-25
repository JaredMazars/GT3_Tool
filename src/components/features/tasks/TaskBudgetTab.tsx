'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Calculator, Users, DollarSign, FileText, TrendingUp, Clock, TrendingDown } from 'lucide-react';
import { 
  useTaskBudget, 
  useAddDisbursement, 
  useUpdateDisbursement, 
  useDeleteDisbursement,
  useAddFee,
  useUpdateFee,
  useDeleteFee,
  useUpdateAllocation
} from '@/hooks/tasks/useTaskBudget';
import { LoadingSpinner, Button, Banner } from '@/components/ui';
import { AddDisbursementModal } from './AddDisbursementModal';
import { AddFeeModal } from './AddFeeModal';
import { EditAllocationModal } from './EditAllocationModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { BudgetDisbursement, BudgetFee, BudgetMember } from '@/types/budget';

interface TaskBudgetTabProps {
  taskId: number;
}

export function TaskBudgetTab({ taskId }: TaskBudgetTabProps) {
  const { data: budgetData, isLoading, error } = useTaskBudget(taskId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Disbursement state
  const [showDisbursementModal, setShowDisbursementModal] = useState(false);
  const [editingDisbursement, setEditingDisbursement] = useState<BudgetDisbursement | null>(null);
  const [deletingDisbursementId, setDeletingDisbursementId] = useState<number | null>(null);

  // Fee state
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<BudgetFee | null>(null);
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null);

  // Allocation state
  const [editingAllocation, setEditingAllocation] = useState<{
    teamMemberId: number;
    userName: string;
    currentHours: number;
  } | null>(null);

  // Mutations
  const addDisbursement = useAddDisbursement(taskId);
  const updateDisbursement = useUpdateDisbursement(taskId, editingDisbursement?.id || 0);
  const deleteDisbursement = useDeleteDisbursement(taskId);
  const addFee = useAddFee(taskId);
  const updateFee = useUpdateFee(taskId, editingFee?.id || 0);
  const deleteFee = useDeleteFee(taskId);
  const updateAllocation = useUpdateAllocation(taskId, editingAllocation?.teamMemberId || 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const handleAddDisbursement = async (data: { description: string; amount: number; expectedDate: Date }) => {
    try {
      await addDisbursement.mutateAsync(data);
      setShowDisbursementModal(false);
      setSuccessMessage('Disbursement added successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add disbursement');
    }
  };

  const handleEditDisbursement = async (data: { description: string; amount: number; expectedDate: Date }) => {
    if (!editingDisbursement) return;
    
    try {
      await updateDisbursement.mutateAsync(data);
      setEditingDisbursement(null);
      setSuccessMessage('Disbursement updated successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update disbursement');
    }
  };

  const handleDeleteDisbursement = async () => {
    if (!deletingDisbursementId) return;
    
    try {
      await deleteDisbursement.mutateAsync(deletingDisbursementId);
      setDeletingDisbursementId(null);
      setSuccessMessage('Disbursement deleted successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete disbursement');
    }
  };

  const handleAddFee = async (data: { description: string; amount: number; expectedDate: Date }) => {
    try {
      await addFee.mutateAsync(data);
      setShowFeeModal(false);
      setSuccessMessage('Fee added successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add fee');
    }
  };

  const handleEditFee = async (data: { description: string; amount: number; expectedDate: Date }) => {
    if (!editingFee) return;
    
    try {
      await updateFee.mutateAsync(data);
      setEditingFee(null);
      setSuccessMessage('Fee updated successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update fee');
    }
  };

  const handleDeleteFee = async () => {
    if (!deletingFeeId) return;
    
    try {
      await deleteFee.mutateAsync(deletingFeeId);
      setDeletingFeeId(null);
      setSuccessMessage('Fee deleted successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete fee');
    }
  };

  const handleEditStaffAllocation = (member: BudgetMember) => {
    setEditingAllocation({
      teamMemberId: member.teamMemberId,
      userName: member.userName,
      currentHours: member.allocatedHours,
    });
  };

  const handleSaveAllocation = async (newHours: number) => {
    if (!editingAllocation) return;
    
    try {
      await updateAllocation.mutateAsync(newHours);
      setEditingAllocation(null);
      setSuccessMessage('Allocation updated successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update allocation');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Banner
          variant="error"
          message={error instanceof Error ? error.message : 'Failed to load budget data'}
        />
      </div>
    );
  }

  if (!budgetData) {
    return (
      <div className="p-6">
        <Banner
          variant="info"
          message="No budget data available"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <Banner
          variant="success"
          message={successMessage}
          dismissible
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
      {errorMessage && (
        <Banner
          variant="error"
          message={errorMessage}
          dismissible
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      {/* Budget Summary - Section Header */}
      <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-icon-standard rounded-full p-2">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-forvis-gray-900">Budget Summary</h2>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time Budget Card */}
        <div className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Time Budget</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(budgetData.summary.totalStaffAmount)}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">{formatHours(budgetData.summary.totalStaffHours)} hours</p>
            </div>
            <div className="bg-gradient-icon-standard rounded-full p-2.5">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Disbursements Card */}
        <div className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Disbursements</p>
              <p className="text-2xl font-bold mt-2 text-forvis-blue-600">{formatCurrency(budgetData.summary.totalDisbursements)}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">Budgeted expenses</p>
            </div>
            <div className="bg-gradient-icon-standard rounded-full p-2.5">
              <FileText className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Adjustment Card */}
        <div className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border border-forvis-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Adjustment</p>
              <p className={`text-2xl font-bold mt-2 ${
                budgetData.summary.adjustment > 0 ? 'text-forvis-error-600' : 'text-forvis-success-600'
              }`}>
                {budgetData.summary.adjustment > 0 ? '' : '+'}{formatCurrency(-budgetData.summary.adjustment)}
              </p>
              <p className="text-xs text-forvis-gray-500 mt-1">
                {budgetData.summary.adjustment > 0 ? '' : '+'}{(-budgetData.summary.adjustmentPercentage).toFixed(2)}%
              </p>
            </div>
            <div className={`rounded-full p-2.5 ${
              budgetData.summary.adjustment > 0 ? 'bg-forvis-error-600' : 'bg-forvis-success-600'
            }`}>
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Total Fees Card (Emphasized) */}
        <div className="bg-gradient-dashboard-card rounded-lg p-4 shadow-corporate border-2 border-forvis-success-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">Total Fees</p>
              <p className="text-2xl font-bold mt-2 text-forvis-success-600">{formatCurrency(budgetData.summary.totalFees)}</p>
              <p className="text-xs text-forvis-gray-500 mt-1">Final budget result</p>
            </div>
            <div className="bg-forvis-success-600 rounded-full p-2.5">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCTION SECTION */}
      <div className="space-y-6">
        <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-icon-standard rounded-full p-2">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-forvis-gray-900">Production</h2>
          </div>
        </div>

        {/* Time Budget by Category */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-forvis-blue-600" />
            <h3 className="text-lg font-bold text-forvis-gray-900">Time Budget</h3>
          </div>

          {budgetData.categories.length === 0 ? (
            <Banner variant="info" message="No staff allocations found. Add team members to the task planner to see budget breakdown." />
          ) : (
            <div className="space-y-6">
              {budgetData.categories.map((category) => (
                <div
                  key={category.empCatCode}
                  className="rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="bg-gradient-dashboard-card p-4 border-b border-forvis-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-icon-standard rounded-full p-2">
                          <Calculator className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-forvis-gray-900">{category.empCatDesc}</h4>
                      </div>
                      <div className="grid gap-4" style={{ gridTemplateColumns: '120px 160px' }}>
                        <span className="text-right text-sm text-forvis-gray-600 tabular-nums">{formatHours(category.totalHours)} hours</span>
                        <span className="text-right text-lg font-bold text-forvis-blue-600 tabular-nums">{formatCurrency(category.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Staff Members Table */}
                  <div className="bg-white">
                    <div className="bg-gradient-primary-horizontal grid gap-4 px-4 py-3 text-xs font-medium text-white uppercase tracking-wider shadow-sm" style={{ gridTemplateColumns: '80px 1fr 120px 120px 160px' }}>
                      <div>Actions</div>
                      <div>Staff Member</div>
                      <div className="text-right">Hours</div>
                      <div className="text-right">Rate</div>
                      <div className="text-right">Amount</div>
                    </div>
                    {category.members.map((member, idx) => (
                      <div
                        key={member.userId}
                        className={`grid gap-4 px-4 py-3 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                        }`}
                        style={{ gridTemplateColumns: '80px 1fr 120px 120px 160px' }}
                      >
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditStaffAllocation(member)}
                            className="p-1.5 text-forvis-gray-600 hover:text-forvis-blue-600 hover:bg-forvis-blue-50 rounded transition-colors"
                            title="Edit allocation hours"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="font-medium text-forvis-gray-900">{member.userName}</div>
                        <div className="text-right text-forvis-gray-700 tabular-nums">{formatHours(member.allocatedHours)}</div>
                        <div className="text-right text-forvis-gray-700 tabular-nums">{formatCurrency(member.rate)}</div>
                        <div className="text-right font-semibold text-forvis-blue-600 tabular-nums">{formatCurrency(member.amount)}</div>
                      </div>
                    ))}
                    {/* Category Subtotal */}
                    <div className="grid gap-4 px-4 py-3 border-t-2 border-forvis-blue-200 bg-forvis-blue-50 font-semibold text-forvis-gray-900" style={{ gridTemplateColumns: '80px 1fr 120px 120px 160px' }}>
                      <div></div>
                      <div>Subtotal - {category.empCatDesc}</div>
                      <div className="text-right tabular-nums">{formatHours(category.totalHours)}</div>
                      <div className="text-right text-forvis-gray-600 tabular-nums">{formatCurrency(category.averageRate)} avg</div>
                      <div className="text-right text-forvis-blue-600 tabular-nums">{formatCurrency(category.totalAmount)}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Time Budget */}
              <div className="rounded-lg p-4 border-2 border-forvis-blue-400 bg-forvis-blue-50">
                <div className="grid gap-4 items-center" style={{ gridTemplateColumns: '1fr 140px 160px' }}>
                  <span className="text-lg font-bold text-forvis-gray-900">SUBTOTAL - TIME BUDGET:</span>
                  <span className="text-right text-sm text-forvis-gray-600 tabular-nums">{formatHours(budgetData.summary.totalStaffHours)} hours</span>
                  <span className="text-right text-2xl font-bold text-forvis-blue-600 tabular-nums">{formatCurrency(budgetData.summary.totalStaffAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Budgeted Disbursements */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-forvis-blue-600" />
              <h3 className="text-lg font-bold text-forvis-gray-900">Disbursements</h3>
            </div>
            <Button
              variant="gradient"
              onClick={() => setShowDisbursementModal(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Disbursement
            </Button>
          </div>

          {budgetData.disbursements.length === 0 ? (
            <div className="p-4 rounded-lg bg-forvis-gray-50 text-center text-forvis-gray-600">
              No disbursements added yet
            </div>
          ) : (
            <div className="rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden">
              <div className="bg-gradient-primary-horizontal grid gap-4 px-4 py-3 text-xs font-medium text-white uppercase tracking-wider shadow-sm" style={{ gridTemplateColumns: '80px 1fr 160px 160px' }}>
                <div>Actions</div>
                <div>Description</div>
                <div className="text-right">Expected Date</div>
                <div className="text-right">Amount</div>
              </div>
              {budgetData.disbursements.map((disbursement, idx) => (
                <div
                  key={disbursement.id}
                  className={`grid gap-4 px-4 py-3 items-center ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                  }`}
                  style={{ gridTemplateColumns: '80px 1fr 160px 160px' }}
                >
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingDisbursement(disbursement)}
                      className="p-1.5 text-forvis-gray-600 hover:text-forvis-blue-600 hover:bg-forvis-blue-50 rounded transition-colors"
                      title="Edit disbursement"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingDisbursementId(disbursement.id)}
                      className="p-1.5 text-forvis-gray-600 hover:text-forvis-error-600 hover:bg-forvis-error-50 rounded transition-colors"
                      title="Delete disbursement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="font-medium text-forvis-gray-900">{disbursement.description}</div>
                  <div className="text-right text-forvis-gray-700 text-sm tabular-nums">{formatDate(disbursement.expectedDate)}</div>
                  <div className="text-right font-semibold text-forvis-blue-600 tabular-nums">{formatCurrency(disbursement.amount)}</div>
                </div>
              ))}
              {/* Disbursements Subtotal */}
              <div className="grid gap-4 px-4 py-3 border-t-2 border-forvis-blue-200 bg-forvis-blue-50 font-semibold" style={{ gridTemplateColumns: '80px 1fr 160px 160px' }}>
                <div></div>
                <div className="text-forvis-gray-900">Subtotal - Disbursements</div>
                <div></div>
                <div className="text-right text-forvis-blue-600 tabular-nums">{formatCurrency(budgetData.summary.totalDisbursements)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FEES SECTION */}
      <div className="space-y-6">
        <div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-icon-standard rounded-full p-2">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-forvis-gray-900">Fees</h2>
          </div>
        </div>

        {/* Budgeted Fees */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-forvis-success-600" />
              <h3 className="text-lg font-bold text-forvis-gray-900">Fee Items</h3>
            </div>
            <Button
              variant="gradient"
              onClick={() => setShowFeeModal(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Fee
            </Button>
          </div>

          {budgetData.fees.length === 0 ? (
            <div className="p-4 rounded-lg bg-forvis-gray-50 text-center text-forvis-gray-600">
              No fees added yet
            </div>
          ) : (
            <div className="rounded-lg shadow-sm border border-forvis-gray-200 overflow-hidden">
              <div className="bg-gradient-primary-horizontal grid gap-4 px-4 py-3 text-xs font-medium text-white uppercase tracking-wider shadow-sm" style={{ gridTemplateColumns: '80px 1fr 160px 160px' }}>
                <div>Actions</div>
                <div>Description</div>
                <div className="text-right">Expected Date</div>
                <div className="text-right">Amount</div>
              </div>
              {budgetData.fees.map((fee, idx) => (
                <div
                  key={fee.id}
                  className={`grid gap-4 px-4 py-3 items-center ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
                  }`}
                  style={{ gridTemplateColumns: '80px 1fr 160px 160px' }}
                >
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingFee(fee)}
                      className="p-1.5 text-forvis-gray-600 hover:text-forvis-blue-600 hover:bg-forvis-blue-50 rounded transition-colors"
                      title="Edit fee"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFeeId(fee.id)}
                      className="p-1.5 text-forvis-gray-600 hover:text-forvis-error-600 hover:bg-forvis-error-50 rounded transition-colors"
                      title="Delete fee"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="font-medium text-forvis-gray-900">{fee.description}</div>
                  <div className="text-right text-forvis-gray-700 text-sm tabular-nums">{formatDate(fee.expectedDate)}</div>
                  <div className="text-right font-semibold text-forvis-blue-600 tabular-nums">{formatCurrency(fee.amount)}</div>
                </div>
              ))}
              {/* Fees Subtotal */}
              <div className="grid gap-4 px-4 py-3 border-t-2 border-forvis-blue-200 bg-forvis-blue-50 font-semibold" style={{ gridTemplateColumns: '80px 1fr 160px 160px' }}>
                <div></div>
                <div className="text-forvis-gray-900">Subtotal - Fees</div>
                <div></div>
                <div className="text-right text-forvis-blue-600 tabular-nums">{formatCurrency(budgetData.summary.totalFees)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddDisbursementModal
        isOpen={showDisbursementModal || editingDisbursement !== null}
        onClose={() => {
          setShowDisbursementModal(false);
          setEditingDisbursement(null);
        }}
        onSave={editingDisbursement ? handleEditDisbursement : handleAddDisbursement}
        isLoading={addDisbursement.isPending || updateDisbursement.isPending}
        initialData={editingDisbursement ? { description: editingDisbursement.description, amount: editingDisbursement.amount, expectedDate: editingDisbursement.expectedDate } : undefined}
        mode={editingDisbursement ? 'edit' : 'add'}
      />

      <AddFeeModal
        isOpen={showFeeModal || editingFee !== null}
        onClose={() => {
          setShowFeeModal(false);
          setEditingFee(null);
        }}
        onSave={editingFee ? handleEditFee : handleAddFee}
        isLoading={addFee.isPending || updateFee.isPending}
        initialData={editingFee ? { description: editingFee.description, amount: editingFee.amount, expectedDate: editingFee.expectedDate } : undefined}
        mode={editingFee ? 'edit' : 'add'}
      />

      <ConfirmModal
        isOpen={deletingDisbursementId !== null}
        onClose={() => setDeletingDisbursementId(null)}
        onConfirm={handleDeleteDisbursement}
        title="Delete Disbursement"
        message="Are you sure you want to delete this disbursement? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={deletingFeeId !== null}
        onClose={() => setDeletingFeeId(null)}
        onConfirm={handleDeleteFee}
        title="Delete Fee"
        message="Are you sure you want to delete this fee? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <EditAllocationModal
        isOpen={editingAllocation !== null}
        onClose={() => setEditingAllocation(null)}
        onSave={handleSaveAllocation}
        staffName={editingAllocation?.userName || ''}
        currentHours={editingAllocation?.currentHours || 0}
        isLoading={updateAllocation.isPending}
      />
    </div>
  );
}
