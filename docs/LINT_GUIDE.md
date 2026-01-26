# ESLint & TypeScript Guide

## Overview

This project enforces strict TypeScript type safety to prevent bugs and improve code quality.

## Key Rules

### ❌ No Explicit `any` Types (ERROR)

**Rule:** `@typescript-eslint/no-explicit-any`  
**Level:** Error (shows red in IDE)  
**Impact:** Builds still succeed (configured in `next.config.js`) but strongly discouraged

#### Why This Matters

Using `any` disables TypeScript's type checking, defeating the purpose of using TypeScript:
- ❌ Loses autocomplete/IntelliSense
- ❌ Can't catch type errors at compile time
- ❌ Makes refactoring dangerous
- ❌ Hides bugs until runtime

#### ✅ Better Alternatives

**1. Use `unknown` for truly unknown types:**
```typescript
// ❌ BAD
function process(data: any) {
  return data.name; // No type safety!
}

// ✅ GOOD
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    return (data as { name: string }).name;
  }
  throw new Error('Invalid data');
}
```

**2. Use Type Guards:**
```typescript
// ❌ BAD
catch (error: any) {
  console.error(error.message);
}

// ✅ GOOD
catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

**3. Define Proper Types:**
```typescript
// ❌ BAD
const users: any[] = await fetchUsers();

// ✅ GOOD
interface User {
  id: string;
  name: string;
  email: string;
}
const users: User[] = await fetchUsers();
```

**4. Use Prisma Types:**
```typescript
// ❌ BAD
const result = await prisma.user.findMany() as any;

// ✅ GOOD
import { Prisma } from '@prisma/client';
type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true }
}>;
const result: UserWithPosts[] = await prisma.user.findMany({
  include: { posts: true }
});
```

**5. Type Assertions (use sparingly):**
```typescript
// ❌ BAD
const value = JSON.parse(str) as any;

// ✅ BETTER
interface ExpectedType {
  id: number;
  name: string;
}
const value = JSON.parse(str) as ExpectedType; // At least documents expected shape
```

### Other Important Rules

- ✅ **No `var`** (use `const` or `let`) - ERROR
- ⚠️ **Prefer `const`** over `let` when possible - WARNING  
- ⚠️ **No unused variables** (prefix with `_` if intentionally unused) - WARNING
- ⚠️ **Console statements** (use `console.error` or remove) - WARNING

## Running Lints

```bash
# Check all lint issues
npm run lint

# Check only 'any' type violations
npm run lint:types

# Auto-fix what can be auto-fixed
npm run lint -- --fix
```

## Current State

- **Existing `any` types:** ~209 (grandfathered, fix incrementally)
- **New `any` types:** ERROR (will show red squiggles in IDE)
- **Build blocking:** No (builds succeed despite errors for backward compatibility)

## Strategy

1. **✅ DO:** Write new code without `any` types
2. **✅ DO:** Fix `any` types when you modify existing files
3. **❌ DON'T:** Add new `any` types (find proper alternative)
4. **⚠️ ACCEPTABLE:** Leave existing `any` types alone until you touch that code

## When `any` Might Be Unavoidable

In rare cases, `any` might be necessary:
1. **Third-party libraries** without type definitions
2. **Extremely dynamic data** that truly has no knowable shape
3. **Migration periods** when converting JS to TS

Even then, try to:
- Add `// @ts-expect-error` with explanation
- Isolate to smallest scope possible
- Document why it's needed
- Plan to fix it later

## Questions?

See: https://typescript-eslint.io/rules/no-explicit-any/

































