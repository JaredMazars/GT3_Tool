/**
 * Bug Report Types
 * Types for user-submitted bug reports
 */

export enum BugReportStatus {
  OPEN = 'OPEN',
  TESTING = 'TESTING',
  RESOLVED = 'RESOLVED',
}

export enum BugReportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface BugReport {
  id: number;
  reportedBy: string;
  reportedAt: Date;
  url: string;
  description: string;
  screenshotPath?: string;
  status: BugReportStatus;
  testedAt?: Date;
  testedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  priority: BugReportPriority;
}

export interface BugReportWithReporter extends BugReport {
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
  tester?: {
    id: string;
    name: string | null;
    email: string;
  };
  resolver?: {
    id: string;
    name: string | null;
    email: string;
  };
}
