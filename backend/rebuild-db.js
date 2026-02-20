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

console.log('='.repeat(60));
console.log('DATABASE REBUILD SCRIPT');
console.log('='.repeat(60));
console.log('');
console.log('⚠️  WARNING: This will completely rebuild the database!');
console.log('');
console.log('What will happen:');
console.log('  1. Backup current database');
console.log('  2. Drop all tables');
console.log('  3. Recreate schema');
console.log('  4. Scan VM storage and add all files');
console.log('  5. Scan GCS bucket and add all files');
console.log('');

// Ask for confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Do you want to continue? (yes/no): ', async (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Rebuild cancelled.');
    readline.close();
    process.exit(0);
  }
  
  readline.close();
  await rebuildDatabase();
});

async function rebuildDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('STARTING DATABASE REBUILD');
  console.log('='.repeat(60) + '\n');
  
  let db;
  
  try {
    // Step 1: Backup current database
    console.log('📦 Step 1: Backing up current database...');
    if (fs.existsSync(DB_PATH)) {
      const backupPath = `${DB_PATH}.backup.${Date.now()}`;
      fs.copyFileSync(DB_PATH, backupPath);
      console.log(`✓ Backup created: ${backupPath}\n`);
    } else {
      console.log('✓ No existing database to backup\n');
    }
    
    // Step 2: Open database connection
    console.log('🔌 Step 2: Opening database connection...');
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    console.log('✓ Database connection established\n');
    
    // Step 3: Drop all tables
    console.log('🗑️  Step 3: Dropping all tables...');
    db.exec('DROP TABLE IF EXISTS file_tags');
    db.exec('DROP TABLE IF EXISTS tags');
    db.exec('DROP TABLE IF EXISTS files');
    console.log('✓ All tables dropped\n');
    
    // Step 4: Recreate schema
    console.log('🏗️  Step 4: Creating database schema...');
    createSchema(db);
    console.log('✓ Schema created successfully\n');
    
    // Step 5: Scan and add VM storage files
    console.log('📂 Step 5: Scanning VM storage...');
    const vmFiles = scanVMStorage();
    console.log(`✓ Found ${vmFiles.length} files in VM storage`);
    
    console.log('💾 Adding VM files to database...');
    let vmCount = 0;
    for (const file of vmFiles) {
      try {
        insertFile(db, file);
        vmCount++;
        if (vmCount % 100 === 0) {
          process.stdout.write(`\r  Progress: ${vmCount}/${vmFiles.length} files`);
        }
      } catch (err) {
        console.error(`\n  ⚠️  Error adding ${file.full_path}:`, err.message);
      }
    }
    console.log(`\n✓ Added ${vmCount} VM files to database\n`);
    
    // Step 6: Scan and add GCS bucket files
    if (bucketName) {
      console.log('☁️  Step 6: Scanning GCS bucket...');
      try {
        const bucketFiles = await scanBucketStorage();
        console.log(`✓ Found ${bucketFiles.length} files in bucket`);
        
        console.log('💾 Adding bucket files to database...');
        let bucketCount = 0;
        for (const file of bucketFiles) {
          try {
            insertFile(db, file);
            bucketCount++;
            if (bucketCount % 100 === 0) {
              process.stdout.write(`\r  Progress: ${bucketCount}/${bucketFiles.length} files`);
            }
          } catch (err) {
            console.error(`\n  ⚠️  Error adding ${file.full_path}:`, err.message);
          }
        }
        console.log(`\n✓ Added ${bucketCount} bucket files to database\n`);
      } catch (err) {
        console.error('⚠️  Error scanning bucket:', err.message);
        console.log('  Skipping bucket files\n');
      }
    } else {
      console.log('⚠️  Step 6: No bucket configured, skipping\n');
    }
    
    // Step 7: Show statistics
    console.log('📊 Step 7: Database statistics...');
    showStatistics(db);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE REBUILD COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ REBUILD FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

/**
 * Create database schema
 */
function createSchema(db) {
  // Files table
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
    )
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX idx_files_location ON files(location);
    CREATE INDEX idx_files_path ON files(path);
    CREATE INDEX idx_files_parent ON files(parent_id);
    CREATE INDEX idx_files_deleted ON files(is_deleted);
    CREATE INDEX idx_files_type ON files(type);
  `);
  
  // Tags table
  db.exec(`
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT 'gray',
      icon TEXT DEFAULT 'tag',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // File-Tags junction table
  db.exec(`
    CREATE TABLE file_tags (
      file_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (file_id, tag_id),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for tags
  db.exec(`
    CREATE INDEX idx_file_tags_file ON file_tags(file_id);
    CREATE INDEX idx_file_tags_tag ON file_tags(tag_id);
  `);
}

/**
 * Scan VM storage directory
 */
function scanVMStorage() {
  const files = [];
  
  function scanDirectory(dirPath, baseDir = '') {
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
            
            // Recursively scan subdirectory
            scanDirectory(fullPath, relativePath);
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
          console.error(`  ⚠️  Error reading ${relativePath}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`  ⚠️  Error scanning directory ${dirPath}:`, err.message);
    }
  }
  
  if (fs.existsSync(VM_STORAGE_PATH)) {
    scanDirectory(VM_STORAGE_PATH);
  }
  
  return files;
}

/**
 * Scan GCS bucket storage
 */
async function scanBucketStorage() {
  const files = [];
  
  try {
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
  } catch (err) {
    throw new Error(`Failed to scan bucket: ${err.message}`);
  }
  
  return files;
}

/**
 * Insert file into database
 */
function insertFile(db, fileData) {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  // Determine file type
  const type = determineFileType(fileData);
  
  const stmt = db.prepare(`
    INSERT INTO files (id, name, original_name, path, full_path, location, size, mime_type, type, is_folder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
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

/**
 * Determine file type based on file data
 */
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
    if (mime.includes('zip') || mime.includes('archive')) return 'archive';
  }
  
  const typeMap = {
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
    '.mp4': 'video', '.mov': 'video', '.avi': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio',
    '.pdf': 'pdf',
    '.txt': 'text', '.md': 'text',
    '.js': 'code', '.jsx': 'code', '.ts': 'code',
    '.html': 'code', '.css': 'code', '.json': 'code',
    '.zip': 'archive', '.rar': 'archive',
  };
  
  return typeMap[ext] || 'file';
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Show database statistics
 */
function showStatistics(db) {
  const stats = {
    totalFiles: db.prepare('SELECT COUNT(*) as count FROM files WHERE is_folder = 0').get().count,
    totalFolders: db.prepare('SELECT COUNT(*) as count FROM files WHERE is_folder = 1').get().count,
    vmFiles: db.prepare("SELECT COUNT(*) as count FROM files WHERE location = 'vm'").get().count,
    bucketFiles: db.prepare("SELECT COUNT(*) as count FROM files WHERE location = 'bucket'").get().count,
    deletedFiles: db.prepare('SELECT COUNT(*) as count FROM files WHERE is_deleted = 1').get().count,
    totalSize: db.prepare('SELECT SUM(size) as total FROM files WHERE is_folder = 0').get().total || 0,
    tags: db.prepare('SELECT COUNT(*) as count FROM tags').get().count,
  };
  
  console.log('  Files:');
  console.log(`    Total files: ${stats.totalFiles}`);
  console.log(`    Total folders: ${stats.totalFolders}`);
  console.log(`    VM storage: ${stats.vmFiles}`);
  console.log(`    Bucket storage: ${stats.bucketFiles}`);
  console.log(`    Deleted (trash): ${stats.deletedFiles}`);
  console.log(`    Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Tags: ${stats.tags}`);
}
