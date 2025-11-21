import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '../../db/prisma';
import { withRetry, RetryPresets } from '../../utils/retryUtils';
import type { Session, SessionUser } from './types';

// Helper for conditional logging (avoid importing logger to prevent Edge Runtime issues)
const log = {
  info: (message: string, meta?: any) => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // console.log(`[INFO] ${message}`, meta || '');
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error?.message || error || '');
  },
};

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  },
};

const pca = new ConfidentialClientApplication(msalConfig);
const cryptoProvider = new CryptoProvider();

// Ensure NEXTAUTH_SECRET is set - fail fast if not configured
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set. Please configure it in your .env file.');
}

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// Import types from shared types file
export type { SessionUser, Session } from './types';

/**
 * Generate authorization URL for Azure AD login
 */
export async function getAuthUrl(redirectUri: string): Promise<string> {
  const authCodeUrlParameters = {
    scopes: ['user.read', 'openid', 'profile', 'email'],
    redirectUri,
  };

  const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
  return authUrl;
}

/**
 * Exchange authorization code for tokens and user info
 */
export async function handleCallback(code: string, redirectUri: string) {
  const tokenRequest = {
    code,
    scopes: ['user.read', 'openid', 'profile', 'email'],
    redirectUri,
  };

  const response = await pca.acquireTokenByCode(tokenRequest);
  
  if (!response || !response.account) {
    throw new Error('Failed to acquire token');
  }

  const email = response.account.username;
  const name = response.account.name || response.account.username;
  const userId = response.account.homeAccountId || response.account.localAccountId;

  // Find or create user in database with retry logic for Azure SQL cold-start
  log.info('Looking up user in database', { email });
  
  let dbUser = await withRetry(
    async () => {
      return await prisma.user.findUnique({
        where: { email },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Auth callback - find user'
  );

  if (!dbUser) {
    log.info('Creating new user in database', { email, userId });
    
    // Create new user in database with retry logic
    dbUser = await withRetry(
      async () => {
        return await prisma.user.create({
          data: {
            id: userId,
            email,
            name,
            role: 'USER', // Default role
          },
        });
      },
      RetryPresets.AZURE_SQL_COLD_START,
      'Auth callback - create user'
    );
  }

  const user: SessionUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name || dbUser.email,
    role: dbUser.role || 'USER', // Include role from database
  };

  log.info('User authenticated successfully', { userId: user.id, email: user.email, role: user.role });
  
  return user;
}

/**
 * Create a session token (JWT) and store in database
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET);

  // Store session in database with retry logic for Azure SQL cold-start
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  log.info('Creating session in database', { userId: user.id, sessionId });
  
  await withRetry(
    async () => {
      return await prisma.session.create({
        data: {
          id: sessionId,
          sessionToken: token,
          userId: user.id,
          expires: expiresAt,
        },
      });
    },
    RetryPresets.AZURE_SQL_COLD_START,
    'Create session'
  );

  log.info('Session created successfully', { userId: user.id, sessionId });

  return token;
}

/**
 * Database session with user
 */
interface DatabaseSession {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  User: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

/**
 * Get session from database
 */
export async function getSessionFromDatabase(token: string): Promise<DatabaseSession | null> {
  try {
    // Use retry logic for session lookup to handle Azure SQL cold-start
    const session = await withRetry(
      async () => {
        return await prisma.session.findUnique({
          where: { sessionToken: token },
          include: { User: true },
        });
      },
      RetryPresets.AZURE_SQL_COLD_START,
      'Get session from database'
    );

    // Check if session exists and hasn't expired
    if (!session || session.expires < new Date()) {
      // Clean up expired session if it exists
      if (session) {
        await withRetry(
          async () => {
            return await prisma.session.delete({
              where: { sessionToken: token },
            });
          },
          RetryPresets.AZURE_SQL_COLD_START,
          'Delete expired session'
        );
      }
      return null;
    }

    return session;
  } catch (error) {
    log.error('Failed to get session from database', error);
    return null;
  }
}

/**
 * Verify JWT token only (no database check)
 * Use this in middleware/edge runtime where Prisma is not available
 */
export async function verifySessionJWTOnly(token: string): Promise<Session | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as Session;
  } catch (error) {
    return null;
  }
}

/**
 * Verify and decode session token
 * Also checks if session exists in database
 * Use this in API routes where Prisma is available
 */
export async function verifySession(token: string): Promise<Session | null> {
  try {
    // First verify JWT signature and expiration
    const verified = await jwtVerify(token, JWT_SECRET);
    
    // Then check if session exists in database
    const dbSession = await getSessionFromDatabase(token);
    if (!dbSession) {
      return null;
    }

    // Return the verified payload which contains the user info
    // The dbSession.User contains the database user record, but we use the JWT payload
    // which already has the user information embedded
    return verified.payload as unknown as Session;
  } catch (error) {
    return null;
  }
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Role hierarchy levels - higher number = more permissions
 */
const ROLE_HIERARCHY = {
  VIEWER: 1,
  EDITOR: 2,
  REVIEWER: 3,
  ADMIN: 4,
} as const;

/**
 * Check if a role has sufficient permissions
 */
function hasRolePermission(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if user has access to a project with optional role requirement
 */
export async function checkProjectAccess(
  userId: string,
  projectId: number,
  requiredRole?: string
): Promise<boolean> {
  try {
    // Get user's project membership
    const projectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    // User not on project
    if (!projectUser) {
      return false;
    }

    // If no specific role required, any membership is sufficient
    if (!requiredRole) {
      return true;
    }

    // Check role hierarchy
    return hasRolePermission(projectUser.role, requiredRole);
  } catch (error) {
    return false;
  }
}

/**
 * Get user's role on a project
 */
export async function getUserProjectRole(
  userId: string,
  projectId: number
): Promise<string | null> {
  try {
    const projectUser = await prisma.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return projectUser?.role || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is a system admin
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN';
  } catch (error) {
    return false;
  }
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin(userId: string): Promise<void> {
  const isAdmin = await isSystemAdmin(userId);
  
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
}

/**
 * Require specific project role - throws error if insufficient permissions
 */
export async function requireProjectRole(
  userId: string,
  projectId: number,
  requiredRole: string
): Promise<void> {
  const hasAccess = await checkProjectAccess(userId, projectId, requiredRole);
  
  if (!hasAccess) {
    throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
  }
}

/**
 * Delete a specific session from database
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    await prisma.session.delete({
      where: { sessionToken: token },
    });
  } catch (error) {
    // Session might not exist, which is fine
  }
}

/**
 * Delete all sessions for a user (logout from all devices)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Get user projects - get all projects the user has access to
 * @param userId - The user ID to fetch projects for
 * @param includeCounts - Whether to include MappedAccount and TaxAdjustment counts (default: false for backward compatibility)
 */
export async function getUserProjects(
  userId: string,
  includeCounts = false
): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  projectType: string;
  serviceLine: string;
  status: string;
  archived: boolean;
  clientId: number | null;
  taxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    MappedAccount: number;
    TaxAdjustment: number;
  };
}>> {
  if (includeCounts) {
    // Optimized query with counts in single query
    const projectUsers = await prisma.projectUser.findMany({
      where: { userId },
      include: {
        Project: {
          include: {
            _count: {
              select: {
                MappedAccount: true,
                TaxAdjustment: true,
              },
            },
          },
        },
      },
    });

    return projectUsers.map(pu => pu.Project);
  } else {
    // Backward compatible - no counts
    const projectUsers = await prisma.projectUser.findMany({
      where: { userId },
      include: {
        Project: true,
      },
    });

    return projectUsers.map(pu => pu.Project);
  }
}
