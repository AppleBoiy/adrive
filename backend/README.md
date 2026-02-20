# ADrive Backend

Node.js/Express backend for ADrive file management system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Initialize database:
   ```bash
   npm run init-db
   ```

4. Start server:
   ```bash
   node server.js
   ```

## Scripts

- `npm run init-db` - Initialize fresh database
- `npm run rebuild-db` - Rebuild database from storage (interactive)
- `npm run rebuild-db-quick` - Rebuild database (automatic)

## API Documentation

See main README.md for complete API documentation.

## Database Schema

The database is stored in `backend/data/filemanager.db` and uses SQLite.

### Files Table
- `id` - Unique identifier (UUID)
- `name` - Display name
- `original_name` - Original filename
- `path` - Parent directory path
- `full_path` - Complete path in storage
- `location` - Storage location (vm/bucket)
- `size` - File size in bytes
- `mime_type` - MIME type
- `type` - File category (directory, image, video, etc.)
- `is_folder` - Folder flag
- `is_deleted` - Soft delete flag
- `deleted_at` - Deletion timestamp
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Tags Table
- `id` - Auto-increment ID
- `name` - Tag name
- `color` - Tag color
- `icon` - Tag icon (deprecated)
- `created_at` - Creation timestamp
- `last_used` - Last usage timestamp

### File_Tags Table
- `file_id` - File reference
- `tag_id` - Tag reference
- `created_at` - Association timestamp

## Architecture

- **database.js** - SQLite operations and queries
- **file-operations.js** - File system helpers
- **file-sync.js** - Storage synchronization
- **server.js** - Express routes and middleware
- **init-db.js** - Database initialization
- **rebuild-db.js** - Database rebuild utilities
