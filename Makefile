.PHONY: help supabase-start supabase-stop supabase-reset db-migrate db-seed db-test db-logs db-psql clean

help:
	@echo "Supabase Backend Development Commands"
	@echo "======================================"
	@echo ""
	@echo "supabase-start       Start Supabase local development stack"
	@echo "supabase-stop        Stop Supabase services"
	@echo "supabase-reset       Reset Supabase (WARNING: Clears all data)"
	@echo "db-migrate           Apply database migrations"
	@echo "db-seed              Seed database with test data"
	@echo "db-test              Run RLS and integration tests"
	@echo "db-logs              View Supabase database logs"
	@echo "db-psql              Connect to PostgreSQL via psql"
	@echo "clean                Clean up Docker volumes and containers"
	@echo ""
	@echo "Usage: make [command]"

supabase-start:
	@echo "Starting Supabase local development stack..."
	cd supabase && docker-compose up -d
	@echo ""
	@echo "Waiting for services to initialize (30 seconds)..."
	@sleep 30
	@echo ""
	@echo "Services started successfully!"
	@echo "API:      http://localhost:54321"
	@echo "Studio:   http://localhost:54323"
	@echo "Database: localhost:54322"
	@echo ""
	@echo "Next steps:"
	@echo "  make db-migrate   # Apply schema migrations"
	@echo "  make db-seed      # Load test data"

supabase-stop:
	@echo "Stopping Supabase services..."
	cd supabase && docker-compose down
	@echo "Services stopped."

supabase-reset:
	@echo "WARNING: This will delete all data in the local Supabase instance!"
	@read -p "Continue? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd supabase && docker-compose down -v; \
		echo "Removed containers and volumes."; \
		make supabase-start; \
		make db-migrate; \
	else \
		echo "Cancelled."; \
	fi

db-migrate:
	@echo "Applying database migrations..."
	psql postgresql://postgres:postgres@localhost:54322/postgres \
		-f supabase/migrations/20240101000000_initial_schema.sql
	@echo "Migrations applied successfully!"

db-seed:
	@echo "Seeding database with test data..."
	psql postgresql://postgres:postgres@localhost:54322/postgres \
		-f supabase/seed.sql
	@echo "Database seeded successfully!"

db-test:
	@echo "Running RLS and integration tests..."
	@echo ""
	psql postgresql://postgres:postgres@localhost:54322/postgres \
		-f supabase/test_rls.sql
	@echo ""
	@echo "Tests completed!"

db-logs:
	cd supabase && docker-compose logs -f postgres

db-psql:
	psql postgresql://postgres:postgres@localhost:54322/postgres

clean:
	@echo "Cleaning up Docker resources..."
	cd supabase && docker-compose down -v
	@echo "Cleanup complete."
	@echo ""
	@echo "Note: Use 'make supabase-start' to restart the stack."
