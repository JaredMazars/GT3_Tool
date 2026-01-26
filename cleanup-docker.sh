#!/bin/bash

# Docker Cleanup Script - Run after starting Docker Desktop
# This will free up significant disk space by removing unused Docker resources

set -e

echo "========================================="
echo "Docker Cleanup Script"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Show current Docker disk usage
echo "Current Docker disk usage:"
docker system df
echo ""

# Remove stopped containers
echo "Removing stopped containers..."
docker container prune -f
echo ""

# Remove unused images
echo "Removing unused images..."
docker image prune -a -f
echo ""

# Remove unused volumes
echo "Removing unused volumes..."
docker volume prune -f
echo ""

# Remove build cache
echo "Removing build cache..."
docker builder prune -a -f
echo ""

# Remove unused networks
echo "Removing unused networks..."
docker network prune -f
echo ""

# Show final Docker disk usage
echo "========================================="
echo "Final Docker disk usage:"
docker system df
echo ""

# Show system disk space
echo "System disk space:"
df -h .
echo ""

echo "========================================="
echo "✅ Docker cleanup complete!"
echo "========================================="
