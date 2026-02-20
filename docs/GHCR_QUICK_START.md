# GitHub Container Registry Guide

Push and use ADrive images on GitHub Container Registry.

## Setup (One-time)

### 1. Create Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `write:packages`, `read:packages`
4. Copy the token

### 2. Login
```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# Paste token when prompted
```

## Manual Push

```bash
# Build images
make build

# Tag for GHCR
make ghcr-tag USER=yourusername

# Push to GHCR
make ghcr-push USER=yourusername
```

### Make Images Public
1. GitHub → Your Profile → Packages
2. Select package → Package settings
3. Change visibility → Public

## Automated Push (GitHub Actions)

The repository includes a workflow that automatically builds and pushes images.

### Trigger
```bash
# Push to main branch
git push origin main

# Or create version tag
git tag v1.0.0
git push origin v1.0.0
```

Images will be pushed to:
- `ghcr.io/yourusername/adrive-frontend:latest`
- `ghcr.io/yourusername/adrive-backend:latest`

## Use Pre-built Images

### 1. Update docker-compose.yml
```yaml
services:
  frontend:
    image: ghcr.io/yourusername/adrive-frontend:latest
    # Remove 'build' section

  backend:
    image: ghcr.io/yourusername/adrive-backend:latest
    # Remove 'build' section
```

### 2. Pull and Run
```bash
# For public images
docker-compose pull
docker-compose up -d

# For private images (login first)
docker login ghcr.io -u yourusername
docker-compose pull
docker-compose up -d
```

## Troubleshooting

### Login Failed
- Check token has `write:packages` scope
- Regenerate token if needed

### Push Failed
```bash
# Verify login
docker login ghcr.io -u yourusername

# Check images exist
docker images | grep adrive

# Try manual push
docker push ghcr.io/yourusername/adrive-frontend:latest
```

### Pull Failed (403)
- For private images, login first
- Or make package public on GitHub

## Commands Reference

```bash
# Login
docker login ghcr.io -u USERNAME

# Build
make build

# Tag
make ghcr-tag USER=username

# Push
make ghcr-push USER=username

# All in one
make build && make ghcr-tag USER=username && make ghcr-push USER=username
```

## Links

- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Complete Guide](CONTAINER_IMAGES.md)
