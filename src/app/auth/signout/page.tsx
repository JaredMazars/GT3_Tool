'use client';

import Image from 'next/image';

export default function SignOut() {
  const handleSignOut = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forvis-blue-50 to-forvis-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 card shadow-corporate-lg">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image 
              src="/Mazars-logo-intranet.jpg" 
              alt="Forvis Mazars" 
              width={180} 
              height={50}
              className="h-12 w-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-forvis-gray-900">Sign Out</h2>
          <p className="mt-2 text-sm text-forvis-gray-700">
            Are you sure you want to sign out?
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-corporate hover:shadow-corporate-md"
          >
            Sign Out
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full flex justify-center py-3 px-4 border border-forvis-gray-300 text-base font-medium rounded-lg text-forvis-gray-700 bg-white hover:bg-forvis-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forvis-blue-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
