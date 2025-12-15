# Azure AD Configuration for Deployed App

## Issue
Authentication fails on deployed app with error:
```
AADSTS65001: The user or administrator has not consented to use the application
```

## Deployed App URL
```
https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io
```

## Azure AD App Registration ID
```
050a0513-3caa-440a-91e1-665d38685aeb
```

## Fix Steps

### 1. Add Redirect URI to Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your app: **Tax Computation Mapper** (ID: `050a0513-3caa-440a-91e1-665d38685aeb`)
4. Click on **Authentication** in the left menu
5. Under **Platform configurations** > **Web**, click **Add URI**
6. Add this redirect URI:
   ```
   https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/api/auth/callback
   ```
7. Click **Save**

### 2. Grant Admin Consent (if required by your tenant)

If your organization requires admin consent:

1. In the same App Registration, go to **API permissions**
2. Click **Grant admin consent for [Your Organization]**
3. Confirm the consent

Required permissions:
- `User.Read` (Microsoft Graph)
- `openid` (Microsoft Graph)
- `profile` (Microsoft Graph)
- `email` (Microsoft Graph)
- `Files.ReadWrite.All` (Microsoft Graph)
- `Sites.ReadWrite.All` (Microsoft Graph)

### 3. Verify Container App Environment Variables

Ensure the deployed app has the correct environment variables:

```bash
az containerapp show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --query "properties.template.containers[0].env" \
  -o table
```

Required variables:
- `NEXTAUTH_URL=https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io`
- `AZURE_AD_CLIENT_ID=050a0513-3caa-440a-91e1-665d38685aeb`
- `AZURE_AD_CLIENT_SECRET=[your-secret]`
- `AZURE_AD_TENANT_ID=[your-tenant-id]`

### 4. Update Environment Variables (if needed)

```bash
az containerapp update \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --set-env-vars \
    "NEXTAUTH_URL=https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io"
```

## Testing

After making these changes:

1. Clear your browser cookies for the app domain
2. Navigate to: `https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/auth/signin`
3. Complete the Azure AD login flow
4. You should be redirected to the dashboard

## Common Issues

### Issue: Still getting consent error
**Solution:** Make sure you added the EXACT redirect URI including `/api/auth/callback` at the end

### Issue: Different error appears
**Solution:** Check the app logs:
```bash
az containerapp logs show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --tail 50 \
  --follow
```

### Issue: Environment variables not set
**Solution:** The Dockerfile has defaults, but production needs real values. Update using `az containerapp update` command above.



