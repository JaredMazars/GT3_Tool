# Authentication & Authorization Implementation Guide

This guide provides multiple options for implementing authentication and authorization in the tax computation application.

## Recommended Options

### Option 1: NextAuth.js (Recommended for Flexibility)
**Pros**: Free, open-source, highly customizable, supports many providers  
**Cons**: More setup required, need to manage session storage  
**Best for**: Full control, custom requirements, multiple auth providers

### Option 2: Clerk (Recommended for Speed)
**Pros**: Fastest setup, beautiful UI components, excellent DX  
**Cons**: Paid service (free tier available), vendor lock-in  
**Best for**: Quick MVP, modern auth flows, minimal setup time

### Option 3: Auth0
**Pros**: Enterprise-grade, extensive features, great documentation  
**Cons**: More expensive, can be overkill for simple apps  
**Best for**: Enterprise applications, compliance requirements

## Option 1: NextAuth.js Implementation

### Installation

```bash
npm install next-auth@beta @auth/prisma-adapter
npm install bcrypt @types/bcrypt
```

### Database Schema Updates

Add to `prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // For credentials provider
  role          String    @default("USER") // USER, ADMIN
  accounts      Account[]
  sessions      Session[]
  projects      ProjectUser[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Add to Project model
model ProjectUser {
  id        Int      @id @default(autoincrement())
  projectId Int
  userId    String
  role      String   @default("VIEWER") // OWNER, EDITOR, VIEWER
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}

// Update Project model to add:
model Project {
  // ... existing fields ...
  users     ProjectUser[]
}
```

### Auth Configuration

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
});

export { handlers as GET, handlers as POST };
```

### Middleware for Route Protection

Create `src/middleware.ts`:

```typescript
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  // Allow auth pages without login
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard pages
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Protect API routes (except health check)
  if (isApiRoute && !req.nextUrl.pathname.startsWith('/api/health')) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Authorization Helpers

Create `src/lib/auth.ts`:

```typescript
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from './prisma';
import { AppError, ErrorCodes } from './errorHandler';

/**
 * Get current user session
 * @throws AppError if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();
  
  if (!session?.user) {
    throw new AppError(401, 'Not authenticated', ErrorCodes.UNAUTHORIZED);
  }
  
  return session.user;
}

/**
 * Check if user has access to a project
 * @param projectId - Project ID
 * @param userId - User ID
 * @param requiredRole - Minimum required role (optional)
 * @throws AppError if no access
 */
export async function checkProjectAccess(
  projectId: number,
  userId: string,
  requiredRole?: 'OWNER' | 'EDITOR' | 'VIEWER'
) {
  const access = await prisma.projectUser.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!access) {
    throw new AppError(403, 'Access denied to this project', ErrorCodes.FORBIDDEN);
  }

  if (requiredRole) {
    const roleHierarchy = { OWNER: 3, EDITOR: 2, VIEWER: 1 };
    if (roleHierarchy[access.role] < roleHierarchy[requiredRole]) {
      throw new AppError(
        403,
        `Requires ${requiredRole} role`,
        ErrorCodes.FORBIDDEN
      );
    }
  }

  return access;
}

/**
 * Check if user is admin
 * @throws AppError if not admin
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  
  if (user.role !== 'ADMIN') {
    throw new AppError(403, 'Admin access required', ErrorCodes.FORBIDDEN);
  }
  
  return user;
}
```

### Updated API Route Example

Update `src/app/api/projects/[id]/route.ts`:

```typescript
import { getCurrentUser, checkProjectAccess } from '@/lib/auth';
import { parseProjectId } from '@/lib/apiUtils';
import { handleApiError } from '@/lib/errorHandler';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const projectId = parseProjectId(params.id);
    
    // Check access
    await checkProjectAccess(projectId, user.id);
    
    // Fetch project...
    
  } catch (error) {
    return handleApiError(error, 'Get Project');
  }
}
```

## Option 2: Clerk Implementation

### Installation

```bash
npm install @clerk/nextjs
```

### Configuration

Create `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Middleware

Update `src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### Layout Integration

Update `src/app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Get Current User

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = auth();
  const user = await currentUser();
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Use userId...
}
```

## Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
// User roles
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

// Project roles
export enum ProjectRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// Permission checker
export function canEditProject(userRole: ProjectRole): boolean {
  return [ProjectRole.OWNER, ProjectRole.EDITOR].includes(userRole);
}

export function canDeleteProject(userRole: ProjectRole): boolean {
  return userRole === ProjectRole.OWNER;
}
```

### Attribute-Based Access Control (ABAC)

```typescript
interface AccessContext {
  user: User;
  resource: Project;
  action: 'read' | 'write' | 'delete';
}

export function checkAccess(context: AccessContext): boolean {
  const { user, resource, action } = context;
  
  // Admin can do anything
  if (user.role === 'ADMIN') {
    return true;
  }
  
  // Check project-specific access
  const projectAccess = resource.users.find(u => u.userId === user.id);
  
  if (!projectAccess) {
    return false;
  }
  
  switch (action) {
    case 'read':
      return true; // All project members can read
    case 'write':
      return ['OWNER', 'EDITOR'].includes(projectAccess.role);
    case 'delete':
      return projectAccess.role === 'OWNER';
    default:
      return false;
  }
}
```

## UI Components

### Sign In Page

Create `src/app/auth/signin/page.tsx`:

```typescript
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 border rounded"
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Sign In
          </button>
        </form>
        
        <div className="mt-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full bg-white border py-2 rounded"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Testing Authentication

```typescript
// Mock authenticated requests in tests
import { auth } from '@/app/api/auth/[...nextauth]/route';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  auth: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'USER',
    },
  })),
}));
```

## Migration Strategy

1. **Add database schema** - Run migrations for user tables
2. **Set up auth provider** - Configure NextAuth.js or Clerk
3. **Add middleware** - Protect routes
4. **Update API routes** - Add auth checks
5. **Migrate existing data** - Associate projects with default user
6. **Add UI components** - Sign in/out pages
7. **Test thoroughly** - Verify all flows work

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure cookie options
- [ ] Implement CSRF protection
- [ ] Add rate limiting to auth endpoints
- [ ] Hash passwords with bcrypt (12+ rounds)
- [ ] Implement password reset flow
- [ ] Add email verification
- [ ] Log security events
- [ ] Implement account lockout after failed attempts
- [ ] Use secure session management
- [ ] Implement refresh token rotation
- [ ] Add MFA support (optional)

## Next Steps

1. Choose authentication provider
2. Add database schema
3. Configure provider
4. Add middleware
5. Update API routes
6. Create UI components
7. Test authentication flows
8. Deploy and monitor

---

**Estimated Time**: 3-4 days
**Complexity**: Medium-High
**Priority**: High (required for production)



