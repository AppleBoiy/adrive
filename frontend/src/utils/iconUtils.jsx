import React from 'react';
import { 
  File, 
  FileText, 
  Image, 
  Music, 
  Film, 
  FileArchive, 
  FileCode, 
  FileJson,
  FileSpreadsheet,
  Folder,
  FileSearch,
  FileDigit,
  Presentation,
  FileText as FileType // fallback for PDF or other documents
} from 'lucide-react';

export const getFileIcon = (fileName, isFolder, size = 16, className = "") => {
  if (isFolder) {
    return <Folder size={size} className={className} fill="currentColor" />;
  }

  const extension = fileName.split('.').pop().toLowerCase();

  const iconMap = {
    // Images
    'png': Image,
    'jpg': Image,
    'jpeg': Image,
    'gif': Image,
    'svg': Image,
    'webp': Image,
    'ico': Image,
    
    // Audio
    'mp3': Music,
    'wav': Music,
    'ogg': Music,
    'm4a': Music,
    'flac': Music,
    
    // Video
    'mp4': Film,
    'mov': Film,
    'avi': Film,
    'mkv': Film,
    'webm': Film,
    
    // Documents
    'pdf': FileText,
    'doc': FileText,
    'docx': FileText,
    'txt': FileText,
    'md': FileText,
    'rtf': FileText,
    
    // Spreadsheets
    'xls': FileSpreadsheet,
    'xlsx': FileSpreadsheet,
    'csv': FileSpreadsheet,
    
    // Presentations
    'ppt': Presentation,
    'pptx': Presentation,
    
    // Code
    'js': FileCode,
    'jsx': FileCode,
    'ts': FileCode,
    'tsx': FileCode,
    'html': FileCode,
    'css': FileCode,
    'py': FileCode,
    'java': FileCode,
    'c': FileCode,
    'cpp': FileCode,
    'json': FileJson,
    
    // Archives
    'zip': FileArchive,
    'rar': FileArchive,
    '7z': FileArchive,
    'tar': FileArchive,
    'gz': FileArchive,

    // Database
    'sql': FileDigit,
    'db': FileDigit,
    'sqlite': FileDigit,

    // Config
    'env': FileSearch,
    'conf': FileSearch,
    'config': FileSearch,
    'yml': FileSearch,
    'yaml': FileSearch,
  };

  const IconComponent = iconMap[extension] || File;
  return <IconComponent size={size} className={className} />;
};
