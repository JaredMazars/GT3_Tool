/**
 * Application route constants
 */

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNOUT: '/auth/signout',
    ERROR: '/auth/error',
  },
  PROJECTS: {
    LIST: '/dashboard',
    CREATE: '/dashboard?modal=create-project',
    DETAIL: (id: number) => `/dashboard/projects/${id}`,
    MAPPING: (id: number) => `/dashboard/projects/${id}/mapping`,
    TAX_CALCULATION: (id: number) => `/dashboard/projects/${id}/tax-calculation`,
    REPORTING: (id: number) => `/dashboard/projects/${id}/reporting`,
    OPINION_DRAFTING: (id: number) => `/dashboard/projects/${id}/opinion-drafting`,
    USERS: (id: number) => `/dashboard/projects/${id}/users`,
  },
  CLIENTS: {
    LIST: '/dashboard/clients',
    DETAIL: (id: number) => `/dashboard/clients/${id}`,
  },
  ADMIN: {
    USERS: '/dashboard/admin/users',
  },
} as const;

export const API_ROUTES = {
  HEALTH: '/api/health',
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    SESSION: '/api/auth/session',
    CALLBACK: '/api/auth/callback',
  },
  PROJECTS: {
    LIST: '/api/projects',
    DETAIL: (id: number) => `/api/projects/${id}`,
    MAP: (id: number) => `/api/projects/${id}/map`,
    ADJUSTMENTS: (id: number) => `/api/projects/${id}/tax-adjustments`,
    REPORTS: (id: number) => `/api/projects/${id}/reports`,
    USERS: (id: number) => `/api/projects/${id}/users`,
  },
  CLIENTS: {
    LIST: '/api/clients',
    DETAIL: (id: number) => `/api/clients/${id}`,
  },
  MAP: '/api/map',
} as const;


