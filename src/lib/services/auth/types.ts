/**
 * Authentication type definitions
 * Shared across Edge and Node runtimes
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  user: SessionUser;
  exp: number;
}

