'use client';

import { useState, useEffect, useCallback } from 'react';
import { AcceptanceQuestionDef } from '@/constants/acceptance-questions';

interface QuestionFieldProps {
  question: AcceptanceQuestionDef;
  value: string;
  comment?: string;
  onChange: (answer: string, comment?: string) => void;
  disabled?: boolean;
}

export function QuestionField({ question, value, comment, onChange, disabled }: QuestionFieldProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [localComment, setLocalComment] = useState(comment || '');

  // Update local state when prop changes
  useEffect(() => {
    setLocalValue(value || '');
    setLocalComment(comment || '');
  }, [value, comment]);

  const handleValueChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      onChange(newValue, localComment);
    },
    [localComment, onChange]
  );

  const handleCommentChange = useCallback(
    (newComment: string) => {
      setLocalComment(newComment);
      onChange(localValue, newComment);
    },
    [localValue, onChange]
  );

  if (question.fieldType === 'PLACEHOLDER') {
    return (
      <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)', borderLeft: '4px solid #2E5AAC' }}>
        <p className="text-xs font-semibold" style={{ color: '#1C3667' }}>
          {question.questionText}
        </p>
      </div>
    );
  }

  if (question.fieldType === 'BUTTON') {
    return null; // Buttons handled separately
  }

  return (
    <div className="space-y-2">
      {/* Question Text */}
      <div className="flex items-start gap-2">
        <label className="block text-sm font-semibold text-forvis-gray-900 flex-1">
          {question.questionText}
          {question.required && <span className="text-forvis-error-600 ml-1">*</span>}
        </label>
      </div>

      {/* Description */}
      {question.description && (
        <div
          className="text-xs text-forvis-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: question.description }}
        />
      )}

      {/* Field Input */}
      {question.fieldType === 'RADIO' && question.options && (
        <div className="flex items-start gap-4 mt-2">
          <div className="flex gap-3">
            {question.options.map((option) => (
              <label
                key={option}
                className={`
                  inline-flex items-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-all
                  ${localValue === option
                    ? 'border-forvis-blue-500 bg-forvis-blue-50 text-forvis-blue-700 font-semibold'
                    : 'border-forvis-gray-300 bg-white text-forvis-gray-700 hover:border-forvis-blue-300'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="radio"
                  name={question.questionKey}
                  value={option}
                  checked={localValue === option}
                  onChange={(e) => handleValueChange(e.target.value)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
          
          {/* Inline Comment Field */}
          {question.allowComment && (
            <div className="flex-1">
              <textarea
                value={localComment}
                onChange={(e) => handleCommentChange(e.target.value)}
                disabled={disabled}
                rows={2}
                className="block w-full px-3 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 placeholder:text-forvis-gray-400 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors disabled:opacity-50 resize-y"
                placeholder="Comments / Safeguards (optional)"
              />
            </div>
          )}
        </div>
      )}

      {question.fieldType === 'TEXTAREA' && (
        <textarea
          value={localValue}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled}
          rows={4}
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 placeholder:text-forvis-gray-400 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          placeholder="Enter your response..."
        />
      )}

      {question.fieldType === 'SELECT' && question.options && (
        <select
          value={localValue}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled}
          className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-900 focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-forvis-blue-500 transition-colors disabled:opacity-50"
        >
          <option value="">Select an option...</option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}





















