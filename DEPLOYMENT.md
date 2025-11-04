# Deployment Guide

This guide explains how to deploy the Mapper Tax Application to Azure Container Apps.

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Docker installed and running
- Access to the Azure subscription and resource group
- Permissions to push to Azure Container Registry

## Quick Deployment

### Using the Automated Script (Recommended)

Deploy with a specific version:
```bash
./deploy.sh v10
```

Or let the script auto-increment the version:
```bash
./deploy.sh
```

The script will:
1. Build the Docker image with platform `linux/amd64`
2. Login to Azure Container Registry
3. Push the image to ACR
4. Update the Container App with the new image
5. Verify the deployment is healthy
6. Display the application URL

## Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot, follow these steps:

### 1. Build Docker Image

```bash
# Set the version number
VERSION=v10

# Build the Docker image
docker build --platform linux/amd64 \
  -t mappertaxregistry.azurecr.io/mapper-tax-app:${VERSION} .
```

**Important:** The `--platform linux/amd64` flag is required to ensure compatibility with Azure Container Apps.

### 2. Login to Azure Container Registry

```bash
az acr login --name mappertaxregistry
```

### 3. Push Image to ACR

```bash
docker push mappertaxregistry.azurecr.io/mapper-tax-app:${VERSION}
```

### 4. Update Container App

```bash
az containerapp update \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --image mappertaxregistry.azurecr.io/mapper-tax-app:${VERSION}
```

### 5. Verify Deployment

Check the revision status:
```bash
az containerapp revision list \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --query "[].{Name:name, Active:properties.active, Running:properties.runningState, Health:properties.healthState, Traffic:properties.trafficWeight}" \
  -o table
```

Test the health endpoint:
```bash
curl https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io/api/health
```

## Azure Resources

- **Resource Group:** `walter_sandbox`
- **Container App:** `mapper-tax-app`
- **Container Registry:** `mappertaxregistry.azurecr.io`
- **Image Name:** `mapper-tax-app`
- **App URL:** https://mapper-tax-app.greenpebble-86483b9f.westeurope.azurecontainerapps.io

## Monitoring and Troubleshooting

### View Container App Logs

Stream live logs:
```bash
az containerapp logs show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --follow
```

View recent logs:
```bash
az containerapp logs show \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --tail 100
```

### List All Revisions

```bash
az containerapp revision list \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  -o table
```

### Check Container App Details

```bash
az containerapp show \
  --name mapper-tax-app \
  --resource-group walter_sandbox
```

### Rollback to Previous Revision

If the new deployment has issues, you can rollback:

```bash
# List revisions to find the previous one
az containerapp revision list \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  -o table

# Set traffic to previous revision
az containerapp ingress traffic set \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --revision-weight <previous-revision-name>=100
```

## Important Notes

### Dockerfile Optimization

The Dockerfile is optimized for Azure deployments:
- **Two-stage build:** Separates build and runtime environments for smaller images
- **Prisma handling:** Schema is copied before `npm ci` to ensure Prisma Client generation succeeds
- **Runner stage:** Uses `--ignore-scripts` flag to avoid duplicate Prisma generation
- **Security:** Runs as non-root user (`nextjs`)
- **Health check:** Built-in health check for container monitoring

### Environment Variables

Environment variables are managed through Azure Container App secrets and configuration. To update:

```bash
az containerapp update \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --set-env-vars "KEY=value"
```

For secrets:
```bash
az containerapp secret set \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --secrets "secret-name=secret-value"
```

### Scaling

The app is configured with:
- **Min replicas:** 1
- **Max replicas:** 3
- **CPU:** 1.0 cores
- **Memory:** 2Gi

To adjust scaling:
```bash
az containerapp update \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  --min-replicas 1 \
  --max-replicas 5
```

## Common Issues

### Issue: Docker Build Hangs

**Solution:** The Dockerfile has been fixed to copy the Prisma schema before running `npm ci`. This ensures the postinstall script can successfully generate the Prisma Client.

### Issue: ACR Login Fails

**Solution:** Ensure you're logged into Azure CLI with the correct tenant:
```bash
az login --tenant c98c02b7-1480-4cf2-bf51-c12fdf55a9f8
```

### Issue: Container App Not Updating

**Solution:** Check if the revision is activating:
```bash
az containerapp revision list \
  --name mapper-tax-app \
  --resource-group walter_sandbox \
  -o table
```

Wait 30-60 seconds for the new revision to fully activate.

### Issue: App Returns 502/503 Errors

**Solution:** 
1. Check container logs for errors
2. Verify environment variables are set correctly
3. Ensure database connection string is valid
4. Check if the health endpoint is responding

## Version History

Track your deployments:

| Version | Date | Description |
|---------|------|-------------|
| v9      | 2025-11-04 | Fixed Dockerfile Prisma schema handling |
| v10     | TBD | Next deployment |

## Support

For issues with:
- **Azure resources:** Contact Azure support or check Azure Portal
- **Application bugs:** Check application logs and review recent code changes
- **Deployment script:** Review this guide and verify prerequisites

