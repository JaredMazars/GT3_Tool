# Authentication and Session Management Updates

## Summary
Fixed authentication errors and implemented proper database-backed session management with cross-device logout support.

## Changes Made

### 1. Rate Limiting (`src/lib/rateLimit.ts`)
- Added `AUTH_ENDPOINTS` preset with lenient rate limits (10 requests per minute)
- Added `clearRateLimitsForIdentifier()` to clear all rate limits for a specific IP
- Exported `getClientIdentifier()` for use in other modules

### 2. Authentication Library (`src/lib/auth.ts`)
- Updated `createSession()` to store sessions in database
- Added `getSessionFromDatabase()` to validate sessions against DB
- Updated `verifySession()` to check both JWT validity AND database existence
- Added `deleteSession()` to remove specific session from database
- Added `deleteAllUserSessions()` to logout from all devices

### 3. Login Route (`src/app/api/auth/login/route.ts`)
- Applied `AUTH_ENDPOINTS` rate limit preset (more lenient than standard)

### 4. Callback Route (`src/app/api/auth/callback/route.ts`)
- Applied `AUTH_ENDPOINTS` rate limit preset
- Sessions now automatically stored in database via `createSession()`

### 5. Logout Route (`src/app/api/auth/logout/route.ts`)
- GET and POST endpoints now delete session from database
- Clear rate limits for the user's IP address on logout
- GET endpoint supports `?all=true` query parameter to logout from all devices

### 6. New Logout All Endpoint (`src/app/api/auth/logout-all/route.ts`)
- Dedicated endpoint for logging out from all devices
- Supports both GET (redirect) and POST (JSON response) methods
- Deletes all database sessions for the user
- Clears rate limits on logout

## How It Works

### Session Creation
1. User authenticates via Azure AD
2. JWT token is created and stored in cookie
3. Session record is created in database with expiration time
4. Both JWT and database record must be valid for session to be active

### Session Validation
1. Check JWT signature and expiration
2. Verify session exists in database and hasn't expired
3. Clean up expired sessions automatically

### Logout Behavior
1. **Single Device Logout**: Delete current session from database
2. **All Devices Logout**: Delete all sessions for the user
3. Clear rate limits for the IP address
4. Remove session cookie

### Browser Close Behavior
- Session cookie has no `maxAge`, so it expires when browser closes
- Database session remains valid for 1 day but cannot be accessed without the cookie
- This is the expected behavior for security

## Usage

### Normal Logout
```
GET /api/auth/logout
POST /api/auth/logout
```

### Logout from All Devices
```
GET /api/auth/logout?all=true
GET /api/auth/logout-all
POST /api/auth/logout-all
```

## Benefits

1. **No More Rate Limit Lockouts**: Auth endpoints have lenient rate limits, and limits are cleared on logout
2. **Immediate Session Invalidation**: Logging out invalidates the session server-side immediately
3. **Cross-Device Logout**: Users can logout from all devices at once
4. **Better Security**: Sessions can be revoked server-side, not just by clearing cookies
5. **Expired Session Cleanup**: Old sessions are automatically cleaned up from database

## Testing Checklist

- [x] Login locally works without rate limit errors
- [x] Closing browser clears session (cookie removed)
- [x] Logout invalidates session immediately (even if JWT copied)
- [x] Logout clears rate limits for that IP
- [x] Multiple logins from different devices create separate DB sessions
- [x] Logout from one device doesn't affect other devices (unless using logout-all)

