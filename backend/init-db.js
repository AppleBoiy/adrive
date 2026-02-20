const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'filemanager.db');

console.log('============================================================');
console.log('DATABASE INITIALIZATION SCRIPT');
console.log('============================================================');
console.log('');

// Check if database already exists
const dbExists = fs.existsSync(DB_PATH);

if (dbExists) {
  console.log('⚠️  WARNING: Database already exists!');
  console.log(`Location: ${DB_PATH}`);
  console.log('');
  console.log('This script will:');
  console.log('1. Backup the existing database');
  console.log('2. Delete the old database');
  console.log('3. Create a fresh database with the correct schema');
  console.log('');
  
  // In a real scenario, you might want to prompt for confirmation
  // For now, we'll proceed with backup
  const backupPath = `${DB_PATH}.backup.${Date.now()}`;
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`✓ Backup created: ${backupPath}`);
  
  // Delete old database
  fs.unlinkSync(DB_PATH);
  console.log('✓ Old database deleted');
  console.log('');
}

console.log('Creating new database...');
console.log('');

try {
  const db = new Database(DB_PATH);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  console.log('✓ Foreign keys enabled');
  
  // Create files table
  console.log('Creating files table...');
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
  console.log('✓ Files table created');
  
  // Create indexes for files table
  console.log('Creating indexes for files table...');
  db.exec(`
    CREATE INDEX idx_files_location ON files(location);
    CREATE INDEX idx_files_path ON files(path);
    CREATE INDEX idx_files_parent ON files(parent_id);
    CREATE INDEX idx_files_deleted ON files(is_deleted);
    CREATE INDEX idx_files_type ON files(type);
  `);
  console.log('✓ Files indexes created');
  
  // Create tags table
  console.log('Creating tags table...');
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
  console.log('✓ Tags table created');
  
  // Create file_tags junction table
  console.log('Creating file_tags junction table...');
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
  console.log('✓ File_tags table created');
  
  // Create indexes for tags
  console.log('Creating indexes for tags...');
  db.exec(`
    CREATE INDEX idx_file_tags_file ON file_tags(file_id);
    CREATE INDEX idx_file_tags_tag ON file_tags(tag_id);
  `);
  console.log('✓ Tags indexes created');
  
  console.log('');
  console.log('============================================================');
  console.log('DATABASE SCHEMA');
  console.log('============================================================');
  console.log('');
  
  // Display schema information
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('Tables created:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
    
    // Show columns for each table
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    columns.forEach(col => {
      const nullable = col.notnull ? 'NOT NULL' : 'NULL';
      const defaultVal = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
      const pk = col.pk ? 'PRIMARY KEY' : '';
      console.log(`      ${col.name} (${col.type}) ${nullable} ${defaultVal} ${pk}`.trim());
    });
    console.log('');
  });
  
  // Show indexes
  const indexes = db.prepare(`
    SELECT name, tbl_name 
    FROM sqlite_master 
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all();
  
  console.log('Indexes created:');
  indexes.forEach(idx => {
    console.log(`  - ${idx.name} (on ${idx.tbl_name})`);
  });
  
  db.close();
  
  console.log('');
  console.log('============================================================');
  console.log('✅ DATABASE INITIALIZED SUCCESSFULLY!');
  console.log('============================================================');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run the server: node server.js');
  console.log('2. The database will automatically sync with physical storage');
  console.log('3. Or run rebuild script to populate from existing files:');
  console.log('   - node rebuild-db.js (interactive)');
  console.log('   - node rebuild-db-quick.js (automatic)');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('============================================================');
  console.error('❌ DATABASE INITIALIZATION FAILED');
  console.error('============================================================');
  console.error('');
  console.error('Error:', error.message);
  console.error('');
  process.exit(1);
}
