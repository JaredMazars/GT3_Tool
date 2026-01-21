# Task Routes Review

**Domain**: Task Management - Core Operations, Documents, Team, Acceptance, Tax & Compliance  
**Total Routes**: 90  
**Last Updated**: January 21, 2026

---

## Sign-Off Status

- [ ] **Security Review** - Reviewer: _____ Date: _____
- [ ] **Performance Review** - Reviewer: _____ Date: _____
- [ ] **Data Integrity Review** - Reviewer: _____ Date: _____

**Final Sign-Off**: ⏸️ NOT STARTED

**Notes**: **CRITICAL PRIORITY - 90 routes awaiting comprehensive review.** This is the largest and most complex domain in the application. Includes 30 newly discovered routes (December 26, 2024) that need immediate attention. Routes handle sensitive operations including client data, financial information, tax compliance documents, and approval workflows.

---

## Review Standards

See [Route Review Standards](../ROUTE_REVIEW_STANDARDS.md) for detailed checklists.

---

## Progress Summary

| Subsection | Routes | Reviewed | Status |
|------------|--------|----------|--------|
| Task List & Details | 12 | 0 | ⏸️ Not Started |
| Task Stage & Status | 8 | 0 | ⏸️ Not Started |
| Task Financial Data | 9 | 0 | ⏸️ Not Started |
| Task Team & Users | 17 | 0 | ⏸️ Not Started |
| Task Acceptance | 14 | 0 | ⏸️ Not Started |
| Task Tax & Compliance | 14 | 0 | ⏸️ Not Started |
| Task Documents & Workspace | 14 | 0 | ⏸️ Not Started |
| Task Mapped Accounts | 2 | 0 | ⏸️ Not Started |
| **TOTAL** | **90** | **0** | ⏸️ **Not Started** |

---

## Newly Discovered Routes (December 26, 2024)

**Total**: 30 routes requiring immediate review

### Research Notes (4 routes)
- `GET /api/tasks/[id]/research-notes` - List research notes
- `POST /api/tasks/[id]/research-notes` - Create research note
- `PUT /api/tasks/[id]/research-notes/[noteId]` - Update research note
- `DELETE /api/tasks/[id]/research-notes/[noteId]` - Delete research note

### AI Tax Report (2 routes)
- `GET /api/tasks/[id]/ai-tax-report` - Get AI-generated tax report
- `POST /api/tasks/[id]/ai-tax-report` - Generate AI tax report

### Legal Precedents (2 routes)
- `GET /api/tasks/[id]/legal-precedents` - Get legal precedents for task
- `POST /api/tasks/[id]/legal-precedents` - Add legal precedent to task

### SARS Responses (2 routes)
- `GET /api/tasks/[id]/sars-responses` - Get SARS responses
- `POST /api/tasks/[id]/sars-responses` - Add SARS response

### Engagement Letters (4 routes)
- `GET /api/tasks/[id]/engagement-letter` - Get engagement letter
- `POST /api/tasks/[id]/engagement-letter` - Create engagement letter
- `POST /api/tasks/[id]/engagement-letter/generate` - AI generate letter
- `GET /api/tasks/[id]/engagement-letter/download` - Download letter PDF

### Data Processing Agreement (3 routes)
- `GET /api/tasks/[id]/dpa` - Get DPA
- `POST /api/tasks/[id]/dpa` - Create/update DPA
- `GET /api/tasks/[id]/dpa/download` - Download DPA PDF

### Notification Preferences (2 routes)
- `GET /api/tasks/[id]/notification-preferences` - Get task notification settings
- `PUT /api/tasks/[id]/notification-preferences` - Update notification settings

### Administration Documents (11 routes)
- Various CRUD operations for task-specific admin documents

**Common Issues Found in Initial Scan:**
- Most routes use raw handler pattern instead of `secureRoute` wrappers
- Missing explicit `select` fields in Prisma queries
- No `take` limits on list endpoints
- Missing `Cache-Control` headers for user-specific data
- Need IDOR protection verification (user can only access tasks they're assigned to)
- Missing proper ID parsing utilities (`parseTaskId()`, `parseNumericId()`)
- Manual `sanitizeText()` calls redundant with secureRoute (automatic sanitization)
- Some routes may have legacy imports from deprecated `routeWrappers.ts`

---

## Task List & Details (12 routes) - ⏸️ PENDING

Core task management operations including list, CRUD, and detail views.

**Routes**:
- GET /api/tasks - List tasks with pagination
- POST /api/tasks - Create new task
- GET /api/tasks/[id] - Get task details
- PUT /api/tasks/[id] - Update task
- DELETE /api/tasks/[id] - Delete task (soft delete)
- GET /api/tasks/[id]/history - Task change history
- Additional task detail endpoints

**Priority Issues to Review**:
- Verify `secureRoute` usage across all routes
- Check task access validation (user must be assigned or have access via service line)
- Validate query params on list endpoint (search, filters, pagination)
- Ensure explicit `select` fields (tasks table has many columns)
- Verify soft delete handling (archived tasks)

---

## Task Stage & Status (8 routes) - ⏸️ PENDING

Task workflow and status management.

**Routes**:
- PUT /api/tasks/[id]/stage - Update task stage
- PUT /api/tasks/[id]/status - Update task status
- GET /api/tasks/[id]/stage-history - Stage transition history
- Additional stage/status endpoints

**Priority Issues to Review**:
- Validate stage transitions (business rule enforcement)
- Check authorization (only certain roles can move to certain stages)
- Verify audit logging for stage changes
- Ensure cache invalidation after stage updates

---

## Task Financial Data (9 routes) - ⏸️ PENDING

Financial information associated with tasks (WIP, fees, billing).

**Routes**:
- GET /api/tasks/[id]/wip - Work in progress data
- GET /api/tasks/[id]/fees - Fee information
- GET /api/tasks/[id]/billing - Billing details
- GET /api/tasks/[id]/budgets - Budget information
- Additional financial endpoints

**Priority Issues to Review**:
- Verify `Feature.VIEW_WIP_DATA` permission for financial endpoints
- Check for sensitive data exposure (only show data user is authorized to see)
- Ensure decimal precision handling (use Decimal.js for financial calculations)
- Validate `take` limits on transaction queries (can be very large datasets)
- Verify caching strategy (financial data changes frequently but is expensive to calculate)

---

## Task Team & Users (17 routes) - ⏸️ PENDING

Team member management, allocations, and user assignments.

**Routes**:
- GET /api/tasks/[id]/team - List team members
- POST /api/tasks/[id]/team - Add team member
- PUT /api/tasks/[id]/team/[memberId] - Update team member role/allocation
- DELETE /api/tasks/[id]/team/[memberId] - Remove team member
- GET /api/tasks/[id]/allocations - View allocations
- Additional team management endpoints

**Priority Issues to Review**:
- Verify role-based access (only EDITOR+ can modify team)
- Check IDOR protection (users can't add themselves to unauthorized tasks)
- Validate allocation percentages (sum validation, range checks)
- Ensure cache invalidation after team changes (affects planner views)
- Verify notification triggers when team members added/removed

---

## Task Acceptance (14 routes) - ⏸️ PENDING

Client acceptance workflow including questionnaires, research, and approvals.

**Routes**:
- GET /api/tasks/[id]/acceptance/status - Acceptance status
- POST /api/tasks/[id]/acceptance/initialize - Start acceptance process
- GET /api/tasks/[id]/acceptance/questions - Get questionnaire
- POST /api/tasks/[id]/acceptance/answers - Submit answers
- POST /api/tasks/[id]/acceptance/research - Initiate research
- POST /api/tasks/[id]/acceptance/submit - Submit for approval
- Additional acceptance workflow endpoints

**Priority Issues to Review**:
- Verify approval workflow integration (uses centralized approval system)
- Check state machine validation (can't skip steps)
- Ensure IDOR protection (acceptance tied to specific task/client)
- Validate file uploads (acceptance documents)
- Verify audit logging for compliance requirements
- Check notification triggers at each workflow stage

---

## Task Tax & Compliance (14 routes) - ⏸️ PENDING

**NEWLY DISCOVERED SECTION** - 14 routes found December 26, 2024

Tax compliance, legal documents, SARS responses, and regulatory filings.

**Routes**:
- Research Notes (4 routes) - CRUD for task research notes
- AI Tax Report (2 routes) - AI-generated tax reports
- Legal Precedents (2 routes) - Legal research integration
- SARS Responses (2 routes) - South African Revenue Service responses
- Filing Status (2 routes) - Tax filing status management
- Additional compliance endpoints

**Priority Issues to Review**:
- **CRITICAL**: Most routes use raw handlers (need secureRoute migration)
- Verify AI endpoints use `secureRoute.ai()` for strict rate limiting
- Check sensitive data handling (tax reports, legal documents)
- Ensure proper authorization (tax documents are highly sensitive)
- Validate file download security (PDF generation, path traversal prevention)
- Verify audit logging (regulatory compliance requirement)

---

## Task Documents & Workspace (14 routes) - ⏸️ PENDING

Document management, file uploads, workspace files.

**Routes**:
- GET /api/tasks/[id]/workspace/files - List workspace files
- POST /api/tasks/[id]/workspace/files - Upload file
- GET /api/tasks/[id]/workspace/files/[fileId] - Get file details
- DELETE /api/tasks/[id]/workspace/files/[fileId] - Delete file
- GET /api/tasks/[id]/documents - List all task documents
- Engagement Letters (4 routes) - **NEWLY DISCOVERED**
- Data Processing Agreement (3 routes) - **NEWLY DISCOVERED**
- Additional document endpoints

**Priority Issues to Review**:
- **CRITICAL**: Verify blob storage integration (per `.cursor/rules/blob-storage-rules.mdc`)
- Check file upload validation (size, MIME types, magic number verification)
- Verify path traversal prevention on file downloads
- Ensure proper `X-Content-Type-Options: nosniff` headers
- Check blob storage container usage (each document type should use dedicated container)
- Verify AI extraction endpoints use proper rate limiting
- Validate PDF generation security (engagement letters, DPA)

---

## Task Mapped Accounts (2 routes) - ⏸️ PENDING

Financial account mapping and categorization.

**Routes**:
- GET /api/tasks/[id]/mapped-accounts - Get mapped accounts
- PUT /api/tasks/[id]/mapped-accounts - Update account mappings

**Priority Issues to Review**:
- Verify financial data permissions
- Check transaction safety for bulk updates
- Ensure explicit select fields (account data can be large)

---

## Critical Review Priorities

### 1. Security (HIGHEST PRIORITY)
**Estimated Effort**: 20-25 hours

- [ ] Migrate 73 routes from raw handlers to `secureRoute` wrappers
- [ ] Add task access validation to all routes (`taskIdParam` or manual `checkTaskAccess`)
- [ ] Verify IDOR protection (users can only access tasks they're assigned to or have service line access)
- [ ] Validate all route params with branded ID utilities
- [ ] Check sensitive data exposure (financial, tax, legal documents)
- [ ] Audit file upload/download security (path traversal, MIME validation)
- [ ] Verify AI endpoint rate limiting (`secureRoute.ai()`)

### 2. Performance (HIGH PRIORITY)
**Estimated Effort**: 15-20 hours

- [ ] Add explicit `select` fields to all Prisma queries (task table has 50+ columns)
- [ ] Add `take` limits to all list endpoints
- [ ] Review caching strategy (task data vs. financial data vs. documents)
- [ ] Optimize N+1 queries (team members, allocations, documents)
- [ ] Add deterministic sorting to all paginated endpoints
- [ ] Parallelize independent queries with `Promise.all()`

### 3. Data Integrity (MEDIUM PRIORITY)
**Estimated Effort**: 10-15 hours

- [ ] Verify foreign key validation (task belongs to client, client belongs to group)
- [ ] Check cascade delete behavior (what happens when task is deleted?)
- [ ] Validate business rules (stage transitions, team allocations, acceptance workflow)
- [ ] Ensure transaction usage for multi-step operations
- [ ] Verify decimal precision for financial data

### 4. Correctness (MEDIUM PRIORITY)
**Estimated Effort**: 10-12 hours

- [ ] Verify consistent error handling (`AppError` with proper error codes)
- [ ] Check response format consistency (`successResponse` wrapper)
- [ ] Validate notification triggers (team changes, acceptance events, stage updates)
- [ ] Ensure proper cache invalidation (workspace counts, planner data)
- [ ] Verify audit logging for compliance requirements

---

## Review Strategy

### Phase 1: Critical Security Review (Week 1)
Focus on routes handling sensitive data and authentication:
1. Task acceptance routes (approval workflow)
2. Tax & compliance routes (newly discovered, sensitive data)
3. Documents & workspace routes (file handling security)

### Phase 2: Core Operations Review (Week 2)
Review frequently-used routes:
1. Task list & details (most accessed endpoints)
2. Task team & users (high mutation rate)
3. Task stage & status (workflow critical)

### Phase 3: Financial & Specialized Routes (Week 3)
Review remaining routes:
1. Task financial data (complex queries)
2. Task mapped accounts (specialized functionality)

### Phase 4: Testing & Sign-Off (Week 4)
1. Integration testing across all task routes
2. Performance testing with production-like data volumes
3. Security testing (penetration testing on file uploads, IDOR)
4. Final sign-off

---

## Known Issues Requiring Immediate Attention

### 1. Raw Handler Pattern (73 routes affected)
Most task routes still use the legacy pattern:
```typescript
export async function GET(request: Request, context: { params: { id: string } }) {
  const user = await getUser(request);
  // ... manual auth and validation
}
```

**Should be**:
```typescript
export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    // ... automatic auth, validation, task access check
  },
});
```

### 2. Missing Explicit Select (45 routes affected)
Many routes query the full task object:
```typescript
const task = await prisma.task.findUnique({ where: { id: taskId } });
```

**Should be**:
```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId },
  select: {
    id: true,
    taskCode: true,
    description: true,
    // ... only fields actually needed
  },
});
```

### 3. Missing Take Limits (23 routes affected)
List endpoints without pagination bounds:
```typescript
const documents = await prisma.taskDocument.findMany({
  where: { taskId },
});
```

**Should be**:
```typescript
const documents = await prisma.taskDocument.findMany({
  where: { taskId },
  take: 200,
  orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
});
```

### 4. File Upload Security (14 routes affected)
Document upload routes need comprehensive security review:
- MIME type validation
- File size limits
- Path traversal prevention
- Blob storage integration (dedicated containers per document type)
- Magic number verification

### 5. AI Endpoint Rate Limiting (4 routes affected)
AI-powered routes must use strict rate limiting:
```typescript
export const POST = secureRoute.aiWithParams({
  taskIdParam: 'id',
  schema: GenerateReportSchema,
  handler: async (request, { user, params, data }) => {
    // ... AI rate limiting automatically enforced
  },
});
```

---

## Success Metrics

Domain sign-off requires:
- ✅ All 90 routes migrated to `secureRoute` pattern
- ✅ All routes have explicit `select` fields
- ✅ All list endpoints have `take` limits
- ✅ All file operations validated for security
- ✅ All AI endpoints use strict rate limiting
- ✅ All mutations have cache invalidation
- ✅ All sensitive operations have audit logging
- ✅ Integration tests pass for all critical workflows
- ✅ Performance benchmarks met (< 500ms for detail views, < 2s for lists)
- ✅ Security audit completed with no critical findings

**Estimated Total Effort**: 55-72 hours (3-4 weeks with dedicated focus)

---

## Related Documentation

- [Route Review Standards](../ROUTE_REVIEW_STANDARDS.md) - Comprehensive checklists
- [Migration Guide: secureRoute](./MIGRATION_GUIDE_SECURE_ROUTE.md) - How to migrate routes
- [Blob Storage Rules](./.cursor/rules/blob-storage-rules.mdc) - Document storage patterns
- [Approval System Rules](./.cursor/rules/approval-system-rules.mdc) - Acceptance workflow
- [AI Patterns](./.cursor/rules/ai-patterns.mdc) - AI endpoint best practices
- [Security Rules](./.cursor/rules/security-rules.mdc) - Authentication & authorization
