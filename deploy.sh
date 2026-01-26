#!/bin/bash

# Deployment script for Mapper Tax Application to Azure Container Apps
# Usage: ./deploy.sh [version]
# Example: ./deploy.sh v10

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP="rg-fmza-gt3"
CONTAINER_APP_NAME="gt3"
ACR_NAME="gt3acr"
IMAGE_NAME="gt3"

# Get version from command line argument or auto-increment
if [[ -z "$1" ]]; then
    # Get the latest tag number and increment
    LATEST_TAG=$(docker images "${ACR_NAME}.azurecr.io/${IMAGE_NAME}" --format "{{.Tag}}" | grep -E '^v[0-9]+$' | sed 's/v//' | sort -n | tail -1)
    if [[ -z "$LATEST_TAG" ]]; then
        VERSION="v1"
    else
        VERSION="v$((LATEST_TAG + 1))"
    fi
    echo "No version specified. Auto-incrementing to: $VERSION"
else
    VERSION="$1"
fi

IMAGE_TAG="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${VERSION}"

echo "========================================="
echo "Deploying Mapper Tax Application"
echo "Version: $VERSION"
echo "Image: $IMAGE_TAG"
echo "Resource Group: $RESOURCE_GROUP"
echo "Container App: $CONTAINER_APP_NAME"
echo "========================================="
echo ""

# Step 1: Build Docker image
echo "Step 1/4: Building Docker image..."
docker build --platform linux/amd64 -t "$IMAGE_TAG" .

if [[ $? -ne 0 ]]; then
    echo "❌ Docker build failed!"
    exit 1
fi
echo "✅ Docker build completed successfully"
echo ""

# Step 2: Login to Azure Container Registry
echo "Step 2/4: Logging into Azure Container Registry..."
az acr login --name "$ACR_NAME"

if [[ $? -ne 0 ]]; then
    echo "❌ ACR login failed!"
    exit 1
fi
echo "✅ ACR login successful"
echo ""

# Step 3: Push image to ACR
echo "Step 3/4: Pushing image to Azure Container Registry..."
docker push "$IMAGE_TAG"

if [[ $? -ne 0 ]]; then
    echo "❌ Docker push failed!"
    exit 1
fi
echo "✅ Image pushed successfully"
echo ""

# Step 4: Update Container App
echo "Step 4/4: Updating Container App..."
az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$IMAGE_TAG"

if [[ $? -ne 0 ]]; then
    echo "❌ Container App update failed!"
    exit 1
fi
echo "✅ Container App updated successfully"
echo ""

# Wait for deployment to stabilize
echo "Waiting for deployment to stabilize (30 seconds)..."
sleep 30

# Verify deployment
echo "Verifying deployment..."
REVISION_STATUS=$(az containerapp revision list \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[0].{Running:properties.runningState, Health:properties.healthState}" \
    -o json)

RUNNING_STATE=$(echo "$REVISION_STATUS" | jq -r '.Running')
HEALTH_STATE=$(echo "$REVISION_STATUS" | jq -r '.Health')

echo "Revision Status:"
echo "  Running: $RUNNING_STATE"
echo "  Health: $HEALTH_STATE"
echo ""

# Get the app URL
APP_URL=$(az containerapp show \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" \
    -o tsv)

echo "Testing application endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${APP_URL}/api/health")

if [[ "$HTTP_CODE" = "200" ]]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
else
    echo "⚠️  Health check returned HTTP $HTTP_CODE"
fi

echo ""
echo "========================================="
echo "✅ Deployment completed successfully!"
echo "========================================="
echo ""
echo "Application URL: https://${APP_URL}"
echo "Version deployed: $VERSION"
echo ""
echo "Next steps:"
echo "  1. Visit the application URL to test"
echo "  2. Monitor logs: az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow"
echo "  3. Check revisions: az containerapp revision list --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP -o table"
echo ""

