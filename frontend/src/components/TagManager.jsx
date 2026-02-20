import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, Search } from 'lucide-react';

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

const TagManager = ({ isOpen, onClose, onTagsUpdated }) => {
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('blue');

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (res.ok) {
        setNewTagName('');
        setNewTagColor('blue');
        setIsCreating(false);
        fetchTags();
        onTagsUpdated?.();
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleUpdateTag = async (id, name, color) => {
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });

      if (res.ok) {
        setEditingId(null);
        fetchTags();
        onTagsUpdated?.();
      }
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm('Delete this tag? It will be removed from all files.')) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchTags();
        onTagsUpdated?.();
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const getColorClasses = (color) => {
    return TAG_COLORS.find(c => c.value === color) || TAG_COLORS[4];
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-xl shadow-2xl border border-black/10 flex flex-col max-h-[600px] overflow-hidden">
        {/* macOS-style Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/90 hover:bg-red-500 cursor-pointer" onClick={onClose} />
              <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
              <div className="w-3 h-3 rounded-full bg-green-500/90" />
            </div>
          </div>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700">
            Manage Tags
          </h2>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-black/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-black/[0.03] border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Tags List */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {filteredTags.length === 0 && !isCreating ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-xs">
                {searchQuery ? 'No tags found' : 'No tags yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map((tag) => {
                const colorClasses = getColorClasses(tag.color);
                const isEditing = editingId === tag.id;

                return (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[0.03] transition-all"
                  >
                    {isEditing ? (
                      <>
                        <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.bg} flex-shrink-0`} />
                        <input
                          type="text"
                          defaultValue={tag.name}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateTag(tag.id, e.target.value, tag.color);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-white border border-blue-500 rounded focus:outline-none"
                        />
                        <div className="flex gap-1">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => handleUpdateTag(tag.id, tag.name, color.value)}
                              className={`w-4 h-4 rounded-full ${color.bg} ${color.hover} transition-all ${
                                tag.color === color.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                              }`}
                              title={color.name}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <X size={14} className="text-gray-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.bg} flex-shrink-0`} />
                        <span className="flex-1 text-xs font-medium text-gray-700">{tag.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingId(tag.id)}
                            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={12} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1.5 hover:bg-red-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} className="text-red-600" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create New Tag Section */}
        <div className="px-4 py-3 border-t border-black/5 bg-black/[0.02]">
          {isCreating ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewTagName('');
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 text-xs bg-white border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 flex-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewTagColor(color.value)}
                      className={`w-6 h-6 rounded-full ${color.bg} ${color.hover} transition-all ${
                        newTagColor === color.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName('');
                  }}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all"
            >
              <Plus size={14} />
              New Tag
            </button>
          )}
        </div>

        {/* Footer Info */}
        {!isCreating && tags.length > 0 && (
          <div className="px-4 py-2 bg-black/[0.02] border-t border-black/5">
            <p className="text-[10px] text-gray-500 text-center">
              {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
              {searchQuery && ` (filtered from ${tags.length})`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;
