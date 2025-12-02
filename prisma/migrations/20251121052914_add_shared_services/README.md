# Add Shared Services Migration

## Overview
This migration adds support for 5 new shared service lines that can operate independently or contribute to main service line projects.

## New Service Lines

### Shared Services
1. **QRM** - Quality & Risk Management
   - QRM_AUDIT
   - QRM_COMPLIANCE
   - QRM_RISK_ASSESSMENT

2. **BUSINESS_DEV** - Business Development & Marketing
   - BD_CAMPAIGN
   - BD_PROPOSAL
   - BD_MARKET_RESEARCH

3. **IT** - Information Technology
   - IT_IMPLEMENTATION
   - IT_SUPPORT
   - IT_INFRASTRUCTURE

4. **FINANCE** - Finance
   - FINANCE_REPORTING
   - FINANCE_BUDGETING
   - FINANCE_ANALYSIS

5. **HR** - Human Resources
   - HR_RECRUITMENT
   - HR_TRAINING
   - HR_POLICY

## Schema Changes
No database schema changes were required. The existing `serviceLine` field in the `Project` table is already a string type that can accommodate these new values.

## Application Changes
- Updated TypeScript enums in `src/types/index.ts`
- Added service line configurations in `src/types/service-line.ts`
- Updated validation schemas in `src/lib/validation/schemas.ts`
- Updated utility functions in `src/lib/utils/serviceLineUtils.ts`
- Modified UI to display shared services separately from main service lines

