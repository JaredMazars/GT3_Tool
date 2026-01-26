'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Activity,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HardDrive,
  Gauge,
  TrendingUp,
  FileSearch,
  BarChart3,
  Code,
  Clock,
  AlertCircle,
  Copy,
  Download,
  ChevronDown,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';
import { LoadingSpinner, Button, Card, Badge } from '@/components/ui';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { AlertModal } from '@/components/shared/AlertModal';
import { ProcessingModal } from '@/components/shared/ProcessingModal';
import { SqlEditorWithLanguage as SqlEditor } from '@/components/ui/SqlEditor';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Types
type TabType =
  | 'dashboard'
  | 'connection'
  | 'statistics'
  | 'indexes'
  | 'performance'
  | 'monitoring'
  | 'sql-editor'
  | 'cache';

type PerformanceSubTab = 'slow-queries' | 'missing-indexes' | 'index-usage';

interface ConnectionTestResult {
  success: boolean;
  responseTimeMs: number;
  error?: string;
}

interface TableStatistics {
  tableName: string;
  rowCount: number;
  totalSpaceKB: number;
  totalSpaceMB: number;
}

interface DatabaseStatistics {
  totalTables: number;
  largestTables: TableStatistics[];
  databaseSizeMB: number;
}

interface IndexHealth {
  tableName: string;
  indexName: string;
  fragmentationPercent: number;
  pageCount: number;
}

interface IndexHealthGrouped {
  tier: 'healthy' | 'low' | 'medium' | 'high' | 'critical';
  label: string;
  color: string;
  rangeLabel: string;
  indexes: IndexHealth[];
  count: number;
}

interface SlowQuery {
  queryText: string;
  executionCount: number;
  avgDurationMs: number;
  totalDurationMs: number;
  lastExecutionTime: Date;
  cpuTime: number;
  logicalReads: number;
}

interface MissingIndex {
  tableName: string;
  equalityColumns: string | null;
  inequalityColumns: string | null;
  includedColumns: string | null;
  improvementPercent: number;
  userSeeks: number;
  userScans: number;
  createIndexScript: string;
}

interface IndexUsage {
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

interface LiveMetrics {
  activeConnections: number;
  transactionsPerSecond: number;
  cpuPercent: number;
  waitingTasks: number;
  blockingSessions: number;
  logSizeMB: number;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

interface MetricsHistory {
  time: string;
  connections: number;
  blocking: number;
  waiting: number;
}

export default function DatabaseManagementPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [performanceSubTab, setPerformanceSubTab] = useState<PerformanceSubTab>('slow-queries');

  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(false);
  const [loadingMissingIndexes, setLoadingMissingIndexes] = useState(false);
  const [loadingIndexUsage, setLoadingIndexUsage] = useState(false);
  const [loadingLiveMetrics, setLoadingLiveMetrics] = useState(false);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearingQueryStats, setClearingQueryStats] = useState(false);

  // Data states
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [stats, setStats] = useState<DatabaseStatistics | null>(null);
  const [indexes, setIndexes] = useState<IndexHealth[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [missingIndexes, setMissingIndexes] = useState<MissingIndex[]>([]);
  const [indexUsage, setIndexUsage] = useState<IndexUsage[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistory[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT TOP 100 * FROM Task');

  // Selection states
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(
    new Set(['critical', 'high', 'medium'])
  );

  // Health state
  const [healthScore, setHealthScore] = useState<number>(0);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-refresh live metrics when on monitoring tab
  useEffect(() => {
    if (activeTab === 'monitoring') {
      fetchLiveMetrics();
      const interval = setInterval(() => {
        fetchLiveMetrics();
      }, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [activeTab]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      await Promise.all([fetchStats(), fetchIndexes()]);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load database information',
        variant: 'error',
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const calculateHealthScore = useCallback(() => {
    if (!stats || !connectionResult) return;

    let score = 100;

    // Connection speed (30% weight)
    if (connectionResult.responseTimeMs > 500) score -= 30;
    else if (connectionResult.responseTimeMs > 200) score -= 15;
    else if (connectionResult.responseTimeMs > 100) score -= 5;

    // Index health (40% weight)
    const criticalIndexes = indexes.filter((idx) => idx.fragmentationPercent >= 70).length;
    const warningIndexes = indexes.filter(
      (idx) => idx.fragmentationPercent >= 50 && idx.fragmentationPercent < 70
    ).length;
    score -= criticalIndexes * 10;
    score -= warningIndexes * 5;

    // Database size (20% weight)
    if (stats.databaseSizeMB > 50000) score -= 20;
    else if (stats.databaseSizeMB > 25000) score -= 10;

    // Alerts (10% weight)
    const totalAlerts = criticalIndexes + warningIndexes;
    score -= Math.min(totalAlerts, 10);

    const finalScore = Math.max(0, Math.min(100, score));
    setHealthScore(finalScore);

    if (finalScore >= 80) setHealthStatus('healthy');
    else if (finalScore >= 60) setHealthStatus('warning');
    else setHealthStatus('critical');
  }, [stats, connectionResult, indexes]);

  useEffect(() => {
    calculateHealthScore();
  }, [calculateHealthScore]);

  // Fetch functions
  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/admin/database/connection');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Connection test failed');
      setConnectionResult(data.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Connection Test Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/admin/database/stats');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch statistics');
      setStats(data.data);
    } catch (error) {
      throw error;
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchIndexes = async () => {
    setLoadingIndexes(true);
    try {
      const response = await fetch('/api/admin/database/indexes');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch indexes');
      setIndexes(data.data);
    } catch (error) {
      throw error;
    } finally {
      setLoadingIndexes(false);
    }
  };

  const fetchSlowQueries = async () => {
    setLoadingSlowQueries(true);
    try {
      const response = await fetch('/api/admin/database/queries/slow');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch slow queries');
      setSlowQueries(data.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load slow queries',
        variant: 'error',
      });
    } finally {
      setLoadingSlowQueries(false);
    }
  };

  const fetchMissingIndexes = async () => {
    setLoadingMissingIndexes(true);
    try {
      const response = await fetch('/api/admin/database/indexes/missing');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch missing indexes');
      setMissingIndexes(data.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load missing indexes',
        variant: 'error',
      });
    } finally {
      setLoadingMissingIndexes(false);
    }
  };

  const fetchIndexUsage = async () => {
    setLoadingIndexUsage(true);
    try {
      const response = await fetch('/api/admin/database/indexes/usage');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch index usage');
      setIndexUsage(data.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load index usage statistics',
        variant: 'error',
      });
    } finally {
      setLoadingIndexUsage(false);
    }
  };

  const fetchLiveMetrics = async () => {
    setLoadingLiveMetrics(true);
    try {
      const response = await fetch('/api/admin/database/monitoring/live');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch live metrics');
      
      const metrics = data.data;
      setLiveMetrics(metrics);

      // Add to history for chart
      const now = new Date().toLocaleTimeString();
      setMetricsHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            time: now,
            connections: metrics.activeConnections,
            blocking: metrics.blockingSessions,
            waiting: metrics.waitingTasks,
          },
        ];
        // Keep last 60 data points
        return newHistory.slice(-60);
      });
    } catch (error) {
      console.error('Failed to fetch live metrics:', error);
    } finally {
      setLoadingLiveMetrics(false);
    }
  };

  const executeCustomQuery = async () => {
    if (!sqlQuery.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Please enter a SQL query',
        variant: 'warning',
      });
      return;
    }

    setExecutingQuery(true);
    try {
      const response = await fetch('/api/admin/database/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Query execution failed');
      setQueryResult(data.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Query Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setExecutingQuery(false);
    }
  };

  const handleReindex = () => {
    if (selectedTables.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Tables Selected',
        message: 'Please select at least one table to reindex.',
        variant: 'warning',
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Rebuild Indexes',
      message: `Are you sure you want to rebuild indexes on ${selectedTables.length} table(s)? This operation may take several minutes and cannot be undone.`,
      variant: 'warning',
      onConfirm: executeReindex,
    });
  };

  const executeReindex = async () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    setReindexing(true);

    try {
      const response = await fetch('/api/admin/database/reindex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: selectedTables }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reindex operation failed');

      const result = data.data;

      setAlertModal({
        isOpen: true,
        title: 'Reindex Complete',
        message: `Successfully rebuilt indexes on ${result.rebuilt.length} table(s).${
          result.failed.length > 0 ? ` Failed: ${result.failed.join(', ')}` : ''
        }`,
        variant: result.success ? 'success' : 'warning',
      });

      setSelectedTables([]);
      await fetchIndexes();
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Reindex Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setReindexing(false);
    }
  };

  const handleClearCache = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Cache',
      message:
        'Are you sure you want to clear the database cache? This will temporarily reduce performance until the cache is rebuilt.',
      variant: 'warning',
      onConfirm: executeClearCache,
    });
  };

  const executeClearCache = async () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    setClearingCache(true);

    try {
      const response = await fetch('/api/admin/database/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Cache clear failed');

      setAlertModal({
        isOpen: true,
        title: 'Cache Cleared',
        message: `Successfully cleared ${data.data.cleared} cache entries.`,
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Cache Clear Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setClearingCache(false);
    }
  };

  const handleClearQueryStats = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Query Statistics',
      message:
        'This will clear SQL Server\'s query execution statistics (plan cache). All slow query data will be reset and monitoring will start fresh. This may temporarily impact database performance as execution plans are rebuilt.',
      variant: 'warning',
      onConfirm: executeClearQueryStats,
    });
  };

  const executeClearQueryStats = async () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    setClearingQueryStats(true);

    try {
      const response = await fetch('/api/admin/database/queries/slow', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Query stats clear failed');

      setAlertModal({
        isOpen: true,
        title: 'Query Statistics Cleared',
        message: 'Successfully cleared SQL Server query execution statistics. Slow query monitoring has been reset.',
        variant: 'success',
      });

      // Refresh slow queries to show empty state
      await fetchSlowQueries();
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Clear Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    } finally {
      setClearingQueryStats(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  const getFragmentationColor = (fragmentation: number) => {
    if (fragmentation >= 70) return 'red';
    if (fragmentation >= 50) return 'orange';
    if (fragmentation >= 30) return 'yellow';
    return 'green';
  };

  const getDurationColor = (ms: number) => {
    if (ms >= 1000) return 'red';
    if (ms >= 500) return 'orange';
    return 'green';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setAlertModal({
      isOpen: true,
      title: 'Copied',
      message: 'Copied to clipboard',
      variant: 'success',
    });
  };

  const copyQueryToEditor = (queryText: string) => {
    // Copy to clipboard (existing functionality)
    navigator.clipboard.writeText(queryText);
    
    // Set query in SQL editor
    setSqlQuery(queryText);
    
    // Switch to SQL editor tab
    setActiveTab('sql-editor');
    
    // Show success message
    setAlertModal({
      isOpen: true,
      title: 'Query Copied',
      message: 'Query copied to SQL editor. You can now execute or modify it.',
      variant: 'success',
    });
  };

  const identifyApiEndpoint = (queryText: string): string => {
    const upperQuery = queryText.toUpperCase();
    
    // Helper: Check if query contains table reference (more flexible)
    const hasTable = (tableName: string) => {
      return upperQuery.includes(tableName.toUpperCase());
    };
    
    // Task-related queries (enhanced)
    if (hasTable('TASK')) {
      if (hasTable('TASKTEAM')) return '/api/tasks/[id]/team';
      if (hasTable('TASKTOOL')) return '/api/tasks/[id]/tools';
      if (hasTable('CLIENTACCEPTANCE')) return '/api/tasks/[id]/acceptance';
      if (upperQuery.includes('GROUP BY') && hasTable('GSTASKID')) 
        return '/api/my-reports/tasks-by-group';
      return '/api/tasks';
    }
    
    // Client-related queries (enhanced)
    if (hasTable('CLIENT')) {
      if (hasTable('CLIENTACCEPTANCE')) return '/api/clients/[id]/acceptance';
      if (hasTable('GROUP') || upperQuery.includes('GROUPCODE')) 
        return '/api/clients/filters';
      if (upperQuery.includes('ANALYTICS')) return '/api/clients/[id]/analytics';
      return '/api/clients';
    }
    
    // WIP-related queries (enhanced)
    if (hasTable('WIP') || hasTable('WIPTRANSACTIONS')) {
      if (upperQuery.includes('PROFITABILITY')) return '/api/my-reports/profitability';
      if (upperQuery.includes('GROUP BY')) return '/api/wip/aggregated';
      if (hasTable('GSTASKID')) return '/api/tasks/[id]/wip';
      return '/api/wip';
    }
    
    // Debtor queries (new)
    if (hasTable('DEBTOR') || hasTable('DRSTRANSACTIONS')) {
      if (hasTable('GSTASKID')) return '/api/tasks/[id]/debtors';
      if (hasTable('GSCLIENTID')) return '/api/clients/[id]/debtors';
      return '/api/debtors';
    }
    
    // Approval-related queries
    if (hasTable('APPROVAL')) return '/api/approvals';
    
    // Employee-related queries (enhanced)
    if (hasTable('EMPLOYEE')) {
      if (hasTable('SERVICELINE')) return '/api/service-lines/staff';
      if (hasTable('USER')) return '/api/employees/users';
      return '/api/employees';
    }
    
    // Document vault queries (new)
    if (hasTable('DOCUMENTVAULT') || hasTable('VAULTDOCUMENT')) {
      return '/api/document-vault';
    }
    
    // Review notes queries (new)
    if (hasTable('REVIEWNOTE')) {
      return '/api/review-notes';
    }
    
    // Tool queries (new)
    if (hasTable('TOOL') && !hasTable('TASKTOOL')) {
      return '/api/tools';
    }
    
    // Report queries
    if (upperQuery.includes('OVERVIEW') || upperQuery.includes('FISCAL')) {
      return '/api/my-reports/overview';
    }
    
    // Service line queries
    if (hasTable('SERVICELINEMASTERUSED') || hasTable('SERVICELINEEXTERNAL')) {
      return '/api/service-lines';
    }
    
    // Workspace analytics
    if (upperQuery.includes('COUNT(') && upperQuery.includes('DISTINCT')) {
      return '/api/workspace-counts';
    }
    
    // Analytics patterns (before unknown)
    if (upperQuery.includes('GROUP BY') || upperQuery.includes('SUM(') || 
        upperQuery.includes('AVG(') || upperQuery.includes('COUNT(')) {
      return 'Analytics Query';
    }
    
    // Improved fallback - try to identify main table
    const tables = ['TASK', 'CLIENT', 'WIP', 'EMPLOYEE', 'APPROVAL', 'DEBTOR'];
    for (const table of tables) {
      if (hasTable(table)) return `${table.charAt(0) + table.slice(1).toLowerCase()} Query`;
    }
    
    // Better fallback than "Unknown API"
    return 'Database Query';
  };

  const toggleTier = (tier: string) => {
    setExpandedTiers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tier)) {
        newSet.delete(tier);
      } else {
        newSet.add(tier);
      }
      return newSet;
    });
  };

  const groupIndexesByFragmentation = (indexes: IndexHealth[]): IndexHealthGrouped[] => {
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
  };

  const exportToCSV = () => {
    if (!queryResult || queryResult.rows.length === 0) return;

    const csv = [
      queryResult.columns.join(','),
      ...queryResult.rows.map((row) =>
        queryResult.columns.map((col) => JSON.stringify(row[col] ?? '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load data when switching to performance tab
  useEffect(() => {
    if (activeTab === 'performance') {
      if (performanceSubTab === 'slow-queries' && slowQueries.length === 0) {
        fetchSlowQueries();
      } else if (performanceSubTab === 'missing-indexes' && missingIndexes.length === 0) {
        fetchMissingIndexes();
      } else if (performanceSubTab === 'index-usage' && indexUsage.length === 0) {
        fetchIndexUsage();
      }
    }
  }, [activeTab, performanceSubTab]);

  // Show loading spinner on initial load
  if (initialLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-forvis-gray-600">Loading database management tools...</p>
        </div>
      </div>
    );
  }

  const fragmentedIndexCount = indexes.filter((idx) => idx.fragmentationPercent >= 30).length;

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Gauge },
    { id: 'connection' as const, label: 'Connection', icon: Activity },
    { id: 'statistics' as const, label: 'Statistics', icon: HardDrive },
    {
      id: 'indexes' as const,
      label: 'Indexes',
      icon: AlertTriangle,
      badge: fragmentedIndexCount > 0 ? fragmentedIndexCount : undefined,
    },
    { id: 'performance' as const, label: 'Performance', icon: TrendingUp },
    { id: 'monitoring' as const, label: 'Monitoring', icon: BarChart3 },
    { id: 'sql-editor' as const, label: 'SQL Editor', icon: Code },
    { id: 'cache' as const, label: 'Cache', icon: Trash2 },
  ];

  const healthColor =
    healthStatus === 'healthy'
      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      : healthStatus === 'warning'
      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';

  const healthIcon =
    healthStatus === 'healthy' ? '✓' : healthStatus === 'warning' ? '⚠' : '✕';

  const healthText =
    healthStatus === 'healthy'
      ? 'All systems operational'
      : healthStatus === 'warning'
      ? 'Some issues detected'
      : 'Immediate attention required';

  const criticalIndexes = indexes.filter((idx) => idx.fragmentationPercent >= 70);
  const warningIndexes = indexes.filter(
    (idx) => idx.fragmentationPercent >= 50 && idx.fragmentationPercent < 70
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Health Indicator */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
          >
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-forvis-gray-900">Database Management</h1>
            <p className="text-sm text-forvis-gray-600 mt-1">
              Monitor and maintain database performance
            </p>
          </div>
        </div>

        {/* Overall Health Indicator */}
        {healthScore > 0 && (
          <div className="rounded-lg p-6 shadow-corporate" style={{ background: healthColor }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Database Health: {healthScore}/100
                </h2>
                <p className="text-white/80 mt-1">{healthText}</p>
              </div>
              <div className="text-6xl">{healthIcon}</div>
            </div>
            <div className="mt-4 bg-white/20 rounded-full h-3">
              <div
                className="bg-white rounded-full h-3 transition-all"
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-forvis-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${
                    isActive
                      ? 'border-forvis-blue-600 text-forvis-blue-600'
                      : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge color="red" className="ml-1">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                      Database Size
                    </p>
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                      {stats?.databaseSizeMB.toLocaleString() || 0} MB
                    </p>
                  </div>
                  <div
                    className="rounded-full p-2.5"
                    style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
                  >
                    <HardDrive className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                      Total Tables
                    </p>
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                      {stats?.totalTables || 0}
                    </p>
                  </div>
                  <div
                    className="rounded-full p-2.5"
                    style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
                  >
                    <Database className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                      Connection Speed
                    </p>
                    <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                      {connectionResult?.responseTimeMs || 0}ms
                    </p>
                  </div>
                  <div
                    className="rounded-full p-2.5"
                    style={{ background: 'linear-gradient(to bottom right, #5B93D7, #2E5AAC)' }}
                  >
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Alerts */}
            {(criticalIndexes.length > 0 ||
              warningIndexes.length > 0 ||
              (connectionResult && connectionResult.responseTimeMs > 200)) && (
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                    Critical Alerts
                  </h2>
                  <div className="space-y-4">
                    {criticalIndexes.length > 0 && (
                      <Card className="border-l-4 border-red-500">
                        <div className="p-4 flex items-start">
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-red-900">
                              {criticalIndexes.length} Critically Fragmented Indexes
                            </h3>
                            <p className="text-sm text-red-700 mt-1">
                              Indexes with &gt;70% fragmentation require immediate attention
                            </p>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setActiveTab('indexes')}
                              className="mt-2"
                            >
                              View Indexes →
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {warningIndexes.length > 0 && (
                      <Card className="border-l-4 border-orange-500">
                        <div className="p-4 flex items-start">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mr-3 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-orange-900">
                              {warningIndexes.length} Moderately Fragmented Indexes
                            </h3>
                            <p className="text-sm text-orange-700 mt-1">
                              Indexes with 50-70% fragmentation should be rebuilt soon
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setActiveTab('indexes')}
                              className="mt-2"
                            >
                              View Indexes →
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {connectionResult && connectionResult.responseTimeMs > 200 && (
                      <Card className="border-l-4 border-yellow-500">
                        <div className="p-4 flex items-start">
                          <Clock className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-yellow-900">Slow Connection</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                              Database connection is responding slower than expected (
                              {connectionResult.responseTimeMs}ms)
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setActiveTab('connection')}
                              className="mt-2"
                            >
                              Test Connection →
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* No Alerts Message */}
            {criticalIndexes.length === 0 &&
              warningIndexes.length === 0 &&
              (!connectionResult || connectionResult.responseTimeMs <= 200) && (
                <Card>
                  <div className="p-6 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-semibold text-forvis-gray-900">
                      All Systems Healthy
                    </p>
                    <p className="text-sm text-forvis-gray-600 mt-1">
                      No critical alerts or warnings detected
                    </p>
                  </div>
                </Card>
              )}
          </>
        )}

        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-forvis-blue-600" />
                  Connection Speed Test
                </h2>
                <Button onClick={runConnectionTest} disabled={testing} variant="secondary">
                  {testing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <Activity className="h-5 w-5 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>
              </div>

              {connectionResult && (
                <div className="flex items-center space-x-4">
                  {connectionResult.success ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-forvis-gray-900">
                          Connection Successful
                        </p>
                        <p className="text-sm text-forvis-gray-600">
                          Response time: {connectionResult.responseTimeMs}ms
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-8 w-8 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Connection Failed</p>
                        <p className="text-sm text-red-600">{connectionResult.error}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                  <HardDrive className="h-5 w-5 mr-2 text-forvis-blue-600" />
                  Database Statistics
                </h2>
                <Button onClick={fetchStats} disabled={loadingStats} variant="secondary" size="sm">
                  {loadingStats ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>

              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="md" />
                  <span className="ml-3 text-forvis-gray-600">Loading database statistics...</span>
                </div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div
                      className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                      style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
                    >
                      <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                        Total Tables
                      </p>
                      <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                        {stats.totalTables}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                      style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
                    >
                      <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                        Database Size
                      </p>
                      <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                        {stats.databaseSizeMB.toLocaleString()} MB
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                      style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
                    >
                      <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                        Largest Table
                      </p>
                      <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                        {stats.largestTables[0]?.tableName || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <h3 className="text-sm font-semibold text-forvis-gray-900 mb-3">
                      Largest Tables
                    </h3>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-forvis-gray-200">
                          <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                            Table Name
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                            Row Count
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                            Size (MB)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-forvis-gray-200">
                        {stats.largestTables.map((table) => (
                          <tr key={table.tableName} className="hover:bg-forvis-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-forvis-gray-900">
                              {table.tableName}
                            </td>
                            <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                              {table.rowCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                              {table.totalSpaceMB.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </Card>
        )}

        {/* Indexes Tab */}
        {activeTab === 'indexes' && (
          <>
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-forvis-blue-600" />
                    Index Health Monitor
                  </h2>
                  <Button
                    onClick={fetchIndexes}
                    disabled={loadingIndexes}
                    variant="secondary"
                    size="sm"
                  >
                    {loadingIndexes ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>

                {loadingIndexes ? (
                  <div className="text-center py-8">
                    <LoadingSpinner size="md" />
                    <p className="mt-2 text-sm text-forvis-gray-600">Analyzing index health...</p>
                  </div>
                ) : indexes.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-forvis-gray-600">No indexes found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupIndexesByFragmentation(indexes).map((tier) => (
                      <div key={tier.tier} className="border border-forvis-gray-200 rounded-lg">
                        {/* Tier Header */}
                        <button
                          onClick={() => toggleTier(tier.tier)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-forvis-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {expandedTiers.has(tier.tier) ? (
                              <ChevronDown className="h-5 w-5 text-forvis-gray-600" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-forvis-gray-600" />
                            )}
                            <h3 className="text-lg font-semibold text-forvis-gray-900">
                              {tier.label}
                            </h3>
                            <Badge color={tier.color}>{tier.rangeLabel}</Badge>
                            <span className="text-sm text-forvis-gray-600">
                              {tier.count} {tier.count === 1 ? 'index' : 'indexes'}
                            </span>
                          </div>
                          {tier.count > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const tierTables = tier.indexes.map((idx) => idx.tableName);
                                const allSelected = tierTables.every((table) =>
                                  selectedTables.includes(table)
                                );
                                if (allSelected) {
                                  setSelectedTables((prev) =>
                                    prev.filter((t) => !tierTables.includes(t))
                                  );
                                } else {
                                  setSelectedTables((prev) => [
                                    ...new Set([...prev, ...tierTables]),
                                  ]);
                                }
                              }}
                              className="text-sm text-forvis-blue-600 hover:underline"
                            >
                              {tier.indexes.every((idx) =>
                                selectedTables.includes(idx.tableName)
                              )
                                ? 'Deselect All'
                                : 'Select All'}
                            </button>
                          )}
                        </button>

                        {/* Tier Content */}
                        {expandedTiers.has(tier.tier) && tier.count > 0 && (
                          <div className="border-t border-forvis-gray-200">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-forvis-gray-200 bg-forvis-gray-50">
                                    <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                                      <input
                                        type="checkbox"
                                        onChange={(e) => {
                                          const tierTables = tier.indexes.map(
                                            (idx) => idx.tableName
                                          );
                                          if (e.target.checked) {
                                            setSelectedTables((prev) => [
                                              ...new Set([...prev, ...tierTables]),
                                            ]);
                                          } else {
                                            setSelectedTables((prev) =>
                                              prev.filter((t) => !tierTables.includes(t))
                                            );
                                          }
                                        }}
                                        checked={
                                          tier.indexes.length > 0 &&
                                          tier.indexes.every((idx) =>
                                            selectedTables.includes(idx.tableName)
                                          )
                                        }
                                        className="rounded"
                                      />
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                                      Table Name
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                                      Index Name
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                                      Fragmentation
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                                      Pages
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-forvis-gray-200">
                                  {tier.indexes.map((index, i) => (
                                    <tr key={i} className="hover:bg-forvis-gray-50">
                                      <td className="px-4 py-3">
                                        <input
                                          type="checkbox"
                                          checked={selectedTables.includes(index.tableName)}
                                          onChange={() => toggleTableSelection(index.tableName)}
                                          className="rounded"
                                        />
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-forvis-gray-900">
                                        {index.tableName}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-forvis-gray-600">
                                        {index.indexName}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <Badge
                                          color={getFragmentationColor(
                                            index.fragmentationPercent
                                          )}
                                        >
                                          {index.fragmentationPercent.toFixed(1)}%
                                        </Badge>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                                        {index.pageCount.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">
                  Reindex Operations
                </h2>
                <p className="text-sm text-forvis-gray-600 mb-4">
                  Select tables from the Index Health Monitor above and rebuild their indexes.
                  <span className="block mt-1 text-orange-600 font-medium">
                    ⚠️ This operation may take several minutes and will temporarily affect
                    performance.
                  </span>
                </p>
                <Button
                  onClick={handleReindex}
                  disabled={selectedTables.length === 0 || reindexing}
                  variant="primary"
                >
                  {reindexing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Rebuilding...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Rebuild Indexes ({selectedTables.length} selected)
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <>
            {/* Performance Sub-tabs */}
            <div className="border-b border-forvis-gray-200 -mt-2 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'slow-queries' as const, label: 'Slow Queries' },
                  { id: 'missing-indexes' as const, label: 'Missing Indexes' },
                  { id: 'index-usage' as const, label: 'Index Usage' },
                ].map((tab) => {
                  const isActive = performanceSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPerformanceSubTab(tab.id)}
                      className={`
                        py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                        ${
                          isActive
                            ? 'border-forvis-blue-600 text-forvis-blue-600'
                            : 'border-transparent text-forvis-gray-500 hover:text-forvis-gray-700 hover:border-forvis-gray-300'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Slow Queries */}
            {performanceSubTab === 'slow-queries' && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-forvis-blue-600" />
                        Slow Query Analyzer
                      </h2>
                      <div className="flex items-center mt-1 text-xs text-forvis-gray-600">
                        <Info className="h-3 w-3 mr-1" />
                        <span>API: </span>
                        <code className="ml-1 px-1.5 py-0.5 bg-forvis-gray-100 rounded text-forvis-blue-700 font-mono">
                          GET /api/admin/database/queries/slow
                        </code>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={fetchSlowQueries}
                        disabled={loadingSlowQueries || clearingQueryStats}
                        variant="secondary"
                        size="sm"
                      >
                        {loadingSlowQueries ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleClearQueryStats}
                        disabled={loadingSlowQueries || clearingQueryStats}
                        variant="danger"
                        size="sm"
                      >
                        {clearingQueryStats ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Statistics
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {loadingSlowQueries ? (
                    <div className="text-center py-8">
                      <LoadingSpinner size="md" />
                      <p className="mt-2 text-sm text-forvis-gray-600">
                        Analyzing query performance...
                      </p>
                    </div>
                  ) : slowQueries.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-forvis-gray-600">
                        No slow queries detected in cache
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {slowQueries.map((query, idx) => (
                        <Card key={idx} className="border border-forvis-gray-200">
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge color={getDurationColor(query.avgDurationMs)}>
                                    {query.avgDurationMs.toFixed(2)}ms avg
                                  </Badge>
                                  <span className="text-xs text-forvis-gray-600">
                                    {query.executionCount} executions
                                  </span>
                                </div>
                                <div className="flex items-center mb-2 text-xs text-forvis-gray-600">
                                  <Info className="h-3 w-3 mr-1" />
                                  <span>Likely API: </span>
                                  <code className="ml-1 px-1.5 py-0.5 bg-forvis-gray-100 rounded text-forvis-blue-700 font-mono">
                                    {identifyApiEndpoint(query.queryText)}
                                  </code>
                                </div>
                                <div className="relative">
                                  <pre
                                    className={`text-xs font-mono bg-forvis-gray-50 p-3 rounded overflow-x-auto ${
                                      expandedQuery === idx ? '' : 'max-h-20'
                                    }`}
                                  >
                                    {query.queryText}
                                  </pre>
                                  {query.queryText.length > 200 && (
                                    <button
                                      onClick={() =>
                                        setExpandedQuery(expandedQuery === idx ? null : idx)
                                      }
                                      className="text-xs text-forvis-blue-600 mt-1 hover:underline"
                                    >
                                      {expandedQuery === idx ? 'Show less' : 'Show more'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4 flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => copyToClipboard(query.queryText)}
                                  title="Copy to clipboard"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => copyQueryToEditor(query.queryText)}
                                  title="Open in SQL Editor"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-forvis-gray-200">
                              <div>
                                <p className="text-xs text-forvis-gray-600">Total Time</p>
                                <p className="text-sm font-medium text-forvis-gray-900">
                                  {query.totalDurationMs.toLocaleString()}ms
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-forvis-gray-600">CPU Time</p>
                                <p className="text-sm font-medium text-forvis-gray-900">
                                  {query.cpuTime.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-forvis-gray-600">Logical Reads</p>
                                <p className="text-sm font-medium text-forvis-gray-900">
                                  {query.logicalReads.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-forvis-gray-600">Last Executed</p>
                                <p className="text-sm font-medium text-forvis-gray-900">
                                  {new Date(query.lastExecutionTime).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Missing Indexes */}
            {performanceSubTab === 'missing-indexes' && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                      <FileSearch className="h-5 w-5 mr-2 text-forvis-blue-600" />
                      Missing Index Recommendations
                    </h2>
                    <Button
                      onClick={fetchMissingIndexes}
                      disabled={loadingMissingIndexes}
                      variant="secondary"
                      size="sm"
                    >
                      {loadingMissingIndexes ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>

                  {loadingMissingIndexes ? (
                    <div className="text-center py-8">
                      <LoadingSpinner size="md" />
                      <p className="mt-2 text-sm text-forvis-gray-600">
                        Analyzing index recommendations...
                      </p>
                    </div>
                  ) : missingIndexes.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-forvis-gray-600">
                        No missing index recommendations
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {missingIndexes.map((index, idx) => (
                        <Card key={idx} className="border border-forvis-gray-200">
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-forvis-gray-900">
                                  {index.tableName}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge color="blue" className="text-lg">
                                    {index.improvementPercent.toFixed(1)}% improvement
                                  </Badge>
                                  <span className="text-xs text-forvis-gray-600">
                                    {index.userSeeks} seeks, {index.userScans} scans
                                  </span>
                                </div>
                              </div>
                            </div>

                            {index.equalityColumns && (
                              <p className="text-sm text-forvis-gray-700 mb-1">
                                <span className="font-medium">Equality:</span>{' '}
                                {index.equalityColumns}
                              </p>
                            )}
                            {index.inequalityColumns && (
                              <p className="text-sm text-forvis-gray-700 mb-1">
                                <span className="font-medium">Inequality:</span>{' '}
                                {index.inequalityColumns}
                              </p>
                            )}
                            {index.includedColumns && (
                              <p className="text-sm text-forvis-gray-700 mb-3">
                                <span className="font-medium">Include:</span>{' '}
                                {index.includedColumns}
                              </p>
                            )}

                            <div className="relative">
                              <pre className="text-xs font-mono bg-forvis-gray-50 p-3 rounded overflow-x-auto">
                                {index.createIndexScript}
                              </pre>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => copyToClipboard(index.createIndexScript)}
                                className="absolute top-2 right-2"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Index Usage */}
            {performanceSubTab === 'index-usage' && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-forvis-blue-600" />
                      Index Usage Statistics
                    </h2>
                    <Button
                      onClick={fetchIndexUsage}
                      disabled={loadingIndexUsage}
                      variant="secondary"
                      size="sm"
                    >
                      {loadingIndexUsage ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>

                  {loadingIndexUsage ? (
                    <div className="text-center py-8">
                      <LoadingSpinner size="md" />
                      <p className="mt-2 text-sm text-forvis-gray-600">
                        Analyzing index usage...
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-forvis-gray-200">
                            <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                              Table Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                              Index Name
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                              Seeks
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                              Scans
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                              Lookups
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-forvis-gray-700 uppercase">
                              Updates
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-forvis-gray-200">
                          {indexUsage.map((usage, i) => (
                            <tr
                              key={i}
                              className={`hover:bg-forvis-gray-50 ${
                                usage.isUnused ? 'bg-red-50' : ''
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-forvis-gray-900">
                                {usage.tableName}
                              </td>
                              <td className="px-4 py-3 text-sm text-forvis-gray-600">
                                {usage.indexName}
                              </td>
                              <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                                {usage.userSeeks.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                                {usage.userScans.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                                {usage.userLookups.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-forvis-gray-600 text-right">
                                {usage.userUpdates.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {usage.isUnused ? (
                                  <Badge color="red">Unused</Badge>
                                ) : (
                                  <Badge color="green">Active</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                  Active Connections
                </p>
                <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                  {liveMetrics?.activeConnections || 0}
                </p>
              </div>

              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                  Blocking Sessions
                </p>
                <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                  {liveMetrics?.blockingSessions || 0}
                </p>
              </div>

              <div
                className="rounded-lg p-4 shadow-corporate border border-forvis-blue-100"
                style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
              >
                <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
                  Waiting Tasks
                </p>
                <p className="text-2xl font-bold mt-2 text-forvis-blue-600">
                  {liveMetrics?.waitingTasks || 0}
                </p>
              </div>
            </div>

            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">
                  Real-Time Activity
                </h2>
                {metricsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metricsHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="connections"
                        stroke="#2E5AAC"
                        name="Connections"
                      />
                      <Line type="monotone" dataKey="blocking" stroke="#EF4444" name="Blocking" />
                      <Line type="monotone" dataKey="waiting" stroke="#F59E0B" name="Waiting" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-forvis-gray-600">
                    Collecting metrics data...
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* SQL Editor Tab */}
        {activeTab === 'sql-editor' && (
          <Card>
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-forvis-gray-900 flex items-center">
                    <Code className="h-5 w-5 mr-2 text-forvis-blue-600" />
                    SQL Query Editor
                  </h2>
                </div>
                <p className="text-sm text-orange-600 font-medium">
                  ⚠️ Read-only mode: Only SELECT and WITH (CTE) queries are allowed
                </p>
              </div>

              <div className="mb-4">
                <SqlEditor
                  height="300px"
                  value={sqlQuery}
                  onChange={(value) => setSqlQuery(value || '')}
                />
              </div>

              <Button onClick={executeCustomQuery} disabled={executingQuery} variant="primary">
                {executingQuery ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Executing Query...
                  </>
                ) : (
                  <>
                    <Activity className="h-5 w-5 mr-2" />
                    Execute Query
                  </>
                )}
              </Button>

              {queryResult && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-forvis-gray-600">
                      {queryResult.rowCount} rows returned in {queryResult.executionTimeMs}ms
                    </div>
                    <Button size="sm" variant="secondary" onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-forvis-gray-200">
                      <thead>
                        <tr className="bg-forvis-gray-50 border-b border-forvis-gray-200">
                          {queryResult.columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-2 text-left text-xs font-medium text-forvis-gray-700 uppercase"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-forvis-gray-200">
                        {queryResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-forvis-gray-50">
                            {queryResult.columns.map((col) => (
                              <td
                                key={col}
                                className="px-4 py-2 text-sm text-forvis-gray-900 max-w-xs truncate"
                              >
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Cache Tab */}
        {activeTab === 'cache' && (
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-forvis-gray-900 mb-4">Cache Management</h2>
              <p className="text-sm text-forvis-gray-600 mb-4">
                Clear the Redis cache to force fresh data retrieval. Cache will be automatically
                rebuilt as needed.
              </p>
              <Button onClick={handleClearCache} disabled={clearingCache} variant="danger">
                {clearingCache ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Clearing Cache...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5 mr-2" />
                    Clear Cache
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />

      <ProcessingModal
        isOpen={reindexing}
        title="Rebuilding Indexes"
        message="Rebuilding indexes... This may take several minutes. Please do not close this window."
      />
    </div>
  );
}
