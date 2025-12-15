# Menstrual Cycle Tracking Application

A comprehensive health tracking application built with Supabase and modern web technologies.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Backend Setup](#backend-setup)
- [Local Development](#local-development)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)

## Overview

This application helps users track their menstrual cycles, predict future cycles, log symptoms, and receive personalized insights powered by AI.

## Features

- **Cycle Tracking**: Log daily period data with flow intensity and notes
- **Symptom Logging**: Track mood, pain levels, sleep quality, and other symptoms
- **Predictions**: Deterministic predictions for future cycle dates and fertility windows
  - Automatic prediction generation when cycle data changes
  - Scheduled nightly updates via cron jobs
  - Confidence scoring based on historical data quality
- **Reminders**: Customizable notifications for cycle events
  - Period start/end reminders
  - Fertility window notifications
  - Medication and hydration reminders
  - Flexible scheduling with configurable time windows
- **Chat Interface**: AI assistant for health-related questions
- **Data Privacy**: Full row-level security (RLS) with complete data isolation

## Backend Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for Supabase CLI utilities, optional)
- PostgreSQL 15+ (via Docker)

### Quick Start

#### 1. Clone the repository

```bash
git clone <repository-url>
cd <project-directory>
```

#### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials. For local development, the default credentials in `.env.example` should work.

#### 3. Start Supabase locally

```bash
# Navigate to the supabase directory
cd supabase

# Start the Docker containers
docker-compose up -d

# Verify all services are running
docker-compose ps
```

The services will be available at:
- **Supabase API**: http://localhost:54321
- **Studio (UI)**: http://localhost:54323
- **PostgreSQL**: localhost:54322
- **Kong (API Gateway)**: http://localhost:54320

#### 4. Apply migrations

After the database is ready, apply the migrations:

```bash
# From the project root directory
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/20240101000000_initial_schema.sql
```

Or use Supabase CLI if installed:

```bash
supabase db push
```

#### 5. Seed the database (optional)

To populate the database with test data:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
```

#### 6. Verify setup

The backend is ready when:
- All Docker containers are running
- You can access http://localhost:54323 (Studio)
- All tables appear in the Supabase UI
- RLS policies are enabled on all tables

## Local Development

### Docker Compose Services

The `supabase/docker-compose.yml` file contains all necessary services:

```yaml
- postgres:15.1.1.78    # PostgreSQL database
- kong:3.4.1            # API Gateway
- studio:20231211       # Supabase Studio Web UI
- vector:0.28.1         # Log aggregation and processing
```

### Useful Commands

```bash
cd supabase

# View logs
docker-compose logs -f postgres
docker-compose logs -f kong
docker-compose logs -f studio

# Stop services
docker-compose down

# Remove volumes and restart fresh
docker-compose down -v
docker-compose up -d

# Access PostgreSQL directly
psql postgresql://postgres:postgres@localhost:54322/postgres
```

### Environment Variables for Local Dev

When running `docker-compose up`, ensure these are set:

```bash
export POSTGRES_PASSWORD=postgres
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDMyNzgxMjIsImV4cCI6MTYzMzMxNDEyMn0.k1g8uKrIHPp3NplBKiBaBVnN9a_DkNMzwTJMcF3A3Jk
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYwMzI3ODEyMiwiZXhwIjoxNjMzMzE0MTIyfQ.Ej9LvTDwJNvJI6YxKbAf3DRxvTnuRN2tPrA97VLEWbs
```

## Database Schema

### Overview

The database consists of 8 main tables with full Row-Level Security (RLS) enforcement:

```
┌─────────────────────────────────────────────────────┐
│                  Database Tables                    │
├─────────────────────────────────────────────────────┤
│ user_accounts                                       │
│   ├── profiles                                      │
│   ├── cycle_entries                                 │
│   ├── symptom_logs                                  │
│   ├── predictions                                   │
│   ├── reminders                                     │
│   └── chat_interactions                             │
└─────────────────────────────────────────────────────┘
```

### Table Definitions

#### user_accounts
Stores user account information and authentication metadata.

```sql
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY,
  auth_id UUID NOT NULL UNIQUE,        -- Supabase Auth ID
  email TEXT NOT NULL,
  preferences JSONB,
  is_anonymized BOOLEAN DEFAULT false,
  analytics_opt_in BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP                 -- Soft delete support
);
```

**Indexes**:
- `auth_id` (unique)
- `email`
- `created_at`
- `deleted_at` (partial, non-deleted only)

#### profiles
User profile information including cycle parameters.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  cycle_length_days INT DEFAULT 28,    -- 21-35 days
  period_length_days INT DEFAULT 5,    -- 3-10 days
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  notes TEXT
);
```

#### cycle_entries
Daily menstrual cycle tracking entries.

```sql
CREATE TABLE cycle_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  entry_date DATE NOT NULL UNIQUE,
  flow_intensity TEXT,                 -- 'light', 'medium', 'heavy', 'spotting', 'none'
  notes TEXT,
  symptoms JSONB DEFAULT '[]'
);
```

**Indexes**:
- `(user_id, entry_date DESC)` (composite, optimized for recent queries)
- `entry_date` (for date range queries)

#### symptom_logs
Detailed symptom and wellness tracking.

```sql
CREATE TABLE symptom_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  log_date DATE NOT NULL UNIQUE,
  mood INT (1-10),
  pain_level INT (0-10),
  sleep_quality INT (1-10),
  other_symptoms JSONB,
  notes TEXT
);
```

#### predictions
Cycle predictions powered by historical data or AI.

```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  prediction_date DATE NOT NULL,
  cycle_start_date DATE,
  cycle_end_date DATE,
  confidence NUMERIC(3, 2),            -- 0.00 to 1.00
  source TEXT,                         -- 'historical', 'ai', 'user_input', 'hybrid'
  metadata JSONB
);
```

#### reminders
Notification configurations for cycle events.

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  reminder_type TEXT,                  -- 'period_start', 'period_end', 'fertile_window', 'custom'
  schedule_config JSONB NOT NULL,      -- Time and frequency config
  enabled BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP                 -- Soft delete support
);
```

#### chat_interactions
Log of user interactions with the AI assistant.

```sql
CREATE TABLE chat_interactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id),
  prompt TEXT NOT NULL,
  response TEXT,
  response_metadata JSONB,
  metadata JSONB
);
```

### Relationships and Constraints

All tables use:
- **Foreign Keys** with `ON DELETE CASCADE` for referential integrity
- **Unique Constraints** on (user_id, date) pairs for single entry per day
- **Check Constraints** for valid value ranges (e.g., mood 1-10, confidence 0-1)
- **Soft Deletes** for audit trails (deleted_at timestamp)
- **Cascading Deletes** to automatically remove related records

## Row-Level Security (RLS)

Every table has RLS enabled with policies enforcing user isolation:

### Policy Structure

**User Isolation Policy**:
```sql
CREATE POLICY "Users can view their own {table}"
  ON public.{table}
  FOR SELECT
  USING (user_id IN (SELECT id FROM user_accounts WHERE auth_id = auth.uid()));
```

**Service Role Bypass**:
```sql
CREATE POLICY "Service role can manage all {table}"
  ON public.{table}
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Policy Enforcement

- **Authenticated Users**: Can only access their own records
- **Service Role**: Has unrestricted access (for backend jobs, migrations)
- **Anonymous/Others**: No access by default

## API Documentation

### Authentication

All requests must include the Supabase JWT token:

```bash
curl -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  http://localhost:54321/rest/v1/user_accounts
```

### REST API Endpoints

The Supabase PostgREST API automatically generates endpoints from tables:

```
GET    /rest/v1/user_accounts           # List user accounts
GET    /rest/v1/user_accounts?id=...    # Get specific account
POST   /rest/v1/user_accounts           # Create account
PATCH  /rest/v1/user_accounts?id=...    # Update account
DELETE /rest/v1/user_accounts?id=...    # Delete account
```

Similar endpoints exist for all other tables.

### Example Queries

**Get current user's data**:
```bash
curl -H "Authorization: Bearer {token}" \
  'http://localhost:54321/rest/v1/user_accounts?select=*'
```

**Insert a cycle entry**:
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "entry_date": "2024-01-15",
    "flow_intensity": "medium",
    "notes": "Day 2"
  }' \
  http://localhost:54321/rest/v1/cycle_entries
```

## Stored Procedures

### soft_delete_user_account(user_id UUID)

Safely soft-delete a user account:

```sql
SELECT soft_delete_user_account('user-uuid-here');
```

### export_user_data(user_id UUID)

Export all user data as JSON:

```sql
SELECT export_user_data('user-uuid-here');
```

## Security

### Key Security Features

1. **Row-Level Security**: Every table enforces `auth.uid()` isolation
2. **Service Role Bypass**: Backend jobs use service role for administrative operations
3. **Soft Deletes**: Deleted records retained for audit trails
4. **Environment Isolation**: Local `.env` separated from `.env.example`
5. **Token Management**:
   - **Anon Key**: Safe for client-side, limited permissions
   - **Service Role Key**: Keep secret, use server-side only

### Best Practices

- Never commit `.env` files
- Rotate service role keys regularly
- Use environment-specific keys for production
- Enable audit logging for sensitive operations
- Validate inputs before database operations

## Testing

### Integration Tests

Create a test file to verify RLS and data isolation:

```bash
# Example test for user isolation
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
BEGIN;

-- Create test user
INSERT INTO user_accounts (auth_id, email)
VALUES ('test-uuid-1', 'test@example.com');

-- Set session to user context
SET request.jwt.claims = '{"sub":"test-uuid-1"}';

-- User should see their own record
SELECT COUNT(*) FROM user_accounts WHERE auth_id = 'test-uuid-1';

-- User should NOT see others' records
SET request.jwt.claims = '{"sub":"other-uuid"}';
SELECT COUNT(*) FROM user_accounts WHERE auth_id = 'test-uuid-1';

ROLLBACK;
EOF
```

### Seed Data Verification

After seeding, verify data availability:

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
-- Count records by table
SELECT 'user_accounts' as table_name, COUNT(*) FROM user_accounts
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'cycle_entries', COUNT(*) FROM cycle_entries
UNION ALL
SELECT 'symptom_logs', COUNT(*) FROM symptom_logs
UNION ALL
SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL
SELECT 'reminders', COUNT(*) FROM reminders
UNION ALL
SELECT 'chat_interactions', COUNT(*) FROM chat_interactions;
EOF
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker status
docker ps
docker logs supabase_postgres_local

# Ensure ports are available
lsof -i :54321  # API port
lsof -i :54322  # Database port
lsof -i :54323  # Studio port
```

### Database Connection Issues

```bash
# Test connection directly
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT 1;"

# Check migration status
psql postgresql://postgres:postgres@localhost:54322/postgres -c "\dt public.*;"
```

### RLS Policy Errors

If you get permission denied errors:
1. Verify `auth.uid()` matches your user's auth_id
2. Check policy is created on the table
3. Ensure user has appropriate INSERT/UPDATE/DELETE permissions

### Reset Everything

```bash
cd supabase
docker-compose down -v
docker-compose up -d
# Wait for postgres to initialize (30-60 seconds)
psql postgresql://postgres:postgres@localhost:54322/postgres -f migrations/20240101000000_initial_schema.sql
psql postgresql://postgres:postgres@localhost:54322/postgres -f seed.sql
```

## Predictions & Reminders

The application includes a comprehensive prediction and reminders system:

### Prediction Service

- **Deterministic Algorithm**: Calculates next period dates and fertility windows based on historical data
- **Automatic Updates**: Triggers when new cycle entries are added
- **Scheduled Jobs**: Nightly prediction generation at 2 AM UTC via pg_cron
- **Confidence Scoring**: 0.5-0.95 based on data quality and consistency

### Managing Predictions

```bash
# Run predictions for all users
make predict-run

# Test prediction algorithm
make predict-test

# Run database prediction tests
make db-test-predictions
```

### Reminders

Users can configure reminders for:
- Period start/end notifications
- Fertility window alerts
- Medication reminders
- Hydration reminders

For detailed documentation, see [docs/PREDICTION_REMINDERS.md](docs/PREDICTION_REMINDERS.md).

## Development Workflow

1. **Start services**: `cd supabase && docker-compose up -d`
2. **Make schema changes**: Edit migration files or create new ones
3. **Apply migrations**: `make db-migrate`
4. **Test via Studio**: Browse to http://localhost:54323
5. **Test via CLI**: Use curl with auth token
6. **Seed test data**: `make db-seed`
7. **Run tests**: `make db-test` and `make db-test-predictions`

## Production Deployment

For production deployment:

1. Create a Supabase project at https://supabase.com
2. Use the provided connection string and API keys
3. Run migrations against production database
4. Set appropriate environment variables in your deployment platform
5. Enable audit logging and monitoring
6. Review and adjust RLS policies for your use case

## Contributing

When making changes:

1. Create a new migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Include both schema changes and RLS policies
3. Test locally with `docker-compose` setup
4. Document any new environment variables in `.env.example`

## Support

For issues or questions:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review Supabase Studio logs at http://localhost:54323
- Check Docker logs: `docker-compose logs -f`
