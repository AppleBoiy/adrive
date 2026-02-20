# Quick Start Guide

Get ADrive running in 5 minutes.

## Prerequisites

- Docker Desktop installed and running
- 2GB free disk space

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd adrive
```

### 2. Start Application
```bash
./start.sh
```

That's it! Access the application at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

## Basic Usage

### Upload Files
1. Click "Upload" button in sidebar
2. Select files
3. Files appear in the list

### Create Folders
1. Click "New Folder" button
2. Enter folder name
3. Folder appears in the list

### Preview Files
- Click any file to preview
- Supports images, videos, audio, PDFs, text

### Organize with Tags
1. Select a file
2. Click "Tags" button
3. Create and apply tags

## Common Commands

```bash
# View logs
make logs

# Stop application
make stop

# Restart application
make restart

# Check status
make status
```

## Optional: Enable Google Cloud Storage

If you want to use Google Cloud Storage in addition to local storage:

### 1. Get Service Account Key
1. Go to Google Cloud Console
2. Create service account
3. Download JSON key file

### 2. Configure
```bash
# Place key file
cp ~/Downloads/service-account-key.json backend/service-account.json

# Set bucket name in backend/.env
echo "BUCKET_NAME=your-bucket-name" >> backend/.env
```

### 3. Restart
```bash
make restart
```

GCS bucket will now appear in the sidebar.

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker info

# View logs
make logs

# Rebuild
make rebuild
make start
```

### Can't access frontend
```bash
# Check services are running
make status

# Check health
make health

# Restart
make restart
```

### Database issues
```bash
# Initialize database
make db-init

# Check database
make db-check
```

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system details
- Check [CHANGELOG.md](CHANGELOG.md) for recent changes

## Support

- Documentation: See docs/ folder
- Issues: GitHub Issues
- Commands: Run `make help`
