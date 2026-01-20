/**
 * About Page
 * Dedicated page showcasing GT3 platform features and architecture
 */

'use client';

import Image from 'next/image';
import { 
  Clock, 
  Eye, 
  Settings, 
  CheckCircle, 
  BarChart3,
  Workflow,
  FileText,
  FolderOpen,
  Calendar,
  Sparkles,
  FileSearch,
  PenTool,
  AlertTriangle
} from 'lucide-react';

export default function AboutPage() {
  const benefits = [
    {
      icon: Clock,
      title: 'Spend More Time on Real Work',
      description: 'Everything for a client or engagement lives in one place, with clear status, deadlines, and responsibilities.'
    },
    {
      icon: Eye,
      title: 'Clear Oversight, Less Risk',
      description: 'Real-time visibility of engagement progress, risk ratings, deadlines. Fewer surprises, better quality control.'
    },
    {
      icon: Settings,
      title: 'Built for How You Work',
      description: 'Service line-specific views (Tax, Audit, Accounting, Advisory) – see only what\'s relevant to you.'
    },
    {
      icon: CheckCircle,
      title: 'Faster Client Onboarding',
      description: 'Streamlined acceptance process gets clients approved and engagements started without delays.'
    }
  ];

  const bottomBenefits = [
    {
      icon: FileText,
      title: 'Consistent Documentation',
      description: 'Standardized templates and automated workflows ensure quality and compliance.'
    },
    {
      icon: BarChart3,
      title: 'Better Business Insights',
      description: 'Real-time analytics and reporting help you make informed decisions.'
    },
    {
      icon: Calendar,
      title: 'Optimized Resource Planning',
      description: 'Visual scheduling and capacity management for effective allocation.'
    }
  ];

  const features = [
    {
      icon: CheckCircle,
      title: 'Client Acceptance',
      description: 'Smart questionnaires with automated risk scoring and full audit trail.'
    },
    {
      icon: BarChart3,
      title: 'Business Development',
      description: 'Track leads and convert opportunities into live clients and engagements.'
    },
    {
      icon: Workflow,
      title: 'Engagement Management',
      description: 'Complete lifecycle management with real-time status tracking.'
    },
    {
      icon: FileText,
      title: 'Template Management',
      description: 'Version control, placeholders, and consistent formatting.'
    }
  ];

  const bottomFeatures = [
    {
      icon: CheckCircle,
      title: 'Approval Workflows',
      description: 'Centralized approvals for letters, requests, and reviews.'
    },
    {
      icon: FolderOpen,
      title: 'Document Vault',
      description: 'Secure storage with compliance checklists and filing statuses.'
    },
    {
      icon: Calendar,
      title: 'Team Planning',
      description: 'Visual planner with Gantt timelines and resource allocation.'
    }
  ];

  const aiCapabilities = [
    {
      icon: FileSearch,
      title: 'Document Extraction',
      description: 'Auto-extract from PDFs and Excel'
    },
    {
      icon: PenTool,
      title: 'Content Drafting',
      description: 'AI-powered first drafts'
    },
    {
      icon: AlertTriangle,
      title: 'Risk Analysis',
      description: 'Identify issues with confidence scores'
    },
    {
      icon: BarChart3,
      title: 'Data Insights',
      description: 'Flag unusual movements early'
    }
  ];

  return (
    <div className="flex items-center justify-center min-h-screen -mt-6 -mb-6 bg-forvis-gray-50 overflow-auto">
      <div 
        className="relative bg-forvis-gray-50"
        style={{ width: '1600px', height: '900px' }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 flex items-start justify-center pt-24 pointer-events-none">
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: '950px',
            height: '550px',
            maskImage: 'radial-gradient(ellipse 95% 95% at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0) 100%)'
          }}
        >
          <Image
            src="/GT3%20overview.jpeg"
            alt="GT3 System Architecture - Forvis Mazars platform integrated with Sage 300 and Greatsoft"
            fill
            style={{ objectFit: 'contain' }}
            priority
            unoptimized
            className="rounded-2xl"
          />
        </div>
      </div>

        {/* Content */}
        <div className="relative h-full px-6 pb-6 flex flex-col">
          {/* Title */}
          <div className="text-center mt-10 -mb-6">
            <div 
              className="inline-block px-4 py-1.5 rounded-lg shadow-corporate"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
            >
              <h1 className="text-2xl font-bold text-white mb-0">
                A Smarter way to run our practice
              </h1>
              <p className="text-sm text-white/90">
                One platform. One workflow. Less admin. Better outcomes.
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 grid gap-3 grid-cols-[0.9fr_2.2fr_0.9fr] ">
            {/* Left Column - What This Means for You */}
            <div className="flex flex-col space-y-2.5 pt-[4rem]">
              <div 
                className="inline-block px-4 py-1.5 rounded-lg shadow-corporate mx-auto mb-1"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
              >
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-center mb-0">
                  What This Means for You
                </h2>
              </div>
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-lg p-1.5 border-2 shadow-corporate flex flex-col justify-center h-[110px] transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)', borderColor: '#C9BCAA' }}
                >
                  <div className="flex items-center justify-center mb-0.5">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 text-center mb-0.5">
                    {benefit.title}
                  </h3>
                  <p className="text-xs text-forvis-gray-700 leading-tight text-center">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Center Column - Empty for diagram */}
          <div className="flex items-center justify-center">
            {/* Center space for diagram to show through */}
          </div>

            {/* Right Column - Core Features */}
            <div className="flex flex-col space-y-2.5 pt-[4rem]">
              <div 
                className="inline-block px-4 py-1.5 rounded-lg shadow-corporate mx-auto mb-1"
                style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
              >
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-center mb-0">
                  Core Features
                </h2>
              </div>
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-lg p-1.5 border-2 shadow-corporate flex flex-col justify-center h-[110px] transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)', borderColor: '#C9BCAA' }}
                >
                  <div className="flex items-center justify-center mb-0.5">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 text-center mb-0.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-forvis-gray-700 leading-tight text-center">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

          {/* Bottom Cards Row */}
          <div className="grid grid-cols-6 gap-2 mb-3 pt-3">
            {[...bottomBenefits, ...bottomFeatures].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-lg p-1.5 border-2 shadow-corporate flex flex-col justify-center h-[110px] transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)', borderColor: '#C9BCAA' }}
                >
                  <div className="flex items-center justify-center mb-0.5">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 text-center mb-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-forvis-gray-700 leading-tight text-center">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* AI Section */}
          <div className="rounded-lg pt-0 pb-3 mb-6">
            <div 
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg shadow-corporate mb-3"
              style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-white" />
                <h2 className="text-sm font-semibold text-white mb-0">
                  AI That Actually Helps
                </h2>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs text-white/90">
                You stay in control – AI simply removes the heavy lifting
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
            {aiCapabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <div
                  key={capability.title}
                  className="rounded-lg p-1.5 border-2 shadow-corporate flex flex-col items-center justify-center group h-[110px] transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)', borderColor: '#C9BCAA' }}
                >
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center mb-0.5 group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-forvis-gray-900 text-center mb-0.5">
                    {capability.title}
                  </h3>
                  <p className="text-xs text-forvis-gray-700 leading-tight text-center">
                    {capability.description}
                  </p>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
