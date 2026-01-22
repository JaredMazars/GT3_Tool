'use client';

import { CheckCircle, Clock } from 'lucide-react';

interface ProcessingStage {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'complete';
}

interface ProcessingModalProps {
  isOpen: boolean;
  stages?: ProcessingStage[];
  title?: string;
  message?: string;
}

export function ProcessingModal({ isOpen, stages, title, message }: ProcessingModalProps) {
  if (!isOpen) return null;

  // Simple mode when no stages provided
  if (!stages || stages.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
          
          {/* Modal Content */}
          <div className="relative transform overflow-hidden rounded-2xl bg-white shadow-corporate-lg transition-all w-full max-w-md">
            <div className="bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-600 px-6 py-4">
              <h3 className="text-xl font-semibold text-white">
                {title || 'Processing'}
              </h3>
            </div>

            <div className="px-6 py-8">
              <div className="flex flex-col items-center">
                <svg 
                  className="animate-spin h-12 w-12 text-forvis-blue-600 mb-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="3"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-center text-forvis-gray-700">
                  {message || 'Please wait while we process your request...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStage = stages.find(stage => stage.status === 'in-progress');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        
        {/* Modal Content */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white shadow-corporate-lg transition-all w-full max-w-2xl">
          <div className="bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-600 px-6 py-4">
            <h3 className="text-xl font-semibold text-white">
              Processing Trial Balance
            </h3>
            {currentStage && (
              <p className="mt-1 text-sm text-white opacity-90">
                {currentStage.description}
              </p>
            )}
          </div>

          <div className="px-6 py-8">
            <div className="space-y-6">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-start gap-4">
                  {/* Progress Indicator */}
                  <div className="flex flex-col items-center">
                    {/* Wheel/Icon */}
                    <div className={`
                      relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                      ${stage.status === 'complete' 
                        ? 'bg-green-100 border-green-500' 
                        : stage.status === 'in-progress'
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-gray-100 border-gray-300'
                      }
                    `}>
                      {stage.status === 'complete' ? (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      ) : stage.status === 'in-progress' ? (
                        <div className="relative">
                          {/* Spinning wheel */}
                          <svg 
                            className="animate-spin h-7 w-7 text-blue-600" 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24"
                          >
                            <circle 
                              className="opacity-25" 
                              cx="12" 
                              cy="12" 
                              r="10" 
                              stroke="currentColor" 
                              strokeWidth="3"
                            />
                            <path 
                              className="opacity-75" 
                              fill="currentColor" 
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <Clock className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Connector Line */}
                    {index < stages.length - 1 && (
                      <div className={`
                        w-0.5 h-12 mt-2 transition-all duration-500
                        ${stage.status === 'complete' 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                        }
                      `} />
                    )}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1 pt-2">
                    <h4 className={`
                      text-base font-semibold transition-colors duration-300
                      ${stage.status === 'complete' 
                        ? 'text-green-700' 
                        : stage.status === 'in-progress'
                        ? 'text-blue-700'
                        : 'text-gray-500'
                      }
                    `}>
                      {stage.title}
                    </h4>
                    <p className={`
                      mt-1 text-sm transition-colors duration-300
                      ${stage.status === 'complete' 
                        ? 'text-green-600' 
                        : stage.status === 'in-progress'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                      }
                    `}>
                      {stage.description}
                    </p>
                    
                    {/* Status Badge */}
                    <div className="mt-2">
                      {stage.status === 'complete' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Complete
                        </span>
                      )}
                      {stage.status === 'in-progress' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <span className="animate-pulse mr-1">●</span> In Progress
                        </span>
                      )}
                      {stage.status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-8 pt-6 border-t border-forvis-gray-200">
              <div className="flex justify-between text-sm text-forvis-gray-600 mb-2">
                <span>Overall Progress</span>
                <span className="font-medium">
                  {stages.filter(s => s.status === 'complete').length} of {stages.length} steps complete
                </span>
              </div>
              <div className="w-full bg-forvis-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(stages.filter(s => s.status === 'complete').length / stages.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

