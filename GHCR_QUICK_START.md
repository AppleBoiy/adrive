# GitHub Container Registry (GHCR) Quick Start

## Setup (One-time)

### 1. Create Personal Access Token
```
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
→ Generate new token (classic)
→ Select: write:packages, read:packages
→ Generate token → Copy it
```

### 2. Login to GHCR
```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# Paste your token when prompted
```

## Manual Push

### Build and Push
```bash
# Build images
make build

# Tag for GHCR
make ghcr-tag GITHUB_USER=yourusername

# Push to GHCR
make ghcr-push GITHUB_USER=yourusername
```

### Make Images Public
```
GitHub → Your Profile → Packages → Select package
→ Package settings → Change visibility → Public
```

## Automated Push (GitHub Actions)

### Setup
The workflow is already configured in `.github/workflows/docker-publish.yml`

### Trigger Build
```bash
# Option 1: Push to main
git push origin main

# Option 2: Create version tag
git tag v1.0.0
git push origin v1.0.0

# Option 3: Manual trigger
# Go to GitHub → Actions → Build and Push to GHCR → Run workflow
```

### Images will be pushed to:
- `ghcr.io/yourusername/adrive-frontend:latest`
- `ghcr.io/yourusername/adrive-backend:latest`

## Use Pre-built Images

### Update docker-compose.yml
```yaml
services:
  frontend:
    image: ghcr.io/yourusername/adrive-frontend:latest
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    image: ghcr.io/yourusername/adrive-backend:latest
    ports:
      - "5001:5001"
    volumes:
      - ./backend/data:/app/data
      - ./backend/vm_storage:/app/vm_storage
    environment:
      - DEV_MODE=true
      - PORT=5001
      - BUCKET_NAME=${BUCKET_NAME}
```

### Pull and Run
```bash
# For public images
docker-compose pull
docker-compose up -d

# For private images (login first)
docker login ghcr.io -u yourusername
docker-compose pull
docker-compose up -d
```

## Verify Images

### Check on GitHub
```
GitHub → Your Profile → Packages
```

### Pull and Test
```bash
# Pull images
make ghcr-pull GITHUB_USER=yourusername

# Check images
docker images | grep ghcr

# Test run
docker-compose up -d
```

## Troubleshooting

### Login Failed
```bash
# Check token has correct permissions
# Regenerate token with write:packages scope
```

### Push Failed
```bash
# Check you're logged in
docker login ghcr.io -u yourusername

# Check image exists locally
docker images | grep adrive

# Try manual push
docker push ghcr.io/yourusername/adrive-frontend:latest
```

### Pull Failed (403 Forbidden)
```bash
# For private images, login first
docker login ghcr.io -u yourusername

# Or make package public on GitHub
```

## Commands Reference

```bash
# Login
docker login ghcr.io -u USERNAME

# Build
make build

# Tag
make ghcr-tag GITHUB_USER=username

# Push
make ghcr-push GITHUB_USER=username

# Pull
make ghcr-pull GITHUB_USER=username

# All in one
make build && make ghcr-tag GITHUB_USER=username && make ghcr-push GITHUB_USER=username
```

## Links

- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Complete Guide](CONTAINER_IMAGES.md)
- [GitHub Actions Workflow](.github/workflows/docker-publish.yml)
