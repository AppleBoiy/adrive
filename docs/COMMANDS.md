# Command Reference

Quick reference for all ADrive commands.

## Application

```bash
./start.sh          # Start application
make start          # Start application
make stop           # Stop application
make restart        # Restart application
make status         # Show service status
make health         # Check service health
```

## Development

```bash
make logs           # View all logs
make logs-backend   # View backend logs only
make logs-frontend  # View frontend logs only
make shell-backend  # Open backend shell
make shell-frontend # Open frontend shell
```

## Build

```bash
make build          # Build images
make rebuild        # Rebuild images (no cache)
```

## Database

```bash
make db-init        # Initialize database
make db-rebuild     # Rebuild database from storage
make db-check       # Check database status
```

## Cleanup

```bash
make clean          # Stop and remove all data (WARNING)
```

## Container Registry

```bash
# GitHub Container Registry
make ghcr-login                    # Show login instructions
make ghcr-tag USER=username        # Tag images for GHCR
make ghcr-push USER=username       # Push images to GHCR
```

## Docker Compose

```bash
docker-compose up -d               # Start services
docker-compose down                # Stop services
docker-compose logs -f             # View logs
docker-compose ps                  # Show status
docker-compose restart             # Restart services
docker-compose build               # Build images
docker-compose pull                # Pull images
```

## URLs

```bash
Frontend:  http://localhost:3000
Backend:   http://localhost:5001
```

## Help

```bash
make help           # Show all make commands
```
