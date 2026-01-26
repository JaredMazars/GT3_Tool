'use client';

import { 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { useQuestionnaire } from '@/hooks/acceptance/useAcceptanceQuestionnaire';
import { QuestionSection } from '@/constants/acceptance-questions';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface AcceptanceReviewProps {
  taskId: string;
  onApprove: () => void;
  canApprove: boolean;
  isApproving?: boolean;
  hideReviewedMessage?: boolean;
}

interface AnswerData {
  answer: string | null;
  comment: string | null;
  AcceptanceQuestion: {
    questionKey: string;
  };
}

export function AcceptanceReview({ taskId, onApprove, canApprove, isApproving = false, hideReviewedMessage = false }: AcceptanceReviewProps) {
  const { data: questionnaireData, isLoading, refetch } = useQuestionnaire(taskId);

  const sections: QuestionSection[] = questionnaireData?.data?.structure || [];
  const response = questionnaireData?.data?.response;
  const existingAnswers = questionnaireData?.data?.answers || [];
  const riskAssessment = questionnaireData?.data?.riskAssessment;
  interface DocumentData {
    id: number;
    fileName: string;
    documentType: string;
    uploadedAt: string | Date;
  }
  const documents: DocumentData[] = questionnaireData?.data?.documents || [];

  // Create answer lookup
  const answerMap = new Map<string, AnswerData>(
    existingAnswers.map((ans: AnswerData) => [ans.AcceptanceQuestion.questionKey, ans])
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forvis-blue-500"></div>
      </div>
    );
  }

  if (!response?.completedAt) {
    return (
      <div className="p-6 bg-forvis-warning-50 border-2 border-forvis-warning-200 rounded-lg">
        <p className="text-sm text-forvis-warning-800">Questionnaire has not been submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="p-6 rounded-lg shadow-corporate text-white"
        style={{ background: GRADIENTS.primary.diagonal }}
      >
        <h2 className="text-2xl font-bold mb-2">Review Questionnaire</h2>
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-90">
            <p>Submitted: {new Date(response.completedAt).toLocaleString()}</p>
            <p>By: {response.completedBy}</p>
          </div>
          <div>
            <div className="text-3xl font-bold">{riskAssessment?.overallRiskScore || 0}%</div>
            <div className="text-xs opacity-90">Risk Score</div>
          </div>
        </div>
      </div>

      {/* Risk Assessment Summary */}
      {riskAssessment && (
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-4">Risk Assessment</h3>

          {/* Overall Risk */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-forvis-gray-700">Overall Risk Rating:</span>
            <span
              className={`px-4 py-2 rounded-lg text-sm font-bold ${
                riskAssessment.riskRating === 'LOW'
                  ? 'bg-forvis-success-100 text-forvis-success-800'
                  : riskAssessment.riskRating === 'MEDIUM'
                  ? 'bg-forvis-warning-100 text-forvis-warning-800'
                  : 'bg-forvis-error-100 text-forvis-error-800'
              }`}
            >
              {riskAssessment.riskRating}
            </span>
          </div>

          {/* Risk Summary */}
          <div
            className="p-4 rounded-lg text-xs whitespace-pre-line"
            style={{ background: GRADIENTS.dashboard.card }}
          >
            {riskAssessment.riskSummary}
          </div>

          {/* High Risk Questions */}
          {riskAssessment.highRiskQuestions && riskAssessment.highRiskQuestions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-forvis-error-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                High Risk Indicators ({riskAssessment.highRiskQuestions.length})
              </h4>
              <div className="space-y-2">
                {riskAssessment.highRiskQuestions.map((hrq: { questionText: string; answer: string; questionKey: string }, idx: number) => (
                  <div key={idx} className="p-3 bg-forvis-error-50 border border-forvis-error-200 rounded-lg">
                    <p className="text-xs font-medium text-forvis-error-900">{hrq.questionText}</p>
                    <p className="text-xs text-forvis-error-700 mt-1">Answer: {hrq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Answers by Section */}
      {sections.map((section, sectionIdx) => (
        <div key={section.key} className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
          <div
            className="px-4 py-3"
            style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
          >
            <h3 className="text-sm font-bold text-white">{section.title}</h3>
          </div>

          <div className="p-4 space-y-4">
            {section.questions.map((question) => {
              const answer = answerMap.get(question.questionKey);

              // Skip placeholders and buttons
              if (question.fieldType === 'PLACEHOLDER' || question.fieldType === 'BUTTON') {
                return null;
              }

              // Check conditional display
              if (question.conditionalDisplay) {
                const depAnswer = answerMap.get(question.conditionalDisplay.dependsOn);
                if (depAnswer?.answer !== question.conditionalDisplay.requiredAnswer) {
                  return null;
                }
              }

              // Check if high risk
              const isHighRisk = riskAssessment?.highRiskQuestions?.some(
                (hrq: { questionKey: string }) => hrq.questionKey === question.questionKey
              );

              return (
                <div
                  key={question.questionKey}
                  className={`p-3 rounded-lg border ${
                    isHighRisk ? 'border-red-300 bg-red-50' : 'border-forvis-gray-200 bg-forvis-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-forvis-gray-900">
                        {question.questionText}
                      </p>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-forvis-gray-600">Answer: </span>
                        <span
                          className={`text-xs font-bold ${
                            isHighRisk ? 'text-forvis-error-700' : 'text-forvis-blue-700'
                          }`}
                        >
                          {answer?.answer || 'Not answered'}
                        </span>
                      </div>
                      {answer?.comment && (
                        <div className="mt-2 p-2 bg-white rounded border border-forvis-gray-300">
                          <span className="text-xs font-medium text-forvis-gray-600">Comment: </span>
                          <p className="text-xs text-forvis-gray-800 mt-1">{answer.comment}</p>
                        </div>
                      )}
                    </div>
                    {isHighRisk && <AlertTriangle className="h-5 w-5 text-forvis-error-600 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Supporting Documents */}
      {documents.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate overflow-hidden">
          <div
            className="px-4 py-3"
            style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}
          >
            <h3 className="text-sm font-bold text-white">Supporting Documents</h3>
          </div>
          <div className="p-4 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-forvis-gray-50 border border-forvis-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-forvis-gray-900">{doc.fileName}</p>
                  <p className="text-xs text-forvis-gray-600">
                    {doc.documentType} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/api/tasks/${taskId}/acceptance/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve Button */}
      {canApprove && !response.reviewedAt && (
        <div className="bg-white rounded-lg border-2 border-forvis-gray-200 shadow-corporate p-6">
          <h3 className="text-lg font-semibold text-forvis-gray-900 mb-3">Approval Action</h3>
          <p className="text-sm text-forvis-gray-700 mb-4">
            After reviewing all answers and the risk assessment, you can approve this questionnaire to proceed with the engagement.
          </p>
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            {isApproving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Approve Client Acceptance
              </>
            )}
          </button>
        </div>
      )}

      {/* Already Reviewed */}
      {response.reviewedAt && !hideReviewedMessage && (
        <div className="p-4 bg-forvis-success-50 border-2 border-forvis-success-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-forvis-success-600" />
            <div>
              <p className="text-sm font-semibold text-forvis-success-900">Reviewed and Approved</p>
              <p className="text-xs text-forvis-success-700 mt-1">
                Reviewed on {new Date(response.reviewedAt).toLocaleString()} by {response.reviewedBy}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

