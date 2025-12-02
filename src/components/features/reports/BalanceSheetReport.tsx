'use client';

import { formatAmount } from '@/lib/utils/formatters';
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
        <div className="col-span-7 pl-6 py-1.5 text-xs text-gray-900">{sarsItem}</div>
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

  const calculateSectionTotal = (items: [string, { amount: number; priorYearAmount: number }][]) => {
    const filteredItems = items.filter(([, data]) => data.amount !== 0 || data.priorYearAmount !== 0);
    const currentTotal = filteredItems.reduce((sum, [, data]) => sum + data.amount, 0);
    const priorTotal = filteredItems.reduce((sum, [, data]) => sum + data.priorYearAmount, 0);
    return { currentTotal, priorTotal };
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
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="grid grid-cols-12 py-2" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
              <div className="col-span-7 px-3 font-bold text-base text-white">ASSETS</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalAssets)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalPriorYearAssets)}
              </div>
            </div>
            <div className="bg-white">
              <div className="grid grid-cols-12 border-b-2 shadow-sm" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-7 font-bold px-3 py-1.5 text-sm text-white">Non Current Assets</div>
                <div className="col-span-2 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.nonCurrentAssets)).currentTotal)}
                </div>
                <div className="col-span-3 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.nonCurrentAssets)).priorTotal)}
                </div>
              </div>
              {renderSection(Object.entries(balanceSheet.nonCurrentAssets))}
              
              <div className="grid grid-cols-12 border-b-2 shadow-sm border-t-2" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-7 font-bold px-3 py-1.5 text-sm text-white">Current Assets</div>
                <div className="col-span-2 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.currentAssets)).currentTotal)}
                </div>
                <div className="col-span-3 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.currentAssets)).priorTotal)}
                </div>
              </div>
              {renderSection(Object.entries(balanceSheet.currentAssets))}
            </div>
          </div>

          {/* EQUITY & RESERVES */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="grid grid-cols-12 py-2" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
              <div className="col-span-7 px-3 font-bold text-base text-white">EQUITY & RESERVES</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalCapitalAndReserves)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalPriorYearCapitalAndReserves)}
              </div>
            </div>
            <div className="bg-white">
              <div className="grid grid-cols-12 border-b-2 shadow-sm" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-7 font-semibold px-4 py-2 text-white">Capital and Reserves</div>
                <div className="col-span-2 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.capitalAndReservesCreditBalances)).currentTotal)}
                </div>
                <div className="col-span-3 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.capitalAndReservesCreditBalances)).priorTotal)}
                </div>
              </div>
              {renderSection(Object.entries(balanceSheet.capitalAndReservesCreditBalances))}
              
              <div className="grid grid-cols-12 bg-forvis-blue-50">
                <div className="col-span-7 pl-8 py-2 text-sm font-medium text-forvis-blue-900">Current Year Net Profit</div>
                <div className="col-span-2 text-right px-4 tabular-nums text-sm font-medium text-forvis-blue-900">
                  {formatAmount(-currentYearProfitLoss)}
                </div>
                <div className="col-span-3 text-right px-4 tabular-nums text-sm font-medium text-forvis-blue-700">
                  {formatAmount(-priorYearProfitLoss)}
                </div>
              </div>
            </div>
          </div>

          {/* LIABILITIES */}
          <div className="border-2 rounded-lg overflow-hidden shadow-sm" style={{ borderColor: '#25488A' }}>
            <div className="grid grid-cols-12 py-2" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)' }}>
              <div className="col-span-7 px-3 font-bold text-base text-white">LIABILITIES</div>
              <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalLiabilities)}
              </div>
              <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
                {formatAmount(totalPriorYearLiabilities)}
              </div>
            </div>
            <div className="bg-white">
              <div className="grid grid-cols-12 border-b-2 shadow-sm" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-7 font-semibold px-4 py-2 text-white">Non-Current Liabilities</div>
                <div className="col-span-2 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.nonCurrentLiabilities)).currentTotal)}
                </div>
                <div className="col-span-3 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.nonCurrentLiabilities)).priorTotal)}
                </div>
              </div>
              {renderSection(Object.entries(balanceSheet.nonCurrentLiabilities))}
              
              <div className="grid grid-cols-12 border-b-2 shadow-sm border-t-2" style={{ background: 'linear-gradient(to right, #5B93D7, #2E5AAC)', borderColor: '#25488A' }}>
                <div className="col-span-7 font-semibold px-4 py-2 text-white">Current Liabilities</div>
                <div className="col-span-2 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.currentLiabilities)).currentTotal)}
                </div>
                <div className="col-span-3 text-right px-3 py-1.5 text-sm tabular-nums font-bold text-white">
                  {formatAmount(calculateSectionTotal(Object.entries(balanceSheet.currentLiabilities)).priorTotal)}
                </div>
              </div>
              {renderSection(Object.entries(balanceSheet.currentLiabilities))}
            </div>
          </div>

          {/* TOTAL */}
          <div className="grid grid-cols-12 border-2 rounded-lg py-2 shadow-md" style={{ background: 'linear-gradient(to right, #2E5AAC, #25488A)', borderColor: '#1C3667' }}>
            <div className="col-span-7 font-bold px-3 text-sm text-white">TOTAL EQUITY & LIABILITIES</div>
            <div className="col-span-2 text-right px-3 tabular-nums font-bold text-sm text-white">
              {formatAmount(totalReservesAndLiabilities)}
            </div>
            <div className="col-span-3 text-right px-3 tabular-nums font-bold text-sm text-white">
              {formatAmount(totalPriorYearReservesAndLiabilities)}
            </div>
          </div>

          {/* Balance Check */}
          <div className={`grid grid-cols-12 rounded-lg py-1.5 border ${
            Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 
              ? 'bg-forvis-gray-50 border-forvis-gray-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <div className={`col-span-7 pl-3 text-xs font-medium ${
              Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 
                ? 'text-forvis-gray-700' 
                : 'text-red-800'
            }`}>Balance Check (should be zero)</div>
            <div className={`col-span-2 text-right px-3 text-xs tabular-nums font-semibold ${
              Math.abs(totalAssets - totalReservesAndLiabilities) < 0.01 ? 'text-forvis-gray-700' : 'text-red-700'
            }`}>
              {formatAmount(totalAssets - totalReservesAndLiabilities)}
            </div>
            <div className={`col-span-3 text-right px-3 text-xs tabular-nums font-semibold ${
              Math.abs(totalPriorYearAssets - totalPriorYearReservesAndLiabilities) < 0.01 ? 'text-forvis-gray-600' : 'text-red-700'
            }`}>
              {formatAmount(totalPriorYearAssets - totalPriorYearReservesAndLiabilities)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







