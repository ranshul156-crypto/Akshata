# Backend Setup Guide - Supabase

This guide provides comprehensive instructions for setting up and working with the Supabase backend for the menstrual cycle tracking application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Detailed Setup](#detailed-setup)
3. [Architecture Overview](#architecture-overview)
4. [Working with Migrations](#working-with-migrations)
5. [Authentication & RLS](#authentication--rls)
6. [Testing](#testing)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL client (`psql`) - can be installed via `sudo apt-get install postgresql-client`
- (Optional) Node.js 18+ for npm scripts

### 5-Minute Setup

```bash
# 1. Clone and navigate
cd /home/engine/project

# 2. Start Supabase
cd supabase
docker-compose up -d
cd ..

# 3. Wait 30 seconds for initialization
sleep 30

# 4. Apply migrations
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20240101000000_initial_schema.sql

# 5. Seed test data
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/seed.sql

# 6. Verify setup
make db-test
```

Access the UI at: http://localhost:54323

## Detailed Setup

### Step 1: Start Services

```bash
cd supabase
docker-compose up -d
```

Monitor startup progress:
```bash
docker-compose logs -f
```

Wait for messages like:
```
postgres | "database system is ready to accept connections"
kong | Application started successfully
studio | Ready in 1.2s
```

### Step 2: Verify Connectivity

Test database connection:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT 1 as connected;"
```

Expected output:
```
 connected
-----------
         1
```

### Step 3: Create Schema

Apply the main migration:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20240101000000_initial_schema.sql
```

Verify tables created:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -c "\dt public.*"
```

Should list these tables:
- user_accounts
- profiles
- cycle_entries
- symptom_logs
- predictions
- reminders
- chat_interactions

### Step 4: Populate Test Data

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
```

Verify data:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
SELECT 'user_accounts' as table_name, COUNT(*) FROM user_accounts
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'cycle_entries', COUNT(*) FROM cycle_entries
UNION ALL
SELECT 'symptom_logs', COUNT(*) FROM symptom_logs
UNION ALL
SELECT 'reminders', COUNT(*) FROM reminders;
EOF
```

### Step 5: Run Tests

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/test_rls.sql
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/integration_tests.sql
```

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend Application                   │
│                  (React/Next.js)                         │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │ Supabase Client Library      │
         │ (@supabase/supabase-js)      │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │  Supabase API Gateway (Kong) │
         │  Port: 54321 (API)            │
         │  Port: 54320 (HTTPS)          │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │    Auth Service (Supabase)    │
         │    REST API Layer             │
         │    Realtime (WebSocket)       │
         │    Storage Layer              │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │   PostgreSQL Database         │
         │   Port: 54322                 │
         │   (RLS Enabled)               │
         └───────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Studio Web Interface                   │
│                  (Dashboard)                             │
│                  Port: 54323                             │
└─────────────────────────────────────────────────────────┘
```

### Database Schema Relationships

```
user_accounts (root entity)
    │
    ├─> profiles (1-to-1)
    │
    ├─> cycle_entries (1-to-many)
    │
    ├─> symptom_logs (1-to-many)
    │
    ├─> predictions (1-to-many)
    │
    ├─> reminders (1-to-many)
    │
    └─> chat_interactions (1-to-many)

All relationships use:
- Foreign Key (ON DELETE CASCADE)
- Row-Level Security (auth.uid() isolation)
- Soft delete support via deleted_at
```

### Data Flow

```
1. User Authentication
   └─> Supabase Auth creates JWT token
   └─> Token contains user's auth.uid()

2. API Request
   └─> Client sends request with Authorization header
   └─> Kong API Gateway validates token
   └─> PostgREST translates REST to SQL

3. Database Query
   └─> RLS policies check auth.uid()
   └─> Only user's own records are returned/modified
   └─> Service role can bypass RLS for jobs/migrations

4. Response
   └─> Data returned to client
   └─> Realtime updates via PostgreSQL NOTIFY
```

## Working with Migrations

### Creating New Migrations

Create a new migration file following the naming convention:

```bash
# Format: YYYYMMDDHHMMSS_description.sql
touch supabase/migrations/20240115093000_add_health_metrics_table.sql
```

Migration template:

```sql
-- Description of changes
-- Purpose: Explain why this migration exists

-- Drop existing objects if needed (use CASCADE cautiously)
-- DROP TABLE IF EXISTS table_name CASCADE;

-- Create new tables
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_new_table_user_id ON public.new_table(user_id);

-- Create policies
CREATE POLICY "Users can view their own records"
  ON public.new_table
  FOR SELECT
  USING (user_id IN (SELECT id FROM user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all"
  ON public.new_table
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create trigger if timestamps are needed
CREATE TRIGGER update_new_table_timestamp
BEFORE UPDATE ON public.new_table
FOR EACH ROW
EXECUTE FUNCTION update_new_table_updated_at();
```

### Applying Migrations

**First time:**
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20240101000000_initial_schema.sql
```

**New migrations after initial setup:**
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20240115093000_add_health_metrics_table.sql
```

**Apply all migrations in order:**
```bash
for file in supabase/migrations/*.sql; do
  echo "Applying $file..."
  psql postgresql://postgres:postgres@localhost:54322/postgres -f "$file"
done
```

### Testing Migrations

Before applying to production:

```bash
# On a test database
psql postgresql://postgres:postgres@localhost:54322/test_db \
  -f supabase/migrations/new_migration.sql

# Verify schema
psql postgresql://postgres:postgres@localhost:54322/test_db -c "\dt"

# Check for errors
echo $?  # Should be 0 for success
```

## Authentication & RLS

### Understanding Auth in Supabase

```
1. User Signs Up/Logs In
   └─> Supabase Auth creates account
   └─> Returns auth.uid() (UUID) in JWT

2. JWT Token Structure
   {
     "iss": "supabase",
     "sub": "00000000-0000-0000-0000-000000000001",  // auth.uid()
     "role": "authenticated"  // or "anon"
   }

3. Client Storage
   └─> Token stored in localStorage/sessionStorage
   └─> Sent in every request: Authorization: Bearer {token}

4. Database
   └─> Token validated by Kong
   └─> auth.uid() made available in RLS context
   └─> auth.role() shows 'authenticated' or 'service_role'
```

### RLS Policy Pattern

All tables use this standard pattern:

```sql
-- User can see their own records
CREATE POLICY "Users can view their own {table}"
  ON public.{table}
  FOR SELECT
  USING (user_id IN (SELECT id FROM user_accounts WHERE auth_id = auth.uid()));

-- User can modify their own records
CREATE POLICY "Users can update their own {table}"
  ON public.{table}
  FOR UPDATE
  USING (user_id IN (SELECT id FROM user_accounts WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM user_accounts WHERE auth_id = auth.uid()));

-- Service role (backend jobs) can do anything
CREATE POLICY "Service role can manage all {table}"
  ON public.{table}
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Testing RLS Locally

```bash
# View available policies
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename IN ('user_accounts', 'cycle_entries');
EOF

# Test policy isolation (requires Supabase CLI or PostgREST setup)
# Use Studio UI: http://localhost:54323/editor
# Or use API with proper JWT tokens
```

### Service Role for Backend Jobs

The service role key bypasses RLS:

```bash
# Using service role to manage user data
curl -X GET \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  "http://localhost:54321/rest/v1/user_accounts"
```

**Important**: Never expose service role key in frontend code!

## Testing

### Run All Tests

```bash
# Using Makefile
make db-test

# Or manually
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/test_rls.sql
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/integration_tests.sql
```

### Test Coverage

Tests verify:

1. **RLS Policies**
   - User isolation
   - Service role bypass
   - Policy enforcement

2. **Constraints**
   - Unique constraints
   - Check constraints (e.g., mood 1-10)
   - Foreign key relationships

3. **Cascading Deletes**
   - Deleting user cascades to all child records
   - No orphaned data

4. **Triggers**
   - created_at set automatically
   - updated_at maintained on every update
   - No stale timestamps

5. **Data Types**
   - JSONB columns properly stored
   - Numeric precision
   - Date handling

### Integration Test Example

```sql
-- Test user isolation
BEGIN;
  INSERT INTO user_accounts (auth_id, email) VALUES ('user-1', 'test@example.com');
  INSERT INTO cycle_entries (user_id, entry_date, flow_intensity)
  SELECT id, CURRENT_DATE, 'medium' FROM user_accounts WHERE email = 'test@example.com';
  
  -- Verify user can see their own data
  SELECT COUNT(*) FROM cycle_entries WHERE user_id = (
    SELECT id FROM user_accounts WHERE auth_id = 'user-1'
  );
  
ROLLBACK;
```

## Common Tasks

### Add a New Column to Existing Table

```sql
-- Create migration file: 20240115_add_health_notes.sql

ALTER TABLE public.cycle_entries
ADD COLUMN health_notes TEXT;

-- Add index if querying frequently
CREATE INDEX idx_cycle_entries_health_notes 
ON public.cycle_entries USING gin(health_notes);

-- Update related triggers if needed
-- (timestamps are auto-maintained)
```

### Create a New Stored Procedure

```sql
CREATE OR REPLACE FUNCTION get_user_cycle_stats(user_id UUID)
RETURNS TABLE (
  total_entries INT,
  avg_cycle_length INT,
  last_entry_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT,
    ROUND(AVG((next_entry_date - entry_date)::INT))::INT,
    MAX(entry_date)
  FROM public.cycle_entries
  WHERE user_id = $1
  GROUP BY user_id;
END;
$$ LANGUAGE plpgsql;
```

### Bulk Import Data

```sql
-- Create temporary table
CREATE TEMP TABLE bulk_import (
  email TEXT,
  entry_date DATE,
  flow_intensity TEXT
);

-- Load data
COPY bulk_import FROM '/path/to/data.csv' CSV HEADER;

-- Insert linked to existing users
INSERT INTO cycle_entries (user_id, entry_date, flow_intensity)
SELECT u.id, bi.entry_date, bi.flow_intensity
FROM bulk_import bi
JOIN user_accounts u ON u.email = bi.email;

-- Cleanup
DROP TABLE bulk_import;
```

### Export User Data

```bash
# Using the stored procedure
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
SELECT export_user_data('user-uuid-here')::text;
EOF

# Save to file
psql postgresql://postgres:postgres@localhost:54322/postgres -t -c \
  "SELECT export_user_data('user-uuid-here')::text;" > user_data.json
```

### Monitor Database Performance

```bash
# Check slow queries
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 10;
EOF

# Check index usage
psql postgresql://postgres:postgres@localhost:54322/postgres << EOF
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
EOF
```

## Troubleshooting

### Services Won't Start

**Problem**: Docker containers fail to start

**Solution**:
```bash
# Check Docker status
docker ps

# Check logs
cd supabase && docker-compose logs

# Check if ports are in use
lsof -i :54321  # API port
lsof -i :54322  # Database port
lsof -i :54323  # Studio port

# If ports are in use, kill those processes or use different ports
# Edit docker-compose.yml and change port mappings

# Restart
docker-compose restart
```

### Can't Connect to Database

**Problem**: `psql: could not connect to server`

**Solution**:
```bash
# Verify containers are running
docker-compose ps

# Check if postgres is healthy
docker logs supabase_db_local

# Ensure postgres has initialized (wait 60 seconds)
sleep 60

# Try connecting with verbose output
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1;" -v ON_ERROR_STOP=on
```

### Migration Failed

**Problem**: `ERROR: permission denied` or syntax errors

**Solution**:
```bash
# Check which user is running psql
whoami

# Ensure database exists
psql -h localhost -p 54322 -U postgres -l

# Run migration with detailed output
psql -h localhost -p 54322 -U postgres -d postgres -f migration.sql -v ON_ERROR_STOP=on

# If specific table has issues
psql -h localhost -p 54322 -U postgres -c "\d table_name;"
```

### RLS Policies Not Working

**Problem**: Users can see other users' data

**Solution**:
```bash
# Verify RLS is enabled on the table
psql -h localhost -p 54322 -U postgres << EOF
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'cycle_entries';
EOF

# Should show: rowsecurity = true

# List all policies on the table
psql -h localhost -p 54322 -U postgres << EOF
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'cycle_entries';
EOF

# Re-enable RLS if needed
psql -h localhost -p 54322 -U postgres << EOF
ALTER TABLE public.cycle_entries ENABLE ROW LEVEL SECURITY;
EOF
```

### Studio Dashboard Not Loading

**Problem**: `http://localhost:54323` shows blank page or error

**Solution**:
```bash
# Check studio container logs
docker logs supabase_studio_local

# Restart studio
docker-compose restart studio

# Clear browser cache and refresh
# (Cmd+Shift+R on Mac, Ctrl+Shift+R on Linux/Windows)

# Check if SUPABASE_URL is correctly set in docker-compose environment
grep SUPABASE_URL docker-compose.yml
```

### Performance Issues

**Problem**: Queries are slow

**Solution**:
```bash
# Verify indexes exist
psql -h localhost -p 54322 -U postgres << EOF
\d cycle_entries
EOF

# Look for "Indexes:" section

# If missing, create them
psql -h localhost -p 54322 -U postgres << EOF
CREATE INDEX idx_cycle_entries_user_id ON public.cycle_entries(user_id);
CREATE INDEX idx_cycle_entries_entry_date ON public.cycle_entries(entry_date);
EOF

# Analyze explain plans
psql -h localhost -p 54322 -U postgres << EOF
EXPLAIN ANALYZE
SELECT * FROM cycle_entries 
WHERE user_id = 'some-uuid' AND entry_date >= '2024-01-01';
EOF
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgREST API Reference](https://postgrest.org/en/stable/)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:

1. Check the logs: `docker-compose logs -f`
2. Review this guide's troubleshooting section
3. Check Supabase Studio at http://localhost:54323
4. Consult the Supabase documentation
5. Review the database schema in this repository
