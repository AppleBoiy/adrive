# ADrive

Modern file management system with local and cloud storage support.

## Features

- **Storage**: Local VM storage + optional Google Cloud Storage
- **File Operations**: Upload, download, preview, edit, organize
- **Organization**: Folders, tags, trash with auto-cleanup
- **Interface**: Responsive design with list, grid, and gallery views
- **Preview**: Images, videos, audio, PDFs, and text files
- **Development**: Built-in database viewer (dev mode)

## Quick Start

### Requirements
- Docker Desktop

### Installation

```bash
# Clone repository
git clone <repository-url>
cd adrive

# Start application
./start.sh
```

Access at: http://localhost:3000

### Optional: Enable Google Cloud Storage

1. Place `service-account.json` in `backend/` directory
2. Set `BUCKET_NAME` in `backend/.env`
3. Restart: `make restart`

## Commands

```bash
make start      # Start application
make stop       # Stop application
make logs       # View logs
make restart    # Restart services
make help       # Show all commands
```

See [docs/COMMANDS.md](docs/COMMANDS.md) for complete command reference.

## Configuration

Copy `backend/.env.example` to `backend/.env` and configure:

```bash
# Required
PORT=5001
DEV_MODE=true

# Optional (for GCS)
BUCKET_NAME=your-bucket-name

# Optional (for production)
SESSION_SECRET=your-secret-key
```

## Documentation

- [docs/QUICK_START.md](docs/QUICK_START.md) - Quick start guide
- [docs/COMMANDS.md](docs/COMMANDS.md) - Command reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Production deployment
- [docs/CHANGELOG.md](docs/CHANGELOG.md) - Version history
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [docs/CONTAINER_IMAGES.md](docs/CONTAINER_IMAGES.md) - Docker images
- [docs/GHCR_QUICK_START.md](docs/GHCR_QUICK_START.md) - GitHub Container Registry
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Contribution guidelines

## Development

```bash
# View logs
make logs

# Access backend shell
make shell-backend

# Initialize database
make db-init

# Check service health
make health
```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Nginx
- **Backend**: Node.js 20, Express, SQLite
- **Storage**: Local filesystem + Google Cloud Storage
- **Infrastructure**: Docker, Docker Compose

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- Issues: GitHub Issues
- Documentation: See [docs/](docs/) folder
