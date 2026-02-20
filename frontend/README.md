# ADrive Frontend

React + Vite frontend for ADrive file management system.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Features

- **Multiple View Modes**: List, Grid, and Gallery views
- **File Operations**: Upload, download, preview, edit, rename, move, delete
- **Tag Management**: Create and apply colored tags to files
- **Trash Management**: View and restore deleted files
- **Responsive Design**: Mobile-friendly interface
- **File Preview**: Support for images, videos, audio, PDFs, and text files
- **Text Editor**: Built-in editor for text files
- **Database Viewer**: Development tool for inspecting database (DEV_MODE only)

## Components

- **App.jsx** - Main application component
- **Sidebar.jsx** - Navigation and storage selection
- **FileRow.jsx** - List view file item
- **FileGridItem.jsx** - Grid view file item
- **PreviewModal.jsx** - File preview modal
- **TextEditor.jsx** - Text file editor
- **TagManager.jsx** - Tag creation and management
- **TagsManager.jsx** - Apply tags to files
- **Trash.jsx** - Trash management modal
- **DatabaseViewer.jsx** - Database inspection tool
- **Login.jsx** - Authentication (currently disabled)

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Development

The frontend connects to the backend API at `http://localhost:5001` by default. Update the API URL in the code if your backend runs on a different port.

## Build

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be served by Nginx or any static file server.
