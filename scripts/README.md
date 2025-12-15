# Scripts Directory

This directory contains utility scripts for managing predictions and running tests.

## Available Scripts

### run-predictions.sh

Manually trigger prediction generation for users.

**Usage:**
```bash
# Run predictions for all users
./scripts/run-predictions.sh

# Run predictions for a specific user
./scripts/run-predictions.sh <user-uuid>
```

**What it does:**
- Connects to the local database
- Calls `run_all_user_predictions()` or `trigger_user_prediction(uuid)`
- Displays results and provides next steps

### test-all.sh

Comprehensive test runner that executes all test suites.

**Usage:**
```bash
./scripts/test-all.sh
```

**What it does:**
1. Runs RLS tests (`supabase/test_rls.sql`)
2. Runs integration tests (`supabase/integration_tests.sql`)
3. Runs prediction tests (`supabase/test_predictions.sql`)
4. Runs prediction algorithm tests (if Deno is installed)

**Requirements:**
- PostgreSQL running on localhost:54322
- Database migrations applied
- Deno (optional, for algorithm tests)

## Environment Variables

Both scripts use the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:54322/postgres`)

## Examples

### Run all tests
```bash
./scripts/test-all.sh
```

### Trigger predictions for all users
```bash
./scripts/run-predictions.sh
```

### Trigger predictions for specific user
```bash
USER_ID="11111111-1111-1111-1111-111111111111"
./scripts/run-predictions.sh $USER_ID
```

## Troubleshooting

### Permission Denied
If you get a permission denied error:
```bash
chmod +x scripts/*.sh
```

### Database Connection Failed
Ensure Supabase is running:
```bash
cd supabase && docker-compose ps
```

If not running:
```bash
make supabase-start
```

### Tests Fail
Make sure migrations are applied:
```bash
make db-migrate
```

## See Also

- [Main README](../README.md)
- [Prediction & Reminders Documentation](../docs/PREDICTION_REMINDERS.md)
- [Makefile](../Makefile) - Contains convenient make commands
