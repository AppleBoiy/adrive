import { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle, Folder, File } from 'lucide-react';

const Trash = ({ isOpen, onClose, location, onFilesChanged }) => {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen, location]);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trash/${location}`);
      const data = await res.json();
      setTrashItems(data.files || []);
    } catch (error) {
      console.error('Error fetching trash:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (file) => {
    try {
      const res = await fetch(`/api/trash/${location}/${file.id}/restore`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchTrash();
        onFilesChanged?.();
      }
    } catch (error) {
      console.error('Error restoring file:', error);
    }
  };

  const handlePermanentDelete = async (file) => {
    if (!window.confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/trash/${location}/${file.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchTrash();
        onFilesChanged?.();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm(`Empty trash? All ${trashItems.length} items will be permanently deleted. This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/trash/${location}/empty`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchTrash();
        onFilesChanged?.();
      }
    } catch (error) {
      console.error('Error emptying trash:', error);
    }
  };

  const getDaysInTrash = (deletedAt) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const days = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDaysRemaining = (deletedAt) => {
    return 30 - getDaysInTrash(deletedAt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-2xl rounded-xl shadow-2xl border border-black/10 flex flex-col max-h-[80vh] overflow-hidden">
        {/* macOS-style Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/90 hover:bg-red-500 cursor-pointer" onClick={onClose} />
              <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
              <div className="w-3 h-3 rounded-full bg-green-500/90" />
            </div>
          </div>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Trash2 size={14} />
            Trash
          </h2>
        </div>

        {/* Info Banner */}
        <div className="px-4 py-3 bg-yellow-50/80 border-b border-yellow-200/50 flex items-start gap-3">
          <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-yellow-800 font-medium">
              Items in trash are automatically deleted after 30 days
            </p>
            <p className="text-[10px] text-yellow-700 mt-0.5">
              Restore items before they're permanently removed
            </p>
          </div>
        </div>

        {/* Trash Items List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : trashItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">Trash is empty</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.02] border-b border-black/5 sticky top-0">
                <tr>
                  <th className="font-medium px-4 py-2 text-gray-600">Name</th>
                  <th className="font-medium px-4 py-2 text-gray-600">Deleted</th>
                  <th className="font-medium px-4 py-2 text-gray-600">Days Left</th>
                  <th className="font-medium px-4 py-2 text-gray-600">Size</th>
                  <th className="font-medium px-4 py-2 text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashItems.map((item) => {
                  const Icon = item.is_folder ? Folder : File;
                  const daysRemaining = getDaysRemaining(item.deleted_at);
                  const isExpiringSoon = daysRemaining <= 7;

                  return (
                    <tr 
                      key={item.id}
                      className="border-b border-black/5 hover:bg-black/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(item.deleted_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${isExpiringSoon ? 'text-red-600' : 'text-gray-600'}`}>
                          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.is_folder ? '-' : item.size}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleRestore(item)}
                            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                            title="Restore"
                          >
                            <RotateCcw size={14} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item)}
                            className="p-1.5 hover:bg-red-100 rounded transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {trashItems.length > 0 && (
          <div className="px-4 py-3 bg-black/[0.02] border-t border-black/5 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'} in trash
            </p>
            <button
              onClick={handleEmptyTrash}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all"
            >
              Empty Trash
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trash;
