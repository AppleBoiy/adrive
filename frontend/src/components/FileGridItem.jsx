import { getFileIcon } from '../utils/iconUtils';

const FileGridItem = ({ item, onSelect, selectedId, onAction }) => {
  const isFolder = item.type === 'folder';
  const isSelected = selectedId === item.fullName;

  return (
    <div
      onClick={() => onSelect(item)}
      onDoubleClick={() => isFolder ? onAction(item, 'open') : onAction(item, 'preview')}
      className={`flex flex-col items-center p-2 sm:p-4 rounded-lg cursor-default transition-colors group ${
        isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      <div className="mb-2 relative">
        {getFileIcon(item.name, isFolder, 40, isSelected ? 'text-white' : (isFolder ? 'text-blue-400' : 'text-gray-400'))}
      </div>
      <span className="text-[11px] sm:text-[13px] text-center break-all line-clamp-2 px-1">
        {item.name}
      </span>
      {!isSelected && (
        <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFolder ? 'Folder' : item.size}
        </span>
      )}
    </div>
  );
};

export default FileGridItem;
