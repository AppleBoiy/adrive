# Deployment Guide

This guide covers deploying ADrive to production environments.

## Prerequisites

- Docker and Docker Compose installed
- Domain name (optional, for HTTPS)
- Google Cloud Storage bucket
- GCS service account with appropriate permissions

## Production Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd adrive

# Setup environment
make setup

# Edit backend/.env with production values
nano backend/.env
```

### 3. Configure Environment

Edit `backend/.env`:

```env
PORT=5001
NODE_ENV=production
BUCKET_NAME=your-production-bucket
SESSION_SECRET=<generate-strong-secret>
DEV_MODE=false
```

Generate a strong session secret:
```bash
openssl rand -base64 32
```

### 4. Add Service Account

Place your GCS service account JSON in `backend/service-account.json`:

```bash
# Copy from local machine
scp service-account.json user@server:/path/to/adrive/backend/
```

### 5. Deploy

```bash
# Build and start services
make build
make up

# Check status
make status

# View logs
make logs
```

### 6. Configure Reverse Proxy (Optional)

For HTTPS and custom domain, use Nginx or Caddy as a reverse proxy.

#### Nginx Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for large file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Increase max body size for file uploads
    client_max_body_size 100M;
}
```

#### Caddy Example

```caddy
yourdomain.com {
    reverse_proxy / localhost:3000
    reverse_proxy /api/* localhost:5001
    
    # Increase max body size for uploads
    request_body {
        max_size 100MB
    }
}
```

## Docker Compose Production Configuration

For production, you may want to customize `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: adrive-backend
    restart: always
    ports:
      - "127.0.0.1:5001:5001"  # Only expose to localhost
    environment:
      - NODE_ENV=production
      - PORT=5001
    env_file:
      - ./backend/.env
    volumes:
      - backend-storage:/app/vm_storage
      - backend-db:/app
    networks:
      - adrive-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: adrive-frontend
    restart: always
    ports:
      - "127.0.0.1:3000:80"  # Only expose to localhost
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - adrive-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

networks:
  adrive-network:
    driver: bridge

volumes:
  backend-storage:
    driver: local
  backend-db:
    driver: local
```

## Backup Strategy

### Database Backup

```bash
# Manual backup
docker-compose exec backend sqlite3 /app/filemanager.db ".backup '/app/backup.db'"
docker cp adrive-backend:/app/backup.db ./backup-$(date +%Y%m%d).db

# Automated backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/adrive"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T backend sqlite3 /app/filemanager.db ".backup '/app/backup.db'"
docker cp adrive-backend:/app/backup.db $BACKUP_DIR/db-$DATE.db

# Backup VM storage
docker run --rm -v adrive_backend-storage:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/storage-$DATE.tar.gz -C /data .

# Keep only last 7 days
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Restore from Backup

```bash
# Stop services
make down

# Restore database
docker run --rm -v adrive_backend-db:/data -v $(pwd):/backup alpine sh -c "cp /backup/db-YYYYMMDD.db /data/filemanager.db"

# Restore storage
docker run --rm -v adrive_backend-storage:/data -v $(pwd):/backup alpine sh -c "tar xzf /backup/storage-YYYYMMDD.tar.gz -C /data"

# Start services
make up
```

## Monitoring

### Health Checks

```bash
# Check service health
make health

# View service status
make status

# View logs
make logs
```

### Log Management

Logs are automatically rotated (max 10MB, 3 files) as configured in docker-compose.yml.

View logs:
```bash
# All services
make logs

# Specific service
make logs-backend
make logs-frontend
```

## Scaling

### Horizontal Scaling

For multiple backend instances, use a load balancer:

```yaml
services:
  backend:
    deploy:
      replicas: 3
    # ... rest of config
```

### Vertical Scaling

Adjust resource limits in docker-compose.yml:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## Security Checklist

- [ ] Use strong SESSION_SECRET
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Restrict GCS service account permissions
- [ ] Set DEV_MODE=false in production
- [ ] Use firewall to restrict access
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Implement rate limiting (via reverse proxy)
- [ ] Regular backups
- [ ] Secure service-account.json file permissions

## Troubleshooting

### Services won't start

```bash
# Check logs
make logs

# Rebuild from scratch
make clean
make rebuild
```

### Database corruption

```bash
# Restore from backup
make down
# ... restore steps above
make up

# Or rebuild from storage
make rebuild-db
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Clean old logs
docker-compose logs --tail=0 -f
```

### Performance issues

```bash
# Check resource usage
docker stats

# Adjust resource limits in docker-compose.yml
# Restart services
make restart
```

## Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
make rebuild

# Or manual update
make down
make build
make up
```

## Support

For issues and questions:
- Check logs: `make logs`
- Review documentation
- Open GitHub issue
