'use client';

import Link from 'next/link';
import { ArrowRightIcon, DocumentCheckIcon, ChartBarIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function LandingPage() {
  const features = [
    {
      icon: DocumentCheckIcon,
      title: 'Automated Mapping',
      description: 'Intelligent trial balance mapping to SARS IT14 categories with AI-powered suggestions.',
    },
    {
      icon: SparklesIcon,
      title: 'AI Tax Adjustments',
      description: 'Upload supporting documents and let AI extract and suggest relevant tax adjustments.',
    },
    {
      icon: ChartBarIcon,
      title: 'Professional Reports',
      description: 'Generate complete IT14 tax computations with detailed breakdowns and export options.',
    },
    {
      icon: ClockIcon,
      title: 'Save Time',
      description: 'Reduce tax computation preparation time from hours to minutes with automation.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Mapper</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
            >
              Go to Dashboard
              <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl tracking-tight">
              <span className="block">Professional Tax Mapping</span>
              <span className="block text-blue-600 mt-2">Made Simple</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
              Streamline your South African corporate tax computations with intelligent automation and AI-powered insights.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need for tax computations
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features to make tax preparation faster and more accurate
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 sm:py-20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                Ready to streamline your tax work?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Start using Mapper today and transform how you handle tax computations.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-base font-medium rounded-lg text-white bg-transparent hover:bg-white hover:text-blue-600 transition-all duration-200 shadow-lg"
              >
                Start Your First Project
                <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-bold text-white">Mapper</span>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Mapper. Professional tax mapping made simple.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
