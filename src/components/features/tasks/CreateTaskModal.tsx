'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ServiceLine } from '@/types';
import { ClientSelector } from '../../features/clients/ClientSelector';
import { EmployeeAutocomplete } from '../../features/users/EmployeeAutocomplete';
import { TeamMember } from '../../features/users/EmployeeMultiSelect';
import { OfficeCodeSelector } from './OfficeCodeSelector';
import { useServiceLine } from '@/components/providers/ServiceLineProvider';
import { useCreateTask } from '@/hooks/tasks/useCreateTask';
import { useStandardTasks } from '@/hooks/tasks/useStandardTasks';
import { useCheckDuplicateTaskCode, CheckDuplicateResult } from '@/hooks/tasks/useCheckDuplicateTaskCode';
import { DuplicateTaskWarning } from './DuplicateTaskWarning';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface TaskCreatedResult {
  id: number;
  name: string;
  serviceLine: string;
  [key: string]: unknown;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: TaskCreatedResult) => void;
  initialClientId?: number | null;  // Internal ID
  initialServiceLine?: ServiceLine | null;
  initialSubServiceLineGroup?: string | null;
}

interface ExternalServiceLine {
  id: number;
  ServLineCode: string | null;
  ServLineDesc: string | null;
  SubServlineGroupCode: string | null;
  masterCode: string | null;
}

export function CreateTaskModal({ isOpen, onClose, onSuccess, initialClientId, initialServiceLine, initialSubServiceLineGroup }: CreateTaskModalProps) {
  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { currentServiceLine } = useServiceLine();
  const createTaskMutation = useCreateTask();
  
  // Use initialServiceLine if provided, otherwise fall back to currentServiceLine
  const effectiveServiceLine = initialServiceLine || currentServiceLine || ServiceLine.TAX;
  const isServiceLineLocked = !!initialServiceLine;
  
  // External service lines state
  const [externalServiceLines, setExternalServiceLines] = useState<ExternalServiceLine[]>([]);
  const [loadingExternalServiceLines, setLoadingExternalServiceLines] = useState(false);

  // Standard tasks state
  const [selectedStandardTask, setSelectedStandardTask] = useState<string>('');
  
  // Duplicate checking state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<CheckDuplicateResult | null>(null);
  const checkDuplicateMutation = useCheckDuplicateTaskCode();

  // Team member management state
  const [officeAutoPopulated, setOfficeAutoPopulated] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [formData, setFormData] = useState({
    // Basic Info
    taskYear: new Date().getFullYear(),
    TaskDesc: '',
    TaskCode: '',
    clientId: initialClientId || null,
    
    // Standard Task
    stdTaskCode: '',
    stdTaskDesc: '',
    
    // Team & Organization
    TaskPartner: '',
    TaskPartnerName: '',
    TaskManager: '',
    TaskManagerName: '',
    OfficeCode: '',
    TaskPartnerOfficeCode: '',
    
    // Service Line
    serviceLine: effectiveServiceLine,
    SLGroup: '',
    ServLineCode: '',
    ServLineDesc: '',
    
    // Timeline
    TaskDateOpen: new Date().toISOString().split('T')[0],
    TaskDateTerminate: '',
  });

  // Fetch external service lines when service line is available
  useEffect(() => {
    if (formData.serviceLine && isOpen) {
      if (initialSubServiceLineGroup) {
        // Fetch external service lines for specific sub-service line group
        fetchExternalServiceLines(formData.serviceLine, initialSubServiceLineGroup);
      } else {
        // Fetch all external service lines for the service line
        fetchAllExternalServiceLines(formData.serviceLine);
      }
    }
  }, [formData.serviceLine, initialSubServiceLineGroup, isOpen]);

  // Update clientId when initialClientId changes
  useEffect(() => {
    if (initialClientId !== undefined) {
      setFormData(prev => ({ ...prev, clientId: initialClientId }));
    }
  }, [initialClientId]);

  // Update service line when modal opens
  useEffect(() => {
    if (isOpen) {
      const sl = initialServiceLine || currentServiceLine || ServiceLine.TAX;
      setFormData(prev => ({
        ...prev,
        serviceLine: sl,
      }));
    }
  }, [isOpen, initialServiceLine, currentServiceLine]);

  // Re-process ServLineCode when externalServiceLines loads (fixes race condition)
  useEffect(() => {
    if (externalServiceLines.length > 0 && formData.ServLineCode && !formData.ServLineDesc) {
      // Service line code exists but description is missing - lookup and populate
      const selectedLine = externalServiceLines.find(line => line.ServLineCode === formData.ServLineCode);
      if (selectedLine) {
        setFormData(prev => ({
          ...prev,
          ServLineDesc: selectedLine.ServLineDesc || '',
          SLGroup: selectedLine.SubServlineGroupCode || '',
        }));
      }
    }
  }, [externalServiceLines, formData.ServLineCode, formData.ServLineDesc]);

  const fetchExternalServiceLines = async (masterCode: string, subGroupCode: string) => {
    setLoadingExternalServiceLines(true);
    try {
      const response = await fetch(`/api/service-lines/${masterCode}/${subGroupCode}/external-lines`);
      if (response.ok) {
        const data = await response.json();
        const lines = data.success ? data.data : [];
        setExternalServiceLines(lines);
        
        // Auto-select first external service line if available
        if (lines.length > 0 && !formData.ServLineCode) {
          handleServLineCodeChange(lines[0].ServLineCode || '');
        }
      }
    } catch (error) {
      console.error('Error fetching external service lines:', error);
      setExternalServiceLines([]);
    } finally {
      setLoadingExternalServiceLines(false);
    }
  };

  const fetchAllExternalServiceLines = async (masterCode: string) => {
    setLoadingExternalServiceLines(true);
    try {
      const response = await fetch(`/api/service-lines/${masterCode}/external-lines`);
      if (response.ok) {
        const data = await response.json();
        const lines = data.success ? data.data : [];
        setExternalServiceLines(lines);
        
        // Auto-select first external service line if available
        if (lines.length > 0 && !formData.ServLineCode) {
          handleServLineCodeChange(lines[0].ServLineCode || '');
        }
      }
    } catch (error) {
      console.error('Error fetching all external service lines:', error);
      setExternalServiceLines([]);
    } finally {
      setLoadingExternalServiceLines(false);
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;
    const endYear = currentYear + 1;
    const years = [];
    
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  const handleFieldChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServLineCodeChange = (servLineCode: string) => {
    // Find the selected external service line
    const selectedLine = externalServiceLines.find(line => line.ServLineCode === servLineCode);
    
    if (selectedLine) {
      setFormData(prev => ({
        ...prev,
        ServLineCode: servLineCode,
        ServLineDesc: selectedLine.ServLineDesc || '',
        SLGroup: selectedLine.SubServlineGroupCode || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        ServLineCode: servLineCode,
        ServLineDesc: '',
        SLGroup: '',
      }));
    }
  };

  // Function to lookup ServiceLineRole for an employee
  const fetchEmployeeRole = async (empCode: string): Promise<string> => {
    try {
      // If no SLGroup, default to USER
      if (!formData.SLGroup) return 'USER';

      // Look up employee's User account
      const empResponse = await fetch(`/api/employees/${empCode}`);
      if (!empResponse.ok) return 'USER';
      const empData = await empResponse.json();
      const email = empData.data?.WinLogon;
      
      if (!email) return 'USER';
      
      // Look up ServiceLineRole
      const roleResponse = await fetch(
        `/api/service-lines/user-role?userId=${encodeURIComponent(email)}&subServiceLineGroup=${encodeURIComponent(formData.SLGroup)}`
      );
      if (!roleResponse.ok) return 'USER';
      const roleData = await roleResponse.json();
      
      return roleData.data?.role || 'USER';
    } catch (error) {
      console.error('Error fetching employee role:', error);
      return 'USER';
    }
  };

  const handlePartnerChange = (code: string, name: string, nameFull: string, officeCode: string) => {
    // Get the previous partner code to remove from team
    const previousPartnerCode = formData.TaskPartner;

    // Update form data
    setFormData(prev => ({
      ...prev,
      TaskPartner: code,
      TaskPartnerName: name,
      TaskPartnerOfficeCode: officeCode,
      OfficeCode: code ? officeCode : prev.OfficeCode,  // Auto-populate office code only if partner selected
    }));
    
    // Only mark as auto-populated if a partner is selected
    if (code) {
      setOfficeAutoPopulated(true);
    } else {
      setOfficeAutoPopulated(false);
    }
    
    // Update team members - use PARTNER role directly
    if (code) {
      setTeamMembers(prev => {
        // Remove previous partner if exists
        let filtered = prev;
        if (previousPartnerCode) {
          filtered = prev.filter(m => m.empCode !== previousPartnerCode);
        }
        
        // Check if this person already exists in the team (not as previous partner)
        const existingMember = filtered.find(m => m.empCode === code);
        
        if (existingMember) {
          // Update existing member with PARTNER role and lock them
          return filtered.map(m => 
            m.empCode === code 
              ? { ...m, role: 'PARTNER', locked: true }
              : m
          );
        } else {
          // Add new member with PARTNER role
          return [...filtered, {
            empCode: code,
            empName: name,
            empNameFull: nameFull,
            role: 'PARTNER',
            locked: true,
          }];
        }
      });
    } else {
      // If cleared, remove partner from team
      setTeamMembers(prev => 
        previousPartnerCode ? prev.filter(m => m.empCode !== previousPartnerCode) : prev
      );
    }
  };

  const handleManagerChange = (code: string, name: string, nameFull: string, officeCode: string) => {
    // Get the previous manager code to remove from team
    const previousManagerCode = formData.TaskManager;

    // Update form data
    setFormData(prev => ({
      ...prev,
      TaskManager: code,
      TaskManagerName: name,
    }));
    
    // Update team members - use MANAGER role directly
    if (code) {
      setTeamMembers(prev => {
        // Remove previous manager if exists
        let filtered = prev;
        if (previousManagerCode) {
          filtered = prev.filter(m => m.empCode !== previousManagerCode);
        }
        
        // Check if this person already exists in the team (not as previous manager)
        const existingMember = filtered.find(m => m.empCode === code);
        
        if (existingMember) {
          // Update existing member with MANAGER role and lock them
          return filtered.map(m => 
            m.empCode === code 
              ? { ...m, role: 'MANAGER', locked: true }
              : m
          );
        } else {
          // Add new member with MANAGER role
          return [...filtered, {
            empCode: code,
            empName: name,
            empNameFull: nameFull,
            role: 'MANAGER',
            locked: true,
          }];
        }
      });
    } else {
      // If cleared, remove manager from team
      setTeamMembers(prev => 
        previousManagerCode ? prev.filter(m => m.empCode !== previousManagerCode) : prev
      );
    }
  };

  // Fetch standard tasks for the selected service line
  const { data: standardTasks = [], isLoading: loadingStandardTasks } = useStandardTasks(
    formData.ServLineCode,
    !!formData.ServLineCode && isOpen
  );

  // Generate task code helper function
  const generateTaskCode = (servLineCode: string, year: number, stdTaskCode: string, increment: string): string => {
    const servPrefix = servLineCode.substring(0, 3).toUpperCase();
    const yearSuffix = year.toString().slice(-2);
    const stdCode = stdTaskCode.substring(0, 3).toUpperCase();
    return `${servPrefix}${yearSuffix}${stdCode}${increment}`;
  };

  // Handle standard task selection
  const handleStandardTaskChange = async (stdTaskCode: string) => {
    if (!stdTaskCode) {
      setSelectedStandardTask('');
      setFormData(prev => ({
        ...prev,
        stdTaskCode: '',
        stdTaskDesc: '',
        TaskDesc: '',
        TaskCode: '',
      }));
      return;
    }

    // Find the selected standard task
    const selectedTask = standardTasks.find(task => task.StdTaskCode === stdTaskCode);
    if (!selectedTask) return;

    setSelectedStandardTask(stdTaskCode);

    // Update form with standard task description
    setFormData(prev => ({
      ...prev,
      stdTaskCode: stdTaskCode,
      stdTaskDesc: selectedTask.StdTaskDesc,
      TaskDesc: selectedTask.StdTaskDesc,
    }));

    // Check for duplicates
    try {
      const result = await checkDuplicateMutation.mutateAsync({
        servLineCode: formData.ServLineCode,
        year: formData.taskYear,
        stdTaskCode: stdTaskCode,
      });

      setDuplicateCheckResult(result);

      // If duplicates exist, show warning modal
      if (result.exists) {
        setShowDuplicateWarning(true);
      } else {
        // No duplicates, generate code with increment 01
        const taskCode = generateTaskCode(
          formData.ServLineCode,
          formData.taskYear,
          stdTaskCode,
          result.nextIncrement
        );
        setFormData(prev => ({ ...prev, TaskCode: taskCode }));
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // If error, still generate a code with increment 01
      const taskCode = generateTaskCode(
        formData.ServLineCode,
        formData.taskYear,
        stdTaskCode,
        '01'
      );
      setFormData(prev => ({ ...prev, TaskCode: taskCode }));
    }
  };

  // Handle duplicate warning confirmation
  const handleDuplicateContinue = () => {
    if (duplicateCheckResult) {
      // Use the next increment from the duplicate check
      const taskCode = duplicateCheckResult.nextTaskCode;
      setFormData(prev => ({ ...prev, TaskCode: taskCode }));
    }
    setShowDuplicateWarning(false);
  };

  // Handle duplicate warning cancellation
  const handleDuplicateCancel = () => {
    setShowDuplicateWarning(false);
    // Reset standard task selection
    setSelectedStandardTask('');
    setFormData(prev => ({
      ...prev,
      stdTaskCode: '',
      stdTaskDesc: '',
      TaskDesc: '',
      TaskCode: '',
    }));
  };

  const handleNextStep = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setStep(prev => prev + 1);
    
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handlePrevStep = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setStep(prev => prev - 1);
    
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const isStepValid = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        // Only check ServLineCode - backend will derive SLGroup and ServLineDesc
        return !!formData.taskYear && !!formData.TaskDesc.trim() && !!formData.ServLineCode?.trim() && !!formData.stdTaskCode && !!formData.TaskCode;
      case 2:
        return !!formData.TaskPartner && !!formData.TaskManager && !!formData.OfficeCode;
      case 3:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (step !== 3) return;

    try {
      // Prepare submission data
      const submitData = {
        ...formData,
        // Backend will populate these from ServLineCode
        SLGroup: null,
        ServLineDesc: null,
        // Task dates - auto-populate TaskDateOpen with current date
        TaskDateOpen: new Date(),
        TaskDateTerminate: undefined,
        // Add team members with their ServiceLineRole
        teamMembers: teamMembers.map(tm => ({
          empCode: tm.empCode,
          role: tm.role,
        })),
      };

      const createdTask = await createTaskMutation.mutateAsync(submitData);

      // Check if some team members couldn't be added
      if (createdTask.teamMemberSummary && createdTask.teamMemberSummary.failed && createdTask.teamMemberSummary.failed.length > 0) {
        console.warn('[Task Creation] Some team members could not be added:', createdTask.teamMemberSummary.failed);
      }

      // Reset form
      resetForm();

      // Call parent's onSuccess
      onSuccess(createdTask);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const resetForm = () => {
    const sl = initialServiceLine || currentServiceLine || ServiceLine.TAX;
    setFormData({
      taskYear: new Date().getFullYear(),
      TaskDesc: '',
      TaskCode: '',
      clientId: initialClientId || null,
      stdTaskCode: '',
      stdTaskDesc: '',
      TaskPartner: '',
      TaskPartnerName: '',
      TaskManager: '',
      TaskManagerName: '',
      OfficeCode: '',
      TaskPartnerOfficeCode: '',
      serviceLine: sl,
      SLGroup: '',
      ServLineCode: '',
      ServLineDesc: '',
      TaskDateOpen: new Date().toISOString().split('T')[0],
      TaskDateTerminate: '',
    });
    setStep(1);
    setIsTransitioning(false);
    setSelectedStandardTask('');
    setShowDuplicateWarning(false);
    setDuplicateCheckResult(null);
    setOfficeAutoPopulated(false);
    setTeamMembers([]);
  };

  const handleClose = () => {
    resetForm();
    createTaskMutation.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div 
          className="px-6 py-4 border-b border-gray-200"
          style={{ background: GRADIENTS.primary.horizontal }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Create New Task</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center mt-4 space-x-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
          
          <div className="flex justify-between text-xs text-white/90 mt-1">
            <span>Basic Info</span>
            <span>Team</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {createTaskMutation.error && (
            <div className="mb-4 p-3 bg-forvis-error-50 border border-forvis-error-200 text-forvis-error-700 rounded-lg">
              {createTaskMutation.error.message}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Line <span className="text-forvis-error-500">*</span>
                </label>
                {loadingExternalServiceLines ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
                ) : (
                  <select
                    value={formData.ServLineCode}
                    onChange={(e) => handleServLineCodeChange(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                    required
                  >
                    <option value="">Select service line...</option>
                    {externalServiceLines.map((line) => (
                      <option key={line.id} value={line.ServLineCode || ''}>
                        {line.ServLineCode} - {line.ServLineDesc || line.ServLineCode}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year <span className="text-forvis-error-500">*</span>
                </label>
                <select
                  value={formData.taskYear}
                  onChange={(e) => handleFieldChange('taskYear', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  required
                >
                  {generateYearOptions().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standard Task <span className="text-forvis-error-500">*</span>
                </label>
                {loadingStandardTasks ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
                ) : !formData.ServLineCode ? (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500 italic">
                    Please select a service line first
                  </div>
                ) : standardTasks.length === 0 ? (
                  <div className="px-3 py-2 bg-forvis-warning-50 border border-forvis-warning-300 rounded-lg text-sm text-forvis-warning-700">
                    No standard tasks available for this service line
                  </div>
                ) : (
                  <select
                    value={selectedStandardTask}
                    onChange={(e) => handleStandardTaskChange(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                    required
                    disabled={!formData.ServLineCode}
                  >
                    <option value="">Select standard task...</option>
                    {standardTasks.map((task) => (
                      <option key={task.id} value={task.StdTaskCode}>
                        {task.StdTaskCode} - {task.StdTaskDesc}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Selecting a standard task will auto-populate the task name and generate the task code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Name <span className="text-forvis-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.TaskDesc}
                  onChange={(e) => handleFieldChange('TaskDesc', e.target.value)}
                  maxLength={150}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500"
                  placeholder="Enter task name"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">{formData.TaskDesc.length}/150 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Code <span className="text-forvis-error-500">*</span>
                </label>
                {!formData.stdTaskCode ? (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500 italic">
                    Select a standard task to generate task code
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-forvis-blue-50 border-2 border-forvis-blue-200 rounded-lg">
                    <span className="font-mono text-lg font-bold text-forvis-blue-600">
                      {formData.TaskCode || 'Generating...'}
                    </span>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">Auto-generated from service line, year, and standard task</p>
              </div>

              {!initialClientId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                  </label>
                  <ClientSelector
                    value={formData.clientId}
                    onChange={(clientId) => handleFieldChange('clientId', clientId)}
                    allowCreate={false}
                  />
                  <p className="mt-1 text-xs text-gray-500">Optional: Associate this task with a client</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                  </label>
                  <div className="px-3 py-2 bg-forvis-gray-50 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-700">
                    Task will be created for the current client
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Team & Organization */}
          {step === 2 && (
            <div className="space-y-4">
              <EmployeeAutocomplete
                label="Task Partner"
                value={formData.TaskPartner}
                valueName={formData.TaskPartnerName}
                onChange={handlePartnerChange}
                empCatCodes={['CARL', 'DIR', 'Local']}
                excludeCodes={formData.TaskManager ? [formData.TaskManager] : []}
                required
                placeholder="Search by name or code..."
              />

              <EmployeeAutocomplete
                label="Task Manager"
                value={formData.TaskManager}
                valueName={formData.TaskManagerName}
                onChange={handleManagerChange}
                excludeCodes={formData.TaskPartner ? [formData.TaskPartner] : []}
                required
                placeholder="Search by name or code..."
              />

              {officeAutoPopulated ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Office Code <span className="text-forvis-error-500">*</span>
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border-2 border-gray-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{formData.OfficeCode}</span>
                      <span className="text-xs text-gray-500 italic">From selected partner</span>
                    </div>
                  </div>
                </div>
              ) : (
                <OfficeCodeSelector
                  value={formData.OfficeCode}
                  onChange={(code) => handleFieldChange('OfficeCode', code)}
                  required
                />
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg border border-forvis-blue-200"
                style={{ background: GRADIENTS.dashboard.card }}
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Task Summary</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium text-gray-900">{formData.taskYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Task Name:</span>
                    <span className="font-medium text-gray-900">{formData.TaskDesc}</span>
                  </div>
                  {formData.TaskCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Task Code:</span>
                      <span className="font-medium text-gray-900">{formData.TaskCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Partner:</span>
                    <span className="font-medium text-gray-900">{formData.TaskPartnerName || formData.TaskPartner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manager:</span>
                    <span className="font-medium text-gray-900">{formData.TaskManagerName || formData.TaskManager}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Office:</span>
                    <span className="font-medium text-gray-900">{formData.OfficeCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium text-gray-900">{formData.TaskDateOpen}</span>
                  </div>
                  {formData.TaskDateTerminate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Date:</span>
                      <span className="font-medium text-gray-900">{formData.TaskDateTerminate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isTransitioning || createTaskMutation.isPending}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={createTaskMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isTransitioning || !isStepValid(step)}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: isStepValid(step) ? GRADIENTS.primary.horizontal : '#9CA3AF' 
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createTaskMutation.isPending}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: GRADIENTS.primary.horizontal }}
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Task Warning Modal */}
      {duplicateCheckResult && (
        <DuplicateTaskWarning
          isOpen={showDuplicateWarning}
          onClose={handleDuplicateCancel}
          onContinue={handleDuplicateContinue}
          existingTasks={duplicateCheckResult.existingTasks}
          nextTaskCode={duplicateCheckResult.nextTaskCode}
          basePattern={duplicateCheckResult.basePattern}
        />
      )}
    </div>
  );
}

