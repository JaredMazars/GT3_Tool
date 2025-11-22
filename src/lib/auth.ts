import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { prisma } from './db/prisma';

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

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role?: string; // Deprecated - use systemRole instead
  systemRole?: string; // SUPERUSER or USER
}

export interface Session {
  user: SessionUser;
  exp: number;
}

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

  // Find or create user in database
  let dbUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!dbUser) {
    // Create new user in database
    dbUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        role: 'USER', // Default role
      },
    });
  }

  const user: SessionUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name || dbUser.email,
    role: dbUser.role || 'USER', // Legacy - kept for backward compatibility
    systemRole: dbUser.role || 'USER', // SUPERUSER or USER
  };

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

  // Store session in database
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionId = `sess_${randomBytes(16).toString('hex')}`;
  await prisma.session.create({
    data: {
      id: sessionId,
      sessionToken: token,
      userId: user.id,
      expires: expiresAt,
    },
  });

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
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { User: true },
    });

    // Check if session exists and hasn't expired
    if (!session || session.expires < new Date()) {
      // Clean up expired session if it exists
      if (session) {
        await prisma.session.delete({
          where: { sessionToken: token },
        });
      }
      return null;
    }

    return session;
  } catch (error) {
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
 */
export async function getUserProjects(userId: string): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  projectType: string;
  status: string;
  archived: boolean;
  clientId: number | null;
  taxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const projectUsers = await prisma.projectUser.findMany({
    where: { userId },
    include: {
      Project: true,
    },
  });

  return projectUsers.map(pu => pu.Project);
}
