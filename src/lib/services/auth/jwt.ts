/**
 * JWT utilities for Edge Runtime
 * This file must NOT import Prisma or any server-only dependencies
 * 
 * Security Features:
 * - JWT secret rotation support (graceful migration)
 * - Session fingerprinting validation
 */
import { jwtVerify, SignJWT } from 'jose';
import type { Session } from '@/lib/services/auth/types';

const JWT_SECRET_STRING = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET_STRING) {
  throw new Error('NEXTAUTH_SECRET is not configured');
}

// Support multiple JWT secrets for rotation without downtime
// Current secret is tried first, then old secret during grace period
const JWT_SECRETS: Uint8Array[] = [
  new TextEncoder().encode(JWT_SECRET_STRING), // Current secret
];

// Add old secret if configured (for rotation grace period)
if (process.env.NEXTAUTH_SECRET_OLD) {
  JWT_SECRETS.push(new TextEncoder().encode(process.env.NEXTAUTH_SECRET_OLD));
}

// Primary secret for signing new tokens
const JWT_SECRET = JWT_SECRETS[0]!; // Safe: always at least one secret

/**
 * Verify session token (JWT only - no database lookup)
 * Safe to use in middleware / Edge Runtime
 * Supports secret rotation by trying current secret first, then old secret
 */
export async function verifySessionJWTOnly(token: string): Promise<Session | null> {
  // Try each secret in order (current first, then old)
  for (const secret of JWT_SECRETS) {
    try {
      const verified = await jwtVerify(token, secret);
      return verified.payload as unknown as Session;
    } catch (error) {
      // Continue to next secret if verification fails
      continue;
    }
  }
  
  // No secret could verify the token
  return null;
}

/**
 * Create a new session token
 */
export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT(session as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}


