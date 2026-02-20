import { useState, useEffect } from 'react';
import { X, Tag as TagIcon, Check } from 'lucide-react';

// macOS-style tag colors
const TAG_COLORS = [
  { name: 'Red', value: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
  { name: 'Green', value: 'green', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
  { name: 'Gray', value: 'gray', bg: 'bg-gray-500', hover: 'hover:bg-gray-600' },
];

const TagsManager = ({ isOpen, onClose, file, location }) => {
  const [allTags, setAllTags] = useState([]);
  const [fileTags, setFileTags] = useState([]);

  useEffect(() => {
    if (isOpen && file) {
      fetchAllTags();
      fetchFileTags();
    }
  }, [isOpen, file]);

  const fetchAllTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setAllTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchFileTags = async () => {
    if (!file?.id) return;
    try {
      const res = await fetch(`/api/files/${location}/${file.id}/tags`);
      const data = await res.json();
      setFileTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching file tags:', error);
    }
  };

  const handleToggleTag = async (tag) => {
    if (!file?.id) return;

    const isTagged = fileTags.some(t => t.id === tag.id);

    try {
      if (isTagged) {
        const res = await fetch(`/api/files/${location}/${file.id}/tags/${tag.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json();
          setFileTags(data.tags || []);
        }
      } else {
        const res = await fetch(`/api/files/${location}/${file.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: tag.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setFileTags(data.tags || []);
        }
      }
    } catch (error) {
      console.error('Error toggling tag:', error);
    }
  };

  const getColorClasses = (color) => {
    const colorObj = TAG_COLORS.find(c => c.value === color) || TAG_COLORS[4];
    return colorObj;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-[280px] bg-white/80 backdrop-blur-2xl rounded-xl shadow-2xl border border-black/10 flex flex-col max-h-[400px] overflow-hidden">
        {/* macOS-style Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/90 hover:bg-red-500 cursor-pointer" onClick={onClose} />
              <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
              <div className="w-3 h-3 rounded-full bg-green-500/90" />
            </div>
          </div>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700">
            Tags
          </h2>
        </div>

        {/* File name bar */}
        {file && (
          <div className="px-4 py-2 bg-black/[0.02] border-b border-black/5">
            <p className="text-xs text-gray-600 truncate text-center">{file.name}</p>
          </div>
        )}

        {/* macOS-style Tags List */}
        <div className="flex-1 overflow-auto px-3 py-3">
          {allTags.length === 0 ? (
            <div className="text-center py-8">
              <TagIcon size={20} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-xs">No tags</p>
            </div>
          ) : (
            <div className="space-y-1">
              {allTags.map((tag) => {
                const isTagged = fileTags.some(t => t.id === tag.id);
                const colorClasses = getColorClasses(tag.color);
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-xs ${
                      isTagged 
                        ? 'bg-blue-500/10 text-gray-900' 
                        : 'hover:bg-black/[0.03] text-gray-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${colorClasses.bg}`} />
                    <span className="flex-1 text-left font-medium">{tag.name}</span>
                    {isTagged && (
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagsManager;
