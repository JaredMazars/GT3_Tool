'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="py-6">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-900">Mapper</div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm"
            >
              Go to Dashboard
              <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="py-20">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Simplify your</span>
            <span className="block text-blue-600">Tax Mapping</span>
          </h1>
          <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl">
            Automate your financial statement mapping process with our intelligent mapping tool.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-lg"
            >
              Get Started
              <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
