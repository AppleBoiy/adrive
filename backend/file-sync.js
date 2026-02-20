const fs = require('fs');
const path = require('path');
const { fileOps } = require('./database');

/**
 * Sync physical files with database
 * This ensures database is always in sync with actual storage
 */
class FileSync {
  constructor(storagePath, storage, bucketName) {
    this.storagePath = storagePath;
    this.storage = storage;
    this.bucketName = bucketName;
  }

  /**
   * Scan VM storage and sync with database
   */
  async syncVMStorage() {
    const location = 'vm';
    const physicalFiles = this.scanDirectory(this.storagePath);
    
    // Get ALL files from database (including deleted ones) for sync check
    const allDbFiles = fileOps.getAllIncludingDeleted(location);
    const activeDbFiles = allDbFiles.filter(f => !f.is_deleted);
    
    // Create maps for efficient lookup
    const dbPathMap = new Map(allDbFiles.map(f => [f.full_path, f]));
    const physicalPathSet = new Set(physicalFiles.map(f => f.full_path));
    
    // Add missing files to database (only if they don't exist at all, even as deleted)
    for (const file of physicalFiles) {
      const existingFile = dbPathMap.get(file.full_path);
      
      if (!existingFile) {
        // File doesn't exist in DB at all - create new record
        console.log(`[Sync] Adding to DB: ${file.full_path} with name: ${file.name}`);
        
        // Determine file type
        file.type = this.determineFileType(file.name, file.mime_type, file.is_folder);
        
        fileOps.create({
          name: file.name,
          original_name: file.name,
          path: file.path,
          full_path: file.full_path,
          location: location,
          size: file.size,
          mime_type: file.mime_type,
          type: file.type,
          is_folder: file.is_folder
        });
      } else if (existingFile.is_deleted) {
        // File exists but is marked as deleted - skip it (don't restore automatically)
        console.log(`[Sync] Skipping deleted file: ${file.full_path}`);
      } else {
        console.log(`[Sync] File already in DB: ${file.full_path}`);
      }
    }
    
    // Remove orphaned database records (active files that don't exist physically)
    for (const dbFile of activeDbFiles) {
      if (!physicalPathSet.has(dbFile.full_path)) {
        console.log(`[Sync] Removing orphaned DB record: ${dbFile.full_path}`);
        fileOps.delete(dbFile.id);
      }
    }
    
    return fileOps.getAll(location);
  }

  /**
   * Scan GCS bucket and sync with database
   */
  async syncBucketStorage() {
    const location = 'bucket';
    
    try {
      const [files] = await this.storage.bucket(this.bucketName).getFiles();
      
      // Get ALL files from database (including deleted ones) for sync check
      const allDbFiles = fileOps.getAllIncludingDeleted(location);
      const activeDbFiles = allDbFiles.filter(f => !f.is_deleted);
      
      // Create maps for efficient lookup
      const dbPathMap = new Map(allDbFiles.map(f => [f.full_path, f]));
      const bucketPathSet = new Set(files.map(f => f.name));
      
      // Add missing files to database (only if they don't exist at all, even as deleted)
      for (const file of files) {
        const existingFile = dbPathMap.get(file.name);
        
        if (!existingFile) {
          // File doesn't exist in DB at all - create new record
          let fileName = file.name.split('/').pop() || file.name;
          const filePath = file.name.includes('/') 
            ? file.name.substring(0, file.name.lastIndexOf('/'))
            : '';
          
          const isFolder = file.name.endsWith('/');
          
          // Remove trailing slash from folder names for display
          if (isFolder && fileName.endsWith('/')) {
            fileName = fileName.slice(0, -1);
          }
          
          const mimeType = file.metadata.contentType;
          const fileType = this.determineFileType(fileName, mimeType, isFolder);
          
          console.log(`[Sync] Adding to DB: ${file.name}`);
          fileOps.create({
            name: fileName, // Display name without trailing slash
            original_name: fileName,
            path: filePath,
            full_path: file.name, // Physical path with trailing slash for folders
            location: location,
            size: parseInt(file.metadata.size || 0),
            mime_type: mimeType,
            type: fileType,
            is_folder: isFolder
          });
        } else if (existingFile.is_deleted) {
          // File exists but is marked as deleted - skip it (don't restore automatically)
          console.log(`[Sync] Skipping deleted file: ${file.name}`);
        }
      }
      
      // Remove orphaned database records (active files that don't exist physically)
      for (const dbFile of activeDbFiles) {
        if (!bucketPathSet.has(dbFile.full_path)) {
          console.log(`[Sync] Removing orphaned DB record: ${dbFile.full_path}`);
          fileOps.delete(dbFile.id);
        }
      }
      
      return fileOps.getAll(location);
    } catch (error) {
      console.error('[Sync] Error syncing bucket:', error.message);
      return fileOps.getAll(location);
    }
  }

  /**
   * Recursively scan directory and return file list
   */
  scanDirectory(dirPath, baseDir = '') {
    const files = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativePath = baseDir ? path.join(baseDir, item) : item;
        
        try {
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            files.push({
              name: item, // Folder name without trailing slash
              original_name: item,
              path: baseDir,
              full_path: relativePath + '/', // Physical path with trailing slash
              size: 0,
              is_folder: true,
              mime_type: null
            });
            
            // Recursively scan subdirectory
            files.push(...this.scanDirectory(fullPath, relativePath));
          } else {
            files.push({
              name: item,
              original_name: item,
              path: baseDir,
              full_path: relativePath,
              size: stats.size,
              is_folder: false,
              mime_type: this.getMimeType(item)
            });
          }
        } catch (err) {
          console.error(`[Sync] Error reading ${relativePath}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`[Sync] Error scanning directory ${dirPath}:`, err.message);
    }
    
    return files;
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Determine file type from filename and MIME type
   */
  determineFileType(filename, mimeType, isFolder) {
    if (isFolder) return 'directory';
    
    const ext = path.extname(filename).toLowerCase();
    
    // Use MIME type if available
    if (mimeType) {
      const mime = mimeType.toLowerCase();
      if (mime.startsWith('image/')) return 'image';
      if (mime.startsWith('video/')) return 'video';
      if (mime.startsWith('audio/')) return 'audio';
      if (mime.includes('pdf')) return 'pdf';
      if (mime.startsWith('text/')) return 'text';
      if (mime.includes('zip') || mime.includes('archive')) return 'archive';
    }
    
    // Extension-based detection
    const typeMap = {
      '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
      '.mp4': 'video', '.mov': 'video', '.avi': 'video',
      '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio',
      '.pdf': 'pdf',
      '.txt': 'text', '.md': 'text',
      '.js': 'code', '.jsx': 'code', '.ts': 'code', '.tsx': 'code',
      '.html': 'code', '.css': 'code', '.json': 'code',
      '.zip': 'archive', '.rar': 'archive', '.7z': 'archive',
    };
    
    return typeMap[ext] || 'file';
  }
}

module.exports = FileSync;
