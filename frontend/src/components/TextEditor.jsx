import { X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

const TextEditor = ({ isOpen, onClose, fileName, initialContent, onSave, isNewFile }) => {
  const [content, setContent] = useState(initialContent || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent || '');
  }, [initialContent, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Editor Container */}
      <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 bg-[#f6f6f6]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0"
              disabled={isSaving}
            >
              <X size={18} className="text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-gray-800 truncate block">
                {isNewFile ? 'New Text File' : `Editing: ${fileName}`}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-[13px] font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-[13px] leading-relaxed resize-none focus:outline-none border-none"
            placeholder="Start typing..."
            spellCheck={false}
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="h-8 px-4 flex items-center justify-between border-t border-gray-200 bg-[#f6f6f6] text-[11px] text-gray-500">
          <span>{content.length} characters</span>
          <span>{content.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
