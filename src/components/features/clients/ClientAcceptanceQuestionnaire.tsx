/**
 * Client Acceptance Questionnaire Component
 * Simplified questionnaire for client-level risk assessment
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import { Button, Banner, LoadingOverlay, Badge } from '@/components/ui';
import { QuestionField } from '@/components/features/tasks/acceptance/QuestionField';
import { CLIENT_ACCEPTANCE_QUESTIONNAIRE, type QuestionSection } from '@/constants/acceptance-questions';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { ApprovalActions } from '@/components/shared/ApprovalActions';
import { ClientRiskResearchStep } from './ClientRiskResearchStep';
import { ClientTeamSelectionStep, type TeamSelections } from './ClientTeamSelectionStep';
import type { CompanyResearchResult } from '@/lib/services/bd/companyResearchAgent';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface ClientAcceptanceQuestionnaireProps {
  GSClientID: string;
  clientName: string | null;
  onSubmitSuccess?: () => void;
  // Approval mode props
  approvalMode?: boolean;
  approvalId?: number;
  currentStepId?: number;
  onApprove?: (stepId: number, comment?: string) => Promise<void>;
  onReject?: (stepId: number, comment: string) => Promise<void>;
  isApprovalProcessing?: boolean;
  // Read-only mode prop
  readOnlyMode?: boolean;
}

interface AnswerState {
  [questionKey: string]: {
    answer: string;
    comment?: string;
  };
}

export function ClientAcceptanceQuestionnaire({
  GSClientID,
  clientName,
  onSubmitSuccess,
  approvalMode = false,
  approvalId,
  currentStepId,
  onApprove,
  onReject,
  isApprovalProcessing = false,
  readOnlyMode = false,
}: ClientAcceptanceQuestionnaireProps) {
  const [activeTab, setActiveTab] = useState(0); // 0 = team selection, 1 = research, 2+ = questionnaire sections
  const [answers, setAnswers] = useState<AnswerState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [researchData, setResearchData] = useState<CompanyResearchResult | null>(null);
  const [researchCompleted, setResearchCompleted] = useState(false);
  const [researchSkipped, setResearchSkipped] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { answer: string; comment?: string }>>(new Map());
  const batchSaveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Team selection state
  const [teamSelections, setTeamSelections] = useState<TeamSelections>({
    selectedPartnerCode: '',
    selectedManagerCode: '',
    selectedInchargeCode: '',
  });
  const [clientData, setClientData] = useState<any | null>(null);

  const sections: QuestionSection[] = CLIENT_ACCEPTANCE_QUESTIONNAIRE;
  const totalTabs = approvalMode 
    ? sections.length + 3  // +1 team, +1 research, +1 approval decision
    : sections.length + 2; // +1 team, +1 research

  // Load client data and existing answers
  useEffect(() => {
    const loadExistingData = async () => {
      setIsLoading(true);
      try {
        // Load client details
        const clientRes = await fetch(`/api/clients/${GSClientID}`);
        if (clientRes.ok) {
          const clientResult = await clientRes.json();
          setClientData(clientResult.data);
          
          // Initialize team selections with current values
          if (clientResult.data) {
            setTeamSelections({
              selectedPartnerCode: clientResult.data.clientPartner || '',
              selectedManagerCode: clientResult.data.clientManager || '',
              selectedInchargeCode: clientResult.data.clientIncharge || '',
            });
          }
        }

        // Load acceptance answers and research data
        const res = await fetch(`/api/clients/${GSClientID}/acceptance/answers`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            // Load answers
            const loadedAnswers: AnswerState = {};
            if (data.data.ClientAcceptanceAnswer) {
              data.data.ClientAcceptanceAnswer.forEach((answerData: any) => {
                if (answerData.AcceptanceQuestion?.questionKey) {
                  loadedAnswers[answerData.AcceptanceQuestion.questionKey] = {
                    answer: answerData.answer || '',
                    comment: answerData.comment || undefined,
                  };
                }
              });
              setAnswers(loadedAnswers);
            }

            // Load research data if exists
            if (data.data.researchData) {
              try {
                const research = JSON.parse(data.data.researchData);
                setResearchData(research);
              } catch (e) {
                console.error('Failed to parse research data:', e);
              }
            }

            // Load research completion flags
            setResearchCompleted(data.data.researchCompleted || false);
            setResearchSkipped(data.data.researchSkipped || false);

            // Load pending team selections if they exist
            if (data.data.pendingPartnerCode || data.data.pendingManagerCode || data.data.pendingInchargeCode) {
              setTeamSelections({
                selectedPartnerCode: data.data.pendingPartnerCode || '',
                selectedManagerCode: data.data.pendingManagerCode || '',
                selectedInchargeCode: data.data.pendingInchargeCode || '',
              });
            }

            // If research is completed or there are answers, start on first questionnaire tab
            if ((data.data.researchCompleted && Object.keys(loadedAnswers).length > 0) || 
                Object.keys(loadedAnswers).length > 0) {
              setActiveTab(2); // Start on first questionnaire section (tab 2, since 0=team, 1=research)
            }
          }
        }
      } catch (err) {
        // If no acceptance exists yet, that's okay - start fresh
        console.error('Failed to load existing data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, [GSClientID]);

  const handleAnswerChange = (questionKey: string, answer: string, comment?: string) => {
    // Do nothing in read-only mode
    if (readOnlyMode) return;

    // Update UI immediately
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: { answer, comment },
    }));

    // Add to pending changes
    setPendingChanges((prev) => {
      const updated = new Map(prev);
      updated.set(questionKey, { answer, comment });
      return updated;
    });

    // Trigger batch save
    scheduleBatchSave();
  };

  const scheduleBatchSave = () => {
    // Clear existing timeout
    if (batchSaveTimeoutRef.current) {
      clearTimeout(batchSaveTimeoutRef.current);
    }

    // Schedule batch save after 4 seconds of inactivity
    batchSaveTimeoutRef.current = setTimeout(async () => {
      await executeBatchSave();
    }, 4000); // 4 seconds
  };

  const executeBatchSave = async () => {
    if (pendingChanges.size === 0) return;

    setSaveStatus('saving');
    setSaveError(null);
    
    try {
      // Convert Map to array
      const answersToSave = Array.from(pendingChanges.entries()).map(([questionKey, data]) => ({
        questionKey,
        answer: data.answer,
        comment: data.comment,
      }));

      const res = await fetch(`/api/clients/${GSClientID}/acceptance/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersToSave }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save answers');
      }

      // Clear pending changes on success
      setPendingChanges(new Map());
      
      setSaveStatus('saved');
      // Auto-hide saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const saveCurrentTeamSelections = async () => {
    // Only save if all three are selected
    if (!teamSelections.selectedPartnerCode || !teamSelections.selectedManagerCode || !teamSelections.selectedInchargeCode) {
      return;
    }
    
    try {
      await fetch(`/api/clients/${GSClientID}/acceptance/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCode: teamSelections.selectedPartnerCode,
          managerCode: teamSelections.selectedManagerCode,
          inchargeCode: teamSelections.selectedInchargeCode,
        }),
      });
    } catch (err) {
      console.error('Failed to save team selections:', err);
      // Don't show error to user - this is auto-save
    }
  };

  const handleTabChange = async (newTab: number) => {
    // Save team selections if leaving team selection tab (tab 0)
    if (activeTab === 0 && !readOnlyMode) {
      await saveCurrentTeamSelections();
    }
    
    // Save pending changes before switching tabs (not in read-only mode)
    if (!readOnlyMode && pendingChanges.size > 0) {
      // Cancel scheduled save
      if (batchSaveTimeoutRef.current) {
        clearTimeout(batchSaveTimeoutRef.current);
      }
      
      // Immediate save
      await executeBatchSave();
    }
    
    setActiveTab(newTab);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (batchSaveTimeoutRef.current) {
        clearTimeout(batchSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleTeamSelectionContinue = (selections: TeamSelections) => {
    setTeamSelections(selections);
    setActiveTab(1); // Move to research step
  };

  const getCompletionPercentage = () => {
    // Calculate completion with equal weight for all tabs (team selection + research + questionnaire sections)
    let completedTabs = 0;

    // Team selection tab (tab 0)
    if (teamSelections.selectedPartnerCode && teamSelections.selectedManagerCode && teamSelections.selectedInchargeCode) {
      completedTabs++;
    }

    // Research tab (tab 1)
    if (researchCompleted || researchSkipped || researchData) {
      completedTabs++;
    }

    // Questionnaire sections (tabs 2+)
    sections.forEach((section) => {
      const sectionQuestions = section.questions.filter((q) => q.required);
      const sectionAnswered = sectionQuestions.filter((q) => answers[q.questionKey]?.answer).length;
      
      // Section is complete if all required questions are answered
      if (sectionQuestions.length > 0 && sectionAnswered === sectionQuestions.length) {
        completedTabs++;
      }
    });

    return Math.round((completedTabs / totalTabs) * 100);
  };

  const canSubmit = () => {
    const allQuestions = sections.flatMap((s) => s.questions);
    const requiredQuestions = allQuestions.filter((q) => q.required);
    return requiredQuestions.every((q) => answers[q.questionKey]?.answer);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Save any pending changes first
      if (pendingChanges.size > 0) {
        if (batchSaveTimeoutRef.current) {
          clearTimeout(batchSaveTimeoutRef.current);
        }
        await executeBatchSave();
      }

      const response = await fetch(`/api/clients/${GSClientID}/acceptance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          selectedPartnerCode: teamSelections.selectedPartnerCode,
          selectedManagerCode: teamSelections.selectedManagerCode,
          selectedInchargeCode: teamSelections.selectedInchargeCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit client acceptance');
      }

      onSubmitSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const handleResearchComplete = (research?: CompanyResearchResult) => {
    if (research) {
      setResearchData(research);
      setResearchCompleted(true);
      setResearchSkipped(false);
    }
    // Don't auto-navigate, let user click tabs
  };

  const handleSkipResearch = async () => {
    try {
      // Call API to mark research as skipped
      await fetch(`/api/clients/${GSClientID}/acceptance/research/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      setResearchCompleted(true);
      setResearchSkipped(true);
    } catch (err) {
      console.error('Failed to skip research:', err);
    }
  };

  const completionPercentage = getCompletionPercentage();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-600"></div>
          <span className="ml-3 text-sm text-forvis-gray-600">Loading questionnaire...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Status Indicators - Only show errors */}
      {saveStatus === 'error' && (
        <Banner 
          variant="error" 
          message={saveError || 'Failed to save responses'} 
          dismissible 
          onDismiss={() => setSaveStatus('idle')} 
        />
      )}

      {/* Progress Header */}
      <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-forvis-gray-900">
            Client Risk Assessment for {clientName || GSClientID}
          </h3>
          <div className="flex items-center space-x-2">
            {completionPercentage === 100 ? (
              <CheckCircle className="h-5 w-5 text-forvis-success-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-forvis-warning-600" />
            )}
            <span className="text-sm font-semibold text-forvis-gray-700">
              {completionPercentage}% Complete
            </span>
          </div>
        </div>
        <div className="w-full bg-forvis-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${completionPercentage}%`,
              background: GRADIENTS.primary.horizontal,
            }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden relative">
        {/* Loading Overlay During Submission */}
        {isSubmitting && (
          <LoadingOverlay
            spinnerSize="lg"
            message="Submitting client acceptance for approval..."
          />
        )}
        
        <div className="border-b border-forvis-gray-200">
          <div className="flex overflow-x-auto">
            {/* Team Selection Tab */}
            <button
              onClick={() => handleTabChange(0)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 0
                  ? 'border-b-2 border-forvis-blue-500 text-forvis-blue-600'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900'
              }`}
            >
              Team Selection
              {(teamSelections.selectedPartnerCode && teamSelections.selectedManagerCode && teamSelections.selectedInchargeCode) && (
                <CheckCircle className="h-4 w-4 text-forvis-success-600" />
              )}
            </button>

            {/* Research Tab */}
            <button
              onClick={() => handleTabChange(1)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 1
                  ? 'border-b-2 border-forvis-blue-500 text-forvis-blue-600'
                  : 'text-forvis-gray-600 hover:text-forvis-gray-900'
              }`}
            >
              Research
              {(researchCompleted || researchSkipped || researchData) && (
                <CheckCircle className="h-4 w-4 text-forvis-success-600" />
              )}
            </button>

            {/* Questionnaire Section Tabs */}
            {sections.map((section, index) => {
              const sectionQuestions = section.questions.filter((q) => q.required);
              const sectionAnswered = sectionQuestions.filter((q) => answers[q.questionKey]?.answer).length;
              const isComplete = sectionQuestions.length > 0 && sectionAnswered === sectionQuestions.length;
              
              return (
                <button
                  key={section.key}
                  onClick={() => handleTabChange(index + 2)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeTab === index + 2
                      ? 'border-b-2 border-forvis-blue-500 text-forvis-blue-600'
                      : 'text-forvis-gray-600 hover:text-forvis-gray-900'
                  }`}
                >
                  {section.title}
                  {isComplete && (
                    <CheckCircle className="h-4 w-4 text-forvis-success-600" />
                  )}
                </button>
              );
            })}

            {/* Approval Decision Tab (only in approval mode) */}
            {approvalMode && (
              <button
                onClick={() => handleTabChange(totalTabs - 1)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === totalTabs - 1
                    ? 'border-b-2 border-forvis-blue-500 text-forvis-blue-600'
                    : 'text-forvis-gray-600 hover:text-forvis-gray-900'
                }`}
              >
                Approval Decision
                <AlertCircle className="h-4 w-4 text-forvis-warning-600" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Team Selection Tab Content */}
          {activeTab === 0 && (
            <ClientTeamSelectionStep
              GSClientID={GSClientID}
              clientData={clientData}
              onContinue={handleTeamSelectionContinue}
              isLoading={isLoading}
              readOnly={readOnlyMode}
              initialPartnerCode={teamSelections.selectedPartnerCode}
              initialManagerCode={teamSelections.selectedManagerCode}
              initialInchargeCode={teamSelections.selectedInchargeCode}
            />
          )}

          {/* Research Tab Content */}
          {activeTab === 1 && (
            <ClientRiskResearchStep
              GSClientID={GSClientID}
              clientName={clientName}
              existingResearch={researchData}
              researchSkipped={researchSkipped}
              onComplete={handleResearchComplete}
              onSkip={handleSkipResearch}
              readOnly={readOnlyMode}
            />
          )}

          {/* Questionnaire Section Content */}
          {activeTab > 1 && activeTab < totalTabs - (approvalMode ? 1 : 0) && (() => {
            const currentSection = sections[activeTab - 2];
            if (!currentSection) return null;
            
            return (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-forvis-gray-900 mb-2">
                    {currentSection.title}
                  </h3>
                  {currentSection.description && (
                    <p className="text-sm text-forvis-gray-600">
                      {currentSection.description}
                    </p>
                  )}
                </div>

                {currentSection.questions.map((question) => (
                  <QuestionField
                    key={question.questionKey}
                    question={question}
                    value={answers[question.questionKey]?.answer || ''}
                    comment={answers[question.questionKey]?.comment || ''}
                    onChange={(answer, comment) =>
                      handleAnswerChange(question.questionKey, answer, comment)
                    }
                    disabled={readOnlyMode}
                  />
                ))}
              </div>
            );
          })()}

          {/* Approval Decision Tab Content */}
          {approvalMode && activeTab === totalTabs - 1 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-forvis-gray-900 mb-2">
                  Approval Decision
                </h3>
                <p className="text-sm text-forvis-gray-600">
                  Review the client acceptance assessment and provide your approval decision.
                </p>
              </div>

              {/* Assessment Summary Card */}
              <div
                className="rounded-lg border-2 border-forvis-blue-100 p-6"
                style={{ background: GRADIENTS.dashboard.card }}
              >
                <h4 className="text-lg font-semibold text-forvis-blue-900 mb-4">
                  Assessment Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-forvis-gray-600 mb-1">Completion Rate</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-forvis-blue-600">{completionPercentage}%</p>
                      {completionPercentage === 100 ? (
                        <CheckCircle className="h-5 w-5 text-forvis-success-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-forvis-warning-600" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forvis-gray-600 mb-1">Risk Rating</p>
                    <div className="mt-1">
                      {(() => {
                        // Get risk rating from current answers
                        const allQuestions = sections.flatMap((s) => s.questions);
                        let totalRisk = 0;
                        let maxPossibleRisk = 0;

                        for (const question of allQuestions) {
                          const answer = answers[question.questionKey]?.answer;
                          if (!answer || question.riskWeight === 0) continue;

                          maxPossibleRisk += question.riskWeight * 10;

                          if (
                            question.highRiskAnswers &&
                            question.highRiskAnswers.includes(answer)
                          ) {
                            totalRisk += question.riskWeight * 10;
                          }
                        }

                        const score = maxPossibleRisk > 0 ? (totalRisk / maxPossibleRisk) * 100 : 0;
                        const rating = score < 30 ? 'LOW' : score < 60 ? 'MEDIUM' : 'HIGH';
                        const colors = {
                          LOW: 'bg-forvis-success-100 text-forvis-success-800 border-forvis-success-300',
                          MEDIUM: 'bg-forvis-warning-100 text-forvis-warning-800 border-forvis-warning-300',
                          HIGH: 'bg-forvis-error-100 text-forvis-error-800 border-forvis-error-300',
                        };

                        return (
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold ${colors[rating]}`}>
                              {rating}
                            </div>
                            <span className="text-sm text-forvis-gray-600">
                              ({score.toFixed(0)}%)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Actions */}
              {currentStepId && onApprove && onReject && (
                <ApprovalActions
                  onApprove={async (comment) => {
                    await onApprove(currentStepId, comment);
                  }}
                  onReject={async (comment) => {
                    await onReject(currentStepId, comment);
                  }}
                  isProcessing={isApprovalProcessing}
                  approveText="Approve Assessment"
                  rejectText="Reject Assessment"
                />
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {!readOnlyMode && (
          <div className="border-t border-forvis-gray-200 px-6 py-4 bg-forvis-gray-50">
            <div className="flex justify-between items-center">
              <div>
                {activeTab > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => handleTabChange(activeTab - 1)}
                    disabled={isSubmitting || isApprovalProcessing}
                  >
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {activeTab < totalTabs - 1 ? (
                  <Button
                    variant="primary"
                    onClick={() => handleTabChange(activeTab + 1)}
                    disabled={isSubmitting || isApprovalProcessing}
                  >
                    {/* Show "Proceed to Approval" on last questionnaire section in approval mode */}
                    {approvalMode && activeTab === totalTabs - 2 ? 'Proceed to Approval' : 'Next'}
                  </Button>
                ) : !approvalMode ? (
                  <Button
                    variant="gradient"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!canSubmit() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Approval
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Read-Only Mode Navigation */}
        {readOnlyMode && (
          <div className="border-t border-forvis-gray-200 px-6 py-4 bg-forvis-gray-50">
            <div className="flex justify-between items-center">
              <div>
                {activeTab > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => handleTabChange(activeTab - 1)}
                  >
                    Previous
                  </Button>
                )}
              </div>
              <div>
                {activeTab < totalTabs - 1 && (
                  <Button
                    variant="primary"
                    onClick={() => handleTabChange(activeTab + 1)}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-forvis-error-50 border-2 border-forvis-error-200 rounded-lg p-4">
          <p className="text-sm text-forvis-error-700">{error}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Submit Client Acceptance?"
        message="Are you sure you want to submit this client acceptance assessment for Partner approval? Once submitted, you cannot make further changes."
        confirmText="Submit for Approval"
        variant="info"
        onConfirm={handleSubmit}
        onClose={() => setShowConfirmModal(false)}
        isLoading={isSubmitting}
      />
    </div>
  );
}
