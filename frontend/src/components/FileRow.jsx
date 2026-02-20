import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { getFileIcon } from '../utils/iconUtils';

const FileRow = ({ item, level = 0, onSelect, selectedId, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = item.type === 'folder';
  const isSelected = selectedId === item.fullName;

  return (
    <>
      <tr
        onClick={() => onSelect(item)}
        onDoubleClick={() => isFolder ? setIsOpen(!isOpen) : onAction(item, 'preview')}
        className={`border-b border-gray-50 cursor-default ${isSelected ? 'bg-[#0058d8] text-white' : 'hover:bg-[#f0f7ff]'}`}
      >
        <td className="px-2 sm:px-4 py-0.5 flex items-center gap-1 truncate" style={{ paddingLeft: `${level * 16 + 8}px` }}>
          <span className="w-4 flex items-center justify-center">
            {isFolder && (
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </span>
          {getFileIcon(item.name, isFolder, 16, isSelected ? 'text-white' : (isFolder ? 'text-blue-400' : 'text-gray-400'))}
          <span className="truncate ml-1">{item.name}</span>
        </td>
        <td className={`px-2 sm:px-4 py-0.5 border-r border-gray-100 ${isSelected ? 'text-white' : 'text-gray-400'} text-xs sm:text-[13px]`}>
          {new Date(item.date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </td>
        <td className={`px-2 sm:px-4 py-0.5 text-right pr-4 sm:pr-8 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
          {isFolder ? '--' : item.size}
        </td>
      </tr>

      {isFolder && isOpen && item.children.map((child) => (
        <FileRow
          key={child.fullName}
          item={child}
          level={level + 1}
          onSelect={onSelect}
          selectedId={selectedId}
          onAction={onAction}
        />
      ))}
    </>
  );
};

export default FileRow;