import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '../../db/prisma';
import { withRetry, RetryPresets } from '../../utils/retryUtils';
import type { Session, SessionUser } from './types';
import { cache } from '@/lib/services/cache/CacheService';
import type { NextRequest } from 'next/server';
import { ensureSharedServiceAccess } from '@/lib/services/service-lines/serviceLineService';

// Helper for conditional logging (avoid importing logger to prevent Edge Runtime issues)
const log = {
  info: (message: string, meta?: any) => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // console.log(`[INFO] ${message}`, meta || '');
    }
  },
  warn: (message: string, meta?: any) => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${message}`, meta || '');
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
 * Generate session fingerprint from user agent + IP
 * This helps prevent session hijacking by binding the session to specific client characteristics
 */
function generateFingerprint(userAgent: string, ipAddress: string): string {
  return createHash('sha256')
    .update(`${userAgent}:${ipAddress}:${process.env.NEXTAUTH_SECRET}`)
    .digest('hex');
}

/**
 * Get client IP address from request-like headers
 * Used for session fingerprinting
 */
function getClientIP(headers: { get: (name: string) => string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    if (firstIp) return firstIp.trim();
  }
  
  if (realIp) return realIp;
  if (cfConnectingIp) return cfConnectingIp;
  
  return 'unknown';
}

/**
 * Generate authorization URL for Azure AD login
 * @param redirectUri - Callback URL after authentication
 * @param prompt - Optional prompt parameter ('login', 'select_account', 'consent', 'none')
 */
export async function getAuthUrl(redirectUri: string, prompt?: string | null): Promise<string> {
  const authCodeUrlParameters: any = {
    scopes: ['user.read', 'openid', 'profile', 'email'],
    redirectUri,
  };

  // Add prompt parameter if provided (e.g., 'login' forces re-authentication)
  if (prompt) {
    authCodeUrlParameters.prompt = prompt;
  }

  const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
  return authUrl;
}

/**
 * Generate Azure AD logout URL for full sign-out
 * Clears both application session and Azure AD session
 * @param postLogoutRedirectUri - URL to redirect to after logout
 */
export function getLogoutUrl(postLogoutRedirectUri: string): string {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
  return logoutUrl;
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

  log.info('Attempting token exchange with Azure AD', { 
    redirectUri, 
    hasCode: !!code,
    codeLength: code?.length 
  });

  let response;
  try {
    response = await pca.acquireTokenByCode(tokenRequest);
  } catch (error) {
    log.error('Azure AD token exchange failed', error);
    // Re-throw with additional context
    const enhancedError = new Error(
      `Azure AD token exchange failed: ${error instanceof Error ? error.message : String(error)}`
    );
    // Preserve original error properties for MSAL errors
    if (error && typeof error === 'object') {
      Object.assign(enhancedError, error);
    }
    throw enhancedError;
  }
  
  if (!response || !response.account) {
    log.error('Token response missing account information', { 
      hasResponse: !!response,
      hasAccount: !!response?.account 
    });
    throw new Error('Failed to acquire token - no account information in response');
  }
  
  log.info('Token exchange successful', { 
    accountId: response.account.homeAccountId,
    username: response.account.username 
  });

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
    RetryPresets.AUTH_DATABASE,
    'Auth callback - find user'
  );

  if (!dbUser) {
    log.info('Creating new user in database', { email, userId });
    
    // Check if this is the first user in the system
    const userCount = await withRetry(
      async () => {
        return await prisma.user.count();
      },
      RetryPresets.AUTH_DATABASE,
      'Auth callback - count users'
    );
    
    const isFirstUser = userCount === 0;
    const assignedRole = isFirstUser ? 'SYSTEM_ADMIN' : 'USER';
    
    if (isFirstUser) {
      log.info('Creating first user in system - assigning SYSTEM_ADMIN role', { email });
    }
    
    // Create new user in database with retry logic
    dbUser = await withRetry(
      async () => {
        return await prisma.user.create({
          data: {
            id: userId,
            email,
            name,
            role: assignedRole,
            updatedAt: new Date(),
          },
        });
      },
      RetryPresets.AUTH_DATABASE,
      'Auth callback - create user'
    );
    
    if (isFirstUser) {
      log.info('First system administrator created successfully', { 
        userId: dbUser.id, 
        email: dbUser.email 
      });
    }
    
    // Auto-assign shared services access for new users (non-SYSTEM_ADMIN)
    if (dbUser.role !== 'SYSTEM_ADMIN') {
      try {
        await ensureSharedServiceAccess(dbUser.id);
        log.info('Assigned shared services access to new user', { userId: dbUser.id });
      } catch (error) {
        // Log error but don't fail authentication
        log.error('Failed to assign shared services access', error);
      }
    }
  }

  const user: SessionUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name || dbUser.email,
    role: dbUser.role || 'USER', // Legacy - kept for backward compatibility
    systemRole: dbUser.role || 'USER', // SYSTEM_ADMIN or USER
  };

  log.info('User authenticated successfully', { userId: user.id, email: user.email, systemRole: user.systemRole });
  
  return user;
}

/**
 * Create a session token (JWT) and store in database
 * Now includes session fingerprinting for enhanced security
 */
export async function createSession(
  user: SessionUser,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  // Generate session fingerprint (enabled by default, opt-out with SESSION_FINGERPRINT_DISABLED=true)
  const fingerprintEnabled = process.env.SESSION_FINGERPRINT_DISABLED !== 'true';
  const fingerprint = fingerprintEnabled && userAgent && ipAddress
    ? generateFingerprint(userAgent, ipAddress)
    : undefined;
  
  // Create unique session ID (jti - JWT ID)
  const sessionJti = randomBytes(16).toString('hex');
  
  // Include fingerprint in JWT payload for validation
  const payload: any = { user };
  if (fingerprint) {
    payload.fingerprint = fingerprint;
  }
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .setJti(sessionJti) // Unique token ID for tracking
    .sign(JWT_SECRET);

  // Store session in database with retry logic for Azure SQL cold-start
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionId = `sess_${sessionJti}`;
  
  log.info('Creating session in database', { userId: user.id, sessionId, hasFingerprint: !!fingerprint });
  
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
    RetryPresets.AUTH_DATABASE,
    'Create session'
  );

  // Cache session with fingerprint (1 hour TTL)
  const sessionData = {
    id: sessionId,
    sessionToken: token,
    userId: user.id,
    expires: expiresAt,
    fingerprint,
    User: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.systemRole,
    },
  };
  await cache.set(`session:${token}`, sessionData, 3600);

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
 * Get session from cache or database
 */
export async function getSessionFromDatabase(token: string): Promise<DatabaseSession | null> {
  try {
    // Try cache first
    const cacheKey = `session:${token}`;
    const cachedSession = await cache.get<DatabaseSession>(cacheKey);
    
    if (cachedSession) {
      // Check if cached session hasn't expired
      if (new Date(cachedSession.expires) > new Date()) {
        log.info('Session cache hit', { userId: cachedSession.userId });
        return cachedSession;
      }
      // Expired - remove from cache
      await cache.delete(cacheKey);
    }

    // Not in cache or expired - fetch from database
    // Use fast retry logic for session lookup (user-facing operation)
    const session = await withRetry(
      async () => {
        return await prisma.session.findUnique({
          where: { sessionToken: token },
          include: { User: true },
        });
      },
      RetryPresets.AUTH_DATABASE,
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
          RetryPresets.AUTH_DATABASE,
          'Delete expired session'
        );
      }
      return null;
    }

    // Cache the session (TTL: 1 hour)
    const sessionData: DatabaseSession = {
      id: session.id,
      sessionToken: session.sessionToken,
      userId: session.userId,
      expires: session.expires,
      User: {
        id: session.User.id,
        email: session.User.email || '',
        name: session.User.name || '',
        role: session.User.role,
      },
    };
    
    await cache.set(cacheKey, sessionData, 3600); // 1 hour
    log.info('Session cached', { userId: session.userId });

    return sessionData;
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
 * Validates session fingerprint if enabled
 * Use this in API routes where Prisma is available
 */
export async function verifySession(
  token: string,
  userAgent?: string,
  ipAddress?: string
): Promise<Session | null> {
  try {
    // First verify JWT signature and expiration
    const verified = await jwtVerify(token, JWT_SECRET);
    
    // Validate fingerprint (enabled by default, opt-out with SESSION_FINGERPRINT_DISABLED=true)
    const fingerprintEnabled = process.env.SESSION_FINGERPRINT_DISABLED !== 'true';
    if (fingerprintEnabled && verified.payload.fingerprint && userAgent && ipAddress) {
      const currentFingerprint = generateFingerprint(userAgent, ipAddress);
      if (verified.payload.fingerprint !== currentFingerprint) {
        log.error('Session fingerprint mismatch - possible session hijacking attempt', {
          userId: (verified.payload as any).user?.id,
        });
        return null;
      }
    }
    
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
 * Also verifies service line access for non-superusers
 */
export async function checkProjectAccess(
  userId: string,
  taskId: number,
  requiredRole?: string
): Promise<boolean> {
  try {
    // Check if user is a System Admin (bypasses service line check)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

    // Get the project's service line
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });

    if (!task) {
      return false;
    }

    // System Admins have full access to all projects
    if (isSystemAdmin) {
      return true;
    }

    // Non-System Admins must have service line access
    // First, map ServLineCode to SubServlineGroupCode
    const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { SubServlineGroupCode: true },
    });

    if (!serviceLineMapping?.SubServlineGroupCode) {
      return false;
    }

    const serviceLineAccess = await prisma.serviceLineUser.findFirst({
      where: {
        userId,
        subServiceLineGroup: serviceLineMapping.SubServlineGroupCode,
      },
    });

    if (!serviceLineAccess) {
      return false;
    }

    // Service line ADMINs and PARTNERs can access all projects in their service line
    if (serviceLineAccess.role === 'ADMINISTRATOR' || serviceLineAccess.role === 'PARTNER') {
      return true;
    }

    // Get user's project membership
    const projectUser = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId,
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
 * Check if user has access to a client
 * A user has access to a client if:
 * 1. They are a SYSTEM_ADMIN, or
 * 2. They have access to any service line that has projects for this client, or
 * 3. They are assigned to any project for that client
 */
export async function checkClientAccess(
  userId: string,
  GSClientID: string
): Promise<boolean> {
  try {
    // Check if user is a superuser (full access)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SYSTEM_ADMIN') {
      return true;
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { GSClientID: true },
    });

    if (!client) {
      return false;
    }

    // Get all unique service lines from tasks for this client
    const taskServiceLines = await prisma.task.findMany({
      where: { 
        Client: { GSClientID: GSClientID }
      },
      select: { ServLineCode: true },
      distinct: ['ServLineCode'],
    });

    // If client has tasks, check if user has access to any of those service lines
    if (taskServiceLines.length > 0) {
      const serviceLines = taskServiceLines.map(t => t.ServLineCode);
      
      const serviceLineAccess = await prisma.serviceLineUser.findFirst({
        where: {
          userId,
          subServiceLineGroup: { in: serviceLines },
        },
      });

      if (serviceLineAccess) {
        return true;
      }
    }

    // Check if user is assigned to any task for this client
    const taskAccess = await prisma.taskTeam.findFirst({
      where: {
        userId,
        Task: {
          Client: { GSClientID: GSClientID },
        },
      },
    });

    return !!taskAccess;
  } catch (error) {
    log.error('Error checking client access', error);
    return false;
  }
}

/**
 * Get user's role on a project
 */
export async function getUserTaskRole(
  userId: string,
  taskId: number
): Promise<string | null> {
  try {
    const projectUser = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId,
      },
    });

    return projectUser?.role || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is a System Admin (SYSTEM_ADMIN or legacy ADMIN role)
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Check for SYSTEM_ADMIN (current) or ADMIN (legacy support)
    return user?.role === 'SYSTEM_ADMIN' || user?.role === 'ADMIN';
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
export async function requireTaskRole(
  userId: string,
  taskId: number,
  requiredRole: string
): Promise<void> {
  const hasAccess = await checkProjectAccess(userId, taskId, requiredRole);
  
  if (!hasAccess) {
    throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
  }
}

/**
 * Delete a specific session from database
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    // Delete from cache
    await cache.delete(`session:${token}`);
    
    // Delete from database
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
  // Invalidate all session caches for this user
  await cache.invalidate(`session:`);
  
  // Delete from database
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
  serviceLine: string;
  status: string;
  archived: boolean;
  GSClientID: number | null;
  taxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    MappedAccount: number;
    TaxAdjustment: number;
  };
}>> {
  // This function is not yet fully implemented to match the new Task schema
  // TODO: Refactor to map Task schema fields to expected output format
  return [];
}

/**
 * @deprecated This function is deprecated. Use checkFeature() from @/lib/permissions/checkFeature instead.
 * Kept for backward compatibility only - always returns false.
 */
export async function checkUserPermission(
  userId: string,
  resource: string,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
): Promise<boolean> {
  log.warn('checkUserPermission is deprecated. Use checkFeature() from @/lib/permissions/checkFeature instead.', { resource, action });
  return false;
}

/**
 * @deprecated This function is deprecated. Use requireFeature() from @/lib/permissions/checkFeature instead.
 * Kept for backward compatibility only - always throws an error.
 */
export async function requirePermission(
  userId: string,
  resource: string,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
): Promise<void> {
  log.warn('requirePermission is deprecated. Use requireFeature() from @/lib/permissions/checkFeature instead.', { resource, action });
  throw new Error(`Permission denied: ${action} on ${resource} - Use feature-based permissions instead`);
}

