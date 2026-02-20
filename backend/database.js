const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'filemanager.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
const initDatabase = () => {
  // Files table - stores file metadata
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
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

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_location ON files(location);
    CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
    CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_id);
    CREATE INDEX IF NOT EXISTS idx_files_deleted ON files(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
  `);

  // Tags table - stores tag definitions with colors and icons
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
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
    CREATE TABLE IF NOT EXISTS file_tags (
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
    CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
    CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
  `);

  console.log('Database initialized successfully');
};

// File operations
const fileOps = {
  // Create a new file record
  create: (fileData) => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO files (id, name, original_name, path, full_path, location, size, mime_type, type, is_folder, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      fileData.type || null,
      fileData.is_folder ? 1 : 0,
      fileData.parent_id || null
    );
    
    return id;
  },

  // Get file by ID
  getById: (id) => {
    const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
    return stmt.get(id);
  },

  // Get file by full path and location
  getByPath: (location, fullPath) => {
    const stmt = db.prepare('SELECT * FROM files WHERE location = ? AND full_path = ?');
    return stmt.get(location, fullPath);
  },

  // Get all files for a location
  getAll: (location) => {
    const stmt = db.prepare('SELECT * FROM files WHERE location = ? AND is_deleted = 0 ORDER BY is_folder DESC, name ASC');
    return stmt.all(location);
  },

  // Get all files for a location (including deleted)
  getAllIncludingDeleted: (location) => {
    const stmt = db.prepare('SELECT * FROM files WHERE location = ? ORDER BY is_folder DESC, name ASC');
    return stmt.all(location);
  },

  // Get all deleted files (trash)
  getTrash: (location) => {
    const stmt = db.prepare('SELECT * FROM files WHERE location = ? AND is_deleted = 1 ORDER BY deleted_at DESC');
    return stmt.all(location);
  },

  // Update file
  update: (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE files SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
  },

  // Soft delete file (move to trash)
  moveToTrash: (id) => {
    const stmt = db.prepare('UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  },

  // Soft delete folder and all its contents recursively
  moveFolderToTrash: (id) => {
    const file = fileOps.getById(id);
    if (!file) return;

    // If it's a folder, find all files inside it (by matching path prefix)
    if (file.is_folder) {
      // Ensure folder path ends with /
      const folderPath = file.full_path.endsWith('/') ? file.full_path : file.full_path + '/';
      
      // Get all files that are inside this folder (their full_path starts with this folder's full_path)
      const stmt = db.prepare(`
        SELECT id FROM files 
        WHERE location = ? 
        AND full_path LIKE ? 
        AND is_deleted = 0
        AND id != ?
      `);
      const childFiles = stmt.all(file.location, `${folderPath}%`, id);
      
      console.log(`[Delete] Moving folder ${file.name} and ${childFiles.length} children to trash`);
      
      // Move all children to trash
      const updateStmt = db.prepare('UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?');
      childFiles.forEach(child => {
        updateStmt.run(child.id);
      });
    }
    
    // Move the file/folder itself to trash
    const stmt = db.prepare('UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  },

  // Restore file from trash
  restoreFromTrash: (id) => {
    const stmt = db.prepare('UPDATE files SET is_deleted = 0, deleted_at = NULL WHERE id = ?');
    stmt.run(id);
  },

  // Restore folder and all its contents from trash
  restoreFolderFromTrash: (id) => {
    const file = fileOps.getById(id);
    if (!file) return;

    // If it's a folder, restore all files inside it
    if (file.is_folder) {
      // Ensure folder path ends with /
      const folderPath = file.full_path.endsWith('/') ? file.full_path : file.full_path + '/';
      
      // Get all files that are inside this folder (their full_path starts with this folder's full_path)
      const stmt = db.prepare(`
        SELECT id FROM files 
        WHERE location = ? 
        AND full_path LIKE ? 
        AND is_deleted = 1
        AND id != ?
      `);
      const childFiles = stmt.all(file.location, `${folderPath}%`, id);
      
      console.log(`[Restore] Restoring folder ${file.name} and ${childFiles.length} children from trash`);
      
      // Restore all children
      const updateStmt = db.prepare('UPDATE files SET is_deleted = 0, deleted_at = NULL WHERE id = ?');
      childFiles.forEach(child => {
        updateStmt.run(child.id);
      });
    }
    
    // Restore the file/folder itself
    const stmt = db.prepare('UPDATE files SET is_deleted = 0, deleted_at = NULL WHERE id = ?');
    stmt.run(id);
  },

  // Permanently delete file
  delete: (id) => {
    const stmt = db.prepare('DELETE FROM files WHERE id = ?');
    stmt.run(id);
  },

  // Delete old trash items (older than 30 days)
  cleanOldTrash: () => {
    const stmt = db.prepare(`
      DELETE FROM files 
      WHERE is_deleted = 1 
      AND deleted_at < datetime('now', '-30 days')
    `);
    const result = stmt.run();
    return result.changes;
  },



  // Search files
  search: (location, query) => {
    const stmt = db.prepare(`
      SELECT * FROM files 
      WHERE location = ? AND is_deleted = 0 AND (name LIKE ? OR original_name LIKE ?)
      ORDER BY is_folder DESC, name ASC
    `);
    return stmt.all(location, `%${query}%`, `%${query}%`);
  },

  // Get files by tag
  getByTag: (location, tagId) => {
    const stmt = db.prepare(`
      SELECT f.* FROM files f
      INNER JOIN file_tags ft ON f.id = ft.file_id
      WHERE f.location = ? AND f.is_deleted = 0 AND ft.tag_id = ?
      ORDER BY f.is_folder DESC, f.name ASC
    `);
    return stmt.all(location, tagId);
  }
};

// Tag operations
const tagOps = {
  // Create a new tag with color and icon
  create: (name, color = 'gray', icon = 'tag') => {
    const stmt = db.prepare('INSERT INTO tags (name, color, icon, last_used) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const result = stmt.run(name, color, icon);
    return { id: result.lastInsertRowid, name, color, icon };
  },

  // Get or create tag
  getOrCreate: (name, color = 'gray', icon = 'tag') => {
    let tag = tagOps.getByName(name);
    if (!tag) {
      tag = tagOps.create(name, color, icon);
    }
    return tag;
  },

  // Get tag by name
  getByName: (name) => {
    const stmt = db.prepare('SELECT * FROM tags WHERE name = ?');
    return stmt.get(name);
  },

  // Get tag by ID
  getById: (id) => {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id);
  },

  // Get all tags
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC');
    return stmt.all();
  },

  // Get recently used tags (limit to N)
  getRecentlyUsed: (limit = 5) => {
    const stmt = db.prepare('SELECT * FROM tags ORDER BY last_used DESC LIMIT ?');
    return stmt.all(limit);
  },

  // Update tag
  update: (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE tags SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  },

  // Update last_used timestamp
  updateLastUsed: (id) => {
    const stmt = db.prepare('UPDATE tags SET last_used = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  },

  // Delete tag
  delete: (id) => {
    const stmt = db.prepare('DELETE FROM tags WHERE id = ?');
    stmt.run(id);
  },

  // Add tag to file
  addToFile: (fileId, tagId) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)');
    stmt.run(fileId, tagId);
    // Update last_used timestamp
    tagOps.updateLastUsed(tagId);
  },

  // Remove tag from file
  removeFromFile: (fileId, tagId) => {
    const stmt = db.prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?');
    stmt.run(fileId, tagId);
  },

  // Get tags for a file
  getForFile: (fileId) => {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN file_tags ft ON t.id = ft.tag_id
      WHERE ft.file_id = ?
      ORDER BY t.name ASC
    `);
    return stmt.all(fileId);
  },

  // Get all files with their tags for a location
  getAllFileTags: (location) => {
    const stmt = db.prepare(`
      SELECT f.id, f.full_path, t.id as tag_id, t.name as tag_name, t.color as tag_color, t.icon as tag_icon
      FROM files f
      INNER JOIN file_tags ft ON f.id = ft.file_id
      INNER JOIN tags t ON ft.tag_id = t.id
      WHERE f.location = ?
    `);
    
    const rows = stmt.all(location);
    const fileTagsMap = {};
    
    rows.forEach(row => {
      if (!fileTagsMap[row.full_path]) {
        fileTagsMap[row.full_path] = [];
      }
      fileTagsMap[row.full_path].push({
        id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color,
        icon: row.tag_icon
      });
    });
    
    return fileTagsMap;
  }
};

// Initialize database on module load
initDatabase();

module.exports = {
  db,
  fileOps,
  tagOps
};
