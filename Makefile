.PHONY: help start stop restart logs build clean

# Default target
help: ## Show available commands
	@echo 'ADrive - Available Commands'
	@echo '==========================='
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''
	@echo 'Documentation: docs/'
	@echo ''

# Quick Start
start: ## Start application
	@./start.sh

stop: ## Stop application
	@docker-compose down

restart: ## Restart application
	@docker-compose restart

# Development
logs: ## View logs
	@docker-compose logs -f

logs-backend: ## View backend logs only
	@docker-compose logs -f backend

logs-frontend: ## View frontend logs only
	@docker-compose logs -f frontend

shell-backend: ## Open backend shell
	@docker-compose exec backend sh

shell-frontend: ## Open frontend shell
	@docker-compose exec frontend sh

# Build
build: ## Build images
	@docker-compose build

rebuild: ## Rebuild images (no cache)
	@docker-compose build --no-cache

# Database
db-init: ## Initialize database
	@docker-compose exec backend npm run init-db

db-rebuild: ## Rebuild database from storage
	@docker-compose exec backend npm run rebuild-db-quick

db-check: ## Check database status
	@docker-compose exec backend ls -lh /app/data/filemanager.db 2>/dev/null || echo "Database not found"

# Cleanup
clean: ## Stop and remove all data (WARNING: deletes everything)
	@echo "WARNING: This will delete all data!"
	@read -p "Continue? [y/N] " -n 1 -r; echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "Cleaned up successfully"; \
	fi

# Status
status: ## Show service status
	@docker-compose ps

health: ## Check service health
	@echo "Checking services..."
	@curl -sf http://localhost:5001/test > /dev/null && echo "✓ Backend healthy" || echo "✗ Backend unhealthy"
	@curl -sf http://localhost:3000 > /dev/null && echo "✓ Frontend healthy" || echo "✗ Frontend unhealthy"

# Container Registry
ghcr-login: ## Login to GitHub Container Registry
	@echo "Login with: docker login ghcr.io -u YOUR_USERNAME"

ghcr-tag: ## Tag images for GHCR (usage: make ghcr-tag USER=username)
	@if [ -z "$(USER)" ]; then echo "Usage: make ghcr-tag USER=username"; exit 1; fi
	@docker tag adrive-frontend:latest ghcr.io/$(USER)/adrive-frontend:latest
	@docker tag adrive-backend:latest ghcr.io/$(USER)/adrive-backend:latest
	@echo "Tagged for ghcr.io/$(USER)"

ghcr-push: ## Push images to GHCR (usage: make ghcr-push USER=username)
	@if [ -z "$(USER)" ]; then echo "Usage: make ghcr-push USER=username"; exit 1; fi
	@docker push ghcr.io/$(USER)/adrive-frontend:latest
	@docker push ghcr.io/$(USER)/adrive-backend:latest
	@echo "Pushed to ghcr.io/$(USER)"
