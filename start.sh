#!/bin/bash

# ADrive Quick Start
# Builds and starts the application

set -e

echo ""
echo "ADrive - Starting Application"
echo "=============================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found"
    echo "   Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo "❌ Docker not running"
    echo "   Please start Docker Desktop"
    exit 1
fi

echo "✓ Docker ready"

# Check GCS (optional)
if [ ! -f "backend/service-account.json" ]; then
    echo "ℹ GCS disabled (service-account.json not found)"
else
    echo "✓ GCS enabled"
fi

echo ""
echo "Building and starting..."
echo ""

# Build and start
docker-compose up -d --build

echo ""
echo "✓ Application started!"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5001"
echo ""
echo "Commands:"
echo "  make logs    - View logs"
echo "  make stop    - Stop services"
echo "  make help    - Show all commands"
echo ""
echo "Documentation: docs/"
echo ""
