# Container Images Guide

This guide explains how to build, manage, and distribute ADrive container images.

## Quick Start

### Build Images
```bash
# Build all images
make build

# Build specific service
make build-frontend
make build-backend

# Build without cache (clean build)
make build-no-cache
```

### Check Images
```bash
# List images
docker images | grep adrive

# Check image sizes
make image-size
```

## Building Images

### Method 1: Using Make (Recommended)
```bash
# Build all services
make build

# Build frontend only
make build-frontend

# Build backend only
make build-backend

# Clean build (no cache)
make build-no-cache
```

### Method 2: Using Docker Compose
```bash
# Build all services
docker-compose build

# Build with progress output
docker-compose build --progress=plain

# Build specific service
docker-compose build frontend
docker-compose build backend

# Build without cache
docker-compose build --no-cache
```

### Method 3: Using Docker CLI
```bash
# Build frontend
cd frontend
docker build -t adrive-frontend:latest .

# Build backend
cd backend
docker build -t adrive-backend:latest .
```

## Image Details

### Frontend Image
- **Base Image**: `node:20-alpine` (build stage) + `nginx:alpine` (runtime)
- **Build Type**: Multi-stage
- **Final Size**: ~50MB
- **Exposed Port**: 80
- **Build Time**: 2-3 minutes

**Dockerfile Location**: `frontend/Dockerfile`

**Build Stages**:
1. Build stage: Compiles React app with Vite
2. Runtime stage: Serves static files with Nginx

### Backend Image
- **Base Image**: `node:20-alpine`
- **Final Size**: ~200MB
- **Exposed Port**: 5001
- **Build Time**: 1-2 minutes

**Dockerfile Location**: `backend/Dockerfile`

**Features**:
- Non-root user (nodejs)
- Health check endpoint
- Auto-creates data directory
- Installs production dependencies only

## Publishing Images

### GitHub Container Registry (GHCR)

#### 1. Create Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `write:packages`, `read:packages`, `delete:packages`
4. Generate and copy the token

#### 2. Login to GHCR
```bash
# Login with your GitHub username and PAT
docker login ghcr.io -u YOUR_GITHUB_USERNAME

# When prompted, paste your Personal Access Token
```

Or use environment variable:
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### 3. Tag Images
```bash
# Using Make (recommended)
make ghcr-tag GITHUB_USER=yourusername

# Or manually
docker tag adrive-frontend:latest ghcr.io/yourusername/adrive-frontend:latest
docker tag adrive-backend:latest ghcr.io/yourusername/adrive-backend:latest
```

#### 4. Push Images
```bash
# Using Make
make ghcr-push GITHUB_USER=yourusername

# Or manually
docker push ghcr.io/yourusername/adrive-frontend:latest
docker push ghcr.io/yourusername/adrive-backend:latest
```

#### 5. Make Images Public (Optional)
1. Go to your GitHub profile → Packages
2. Click on the package (adrive-frontend or adrive-backend)
3. Click "Package settings"
4. Scroll to "Danger Zone"
5. Click "Change visibility" → "Public"

### Docker Hub

#### 1. Tag Images
```bash
# Using Make
make tag-images REGISTRY=yourusername

# Or manually
docker tag adrive-frontend:latest yourusername/adrive-frontend:latest
docker tag adrive-backend:latest yourusername/adrive-backend:latest
```

#### 2. Login to Docker Hub
```bash
docker login
```

#### 3. Push Images
```bash
# Using Make
make push-images REGISTRY=yourusername

# Or manually
docker push yourusername/adrive-frontend:latest
docker push yourusername/adrive-backend:latest
```

### Private Registry

#### 1. Tag Images
```bash
# Using Make
make tag-images REGISTRY=registry.example.com/myorg

# Or manually
docker tag adrive-frontend:latest registry.example.com/myorg/adrive-frontend:latest
docker tag adrive-backend:latest registry.example.com/myorg/adrive-backend:latest
```

#### 2. Login to Registry
```bash
docker login registry.example.com
```

#### 3. Push Images
```bash
# Using Make
make push-images REGISTRY=registry.example.com/myorg

# Or manually
docker push registry.example.com/myorg/adrive-frontend:latest
docker push registry.example.com/myorg/adrive-backend:latest
```

## Using Pre-built Images

### From GitHub Container Registry (GHCR)

#### 1. Update docker-compose.yml
```yaml
services:
  frontend:
    image: ghcr.io/yourusername/adrive-frontend:latest
    # Remove or comment out 'build' section
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    image: ghcr.io/yourusername/adrive-backend:latest
    # Remove or comment out 'build' section
    ports:
      - "5001:5001"
    volumes:
      - ./backend/data:/app/data
      - ./backend/vm_storage:/app/vm_storage
    environment:
      - DEV_MODE=true
```

#### 2. Pull and Run
```bash
# For public images (no login needed)
docker-compose pull
docker-compose up -d

# For private images (login first)
docker login ghcr.io -u yourusername
docker-compose pull
docker-compose up -d
```

### From Docker Hub

#### 1. Update docker-compose.yml
```yaml
services:
  frontend:
    image: yourusername/adrive-frontend:latest
    # Remove or comment out 'build' section
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    image: yourusername/adrive-backend:latest
    # Remove or comment out 'build' section
    ports:
      - "5001:5001"
    volumes:
      - ./backend/data:/app/data
      - ./backend/vm_storage:/app/vm_storage
```

#### 2. Pull and Run
```bash
# Pull images
docker-compose pull

# Start services
docker-compose up -d
```

### From Private Registry

Same as Docker Hub, but use your registry URL:
```yaml
services:
  frontend:
    image: registry.example.com/myorg/adrive-frontend:latest
  backend:
    image: registry.example.com/myorg/adrive-backend:latest
```

## Versioning

### Tagging Strategy
```bash
# Latest (default)
docker tag adrive-frontend:latest yourusername/adrive-frontend:latest

# Specific version
docker tag adrive-frontend:latest yourusername/adrive-frontend:v1.0.0

# Date-based
docker tag adrive-frontend:latest yourusername/adrive-frontend:2024-02-20

# Git commit
docker tag adrive-frontend:latest yourusername/adrive-frontend:$(git rev-parse --short HEAD)
```

### Push Multiple Tags
```bash
# Push all tags
docker push yourusername/adrive-frontend:latest
docker push yourusername/adrive-frontend:v1.0.0
docker push yourusername/adrive-frontend:2024-02-20
```

## Offline Distribution

### Save Images to Files
```bash
# Using Make
make save-images

# Or manually
docker save adrive-frontend:latest -o adrive-frontend.tar
docker save adrive-backend:latest -o adrive-backend.tar

# Compress (optional)
gzip adrive-frontend.tar
gzip adrive-backend.tar
```

### Load Images from Files
```bash
# Using Make
make load-images

# Or manually
docker load -i adrive-frontend.tar
docker load -i adrive-backend.tar

# If compressed
gunzip adrive-frontend.tar.gz
docker load -i adrive-frontend.tar
```

### Transfer to Another Machine
```bash
# On source machine
make save-images
scp adrive-*.tar user@target-machine:/tmp/

# On target machine
cd /tmp
docker load -i adrive-frontend.tar
docker load -i adrive-backend.tar
```

## Optimization

### Reduce Image Size

#### Frontend
- Already optimized with multi-stage build
- Uses Alpine Linux (minimal base)
- Only includes production build artifacts

#### Backend
- Uses Alpine Linux
- Production dependencies only
- No dev dependencies in final image

### Build Cache

#### Use BuildKit
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with cache
docker-compose build
```

#### Cache from Registry
```bash
# Pull cache
docker pull yourusername/adrive-frontend:latest

# Build with cache
docker build --cache-from yourusername/adrive-frontend:latest -t adrive-frontend:latest ./frontend
```

## Troubleshooting

### Build Fails

#### Check Dockerfile
```bash
# Validate Dockerfile syntax
docker build --check ./frontend
docker build --check ./backend
```

#### Build with Verbose Output
```bash
docker-compose build --progress=plain
```

#### Clean Build
```bash
# Remove all build cache
docker builder prune -a

# Rebuild
make build-no-cache
```

### Image Too Large

#### Check Image Layers
```bash
docker history adrive-frontend:latest
docker history adrive-backend:latest
```

#### Analyze Image
```bash
# Using dive (install first: brew install dive)
dive adrive-frontend:latest
```

### Push Fails

#### Check Authentication
```bash
docker login
```

#### Check Network
```bash
# Test connection
curl -I https://registry-1.docker.io/v2/
```

#### Retry Push
```bash
docker push yourusername/adrive-frontend:latest --disable-content-trust
```

## CI/CD Integration

### GitHub Actions (Automated GHCR Publishing)

A GitHub Actions workflow is included at `.github/workflows/docker-publish.yml` that automatically builds and pushes images to GHCR.

#### Triggers
- **Push to main branch**: Builds and pushes with `latest` tag
- **Push tags (v*)**: Builds and pushes with version tags
- **Pull requests**: Builds only (doesn't push)
- **Manual trigger**: Via GitHub Actions UI

#### What it does
1. Checks out code
2. Sets up Docker Buildx
3. Logs in to GHCR using `GITHUB_TOKEN`
4. Builds frontend and backend images
5. Pushes to `ghcr.io/username/repo-frontend:latest` and `ghcr.io/username/repo-backend:latest`
6. Creates build cache for faster subsequent builds

#### Usage
Just push to main or create a tag:
```bash
# Push to main (creates 'latest' tag)
git push origin main

# Create version tag (creates 'v1.0.0' tag)
git tag v1.0.0
git push origin v1.0.0
```

Images will be automatically built and pushed to:
- `ghcr.io/yourusername/adrive-frontend:latest`
- `ghcr.io/yourusername/adrive-backend:latest`

#### Manual Workflow Example
```yaml
name: Build and Push Images

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        run: |
          docker-compose build
          docker tag adrive-frontend:latest ${{ secrets.DOCKER_USERNAME }}/adrive-frontend:latest
          docker tag adrive-backend:latest ${{ secrets.DOCKER_USERNAME }}/adrive-backend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/adrive-frontend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/adrive-backend:latest
```

## Best Practices

1. **Use Multi-stage Builds**: Reduces final image size
2. **Use Alpine Base**: Smaller and more secure
3. **Run as Non-root**: Better security
4. **Add Health Checks**: Monitor container health
5. **Version Your Images**: Use semantic versioning
6. **Scan for Vulnerabilities**: Use `docker scan`
7. **Use .dockerignore**: Exclude unnecessary files
8. **Cache Dependencies**: Speed up builds
9. **Document Changes**: Update CHANGELOG.md
10. **Test Images**: Verify functionality before pushing

## Security

### Scan Images
```bash
# Scan for vulnerabilities
docker scan adrive-frontend:latest
docker scan adrive-backend:latest
```

### Sign Images
```bash
# Enable content trust
export DOCKER_CONTENT_TRUST=1

# Push signed image
docker push yourusername/adrive-frontend:latest
```

### Use Secrets
```bash
# Don't hardcode secrets in Dockerfile
# Use build args or environment variables
docker build --build-arg API_KEY=$API_KEY -t adrive-backend:latest ./backend
```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## Support

For issues or questions:
- Check [CHANGELOG.md](CHANGELOG.md) for recent changes
- Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system details
- Open an issue on GitHub
