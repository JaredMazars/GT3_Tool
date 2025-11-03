'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const handleSignIn = () => {
    window.location.href = `/api/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forvis-blue-50 to-forvis-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 card shadow-corporate-lg">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image 
              src="/Mazars-logo-intranet.jpg" 
              alt="Forvis Mazars" 
              width={200} 
              height={60}
              className="h-14 w-auto"
            />
          </div>
          <div className="text-sm text-forvis-gray-700 mb-6 font-medium">Tax Department</div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-forvis-gray-700">
            Sign in to access your tax applications
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              An error occurred during sign in. Please try again.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl"
            style={{ backgroundColor: '#25488A' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="currentColor">
              <path d="M0 0h10v10H0V0zm11 0h10v10H11V0zM0 11h10v10H0V11zm11 0h10v10H11V11z" />
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-forvis-gray-600">
          <p>Secure authentication powered by Azure AD</p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forvis-blue-50 to-forvis-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forvis-blue-500"></div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}

