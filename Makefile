.PHONY: help build up down restart logs clean init-db rebuild-db test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

clean: ## Stop services and remove volumes (WARNING: deletes all data)
	docker-compose down -v

rebuild: ## Rebuild and restart services
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

init-db: ## Initialize database (run in backend container)
	docker-compose exec backend npm run init-db

rebuild-db: ## Rebuild database from storage (run in backend container)
	docker-compose exec backend npm run rebuild-db-quick

check-db: ## Check database status
	@echo "Checking database..."
	@docker-compose exec backend ls -lh /app/data/filemanager.db 2>/dev/null || echo "❌ Database not found"
	@docker-compose exec backend node -e "const db = require('better-sqlite3')('/app/data/filemanager.db'); console.log('✅ Database tables:', db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all().map(t => t.name).join(', ')); db.close();" 2>/dev/null || echo "❌ Cannot read database"

status: ## Show service status
	docker-compose ps

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

dev-backend: ## Run backend in development mode (local)
	cd backend && npm install && node server.js

dev-frontend: ## Run frontend in development mode (local)
	cd frontend && npm install && npm run dev

install: ## Install dependencies locally
	cd backend && npm install
	cd frontend && npm install

setup: ## Initial setup (copy env files)
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		echo "Created backend/.env - please configure it"; \
	fi
	@echo "Setup complete!"

health: ## Check service health
	@echo "Checking backend health..."
	@curl -f http://localhost:5001/test || echo "Backend is not healthy"
	@echo "\nChecking frontend health..."
	@curl -f http://localhost:3000 || echo "Frontend is not healthy"

# Image Management
build-frontend: ## Build frontend image only
	docker-compose build frontend

build-backend: ## Build backend image only
	docker-compose build backend

build-no-cache: ## Build all images without cache
	docker-compose build --no-cache

tag-images: ## Tag images for registry (set REGISTRY variable)
	@if [ -z "$(REGISTRY)" ]; then \
		echo "Usage: make tag-images REGISTRY=username"; \
		exit 1; \
	fi
	docker tag adrive-frontend:latest $(REGISTRY)/adrive-frontend:latest
	docker tag adrive-backend:latest $(REGISTRY)/adrive-backend:latest
	@echo "Images tagged for $(REGISTRY)"

push-images: ## Push images to registry (set REGISTRY variable)
	@if [ -z "$(REGISTRY)" ]; then \
		echo "Usage: make push-images REGISTRY=username"; \
		exit 1; \
	fi
	docker push $(REGISTRY)/adrive-frontend:latest
	docker push $(REGISTRY)/adrive-backend:latest
	@echo "Images pushed to $(REGISTRY)"

pull-images: ## Pull images from registry (set REGISTRY variable)
	@if [ -z "$(REGISTRY)" ]; then \
		echo "Usage: make pull-images REGISTRY=username"; \
		exit 1; \
	fi
	docker pull $(REGISTRY)/adrive-frontend:latest
	docker pull $(REGISTRY)/adrive-backend:latest
	@echo "Images pulled from $(REGISTRY)"

save-images: ## Save images to tar files
	docker save adrive-frontend:latest -o adrive-frontend.tar
	docker save adrive-backend:latest -o adrive-backend.tar
	@echo "Images saved to tar files"

load-images: ## Load images from tar files
	docker load -i adrive-frontend.tar
	docker load -i adrive-backend.tar
	@echo "Images loaded from tar files"

image-size: ## Show image sizes
	@docker images | grep adrive

# GitHub Container Registry (GHCR)
ghcr-login: ## Login to GitHub Container Registry
	@echo "Login to GHCR with: docker login ghcr.io -u USERNAME"
	@echo "Use Personal Access Token (PAT) with write:packages scope"

ghcr-tag: ## Tag images for GHCR (set GITHUB_USER variable)
	@if [ -z "$(GITHUB_USER)" ]; then \
		echo "Usage: make ghcr-tag GITHUB_USER=username"; \
		exit 1; \
	fi
	docker tag adrive-frontend:latest ghcr.io/$(GITHUB_USER)/adrive-frontend:latest
	docker tag adrive-backend:latest ghcr.io/$(GITHUB_USER)/adrive-backend:latest
	@echo "Images tagged for ghcr.io/$(GITHUB_USER)"

ghcr-push: ## Push images to GHCR (set GITHUB_USER variable)
	@if [ -z "$(GITHUB_USER)" ]; then \
		echo "Usage: make ghcr-push GITHUB_USER=username"; \
		exit 1; \
	fi
	docker push ghcr.io/$(GITHUB_USER)/adrive-frontend:latest
	docker push ghcr.io/$(GITHUB_USER)/adrive-backend:latest
	@echo "Images pushed to ghcr.io/$(GITHUB_USER)"

ghcr-pull: ## Pull images from GHCR (set GITHUB_USER variable)
	@if [ -z "$(GITHUB_USER)" ]; then \
		echo "Usage: make ghcr-pull GITHUB_USER=username"; \
		exit 1; \
	fi
	docker pull ghcr.io/$(GITHUB_USER)/adrive-frontend:latest
	docker pull ghcr.io/$(GITHUB_USER)/adrive-backend:latest
	@echo "Images pulled from ghcr.io/$(GITHUB_USER)"

