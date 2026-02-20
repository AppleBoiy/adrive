const express = require('express');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { db, fileOps, tagOps } = require('./database');
const FileSync = require('./file-sync');
const fileOperations = require('./file-operations');
require('dotenv').config();

const app = express();

// Passport Config
// Mock user for local login (in a real app, this would be in a database)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

passport.use(new LocalStrategy(
  (username, password, done) => {
    if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
      return done(null, { 
        id: 'admin', 
        displayName: 'Admin User', 
        emails: [{ value: 'admin@example.com' }],
        photos: [{ value: '' }]
      });
    }
    return done(null, false, { message: 'Incorrect username or password.' });
  }
));

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  ));
} else if (process.env.DEV_MODE !== 'true') {
  console.warn('WARNING: GOOGLE_CLIENT_ID is not set. Google Login will not work.');
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'adrive-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using https
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(express.json());

// Multer memory storage for all uploads
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Storage Configuration
const VM_STORAGE_PATH = path.join(__dirname, 'vm_storage');

if (!fs.existsSync(VM_STORAGE_PATH)) {
  fs.mkdirSync(VM_STORAGE_PATH, { recursive: true });
  console.log('Created vm_storage directory');
}

const storage = new Storage({ keyFilename: 'service-account.json' });
const bucketName = process.env.BUCKET_NAME;

// Initialize file sync
const fileSync = new FileSync(VM_STORAGE_PATH, storage, bucketName);

// Routes
app.use('/storage', express.static(VM_STORAGE_PATH, {
  dotfiles: 'allow' // Allow serving hidden files like .gitkeep, .gitignore
}));

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message || 'Login failed' });
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json(user);
    });
  })(req, res, next);
});

app.get('/api/user', (req, res) => {
  if (process.env.DEV_MODE === 'true') {
    return res.json({
      displayName: 'Dev User',
      emails: [{ value: 'dev@example.com' }],
      photos: [{ value: '' }]
    });
  }
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logged out' });
  });
});

// Auth Middleware - disabled for simplicity
const ensureAuthenticated = (req, res, next) => {
  // Authentication disabled - allow all requests
  return next();
};

// Upload Files
app.post('/api/upload/:location', ensureAuthenticated, (req, res) => {
  const { location } = req.params;

  memoryUpload.array('files')(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const targetPath = req.body.path || '';

    try {
      if (location === 'bucket') {
        const uploadPromises = req.files.map((file) => {
          return new Promise((resolve, reject) => {
            // Generate unique display name with numbering if needed
            const displayName = fileOperations.generateUniqueDisplayName(
              file.originalname, 
              location, 
              targetPath
            );
            
            // Use display name as physical filename (no UUID)
            // Normalize path to avoid double slashes
            const normalizedTargetPath = targetPath.replace(/\/+$/, ''); // Remove trailing slashes
            const fullBlobName = normalizedTargetPath
              ? `${normalizedTargetPath}/${displayName}`
              : displayName;

            const blob = storage.bucket(bucketName).file(fullBlobName);
            const blobStream = blob.createWriteStream({ resumable: false });

            blobStream.on('error', (err) => reject(err));
            blobStream.on('finish', () => {
              // Create database record
              fileOperations.createFileRecord({
                name: displayName,
                original_name: file.originalname,
                path: targetPath,
                full_path: fullBlobName,
                location: location,
                size: file.size,
                mime_type: file.mimetype,
                is_folder: false
              });
              resolve();
            });
            blobStream.end(file.buffer);
          });
        });

        await Promise.all(uploadPromises);
        res.status(200).json({ message: `Uploaded ${req.files.length} files successfully to bucket` });
      } else {
        // VM storage
        const destDir = path.join(VM_STORAGE_PATH, targetPath);
        fileOperations.ensureDirectoryExists(destDir);

        req.files.forEach((file) => {
          // Generate unique display name with numbering if needed
          const displayName = fileOperations.generateUniqueDisplayName(
            file.originalname, 
            location, 
            targetPath
          );
          
          // Use display name as physical filename (no UUID)
          const filePath = path.join(destDir, displayName);
          // Normalize path to avoid double slashes
          const normalizedTargetPath = targetPath.replace(/\/+$/, ''); // Remove trailing slashes
          const relativePath = normalizedTargetPath ? `${normalizedTargetPath}/${displayName}` : displayName;
          
          // Validate path for security
          if (!fileOperations.validateFilePath(filePath, VM_STORAGE_PATH)) {
            throw new Error('Invalid file path');
          }
          
          fs.writeFileSync(filePath, file.buffer);
          
          console.log('[Upload] Creating record:', {
            name: displayName,
            original_name: file.originalname,
            path: targetPath,
            full_path: relativePath
          });
          
          // Create database record
          fileOperations.createFileRecord({
            name: displayName,
            original_name: file.originalname,
            path: targetPath,
            full_path: relativePath,
            location: location,
            size: file.size,
            mime_type: file.mimetype,
            is_folder: false
          });
        });

        res.status(200).json({ message: `Uploaded ${req.files.length} files to VM successfully` });
      }
    } catch (err) {
      console.error('Upload error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
});

// Create Folders
app.post('/api/folders/:location', ensureAuthenticated, async (req, res) => {
  const { location } = req.params;
  const { name, path: targetPath } = req.body;

  if (!name) return res.status(400).json({ error: 'Folder name is required' });

  // Remove trailing slash from name for display
  const cleanName = name.endsWith('/') ? name.slice(0, -1) : name;
  
  // Ensure folder name ends with / for physical storage
  const folderName = cleanName + '/';
  const fullPath = targetPath 
    ? (targetPath.endsWith('/') ? targetPath : targetPath + '/') + folderName
    : folderName;

  try {
    // Generate unique display name with number if duplicate exists (without trailing slash)
    const displayName = fileOperations.generateUniqueDisplayName(cleanName, location, targetPath || '');

    if (location === 'bucket') {
      // GCS: Create a 0-byte object with a trailing slash to simulate a folder
      const blob = storage.bucket(bucketName).file(fullPath);
      const blobStream = blob.createWriteStream({ resumable: false });

      blobStream.on('error', (err) => res.status(500).json({ error: err.message }));
      blobStream.on('finish', () => {
        // Create database record
        fileOperations.createFileRecord({
          name: displayName, // Display name without trailing slash
          original_name: cleanName, // Original name without trailing slash
          path: targetPath || '',
          full_path: fullPath, // Physical path with trailing slash
          location: location,
          is_folder: true
        });
        res.status(200).json({ message: `Created folder in bucket: ${displayName}` });
      });
      blobStream.end();
    } else {
      // VM: Use fs.mkdirSync to create the directory
      const folderPath = path.join(VM_STORAGE_PATH, fullPath);
      
      // Safety check to prevent path traversal
      if (!fileOperations.validateFilePath(folderPath, VM_STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        
        // Create database record
        fileOperations.createFileRecord({
          name: displayName, // Display name without trailing slash
          original_name: cleanName, // Original name without trailing slash
          path: targetPath || '',
          full_path: fullPath, // Physical path with trailing slash
          location: location,
          is_folder: true
        });
        
        res.status(200).json({ message: `Created folder on VM: ${displayName}` });
      } else {
        res.status(400).json({ error: 'Folder already exists' });
      }
    }
  } catch (err) {
    console.error('Create folder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health Check
app.get('/test', (req, res) => {
  res.status(200).send('Backend is reachable');
});

app.get('/api/files/:location', ensureAuthenticated, async (req, res) => {
  const { location } = req.params;

  try {
    let dbFiles;
    
    if (location === 'bucket') {
      // Sync bucket storage with database
      dbFiles = await fileSync.syncBucketStorage();
    } else {
      // Sync VM storage with database
      dbFiles = await fileSync.syncVMStorage();
    }
    
    // Format files for response
    const fileList = dbFiles.map(file => fileOperations.formatFileForResponse(file));
    
    res.json(fileList);
  } catch (err) {
    console.error('Error fetching files:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Download Files - returns URL for file access
app.get('/api/download/:location/:filename', ensureAuthenticated, async (req, res) => {
  const { location, filename } = req.params;

  try {
    const decodedName = decodeURIComponent(filename);
    
    // Return relative URL for frontend to use
    const fileUrl = `/api/file/${location}/${encodeURIComponent(decodedName)}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stream files directly - use regex to capture full path
app.get(/^\/api\/file\/(vm|bucket)\/(.+)/, ensureAuthenticated, async (req, res) => {
  const location = req.params[0]; // vm or bucket
  const filepath = req.params[1]; // full file path
  
  try {
    const decodedPath = decodeURIComponent(filepath);
    
    if (location === 'bucket') {
      // Stream from GCS
      const fileStream = storage.bucket(bucketName).file(decodedPath).createReadStream();
      
      // Get file from database for MIME type
      const file = fileOps.getByPath(location, decodedPath);
      if (file && file.mime_type) {
        res.setHeader('Content-Type', file.mime_type);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      
      fileStream.pipe(res);
      fileStream.on('error', (err) => {
        console.error('GCS stream error:', err);
        if (!res.headersSent) {
          res.status(404).send('File not found');
        }
      });
    } else {
      // Stream from VM
      const filePath = path.join(VM_STORAGE_PATH, decodedPath);
      
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        
        // Get file from database for MIME type
        const file = fileOps.getByPath(location, decodedPath);
        if (file && file.mime_type) {
          res.setHeader('Content-Type', file.mime_type);
        }
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Accept-Ranges', 'bytes');
        
        // Handle range requests for video/audio seeking
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          const chunksize = (end - start) + 1;
          
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
          res.setHeader('Content-Length', chunksize);
          
          const fileStream = fs.createReadStream(filePath, { start, end });
          fileStream.pipe(res);
        } else {
          const fileStream = fs.createReadStream(filePath);
          fileStream.pipe(res);
        }
      } else {
        res.status(404).send('File not found on VM');
      }
    }
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Move Files
app.post('/api/move/:location', ensureAuthenticated, async (req, res) => {
  const { location } = req.params;
  const { oldName, newName } = req.body;

  if (!oldName || !newName) return res.status(400).json({ error: 'Source and destination names are required' });

  try {
    const decodedOldName = decodeURIComponent(oldName);
    const decodedNewName = decodeURIComponent(newName);
    if (location === 'bucket') {
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: decodedOldName });

      if (files.length === 0) {
        return res.status(404).json({ error: 'File or folder not found in bucket' });
      }

      const movePromises = files.map((file) => {
        const relativePath = file.name.substring(decodedOldName.length);
        const destinationName = decodedNewName + relativePath;
        return file.move(destinationName);
      });

      await Promise.all(movePromises);
      res.status(200).json({ message: `Moved from ${decodedOldName} to ${decodedNewName} in bucket` });
    } else {
      const oldPath = path.join(VM_STORAGE_PATH, decodedOldName);
      const newPath = path.join(VM_STORAGE_PATH, decodedNewName);

      // Safety check to prevent path traversal
      const resolvedOldPath = path.resolve(oldPath);
      const resolvedNewPath = path.resolve(newPath);
      const vmRoot = path.resolve(VM_STORAGE_PATH);

      if (!resolvedOldPath.startsWith(vmRoot) || !resolvedNewPath.startsWith(vmRoot)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (fs.existsSync(oldPath)) {
        // Ensure destination parent directory exists
        const destDir = path.dirname(newPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.renameSync(oldPath, newPath);
        res.status(200).json({ message: `Moved from ${decodedOldName} to ${decodedNewName} on VM` });
      } else {
        res.status(404).json({ error: 'File or folder not found on VM' });
      }
    }
  } catch (err) {
    console.error('Move error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Remove Files (Soft Delete - Move to Trash)
app.delete('/api/files/:location/:filename', ensureAuthenticated, async (req, res) => {
  const { location, filename } = req.params;

  try {
    const decodedName = decodeURIComponent(filename);
    
    // Get file from database
    const file = fileOps.getByPath(location, decodedName);
    
    if (file) {
      // Check if it's a folder - if so, delete all contents recursively
      if (file.is_folder == 1 || file.is_folder === true) {
        fileOps.moveFolderToTrash(file.id);
        res.status(200).json({ message: `Moved folder and contents to trash: ${decodedName}` });
      } else {
        // Soft delete - move to trash
        fileOps.moveToTrash(file.id);
        res.status(200).json({ message: `Moved to trash: ${decodedName}` });
      }
    } else {
      res.status(404).json({ error: 'File not found in database' });
    }
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get trash items
app.get('/api/trash/:location', ensureAuthenticated, (req, res) => {
  const { location } = req.params;
  
  try {
    const trashItems = fileOps.getTrash(location);
    res.json({ files: trashItems });
  } catch (err) {
    console.error('Error fetching trash:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Restore file from trash
app.post('/api/trash/:location/:fileId/restore', ensureAuthenticated, (req, res) => {
  const { fileId } = req.params;
  
  try {
    const file = fileOps.getById(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if it's a folder - if so, restore all contents recursively
    if (file.is_folder) {
      fileOps.restoreFolderFromTrash(fileId);
      res.json({ message: 'Folder and contents restored from trash' });
    } else {
      fileOps.restoreFromTrash(fileId);
      res.json({ message: 'File restored from trash' });
    }
  } catch (err) {
    console.error('Error restoring file:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Empty trash (delete all trash items) - MUST be before /:fileId route
app.delete('/api/trash/:location/empty', ensureAuthenticated, async (req, res) => {
  const { location } = req.params;
  
  try {
    const trashItems = fileOps.getTrash(location);
    let deletedCount = 0;
    
    for (const file of trashItems) {
      try {
        // Delete physical file
        if (location === 'bucket') {
          await storage.bucket(bucketName).file(file.full_path).delete();
        } else {
          const filePath = path.join(VM_STORAGE_PATH, file.full_path);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        }
        
        // Delete from database
        fileOps.delete(file.id);
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting file ${file.name}:`, err.message);
      }
    }
    
    res.json({ message: `Emptied trash: ${deletedCount} items deleted` });
  } catch (err) {
    console.error('Error emptying trash:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Permanently delete file from trash
app.delete('/api/trash/:location/:fileId', ensureAuthenticated, async (req, res) => {
  const { location, fileId } = req.params;
  
  try {
    const file = fileOps.getById(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (!file.is_deleted) {
      return res.status(400).json({ error: 'File is not in trash' });
    }
    
    // Delete physical file
    if (location === 'bucket') {
      await storage.bucket(bucketName).file(file.full_path).delete();
    } else {
      const filePath = path.join(VM_STORAGE_PATH, file.full_path);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    // Delete from database
    fileOps.delete(fileId);
    res.json({ message: 'File permanently deleted' });
  } catch (err) {
    console.error('Error permanently deleting file:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Tags API Routes
// Get recently used tags (MUST be before /api/tags to avoid route conflict)
app.get('/api/tags/recent', ensureAuthenticated, (req, res) => {
  const { limit } = req.query;
  try {
    const tags = tagOps.getRecentlyUsed(limit ? parseInt(limit) : 5);
    res.json({ tags });
  } catch (err) {
    console.error('Error fetching recent tags:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all tags
app.get('/api/tags', ensureAuthenticated, (req, res) => {
  try {
    const tags = tagOps.getAll();
    res.json({ tags });
  } catch (err) {
    console.error('Error fetching tags:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create a new tag
app.post('/api/tags', ensureAuthenticated, (req, res) => {
  const { name, color, icon } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tag name is required' });
  }
  
  try {
    const tag = tagOps.getOrCreate(name.trim(), color || 'gray', icon || 'tag');
    res.json({ tag });
  } catch (err) {
    console.error('Error creating tag:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update a tag
app.put('/api/tags/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const { name, color, icon } = req.body;
  
  try {
    const updates = {};
    if (name) updates.name = name;
    if (color) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    
    tagOps.update(id, updates);
    const tag = tagOps.getById(id);
    res.json({ tag });
  } catch (err) {
    console.error('Error updating tag:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a tag
app.delete('/api/tags/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  
  try {
    tagOps.delete(id);
    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error deleting tag:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get tags for a specific file
app.get('/api/files/:location/:fileId/tags', ensureAuthenticated, (req, res) => {
  const { fileId } = req.params;
  
  try {
    const tags = tagOps.getForFile(fileId);
    res.json({ tags });
  } catch (err) {
    console.error('Error fetching file tags:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add tag to file
app.post('/api/files/:location/:fileId/tags', ensureAuthenticated, (req, res) => {
  const { fileId } = req.params;
  const { tagId } = req.body;
  
  if (!tagId) {
    return res.status(400).json({ error: 'Tag ID is required' });
  }
  
  try {
    tagOps.addToFile(fileId, tagId);
    const tags = tagOps.getForFile(fileId);
    res.json({ tags });
  } catch (err) {
    console.error('Error adding tag to file:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Remove tag from file
app.delete('/api/files/:location/:fileId/tags/:tagId', ensureAuthenticated, (req, res) => {
  const { fileId, tagId } = req.params;
  
  try {
    tagOps.removeFromFile(fileId, tagId);
    const tags = tagOps.getForFile(fileId);
    res.json({ tags });
  } catch (err) {
    console.error('Error removing tag from file:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all files with their tags for a location
app.get('/api/tags/files/:location', ensureAuthenticated, (req, res) => {
  const { location } = req.params;
  
  try {
    const fileTagsMap = tagOps.getAllFileTags(location);
    res.json({ fileTags: fileTagsMap });
  } catch (err) {
    console.error('Error fetching file tags:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get files by tag
app.get('/api/tags/:tagId/files/:location', ensureAuthenticated, (req, res) => {
  const { tagId, location } = req.params;
  
  try {
    const files = fileOps.getByTag(location, tagId);
    const fileList = files.map(file => ({
      id: file.id,
      name: file.name,
      fullName: file.full_path,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      date: file.updated_at,
      type: file.is_folder ? 'folder' : 'file'
    }));
    res.json({ files: fileList });
  } catch (err) {
    console.error('Error fetching files by tag:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dev Mode - Database Viewer
app.get('/api/dev/database/tables', ensureAuthenticated, (req, res) => {
  if (process.env.DEV_MODE !== 'true') {
    return res.status(403).json({ error: 'Dev mode not enabled' });
  }
  
  try {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    res.json({ tables: tables.map(t => t.name) });
  } catch (err) {
    console.error('Error fetching tables:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dev/database/table/:tableName', ensureAuthenticated, (req, res) => {
  if (process.env.DEV_MODE !== 'true') {
    return res.status(403).json({ error: 'Dev mode not enabled' });
  }
  
  const { tableName } = req.params;
  
  try {
    // Get table schema
    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    // Get table data
    const data = db.prepare(`SELECT * FROM ${tableName} LIMIT 100`).all();
    
    // Get row count
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    
    res.json({ 
      schema, 
      data,
      count: count.count,
      tableName 
    });
  } catch (err) {
    console.error('Error fetching table data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dev/database/query', ensureAuthenticated, (req, res) => {
  if (process.env.DEV_MODE !== 'true') {
    return res.status(403).json({ error: 'Dev mode not enabled' });
  }
  
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    // Only allow SELECT queries for safety
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }
    
    const result = db.prepare(query).all();
    res.json({ result });
  } catch (err) {
    console.error('Error executing query:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Automatic trash cleanup function
const cleanupOldTrash = () => {
  try {
    const deletedCount = fileOps.cleanOldTrash();
    if (deletedCount > 0) {
      console.log(`[Trash Cleanup] Permanently deleted ${deletedCount} items older than 30 days`);
    }
  } catch (err) {
    console.error('[Trash Cleanup] Error:', err.message);
  }
};

// Run cleanup on server start
cleanupOldTrash();

// Schedule cleanup to run daily (every 24 hours)
setInterval(cleanupOldTrash, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`VM Path: ${VM_STORAGE_PATH}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Trash cleanup: Automatic (every 24 hours, items older than 30 days)`);
});