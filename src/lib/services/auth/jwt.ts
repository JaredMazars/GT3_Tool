/**
 * JWT utilities for Edge Runtime
 * This file must NOT import Prisma or any server-only dependencies
 */
import { jwtVerify, SignJWT } from 'jose';
import type { Session } from '@/lib/services/auth/types';

const JWT_SECRET_STRING = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET_STRING) {
  throw new Error('NEXTAUTH_SECRET is not configured');
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Verify session token (JWT only - no database lookup)
 * Safe to use in middleware / Edge Runtime
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
 * Create a new session token
 */
export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT(session as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

