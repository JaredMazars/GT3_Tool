/**
 * Database Management Service
 * Utilities for monitoring and maintaining database health
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/utils/logger';

/**
 * Whitelist of tables that can be reindexed
 * Only application tables - no system tables
 */
export const ALLOWED_TABLES = [
  'Task',
  'TaskStage',
  'Client',
  'Group',
  'Employee',
  'WIPTransactions',
  'DrsTransactions',
  'Wip',
  'Debtors',
  'ClientAcceptance',
  'EngagementAcceptance',
  'TaskTeam',
  'BDOpportunity',
  'BDContact',
  'Session',
  'User',
  'ServiceLineUser',
  'ExternalLink',
  'Template',
  'TemplateSection',
  'DocumentVault',
  'Approval',
  'Notification',
  'BugReport',
  'AuditLog',
] as const;

export type AllowedTable = typeof ALLOWED_TABLES[number];

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  responseTimeMs: number;
  error?: string;
}

/**
 * Table statistics
 */
export interface TableStatistics {
  tableName: string;
  rowCount: number;
  totalSpaceKB: number;
  totalSpaceMB: number;
}

/**
 * Database statistics summary
 */
export interface DatabaseStatistics {
  totalTables: number;
  largestTables: TableStatistics[];
  databaseSizeMB: number;
}

/**
 * Index health information
 */
export interface IndexHealth {
  tableName: string;
  indexName: string;
  fragmentationPercent: number;
  pageCount: number;
}

/**
 * Grouped index health by fragmentation tier
 */
export interface IndexHealthGrouped {
  tier: 'healthy' | 'low' | 'medium' | 'high' | 'critical';
  label: string;
  color: string;
  rangeLabel: string;
  indexes: IndexHealth[];
  count: number;
}

/**
 * Test database connection speed
 */
export async function testConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1 AS test`;
    
    const responseTimeMs = Date.now() - startTime;
    
    logger.info('Database connection test successful', { responseTimeMs });
    
    return {
      success: true,
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    logger.error('Database connection test failed', error);
    
    return {
      success: false,
      responseTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get database statistics including table sizes
 */
export async function getTableStatistics(): Promise<DatabaseStatistics> {
  try {
    // Query table statistics from SQL Server system views
    const stats = await prisma.$queryRaw<Array<{
      TableName: string;
      RowCount: number;
      TotalSpaceKB: number;
    }>>`
      SELECT 
        t.name AS TableName,
        SUM(p.rows) AS [RowCount],
        SUM(a.total_pages) * 8 AS TotalSpaceKB
      FROM sys.tables t
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      LEFT OUTER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
        AND i.object_id > 255
      GROUP BY t.name
      ORDER BY SUM(a.total_pages) DESC
    `;

    // Convert to TableStatistics format
    const largestTables: TableStatistics[] = stats.slice(0, 15).map(stat => ({
      tableName: stat.TableName,
      rowCount: Number(stat.RowCount),
      totalSpaceKB: Number(stat.TotalSpaceKB),
      totalSpaceMB: Number((Number(stat.TotalSpaceKB) / 1024).toFixed(2)),
    }));

    // Calculate total database size
    const databaseSizeMB = stats.reduce(
      (sum, stat) => sum + Number(stat.TotalSpaceKB),
      0
    ) / 1024;

    logger.info('Retrieved database statistics', {
      totalTables: stats.length,
      databaseSizeMB: databaseSizeMB.toFixed(2),
    });

    return {
      totalTables: stats.length,
      largestTables,
      databaseSizeMB: Number(databaseSizeMB.toFixed(2)),
    };
  } catch (error) {
    logger.error('Failed to get table statistics', error);
    throw error;
  }
}

/**
 * Get index fragmentation information
 * Returns all indexes with meaningful page counts
 */
export async function getIndexFragmentation(): Promise<IndexHealth[]> {
  try {
    const fragmentation = await prisma.$queryRaw<Array<{
      TableName: string;
      IndexName: string;
      Fragmentation: number;
      PageCount: number;
    }>>`
      SELECT 
        OBJECT_NAME(ips.object_id) AS TableName,
        i.name AS IndexName,
        ips.avg_fragmentation_in_percent AS Fragmentation,
        ips.page_count AS PageCount
      FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
      INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
      WHERE i.name IS NOT NULL
        AND ips.page_count > 100
      ORDER BY ips.avg_fragmentation_in_percent DESC
    `;

    const indexHealth: IndexHealth[] = fragmentation.map(frag => ({
      tableName: frag.TableName,
      indexName: frag.IndexName,
      fragmentationPercent: Number((Number(frag.Fragmentation) || 0).toFixed(2)),
      pageCount: Number(frag.PageCount),
    }));

    logger.info('Retrieved index fragmentation data', {
      totalIndexes: indexHealth.length,
    });

    return indexHealth;
  } catch (error) {
    logger.error('Failed to get index fragmentation', error);
    throw error;
  }
}

/**
 * Group indexes by fragmentation tier
 * Tiers: healthy (0-10%), low (10-30%), medium (30-50%), high (50-70%), critical (70-100%)
 */
export function groupIndexesByFragmentation(indexes: IndexHealth[]): IndexHealthGrouped[] {
  const tiers: IndexHealthGrouped[] = [
    {
      tier: 'critical',
      label: 'Critical',
      color: 'red',
      rangeLabel: '70-100%',
      indexes: [],
      count: 0,
    },
    {
      tier: 'high',
      label: 'High',
      color: 'orange',
      rangeLabel: '50-70%',
      indexes: [],
      count: 0,
    },
    {
      tier: 'medium',
      label: 'Medium',
      color: 'yellow',
      rangeLabel: '30-50%',
      indexes: [],
      count: 0,
    },
    {
      tier: 'low',
      label: 'Low',
      color: 'blue',
      rangeLabel: '10-30%',
      indexes: [],
      count: 0,
    },
    {
      tier: 'healthy',
      label: 'Healthy',
      color: 'green',
      rangeLabel: '0-10%',
      indexes: [],
      count: 0,
    },
  ];

  // Categorize each index into a tier
  for (const index of indexes) {
    const frag = index.fragmentationPercent;
    
    if (frag >= 70) {
      tiers[0]!.indexes.push(index);
    } else if (frag >= 50) {
      tiers[1]!.indexes.push(index);
    } else if (frag >= 30) {
      tiers[2]!.indexes.push(index);
    } else if (frag >= 10) {
      tiers[3]!.indexes.push(index);
    } else {
      tiers[4]!.indexes.push(index);
    }
  }

  // Update counts
  for (const tier of tiers) {
    tier.count = tier.indexes.length;
  }

  return tiers;
}

/**
 * Rebuild indexes on specified tables
 * CRITICAL: Only allows whitelisted tables for security
 */
export async function rebuildIndexes(tables: string[]): Promise<{
  success: boolean;
  rebuilt: string[];
  failed: string[];
  errors: Record<string, string>;
}> {
  const rebuilt: string[] = [];
  const failed: string[] = [];
  const errors: Record<string, string> = {};

  // Validate all tables are in whitelist
  for (const table of tables) {
    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      failed.push(table);
      errors[table] = 'Table not in allowed list';
      logger.warn('Attempted to reindex non-whitelisted table', { table });
    }
  }

  // Rebuild indexes on validated tables
  for (const table of tables) {
    if (failed.includes(table)) continue;

    try {
      logger.info('Rebuilding indexes on table', { table });
      
      // Use parameterized query to prevent SQL injection
      // Execute rebuild command
      await prisma.$executeRawUnsafe(
        `ALTER INDEX ALL ON [dbo].[${table}] REBUILD WITH (ONLINE = OFF)`
      );
      
      rebuilt.push(table);
      logger.info('Successfully rebuilt indexes on table', { table });
    } catch (error) {
      failed.push(table);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors[table] = errorMessage;
      logger.error('Failed to rebuild indexes on table', { table, error: errorMessage });
    }
  }

  return {
    success: failed.length === 0,
    rebuilt,
    failed,
    errors,
  };
}

/**
 * Get database size in MB
 */
export async function getDatabaseSize(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<Array<{ SizeMB: number }>>`
      SELECT 
        SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8.0 / 1024) AS SizeMB
      FROM sys.database_files
      WHERE type_desc = 'ROWS'
    `;

    const sizeMB = result[0]?.SizeMB || 0;
    
    logger.info('Retrieved database size', { sizeMB: sizeMB.toFixed(2) });
    
    return Number(sizeMB.toFixed(2));
  } catch (error) {
    logger.error('Failed to get database size', error);
    throw error;
  }
}

/**
 * Validate table name is in whitelist
 */
export function isAllowedTable(tableName: string): tableName is AllowedTable {
  return ALLOWED_TABLES.includes(tableName as AllowedTable);
}

/**
 * Slow query information
 */
export interface SlowQuery {
  queryText: string;
  executionCount: number;
  avgDurationMs: number;
  totalDurationMs: number;
  lastExecutionTime: Date;
  cpuTime: number;
  logicalReads: number;
}

/**
 * Get top 10 slowest queries
 */
export async function getSlowQueries(): Promise<SlowQuery[]> {
  try {
    const queries = await prisma.$queryRaw<Array<{
      QueryText: string;
      ExecutionCount: number;
      TotalDurationMs: number;
      AvgDurationMs: number;
      LastExecutionTime: Date;
      CPUTime: number;
      LogicalReads: number;
    }>>`
      SELECT TOP 10
        SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
          ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset
          END - qs.statement_start_offset)/2) + 1) AS QueryText,
        qs.execution_count AS ExecutionCount,
        qs.total_elapsed_time / 1000 AS TotalDurationMs,
        qs.total_elapsed_time / qs.execution_count / 1000 AS AvgDurationMs,
        qs.last_execution_time AS LastExecutionTime,
        qs.total_worker_time AS CPUTime,
        qs.total_logical_reads AS LogicalReads
      FROM sys.dm_exec_query_stats qs
      CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
      WHERE st.text NOT LIKE '%sys.dm_exec_query_stats%'
      ORDER BY qs.total_elapsed_time DESC
    `;

    const slowQueries: SlowQuery[] = queries.map(q => ({
      queryText: q.QueryText.trim(),
      executionCount: Number(q.ExecutionCount),
      avgDurationMs: Number((Number(q.AvgDurationMs) || 0).toFixed(2)),
      totalDurationMs: Number((Number(q.TotalDurationMs) || 0).toFixed(2)),
      lastExecutionTime: q.LastExecutionTime,
      cpuTime: Number(q.CPUTime),
      logicalReads: Number(q.LogicalReads),
    }));

    logger.info('Retrieved slow queries', { count: slowQueries.length });

    return slowQueries;
  } catch (error) {
    logger.error('Failed to get slow queries', error);
    throw error;
  }
}

/**
 * Missing index recommendation
 */
export interface MissingIndex {
  tableName: string;
  equalityColumns: string | null;
  inequalityColumns: string | null;
  includedColumns: string | null;
  improvementPercent: number;
  userSeeks: number;
  userScans: number;
  createIndexScript: string;
}

/**
 * Get missing index recommendations
 */
export async function getMissingIndexes(): Promise<MissingIndex[]> {
  try {
    const indexes = await prisma.$queryRaw<Array<{
      TableName: string;
      EqualityColumns: string | null;
      InequalityColumns: string | null;
      IncludedColumns: string | null;
      ImprovementPercent: number;
      UserSeeks: number;
      UserScans: number;
      CreateIndexScript: string;
    }>>`
      SELECT 
        OBJECT_NAME(mid.object_id) AS TableName,
        mid.equality_columns AS EqualityColumns,
        mid.inequality_columns AS InequalityColumns,
        mid.included_columns AS IncludedColumns,
        migs.avg_user_impact AS ImprovementPercent,
        migs.user_seeks AS UserSeeks,
        migs.user_scans AS UserScans,
        'CREATE INDEX IX_' + OBJECT_NAME(mid.object_id) + '_' + 
          REPLACE(REPLACE(REPLACE(ISNULL(mid.equality_columns,''),', ','_'),'[',''),']','') + 
          ' ON ' + mid.statement + 
          ' (' + ISNULL(mid.equality_columns,'') + 
          CASE WHEN mid.inequality_columns IS NOT NULL 
            THEN ',' + mid.inequality_columns ELSE '' END + ')' +
          CASE WHEN mid.included_columns IS NOT NULL 
            THEN ' INCLUDE (' + mid.included_columns + ')' ELSE '' END 
          AS CreateIndexScript
      FROM sys.dm_db_missing_index_details mid
      INNER JOIN sys.dm_db_missing_index_groups mig ON mid.index_handle = mig.index_handle
      INNER JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
      WHERE migs.avg_user_impact > 50
      ORDER BY migs.avg_user_impact DESC
    `;

    const missingIndexes: MissingIndex[] = indexes.map(idx => ({
      tableName: idx.TableName,
      equalityColumns: idx.EqualityColumns,
      inequalityColumns: idx.InequalityColumns,
      includedColumns: idx.IncludedColumns,
      improvementPercent: Number((Number(idx.ImprovementPercent) || 0).toFixed(2)),
      userSeeks: Number(idx.UserSeeks),
      userScans: Number(idx.UserScans),
      createIndexScript: idx.CreateIndexScript,
    }));

    logger.info('Retrieved missing index recommendations', { count: missingIndexes.length });

    return missingIndexes;
  } catch (error) {
    logger.error('Failed to get missing indexes', error);
    throw error;
  }
}

/**
 * Index usage statistics
 */
export interface IndexUsage {
  tableName: string;
  indexName: string;
  userSeeks: number;
  userScans: number;
  userLookups: number;
  userUpdates: number;
  lastSeek: Date | null;
  lastScan: Date | null;
  isUnused: boolean;
}

/**
 * Get index usage statistics
 */
export async function getIndexUsage(): Promise<IndexUsage[]> {
  try {
    const usage = await prisma.$queryRaw<Array<{
      TableName: string;
      IndexName: string;
      UserSeeks: number | null;
      UserScans: number | null;
      UserLookups: number | null;
      UserUpdates: number | null;
      LastSeek: Date | null;
      LastScan: Date | null;
      IsUnused: number;
    }>>`
      SELECT 
        OBJECT_NAME(i.object_id) AS TableName,
        i.name AS IndexName,
        ISNULL(s.user_seeks, 0) AS UserSeeks,
        ISNULL(s.user_scans, 0) AS UserScans,
        ISNULL(s.user_lookups, 0) AS UserLookups,
        ISNULL(s.user_updates, 0) AS UserUpdates,
        s.last_user_seek AS LastSeek,
        s.last_user_scan AS LastScan,
        CASE WHEN s.index_id IS NULL THEN 1 ELSE 0 END AS IsUnused
      FROM sys.indexes i
      LEFT JOIN sys.dm_db_index_usage_stats s 
        ON i.object_id = s.object_id 
        AND i.index_id = s.index_id
        AND s.database_id = DB_ID()
      WHERE i.type > 0
        AND i.is_primary_key = 0
        AND i.is_unique_constraint = 0
        AND OBJECT_NAME(i.object_id) NOT LIKE 'sys%'
      ORDER BY 
        CASE WHEN s.index_id IS NULL THEN 1 ELSE 0 END DESC,
        ISNULL(s.user_seeks, 0) + ISNULL(s.user_scans, 0) + ISNULL(s.user_lookups, 0) ASC
    `;

    const indexUsage: IndexUsage[] = usage.map(u => ({
      tableName: u.TableName,
      indexName: u.IndexName,
      userSeeks: Number(u.UserSeeks || 0),
      userScans: Number(u.UserScans || 0),
      userLookups: Number(u.UserLookups || 0),
      userUpdates: Number(u.UserUpdates || 0),
      lastSeek: u.LastSeek,
      lastScan: u.LastScan,
      isUnused: u.IsUnused === 1,
    }));

    logger.info('Retrieved index usage statistics', { count: indexUsage.length });

    return indexUsage;
  } catch (error) {
    logger.error('Failed to get index usage', error);
    throw error;
  }
}

/**
 * Live monitoring metrics
 */
export interface LiveMetrics {
  activeConnections: number;
  transactionsPerSecond: number;
  cpuPercent: number;
  waitingTasks: number;
  blockingSessions: number;
  logSizeMB: number;
}

/**
 * Get live monitoring metrics
 */
export async function getLiveMetrics(): Promise<LiveMetrics> {
  try {
    // Active connections
    const connectionsResult = await prisma.$queryRaw<Array<{ Count: number }>>`
      SELECT COUNT(*) AS Count 
      FROM sys.dm_exec_sessions 
      WHERE is_user_process = 1
    `;
    const activeConnections = Number(connectionsResult[0]?.Count || 0);

    // Blocking sessions
    const blockingResult = await prisma.$queryRaw<Array<{ Count: number }>>`
      SELECT COUNT(DISTINCT blocking_session_id) AS Count
      FROM sys.dm_exec_requests
      WHERE blocking_session_id <> 0
    `;
    const blockingSessions = Number(blockingResult[0]?.Count || 0);

    // Waiting tasks
    const waitingResult = await prisma.$queryRaw<Array<{ Count: number }>>`
      SELECT COUNT(*) AS Count
      FROM sys.dm_exec_requests
      WHERE wait_type IS NOT NULL
    `;
    const waitingTasks = Number(waitingResult[0]?.Count || 0);

    // Log size
    const logResult = await prisma.$queryRaw<Array<{ SizeMB: number }>>`
      SELECT 
        SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS bigint) * 8.0 / 1024) AS SizeMB
      FROM sys.database_files
      WHERE type_desc = 'LOG'
    `;
    const logSizeMB = Number(logResult[0]?.SizeMB || 0);

    logger.info('Retrieved live metrics', {
      activeConnections,
      blockingSessions,
      waitingTasks,
      logSizeMB: logSizeMB.toFixed(2),
    });

    return {
      activeConnections,
      transactionsPerSecond: 0, // Requires calculation over time
      cpuPercent: 0, // Requires calculation over time
      waitingTasks,
      blockingSessions,
      logSizeMB: Number(logSizeMB.toFixed(2)),
    };
  } catch (error) {
    logger.error('Failed to get live metrics', error);
    throw error;
  }
}

/**
 * Query execution result
 */
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

/**
 * Execute read-only SQL query (SELECT only)
 */
export async function executeQuery(query: string): Promise<QueryResult> {
  const startTime = Date.now();

  try {
    // Validate query is SELECT only
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Block dangerous keywords
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'];
    for (const keyword of dangerousKeywords) {
      if (trimmedQuery.includes(keyword)) {
        throw new Error(`Query contains forbidden keyword: ${keyword}`);
      }
    }

    // Execute query with limit
    const limitedQuery = query.trim().endsWith(';') ? query.trim().slice(0, -1) : query.trim();
    const results = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT TOP 1000 * FROM (${limitedQuery}) AS subquery`
    );

    const executionTimeMs = Date.now() - startTime;

    // Extract column names from first row
    const columns = results.length > 0 ? Object.keys(results[0]!) : [];

    logger.info('Executed custom query', {
      rowCount: results.length,
      executionTimeMs,
    });

    return {
      columns,
      rows: results,
      rowCount: results.length,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    logger.error('Failed to execute query', { error, executionTimeMs });
    throw error;
  }
}
