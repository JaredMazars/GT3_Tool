# Add Non-Client Allocations

## Purpose
This migration adds support for non-client events (training, leave, etc.) in the planning system.

## Changes
1. **NonClientAllocation Table**: Stores non-client events (training, leave, sick leave, public holidays, personal time, administrative time)
2. **Event Types**: TRAINING, ANNUAL_LEAVE, SICK_LEAVE, PUBLIC_HOLIDAY, PERSONAL, ADMINISTRATIVE
3. **Automatic 100% Utilization**: Non-client events always have allocatedPercentage = 100

## Key Fields
- `userId`: User who has the non-client event
- `eventType`: Type of event (enum constraint)
- `startDate`/`endDate`: Date range for the event (inclusive)
- `allocatedHours`: Auto-calculated based on business days × 8
- `allocatedPercentage`: Always 100 (default)
- `notes`: Optional notes about the event
- `createdBy`: User who created the allocation

## Indexes
- `userId`: For querying user's events
- `userId + startDate + endDate`: For date range queries
- `eventType`: For filtering by event type

## Usage
Non-client events will:
- Display in the Gantt timeline with distinct colors
- Block client task allocations during their period
- Count as 100% utilization for resource planning
- Be managed through planning modals
