import { mappingGuide } from '@/lib/services/tasks/mappingGuide';
import { logWarn } from '@/lib/utils/logger';

export function determineSectionAndSubsection(sarsItem: string, balance: number): { section: string; subsection: string } {
  // Search in Balance Sheet categories
  for (const [subsection, items] of Object.entries(mappingGuide.balanceSheet)) {
    if (items.some((item: { sarsItem: string }) => item.sarsItem === sarsItem)) {
      // Special handling for long-term loans that can be assets or liabilities
      if (sarsItem.includes('Long-term loans')) {
        // Negative balance = liability, Positive balance = asset
        if (balance < 0) {
          return { section: 'Balance Sheet', subsection: 'nonCurrentLiabilities' };
        } else {
          return { section: 'Balance Sheet', subsection: 'nonCurrentAssets' };
        }
      }
      return { section: 'Balance Sheet', subsection };
    }
  }

  // Search in Income Statement categories
  for (const [subsection, items] of Object.entries(mappingGuide.incomeStatement)) {
    if (items.some((item: { sarsItem: string }) => item.sarsItem === sarsItem)) {
      return { section: 'Income Statement', subsection };
    }
  }

  // Fallback for unmapped items - map to appropriate "Other" category
  logWarn(`Unmapped sarsItem: "${sarsItem}" with balance ${balance}. Mapping to "Other" category.`);
  
  // For Balance Sheet items, determine based on balance
  if (balance > 0) {
    // Positive balance = Asset
    return { section: 'Balance Sheet', subsection: 'currentAssets' };
  } else if (balance < 0) {
    // Negative balance = Liability
    return { section: 'Balance Sheet', subsection: 'currentLiabilities' };
  } else {
    // Zero balance - default to current assets
    return { section: 'Balance Sheet', subsection: 'currentAssets' };
  }
}




