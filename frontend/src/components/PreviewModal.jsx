import { X, ExternalLink, Share, Edit3, Edit2, Move, Trash2, Tag } from 'lucide-react';

const PreviewModal = ({ isOpen, onClose, fileName, content, onDownload, onEdit, isTextFile, onRename, onMove, onDelete, onTags }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-[90vh] sm:h-5/6 bg-[#f5f5f7]/90 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/20 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* macOS Style Title Bar */}
        <div className="h-10 flex items-center justify-between px-2 sm:px-4 border-b border-black/10 select-none">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button 
              onClick={onClose}
              className="p-1 hover:bg-black/5 rounded-md transition-colors flex-shrink-0"
            >
              <X size={16} className="text-[#4d4d4d]" />
            </button>
            <span className="text-[11px] sm:text-[13px] font-medium text-[#4d4d4d] truncate">
              {fileName}
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap">
            {isTextFile && onEdit && (
              <>
                <button 
                  onClick={onEdit}
                  className="p-1.5 hover:bg-black/5 rounded-md transition-colors flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-blue-600"
                  title="Edit"
                >
                  <Edit3 size={14} />
                  <span className="hidden md:inline">Edit</span>
                </button>
                <div className="w-[1px] h-4 bg-black/10 hidden sm:block" />
              </>
            )}
            {onTags && (
              <button 
                onClick={onTags}
                className="p-1.5 hover:bg-black/5 rounded-md transition-colors flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-[#4d4d4d]"
                title="Tags"
              >
                <Tag size={14} />
                <span className="hidden md:inline">Tags</span>
              </button>
            )}
            {onRename && (
              <button 
                onClick={onRename}
                className="p-1.5 hover:bg-black/5 rounded-md transition-colors flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-[#4d4d4d]"
                title="Rename"
              >
                <Edit2 size={14} />
                <span className="hidden md:inline">Rename</span>
              </button>
            )}
            {onMove && (
              <button 
                onClick={onMove}
                className="p-1.5 hover:bg-black/5 rounded-md transition-colors flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-[#4d4d4d]"
                title="Move"
              >
                <Move size={14} />
                <span className="hidden md:inline">Move</span>
              </button>
            )}
            {onDelete && (
              <button 
                onClick={onDelete}
                className="p-1.5 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-red-500 hover:text-red-700"
                title="Delete"
              >
                <Trash2 size={14} />
                <span className="hidden md:inline">Delete</span>
              </button>
            )}
            <div className="w-[1px] h-4 bg-black/10 hidden sm:block" />
            <button 
              onClick={onDownload}
              className="p-1.5 hover:bg-black/5 rounded-md transition-colors flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-[#4d4d4d]"
              title="Download"
            >
              <ExternalLink size={14} />
              <span className="hidden md:inline">Download</span>
            </button>
            <button className="p-1.5 hover:bg-black/5 rounded-md transition-colors hidden lg:block" title="Share">
              <Share size={14} className="text-[#4d4d4d]" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-white/50">
          {/\.(png|jpe?g|gif|svg|webp)$/i.test(fileName) ? (
            <div className="flex items-center justify-center h-full">
              <img src={content} alt={fileName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : /\.(pdf)$/i.test(fileName) ? (
            <iframe src={content} title={fileName} className="w-full h-full border-none" />
          ) : /\.(mp3|wav|ogg|m4a)$/i.test(fileName) ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-24 h-24 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
              </div>
              <audio controls className="w-full max-w-md">
                <source src={content} />
                Your browser does not support the audio element.
              </audio>
              <p className="text-[13px] text-[#4d4d4d] font-medium">{fileName}</p>
            </div>
          ) : /\.(mp4|webm|ogg|mov)$/i.test(fileName) ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <video controls className="max-w-full max-h-[80%] rounded-lg shadow-md">
                <source src={content} />
                Your browser does not support the video element.
              </video>
              <p className="text-[13px] text-[#4d4d4d] font-medium">{fileName}</p>
            </div>
          ) : (
            <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[#1d1d1f]">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
