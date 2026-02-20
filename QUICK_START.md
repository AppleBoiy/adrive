# Quick Start Guide

Get ADrive up and running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- (Optional) Google Cloud Storage bucket and service account

## Installation

### 1. Quick Start Script

```bash
./start.sh
```

This script will:
- Check Docker installation
- Create environment configuration
- Build Docker images
- Start all services

### 2. Manual Setup

```bash
# Setup environment
make setup

# Edit configuration
nano backend/.env

# Build and start
make build
make up
```

## Configuration

### Minimum Required (.env)

```env
PORT=5001
BUCKET_NAME=your-bucket-name
SESSION_SECRET=your-secret-key
```

### Generate Session Secret

```bash
openssl rand -base64 32
```

### Add Service Account

Place `service-account.json` in `backend/` directory for GCS access.

## Access

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001

## Common Commands

```bash
# View logs
make logs

# Stop services
make down

# Restart services
make restart

# Initialize database
make init-db

# Check status
make status

# View all commands
make help
```

## First Steps

1. **Upload Files**
   - Click "Upload" button in sidebar
   - Select files to upload
   - Choose VM or Bucket storage

2. **Create Folders**
   - Click "New Folder" button
   - Enter folder name
   - Navigate into folders by clicking them

3. **Organize with Tags**
   - Select a file
   - Click "Tags" button
   - Create and apply tags

4. **View Modes**
   - Switch between List, Grid, and Gallery views
   - Use Gallery view for previewing files

## Troubleshooting

### Services won't start

```bash
make logs
```

Check for errors in the output.

### Can't access frontend

Ensure port 3000 is not in use:
```bash
lsof -i :3000
```

### Can't access backend

Ensure port 5001 is not in use:
```bash
lsof -i :5001
```

### Database issues

Reset database:
```bash
make down
docker volume rm adrive_backend-db
make up
make init-db
```

### Storage issues

Clear storage:
```bash
make down
docker volume rm adrive_backend-storage
make up
```

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Review [CONTRIBUTING.md](CONTRIBUTING.md) to contribute

## Support

- Check logs: `make logs`
- Review documentation
- Open GitHub issue

## Quick Tips

- Use keyboard shortcuts in text editor (Ctrl+S to save)
- Drag and drop files to upload
- Right-click files for context menu (future feature)
- Use search to find files quickly
- Tags are great for organizing projects
- Trash items auto-delete after 30 days
- Both VM and GCS storage work independently

## Development Mode

For local development without Docker:

```bash
# Backend
cd backend
npm install
npm run init-db
node server.js

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Access at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Server setup
- HTTPS configuration
- Backup strategy
- Monitoring
- Security hardening

---

**Need help?** Open an issue on GitHub or check the documentation.
