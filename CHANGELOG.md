# Changelog

All notable changes to this project will be documented in this file.

## [2024-02-20] - Project Cleanup & Docker Optimization

### Added
- Comprehensive documentation (README.md, QUICK_START.md, DEPLOYMENT.md, CONTRIBUTING.md)
- Makefile with 20+ commands for easy project management
- start.sh script for one-command quick start
- .dockerignore files for both frontend and backend
- .env.example for configuration template
- LICENSE file (MIT)
- Database viewer feature for development mode
- Tag management system for file organization
- Trash functionality with 30-day auto-cleanup

### Changed
- Updated Dockerfiles with best practices:
  - Alpine base images for smaller size
  - Non-root users for security
  - Health checks for monitoring
  - Multi-stage builds for frontend
- Updated docker-compose.yml:
  - Removed obsolete `version` attribute
  - Added health checks for all services
  - Improved volume management
  - Network isolation
  - Logging configuration
- Moved database from `backend/filemanager.db` to `backend/data/filemanager.db`
- Changed Docker volume mount from `/app` to `/app/data` for better persistence
- Database now auto-initializes on startup with `CREATE TABLE IF NOT EXISTS`

### Fixed
- **File Streaming**: Removed proxy endpoint, all files now stream through `/api/file/:location/*`
- **Database Persistence**: Database now persists correctly in Docker by mounting only data directory
- **Database Viewer**: Now shows in production when `DEV_MODE=true` is set
- **File Preview URLs**: Changed from absolute to relative URLs to work through nginx proxy
  - Before: `http://localhost:5001/api/file/vm/file.txt`
  - After: `/api/file/vm/file.txt`
  - Fixes CORS issues and connection errors in Docker

### Removed
- Unnecessary files: cookies.txt, server.log, backup files, restart-server.sh
- Outdated documentation files
- `/api/proxy` endpoint (no longer needed)

### Technical Details

#### File URL Flow
```
Browser → GET /api/download/vm/file.txt
       → Backend returns: { url: "/api/file/vm/file.txt" }
       → Browser fetches: /api/file/vm/file.txt
       → Nginx proxies to: http://backend:5001/api/file/vm/file.txt
       → Backend streams file content
```

#### Database Structure
- Location: `backend/data/filemanager.db`
- Auto-creates on startup if missing
- Tables: files, tags, file_tags
- Automatic trash cleanup after 30 days

#### Docker Services
- **Frontend**: Nginx + React (port 3000)
- **Backend**: Node.js + Express (port 5001)
- **Volumes**: 
  - `backend/data` - Database persistence
  - `backend/vm_storage` - File storage

### Configuration

#### Environment Variables
```bash
# Backend (.env)
PORT=5001
BUCKET_NAME=your-bucket-name
DEV_MODE=true                    # Enable database viewer
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SESSION_SECRET=your-secret-key
```

#### Quick Start
```bash
# Start everything
make start

# Or use the script
./start.sh

# Or manually
docker-compose up -d
```

### Browser Cache Note
After updates, clear browser cache:
- macOS: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

### Files Modified
- `backend/server.js` - Download endpoint, file streaming, database viewer
- `backend/database.js` - Database location, auto-initialization
- `backend/init-db.js` - Data directory creation
- `backend/rebuild-db.js` - Data directory creation
- `backend/rebuild-db-quick.js` - Data directory creation
- `frontend/src/components/Sidebar.jsx` - Database viewer visibility
- `docker-compose.yml` - Volume mounts, environment variables
- `backend/Dockerfile` - Data directory creation
- `.gitignore` - Exclude data directory

### Migration Notes
If upgrading from previous version:
1. Stop containers: `make stop`
2. Move database: `mv backend/filemanager.db backend/data/`
3. Start containers: `make start`
4. Database will auto-initialize if missing
