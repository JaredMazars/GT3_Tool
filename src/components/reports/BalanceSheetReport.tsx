'use client';

import { formatAmount } from '@/lib/formatters';
import { MappedData } from '@/types';

interface BalanceSheetReportProps {
  mappedData: MappedData[];
  printMode?: boolean;
}

export default function BalanceSheetReport({ mappedData, printMode = false }: BalanceSheetReportProps) {
  function calculateNestedTotal(obj: Record<string, unknown>): number {
    return Object.values(obj).reduce((sum: number, val: unknown) => {
      if (typeof val === 'number') {
        return sum + val;
      }
      if (typeof val === 'object' && val !== null && 'amount' in val && typeof (val as { amount: unknown }).amount === 'number') {
        return sum + (val as { amount: number }).amount;
      }
      if (typeof val === 'object' && val !== null) {
        return sum + calculateNestedTotal(val as Record<string, unknown>);
      }
      return sum;
    }, 0);
  }

  function calculateNestedPriorYearTotal(obj: Record<string, unknown>): number {
    return Object.values(obj).reduce((sum: number, val: unknown) => {
      if (typeof val === 'number') {
        return sum + val;
      }
      if (typeof val === 'object' && val !== null && 'priorYearAmount' in val && typeof (val as { priorYearAmount: unknown }).priorYearAmount === 'number') {
        return sum + (val as { priorYearAmount: number }).priorYearAmount;
      }
      if (typeof val === 'object' && val !== null) {
        return sum + calculateNestedPriorYearTotal(val as Record<string, unknown>);
      }
      return sum;
    }, 0);
  }

  function transformMappedDataToBalanceSheet(mappedData: MappedData[]) {
    const balanceSheet = {
      nonCurrentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      currentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      capitalAndReservesCreditBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      capitalAndReservesDebitBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      nonCurrentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
      currentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedData[] }>,
    };

    const aggregatedBalances = mappedData.reduce((acc, item) => {
      if (item.section.toLowerCase() !== 'balance sheet') return acc;
      
      const key = item.sarsItem;
      if (!acc[key]) {
        acc[key] = {
          sarsItem: key,
          subsection: item.subsection,
          amount: 0,
          priorYearAmount: 0,
          mappedAccounts: []
        };
      }

      acc[key].amount += item.balance;
      acc[key].priorYearAmount += item.priorYearBalance;
      acc[key].mappedAccounts.push(item);
      return acc;
    }, {} as Record<string, { sarsItem: string; subsection: string; amount: number; priorYearAmount: number; mappedAccounts: MappedData[] }>);

    Object.values(aggregatedBalances).forEach(item => {
      const { sarsItem, subsection, amount, priorYearAmount, mappedAccounts } = item;
      const data = { amount, priorYearAmount, subsection, mappedAccounts };

      switch (subsection.toLowerCase()) {
        case 'noncurrentassets':
          balanceSheet.nonCurrentAssets[sarsItem] = data;
          break;
        case 'currentassets':
          balanceSheet.currentAssets[sarsItem] = data;
          break;
        case 'capitalandreservescreditbalances':
          balanceSheet.capitalAndReservesCreditBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        case 'capitalandreservesdebitbalances':
          balanceSheet.capitalAndReservesDebitBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        case 'noncurrentliabilities':
          balanceSheet.nonCurrentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        case 'currentliabilities':
          balanceSheet.currentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
          break;
        default:
          balanceSheet.currentAssets[sarsItem] = data;
      }
    });

    return balanceSheet;
  }

  const calculateTotals = () => {
    if (!mappedData) return { balanceSheet: 0, incomeStatement: 0, priorYearIncomeStatement: 0 };
    
    return mappedData.reduce((acc, item) => {
      const isBalanceSheet = item.section.toLowerCase() === 'balance sheet';
      const isIncomeStatement = item.section.toLowerCase() === 'income statement';
      
      if (isBalanceSheet) {
        acc.balanceSheet += item.balance;
      } else if (isIncomeStatement) {
        acc.incomeStatement += item.balance;
        acc.priorYearIncomeStatement += item.priorYearBalance;
      }
      return acc;
    }, { balanceSheet: 0, incomeStatement: 0, priorYearIncomeStatement: 0 });
  };

  const balanceSheet = transformMappedDataToBalanceSheet(mappedData);
  const totals = calculateTotals();
  
  const totalAssets = calculateNestedTotal(balanceSheet.nonCurrentAssets) + calculateNestedTotal(balanceSheet.currentAssets);
  const currentYearProfitLoss = totals.incomeStatement;
  
  const totalCapitalAndReserves = calculateNestedTotal(balanceSheet.capitalAndReservesCreditBalances) + 
                                 calculateNestedTotal(balanceSheet.capitalAndReservesDebitBalances) - 
                                 currentYearProfitLoss;
  
  const totalLiabilities = calculateNestedTotal(balanceSheet.nonCurrentLiabilities) + 
                          calculateNestedTotal(balanceSheet.currentLiabilities);

  const totalPriorYearAssets = calculateNestedPriorYearTotal(balanceSheet.nonCurrentAssets) + calculateNestedPriorYearTotal(balanceSheet.currentAssets);
  const priorYearProfitLoss = totals.priorYearIncomeStatement || 0;
  
  const totalPriorYearCapitalAndReserves = calculateNestedPriorYearTotal(balanceSheet.capitalAndReservesCreditBalances) + 
                                          calculateNestedPriorYearTotal(balanceSheet.capitalAndReservesDebitBalances) - 
                                          priorYearProfitLoss;
  
  const totalPriorYearLiabilities = calculateNestedPriorYearTotal(balanceSheet.nonCurrentLiabilities) + 
                                   calculateNestedPriorYearTotal(balanceSheet.currentLiabilities);

  const totalReservesAndLiabilities = totalCapitalAndReserves + totalLiabilities;
  const totalPriorYearReservesAndLiabilities = totalPriorYearCapitalAndReserves + totalPriorYearLiabilities;

  const renderSection = (items: [string, { amount: number; priorYearAmount: number }][]) => {
    return items.filter(([, data]) => data.amount !== 0 || data.priorYearAmount !== 0).map(([sarsItem, data]) => (
      <div key={sarsItem} className="grid grid-cols-12 border-b border-gray-100 hover:bg-gray-50">
        <div className="col-span-7 pl-6 py-1.5 text-xs">{sarsItem}</div>
        <div className={`col-span-2 text-right px-3 py-1.5 text-xs tabular-nums font-medium ${data.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {data.amount !== 0 && (data.amount < 0 
            ? `(${formatAmount(Math.abs(data.amount))})` 
            : formatAmount(data.amount))}
        </div>
        <div className={`col-span-3 text-right px-3 py-1.5 text-xs tabular-nums font-medium ${data.priorYearAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
          {data.priorYearAmount !== 0 && (data.priorYearAmount < 0 
            ? `(${formatAmount(Math.abs(data.priorYearAmount))})` 
            : formatAmount(data.priorYearAmount))}
        </div>
      </div>
    ));
  };

  return (
    <div className={printMode ? 'print-section' : ''}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="border-b border-gray-400 pb-2">
            <h1 className="text-xl font-bold text-gray-900">BALANCE SHEET</h1>
            <div className="grid grid-cols-12 text-xs font-semibold text-gray-600 mt-2">
              <div className="col-span-7"></div>
              <div className="col-span-2 text-right px-3">Current Year (R)</div>
              <div className="col-span-3 text-right px-3">Prior Year (R)</div>
            </div>
          </div>

          {/* ASSETS */}
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gradient-to-r from-blue-100 to-blue-200 py-2">
              <div className="col-span-7 px-3 font-bold text-base text-blue-900">ASSETS</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-blue-900">
                {formatAmount(totalAssets)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-blue-700">
                {formatAmount(totalPriorYearAssets)}
              </div>
            </div>
            <div className="bg-white">
              <div className="grid grid-cols-12 border-b border-gray-300 bg-gray-50">
                <div className="col-span-7 font-bold px-3 py-1.5 text-sm text-gray-900">Non Current Assets</div>
                <div className="col-span-2"></div>
                <div className="col-span-3"></div>
              </div>
              {renderSection(Object.entries(balanceSheet.nonCurrentAssets))}
              
              <div className="grid grid-cols-12 border-b border-gray-300 bg-gray-50">
                <div className="col-span-7 font-bold px-3 py-1.5 text-sm text-gray-900">Current Assets</div>
                <div className="col-span-2"></div>
                <div className="col-span-3"></div>
              </div>
              {renderSection(Object.entries(balanceSheet.currentAssets))}
            </div>
          </div>

          {/* EQUITY & RESERVES */}
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gradient-to-r from-purple-100 to-purple-200 py-2">
              <div className="col-span-7 px-3 font-bold text-base text-purple-900">EQUITY & RESERVES</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-purple-900">
                {formatAmount(totalCapitalAndReserves)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-purple-700">
                {formatAmount(totalPriorYearCapitalAndReserves)}
              </div>
            </div>
            <div className="bg-white">
              <div className="grid grid-cols-12 bg-purple-50 border-b border-purple-200">
                <div className="col-span-7 font-semibold px-4 py-2 text-purple-900">Capital and Reserves</div>
                <div className="col-span-2"></div>
                <div className="col-span-3"></div>
              </div>
              {renderSection(Object.entries(balanceSheet.capitalAndReservesCreditBalances))}
              
              <div className="grid grid-cols-12 bg-purple-50">
                <div className="col-span-7 pl-8 py-2 text-sm font-medium text-purple-900">Current Year Net Profit</div>
                <div className="col-span-2 text-right px-4 tabular-nums text-sm font-medium text-purple-900">
                  {formatAmount(-currentYearProfitLoss)}
                </div>
                <div className="col-span-3 text-right px-4 tabular-nums text-sm font-medium text-purple-700">
                  {formatAmount(-priorYearProfitLoss)}
                </div>
              </div>
            </div>
          </div>

          {/* LIABILITIES */}
          <div className="border border-orange-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gradient-to-r from-orange-100 to-orange-200 py-2">
              <div className="col-span-7 px-3 font-bold text-base text-orange-900">LIABILITIES</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-orange-900">
                {formatAmount(totalLiabilities)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-orange-700">
                {formatAmount(totalPriorYearLiabilities)}
              </div>
            </div>
            <div className="bg-white">
              <div className="grid grid-cols-12 bg-orange-50 border-b border-orange-200">
                <div className="col-span-7 font-semibold px-4 py-2 text-orange-900">Non-Current Liabilities</div>
                <div className="col-span-2"></div>
                <div className="col-span-3"></div>
              </div>
              {renderSection(Object.entries(balanceSheet.nonCurrentLiabilities))}
              
              <div className="grid grid-cols-12 bg-orange-50 border-t border-orange-300">
                <div className="col-span-7 font-semibold px-4 py-2 text-orange-900">Current Liabilities</div>
                <div className="col-span-2"></div>
                <div className="col-span-3"></div>
              </div>
              {renderSection(Object.entries(balanceSheet.currentLiabilities))}
            </div>
          </div>

          {/* TOTAL */}
          <div className="grid grid-cols-12 border border-gray-400 bg-gray-100 rounded-lg py-2">
            <div className="col-span-7 font-bold px-3 text-sm text-gray-900">TOTAL EQUITY & LIABILITIES</div>
            <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-gray-900">
              {formatAmount(totalReservesAndLiabilities)}
            </div>
            <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-gray-600">
              {formatAmount(totalPriorYearReservesAndLiabilities)}
            </div>
          </div>

          {/* Balance Check */}
          <div className={`grid grid-cols-12 rounded-lg py-1.5 ${
            Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 
              ? 'bg-green-50 border border-green-300' 
              : 'bg-red-50 border border-red-300'
          }`}>
            <div className="col-span-7 pl-3 text-xs font-medium text-gray-700">Balance Check (should be zero)</div>
            <div className={`col-span-2 text-right px-3 text-xs tabular-nums font-semibold ${
              Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatAmount(totalAssets - totalReservesAndLiabilities)}
            </div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums font-semibold ${
              Math.abs(totalPriorYearAssets - totalPriorYearReservesAndLiabilities) < 0.01 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatAmount(totalPriorYearAssets - totalPriorYearReservesAndLiabilities)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




