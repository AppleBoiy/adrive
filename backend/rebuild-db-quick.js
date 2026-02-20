/**
 * Quick Database Rebuild Script
 * 
 * This script rebuilds the database without confirmation prompts.
 * Useful for automation, testing, or when you're sure you want to rebuild.
 * 
 * Usage: node rebuild-db-quick.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'filemanager.db');
const VM_STORAGE_PATH = path.join(__dirname, 'vm_storage');
const storage = new Storage({ keyFilename: 'service-account.json' });
const bucketName = process.env.BUCKET_NAME;

console.log('🔄 Quick Database Rebuild - Starting...\n');

(async () => {
  let db;
  
  try {
    // Backup
    if (fs.existsSync(DB_PATH)) {
      const backupPath = `${DB_PATH}.backup.${Date.now()}`;
      fs.copyFileSync(DB_PATH, backupPath);
      console.log(`✓ Backup: ${path.basename(backupPath)}`);
    }
    
    // Open DB
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    
    // Drop tables
    db.exec('DROP TABLE IF EXISTS file_tags');
    db.exec('DROP TABLE IF EXISTS tags');
    db.exec('DROP TABLE IF EXISTS files');
    console.log('✓ Tables dropped');
    
    // Create schema
    createSchema(db);
    console.log('✓ Schema created');
    
    // Scan VM
    const vmFiles = scanVMStorage();
    console.log(`✓ VM: ${vmFiles.length} files found`);
    
    for (const file of vmFiles) {
      insertFile(db, file);
    }
    console.log(`✓ VM: ${vmFiles.length} files added`);
    
    // Scan Bucket
    if (bucketName) {
      try {
        const bucketFiles = await scanBucketStorage();
        console.log(`✓ Bucket: ${bucketFiles.length} files found`);
        
        for (const file of bucketFiles) {
          insertFile(db, file);
        }
        console.log(`✓ Bucket: ${bucketFiles.length} files added`);
      } catch (err) {
        console.log(`⚠️  Bucket: ${err.message}`);
      }
    }
    
    // Stats
    const totalFiles = db.prepare('SELECT COUNT(*) as count FROM files').get().count;
    console.log(`\n✅ Rebuild complete: ${totalFiles} total records\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (db) db.close();
  }
})();

function createSchema(db) {
  db.exec(`
    CREATE TABLE files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      original_name TEXT,
      path TEXT NOT NULL,
      full_path TEXT NOT NULL,
      location TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      mime_type TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_folder INTEGER DEFAULT 0,
      parent_id TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at DATETIME,
      FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_files_location ON files(location);
    CREATE INDEX idx_files_path ON files(path);
    CREATE INDEX idx_files_parent ON files(parent_id);
    CREATE INDEX idx_files_deleted ON files(is_deleted);
    CREATE INDEX idx_files_type ON files(type);
    
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT 'gray',
      icon TEXT DEFAULT 'tag',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE file_tags (
      file_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (file_id, tag_id),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_file_tags_file ON file_tags(file_id);
    CREATE INDEX idx_file_tags_tag ON file_tags(tag_id);
  `);
}

function scanVMStorage() {
  const files = [];
  
  function scan(dirPath, baseDir = '') {
    if (!fs.existsSync(dirPath)) return;
    
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
              location: 'vm',
              size: 0,
              mime_type: null,
              is_folder: true
            });
            scan(fullPath, relativePath);
          } else {
            files.push({
              name: item,
              original_name: item,
              path: baseDir,
              full_path: relativePath,
              location: 'vm',
              size: stats.size,
              mime_type: getMimeType(item),
              is_folder: false
            });
          }
        } catch (err) {
          // Skip files with errors
        }
      }
    } catch (err) {
      // Skip directories with errors
    }
  }
  
  scan(VM_STORAGE_PATH);
  return files;
}

async function scanBucketStorage() {
  const files = [];
  const [bucketFiles] = await storage.bucket(bucketName).getFiles();
  
  for (const file of bucketFiles) {
    let fileName = file.name.split('/').pop() || file.name;
    const filePath = file.name.includes('/') 
      ? file.name.substring(0, file.name.lastIndexOf('/'))
      : '';
    
    const isFolder = file.name.endsWith('/');
    
    // Remove trailing slash from folder names for display
    if (isFolder && fileName.endsWith('/')) {
      fileName = fileName.slice(0, -1);
    }
    
    files.push({
      name: fileName, // Display name without trailing slash
      original_name: fileName,
      path: filePath,
      full_path: file.name, // Physical path with trailing slash for folders
      location: 'bucket',
      size: parseInt(file.metadata.size || 0),
      mime_type: file.metadata.contentType,
      is_folder: isFolder
    });
  }
  
  return files;
}

function insertFile(db, fileData) {
  const { v4: uuidv4 } = require('uuid');
  
  // Determine file type
  const type = determineFileType(fileData);
  
  const stmt = db.prepare(`
    INSERT INTO files (id, name, original_name, path, full_path, location, size, mime_type, type, is_folder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    uuidv4(),
    fileData.name,
    fileData.original_name || fileData.name,
    fileData.path || '',
    fileData.full_path,
    fileData.location,
    fileData.size || 0,
    fileData.mime_type || null,
    type,
    fileData.is_folder ? 1 : 0
  );
}

function determineFileType(file) {
  if (file.is_folder) return 'directory';
  
  const ext = path.extname(file.name).toLowerCase();
  
  if (file.mime_type) {
    const mime = file.mime_type.toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.startsWith('text/')) return 'text';
  }
  
  const typeMap = {
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image',
    '.mp4': 'video', '.mov': 'video',
    '.mp3': 'audio', '.wav': 'audio',
    '.pdf': 'pdf', '.txt': 'text',
    '.js': 'code', '.json': 'code',
    '.zip': 'archive',
  };
  
  return typeMap[ext] || 'file';
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.txt': 'text/plain', '.pdf': 'application/pdf', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
    '.zip': 'application/zip', '.json': 'application/json'
  };
  return types[ext] || 'application/octet-stream';
}
