# Business Development CRM Models Migration

## Overview
This migration adds comprehensive CRM functionality for Business Development tracking, similar to HubSpot.

## New Tables

### BDStage
- Customizable pipeline stages (Lead, Qualified, Proposal, Negotiation, Won, Lost)
- Configurable per service line with probability percentages
- Supports custom colors and ordering

### BDContact
- Prospect and client contact information
- Company and individual details
- Industry and sector classification
- Full contact details (email, phone, LinkedIn, etc.)

### BDOpportunity
- Main deal/opportunity tracking entity
- Links to contacts, stages, and service lines
- Tracks value, probability, expected close date
- Source tracking (referral, website, cold call, etc.)
- Conversion to Client record when won

### BDActivity
- Interaction and task tracking
- Activity types: meetings, calls, emails, tasks, notes
- Status tracking (scheduled, completed, cancelled)
- Due dates and completion tracking
- Links to opportunities and contacts

### BDProposal
- Proposal document management
- Version control
- Status tracking (draft, sent, viewed, accepted, rejected)
- File upload support
- Proposed value and validity tracking

### BDNote
- Internal notes about opportunities
- Privacy control (private vs team visibility)
- Full text content support

## Indexes
All tables include appropriate indexes for:
- Foreign key relationships
- Common query patterns (service line, status, dates)
- Performance optimization for filtering and sorting

## Integration
- Integrates with existing User model for assignment and creation tracking
- Respects service line permissions
- Can convert opportunities to Client records
- Links to existing notification system

## Seeding
After running this migration, seed default BD stages using the seed script:
```bash
npx ts-node scripts/seed-bd-stages.ts
```

## Default Stages
The system should be seeded with these default stages (probability in parentheses):
- Lead (10%)
- Qualified (25%)
- Proposal (50%)
- Negotiation (75%)
- Won (100%)
- Lost (0%)

