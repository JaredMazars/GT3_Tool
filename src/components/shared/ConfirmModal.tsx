'use client';

import { Fragment } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      confirmRing: 'focus:ring-red-500',
      messageBg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
      messageBorder: '#EF4444',
      messageTextPrimary: 'text-red-900',
      messageTextSecondary: 'text-red-800',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
      confirmRing: 'focus:ring-yellow-500',
      messageBg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
      messageBorder: '#F59E0B',
      messageTextPrimary: 'text-yellow-900',
      messageTextSecondary: 'text-yellow-800',
    },
    info: {
      icon: Info,
      iconBg: 'bg-forvis-blue-100',
      iconColor: 'text-forvis-blue-600',
      confirmBg: 'bg-forvis-blue-600 hover:bg-forvis-blue-700',
      confirmRing: 'focus:ring-forvis-blue-500',
      messageBg: 'linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)',
      messageBorder: '#2E5AAC',
      messageTextPrimary: 'text-forvis-blue-900',
      messageTextSecondary: 'text-forvis-blue-800',
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-corporate-lg max-w-lg w-full">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-lg"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-white hover:text-forvis-gray-200 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Message */}
          <div
            className="rounded-lg p-4 border-2"
            style={{ background: styles.messageBg, borderColor: styles.messageBorder }}
          >
            <p className={`text-sm font-semibold ${styles.messageTextPrimary}`}>
              {message}
            </p>
            {variant === 'danger' && (
              <p className={`text-sm ${styles.messageTextSecondary} mt-1`}>
                This action cannot be undone.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 bg-forvis-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-forvis-gray-700 bg-white border border-forvis-gray-300 hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${styles.confirmBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmRing} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

