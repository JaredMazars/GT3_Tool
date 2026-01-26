import { MappedAccount } from '../../lib/services/export/serverPdfExporter';

export function calculateNestedTotal(obj: Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: any[] }>): number {
    return Object.values(obj).reduce((sum, val) => sum + val.amount, 0);
}

export function calculateNestedPriorYearTotal(obj: Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: any[] }>): number {
    return Object.values(obj).reduce((sum, val) => sum + val.priorYearAmount, 0);
}

export function calculateTotals(mappedData: MappedAccount[]) {
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
}

export function transformMappedDataToBalanceSheet(mappedData: MappedAccount[]) {
    const balanceSheet = {
        nonCurrentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
        currentAssets: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
        capitalAndReservesCreditBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
        capitalAndReservesDebitBalances: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
        nonCurrentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
        currentLiabilities: {} as Record<string, { amount: number; priorYearAmount: number; subsection: string; mappedAccounts: MappedAccount[] }>,
    };

    const aggregatedBalances = mappedData.reduce((acc, item) => {
        if (item.section.toLowerCase() !== 'balance sheet') return acc;

        const key = item.sarsItem;
        if (!acc[key]) {
            acc[key] = {
                sarsItem: key,
                amount: 0,
                priorYearAmount: 0,
                mappedAccounts: []
            };
        }

        acc[key].amount += item.balance;
        acc[key].priorYearAmount += item.priorYearBalance;
        acc[key].mappedAccounts.push(item);
        return acc;
    }, {} as Record<string, { sarsItem: string; amount: number; priorYearAmount: number; mappedAccounts: MappedAccount[] }>);

    Object.values(aggregatedBalances).forEach(item => {
        const { sarsItem, amount, priorYearAmount, mappedAccounts } = item;
        // Determine subsection from sarsItem - this is a simplified categorization
        let subsection = 'currentAssets'; // default
        const sarsLower = sarsItem.toLowerCase();

        if (sarsLower.includes('non-current asset') || sarsLower.includes('fixed asset') || sarsLower.includes('intangible')) {
            subsection = 'nonCurrentAssets';
        } else if (sarsLower.includes('current asset') || sarsLower.includes('inventory') || sarsLower.includes('receivable') || sarsLower.includes('cash')) {
            subsection = 'currentAssets';
        } else if (sarsLower.includes('capital') || sarsLower.includes('reserve') || sarsLower.includes('equity')) {
            subsection = amount >= 0 ? 'capitalAndReservesCreditBalances' : 'capitalAndReservesDebitBalances';
        } else if (sarsLower.includes('non-current liabilit') || sarsLower.includes('long-term')) {
            subsection = 'nonCurrentLiabilities';
        } else if (sarsLower.includes('current liabilit') || sarsLower.includes('payable')) {
            subsection = 'currentLiabilities';
        }

        const data = { amount, priorYearAmount, subsection, mappedAccounts };

        switch (subsection) {
            case 'nonCurrentAssets':
                balanceSheet.nonCurrentAssets[sarsItem] = data;
                break;
            case 'currentAssets':
                balanceSheet.currentAssets[sarsItem] = data;
                break;
            case 'capitalAndReservesCreditBalances':
                balanceSheet.capitalAndReservesCreditBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
                break;
            case 'capitalAndReservesDebitBalances':
                balanceSheet.capitalAndReservesDebitBalances[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
                break;
            case 'nonCurrentLiabilities':
                balanceSheet.nonCurrentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
                break;
            case 'currentLiabilities':
                balanceSheet.currentLiabilities[sarsItem] = { ...data, amount: -amount, priorYearAmount: -priorYearAmount };
                break;
        }
    });

    return balanceSheet;
}

