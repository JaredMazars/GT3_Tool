import { FinancialRatios } from '@/types/analytics';

export interface FinancialData {
  // Balance Sheet Items
  currentAssets?: number;
  totalAssets?: number;
  currentLiabilities?: number;
  totalLiabilities?: number;
  equity?: number;
  cash?: number;
  inventory?: number;
  accountsReceivable?: number;
  
  // Income Statement Items
  revenue?: number;
  grossProfit?: number;
  netIncome?: number;
  operatingIncome?: number;
  interestExpense?: number;
  costOfGoodsSold?: number;
  
  // Other
  averageInventory?: number;
  averageReceivables?: number;
}

/**
 * Financial Ratio Calculator
 * Calculates various financial ratios from financial data
 */
export class FinancialRatioCalculator {
  /**
   * Calculate all available financial ratios from provided data
   */
  static calculateRatios(data: FinancialData): FinancialRatios {
    const ratios: FinancialRatios = {};

    try {
      // Liquidity Ratios
      ratios.currentRatio = this.calculateCurrentRatio(data);
      ratios.quickRatio = this.calculateQuickRatio(data);
      ratios.cashRatio = this.calculateCashRatio(data);

      // Profitability Ratios
      ratios.grossMargin = this.calculateGrossMargin(data);
      ratios.netMargin = this.calculateNetMargin(data);
      ratios.returnOnAssets = this.calculateROA(data);
      ratios.returnOnEquity = this.calculateROE(data);

      // Leverage Ratios
      ratios.debtToEquity = this.calculateDebtToEquity(data);
      ratios.interestCoverage = this.calculateInterestCoverage(data);
      ratios.debtRatio = this.calculateDebtRatio(data);

      // Efficiency Ratios
      ratios.assetTurnover = this.calculateAssetTurnover(data);
      ratios.inventoryTurnover = this.calculateInventoryTurnover(data);
      ratios.receivablesTurnover = this.calculateReceivablesTurnover(data);

      return ratios;
    } catch (error) {
      console.error('Error calculating financial ratios', error);
      return ratios;
    }
  }

  /**
   * LIQUIDITY RATIOS
   */

  /**
   * Current Ratio = Current Assets / Current Liabilities
   * Measures ability to pay short-term obligations
   */
  private static calculateCurrentRatio(data: FinancialData): number | undefined {
    if (!data.currentAssets || !data.currentLiabilities || data.currentLiabilities === 0) {
      return undefined;
    }
    return this.round(data.currentAssets / data.currentLiabilities, 2);
  }

  /**
   * Quick Ratio = (Current Assets - Inventory) / Current Liabilities
   * More conservative liquidity measure
   */
  private static calculateQuickRatio(data: FinancialData): number | undefined {
    if (!data.currentAssets || !data.currentLiabilities || data.currentLiabilities === 0) {
      return undefined;
    }
    const inventory = data.inventory || 0;
    return this.round((data.currentAssets - inventory) / data.currentLiabilities, 2);
  }

  /**
   * Cash Ratio = Cash / Current Liabilities
   * Most conservative liquidity measure
   */
  private static calculateCashRatio(data: FinancialData): number | undefined {
    if (!data.cash || !data.currentLiabilities || data.currentLiabilities === 0) {
      return undefined;
    }
    return this.round(data.cash / data.currentLiabilities, 2);
  }

  /**
   * PROFITABILITY RATIOS
   */

  /**
   * Gross Margin = (Gross Profit / Revenue) * 100
   */
  private static calculateGrossMargin(data: FinancialData): number | undefined {
    if (!data.grossProfit || !data.revenue || data.revenue === 0) {
      return undefined;
    }
    return this.round((data.grossProfit / data.revenue) * 100, 2);
  }

  /**
   * Net Margin = (Net Income / Revenue) * 100
   */
  private static calculateNetMargin(data: FinancialData): number | undefined {
    if (!data.netIncome || !data.revenue || data.revenue === 0) {
      return undefined;
    }
    return this.round((data.netIncome / data.revenue) * 100, 2);
  }

  /**
   * Return on Assets (ROA) = (Net Income / Total Assets) * 100
   */
  private static calculateROA(data: FinancialData): number | undefined {
    if (!data.netIncome || !data.totalAssets || data.totalAssets === 0) {
      return undefined;
    }
    return this.round((data.netIncome / data.totalAssets) * 100, 2);
  }

  /**
   * Return on Equity (ROE) = (Net Income / Equity) * 100
   */
  private static calculateROE(data: FinancialData): number | undefined {
    if (!data.netIncome || !data.equity || data.equity === 0) {
      return undefined;
    }
    return this.round((data.netIncome / data.equity) * 100, 2);
  }

  /**
   * LEVERAGE RATIOS
   */

  /**
   * Debt to Equity = Total Liabilities / Equity
   */
  private static calculateDebtToEquity(data: FinancialData): number | undefined {
    if (!data.totalLiabilities || !data.equity || data.equity === 0) {
      return undefined;
    }
    return this.round(data.totalLiabilities / data.equity, 2);
  }

  /**
   * Interest Coverage = Operating Income / Interest Expense
   */
  private static calculateInterestCoverage(data: FinancialData): number | undefined {
    if (!data.operatingIncome || !data.interestExpense || data.interestExpense === 0) {
      return undefined;
    }
    return this.round(data.operatingIncome / data.interestExpense, 2);
  }

  /**
   * Debt Ratio = Total Liabilities / Total Assets
   */
  private static calculateDebtRatio(data: FinancialData): number | undefined {
    if (!data.totalLiabilities || !data.totalAssets || data.totalAssets === 0) {
      return undefined;
    }
    return this.round(data.totalLiabilities / data.totalAssets, 2);
  }

  /**
   * EFFICIENCY RATIOS
   */

  /**
   * Asset Turnover = Revenue / Total Assets
   */
  private static calculateAssetTurnover(data: FinancialData): number | undefined {
    if (!data.revenue || !data.totalAssets || data.totalAssets === 0) {
      return undefined;
    }
    return this.round(data.revenue / data.totalAssets, 2);
  }

  /**
   * Inventory Turnover = Cost of Goods Sold / Average Inventory
   */
  private static calculateInventoryTurnover(data: FinancialData): number | undefined {
    const inventory = data.averageInventory || data.inventory;
    if (!data.costOfGoodsSold || !inventory || inventory === 0) {
      return undefined;
    }
    return this.round(data.costOfGoodsSold / inventory, 2);
  }

  /**
   * Receivables Turnover = Revenue / Average Receivables
   */
  private static calculateReceivablesTurnover(data: FinancialData): number | undefined {
    const receivables = data.averageReceivables || data.accountsReceivable;
    if (!data.revenue || !receivables || receivables === 0) {
      return undefined;
    }
    return this.round(data.revenue / receivables, 2);
  }

  /**
   * UTILITY FUNCTIONS
   */

  /**
   * Extract financial data from extracted document data
   */
  static extractFinancialData(extractedData: any): FinancialData {
    const data: FinancialData = {};

    try {
      // Try to extract from structured data
      if (extractedData?.data?.keyFields) {
        const fields = extractedData.data.keyFields;

        // Map common field names to FinancialData properties
        // This is a basic mapping - can be enhanced based on actual document structure
        data.currentAssets = this.findValue(fields, ['currentAssets', 'current_assets', 'totalCurrentAssets']);
        data.totalAssets = this.findValue(fields, ['totalAssets', 'total_assets', 'assets']);
        data.currentLiabilities = this.findValue(fields, ['currentLiabilities', 'current_liabilities', 'totalCurrentLiabilities']);
        data.totalLiabilities = this.findValue(fields, ['totalLiabilities', 'total_liabilities', 'liabilities']);
        data.equity = this.findValue(fields, ['equity', 'shareholders_equity', 'shareholdersEquity', 'totalEquity']);
        data.cash = this.findValue(fields, ['cash', 'cashAndCashEquivalents', 'cash_and_equivalents']);
        data.inventory = this.findValue(fields, ['inventory', 'inventories']);
        data.accountsReceivable = this.findValue(fields, ['accountsReceivable', 'accounts_receivable', 'receivables', 'tradeReceivables']);

        // Income statement
        data.revenue = this.findValue(fields, ['revenue', 'sales', 'turnover', 'totalRevenue']);
        data.grossProfit = this.findValue(fields, ['grossProfit', 'gross_profit']);
        data.netIncome = this.findValue(fields, ['netIncome', 'net_income', 'profit', 'netProfit']);
        data.operatingIncome = this.findValue(fields, ['operatingIncome', 'operating_income', 'operatingProfit']);
        data.interestExpense = this.findValue(fields, ['interestExpense', 'interest_expense', 'interest']);
        data.costOfGoodsSold = this.findValue(fields, ['costOfGoodsSold', 'cogs', 'cost_of_sales']);
      }
    } catch (error) {
      console.error('Error extracting financial data', error);
    }

    return data;
  }

  /**
   * Find a numeric value from an object using multiple possible keys
   */
  private static findValue(obj: any, possibleKeys: string[]): number | undefined {
    for (const key of possibleKeys) {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (!Number.isNaN(num)) {
          return num;
        }
      }
    }
    return undefined;
  }

  /**
   * Round number to specified decimal places
   */
  private static round(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Assess the health of a ratio
   */
  static assessRatio(
    ratioName: keyof FinancialRatios,
    value: number
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    // These are general benchmarks - industry-specific benchmarks would be better
    switch (ratioName) {
      case 'currentRatio':
        if (value >= 2) return 'EXCELLENT';
        if (value >= 1.5) return 'GOOD';
        if (value >= 1) return 'FAIR';
        return 'POOR';

      case 'quickRatio':
        if (value >= 1.5) return 'EXCELLENT';
        if (value >= 1) return 'GOOD';
        if (value >= 0.75) return 'FAIR';
        return 'POOR';

      case 'debtToEquity':
        if (value <= 0.5) return 'EXCELLENT';
        if (value <= 1) return 'GOOD';
        if (value <= 2) return 'FAIR';
        return 'POOR';

      case 'returnOnEquity':
        if (value >= 20) return 'EXCELLENT';
        if (value >= 15) return 'GOOD';
        if (value >= 10) return 'FAIR';
        return 'POOR';

      case 'returnOnAssets':
        if (value >= 10) return 'EXCELLENT';
        if (value >= 5) return 'GOOD';
        if (value >= 2) return 'FAIR';
        return 'POOR';

      case 'netMargin':
        if (value >= 20) return 'EXCELLENT';
        if (value >= 10) return 'GOOD';
        if (value >= 5) return 'FAIR';
        return 'POOR';

      case 'grossMargin':
        if (value >= 50) return 'EXCELLENT';
        if (value >= 30) return 'GOOD';
        if (value >= 20) return 'FAIR';
        return 'POOR';

      default:
        // Default assessment for other ratios
        return 'FAIR';
    }
  }
}


