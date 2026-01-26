'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { QuestionField } from './QuestionField';
import { DocumentUpload } from './DocumentUpload';
import { GRADIENTS } from '@/lib/design-system/gradients';
import { useQuestionnaire, useSaveAnswers, useSubmitQuestionnaire } from '@/hooks/acceptance/useAcceptanceQuestionnaire';
import { QuestionSection } from '@/constants/acceptance-questions';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

interface AcceptanceQuestionnaireProps {
  taskId: string;
  onSubmitSuccess?: () => void;
}

interface AnswerState {
  [questionKey: string]: {
    answer: string;
    comment?: string;
  };
}

export function AcceptanceQuestionnaire({ taskId, onSubmitSuccess }: AcceptanceQuestionnaireProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSavingBeforeSubmit, setIsSavingBeforeSubmit] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const { data: questionnaireData, isLoading } = useQuestionnaire(taskId);
  const saveAnswersMutation = useSaveAnswers(taskId);
  const submitMutation = useSubmitQuestionnaire(taskId);

  const sections: QuestionSection[] = questionnaireData?.data?.structure || [];
  const response = questionnaireData?.data?.response;
  const existingAnswers = questionnaireData?.data?.answers || [];
  const riskAssessment = questionnaireData?.data?.riskAssessment;

  // Load existing answers (only on initial load, not on every refetch)
  useEffect(() => {
    if (existingAnswers && existingAnswers.length > 0 && Object.keys(answers).length === 0) {
      const answerMap: AnswerState = {};
      existingAnswers.forEach((ans: { AcceptanceQuestion: { questionKey: string }; answer: string | null; comment: string | null }) => {
        answerMap[ans.AcceptanceQuestion.questionKey] = {
          answer: ans.answer || '',
          comment: ans.comment || '',
        };
      });
      setAnswers(answerMap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAnswers]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (tabRefs.current[activeTab]) {
      tabRefs.current[activeTab]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  // Autosave functionality (debounced)
  useEffect(() => {
    if (!hasChanges || isSavingBeforeSubmit) return; // Don't autosave if we're saving before submit

    const timer = setTimeout(() => {
      const answersArray = Object.entries(answers).map(([questionKey, data]) => ({
        questionKey,
        answer: data.answer,
        comment: data.comment,
      }));

      // Only save if there are actual answers to save
      if (answersArray.length > 0) {
        saveAnswersMutation.mutate(answersArray, {
          onSuccess: () => setHasChanges(false),
        });
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, hasChanges, isSavingBeforeSubmit]); // Added isSavingBeforeSubmit to prevent conflicts

  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index);
    // Scroll tab into view
    setTimeout(() => {
      tabRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }, 0);
  }, []);

  const handleAnswerChange = useCallback((questionKey: string, answer: string, comment?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: { answer, comment },
    }));
    setHasChanges(true);
  }, []);

  const handleSubmit = async () => {
    setSaveError(null); // Clear any previous errors
    
    try {
      // Force save any pending changes before submission
      if (hasChanges) {
        setIsSavingBeforeSubmit(true);
        
        const answersArray = Object.entries(answers).map(([questionKey, data]) => ({
          questionKey,
          answer: data.answer,
          comment: data.comment,
        }));

        // Wait for save to complete
        await saveAnswersMutation.mutateAsync(answersArray);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to save changes before submission:', error);
      setSaveError('Failed to save your changes. Please try again.');
      // Show error to user but don't proceed with submission
      return;
    } finally {
      setIsSavingBeforeSubmit(false);
    }

    // Now show confirmation modal
    setConfirmModal({
      isOpen: true,
      title: 'Submit Questionnaire',
      message: 'Are you sure you want to submit this questionnaire for review? You will not be able to make changes after submission.',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await submitMutation.mutateAsync();
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }
        } catch (error) {
          console.error('Failed to submit:', error);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Calculate completion for each section (accounting for conditional questions)
  const sectionCompletion = useMemo(() => {
    return sections.map((section) => {
      const questions = section.questions.filter((q) => q.required && q.fieldType !== 'PLACEHOLDER' && q.fieldType !== 'BUTTON');
      
      let visibleCount = 0;
      let answeredCount = 0;
      
      for (const question of questions) {
        // Check conditional display
        if (question.conditionalDisplay) {
          const dependentAnswer = answers[question.conditionalDisplay.dependsOn];
          if (dependentAnswer?.answer !== question.conditionalDisplay.requiredAnswer) {
            continue; // Skip questions that shouldn't be shown
          }
        }
        
        // This question is visible
        visibleCount++;
        
        // Check if answered
        const answer = answers[question.questionKey];
        if (answer && answer.answer && answer.answer.trim() !== '') {
          answeredCount++;
        }
      }
      
      return {
        total: visibleCount,
        completed: answeredCount,
        percentage: visibleCount > 0 ? Math.round((answeredCount / visibleCount) * 100) : 100,
      };
    });
  }, [sections, answers]);

  const overallCompletion = useMemo(() => {
    const totals = sectionCompletion.reduce(
      (acc, sec) => ({
        total: acc.total + sec.total,
        completed: acc.completed + sec.completed,
      }),
      { total: 0, completed: 0 }
    );
    return totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
  }, [sectionCompletion]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500"></div>
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="p-6 bg-forvis-warning-50 border-2 border-forvis-warning-200 rounded-lg">
        <p className="text-sm text-forvis-warning-800">No questionnaire configured for this task type.</p>
      </div>
    );
  }

  const isCompleted = response?.completedAt != null;
  const isReadOnly = isCompleted || response?.reviewedAt != null;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-forvis-gray-900">
              {questionnaireData?.data?.typeInfo?.recommendedType?.replace(/_/g, ' ')}
            </h3>
            <p className="text-sm text-forvis-gray-600 mt-1">
              {questionnaireData?.data?.typeInfo?.reason}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-forvis-blue-600">{overallCompletion}%</div>
            <div className="text-xs text-forvis-gray-600">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-forvis-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${overallCompletion}%`,
              background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
            }}
          />
        </div>

        {/* Autosave Indicator */}
        {isSavingBeforeSubmit && (
          <div className="mt-3 text-xs text-forvis-blue-600 flex items-center gap-2">
            <Clock className="h-3 w-3 animate-spin" />
            <span>Saving changes before submission...</span>
          </div>
        )}

        {hasChanges && !isSavingBeforeSubmit && (
          <div className="mt-3 text-xs text-forvis-gray-600 flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Saving...</span>
          </div>
        )}

        {saveAnswersMutation.isSuccess && !hasChanges && !isSavingBeforeSubmit && (
          <div className="mt-3 text-xs text-forvis-success-600 flex items-center gap-2">
            <CheckCircle className="h-3 w-3" />
            <span>All changes saved</span>
          </div>
        )}

        {saveError && (
          <div className="mt-3 text-xs text-forvis-error-600 flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Risk Assessment Display (if available) */}
      {riskAssessment && (
        <div
          className="p-4 rounded-lg border-2"
          style={{
            background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
            borderColor: '#2E5AAC',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-forvis-gray-900">Current Risk Assessment</h4>
              <p className="text-xs text-forvis-gray-700 mt-1">Based on answers provided so far</p>
            </div>
            <div
              className={`px-3 py-1 rounded-lg text-sm font-bold ${
                riskAssessment.riskRating === 'LOW'
                  ? 'bg-green-100 text-green-800'
                  : riskAssessment.riskRating === 'MEDIUM'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {riskAssessment.riskRating} RISK ({riskAssessment.overallRiskScore}%)
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
        <div
          className="flex overflow-x-auto border-b-2 scrollbar-thin scrollbar-thumb-forvis-blue-300 scrollbar-track-forvis-gray-100"
          style={{ borderColor: '#2E5AAC' }}
        >
          {sections.map((section, index) => {
            const completion = sectionCompletion[index];
            if (!completion) return null;
            
            const isComplete = completion.percentage === 100;
            const isActive = activeTab === index;

            return (
              <button
                key={section.key}
                ref={(el) => { tabRefs.current[index] = el; }}
                onClick={() => handleTabChange(index)}
                className={`
                  flex-shrink-0 px-6 py-4 text-sm font-semibold transition-all border-r border-forvis-gray-200 last:border-r-0
                  ${
                    isActive
                      ? 'text-white'
                      : 'text-forvis-gray-700 hover:bg-forvis-blue-50'
                  }
                `}
                style={
                  isActive
                    ? { background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }
                    : undefined
                }
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-center leading-tight">{section.title}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isComplete && <CheckCircle className="h-4 w-4" />}
                    <span className={`text-xs font-medium ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                      ({completion.completed}/{completion.total})
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {sections[activeTab] && (
            <div className="space-y-6">
              {sections[activeTab].description && (
                <p className="text-sm text-forvis-gray-700 bg-forvis-gray-50 p-3 rounded-lg border border-forvis-gray-200">
                  {sections[activeTab].description}
                </p>
              )}

              {sections[activeTab].questions.map((question) => {
                // Check conditional display
                if (question.conditionalDisplay) {
                  const dependentAnswer = answers[question.conditionalDisplay.dependsOn];
                  if (dependentAnswer?.answer !== question.conditionalDisplay.requiredAnswer) {
                    return null; // Don't show this question
                  }
                }

                return (
                  <div key={question.questionKey} className="p-4 bg-white rounded-lg border border-forvis-gray-200">
                    <QuestionField
                      question={question}
                      value={answers[question.questionKey]?.answer || ''}
                      comment={answers[question.questionKey]?.comment}
                      onChange={(answer, comment) => handleAnswerChange(question.questionKey, answer, comment)}
                      disabled={isReadOnly}
                    />
                  </div>
                );
              })}

              {/* Document Upload Section (show on last tab) */}
              {activeTab === sections.length - 1 && (
                <div className="mt-6 p-4 bg-forvis-gray-50 rounded-lg border border-forvis-gray-200">
                  <h4 className="text-sm font-semibold text-forvis-gray-900 mb-3">Supporting Documents</h4>
                  <DocumentUpload taskId={taskId} disabled={isReadOnly} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="px-6 pb-6 flex items-center justify-between border-t border-forvis-gray-200 pt-4">
          <button
            onClick={() => handleTabChange(Math.max(0, activeTab - 1))}
            disabled={activeTab === 0}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="text-sm text-forvis-gray-600">
            Section {activeTab + 1} of {sections.length}
          </div>

          {activeTab < sections.length - 1 ? (
            <button
              onClick={() => handleTabChange(Math.min(sections.length - 1, activeTab + 1))}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isReadOnly || overallCompletion < 100 || submitMutation.isPending || isSavingBeforeSubmit}
              className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
            >
              {isSavingBeforeSubmit ? 'Saving changes...' : submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="p-4 bg-forvis-success-50 border-2 border-forvis-success-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-forvis-success-600" />
            <div>
              <p className="text-sm font-semibold text-forvis-success-900">Questionnaire Submitted</p>
              <p className="text-xs text-forvis-success-700 mt-1">
                Submitted on {new Date(response.completedAt).toLocaleString()} by {response.completedBy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}

