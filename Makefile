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
