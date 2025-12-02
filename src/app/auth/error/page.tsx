'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access was denied. You may not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      default:
        return 'An unexpected error occurred during authentication.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forvis-blue-50 to-forvis-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 card shadow-corporate-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-forvis-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-forvis-gray-700">{getErrorMessage(error)}</p>
        </div>

        <div className="mt-8">
          <Link
            href="/auth/signin"
            className="btn-primary w-full justify-center py-3"
          >
            Try Again
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-4 p-4 bg-forvis-gray-100 rounded-lg text-xs text-forvis-gray-600 break-all">
            <strong>Error Code:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forvis-blue-50 to-forvis-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-500"></div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}



