'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { X, Calendar, Clock, Percent, Search, Building2, Briefcase, ChevronRight } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { TaskRole } from '@/types';
import { calculateBusinessDays, calculateAvailableHours, calculateAllocationPercentage } from './utils';

interface Client {
  id: number;
  GSClientID: string;
  clientNameFull: string;
  clientCode: string;
  groupDesc: string;
}

interface Task {
  id: number;
  name: string;
  projectType: string;
  serviceLine: string;
  status: string;
  client: {
    clientCode: string;
    clientNameFull: string;
  } | null;
}

interface AdminPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    taskId: number;
    startDate: Date;
    endDate: Date;
    allocatedHours: number;
    allocatedPercentage: number;
    role: TaskRole;
  }) => Promise<void>;
  serviceLine: string;
  subServiceLineGroup: string;
  userId: string;
  userName: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

export function AdminPlanningModal({
  isOpen,
  onClose,
  onSave,
  serviceLine,
  subServiceLineGroup,
  userId,
  userName,
  initialStartDate,
  initialEndDate
}: AdminPlanningModalProps) {
  const [step, setStep] = useState<'client' | 'task' | 'allocation'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [clientSearch, setClientSearch] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');

  // Debounce client search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClientSearch(clientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // React Query for client search with debounced term
  const { data: clientResults = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', 'search', debouncedClientSearch, serviceLine, subServiceLineGroup],
    queryFn: async () => {
      const response = await fetch(
        `/api/clients?search=${encodeURIComponent(debouncedClientSearch)}&serviceLine=${serviceLine}&subServiceLineGroup=${subServiceLineGroup}&limit=10`
      );
      if (!response.ok) throw new Error('Failed to fetch clients');
      const result = await response.json();
      return result.data?.clients || result.clients || [];
    },
    enabled: debouncedClientSearch.length >= 2,
    staleTime: 5000, // Cache for 5 seconds (shorter to avoid stale results)
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
  
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    allocatedHours: '',
    allocatedPercentage: '',
    role: TaskRole.VIEWER
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [calculatedInfo, setCalculatedInfo] = useState({
    businessDays: 0,
    availableHours: 0
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('client');
      setSelectedClient(null);
      setSelectedTask(null);
      setClientSearch('');
      setDebouncedClientSearch('');
      setActiveTasks([]);
      
      // Use initial dates if provided, otherwise empty
      const startDateStr = initialStartDate ? format(initialStartDate, 'yyyy-MM-dd') : '';
      const endDateStr = initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : '';
      
      setFormData({
        startDate: startDateStr,
        endDate: endDateStr,
        allocatedHours: '',
        allocatedPercentage: '',
        role: TaskRole.VIEWER
      });
      setError('');
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  // Fetch active tasks when client is selected - simple reload, no caching
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:136',message:'Effect triggered',data:{hasSelectedClient:!!selectedClient,clientId:selectedClient?.id,clientCode:selectedClient?.clientCode,serviceLine,subServiceLineGroup,currentTasksCount:activeTasks.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D,I'})}).catch(()=>{});
    // #endregion
    
    if (!selectedClient) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:141',message:'Clearing tasks - no client',data:{previousTasksCount:activeTasks.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      
      setActiveTasks([]);
      return;
    }

    const client = selectedClient;
    async function fetchActiveTasks() {
      setIsLoadingTasks(true);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:144',message:'Starting fetch',data:{clientCode:client.clientCode,clientId:client.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
      // #endregion
      
      try {
        const url = `/api/tasks?serviceLine=${serviceLine}&subServiceLineGroup=${subServiceLineGroup}&status=Active&clientCode=${encodeURIComponent(client.clientCode)}&limit=100&_t=${Date.now()}`;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:147',message:'Constructed URL',data:{url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:148',message:'Response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        
        if (response.ok) {
          const result = await response.json();
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:150',message:'Parsed response',data:{hasDataTasks:!!result.data?.tasks,hasTasks:!!result.tasks,dataTasksLength:result.data?.tasks?.length,tasksLength:result.tasks?.length,resultKeys:Object.keys(result)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
          // #endregion
          
          const tasks = result.data?.tasks || result.tasks || [];
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:151',message:'Setting tasks',data:{tasksLength:tasks.length,taskIds:tasks.map((t:any)=>t.id).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C',runId:'post-fix'})}).catch(()=>{});
          // #endregion
          
          setActiveTasks(tasks);
        }
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:154',message:'Fetch error',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        
        console.error('Error fetching tasks:', err);
        setActiveTasks([]);
      } finally {
        setIsLoadingTasks(false);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:157',message:'Fetch completed',data:{loadingState:false},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }
    }

    fetchActiveTasks();
  }, [selectedClient, serviceLine, subServiceLineGroup]);

  // Update calculation when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (start <= end) {
        const businessDays = calculateBusinessDays(start, end);
        const availableHours = calculateAvailableHours(start, end);
        
        setCalculatedInfo({
          businessDays,
          availableHours
        });
      } else {
        setCalculatedInfo({
          businessDays: 0,
          availableHours: 0
        });
      }
    } else {
      setCalculatedInfo({
        businessDays: 0,
        availableHours: 0
      });
    }
  }, [formData.startDate, formData.endDate]);

  // Auto-calculate percentage when hours change
  useEffect(() => {
    if (formData.allocatedHours && calculatedInfo.availableHours > 0) {
      const hours = parseFloat(formData.allocatedHours);
      if (!isNaN(hours)) {
        const percentage = calculateAllocationPercentage(
          hours,
          calculatedInfo.availableHours
        );
        setFormData(prev => ({
          ...prev,
          allocatedPercentage: percentage.toString()
        }));
      }
    } else if (!formData.allocatedHours) {
      setFormData(prev => ({
        ...prev,
        allocatedPercentage: ''
      }));
    }
  }, [formData.allocatedHours, calculatedInfo.availableHours]);

  const handleClientSelect = (client: Client) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:251',message:'Client selected',data:{clientId:client.id,clientCode:client.clientCode,clientName:client.clientNameFull,currentActiveTasks:activeTasks.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F,I'})}).catch(()=>{});
    // #endregion
    
    setSelectedClient(client);
    setClientSearch('');
    setStep('task');
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setStep('allocation');
  };

  const handleSave = async () => {
    if (!selectedTask) return;

    // Validation
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date cannot be before start date');
      return;
    }

    if (calculatedInfo.businessDays === 0) {
      setError('Date range must include at least one business day (Monday-Friday)');
      return;
    }

    if (!formData.allocatedHours) {
      setError('Please specify allocated hours');
      return;
    }

    const allocatedHours = parseFloat(formData.allocatedHours);
    if (isNaN(allocatedHours) || allocatedHours < 0) {
      setError('Allocated hours must be a positive number');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        taskId: selectedTask.id,
        startDate: startOfDay(new Date(formData.startDate)),
        endDate: startOfDay(new Date(formData.endDate)),
        allocatedHours: parseFloat(formData.allocatedHours),
        allocatedPercentage: formData.allocatedPercentage ? parseInt(formData.allocatedPercentage) : 0,
        role: formData.role
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save allocation';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-3xl w-full border-2 border-forvis-gray-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b-2 border-forvis-gray-200 flex items-center justify-between sticky top-0 z-10 bg-white"
          style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}
        >
          <div>
            <h2 className="text-xl font-bold text-forvis-blue-900">Plan Employee Allocation</h2>
            <p className="text-sm text-forvis-blue-800 mt-1">
              Planning for: <span className="font-semibold">{userName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-forvis-gray-400 hover:text-forvis-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 border-b border-forvis-gray-200 bg-forvis-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center gap-2 ${step === 'client' ? 'text-forvis-blue-600 font-semibold' : step === 'task' || step === 'allocation' ? 'text-green-600' : 'text-forvis-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'client' ? 'bg-forvis-blue-100' : 'bg-green-100'}`}>
                {step === 'client' ? '1' : '✓'}
              </div>
              <span>Select Client</span>
            </div>
            <ChevronRight className="w-4 h-4 text-forvis-gray-400" />
            <div className={`flex items-center gap-2 ${step === 'task' ? 'text-forvis-blue-600 font-semibold' : step === 'allocation' ? 'text-green-600' : 'text-forvis-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'task' ? 'bg-forvis-blue-100' : step === 'allocation' ? 'bg-green-100' : 'bg-forvis-gray-100'}`}>
                {step === 'allocation' ? '✓' : '2'}
              </div>
              <span>Select Task</span>
            </div>
            <ChevronRight className="w-4 h-4 text-forvis-gray-400" />
            <div className={`flex items-center gap-2 ${step === 'allocation' ? 'text-forvis-blue-600 font-semibold' : 'text-forvis-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'allocation' ? 'bg-forvis-blue-100' : 'bg-forvis-gray-100'}`}>
                3
              </div>
              <span>Set Allocation</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Client Selection */}
          {step === 'client' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Search for Client
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-forvis-gray-400" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Type client name or code..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  />
                </div>
              </div>

              {(isLoadingClients || (clientSearch.length >= 2 && clientSearch !== debouncedClientSearch)) && (
                <div className="text-center py-4 text-forvis-gray-600">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-forvis-blue-600"></div>
                  <p className="text-sm mt-2">Searching clients...</p>
                </div>
              )}

              {!isLoadingClients && clientSearch === debouncedClientSearch && clientResults.length > 0 && (
                <div className="border-2 border-forvis-gray-200 rounded-lg divide-y divide-forvis-gray-200 max-h-80 overflow-y-auto">
                  {clientResults.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-4 py-3 text-left hover:bg-forvis-blue-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-forvis-blue-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-forvis-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-forvis-gray-900">{client.clientNameFull}</div>
                          <div className="text-xs text-forvis-gray-600">{client.clientCode} • {client.groupDesc}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-forvis-gray-400 group-hover:text-forvis-blue-600" />
                    </button>
                  ))}
                </div>
              )}

              {clientSearch.length >= 2 && clientSearch === debouncedClientSearch && !isLoadingClients && clientResults.length === 0 && (
                <div className="text-center py-8 text-forvis-gray-600">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-forvis-gray-400" />
                  <p className="text-sm">No clients found matching "{clientSearch}"</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Task Selection */}
          {step === 'task' && selectedClient && (
            <div className="space-y-4">
              {/* #region agent log */}
              {fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:435',message:'Rendering task step',data:{step,hasSelectedClient:!!selectedClient,clientCode:selectedClient?.clientCode,activeTasks:activeTasks.length,isLoadingTasks,willShowTasks:!isLoadingTasks&&activeTasks.length>0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{}) && null}
              {/* #endregion */}
              
              {/* Selected Client Display */}
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-900">{selectedClient.clientNameFull}</div>
                    <div className="text-xs text-green-700">{selectedClient.clientCode}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:454',message:'Change button clicked',data:{previousClient:selectedClient?.clientCode,previousClientId:selectedClient?.id,currentTasks:activeTasks.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
                    // #endregion
                    
                    setSelectedClient(null);
                    setStep('client');
                  }}
                  className="text-xs text-green-700 hover:text-green-900 underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Select Active Task
                  {activeTasks.length > 0 && (
                    <span className="text-forvis-gray-600 font-normal ml-1">
                      ({activeTasks.length} active {activeTasks.length === 1 ? 'task' : 'tasks'})
                    </span>
                  )}
                </label>
              </div>

              {isLoadingTasks && (
                <div className="text-center py-4 text-forvis-gray-600">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-forvis-blue-600"></div>
                  <p className="text-sm mt-2">Loading active tasks...</p>
                </div>
              )}

              {!isLoadingTasks && activeTasks.length > 0 && (
                <div className="border-2 border-forvis-gray-200 rounded-lg divide-y divide-forvis-gray-200 max-h-96 overflow-y-auto">
                  {/* #region agent log */}
                  {fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminPlanningModal.tsx:485',message:'Rendering task list',data:{selectedClientCode:selectedClient?.clientCode,taskCount:activeTasks.length,taskDetails:activeTasks.map(t=>({id:t.id,name:t.name,clientCode:t.client?.clientCode}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H,I',runId:'post-fix'})}).catch(()=>{}) && null}
                  {/* #endregion */}
                  {activeTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskSelect(task)}
                      className="w-full px-4 py-3 text-left hover:bg-forvis-blue-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-forvis-blue-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-5 h-5 text-forvis-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-forvis-gray-900 truncate">{task.name}</div>
                          <div className="text-xs text-forvis-gray-600">
                            {(task as any).TaskCode || 'No code'} • {task.projectType}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-forvis-gray-400 group-hover:text-forvis-blue-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {!isLoadingTasks && activeTasks.length === 0 && (
                <div className="text-center py-8 text-forvis-gray-600">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 text-forvis-gray-400" />
                  <p className="text-sm font-medium">No active tasks found</p>
                  <p className="text-xs mt-1">This client has no active tasks in {subServiceLineGroup}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Allocation Details */}
          {step === 'allocation' && selectedTask && (
            <div className="space-y-4">
              {/* Selected Task Display */}
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-900">{selectedTask.name}</div>
                    <div className="text-xs text-green-700">
                      {(selectedTask as any).TaskCode || 'No code'} • {selectedClient?.clientCode} • {selectedTask.projectType}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setStep('task');
                  }}
                  className="text-xs text-green-700 hover:text-green-900 underline"
                >
                  Change
                </button>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  />
                </div>
              </div>

              {/* Business Days Calculation */}
              {formData.startDate && formData.endDate && calculatedInfo.businessDays > 0 && (
                <div 
                  className="p-4 rounded-lg border-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
                    borderColor: '#5B93D7'
                  }}
                >
                  <div className="text-sm font-medium text-forvis-blue-900 mb-2">
                    📊 Available Hours Calculation
                  </div>
                  <div className="text-sm text-forvis-blue-800 space-y-1">
                    <div>
                      <span className="font-semibold">{calculatedInfo.businessDays}</span> business days
                      <span className="text-forvis-blue-600 mx-1">×</span>
                      <span className="font-semibold">8</span> hours/day
                      <span className="text-forvis-blue-600 mx-1">=</span>
                      <span className="font-bold text-forvis-blue-900">
                        {calculatedInfo.availableHours} hours available
                      </span>
                    </div>
                    <div className="text-xs text-forvis-blue-700 mt-1">
                      (Weekends excluded from calculation)
                    </div>
                  </div>
                </div>
              )}

              {/* Warning if no business days */}
              {formData.startDate && formData.endDate && calculatedInfo.businessDays === 0 && (
                <div className="p-3 bg-yellow-50 border-2 border-yellow-300 text-yellow-800 rounded-lg text-sm">
                  ⚠️ Selected date range contains no business days (only weekends).
                </div>
              )}

              {/* Allocation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Allocated Hours
                    {calculatedInfo.availableHours > 0 && (
                      <span className="text-forvis-gray-600 font-normal ml-1">
                        (of {calculatedInfo.availableHours} available)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.allocatedHours}
                    onChange={(e) => setFormData({ ...formData, allocatedHours: e.target.value })}
                    placeholder="e.g., 20"
                    className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  />
                  {formData.allocatedHours && calculatedInfo.availableHours > 0 && (
                    <p className="text-xs text-forvis-gray-600 mt-1">
                      {parseFloat(formData.allocatedHours) > calculatedInfo.availableHours 
                        ? '⚠️ Over-allocated' 
                        : '✓ Within available hours'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                    <Percent className="w-4 h-4 inline mr-1" />
                    Allocation %
                    <span className="text-forvis-gray-600 font-normal ml-1">(calculated)</span>
                  </label>
                  <div className="w-full px-3 py-2 border-2 border-forvis-gray-200 rounded-lg bg-forvis-gray-50 text-forvis-gray-700 font-semibold">
                    {formData.allocatedPercentage ? `${formData.allocatedPercentage}%` : '-'}
                  </div>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
                  Role on Task
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as TaskRole })}
                  className="w-full px-3 py-2 border-2 border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                >
                  <option value="VIEWER">👁️ Viewer - Read-only access</option>
                  <option value="EDITOR">✏️ Editor - Can edit data</option>
                  <option value="REVIEWER">✅ Reviewer - Can approve/reject</option>
                  <option value="ADMIN">⚙️ Admin - Full task control</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-forvis-gray-50 border-t-2 border-forvis-gray-200 flex justify-between items-center sticky bottom-0">
          <div>
            {step !== 'client' && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  if (step === 'allocation') {
                    setSelectedTask(null);
                    setStep('task');
                  } else if (step === 'task') {
                    setSelectedClient(null);
                    setStep('client');
                  }
                }}
                disabled={isSaving}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {step === 'allocation' && (
              <Button
                variant="gradient"
                size="md"
                onClick={handleSave}
                loading={isSaving}
              >
                Create Allocation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
