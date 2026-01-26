/**
 * Application route constants
 */

export const ROUTES = {
  HOME: '/',
  DASHBOARD: {
    ROOT: '/dashboard',
    PROJECTS: '/dashboard',
    NOTIFICATIONS: '/dashboard/notifications',
  },
  AUTH: {
    SIGNIN: '/auth/signin',
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
  SERVICE_LINE: {
    CLIENTS: (serviceLine: string) => `/dashboard/${serviceLine.toLowerCase()}`,
    CLIENT_DETAIL: (serviceLine: string, clientId: number) => 
      `/dashboard/${serviceLine.toLowerCase()}/clients/${clientId}`,
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
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    DETAIL: (id: number) => `/api/notifications/${id}`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    UNREAD_COUNT: '/api/notifications/unread-count',
    SEND_MESSAGE: '/api/notifications/send-message',
  },
  MAP: '/api/map',
} as const;






