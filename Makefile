.PHONY: up down dev dev-server dev-client test build

# Run full stack via Docker Compose
up:
	docker compose up --build

down:
	docker compose down

# Run locally without Docker
dev:
	$(MAKE) -j2 dev-server dev-client

dev-server:
	@echo "🛡️  Starting Go backend on :8080..."
	@cd server && source ../.env 2>/dev/null; export $$(cat ../.env 2>/dev/null | grep -v '^#' | xargs) && go run main.go

dev-client:
	@echo "🖥️  Starting Vite frontend on :5173..."
	@cd client && npm run dev

# Run Go tests
test:
	cd server && go test ./... -v

# Build production binaries
build:
	cd server && CGO_ENABLED=0 go build -o depintel .
	cd client && npm run build
