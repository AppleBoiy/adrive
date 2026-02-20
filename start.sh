#!/bin/bash

# ADrive Quick Start Script

set -e

echo "================================"
echo "ADrive Quick Start"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚙️  Setting up environment configuration..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo ""
    echo "⚠️  IMPORTANT: Please edit backend/.env and configure:"
    echo "   - BUCKET_NAME (your GCS bucket)"
    echo "   - SESSION_SECRET (generate a strong secret)"
    echo "   - Add service-account.json to backend/ directory"
    echo ""
    read -p "Press Enter to continue after configuring..."
fi

# Check if service-account.json exists
if [ ! -f backend/service-account.json ]; then
    echo "⚠️  WARNING: backend/service-account.json not found"
    echo "   GCS storage will not work without it"
    echo "   You can still use VM storage"
    echo ""
fi

echo "🏗️  Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "================================"
    echo "✅ ADrive is running!"
    echo "================================"
    echo ""
    echo "Frontend: http://localhost:3000"
    echo "Backend:  http://localhost:5001"
    echo ""
    echo "Useful commands:"
    echo "  make logs          - View logs"
    echo "  make down          - Stop services"
    echo "  make restart       - Restart services"
    echo "  make init-db       - Initialize database"
    echo ""
    echo "For more commands, run: make help"
else
    echo ""
    echo "❌ Services failed to start. Check logs with: make logs"
    exit 1
fi
