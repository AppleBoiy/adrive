import { useRef, useState, useEffect } from 'react';
import { HardDrive, Cloud, Upload, LogOut, X, Database, Tag, Settings, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

const Sidebar = ({ currentLocation, setLocation, onUpload, targetPath, user, onLogout, isOpen, onClose, onOpenDatabase, onTagFilter, selectedTag, onOpenTagManager, onOpenTrash, refreshTrigger, storageStatus = { vm: true, gcs: true } }) => {
  const fileInputRef = useRef(null);
  const [tags, setTags] = useState([]);
  const [isLocationsExpanded, setIsLocationsExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(true);
  
  const menuItems = [
    { id: 'vm', name: 'VM Disk', icon: <HardDrive size={16} />, enabled: storageStatus.vm },
    { id: 'bucket', name: 'GCS Bucket', icon: <Cloud size={16} />, enabled: storageStatus.gcs },
  ].filter(item => item.enabled);

  useEffect(() => {
    fetchTags();
  }, [currentLocation, refreshTrigger]);

  const fetchTags = async () => {
    try {
      // Try to fetch recently used tags first
      let res = await fetch('/api/tags/recent?limit=5');
      let data = await res.json();
      
      // If no recent tags, fall back to all tags (limited to 5)
      if (!data.tags || data.tags.length === 0) {
        res = await fetch('/api/tags');
        data = await res.json();
        setTags((data.tags || []).slice(0, 5));
      } else {
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Fallback to all tags on error
      try {
        const res = await fetch('/api/tags');
        const data = await res.json();
        setTags((data.tags || []).slice(0, 5));
      } catch (fallbackError) {
        console.error('Error fetching fallback tags:', fallbackError);
      }
    }
  };

  const getColorClasses = (color) => {
    const colorMap = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      gray: 'bg-gray-500',
    };
    return colorMap[color] || 'bg-gray-500';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0 && onUpload) {
      onUpload(files);
    }
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  return (
    <div className={`
      w-56 bg-gray-100 border-r border-gray-300 flex flex-col p-3 h-full
      fixed lg:relative z-50 lg:z-auto
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <button
        onClick={onClose}
        className="lg:hidden absolute top-3 right-3 p-1 text-gray-600 hover:bg-gray-200 rounded z-10"
      >
        <X size={18} />
      </button>
      
      <button
        onClick={handleUploadClick}
        className="flex flex-col items-center justify-center gap-1 bg-white border border-gray-300 rounded-lg py-3 px-4 shadow-sm hover:shadow-md transition-shadow mb-6 text-sm font-medium text-gray-700"
      >
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-blue-500" />
          <span>Upload</span>
        </div>
        {targetPath && (
          <span className="text-[10px] text-gray-400 truncate w-full px-2">
            to: {targetPath}
          </span>
        )}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      <nav>
        <button
          onClick={() => setIsLocationsExpanded(!isLocationsExpanded)}
          className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
        >
          <span>Locations</span>
          {isLocationsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {isLocationsExpanded && (
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setLocation(item.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                  currentLocation === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className={currentLocation === item.id ? 'text-white' : 'text-blue-500'}>
                  {item.icon}
                </span>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Tags Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <button
            onClick={() => setIsTagsExpanded(!isTagsExpanded)}
            className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            <span>Tags</span>
            {isTagsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {onOpenTagManager && (
            <button
              onClick={onOpenTagManager}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Manage Tags"
            >
              <Settings size={12} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {isTagsExpanded && (
          <div className="space-y-0.5">
            <button
              onClick={() => onTagFilter && onTagFilter(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                !selectedTag
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Tag size={14} className={!selectedTag ? 'text-white' : 'text-blue-500'} />
              <span>All Files</span>
            </button>
            
            {tags.length === 0 ? (
              <div className="px-2 py-3 text-center">
                <p className="text-[11px] text-gray-400 italic">No recent tags</p>
                {onOpenTagManager && (
                  <button
                    onClick={onOpenTagManager}
                    className="mt-2 text-[11px] text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Create tags
                  </button>
                )}
              </div>
            ) : (
              tags.map((tag) => {
                return (
                  <button
                    key={tag.id}
                    onClick={() => onTagFilter && onTagFilter(tag)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                      selectedTag?.id === tag.id
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      selectedTag?.id === tag.id ? 'bg-white' : getColorClasses(tag.color)
                    }`} />
                    <span className="truncate">{tag.name}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Trash Section */}
      {onOpenTrash && (
        <div className="mt-6">
          <div className="px-2 mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Trash
            </span>
          </div>
          <button
            onClick={onOpenTrash}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Trash2 size={14} className="text-gray-500" />
            <span>Trash</span>
          </button>
        </div>
      )}

      {/* Developer Tools */}
      {onOpenDatabase && (
        <div className="mt-6">
          <button
            onClick={() => setIsDeveloperExpanded(!isDeveloperExpanded)}
            className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            <span>Developer</span>
            {isDeveloperExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {isDeveloperExpanded && (
            <button
              onClick={onOpenDatabase}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Database size={14} className="text-purple-500" />
              <span>Database Viewer</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-gray-200 px-2 flex flex-col gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {user.photos?.[0]?.value ? (
                <img src={user.photos[0].value} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 truncate">
              <p className="text-[12px] font-bold text-gray-700 truncate">{user.displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.emails?.[0]?.value}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;