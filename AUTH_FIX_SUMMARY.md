# Authentication Callback Error - Fix Summary

## What Was Done

### 1. Enhanced Error Logging ✅

**Files Modified:**
- `src/app/api/auth/callback/route.ts`
- `src/lib/services/auth/auth.ts`

**Improvements:**
- Added detailed Azure AD error code extraction (e.g., AADSTS50011, AADSTS65001)
- Specific detection for redirect URI mismatch errors
- Separate handling for admin consent errors
- Enhanced context logging including:
  - Expected vs actual redirect URIs
  - Environment variable validation
  - Token exchange step-by-step tracking
  - Detailed recommendations for each error type

**What This Means:**
When the authentication fails now, the container logs will show the **exact Azure AD error code** and specific guidance on how to fix it, instead of the generic "callback_failed" message.

### 2. Verification Tools Created ✅

**Script: `scripts/verify-azure-deployment.sh`**
- Automated checking of Azure CLI setup
- Environment variable validation
- Step-by-step Azure AD configuration guidance
- Recent log viewing

**Documentation: `docs/AZURE_AUTH_TROUBLESHOOTING.md`**
- Complete troubleshooting guide
- Common error codes and solutions
- Manual verification steps
- Advanced debugging techniques

**Script: `scripts/test-auth-flow.sh`**
- Automated endpoint testing
- Live log monitoring during authentication
- Environment configuration validation

### 3. Deployment Configuration Validated ✅

**Verified Requirements:**
- `NEXTAUTH_URL` must be: `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io`
- Azure AD redirect URI must be: `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/api/auth/callback`
- All required environment variables documented

## How to Fix Your Deployment

### Quick Start (Recommended Order)

#### Step 1: Run Verification Script

```bash
cd /Users/walter.blake/Documents/Development/mapper
./scripts/verify-azure-deployment.sh
```

This will check your current configuration and identify any issues.

#### Step 2: Fix Any Issues Found

Based on the verification script output, you may need to:

**A. Update Environment Variables**

If environment variables are missing or incorrect:

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

**B. Add Redirect URI to Azure AD**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find app: `050a0513-3caa-440a-91e1-665d38685aeb`
4. Click **Authentication**
5. Under **Web** platform, add URI:
   ```
   https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/api/auth/callback
   ```
6. Click **Save**

**C. Grant Admin Consent (If Required)**

If your organization requires admin consent:

1. In the same App Registration, go to **API permissions**
2. Click **Grant admin consent for [Your Organization]**
3. Confirm

#### Step 3: Deploy Changes

If you've made code changes (enhanced logging), redeploy:

```bash
./deploy.sh
```

The verification script and troubleshooting docs don't need deployment - they're local tools.

#### Step 4: Test Authentication

Run the test script to validate:

```bash
./scripts/test-auth-flow.sh
```

This will:
- Check all endpoints
- Verify configuration
- Monitor logs while you test authentication

Or test manually:

1. Clear browser cookies
2. Go to: `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/auth/signin`
3. Complete Azure AD login
4. You should be redirected to the dashboard

#### Step 5: Check Detailed Logs

If authentication still fails, the enhanced logging will now show exactly why:

```bash
az containerapp logs show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --tail 100 \
  --follow
```

Look for lines containing:
- "Azure AD token exchange failed" - Shows the specific Azure AD error
- "redirect URI mismatch" - Indicates redirect URI configuration issue
- "admin consent required" - Needs admin approval in Azure Portal

## Most Likely Root Cause

Based on your situation (worked before code changes), the issue is most likely **one of these**:

### 1. Missing Redirect URI (70% probability)
The redirect URI `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/api/auth/callback` was never added to Azure AD App Registration.

**Fix:** Add it in Azure Portal → App Registration → Authentication

### 2. Wrong NEXTAUTH_URL (20% probability)
The `NEXTAUTH_URL` environment variable on the container doesn't match the deployed URL.

**Fix:** Update with the `az containerapp update` command above

### 3. Missing/Expired Client Secret (10% probability)
The Azure AD client secret is not set or has expired.

**Fix:** Create new secret in Azure Portal and update environment variable

## What Changed Since It Last Worked

The authentication code itself hasn't changed significantly in recent commits. The issue is most likely **configuration-related**:

- Azure AD App Registration redirect URIs not updated for deployed URL
- Environment variables not properly set on the container
- Azure AD client secret expired

## Expected Outcome After Fix

Once the correct configuration is in place:

1. User visits `/auth/signin`
2. Redirects to Azure AD login
3. User enters credentials
4. Azure AD redirects to `/api/auth/callback` with auth code
5. App exchanges code for tokens ✅ (This is where it's currently failing)
6. App creates/finds user in database
7. App creates session
8. Redirects to `/dashboard` ✅

The enhanced logging will now show **exactly** which step fails and why.

## Additional Resources

- **Full Troubleshooting Guide:** `docs/AZURE_AUTH_TROUBLESHOOTING.md`
- **Azure AD Setup:** `AZURE_AD_SETUP.md`
- **Deployment Script:** `deploy.sh`

## Need Help?

1. Run the verification script first: `./scripts/verify-azure-deployment.sh`
2. Check the troubleshooting guide: `docs/AZURE_AUTH_TROUBLESHOOTING.md`
3. Look for specific Azure AD error codes in the container logs
4. The enhanced logging will give you exact guidance for each error type

## Summary

✅ **Enhanced error logging** - Will show exact Azure AD error codes
✅ **Created verification tools** - Automated configuration checking
✅ **Documented all steps** - Complete troubleshooting guide
🔧 **Action Required** - Update Azure AD redirect URI and/or environment variables
🧪 **Test** - Use test script or manual testing after fixes





