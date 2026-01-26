# Azure AD Authentication Troubleshooting Guide

## Quick Diagnosis

If you're experiencing `callback_failed` errors on the deployed app, follow these steps in order:

### 1. Run Automated Verification Script

```bash
./scripts/verify-azure-deployment.sh
```

This script will check:
- Azure CLI installation and login status
- Container App environment variables
- Provide instructions for manual Azure AD verification
- Show recent container logs

### 2. Manual Azure AD Configuration Check

#### Verify Redirect URI in Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations**
3. Find your app: **Tax Computation Mapper**
   - App ID: `050a0513-3caa-440a-91e1-665d38685aeb`
4. Click **Authentication** in the left menu
5. Under **Platform configurations** → **Web**, verify these redirect URIs exist:
   
   **Authentication callback URI (required for login):**
   ```
   https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/api/auth/callback
   ```
   
   **Post-logout redirect URI (required for logout):**
   
   Under the same **Web** platform configuration, scroll down to **Front-channel logout URL** section and add:
   ```
   https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io
   ```
   
   Or add it to the redirect URIs list:
   ```
   https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io
   ```
   
   **For local development, also add:**
   - Callback: `http://localhost:3000/api/auth/callback`
   - Post-logout: `http://localhost:3000`

6. If missing:
   - Click **Add URI**
   - Paste the URIs above
   - Click **Save**

**Note:** The post-logout redirect URI must be registered for the logout flow to work properly. Without it, users will see an Azure AD error after signing out.

#### Check API Permissions

Still in the App Registration:

1. Click **API permissions** in the left menu
2. Verify these permissions exist:
   - **Microsoft Graph**:
     - `User.Read` (Delegated)
     - `openid` (Delegated)
     - `profile` (Delegated)
     - `email` (Delegated)
     - `Files.ReadWrite.All` (Delegated)
     - `Sites.ReadWrite.All` (Delegated)
3. If your tenant requires admin consent:
   - Click **Grant admin consent for [Your Organization]**
   - Confirm when prompted

### 3. Environment Variables Check

Required environment variables on the deployed Container App:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXTAUTH_URL` | `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io` | Must match exactly |
| `AZURE_AD_CLIENT_ID` | `050a0513-3caa-440a-91e1-665d38685aeb` | From Azure AD App Registration |
| `AZURE_AD_TENANT_ID` | Your tenant GUID | From Azure AD |
| `AZURE_AD_CLIENT_SECRET` | Your client secret | From App Registration → Certificates & secrets |
| `NEXTAUTH_SECRET` | Random 32+ character string | For JWT signing |

#### Update Environment Variables

```bash
az containerapp update \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --set-env-vars \
    "NEXTAUTH_URL=https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io" \
    "AZURE_AD_CLIENT_ID=050a0513-3caa-440a-91e1-665d38685aeb" \
    "AZURE_AD_TENANT_ID=<your-tenant-id>" \
    "AZURE_AD_CLIENT_SECRET=<your-secret>" \
    "NEXTAUTH_SECRET=<your-jwt-secret>"
```

**Note:** After updating environment variables, the container will automatically restart.

### 4. Monitor Logs During Authentication

With enhanced error logging now in place, you can see detailed error information:

```bash
# Follow logs in real-time
az containerapp logs show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --tail 100 \
  --follow
```

While logs are streaming:
1. Open a new browser window
2. Navigate to: `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/auth/signin`
3. Complete the Azure AD login flow
4. Watch the logs for detailed error messages

## Common Error Codes

### AADSTS50011 - Redirect URI Mismatch

**Symptom:** Error message contains `AADSTS50011` or "redirect_uri_mismatch"

**Cause:** The redirect URI in the authentication request doesn't match any URI registered in Azure AD

**Solution:**
1. Verify `NEXTAUTH_URL` environment variable is correct
2. Add the correct redirect URI to Azure AD App Registration
3. Ensure no typos (http vs https, trailing slashes, etc.)

### AADSTS65001 - User Consent Required

**Symptom:** Error message contains `AADSTS65001` or "consent required"

**Cause:** Your organization requires admin consent for applications

**Solution:**
1. Go to Azure Portal → App Registration → API permissions
2. Click "Grant admin consent for [Organization]"
3. Retry authentication

### AADSTS700016 - Application Not Found

**Symptom:** Error message contains `AADSTS700016`

**Cause:** The client ID doesn't match any registered application

**Solution:**
1. Verify `AZURE_AD_CLIENT_ID` environment variable matches the App Registration ID
2. Check you're in the correct tenant

### AADSTS7000215 - Invalid Client Secret

**Symptom:** Error message contains `AADSTS7000215`

**Cause:** The client secret is expired or incorrect

**Solution:**
1. Go to Azure Portal → App Registration → Certificates & secrets
2. Create a new client secret
3. Update `AZURE_AD_CLIENT_SECRET` environment variable
4. Redeploy or restart the container

### Database Timeout Errors

**Symptom:** Error reason `database_timeout`, mentions "Azure SQL cold-start"

**Cause:** Azure SQL Database is starting up or experiencing network issues

**Solution:**
1. This is usually temporary
2. Wait 30-60 seconds and retry
3. If persists, check `DATABASE_URL` environment variable
4. Verify Azure SQL firewall rules allow Container App connections

### Logout Not Working - Immediately Re-authenticated

**Symptom:** Clicking "Sign out" redirects back to dashboard without signing out

**Cause:** The logout flow was redirecting directly to `/api/auth/login` instead of Azure AD's logout endpoint, which meant the Azure AD SSO session was never cleared

**Solution:**
This has been fixed in the latest version. The logout flow now:
1. Deletes the application session
2. Redirects to Azure AD logout endpoint
3. Azure AD clears the SSO session
4. Azure AD redirects back to app root
5. Middleware detects no session and redirects to login

**Required Azure AD Configuration:**
- Post-logout redirect URI must be registered (see "Verify Redirect URI" section above)
- Must be the base URL (e.g., `https://your-app.com` or `http://localhost:3000`)
- Do NOT include `/api/auth/login` or other paths

**Testing:**
1. Click "Sign out" in user menu
2. You should briefly see Azure AD logout page
3. You'll be redirected to app root, then to Azure AD login
4. You must re-enter credentials to sign in

## Testing After Fixes

### Clear Browser State

1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear cookies for the deployed domain
4. Clear local storage
5. Close and reopen browser

### Test Authentication Flow

1. Navigate to: `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/auth/signin`
2. You should be redirected to Azure AD login
3. Enter your credentials
4. After successful authentication, you should be redirected to `/dashboard`
5. Verify you can navigate the application

### Verify Session Persistence

1. After successful login, refresh the page
2. You should remain logged in
3. Check that your name appears in the navigation bar
4. Try navigating to a protected route (e.g., `/dashboard/TAX/clients`)

## Advanced Debugging

### View All Container App Details

```bash
az containerapp show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --output json
```

### Check Container App Revisions

```bash
az containerapp revision list \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --output table
```

### Restart Container App

```bash
az containerapp revision restart \
  --name mapper-tax-app \
  --resource-group walter_sandbox
```

### Export Logs to File

```bash
az containerapp logs show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --tail 500 \
  --type console > auth-logs.txt
```

## Still Having Issues?

If you've completed all steps above and still experiencing errors:

1. **Check the enhanced logs** - The new error logging will show:
   - Exact Azure AD error code
   - Expected vs actual redirect URI
   - Environment variable validation
   - Token exchange details

2. **Verify network connectivity** - Ensure the Container App can reach:
   - `login.microsoftonline.com`
   - `graph.microsoft.com`
   - Your Azure SQL Database

3. **Check Azure AD tenant settings** - Some tenants have additional security policies that may block authentication

4. **Review recent code changes** - If authentication worked previously, check what changed:
   ```bash
   git log --since="7 days ago" --oneline -- src/lib/services/auth/ src/app/api/auth/
   ```

## Related Documentation

- [Azure AD Setup Guide](../AZURE_AD_SETUP.md)
- [Deployment Instructions](../deploy.sh)
- [Docker Security](../DOCKER-SECURITY.md)































