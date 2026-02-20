# Contributing to ADrive

Thank you for your interest in contributing to ADrive! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Docker version, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check if the feature has been suggested in Issues
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant examples or mockups

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/adrive.git
   cd adrive
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the coding standards below
   - Write clear commit messages
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   # Test backend
   cd backend
   npm install
   npm run init-db
   node server.js
   
   # Test frontend
   cd frontend
   npm install
   npm run dev
   
   # Test Docker build
   make build
   make up
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Link related issues

## Coding Standards

### JavaScript/Node.js

- Use ES6+ features
- Use `const` and `let`, avoid `var`
- Use arrow functions where appropriate
- Use async/await for asynchronous code
- Add JSDoc comments for functions
- Handle errors properly
- Use meaningful variable names

Example:
```javascript
/**
 * Create a new file record in database
 * @param {Object} fileData - File metadata
 * @returns {string} File ID
 */
function createFileRecord(fileData) {
  // Implementation
}
```

### React/Frontend

- Use functional components with hooks
- Keep components small and focused
- Use meaningful component and prop names
- Add PropTypes or TypeScript types
- Extract reusable logic into custom hooks
- Use Tailwind CSS for styling

Example:
```jsx
const FileItem = ({ file, onSelect, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Component content */}
    </div>
  );
};
```

### Git Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add file preview modal
fix: resolve folder deletion bug
docs: update API documentation
refactor: simplify file sync logic
```

## Project Structure

```
adrive/
├── backend/
│   ├── database.js           # Database operations
│   ├── file-operations.js    # File helpers
│   ├── file-sync.js          # Storage sync
│   ├── server.js             # Express server
│   └── init-db.js            # DB initialization
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── utils/            # Utilities
│   │   ├── App.jsx           # Main component
│   │   └── main.jsx          # Entry point
│   └── public/               # Static assets
├── docs/                     # Documentation
└── docker-compose.yml        # Docker orchestration
```

## Development Workflow

1. **Setup development environment**
   ```bash
   make install
   make setup
   ```

2. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   make dev-backend
   
   # Terminal 2 - Frontend
   make dev-frontend
   ```

3. **Make changes and test**
   - Backend: http://localhost:5001
   - Frontend: http://localhost:5173 (Vite dev server)

4. **Test with Docker**
   ```bash
   make build
   make up
   make logs
   ```

## Testing

### Manual Testing

- Test all file operations (upload, download, delete, rename, move)
- Test folder operations
- Test tag management
- Test trash functionality
- Test different file types
- Test responsive design on mobile
- Test both VM and GCS storage

### Automated Testing

(To be implemented)

## Documentation

When adding features:

1. Update relevant README files
2. Add JSDoc comments to functions
3. Update API documentation if adding endpoints
4. Add examples where helpful
5. Update DEPLOYMENT.md if affecting deployment

## Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
