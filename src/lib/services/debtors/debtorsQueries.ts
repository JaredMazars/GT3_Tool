import { prisma } from '@/lib/db/prisma';
import { withRetry, RetryPresets } from '@/lib/utils/retryUtils';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import type { DebtorsWithEmployee } from '@/types';

/**
 * Get debtors for a client with enriched biller name
 * 
 * Note: DrsTransactions already includes BillerName, ClientPartnerName, 
 * and ClientManagerName from the external system, so no enrichment is needed there.
 * 
 * This service is for the Debtors table which only has Biller code.
 */
export async function getDebtorsForClient(
  GSClientID: string,
  periodRef?: number
): Promise<DebtorsWithEmployee[]> {
  return withRetry(
    async () => {
      interface WhereClause {
        GSClientID: string;
        PeriodRef?: number;
      }
      
      const where: WhereClause = { GSClientID };
      if (periodRef !== undefined) {
        where.PeriodRef = periodRef;
      }

      const debtors = await prisma.debtors.findMany({
        where,
        orderBy: {
          PeriodRef: 'desc',
        },
        select: {
          id: true,
          PeriodRef: true,
          PeriodStart: true,
          PeriodEnd: true,
          GSClientID: true,
          Biller: true,
          OfficeCode: true,
          ServLineCode: true,
          LTDInv: true,
          LTDFee: true,
          LTDVat: true,
          LTDCn: true,
          LTDRec: true,
          LTDInt: true,
          LTDPLFC: true,
          YTDInv: true,
          YTDFee: true,
          YTDVat: true,
          YTDCn: true,
          YTDRec: true,
          YTDInt: true,
          YTDPLFC: true,
          PTDInv: true,
          PTDFee: true,
          PTDVat: true,
          PTDCn: true,
          PTDRec: true,
          PTDInt: true,
          PTDPLFC: true,
          CBal: true,
          BalCurr: true,
          Bal30: true,
          Bal60: true,
          Bal90: true,
          Bal120: true,
          Bal150: true,
          Bal180: true,
          DebtorProvision: true,
          PTDDebtorProvision: true,
          YTDDebtorProvision: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Enrich with biller names
      const enriched = await enrichRecordsWithEmployeeNames(debtors, [
        { codeField: 'Biller', nameField: 'BillerName' },
      ]);

      return enriched as DebtorsWithEmployee[];
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get debtors for client'
  );
}

/**
 * Get DRS (Debtors) Transactions for a client
 * 
 * Note: DrsTransactions already includes employee names (BillerName, 
 * ClientPartnerName, ClientManagerName) from the external system.
 * No enrichment needed - just return the data as-is.
 */
export async function getDrsTransactionsForClient(
  GSClientID: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  return withRetry(
    async () => {
      const { startDate, endDate, limit = 100, offset = 0 } = options || {};

      interface WhereClause {
        GSClientID: string;
        TranDate?: {
          gte?: Date;
          lte?: Date;
        };
      }
      
      const where: WhereClause = { GSClientID };
      
      if (startDate || endDate) {
        where.TranDate = {};
        if (startDate) where.TranDate.gte = startDate;
        if (endDate) where.TranDate.lte = endDate;
      }

      const [transactions, total] = await Promise.all([
        prisma.drsTransactions.findMany({
          where,
          orderBy: {
            TranDate: 'desc',
          },
          skip: offset,
          take: Math.min(limit, 500), // Max 500 per request
          select: {
            id: true,
            GSDebtorsTranID: true,
            GSClientID: true,
            ClientCode: true,
            ClientNameFull: true,
            GroupCode: true,
            GroupDesc: true,
            OfficeCode: true,
            OfficeDesc: true,
            ServLineCode: true,
            ServLineDesc: true,
            Biller: true,
            BillerName: true, // Already provided by external system
            TranDate: true,
            EntryType: true,
            Ordinal: true,
            Reference: true,
            InvNumber: true,
            Amount: true,
            Vat: true,
            Total: true,
            Batch: true,
            Allocation: true,
            Narration: true,
            VatCode: true,
            PeriodKey: true,
            EntryGroupCode: true,
            EntryGroup: true,
            DRAccount: true,
            CRAccount: true,
            ClientPartner: true,
            ClientPartnerName: true, // Already provided by external system
            ClientManager: true,
            ClientManagerName: true, // Already provided by external system
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.drsTransactions.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + transactions.length < total,
        },
      };
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Get DRS transactions for client'
  );
}


