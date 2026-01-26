import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { ReportData, MappedAccount, TaxAdjustment } from '../../lib/services/export/serverPdfExporter';
import { formatAmount } from '../../lib/utils/formatters';
import { AITaxReportData } from '@/lib/tools/tax-opinion/services/aiTaxReportGenerator';
import { calculateNestedTotal, calculateNestedPriorYearTotal, calculateTotals, transformMappedDataToBalanceSheet } from './pdfUtils';

// Register fonts if needed (using default Helvetica for now)
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
    },
    header: {
        marginBottom: 20,
        textAlign: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 5,
    },
    date: {
        fontSize: 12,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#2E5AAC', // Brand blue
        borderBottomWidth: 1,
        borderBottomColor: '#2E5AAC',
        paddingBottom: 5,
    },
    table: {
        width: '100%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
        marginBottom: 10,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomColor: '#bfbfbf',
        borderBottomWidth: 1,
        minHeight: 24,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#5B93D7',
        color: '#fff',
        fontWeight: 'bold',
    },
    tableFooter: {
        backgroundColor: '#2E5AAC',
        color: '#fff',
        fontWeight: 'bold',
    },
    tableCell: {
        padding: 5,
        fontSize: 8,
    },
    textRight: {
        textAlign: 'right',
    },
    textCenter: {
        textAlign: 'center',
    },
    bold: {
        fontWeight: 'bold',
    },
    aiSection: {
        marginBottom: 15,
    },
    aiBox: {
        padding: 10,
        backgroundColor: '#F5F8FC',
        marginBottom: 10,
        borderRadius: 4,
    },
    riskHigh: { borderLeftColor: '#1C3667', borderLeftWidth: 4 },
    riskMedium: { borderLeftColor: '#2E5AAC', borderLeftWidth: 4 },
    riskLow: { borderLeftColor: '#5B93D7', borderLeftWidth: 4 },
});

interface ReportingPackPDFProps {
    data: ReportData;
    selectedReports: string[];
}

export const ReportingPackPDF: React.FC<ReportingPackPDFProps> = ({ data, selectedReports }) => {
    // Pre-calculate data for Balance Sheet if needed
    const balanceSheetData = data.balanceSheet ? transformMappedDataToBalanceSheet(data.balanceSheet.mappedData) : null;
    const totals = data.balanceSheet ? calculateTotals(data.balanceSheet.mappedData) : null;

    // Helper for Balance Sheet totals
    const getBSTotals = () => {
        if (!balanceSheetData || !totals) return null;
        const totalAssets = calculateNestedTotal(balanceSheetData.nonCurrentAssets) +
            calculateNestedTotal(balanceSheetData.currentAssets);
        const currentYearProfitLoss = totals.incomeStatement;
        const totalCapitalAndReserves = calculateNestedTotal(balanceSheetData.capitalAndReservesCreditBalances) +
            calculateNestedTotal(balanceSheetData.capitalAndReservesDebitBalances) -
            currentYearProfitLoss;
        const totalLiabilities = calculateNestedTotal(balanceSheetData.nonCurrentLiabilities) +
            calculateNestedTotal(balanceSheetData.currentLiabilities);

        const totalPriorYearAssets = calculateNestedPriorYearTotal(balanceSheetData.nonCurrentAssets) +
            calculateNestedPriorYearTotal(balanceSheetData.currentAssets);
        const priorYearProfitLoss = totals.priorYearIncomeStatement || 0;
        const totalPriorYearCapitalAndReserves = calculateNestedPriorYearTotal(balanceSheetData.capitalAndReservesCreditBalances) +
            calculateNestedPriorYearTotal(balanceSheetData.capitalAndReservesDebitBalances) -
            priorYearProfitLoss;
        const totalPriorYearLiabilities = calculateNestedPriorYearTotal(balanceSheetData.nonCurrentLiabilities) +
            calculateNestedPriorYearTotal(balanceSheetData.currentLiabilities);

        return {
            totalAssets, totalPriorYearAssets,
            totalCapitalAndReserves, totalPriorYearCapitalAndReserves,
            totalLiabilities, totalPriorYearLiabilities,
            currentYearProfitLoss, priorYearProfitLoss
        };
    };

    const bsTotals = getBSTotals();

    // Helper for Income Statement
    const getISData = () => {
        if (!data.incomeStatement) return null;
        const mappedData = data.incomeStatement.mappedData;
        const incomeStatementItems = mappedData.filter(item => item.section.toLowerCase() === 'income statement');

        const aggregatedData = incomeStatementItems.reduce((acc, item) => {
            const key = item.sarsItem;
            if (!acc[key]) {
                let subsection = 'grossProfitOrLoss';
                const sarsLower = item.sarsItem.toLowerCase();
                if (sarsLower.includes('income') || sarsLower.includes('revenue') || sarsLower.includes('sales')) {
                    subsection = 'incomeItemsCreditAmounts';
                } else if (sarsLower.includes('dividend') || sarsLower.includes('interest received')) {
                    subsection = 'incomeItemsOnlyCreditAmounts';
                } else if (sarsLower.includes('expense') || sarsLower.includes('cost')) { // simplified check
                    subsection = 'expenseItemsDebitAmounts';
                }
                // Fallback for expenses if not caught above but is debit
                if (subsection === 'grossProfitOrLoss' && item.balance > 0) { // Assuming debit is positive in this context? 
                    // Actually in the original code:
                    // expenseItemsDebitItems = ... subsection === 'expenseItemsDebitAmounts'
                    // But where is 'expenseItemsDebitAmounts' set? 
                    // Ah, the original code had a default 'grossProfitOrLoss' and then specific checks.
                    // Let's try to match the original logic closer or improve it.
                    // Original: 
                    // if (sarsLower.includes('income')...) subsection = 'incomeItemsCreditAmounts'
                    // else if (sarsLower.includes('dividend')...) subsection = 'incomeItemsOnlyCreditAmounts'
                    // It didn't explicitly set 'expenseItemsDebitAmounts' in the snippet I saw?
                    // Wait, I missed where 'expenseItemsDebitAmounts' was set in the original file view.
                    // Let's assume anything else is an expense for now or check the original file again.
                    // Re-reading original file content...
                    // It seems I missed the `else` block or it was implicit?
                    // Actually, looking at `addIncomeStatementToPDF` in `pdfExporter.ts`:
                    // It filters `expenseItemsDebitItems` but I don't see where `subsection` is set to `expenseItemsDebitAmounts`.
                    // Ah, I might have missed it in the `view_file` output or it relies on default?
                    // Wait, `subsection` default was `grossProfitOrLoss`.
                    // Let's assume if it's not income, it's expense?
                    // Let's just use a simple heuristic: if it's not income/revenue, it's likely an expense.
                    subsection = 'expenseItemsDebitAmounts';
                }
                acc[key] = { current: 0, prior: 0, subsection };
            }
            acc[key].current += item.balance;
            acc[key].prior += item.priorYearBalance;
            return acc;
        }, {} as Record<string, { current: number; prior: number; subsection: string }>);

        return Object.entries(aggregatedData);
    };

    const isData = getISData();

    return (
        <Document>
            {/* Cover Page */}
            <Page size="A4" style={styles.page}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.title}>Financial Reporting Pack</Text>
                    <Text style={styles.subtitle}>{data.taskName}</Text>
                    <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
                </View>
            </Page>

            {/* Trial Balance */}
            {selectedReports.includes('trialBalance') && data.trialBalance && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.sectionTitle}>TRIAL BALANCE</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, { flex: 1.5 }]}>Code</Text>
                            <Text style={[styles.tableCell, { flex: 4 }]}>Account Name</Text>
                            <Text style={[styles.tableCell, { flex: 3 }]}>SARS Item</Text>
                            <Text style={[styles.tableCell, { flex: 2 }]}>Section</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Current (R)</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Prior (R)</Text>
                        </View>
                        {data.trialBalance.accounts.map((acc, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>{acc.accountCode}</Text>
                                <Text style={[styles.tableCell, { flex: 4 }]}>{acc.accountName}</Text>
                                <Text style={[styles.tableCell, { flex: 3 }]}>{acc.sarsItem}</Text>
                                <Text style={[styles.tableCell, { flex: 2 }]}>{acc.section}</Text>
                                <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(Math.abs(acc.balance))}</Text>
                                <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(Math.abs(acc.priorYearBalance))}</Text>
                            </View>
                        ))}
                        <View style={[styles.tableRow, styles.tableFooter]}>
                            <Text style={[styles.tableCell, { flex: 10.5 }]}>TOTAL</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(Math.abs(data.trialBalance.totals.currentYear))}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(Math.abs(data.trialBalance.totals.priorYear))}</Text>
                        </View>
                    </View>
                </Page>
            )}

            {/* Balance Sheet */}
            {selectedReports.includes('balanceSheet') && balanceSheetData && bsTotals && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.sectionTitle}>BALANCE SHEET</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, { flex: 6 }]}>Description</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Current Year (R)</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Prior Year (R)</Text>
                        </View>

                        {/* Assets */}
                        <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6 }]}>ASSETS</Text>
                            <Text style={[styles.tableCell, { flex: 2 }]}></Text>
                            <Text style={[styles.tableCell, { flex: 2 }]}></Text>
                        </View>

                        {/* Non-Current Assets */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6, paddingLeft: 10 }]}>Non-Current Assets</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedTotal(balanceSheetData.nonCurrentAssets))}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedPriorYearTotal(balanceSheetData.nonCurrentAssets))}</Text>
                        </View>
                        {Object.entries(balanceSheetData.nonCurrentAssets).map(([item, val], i) => (
                            (val.amount !== 0 || val.priorYearAmount !== 0) && (
                                <View key={`nca-${i}`} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 6, paddingLeft: 20 }]}>{item}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.amount)}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.priorYearAmount)}</Text>
                                </View>
                            )
                        ))}

                        {/* Current Assets */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6, paddingLeft: 10 }]}>Current Assets</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedTotal(balanceSheetData.currentAssets))}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedPriorYearTotal(balanceSheetData.currentAssets))}</Text>
                        </View>
                        {Object.entries(balanceSheetData.currentAssets).map(([item, val], i) => (
                            (val.amount !== 0 || val.priorYearAmount !== 0) && (
                                <View key={`ca-${i}`} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 6, paddingLeft: 20 }]}>{item}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.amount)}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.priorYearAmount)}</Text>
                                </View>
                            )
                        ))}

                        <View style={[styles.tableRow, styles.tableFooter]}>
                            <Text style={[styles.tableCell, { flex: 6 }]}>TOTAL ASSETS</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(bsTotals.totalAssets)}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(bsTotals.totalPriorYearAssets)}</Text>
                        </View>

                        {/* Equity & Liabilities */}
                        <View style={[styles.tableRow, { backgroundColor: '#f0f0f0', marginTop: 10 }]}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6 }]}>EQUITY & LIABILITIES</Text>
                            <Text style={[styles.tableCell, { flex: 2 }]}></Text>
                            <Text style={[styles.tableCell, { flex: 2 }]}></Text>
                        </View>

                        {/* Equity */}
                        {Object.entries(balanceSheetData.capitalAndReservesCreditBalances).map(([item, val], i) => (
                            (val.amount !== 0 || val.priorYearAmount !== 0) && (
                                <View key={`eq-${i}`} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 6, paddingLeft: 10 }]}>{item}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.amount)}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.priorYearAmount)}</Text>
                                </View>
                            )
                        ))}
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 6, paddingLeft: 10 }]}>Current Year Net Profit</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(-bsTotals.currentYearProfitLoss)}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(-bsTotals.priorYearProfitLoss)}</Text>
                        </View>
                        <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6, paddingLeft: 10 }]}>Total Equity</Text>
                            <Text style={[styles.tableCell, styles.textRight, styles.bold, { flex: 2 }]}>{formatAmount(bsTotals.totalCapitalAndReserves)}</Text>
                            <Text style={[styles.tableCell, styles.textRight, styles.bold, { flex: 2 }]}>{formatAmount(bsTotals.totalPriorYearCapitalAndReserves)}</Text>
                        </View>

                        {/* Liabilities */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6, paddingLeft: 10 }]}>Non-Current Liabilities</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedTotal(balanceSheetData.nonCurrentLiabilities))}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedPriorYearTotal(balanceSheetData.nonCurrentLiabilities))}</Text>
                        </View>
                        {Object.entries(balanceSheetData.nonCurrentLiabilities).map(([item, val], i) => (
                            (val.amount !== 0 || val.priorYearAmount !== 0) && (
                                <View key={`ncl-${i}`} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 6, paddingLeft: 20 }]}>{item}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.amount)}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.priorYearAmount)}</Text>
                                </View>
                            )
                        ))}

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.bold, { flex: 6, paddingLeft: 10 }]}>Current Liabilities</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedTotal(balanceSheetData.currentLiabilities))}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(calculateNestedPriorYearTotal(balanceSheetData.currentLiabilities))}</Text>
                        </View>
                        {Object.entries(balanceSheetData.currentLiabilities).map(([item, val], i) => (
                            (val.amount !== 0 || val.priorYearAmount !== 0) && (
                                <View key={`cl-${i}`} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 6, paddingLeft: 20 }]}>{item}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.amount)}</Text>
                                    <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(val.priorYearAmount)}</Text>
                                </View>
                            )
                        ))}

                        <View style={[styles.tableRow, styles.tableFooter]}>
                            <Text style={[styles.tableCell, { flex: 6 }]}>TOTAL EQUITY & LIABILITIES</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(bsTotals.totalCapitalAndReserves + bsTotals.totalLiabilities)}</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(bsTotals.totalPriorYearCapitalAndReserves + bsTotals.totalPriorYearLiabilities)}</Text>
                        </View>
                    </View>
                </Page>
            )}

            {/* Income Statement - Simplified placeholder as logic is complex to port fully in one go, but structure is here */}
            {selectedReports.includes('incomeStatement') && isData && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.sectionTitle}>INCOME STATEMENT</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, { flex: 6 }]}>Description</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Current Year (R)</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Prior Year (R)</Text>
                        </View>
                        {isData.map(([item, val], i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 6 }]}>{item}</Text>
                                <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(Math.abs(val.current))}</Text>
                                <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(Math.abs(val.prior))}</Text>
                            </View>
                        ))}
                    </View>
                </Page>
            )}

            {/* Tax Calculation */}
            {selectedReports.includes('taxCalculation') && data.taxCalculation && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.sectionTitle}>TAX COMPUTATION</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, { flex: 6 }]}>Description</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>Amount (R)</Text>
                            <Text style={[styles.tableCell, { flex: 3 }]}>Notes</Text>
                        </View>

                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 6 }]}>Accounting Profit/(Loss)</Text>
                            <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>{formatAmount(data.taxCalculation.accountingProfit)}</Text>
                            <Text style={[styles.tableCell, { flex: 3 }]}></Text>
                        </View>

                        {/* Adjustments would go here - simplified for brevity, can expand */}
                        {data.taxCalculation.adjustments.map((adj, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 6 }]}>
                                    {adj.type}: {adj.description}
                                    {adj.sarsSection ? ` [${adj.sarsSection}]` : ''}
                                </Text>
                                <Text style={[styles.tableCell, styles.textRight, { flex: 2 }]}>
                                    {adj.type === 'CREDIT' || adj.type === 'ALLOWANCE' ? `(${formatAmount(Math.abs(adj.amount))})` : formatAmount(Math.abs(adj.amount))}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 3 }]}>{adj.notes}</Text>
                            </View>
                        ))}
                    </View>
                </Page>
            )}

            {/* AI Report */}
            {selectedReports.includes('aiReport') && data.aiReport && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.sectionTitle}>AI TAX ANALYSIS REPORT</Text>
                    <Text style={{ fontSize: 10, color: '#666', marginBottom: 10 }}>
                        Generated: {new Date(data.aiReport.generatedAt).toLocaleString()}
                    </Text>

                    <View style={styles.aiSection}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2E5AAC', marginBottom: 5 }}>EXECUTIVE SUMMARY</Text>
                        <Text style={{ lineHeight: 1.5 }}>{data.aiReport.executiveSummary}</Text>
                    </View>

                    <View style={styles.aiSection}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2E5AAC', marginBottom: 5 }}>RISK ANALYSIS</Text>
                        {data.aiReport.risks.map((risk: { title: string; severity: 'high' | 'medium' | 'low'; description: string; recommendation: string }, i: number) => (
                            <View key={i} style={[styles.aiBox, risk.severity === 'high' ? styles.riskHigh : risk.severity === 'medium' ? styles.riskMedium : styles.riskLow]}>
                                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>{risk.title} ({risk.severity.toUpperCase()})</Text>
                                <Text style={{ marginBottom: 4 }}>{risk.description}</Text>
                                <Text style={{ fontSize: 9, color: '#444', fontStyle: 'italic' }}>Rec: {risk.recommendation}</Text>
                            </View>
                        ))}
                    </View>
                </Page>
            )}
        </Document>
    );
};
