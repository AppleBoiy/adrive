const fs = require('fs');
const path = require('path');
const { fileOps } = require('./database');

/**
 * Helper functions for file operations
 */

/**
 * Generate unique display name with macOS-style numbering
 * @param {string} originalName - Original filename
 * @param {string} location - Storage location (vm/bucket)
 * @param {string} targetPath - Target directory path
 * @returns {string} Unique display name
 */
function generateUniqueDisplayName(originalName, location, targetPath) {
  // Get all files in the same location and path (excluding deleted)
  const existingFiles = fileOps.getAll(location).filter(f => 
    f.path === targetPath && f.is_deleted === 0
  );
  const existingNames = new Set(existingFiles.map(f => f.name));
  
  // If name doesn't exist, use original
  if (!existingNames.has(originalName)) {
    return originalName;
  }
  
  // Parse filename and extension
  const ext = path.extname(originalName);
  const nameWithoutExt = originalName.slice(0, originalName.length - ext.length);
  
  // Find the next available number (macOS style: "file 2", "file 3")
  let counter = 2;
  let newName;
  
  do {
    newName = `${nameWithoutExt} ${counter}${ext}`;
    counter++;
  } while (existingNames.has(newName));
  
  return newName;
}

/**
 * Generate physical filename - just use the display name (no UUID)
 * @param {string} displayName - Display filename
 * @returns {string} Physical filename (same as display name)
 */
function generatePhysicalFilename(displayName) {
  // No more UUID - just use the actual filename
  return displayName;
}

/**
 * Determine file type from filename and MIME type
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 * @param {boolean} isFolder - Is folder flag
 * @returns {string} File type
 */
function determineFileType(filename, mimeType, isFolder) {
  // Folders
  if (isFolder) {
    return 'directory';
  }
  
  // Get extension from filename
  const ext = path.extname(filename).toLowerCase();
  
  // Use MIME type if available
  if (mimeType) {
    const mime = mimeType.toLowerCase();
    
    // Images
    if (mime.startsWith('image/')) return 'image';
    
    // Videos
    if (mime.startsWith('video/')) return 'video';
    
    // Audio
    if (mime.startsWith('audio/')) return 'audio';
    
    // Documents
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('word') || mime.includes('document')) return 'document';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'spreadsheet';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation';
    
    // Text
    if (mime.startsWith('text/')) return 'text';
    
    // Archives
    if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) return 'archive';
    
    // Code
    if (mime.includes('javascript') || mime.includes('json') || mime.includes('xml')) return 'code';
  }
  
  // Fallback to extension-based detection
  const typeMap = {
    // Images
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
    '.svg': 'image', '.webp': 'image', '.bmp': 'image', '.ico': 'image',
    
    // Videos
    '.mp4': 'video', '.mov': 'video', '.avi': 'video', '.mkv': 'video',
    '.webm': 'video', '.flv': 'video', '.wmv': 'video',
    
    // Audio
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.m4a': 'audio',
    '.flac': 'audio', '.aac': 'audio', '.wma': 'audio',
    
    // Documents
    '.pdf': 'pdf',
    '.doc': 'document', '.docx': 'document', '.odt': 'document',
    '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.ods': 'spreadsheet', '.csv': 'spreadsheet',
    '.ppt': 'presentation', '.pptx': 'presentation', '.odp': 'presentation',
    
    // Text
    '.txt': 'text', '.md': 'text', '.rtf': 'text',
    
    // Code
    '.js': 'code', '.jsx': 'code', '.ts': 'code', '.tsx': 'code',
    '.html': 'code', '.css': 'code', '.scss': 'code', '.sass': 'code',
    '.json': 'code', '.xml': 'code', '.yaml': 'code', '.yml': 'code',
    '.py': 'code', '.java': 'code', '.c': 'code', '.cpp': 'code',
    '.php': 'code', '.rb': 'code', '.go': 'code', '.rs': 'code',
    '.sh': 'code', '.bash': 'code',
    
    // Archives
    '.zip': 'archive', '.rar': 'archive', '.7z': 'archive',
    '.tar': 'archive', '.gz': 'archive', '.bz2': 'archive',
    
    // Other
    '.db': 'database', '.sqlite': 'database', '.sql': 'database',
    '.exe': 'executable', '.app': 'executable', '.dmg': 'executable',
  };
  
  return typeMap[ext] || 'file';
}

/**
 * Create file record in database
 * @param {Object} fileData - File data
 * @returns {string} File ID
 */
function createFileRecord(fileData) {
  // Determine file type if not provided
  if (!fileData.type) {
    fileData.type = determineFileType(
      fileData.original_name || fileData.name,
      fileData.mime_type,
      fileData.is_folder
    );
  }
  
  return fileOps.create({
    name: fileData.name,
    original_name: fileData.original_name || fileData.name,
    path: fileData.path || '',
    full_path: fileData.full_path,
    location: fileData.location,
    size: fileData.size || 0,
    mime_type: fileData.mime_type || null,
    type: fileData.type,
    is_folder: fileData.is_folder || false,
    parent_id: fileData.parent_id || null
  });
}

/**
 * Update file record in database
 * @param {string} fileId - File ID
 * @param {Object} updates - Updates to apply
 */
function updateFileRecord(fileId, updates) {
  fileOps.update(fileId, updates);
}

/**
 * Delete file record from database (soft delete)
 * @param {string} fileId - File ID
 */
function deleteFileRecord(fileId) {
  fileOps.moveToTrash(fileId);
}

/**
 * Get file by path
 * @param {string} location - Storage location
 * @param {string} fullPath - Full file path
 * @returns {Object|null} File record
 */
function getFileByPath(location, fullPath) {
  return fileOps.getByPath(location, fullPath);
}

/**
 * Get file by ID
 * @param {string} fileId - File ID
 * @returns {Object|null} File record
 */
function getFileById(fileId) {
  return fileOps.getById(fileId);
}

/**
 * Get all files for location
 * @param {string} location - Storage location
 * @returns {Array} File records
 */
function getAllFiles(location) {
  return fileOps.getAll(location);
}

/**
 * Format file for API response
 * @param {Object} file - File record from database
 * @returns {Object} Formatted file object
 */
function formatFileForResponse(file) {
  return {
    id: file.id,
    name: file.name, // Display name
    fullName: file.full_path, // Physical path for operations
    size: file.is_folder ? '-' : `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    date: file.updated_at || file.created_at,
    type: file.is_folder ? 'folder' : 'file',
    fileType: file.type, // Actual file type from database (directory, image, pdf, etc.)
    mimeType: file.mime_type,
    isDeleted: file.is_deleted
  };
}

/**
 * Validate file path for security
 * @param {string} filePath - File path to validate
 * @param {string} basePath - Base path to check against
 * @returns {boolean} True if valid
 */
function validateFilePath(filePath, basePath) {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(basePath);
  return resolvedPath.startsWith(resolvedBase);
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Delete physical file or directory
 * @param {string} filePath - Path to file or directory
 */
function deletePhysicalFile(filePath) {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Move/rename physical file
 * @param {string} oldPath - Current path
 * @param {string} newPath - New path
 */
function movePhysicalFile(oldPath, newPath) {
  if (fs.existsSync(oldPath)) {
    // Ensure destination directory exists
    const destDir = path.dirname(newPath);
    ensureDirectoryExists(destDir);
    
    fs.renameSync(oldPath, newPath);
  }
}

module.exports = {
  generateUniqueDisplayName,
  generatePhysicalFilename,
  determineFileType,
  createFileRecord,
  updateFileRecord,
  deleteFileRecord,
  getFileByPath,
  getFileById,
  getAllFiles,
  formatFileForResponse,
  validateFilePath,
  ensureDirectoryExists,
  deletePhysicalFile,
  movePhysicalFile
};
