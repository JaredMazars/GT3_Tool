# Migration: Add Team Allocation Fields

This migration adds resource planning fields to the TaskTeam table to support Gantt-style team planning.

## Changes

- Added `startDate` (DateTime?) - When team member starts on task
- Added `endDate` (DateTime?) - When team member ends on task
- Added `allocatedHours` (Decimal?) - Total hours allocated to this task
- Added `allocatedPercentage` (Int?) - Percentage of capacity (0-100)
- Added `actualHours` (Decimal?) - Hours worked so far

## Indexes

- Index on `startDate` for date range queries
- Index on `endDate` for date range queries
- Composite index on `userId`, `startDate`, `endDate` for availability queries






















