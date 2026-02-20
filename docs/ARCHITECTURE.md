# Architecture

## System Overview

```
Frontend (React + Nginx)  →  Backend (Node.js + Express)  →  Storage (VM + GCS)
     Port 3000                      Port 5001                   SQLite DB
```

## Technology Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Nginx (production)

### Backend
- Node.js 20 + Express
- SQLite (Better-SQLite3)
- Google Cloud Storage SDK

### Infrastructure
- Docker + Docker Compose
- Alpine Linux base images

## Database Schema

### Files Table
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- Display name (e.g., "document.txt")
  original_name TEXT,               -- Original upload name
  path TEXT NOT NULL,               -- Parent directory
  full_path TEXT NOT NULL,          -- Complete path (e.g., "folder/document.txt")
  location TEXT NOT NULL,           -- 'vm' or 'bucket'
  size INTEGER DEFAULT 0,
  mime_type TEXT,
  is_folder INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,     -- Soft delete flag
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);
```

### Tags Table
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'gray',
  icon TEXT DEFAULT 'tag',
  created_at DATETIME,
  last_used DATETIME
);
```

### File_Tags Table
```sql
CREATE TABLE file_tags (
  file_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME,
  PRIMARY KEY (file_id, tag_id)
);
```

## File Storage

### Naming Strategy
Files are stored with actual names (no UUID hashing):
- First file: `document.txt`
- Duplicate: `document 2.txt`
- Another: `document 3.txt`

### Benefits
- Human-readable paths
- Easy debugging
- Predictable URLs
- Simple backups

## API Endpoints

### Files
- `GET /api/files/:location` - List files
- `POST /api/upload/:location` - Upload files
- `GET /api/download/:location/:filename` - Get file URL
- `GET /api/file/:location/*` - Stream file content
- `DELETE /api/files/:location/:filename` - Delete (soft)
- `POST /api/folders/:location` - Create folder
- `POST /api/move/:location` - Move/rename

### Trash
- `GET /api/trash/:location` - List trash
- `POST /api/trash/:location/:fileId/restore` - Restore
- `DELETE /api/trash/:location/:fileId` - Delete permanently
- `DELETE /api/trash/:location/empty` - Empty trash

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `GET /api/files/:location/:fileId/tags` - Get file tags
- `POST /api/files/:location/:fileId/tags` - Add tag to file

## Request Flow

### File Preview
```
1. User clicks file
2. Frontend: GET /api/download/vm/file.txt
3. Backend: Returns { url: "/api/file/vm/file.txt" }
4. Frontend: GET /api/file/vm/file.txt
5. Nginx: Proxies to backend:5001
6. Backend: Streams file content
7. Browser: Displays content
```

## Docker Setup

### Services
- **frontend**: React app served by Nginx (port 3000)
- **backend**: Express API server (port 5001)

### Volumes
- `backend/data` - Database persistence
- `backend/vm_storage` - File storage

### Environment
```bash
DEV_MODE=true              # Enable database viewer
PORT=5001
BUCKET_NAME=your-bucket
```

## Security Notes

### Current State
- Authentication disabled (DEV_MODE)
- No user management
- Direct API access

### Production Recommendations
1. Enable authentication
2. Add rate limiting
3. Use HTTPS
4. Secure credentials
5. Validate uploads
6. Add audit logging

## Features

### File Management
- Upload, download, preview, edit
- Rename, move, delete
- Folder creation and navigation
- Soft delete with trash

### Tag System
- Create and manage tags
- Tag files for organization
- Filter by tags

### View Modes
- List view (detailed)
- Grid view (icons)
- Gallery view (preview panel)

### Storage
- VM storage (local filesystem)
- GCS storage (Google Cloud)
- Auto-sync between storage and database

## Development

### Quick Start
```bash
make start          # Start all services
make logs           # View logs
make stop           # Stop services
```

### Database
```bash
make db-init        # Initialize database
make db-rebuild     # Rebuild from storage
```

See README.md for complete documentation.
