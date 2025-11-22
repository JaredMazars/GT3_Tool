# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an e-mail to the project maintainers. All security vulnerabilities will be promptly addressed.

### Secrets

**NEVER** commit secrets (API keys, passwords, etc.) to the repository.
- Use `.env.local` for local development secrets.
- Ensure `.env.local` is in `.gitignore`.
- Use environment variables in production.

### Best Practices

- Keep dependencies up to date.
- Review code for injection vulnerabilities before merging.
- Do not use `dangerouslySetInnerHTML` without sanitization.

## Authorization and Permission Model

This application implements a comprehensive three-level permission model:

### 1. System Level (User.role)

Controls system-wide access and administrative capabilities.

**Roles:**
- `SUPERUSER`: System-wide access to all features and service lines
  - Bypasses service line access checks
  - Can approve all acceptance and engagement letters
  - Can manage users and system settings
  - Can access any project in any service line

- `USER`: Regular user (default)
  - Requires explicit service line access via ServiceLineUser
  - Must be assigned to projects via ProjectUser
  - Subject to service line and project-level permissions

**Key Functions:**
- `isSystemSuperuser(userId)`: Check if user is a SUPERUSER
- `getUserSystemRole(userId)`: Get user's system role

### 2. Service Line Level (ServiceLineUser.role)

Controls access within specific service lines (TAX, AUDIT, ACCOUNTING, etc.).

**Roles (mapped to business titles):**
- `ADMIN` (Partner): Can approve acceptance and engagement letters
- `MANAGER` (Manager): Can manage projects and teams
- `USER` (Staff): Can complete work and edit project data
- `VIEWER` (Viewer): Read-only access to service line projects

**Key Functions:**
- `hasServiceLineAccess(userId, serviceLine)`: Check if user has access to a service line
- `getServiceLineRole(userId, serviceLine)`: Get user's role in a service line
- `isPartner(userId, serviceLine)`: Check if user is a Partner (ADMIN)

**Access Rules:**
- Non-SUPERUSERs must have a ServiceLineUser record to access a service line
- SUPERUSERs automatically have access to all service lines

### 3. Project Level (ProjectUser.role)

Controls access to individual projects.

**Roles:**
- `ADMIN`: Full project control (manage team, edit, delete)
- `REVIEWER`: Can review and comment on project data
- `EDITOR`: Can edit project data
- `VIEWER`: Read-only access to project

**Key Functions:**
- `checkProjectAccess(userId, projectId, requiredRole?)`: Check project access
- `getUserProjectRole(userId, projectId)`: Get user's project role

**Access Rules:**
- User must be in ProjectUser table to access a project
- Non-SUPERUSERs must also have access to the project's service line
- SUPERUSERs can access any project (bypasses service line check)

### Approval Authorization

**Acceptance & Engagement Letter Approval:**

Only the following users can approve client acceptance and engagement letters:
- System Administrators (SUPERUSER)
- Partners (ServiceLineUser.role = ADMIN for the project's service line)

**Implementation:**
```typescript
// Check if user can approve
const canApprove = await canApproveAcceptance(userId, projectId);

// Authorization check:
// 1. Is user a SUPERUSER? → Yes, allow
// 2. Is user a Partner (ADMIN) in project's service line? → Check project access
// 3. Does user have access to the project? → Yes, allow
```

**Other Staff:**
- Managers (MANAGER): Can manage projects, cannot approve
- Staff (USER): Can complete work, cannot approve
- Viewers (VIEWER): Read-only access

### Permission Check Flow

```
User requests access to feature
  │
  ├─→ Is SUPERUSER? → Yes → ALLOW
  │
  ├─→ Check Service Line Access
  │    ├─→ No access → DENY
  │    └─→ Has access → Continue
  │
  ├─→ Check Project Access
  │    ├─→ Not on project → DENY
  │    └─→ On project → Continue
  │
  └─→ Check Feature Permission
       ├─→ Feature requires Partner → Check if ServiceLineUser.role = ADMIN
       ├─→ Feature requires Manager+ → Check if role >= MANAGER
       └─→ Feature requires Project role → Check ProjectUser.role
```

### API Route Authorization Patterns

**Standard Pattern:**
```typescript
// 1. Authenticate
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// 2. Check project access (includes service line check)
const hasAccess = await checkProjectAccess(user.id, projectId);
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

// 3. For approval operations, check specific permission
const canApprove = await canApproveAcceptance(user.id, projectId);
if (!canApprove) return NextResponse.json({ 
  error: 'Only Partners and System Administrators can approve' 
}, { status: 403 });
```

### Database Schema

**User Table:**
```sql
role: String @default("USER")  -- SUPERUSER or USER
```

**ServiceLineUser Table:**
```sql
userId: String
serviceLine: String
role: String @default("USER")  -- ADMIN, MANAGER, USER, or VIEWER
@@unique([userId, serviceLine])
```

**ProjectUser Table:**
```sql
userId: String
projectId: Int
role: String @default("VIEWER")  -- ADMIN, REVIEWER, EDITOR, or VIEWER
@@unique([projectId, userId])
```

### Security Considerations

1. **Never expose sensitive role checks in client code** - Always verify on server
2. **Service line isolation** - Non-SUPERUSERs cannot access projects in service lines they're not assigned to
3. **Approval controls** - Only Partners and SUPERUSERs can approve critical documents
4. **Audit trail** - All approvals record who approved and when
5. **Session security** - System role included in JWT, verified on each request

### Migration from Old System

If migrating from a single-role system:
1. Run `npm run migrate:superuser` to convert ADMIN → SUPERUSER
2. Assign users to service lines with appropriate roles
3. Assign users to projects with appropriate roles
4. Test approval workflows with Partner and SUPERUSER accounts

### Testing Permissions

```typescript
// Test system role
const isSuperuser = await isSystemSuperuser(userId);

// Test service line access
const isPartner = await isPartner(userId, 'TAX');
const role = await getServiceLineRole(userId, 'TAX');

// Test approval permission
const canApprove = await canApproveAcceptance(userId, projectId);

// Test feature permission
const canDelete = await checkFeaturePermission(userId, projectId, Feature.DELETE_PROJECT);
```
