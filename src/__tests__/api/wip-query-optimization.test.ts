/**
 * WIP Query Optimization Test Suite
 * 
 * Verifies that the optimized UNION ALL query returns identical results
 * to the original OR query, ensuring 100% data completeness.
 * 
 * CRITICAL: The OR clause is necessary to capture billing fees that may
 * only be linked via GSTaskID (with NULL GSClientID).
 */

import { prisma } from '@/lib/db/prisma';
import { calculateWIPByTask } from '@/lib/services/clients/clientBalanceCalculation';

describe('WIP Query Optimization', () => {
  // Test with real data from database
  let testClientID: string;
  let testTaskIDs: string[];

  beforeAll(async () => {
    // Get a real client with multiple tasks for testing
    const client = await prisma.client.findFirst({
      where: {
        Task: {
          some: {
            Active: 'Yes'
          }
        }
      },
      select: {
        GSClientID: true,
        Task: {
          where: { Active: 'Yes' },
          select: { GSTaskID: true },
          take: 15,
        }
      }
    });

    if (!client) {
      throw new Error('No test client found with active tasks');
    }

    testClientID = client.GSClientID;
    testTaskIDs = client.Task.map(t => t.GSTaskID);
  });

  describe('Query Result Comparison', () => {
    test('UNION ALL query returns same results as OR query', async () => {
      // Original query (OR approach - slow)
      const orResults = await prisma.wIPTransactions.findMany({
        where: {
          OR: [
            { GSClientID: testClientID },
            { GSTaskID: { in: testTaskIDs } }
          ]
        },
        select: { id: true, GSTaskID: true, Amount: true, TType: true, GSClientID: true },
        orderBy: { id: 'asc' }
      });

      // Optimized query (UNION ALL approach - fast)
      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: testClientID },
          select: { id: true, GSTaskID: true, Amount: true, TType: true, GSClientID: true },
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: testTaskIDs },
            OR: [
              { GSClientID: null },
              { GSClientID: { not: testClientID } }
            ]
          },
          select: { id: true, GSTaskID: true, Amount: true, TType: true, GSClientID: true },
        }),
      ]);

      const unionResults = [...clientTransactions, ...taskOnlyTransactions]
        .sort((a, b) => a.id - b.id);

      // Verify same row count
      expect(unionResults.length).toBe(orResults.length);

      // Verify same transaction IDs (no missing or duplicate rows)
      const orIds = new Set(orResults.map(r => r.id));
      const unionIds = new Set(unionResults.map(r => r.id));
      
      expect(unionIds.size).toBe(orIds.size);
      expect([...unionIds].every(id => orIds.has(id))).toBe(true);
      expect([...orIds].every(id => unionIds.has(id))).toBe(true);

      // Verify data completeness (same amounts and types)
      orResults.forEach((orRow, index) => {
        const unionRow = unionResults[index];
        expect(unionRow.id).toBe(orRow.id);
        expect(unionRow.GSTaskID).toBe(orRow.GSTaskID);
        expect(unionRow.Amount).toBe(orRow.Amount);
        expect(unionRow.TType).toBe(orRow.TType);
        expect(unionRow.GSClientID).toBe(orRow.GSClientID);
      });
    });

    test('UNION ALL captures NULL GSClientID transactions (billing fees)', async () => {
      // Check if there are any transactions with NULL GSClientID for these tasks
      const nullClientTransactions = await prisma.wIPTransactions.findMany({
        where: {
          GSTaskID: { in: testTaskIDs },
          GSClientID: null
        },
        select: { id: true, GSTaskID: true, TType: true }
      });

      if (nullClientTransactions.length === 0) {
        // No NULL GSClientID transactions for this test client - skip
        console.log('No NULL GSClientID transactions found - this is expected for some clients');
        return;
      }

      // Verify UNION ALL query captures these NULL transactions
      const [, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: testClientID },
          select: { id: true },
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: testTaskIDs },
            OR: [
              { GSClientID: null },
              { GSClientID: { not: testClientID } }
            ]
          },
          select: { id: true },
        }),
      ]);

      const taskOnlyIds = new Set(taskOnlyTransactions.map(t => t.id));
      const nullTransactionIds = nullClientTransactions.map(t => t.id);

      // All NULL GSClientID transactions should be in taskOnlyTransactions
      nullTransactionIds.forEach(id => {
        expect(taskOnlyIds.has(id)).toBe(true);
      });

      console.log(`✅ Verified ${nullClientTransactions.length} NULL GSClientID transactions are captured`);
    });

    test('No duplicate rows in UNION ALL results', async () => {
      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: testClientID },
          select: { id: true },
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: testTaskIDs },
            OR: [
              { GSClientID: null },
              { GSClientID: { not: testClientID } }
            ]
          },
          select: { id: true },
        }),
      ]);

      const clientIds = new Set(clientTransactions.map(t => t.id));
      const taskOnlyIds = new Set(taskOnlyTransactions.map(t => t.id));

      // Check for duplicates (intersection should be empty)
      const intersection = new Set([...clientIds].filter(id => taskOnlyIds.has(id)));
      
      expect(intersection.size).toBe(0);
      
      if (intersection.size > 0) {
        console.error('Duplicate transaction IDs found:', [...intersection]);
      }
    });
  });

  describe('WIP Balance Calculation Consistency', () => {
    test('calculateWIPByTask produces same results for both queries', async () => {
      // Get WIP transactions using both approaches
      const orResults = await prisma.wIPTransactions.findMany({
        where: {
          OR: [
            { GSClientID: testClientID },
            { GSTaskID: { in: testTaskIDs } }
          ]
        },
        select: { GSTaskID: true, Amount: true, TType: true },
      });

      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: testClientID },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: testTaskIDs },
            OR: [
              { GSClientID: null },
              { GSClientID: { not: testClientID } }
            ]
          },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
      ]);

      const unionResults = [...clientTransactions, ...taskOnlyTransactions];

      // Calculate WIP balances
      const orWipByTask = calculateWIPByTask(orResults);
      const unionWipByTask = calculateWIPByTask(unionResults);

      // Should have same number of tasks
      expect(unionWipByTask.size).toBe(orWipByTask.size);

      // Each task should have identical WIP values
      orWipByTask.forEach((orWip, taskId) => {
        const unionWip = unionWipByTask.get(taskId);
        expect(unionWip).toBeDefined();

        if (unionWip) {
          expect(unionWip.balWIP).toBeCloseTo(orWip.balWIP, 2);
          expect(unionWip.time).toBeCloseTo(orWip.time, 2);
          expect(unionWip.adjustments).toBeCloseTo(orWip.adjustments, 2);
          expect(unionWip.disbursements).toBeCloseTo(orWip.disbursements, 2);
          expect(unionWip.fees).toBeCloseTo(orWip.fees, 2);
          expect(unionWip.provision).toBeCloseTo(orWip.provision, 2);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    test('Handles client with no tasks', async () => {
      const clientWithNoTasks = await prisma.client.findFirst({
        where: {
          NOT: {
            Task: {
              some: {}
            }
          }
        },
        select: { GSClientID: true }
      });

      if (!clientWithNoTasks) {
        console.log('No clients without tasks found - skipping test');
        return;
      }

      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: clientWithNoTasks.GSClientID },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: [] }, // Empty task list
            OR: [
              { GSClientID: null },
              { GSClientID: { not: clientWithNoTasks.GSClientID } }
            ]
          },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
      ]);

      const unionResults = [...clientTransactions, ...taskOnlyTransactions];
      
      // Should only return transactions linked directly to client
      expect(taskOnlyTransactions.length).toBe(0);
      expect(unionResults.length).toBe(clientTransactions.length);
    });

    test('Handles empty task list gracefully', async () => {
      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: testClientID },
          select: { GSTaskID: true, Amount: true, TType: true },
          take: 1,
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: [] },
            OR: [
              { GSClientID: null },
              { GSClientID: { not: testClientID } }
            ]
          },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
      ]);

      // Should handle empty IN clause gracefully
      expect(taskOnlyTransactions.length).toBe(0);
      expect(() => calculateWIPByTask([...clientTransactions, ...taskOnlyTransactions])).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    test('UNION ALL query completes in reasonable time', async () => {
      const startTime = Date.now();

      const [clientTransactions, taskOnlyTransactions] = await Promise.all([
        prisma.wIPTransactions.findMany({
          where: { GSClientID: testClientID },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
        prisma.wIPTransactions.findMany({
          where: {
            GSTaskID: { in: testTaskIDs },
            OR: [
              { GSClientID: null },
              { GSClientID: { not: testClientID } }
            ]
          },
          select: { GSTaskID: true, Amount: true, TType: true },
        }),
      ]);

      const duration = Date.now() - startTime;

      console.log(`UNION ALL query completed in ${duration}ms`);
      console.log(`  - Client transactions: ${clientTransactions.length}`);
      console.log(`  - Task-only transactions: ${taskOnlyTransactions.length}`);
      console.log(`  - Total: ${clientTransactions.length + taskOnlyTransactions.length}`);

      // Should complete in under 2 seconds (generous threshold)
      // With covering indexes, expect < 1 second for most clients
      expect(duration).toBeLessThan(2000);
    });
  });
});
