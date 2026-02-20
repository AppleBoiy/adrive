import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import FileRow from './components/FileRow';
import FileGridItem from './components/FileGridItem';
import PreviewModal from './components/PreviewModal';
import TextEditor from './components/TextEditor';
import DatabaseViewer from './components/DatabaseViewer';
import TagsManager from './components/TagsManager';
import TagManager from './components/TagManager';
import Trash from './components/Trash';
import Login from './components/Login';
import { Search, ChevronLeft, ChevronRight, Download, Eye, Trash2, ArrowUp, ArrowDown, FolderPlus, Move, LayoutGrid, List, Menu, Edit3, Columns3, FilePlus, Tag } from 'lucide-react';
const sortTree = (nodes, config) => {
  const { key, direction } = config;
  
  return [...nodes].sort((a, b) => {
    // Folders always first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;

    let valA = a[key];
    let valB = b[key];

    if (key === 'size') {
      valA = parseFloat(a.size) || 0;
      valB = parseFloat(b.size) || 0;
    } else if (key === 'date') {
      valA = new Date(a.date).getTime();
      valB = new Date(b.date).getTime();
    } else {
      valA = (valA || '').toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  }).map(node => ({
    ...node,
    children: node.children ? sortTree(node.children, config) : []
  }));
};
const buildTree = (files) => {
  const root = [];
  files.forEach((file) => {
    // Use fullName for tree building (now contains actual filenames, not UUIDs)
    const parts = file.fullName.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let existingPath = currentLevel.find((v) => v.fullName === (isLast ? file.fullName : currentPath + '/'));

      if (!existingPath) {
        existingPath = {
          ...file,
          id: isLast ? file.id : `folder-${currentPath}`,
          name: isLast ? file.name : part, // Display name
          fullName: isLast ? file.fullName : currentPath + '/',
          children: [],
          type: isLast ? file.type : 'folder',
        };
        currentLevel.push(existingPath);
      }
      currentLevel = existingPath.children;
    });
  });
  return root;
};
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('vm');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [viewMode, setViewMode] = useState(() => {
    // Load saved view mode from localStorage, default to 'list'
    return localStorage.getItem('fileManagerViewMode') || 'list';
  });
  const [currentPath, setCurrentPath] = useState(''); // Added for grid view navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [galleryPreviewUrl, setGalleryPreviewUrl] = useState(null);
  const [galleryPreviewType, setGalleryPreviewType] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorFile, setEditorFile] = useState(null);
  const [isNewFile, setIsNewFile] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [tagsFile, setTagsFile] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [fileTagsMap, setFileTagsMap] = useState({});
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [tagsRefreshTrigger, setTagsRefreshTrigger] = useState(0);
  const [storageStatus, setStorageStatus] = useState({ vm: true, gcs: false });

  const fetchFiles = () => {
    if (!user) return;
    fetch(`/api/files/${location}`)
      .then(res => res.json())
      .then(data => setFiles(data));
  };

  useEffect(() => {
    // Check auth status
    fetch('/api/user')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(userData => {
        setUser(userData);
        setLoading(false);
        // Check storage status
        return fetch('/api/storage/status');
      })
      .then(res => res.json())
      .then(status => {
        setStorageStatus(status);
        // If GCS is not available and current location is bucket, switch to VM
        if (!status.gcs && location === 'bucket') {
          setLocation('vm');
        }
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      fetchFiles();
      fetchAllFileTags();
      setCurrentPath(''); // Reset path when switching location
      setSelectedFile(null);
      setSelectedTag(null);
    }
  }, [location, user]);

  const fetchAllFileTags = async () => {
    try {
      const res = await fetch(`/api/tags/files/${location}`);
      const data = await res.json();
      setFileTagsMap(data.fileTags || {});
    } catch (error) {
      console.error('Error fetching file tags:', error);
    }
  };

  const handleTagFilter = async (tag) => {
    setSelectedTag(tag);
    setSelectedFile(null);
    
    if (tag) {
      // Fetch files for this tag
      try {
        const res = await fetch(`/api/tags/${tag.id}/files/${location}`);
        const data = await res.json();
        setFiles(data.files || []);
      } catch (error) {
        console.error('Error fetching files by tag:', error);
      }
    } else {
      // Reset to all files
      fetchFiles();
    }
  };

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fileManagerViewMode', viewMode);
  }, [viewMode]);

  // Memoize the tree so it only recalculates when files change, search query changes, or sort config changes
  const fileTree = useMemo(() => {
    let filteredFiles = files;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(query)
      );
    }
    
    const tree = buildTree(filteredFiles);
    return sortTree(tree, sortConfig);
  }, [files, searchQuery, sortConfig]);

  // Flatten the tree for grid view - now filtered by currentPath
  const flattenedFiles = useMemo(() => {
    if (viewMode === 'list') return []; // Don't bother if not in grid mode

    const findFolder = (nodes, path) => {
      if (!path) return nodes;
      const parts = path.split('/').filter(Boolean);
      let current = nodes;
      for (const part of parts) {
        const found = current.find(n => n.name === part && n.type === 'folder');
        if (!found) return [];
        current = found.children;
      }
      return current;
    };

    const currentLevelNodes = findFolder(fileTree, currentPath);
    return currentLevelNodes;
  }, [fileTree, currentPath, viewMode]);

  const toggleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />;
  };

  const isTextFile = (fileName) => {
    // Known text file extensions
    const textExtensions = /\.(txt|js|json|md|py|html|css|jsx|ts|tsx|xml|yaml|yml|sh|bash|c|cpp|h|java|php|rb|go|rs|swift|kt|scala|r|sql|log|csv|ini|conf|config|env|gitignore|gitkeep|dockerfile|makefile)$/i;
    
    // Files without extensions or with dot-prefix (like .gitignore, .env)
    const dotFiles = /^\.[\w-]+$/;
    const baseName = fileName.split('/').pop();
    
    // Check if it's a known text extension
    if (textExtensions.test(fileName)) return true;
    
    // Check if it's a dot file (like .gitignore, .gitkeep)
    if (dotFiles.test(baseName)) return true;
    
    // Files without extension (like Dockerfile, Makefile, README)
    if (!baseName.includes('.') || baseName.startsWith('.')) return true;
    
    return false;
  };

  const isMediaFile = (fileName) => {
    return /\.(png|jpe?g|gif|svg|webp|bmp|ico|pdf|mp3|wav|ogg|m4a|flac|mp4|webm|mov|avi|mkv)$/i.test(fileName);
  };

  // Load gallery preview when file is selected
  useEffect(() => {
    if (viewMode === 'gallery' && selectedFile && selectedFile.type !== 'folder') {
      loadGalleryPreview(selectedFile);
    } else {
      setGalleryPreviewUrl(null);
      setGalleryPreviewType(null);
    }
  }, [selectedFile, viewMode, location]);

  const loadGalleryPreview = async (file) => {
    try {
      const res = await fetch(`/api/download/${location}/${encodeURIComponent(file.fullName)}`);
      const data = await res.json();
      
      if (data.url) {
        const isImage = /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(file.name);
        const isPDF = /\.pdf$/i.test(file.name);
        const isAudio = /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name);
        const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name);
        const isText = isTextFile(file.name);
        
        if (isImage) {
          setGalleryPreviewUrl(data.url);
          setGalleryPreviewType('image');
        } else if (isPDF) {
          setGalleryPreviewUrl(data.url);
          setGalleryPreviewType('pdf');
        } else if (isAudio) {
          setGalleryPreviewUrl(data.url);
          setGalleryPreviewType('audio');
        } else if (isVideo) {
          setGalleryPreviewUrl(data.url);
          setGalleryPreviewType('video');
        } else if (isText) {
          // Fetch text content directly from the streaming endpoint
          const contentRes = await fetch(data.url);
          const content = await contentRes.text();
          setGalleryPreviewUrl(content);
          setGalleryPreviewType('text');
        } else {
          setGalleryPreviewUrl(null);
          setGalleryPreviewType('unsupported');
        }
      }
    } catch (error) {
      console.error('Error loading gallery preview:', error);
      setGalleryPreviewUrl(null);
      setGalleryPreviewType('error');
    }
  };

  const handleAction = async (file, actionType) => {
    if (actionType === 'open' && file.type === 'folder') {
      setCurrentPath(file.fullName);
      return;
    }
    try {
      const res = await fetch(`/api/download/${location}/${encodeURIComponent(file.fullName)}`);
      const data = await res.json();
      
      if (data.url) {
        if (actionType === 'preview') {
          // If it's a preview, we try to fetch the content if it's likely a text file
          const isImage = /\.(png|jpe?g|gif|svg|webp)$/i.test(file.name);
          const isPDF = /\.pdf$/i.test(file.name);
          const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
          const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(file.name);
          const isText = isTextFile(file.name);
          
          if (isText) {
            // Fetch text content directly from the streaming endpoint
            const contentRes = await fetch(data.url);
            const content = await contentRes.text();
            setPreviewContent(content);
            setPreviewFile(file);
            setIsPreviewOpen(true);
          } else if (isImage || isPDF || isAudio || isVideo) {
            setPreviewContent(data.url);
            setPreviewFile(file);
            setIsPreviewOpen(true);
          } else {
            // For other files, fallback to opening in a new tab if it's not supported by modal
            window.open(data.url, '_blank');
          }
        } else {
          // Trigger download
          const link = document.createElement('a');
          link.href = data.url;
          link.setAttribute('download', file.name);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }
    } catch (error) {
      console.error('Error during action:', error);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = window.prompt('Enter folder name:');
    if (!folderName) return;

    let targetPath = selectedFile?.type === 'folder' ? selectedFile.fullName : '';
    if (!targetPath && viewMode === 'grid' && currentPath) {
      targetPath = currentPath;
    }

    try {
      const response = await fetch(`/api/folders/${location}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName, path: targetPath }),
      });

      if (response.ok) {
        console.log(`Folder created: ${folderName}`);
        fetchFiles(); // Refresh file list
      } else {
        const data = await response.json().catch(() => ({ error: 'Invalid server response' }));
        console.error('Create folder failed:', data.error);
        alert(`Failed to create folder: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleCreateTextFile = () => {
    setIsNewFile(true);
    setEditorContent('');
    setEditorFile(null);
    setIsEditorOpen(true);
  };

  const handleEditFile = async (file) => {
    try {
      const res = await fetch(`/api/download/${location}/${encodeURIComponent(file.fullName)}`);
      const data = await res.json();
      
      if (data.url) {
        // Fetch text content directly from the streaming endpoint
        const contentRes = await fetch(data.url);
        const content = await contentRes.text();
        
        setIsNewFile(false);
        setEditorContent(content);
        setEditorFile(file);
        setIsEditorOpen(true);
      }
    } catch (error) {
      console.error('Error loading file for editing:', error);
      alert('Failed to load file for editing');
    }
  };

  const handleSaveFile = async (content) => {
    let fileName;
    let targetPath = selectedFile?.type === 'folder' ? selectedFile.fullName : '';
    if (!targetPath && viewMode === 'grid' && currentPath) {
      targetPath = currentPath;
    }

    if (isNewFile) {
      fileName = window.prompt('Enter file name (e.g., notes.txt):');
      if (!fileName) throw new Error('File name is required');
      
      // Add .txt extension if no extension provided
      if (!fileName.includes('.')) {
        fileName = `${fileName}.txt`;
      }
    } else {
      fileName = editorFile.name; // Use original display name
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });

    const formData = new FormData();
    formData.append('files', file);
    
    // For new files, use target path; for existing files, use the file's directory
    if (isNewFile) {
      formData.append('path', targetPath);
    } else {
      // Extract directory from fullName
      const fileDir = editorFile.fullName.includes('/') 
        ? editorFile.fullName.slice(0, editorFile.fullName.lastIndexOf('/')) 
        : '';
      formData.append('path', fileDir);
    }

    try {
      const response = await fetch(`/api/upload/${location}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log(`File saved: ${fileName}`);
        fetchFiles();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Invalid server response' }));
        throw new Error(errorData.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  };

  const handleUpload = async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    let targetPath = selectedFile?.type === 'folder' ? selectedFile.fullName : '';
    if (!targetPath && viewMode === 'grid' && currentPath) {
      targetPath = currentPath;
    }
    formData.append('path', targetPath);

    try {
      const response = await fetch(`/api/upload/${location}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log(`Upload successful to: ${targetPath || 'root'}`);
        fetchFiles(); // Refresh file list
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Invalid server response' }));
        console.error('Upload failed:', errorData.error);
        alert(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  const handleRemove = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) return;

    try {
      const response = await fetch(`/api/files/${location}/${encodeURIComponent(file.fullName)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Delete successful');
        setSelectedFile(null);
        fetchFiles(); // Refresh file list
      } else {
        const data = await response.json().catch(() => ({ error: 'Invalid server response' }));
        console.error('Delete failed:', data.error);
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleRename = async (file) => {
    const isFolder = file.type === 'folder';
    const originalFull = file.fullName;
    const trimmed = originalFull.replace(/\/$/, '');
    const baseName = trimmed.split('/').pop();
    const currentDir = trimmed.includes('/') ? trimmed.slice(0, trimmed.lastIndexOf('/') + 1) : '';

    const newBaseName = window.prompt(
      `Rename ${isFolder ? 'folder' : 'file'}:`,
      baseName
    );
    
    if (newBaseName === null || newBaseName.trim() === '') return; // cancelled or empty
    if (newBaseName === baseName) return; // no change

    // Build the new full path
    let newName = currentDir ? `${currentDir}${newBaseName}` : newBaseName;
    if (isFolder && !newName.endsWith('/')) newName = `${newName}/`;

    try {
      const response = await fetch(`/api/move/${location}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldName: encodeURIComponent(file.fullName), 
          newName: encodeURIComponent(newName) 
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid server response' }));

      if (response.ok) {
        console.log(`Renamed ${file.name} to ${newBaseName}`);
        setSelectedFile(null);
        fetchFiles(); // Refresh file list
      } else {
        console.error('Rename failed:', data.error);
        alert(`Failed to rename: ${data.error}`);
      }
    } catch (error) {
      console.error('Error renaming file:', error);
    }
  };

  const handleMove = async (file) => {
    // Ask for destination folder (location only). The file/folder name will be preserved.
    const isFolder = file.type === 'folder';
    const originalFull = file.fullName;
    const trimmed = originalFull.replace(/\/$/, '');
    const baseName = trimmed.split('/').pop();
    const currentDir = trimmed.includes('/') ? trimmed.slice(0, trimmed.lastIndexOf('/') + 1) : '';

    const destInput = window.prompt(
      `Move to folder (e.g. "archive/2024"). Destination path only, leave empty for root:`,
      currentDir
    );
    if (destInput === null) return; // cancelled

    // Normalize destination folder path (no leading/trailing slashes)
    const destDir = (destInput || '').replace(/^\/+/, '').replace(/\/+$/, '');

    // Build newName by appending the original name to the destination folder
    let newName = destDir ? `${destDir}/${baseName}` : baseName;
    if (isFolder && !newName.endsWith('/')) newName = `${newName}/`;

    if (newName === originalFull) return; // nothing to do

    try {
      const response = await fetch(`/api/move/${location}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldName: encodeURIComponent(file.fullName), 
          newName: encodeURIComponent(newName) 
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid server response' }));

      if (response.ok) {
        console.log(`Moved ${file.name} to ${newName}`);
        setSelectedFile(null);
        fetchFiles(); // Refresh file list
      } else {
        console.error('Move failed:', data.error);
        alert(`Failed to move: ${data.error}`);
      }
    } catch (error) {
      console.error('Error moving file:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <div className="flex h-screen w-full bg-white text-[#4d4d4d] font-sans overflow-hidden select-none">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        currentLocation={location} 
        setLocation={setLocation} 
        onUpload={handleUpload} 
        targetPath={selectedFile?.type === 'folder' ? selectedFile.fullName : (viewMode === 'grid' ? currentPath : '')}
        user={user}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        onTagFilter={handleTagFilter}
        selectedTag={selectedTag}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
        refreshTrigger={tagsRefreshTrigger}
        storageStatus={storageStatus}
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-12 bg-[#f6f6f6] border-b border-[#d9d9d9] flex items-center justify-between px-2 sm:px-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1 text-gray-600 hover:bg-gray-200 rounded"
            >
              <Menu size={18} />
            </button>
            <div className="flex gap-2 sm:gap-4">
              <button 
                onClick={() => {
                  if (currentPath) {
                    const parts = currentPath.split('/').filter(Boolean);
                    parts.pop();
                    setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
                  }
                }}
                disabled={!currentPath}
                className={`p-1 rounded ${!currentPath ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <ChevronLeft size={18} />
              </button>
              <button disabled className="text-gray-300 p-1 hidden sm:block"><ChevronRight size={18} /></button>
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[13px] font-bold capitalize truncate">{location} Storage</span>
              {currentPath && (
                <div className="hidden sm:flex items-center text-[13px] text-gray-500 min-w-0">
                  <span className="mx-1">/</span>
                  <span className="truncate max-w-[200px]">{currentPath}</span>
                </div>
              )}
              <button 
                onClick={handleCreateFolder}
                className="ml-2 p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 px-2"
                title="New Folder"
              >
                <FolderPlus size={16} />
                <span className="text-[11px] font-medium hidden sm:inline">New Folder</span>
              </button>
              <button 
                onClick={handleCreateTextFile}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 px-2"
                title="New Text File"
              >
                <FilePlus size={16} />
                <span className="text-[11px] font-medium hidden sm:inline">New File</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex bg-white border border-[#ccc] rounded-md overflow-hidden">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
              >
                <List size={16} />
              </button>
              <div className="w-[1px] bg-[#ccc]" />
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <div className="w-[1px] bg-[#ccc]" />
              <button 
                onClick={() => setViewMode('gallery')}
                className={`p-1.5 ${viewMode === 'gallery' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Gallery View"
              >
                <Columns3 size={16} />
              </button>
            </div>
            <div className="relative hidden md:block">
              <Search className="absolute left-2 top-2 text-gray-400" size={14} />
              <input 
                className="bg-white border border-[#ccc] rounded-md pl-8 py-1 text-[12px] w-32 lg:w-48" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto flex">
          {/* File List Section */}
          <div className={`${viewMode === 'gallery' ? 'w-1/2 border-r border-[#d9d9d9]' : 'flex-1'} overflow-auto`}>
            {viewMode === 'list' || viewMode === 'gallery' ? (
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left text-[13px] border-collapse table-fixed min-w-[600px]">
                  <thead className="bg-[#f6f6f6] border-b border-[#d9d9d9] sticky top-0 z-10">
                    <tr className="cursor-default select-none">
                      <th 
                        className="font-normal px-2 sm:px-4 py-1 border-r border-[#d9d9d9] w-[50%] hover:bg-[#ebebeb]"
                        onClick={() => toggleSort('name')}
                      >
                        Name <SortIcon column="name" />
                      </th>
                      <th 
                        className="font-normal px-2 sm:px-4 py-1 border-r border-[#d9d9d9] w-[25%] hover:bg-[#ebebeb]"
                        onClick={() => toggleSort('date')}
                      >
                        Date Modified <SortIcon column="date" />
                      </th>
                      <th 
                        className="font-normal px-2 sm:px-4 py-1 text-right pr-4 sm:pr-8 hover:bg-[#ebebeb]"
                        onClick={() => toggleSort('size')}
                      >
                        Size <SortIcon column="size" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileTree.map(item => (
                      <FileRow
                        key={item.id || item.fullName}
                        item={item}
                        onSelect={(f) => setSelectedFile(f)}
                        selectedId={selectedFile?.fullName}
                        onAction={handleAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-2 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-4">
                {flattenedFiles.map(item => (
                  <FileGridItem
                    key={item.id || item.fullName}
                    item={item}
                    onSelect={(f) => setSelectedFile(f)}
                    selectedId={selectedFile?.fullName}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Gallery Preview Panel */}
          {viewMode === 'gallery' && (
            <div className="w-1/2 bg-[#fafafa] flex flex-col overflow-hidden">
              {selectedFile ? (
                <>
                  {/* Preview Header */}
                  <div className="p-4 border-b border-[#d9d9d9] bg-white">
                    <h3 className="text-[14px] font-semibold text-gray-800 truncate mb-1">{selectedFile.name}</h3>
                    <div className="flex items-center gap-4 text-[11px] text-gray-500">
                      <span>{selectedFile.type === 'folder' ? 'Folder' : selectedFile.size}</span>
                      {selectedFile.date && (
                        <span>{new Date(selectedFile.date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
                    {selectedFile.type === 'folder' ? (
                      <div className="text-center text-gray-400">
                        <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <p className="text-[13px]">Folder</p>
                        <p className="text-[11px] mt-1">{selectedFile.children?.length || 0} items</p>
                      </div>
                    ) : galleryPreviewType === 'image' ? (
                      <img 
                        src={galleryPreviewUrl} 
                        alt={selectedFile.name} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                    ) : galleryPreviewType === 'video' ? (
                      <video 
                        controls 
                        className="max-w-full max-h-full rounded-lg shadow-lg"
                        key={galleryPreviewUrl}
                      >
                        <source src={galleryPreviewUrl} />
                        Your browser does not support the video element.
                      </video>
                    ) : galleryPreviewType === 'audio' ? (
                      <div className="text-center">
                        <div className="w-32 h-32 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500 shadow-md mb-6 mx-auto">
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                          </svg>
                        </div>
                        <audio controls className="w-full max-w-md">
                          <source src={galleryPreviewUrl} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : galleryPreviewType === 'pdf' ? (
                      <iframe 
                        src={galleryPreviewUrl} 
                        title={selectedFile.name} 
                        className="w-full h-full border-none rounded-lg shadow-lg"
                      />
                    ) : galleryPreviewType === 'text' ? (
                      <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-auto">
                        <pre className="font-mono text-[12px] leading-relaxed p-6 whitespace-pre-wrap text-[#1d1d1f]">
                          {galleryPreviewUrl}
                        </pre>
                      </div>
                    ) : galleryPreviewType === 'unsupported' ? (
                      <div className="text-center text-gray-400">
                        <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-[13px]">Preview not available</p>
                        <p className="text-[11px] mt-1">This file type cannot be previewed</p>
                      </div>
                    ) : galleryPreviewType === 'error' ? (
                      <div className="text-center text-red-400">
                        <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[13px]">Error loading preview</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-[13px] mt-4">Loading preview...</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Eye size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-[13px]">Select a file to preview</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border shadow-xl rounded-full px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-4 max-w-[calc(100%-2rem)] overflow-x-auto">
             {selectedFile.type !== 'folder' && (
               <>
                 <button onClick={() => handleAction(selectedFile, 'preview')} className="flex items-center gap-1 sm:gap-2 text-xs font-medium hover:text-blue-600 whitespace-nowrap">
                   <Eye size={14} /> 
                   <span className="hidden sm:inline">Preview</span>
                 </button>
                 <button onClick={() => handleAction(selectedFile, 'download')} className="flex items-center gap-1 sm:gap-2 text-xs font-medium hover:text-blue-600 whitespace-nowrap">
                   <Download size={14} /> 
                   <span className="hidden sm:inline">Download</span>
                 </button>
                 {isTextFile(selectedFile.name) && (
                   <button onClick={() => handleEditFile(selectedFile)} className="flex items-center gap-1 sm:gap-2 text-xs font-medium hover:text-blue-600 whitespace-nowrap">
                     <Edit3 size={14} /> 
                     <span className="hidden sm:inline">Edit</span>
                   </button>
                 )}
               </>
             )}
             <button onClick={() => { setTagsFile(selectedFile); setIsTagsOpen(true); }} className="flex items-center gap-1 sm:gap-2 text-xs font-medium hover:text-blue-600 whitespace-nowrap">
               <Tag size={14} /> 
               <span className="hidden sm:inline">Tags</span>
             </button>
             <button onClick={() => handleRename(selectedFile)} className="flex items-center gap-1 sm:gap-2 text-xs font-medium hover:text-blue-600 whitespace-nowrap">
               <Edit3 size={14} /> 
               <span className="hidden sm:inline">Rename</span>
             </button>
             <button onClick={() => handleMove(selectedFile)} className="flex items-center gap-1 sm:gap-2 text-xs font-medium hover:text-blue-600 whitespace-nowrap">
               <Move size={14} /> 
               <span className="hidden sm:inline">Move</span>
             </button>
             <button onClick={() => handleRemove(selectedFile)} className="flex items-center gap-1 sm:gap-2 text-xs font-medium text-red-500 hover:text-red-700 whitespace-nowrap">
               <Trash2 size={14} /> 
               <span className="hidden sm:inline">Remove</span>
             </button>
          </div>
        )}

        <PreviewModal 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
          fileName={previewFile?.name} 
          content={previewContent}
          onDownload={() => handleAction(previewFile, 'download')}
          onEdit={previewFile && isTextFile(previewFile.name) ? () => {
            setIsPreviewOpen(false);
            handleEditFile(previewFile);
          } : null}
          isTextFile={previewFile && isTextFile(previewFile.name)}
          onTags={previewFile ? () => {
            setIsPreviewOpen(false);
            setTagsFile(previewFile);
            setIsTagsOpen(true);
          } : null}
          onRename={previewFile ? () => {
            setIsPreviewOpen(false);
            handleRename(previewFile);
          } : null}
          onMove={previewFile ? () => {
            setIsPreviewOpen(false);
            handleMove(previewFile);
          } : null}
          onDelete={previewFile ? () => {
            setIsPreviewOpen(false);
            handleRemove(previewFile);
          } : null}
        />

        <TextEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          fileName={editorFile?.name}
          initialContent={editorContent}
          onSave={handleSaveFile}
          isNewFile={isNewFile}
        />

        <TagsManager
          isOpen={isTagsOpen}
          onClose={() => {
            setIsTagsOpen(false);
            fetchAllFileTags();
            setTagsRefreshTrigger(prev => prev + 1); // Trigger sidebar refresh
          }}
          file={tagsFile}
          location={location}
        />

        <TagManager
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          onTagsUpdated={() => {
            fetchAllFileTags();
            setTagsRefreshTrigger(prev => prev + 1); // Trigger sidebar refresh
          }}
        />

        <Trash
          isOpen={isTrashOpen}
          onClose={() => setIsTrashOpen(false)}
          location={location}
          onFilesChanged={fetchFiles}
        />

        <DatabaseViewer
          isOpen={isDatabaseOpen}
          onClose={() => setIsDatabaseOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;