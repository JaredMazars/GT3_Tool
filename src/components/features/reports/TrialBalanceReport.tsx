'use client';

import { formatAmount } from '@/lib/utils/formatters';

interface TrialBalanceAccount {
  id: number;
  accountCode: string;
  accountName: string;
  balance: number;
  priorYearBalance: number;
  sarsItem: string;
  section: string;
  subsection: string;
}

interface TrialBalanceReportProps {
  accounts: TrialBalanceAccount[];
}

export default function TrialBalanceReport({ accounts }: TrialBalanceReportProps) {
  // Calculate totals
  const currentYearDebits = accounts
    .filter(acc => acc.balance > 0)
    .reduce((sum, acc) => sum + acc.balance, 0);
  
  const currentYearCredits = accounts
    .filter(acc => acc.balance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
  
  const priorYearDebits = accounts
    .filter(acc => acc.priorYearBalance > 0)
    .reduce((sum, acc) => sum + acc.priorYearBalance, 0);
  
  const priorYearCredits = accounts
    .filter(acc => acc.priorYearBalance < 0)
    .reduce((sum, acc) => sum + Math.abs(acc.priorYearBalance), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          className="rounded-lg p-4 shadow-corporate text-white"
          style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #25488A)' }}
        >
          <p className="text-sm font-semibold mb-1 opacity-90">Current Year Debits</p>
          <p className="text-2xl font-bold">{formatAmount(currentYearDebits)}</p>
        </div>
        <div 
          className="rounded-lg p-4 shadow-corporate text-white"
          style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
        >
          <p className="text-sm font-semibold mb-1 opacity-90">Current Year Credits</p>
          <p className="text-2xl font-bold">{formatAmount(currentYearCredits)}</p>
        </div>
        <div 
          className="rounded-lg p-4 shadow-corporate text-white"
          style={{ background: 'linear-gradient(to bottom right, #25488A, #1C3667)' }}
        >
          <p className="text-sm font-semibold mb-1 opacity-90">Prior Year Debits</p>
          <p className="text-2xl font-bold">{formatAmount(priorYearDebits)}</p>
        </div>
        <div 
          className="rounded-lg p-4 shadow-corporate text-white"
          style={{ background: 'linear-gradient(to bottom right, #1C3667, #132445)' }}
        >
          <p className="text-sm font-semibold mb-1 opacity-90">Prior Year Credits</p>
          <p className="text-2xl font-bold">{formatAmount(priorYearCredits)}</p>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="overflow-x-auto border-2 rounded-lg shadow-corporate" style={{ borderColor: '#25488A' }}>
        <table className="min-w-full divide-y divide-forvis-gray-200">
          <thead style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)' }}>
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Account Code
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                Account Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                SARS Item
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                Current Year Debit
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                Current Year Credit
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                Prior Year Debit
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                Prior Year Credit
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-forvis-gray-100">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-forvis-blue-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-forvis-gray-900">
                  {account.accountCode}
                </td>
                <td className="px-4 py-3 text-sm text-forvis-gray-900">
                  {account.accountName}
                </td>
                <td className="px-4 py-3 text-sm text-forvis-gray-700">
                  {account.sarsItem}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-forvis-gray-900 tabular-nums">
                  {account.balance > 0 ? formatAmount(account.balance) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-forvis-gray-900 tabular-nums">
                  {account.balance < 0 ? formatAmount(Math.abs(account.balance)) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-forvis-gray-600 tabular-nums">
                  {account.priorYearBalance > 0 ? formatAmount(account.priorYearBalance) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-forvis-gray-600 tabular-nums">
                  {account.priorYearBalance < 0 ? formatAmount(Math.abs(account.priorYearBalance)) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)', borderColor: '#1C3667' }}>
            <tr className="font-bold">
              <td colSpan={3} className="px-4 py-3 text-sm text-white">
                Totals
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white tabular-nums">
                {formatAmount(currentYearDebits)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white tabular-nums">
                {formatAmount(currentYearCredits)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white tabular-nums">
                {formatAmount(priorYearDebits)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white tabular-nums">
                {formatAmount(priorYearCredits)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Balance Check */}
      <div className={`rounded-lg p-4 border-2 shadow-corporate ${
        Math.abs(currentYearDebits - currentYearCredits) < 0.01
          ? 'bg-forvis-gray-50 border-forvis-gray-300'
          : ''
      }`}
      style={Math.abs(currentYearDebits - currentYearCredits) >= 0.01 ? { 
        background: 'linear-gradient(to right, #FEE2E2, #FECACA)', 
        borderColor: '#DC2626' 
      } : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-semibold ${
              Math.abs(currentYearDebits - currentYearCredits) < 0.01
                ? 'text-forvis-gray-700'
                : 'text-red-800'
            }`}>Balance Check (Current Year)</p>
            <p className={`text-xs mt-1 ${
              Math.abs(currentYearDebits - currentYearCredits) < 0.01
                ? 'text-forvis-gray-600'
                : 'text-red-700'
            }`}>
              Debits should equal credits for a balanced trial balance
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${
              Math.abs(currentYearDebits - currentYearCredits) < 0.01
                ? 'text-forvis-blue-700'
                : 'text-red-700'
            }`}>
              {Math.abs(currentYearDebits - currentYearCredits) < 0.01
                ? '✓ Balanced'
                : `⚠ Out of Balance: ${formatAmount(Math.abs(currentYearDebits - currentYearCredits))}`
              }
            </p>
          </div>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12 text-forvis-gray-500">
          <p>No trial balance accounts found.</p>
          <p className="text-sm mt-2">Upload a trial balance to see the report.</p>
        </div>
      )}
    </div>
  );
}


