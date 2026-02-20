# ADrive - Cloud File Manager

A modern, full-stack file management system with support for both local VM storage and Google Cloud Storage (GCS). Features include file organization with tags, trash management with auto-cleanup, and a responsive macOS-inspired interface.

## Features

- **Dual Storage Support**: VM local storage and Google Cloud Storage
- **File Management**: Upload, download, rename, move, and delete files
- **Folder Support**: Create folders and organize files hierarchically
- **Tag System**: Organize files with colored tags
- **Trash System**: Soft delete with 30-day auto-cleanup
- **Responsive UI**: Mobile-friendly interface with list, grid, and gallery views
- **File Preview**: Preview images, videos, audio, PDFs, and text files
- **Text Editor**: Built-in editor for text files
- **Database Viewer**: Development tool for inspecting database (DEV_MODE)

## Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - All changes and fixes
- **[GHCR_QUICK_START.md](GHCR_QUICK_START.md)** - GitHub Container Registry guide
- **[CONTAINER_IMAGES.md](CONTAINER_IMAGES.md)** - Complete container image guide
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[QUICK_START.md](QUICK_START.md)** - Quick start guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment instructions
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Google Cloud Storage bucket (optional, for GCS storage)
- Service account JSON key (for GCS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adrive
   ```

2. **Configure backend environment**
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Edit `backend/.env` and set your configuration:
   ```env
   PORT=5001
   BUCKET_NAME=your-gcs-bucket-name
   SESSION_SECRET=your-secret-key
   DEV_MODE=false
   ```

3. **Add GCS service account**
   
   Place your `service-account.json` file in the `backend/` directory.

4. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

### Development Mode

For local development without Docker:

**Backend:**
```bash
cd backend
npm install
npm run init-db  # Initialize database
node server.js
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## API Endpoints

### Files
- `GET /api/files/:location` - List files (location: vm or bucket)
- `POST /api/upload/:location` - Upload files
- `DELETE /api/files/:location/:filename` - Delete file/folder
- `POST /api/folders/:location` - Create folder
- `POST /api/move/:location` - Move/rename file
- `GET /api/file/:location/*` - Stream/download file

### Trash
- `GET /api/trash/:location` - List trash items
- `POST /api/trash/:location/:fileId/restore` - Restore from trash
- `DELETE /api/trash/:location/:fileId` - Permanently delete
- `DELETE /api/trash/:location/empty` - Empty trash

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `GET /api/tags/recent` - Get recently used tags
- `POST /api/files/:location/:fileId/tags` - Add tag to file
- `DELETE /api/files/:location/:fileId/tags/:tagId` - Remove tag from file

## File System

### Storage Structure
- **VM Storage**: Files stored in `backend/vm_storage/`
- **GCS Storage**: Files stored in configured Google Cloud Storage bucket
- **Database**: SQLite database at `backend/data/filemanager.db` (auto-created on startup)

### File Naming
- Files are stored with their actual names (no UUID hashing)
- Duplicate names are handled with macOS-style numbering: `file.txt`, `file 2.txt`, `file 3.txt`

### Soft Delete
- Deleted files are marked as `is_deleted=1` in the database
- Physical files remain in storage
- Files are permanently deleted after 30 days
- Deleting a folder also hides all its contents

## Database Management

### Initialize Database
```bash
cd backend
npm run init-db
```

### Rebuild Database
```bash
# Interactive mode
npm run rebuild-db

# Quick mode (no prompts)
npm run rebuild-db-quick
```

## Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5001 |
| `NODE_ENV` | Environment | production |
| `BUCKET_NAME` | GCS bucket name | - |
| `SESSION_SECRET` | Session encryption key | - |
| `DEV_MODE` | Bypass authentication | false |

### Frontend Configuration

The frontend automatically connects to the backend at `http://localhost:5001` in development mode. For production, update the API URL in the nginx configuration.

## Development

### Project Structure
```
adrive/
├── backend/
│   ├── database.js           # Database operations
│   ├── file-operations.js    # File helper functions
│   ├── file-sync.js          # Storage sync logic
│   ├── server.js             # Express server
│   ├── init-db.js            # Database initialization
│   ├── rebuild-db.js         # Database rebuild scripts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── nginx.conf            # Nginx configuration
│   └── Dockerfile
├── docs/
│   └── SIMPLIFIED_ARCHITECTURE.md
└── docker-compose.yml
```

### Adding Features

1. **Backend**: Add routes in `server.js`, database operations in `database.js`
2. **Frontend**: Add components in `src/components/`, update `App.jsx`
3. **Database**: Modify schema in `init-db.js`, create migration scripts

## Troubleshooting

### Database Issues
```bash
# Reset database
cd backend
rm filemanager.db
npm run init-db
```

### Storage Sync Issues
```bash
# Rebuild database from physical storage
cd backend
npm run rebuild-db-quick
```

### Docker Issues
```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Security Notes

- Authentication is currently disabled for simplicity
- Enable authentication by setting `DEV_MODE=false` and configuring Google OAuth or local credentials
- Use strong `SESSION_SECRET` in production
- Restrict GCS service account permissions to minimum required
- Use HTTPS in production environments

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please open an issue on GitHub.
