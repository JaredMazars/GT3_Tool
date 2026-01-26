# Route Review Progress Dashboard

**Last Updated**: January 21, 2026

A centralized tracking system for API route security, performance, and data integrity reviews across all domains.

---

## Overview

This dashboard provides a high-level view of route review progress across the entire application. Each domain has a dedicated review file with detailed checklists and findings.

**Total Routes**: 261 API routes across 11 domains
**Review Completion**: See table below

---

## Overall Progress

| Domain | Routes | Progress | Status | Reviewer | Sign-Off Date |
|--------|--------|----------|--------|----------|---------------|
| [Admin](./docs/route-reviews/ADMIN_ROUTES.md) | 42 | 34/42 (81%) | 🔄 In Progress | - | - |
| [Auth](./docs/route-reviews/AUTH_ROUTES.md) | 6 | 6/6 (100%) | ✅ Signed Off | - | 2024-12-20 |
| [BD](./docs/route-reviews/BD_ROUTES.md) | 17 | 17/17 (100%) | ✅ Signed Off | - | 2024-12-21 |
| [Clients](./docs/route-reviews/CLIENT_ROUTES.md) | 21 | 21/21 (100%) | ✅ Signed Off | - | 2024-12-22 |
| [Tasks](./docs/route-reviews/TASK_ROUTES.md) | 90 | 0/90 (0%) | ⏸️ Not Started | - | - |
| [Service Lines](./docs/route-reviews/SERVICE_LINE_ROUTES.md) | 12 | 0/12 (0%) | ⏸️ Not Started | - | - |
| [Groups](./docs/route-reviews/GROUP_ROUTES.md) | 6 | 6/6 (100%) | ✅ Signed Off | - | 2024-12-22 |
| [Notifications](./docs/route-reviews/NOTIFICATION_ROUTES.md) | 7 | 7/7 (100%) | ✅ Signed Off | - | 2024-12-22 |
| [Users](./docs/route-reviews/USER_ROUTES.md) | 6 | 6/6 (100%) | ✅ Signed Off | - | 2024-12-22 |
| [Tools](./docs/route-reviews/TOOL_ROUTES.md) | 14 | 14/14 (100%) | ✅ Signed Off | - | 2024-12-22 |
| [Utilities](./docs/route-reviews/UTILITY_ROUTES.md) | 12 | 10/12 (83%) | 🔄 In Progress | - | - |
| **TOTAL** | **261** | **210/261 (80%)** | 🔄 **In Progress** | | |

---

## Quick Links

### Review Resources
- [Route Review Standards](./docs/ROUTE_REVIEW_STANDARDS.md) - Detailed checklists for security, performance, and data integrity
- [Migration Guide: secureRoute](./docs/MIGRATION_GUIDE_SECURE_ROUTE.md) - Guide for migrating to secureRoute wrapper

### Specialized Rules
- [Security Rules](./.cursor/rules/security-rules.mdc) - Authentication, authorization, page permissions
- [Approval System](./.cursor/rules/approval-system-rules.mdc) - Centralized approval workflows
- [Blob Storage Rules](./.cursor/rules/blob-storage-rules.mdc) - Purpose-specific containers, file handling
- [AI Patterns](./.cursor/rules/ai-patterns.mdc) - Azure OpenAI integration, RAG, AI agents
- [Tool System](./.cursor/rules/tool-system-rules.mdc) - Tool architecture and patterns
- [Forvis Design Rules](./.cursor/rules/forvis-design-rules.mdc) - UI components, brand standards

### Domain Review Files
- [Admin Routes](./docs/route-reviews/ADMIN_ROUTES.md) - Admin panel, page permissions, templates, document vault
- [Auth Routes](./docs/route-reviews/AUTH_ROUTES.md) - Authentication and session management
- [BD Routes](./docs/route-reviews/BD_ROUTES.md) - Business development, opportunities, proposals
- [Client Routes](./docs/route-reviews/CLIENT_ROUTES.md) - Client management, acceptance, analytics
- [Task Routes](./docs/route-reviews/TASK_ROUTES.md) - Task management, documents, team, acceptance
- [Service Line Routes](./docs/route-reviews/SERVICE_LINE_ROUTES.md) - Service line access and mapping
- [Group Routes](./docs/route-reviews/GROUP_ROUTES.md) - Group management and analytics
- [Notification Routes](./docs/route-reviews/NOTIFICATION_ROUTES.md) - Notification system
- [User Routes](./docs/route-reviews/USER_ROUTES.md) - User management and preferences
- [Tool Routes](./docs/route-reviews/TOOL_ROUTES.md) - Tool system management
- [Utility Routes](./docs/route-reviews/UTILITY_ROUTES.md) - Search, export, health checks

---

## Common Issues Across All Reviews

### Critical Patterns Requiring Attention

1. **secureRoute Migration** (73 routes affected)
   - Many routes still use raw handler pattern instead of `secureRoute` wrappers
   - Legacy imports from deprecated `routeWrappers.ts` file
   - Missing feature permission checks

2. **Missing Explicit Select** (45 routes affected)
   - Prisma queries selecting all fields (`select *`)
   - Exposing unnecessary data in responses
   - Performance impact on large tables

3. **Missing Take Limits** (23 routes affected)
   - List endpoints without pagination bounds
   - Risk of unbounded queries on large datasets
   - Memory and performance concerns

4. **IDOR Protection** (18 routes need verification)
   - Routes need explicit checks that user can access requested resource
   - Beyond role checks, verify ownership/permission for specific records

5. **Cache-Control Headers** (31 routes missing)
   - User-specific or sensitive responses need `Cache-Control: no-store`
   - Prevents caching of sensitive data

6. **ID Parsing Utilities** (42 routes affected)
   - Using manual parsing instead of branded ID utilities (`parseTaskId()`, `parseClientId()`, etc.)
   - Inconsistent error handling for invalid IDs

7. **Manual Sanitization** (15 routes affected)
   - Redundant `sanitizeText()` calls in mutation handlers
   - secureRoute already applies `sanitizeObject()` automatically

---

## Review Workflow

### For Reviewers

1. **Select a domain** from the table above (prioritize "Not Started" or "In Progress")
2. **Open the domain file** from `docs/route-reviews/`
3. **Review subsection-by-subsection**:
   - Read all route files in the subsection
   - Apply the checklists from [Route Review Standards](./docs/ROUTE_REVIEW_STANDARDS.md)
   - Check boxes and document findings as you go
   - Apply pattern fixes across similar routes
4. **Sign off on subsection** when complete
5. **Update progress** in domain file and this index
6. **Final domain sign-off** when all subsections complete

### Review Checklist Categories

Each route should be reviewed against these dimensions:

- **Security**: Authentication, authorization, input validation, data protection
- **Performance**: Database optimization, caching, request handling
- **Data Integrity**: Foreign key validation, transactions, consistency
- **Correctness**: Response handling, error codes, observability
- **Resilience**: External API handling, timeouts, circuit breakers (where applicable)

---

## Recent Route Discoveries

### December 26, 2024 - 30 New Routes Discovered

**Service Lines** (1 route):
- `GET /api/service-lines/user-accessible-groups`

**Task Routes** (29 routes):
- Research Notes (4 routes)
- AI Tax Report (2 routes)
- Legal Precedents (2 routes)
- SARS Responses (2 routes)
- Engagement Letters (4 routes)
- Data Processing Agreement (3 routes)
- Notification Preferences (2 routes)

**Status**: All newly discovered routes added to domain files and awaiting review.

---

## Domain-Specific Notes

### Admin Routes (42 routes, 81% complete)
**Status**: 8 newly added routes need review
**Priority Issues**: Template versioning routes, document vault type management

### Task Routes (90 routes, 0% complete)
**Status**: Not started, highest priority domain
**Priority Issues**: 30 newly discovered routes need immediate attention
**Note**: Largest domain, recommend multiple reviewer sessions

### Service Line Routes (12 routes, 0% complete)
**Status**: Not started
**Priority Issues**: 1 newly discovered route for user-accessible groups

### Utilities (12 routes, 83% complete)
**Status**: 2 newly added routes need review
**Priority Issues**: Recent additions to health checks and export functionality

---

## Success Metrics

- ✅ All 261 routes catalogued and assigned to domains
- ✅ Review standards documented and centralized
- ✅ Domain-specific files created with sign-off sections
- 🔄 80% of routes reviewed (210/261 complete)
- ⏸️ Task routes domain review pending (largest remaining work)

---

## Next Steps

1. **Priority 1**: Complete Task Routes review (90 routes, 0% done)
2. **Priority 2**: Complete Service Line Routes review (12 routes, 0% done)
3. **Priority 3**: Complete remaining Admin routes (8 routes)
4. **Priority 4**: Complete remaining Utility routes (2 routes)

**Estimated Effort**: ~40-50 hours remaining for complete review
