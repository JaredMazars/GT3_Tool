import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

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

  // Find or create user in database
  let dbUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!dbUser) {
    // Create new user in database
    dbUser = await prisma.user.create({
      data: {
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
  };

  return user;
}

/**
 * Create a session token (JWT)
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode session token
 */
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
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
 * Check if user has access to a project (placeholder - implement with database check)
 */
export async function checkProjectAccess(
  userId: string,
  projectId: number,
  requiredRole?: string
): Promise<boolean> {
  // TODO: Implement actual project access check with database
  // For now, return true to allow access
  return true;
}

/**
 * Require admin access (placeholder - implement with database check)
 */
export async function requireAdmin(): Promise<boolean> {
  // TODO: Implement actual admin check with database
  return true;
}

/**
 * Get user projects - get all projects the user has access to
 */
export async function getUserProjects(userId: string): Promise<any[]> {
  const projectUsers = await prisma.projectUser.findMany({
    where: { userId },
    include: {
      project: true,
    },
  });

  return projectUsers.map(pu => pu.project);
}
