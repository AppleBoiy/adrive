FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY *.js ./

# Create necessary directories
RUN mkdir -p vm_storage data

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy service-account.json if it exists (optional for GCS)
# Pattern matches service-account.json or .service-account.placeholder
COPY --chown=nodejs:nodejs .service-account.placeholder service-account.json* ./
RUN if [ -f service-account.json ]; then \
      echo "✓ GCS: service-account.json found"; \
    else \
      echo "ℹ GCS: service-account.json not found (VM storage only)"; \
    fi && \
    rm -f .service-account.placeholder

# Set ownership of all files
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/test', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
