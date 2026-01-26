# Migration Guide: Legacy Route Wrappers → secureRoute

## Why Migrate?

The `secureRoute` wrapper provides a unified, feature-rich approach to API route security:

- ✅ **Automatic authentication** - No manual `getCurrentUser()` calls
- ✅ **Authorization via features** - Role-based permissions built-in
- ✅ **Rate limiting** - Per-user + IP-based protection (configurable presets)
- ✅ **Built-in input sanitization** - Automatic via `sanitizeObject()` for mutations
- ✅ **Zod schema validation** - Type-safe request body parsing
- ✅ **Consistent error handling** - Standardized error responses with proper codes
- ✅ **Performance tracking** - Automatic API call monitoring
- ✅ **Type-safe context** - Fully typed `user`, `data`, `params`, and `rateLimit` objects

## Before & After Examples

### Pattern 1: Basic Authentication (withAuth → secureRoute.query)

**Before (Legacy):**
```typescript
import { withAuth } from '@/lib/utils/routeWrappers';
import { getCurrentUser } from '@/lib/services/auth/auth';

export const GET = withAuth(async (req, context, user) => {
  // Manual error handling
  try {
    const data = await prisma.something.findMany();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
});
```

**After (secureRoute):**
```typescript
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';

export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS, // Optional: add feature permission
  handler: async (request, { user }) => {
    // Error handling automatic via secureRoute
    const data = await prisma.something.findMany({
      select: { id: true, name: true }, // Explicit select required
    });
    return NextResponse.json(successResponse(data));
  },
});
```

### Pattern 2: Feature Permissions (withFeature → secureRoute.mutation)

**Before (Legacy):**
```typescript
import { withFeature } from '@/lib/utils/routeWrappers';
import { Feature } from '@/lib/permissions/features';

export const POST = withFeature(
  async (req, context, user) => {
    const body = await req.json();
    // Manual validation and sanitization
    const sanitized = sanitizeObject(body);
    const result = await prisma.task.create({ data: sanitized });
    return NextResponse.json({ success: true, data: result });
  },
  Feature.MANAGE_TASKS
);
```

**After (secureRoute):**
```typescript
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
}).strict();

export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TASKS,
  schema: CreateTaskSchema, // Automatic validation + sanitization
  handler: async (request, { user, data }) => {
    // data is already validated and sanitized
    const result = await prisma.task.create({
      data: {
        name: data.name, // Use data directly, no sanitization needed
        description: data.description,
        createdBy: user.id,
      },
      select: { id: true, name: true },
    });
    return NextResponse.json(successResponse(result), { status: 201 });
  },
});
```

### Pattern 3: Manual Sanitization (Remove Redundant Calls)

**Before (Redundant):**
```typescript
import { sanitizeText } from '@/lib/utils/sanitization';

export const POST = secureRoute.mutation({
  schema: CreateNoteSchema,
  handler: async (request, { user, data }) => {
    const note = await prisma.note.create({
      data: {
        // ❌ REDUNDANT: secureRoute already sanitized via sanitizeObject()
        title: sanitizeText(data.title, { maxLength: 200 }) ?? data.title,
        content: sanitizeText(data.content, { allowHTML: false }) ?? data.content,
      },
    });
    return NextResponse.json(successResponse(note));
  },
});
```

**After (Correct):**
```typescript
export const POST = secureRoute.mutation({
  schema: CreateNoteSchema,
  handler: async (request, { user, data }) => {
    const note = await prisma.note.create({
      data: {
        // ✅ CORRECT: Use sanitized data directly
        title: data.title,
        content: data.content,
      },
      select: { id: true, title: true, content: true },
    });
    return NextResponse.json(successResponse(note));
  },
});
```

### Pattern 4: Routes with Dynamic Params (*WithParams variants)

**Before (Manual param parsing):**
```typescript
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const taskId = Number.parseInt(id, 10); // Manual parsing
    
    if (Number.isNaN(taskId)) {
      throw new AppError(400, 'Invalid ID');
    }
    
    // Check access manually
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden');
    }
    
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    return NextResponse.json(successResponse(task));
  },
});
```

**After (Using queryWithParams):**
```typescript
import { toTaskId } from '@/types/branded';

export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id', // Automatic task access check
  handler: async (request, { user, params }) => {
    // params.id already validated as number by taskIdParam
    const taskId = toTaskId(params.id);
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, name: true, description: true },
    });
    
    return NextResponse.json(successResponse(task));
  },
});
```

### Pattern 5: AI Endpoints (Special Rate Limiting)

**Before:**
```typescript
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TASKS,
  schema: AIRequestSchema,
  // Standard rate limiting (not strict enough for expensive AI calls)
  handler: async (request, { user, data }) => {
    const result = await callOpenAI(data.prompt);
    return NextResponse.json(successResponse(result));
  },
});
```

**After (Using secureRoute.ai):**
```typescript
export const POST = secureRoute.ai({
  feature: Feature.MANAGE_TASKS,
  schema: AIRequestSchema,
  // Automatic strict rate limiting for AI (5 req/min per user)
  handler: async (request, { user, data }) => {
    const result = await callOpenAI(data.prompt);
    return NextResponse.json(successResponse(result));
  },
});
```

### Pattern 6: File Uploads

**Before:**
```typescript
export const POST = secureRoute.mutation({
  sanitize: false, // Disable for file uploads
  handler: async (request, { user }) => {
    const formData = await request.formData();
    // Handle file upload...
  },
});
```

**After (Using secureRoute.fileUpload):**
```typescript
export const POST = secureRoute.fileUpload({
  feature: Feature.MANAGE_DOCUMENTS,
  // Automatic file upload rate limiting (20 req/min)
  handler: async (request, { user }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate file
    if (!file || file.size > 10 * 1024 * 1024) {
      throw new AppError(400, 'Invalid file');
    }
    
    // Upload to blob storage...
    return NextResponse.json(successResponse({ fileId }));
  },
});
```

## secureRoute Variants Reference

| Variant | HTTP Methods | Rate Limit | Sanitization | Use Case |
|---------|--------------|------------|--------------|----------|
| `query` | GET | READ_ONLY (100/min) | No | Read-only endpoints |
| `queryWithParams` | GET | READ_ONLY (100/min) | No | Read with dynamic params |
| `mutation` | POST/PUT/PATCH/DELETE | STANDARD (60/min) | Yes | Create/update/delete |
| `mutationWithParams` | POST/PUT/PATCH/DELETE | STANDARD (60/min) | Yes | Mutations with params |
| `ai` | POST | AI_ENDPOINTS (5/min) | Yes | OpenAI, expensive operations |
| `aiWithParams` | POST | AI_ENDPOINTS (5/min) | Yes | AI with params |
| `fileUpload` | POST | FILE_UPLOADS (20/min) | No | File uploads |
| `fileUploadWithParams` | POST | FILE_UPLOADS (20/min) | No | File uploads with params |

## Common Options

All `secureRoute` variants accept these options:

```typescript
{
  // Feature permission (optional)
  feature?: Feature;
  
  // Service line context for permission checks (optional)
  serviceLine?: string;
  
  // Zod schema for request body validation (mutations only)
  schema?: z.ZodSchema;
  
  // Task ID parameter name for automatic task access checks (optional)
  taskIdParam?: string; // e.g., 'id' for routes like /tasks/[id]
  
  // Required role for task access (optional, defaults to any role)
  taskRole?: 'VIEWER' | 'EDITOR' | 'ADMIN';
  
  // Override rate limiting (optional, use with caution)
  rateLimit?: RateLimitConfig | false;
  
  // Handler function
  handler: SecureHandler;
}
```

## Handler Context Object

All handlers receive a context object with:

```typescript
{
  user: SessionUser; // Authenticated user
  data: T; // Validated & sanitized request body (mutations only)
  params: TParams; // Route params (*WithParams variants only)
  rateLimit: {
    remaining: number; // Requests remaining in window
    limit: number; // Total requests allowed
    resetTime: number; // Timestamp when limit resets
  };
}
```

## Migration Checklist

When migrating a route, ensure:

- [ ] Replace `withAuth`, `withFeature`, `withPermission` with appropriate `secureRoute` variant
- [ ] Remove manual `getCurrentUser()` calls (handled by secureRoute)
- [ ] Remove manual `checkFeature()` calls (use `feature` option)
- [ ] Remove manual sanitization calls (`sanitizeText`, `sanitizeObject` - automatic in mutations)
- [ ] Remove manual rate limiting (handled by secureRoute)
- [ ] Add Zod schema for mutations (replaces manual validation)
- [ ] Use `*WithParams` variants for routes with dynamic segments
- [ ] Add explicit `select:` fields in Prisma queries
- [ ] Replace ad-hoc error responses with `AppError` + `handleApiError`
- [ ] Use `successResponse()` for consistent success responses
- [ ] Add `taskIdParam` option for task-specific routes (automatic access checks)
- [ ] Use `secureRoute.ai()` for AI/OpenAI endpoints
- [ ] Use `secureRoute.fileUpload()` for file upload endpoints

## Deprecated Patterns to Avoid

### ❌ DO NOT manually sanitize input
```typescript
// WRONG: Redundant sanitization
data: {
  content: sanitizeText(data.content)
}

// CORRECT: Use sanitized data directly
data: {
  content: data.content
}
```

### ❌ DO NOT use legacy wrappers
```typescript
// WRONG: Old pattern
export const GET = withAuth(async (req, context, user) => { ... });
export const POST = withFeature(handler, Feature.X);

// CORRECT: Use secureRoute
export const GET = secureRoute.query({ feature, handler });
export const POST = secureRoute.mutation({ feature, schema, handler });
```

### ❌ DO NOT use base variants for routes with params
```typescript
// WRONG: Manual param parsing
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const id = extractIdFromUrl(request.url); // Manual extraction
  }
});

// CORRECT: Use *WithParams variant
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    const id = params.id; // Already extracted and validated
  }
});
```

## Benefits Summary

After migration, you'll have:

- **Consistent Security**: All routes use the same security patterns
- **Less Boilerplate**: ~60% less code per route
- **Better Type Safety**: Fully typed contexts and parameters
- **Automatic Protection**: Rate limiting, sanitization, validation out of the box
- **Easier Maintenance**: Single source of truth for route security
- **Better Performance**: Automatic monitoring and optimization
- **Clearer Intent**: Route type (query/mutation/ai) explicit in code

## Need Help?

- See `.cursor/rules/consolidated.mdc` for complete secureRoute documentation
- See `.cursor/rules/security-rules.mdc` for authorization patterns
- Check `src/lib/api/secureRoute.ts` for implementation details
- Review migrated routes in `ROUTE_REVIEW_CHECKLIST.md` for examples
