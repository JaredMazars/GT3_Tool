import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon, DocumentCheckIcon, ChartBarIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getSession } from '@/lib/services/auth/auth';

export default async function LandingPage() {
  const session = await getSession();
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image 
                src="/Mazars-logo-intranet.jpg" 
                alt="Forvis Mazars" 
                width={180} 
                height={50}
                className="h-12 w-auto"
              />
              <span className="text-sm text-forvis-gray-600 border-l border-forvis-gray-300 pl-4">Tax Department</span>
            </div>
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg shadow transition-all duration-200"
                style={{ backgroundColor: '#25488A' }}
              >
                Go to Dashboard
                <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg shadow transition-all duration-200"
                style={{ backgroundColor: '#25488A' }}
              >
                Sign In
                <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
              </Link>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <div className="py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-forvis-gray-900 sm:text-5xl md:text-6xl tracking-tight">
              <span className="block">Professional Tax Solutions</span>
              <span className="block text-forvis-blue-600 mt-2">Powered by Intelligence</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-forvis-gray-800 leading-relaxed font-medium">
              Streamline your South African corporate tax computations with intelligent automation and AI-powered insights from Forvis Mazars.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              {session ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#25488A' }}
                >
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#25488A' }}
                >
                  Get Started
                  <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-forvis-gray-900 sm:text-4xl">
              Everything you need for tax computations
            </h2>
            <p className="mt-4 text-lg text-forvis-gray-800 font-medium">
              Powerful features to make tax preparation faster and more accurate
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card-hover p-6"
              >
                <div className="w-12 h-12 bg-forvis-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-forvis-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-forvis-gray-800 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 sm:py-20">
          <div className="rounded-2xl shadow-xl overflow-hidden" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
            <div className="px-6 py-12 sm:px-12 sm:py-16 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                Ready to streamline your tax work?
              </h2>
              <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                Start using our tax applications today and transform how you handle tax computations.
              </p>
              {session ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-8 py-4 border-2 border-white text-base font-semibold rounded-lg text-white bg-transparent hover:bg-white hover:text-gray-900 transition-all duration-200 shadow-lg"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center px-8 py-4 border-2 border-white text-base font-semibold rounded-lg text-white bg-transparent hover:bg-white hover:text-gray-900 transition-all duration-200 shadow-lg"
                >
                  Sign In to Get Started
                  <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-forvis-gray-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image 
                src="/Mazars-logo-intranet.jpg" 
                alt="Forvis Mazars" 
                width={150} 
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
              <span className="text-sm text-forvis-gray-400 border-l border-forvis-gray-700 pl-4">Tax Department</span>
            </div>
            <p className="text-forvis-gray-400 text-sm">
              © {new Date().getFullYear()} Forvis Mazars. Professional tax solutions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
