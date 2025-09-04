'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import BalanceSheetPage from './balance-sheet/page';
import IncomeStatementPage from './income-statement/page';
import MappingPage from './mapping/page';
import TaxCalculationPage from './tax-calculation/page';

interface TabProps {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

function Tab({ selected, children, onClick, className = '' }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        selected
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('mapping');


  const renderContent = () => {
    switch (activeTab) {
      case 'mapping':
        return <MappingPage params={params} />;
      case 'balance-sheet':
        return <BalanceSheetPage params={params} />;
      case 'income-statement':
        return <IncomeStatementPage params={params} />;
      case 'tax-calculation':
        return <TaxCalculationPage params={params} />;
      case 'settings':
        return <div>Settings content</div>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <Tab
              onClick={() => setActiveTab('mapping')}
              selected={activeTab === 'mapping'}
            >
              Mapping
            </Tab>
            <Tab
              onClick={() => setActiveTab('balance-sheet')}
              selected={activeTab === 'balance-sheet'}
            >
              Balance Sheet
            </Tab>
            <Tab
              onClick={() => setActiveTab('income-statement')}
              selected={activeTab === 'income-statement'}
            >
              Income Statement
            </Tab>
            <Tab
              onClick={() => setActiveTab('tax-calculation')}
              selected={activeTab === 'tax-calculation'}
            >
              Tax Calculation
            </Tab>
            <Tab
              onClick={() => setActiveTab('settings')}
              selected={activeTab === 'settings'}
            >
              Settings
            </Tab>
          </nav>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
} 