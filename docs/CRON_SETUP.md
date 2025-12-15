# Cron Jobs Setup Guide

This guide explains how to configure and manage scheduled tasks for the Menstrual Cycle Tracking Application using PostgreSQL's `pg_cron` extension.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Scheduled Jobs](#scheduled-jobs)
- [Managing Cron Jobs](#managing-cron-jobs)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

The application uses two main scheduled tasks:

1. **Nightly Predictions**: Generates cycle predictions for all users at 2 AM UTC
2. **Hourly Reminders**: Checks and sends due reminders every hour

These tasks are managed by PostgreSQL's `pg_cron` extension, which runs directly in the database.

## Prerequisites

- PostgreSQL 12+ with `pg_cron` extension
- Superuser access to the database (for initial setup)
- Migrations applied (including `20251215003231_add_prediction_scheduling.sql`)

## Installation

### 1. Enable pg_cron Extension

The migration automatically attempts to enable the extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

If this fails due to permissions, connect as a superuser and run:

```bash
psql -U postgres -d your_database -c "CREATE EXTENSION pg_cron;"
```

### 2. Configure pg_cron (Production)

For production databases, you may need to add pg_cron to `shared_preload_libraries`:

**PostgreSQL Configuration (`postgresql.conf`):**
```ini
shared_preload_libraries = 'pg_cron'
cron.database_name = 'your_database_name'
```

**Then restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

### 3. Schedule the Jobs

Connect to your database and run:

```sql
-- Schedule nightly predictions at 2 AM UTC
SELECT cron.schedule(
  'nightly-predictions',           -- Job name
  '0 2 * * *',                      -- Cron expression (2 AM daily)
  'SELECT run_all_user_predictions()' -- SQL command
);

-- Schedule hourly reminder checks
SELECT cron.schedule(
  'hourly-reminders',               -- Job name
  '0 * * * *',                      -- Cron expression (every hour)
  'SELECT check_and_send_reminders()' -- SQL command
);
```

## Scheduled Jobs

### Nightly Predictions

**Job Name:** `nightly-predictions`  
**Schedule:** `0 2 * * *` (2:00 AM UTC daily)  
**Function:** `run_all_user_predictions()`

**What it does:**
- Iterates through all active users
- Generates predictions based on their cycle history
- Stores predictions in the `predictions` table

**Cron Expression Breakdown:**
```
0 2 * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Hourly Reminders

**Job Name:** `hourly-reminders`  
**Schedule:** `0 * * * *` (Every hour at minute 0)  
**Function:** `check_and_send_reminders()`

**What it does:**
- Checks all enabled reminders
- Determines which reminders are due
- Sends notifications (email or in-app)

## Managing Cron Jobs

### List All Jobs

```sql
SELECT * FROM cron.job;
```

**Example Output:**
```
 jobid |      schedule      |        command                    |  nodename  | nodeport | database  | username 
-------+--------------------+-----------------------------------+------------+----------+-----------+----------
     1 | 0 2 * * *          | SELECT run_all_user_predictions() | localhost  |     5432 | postgres  | postgres
     2 | 0 * * * *          | SELECT check_and_send_reminders() | localhost  |     5432 | postgres  | postgres
```

### Unschedule a Job

```sql
-- By job name
SELECT cron.unschedule('nightly-predictions');

-- By job ID
SELECT cron.unschedule(1);
```

### Update Job Schedule

```sql
-- Unschedule the old job
SELECT cron.unschedule('nightly-predictions');

-- Schedule with new time (e.g., 3 AM instead of 2 AM)
SELECT cron.schedule(
  'nightly-predictions',
  '0 3 * * *',
  'SELECT run_all_user_predictions()'
);
```

### Disable/Enable Jobs

To temporarily disable a job without unscheduling:

```sql
-- Disable
UPDATE cron.job SET active = false WHERE jobname = 'nightly-predictions';

-- Enable
UPDATE cron.job SET active = true WHERE jobname = 'nightly-predictions';
```

## Monitoring

### View Job Run History

```sql
-- Last 10 runs of all jobs
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  start_time,
  end_time,
  end_time - start_time AS duration
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Check Failed Jobs

```sql
SELECT 
  jobid,
  start_time,
  command,
  status,
  return_message
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 20;
```

### View Job Performance

```sql
-- Average runtime by job
SELECT 
  j.jobname,
  COUNT(*) as run_count,
  AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as avg_seconds,
  MAX(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as max_seconds
FROM cron.job j
JOIN cron.job_run_details jrd ON j.jobid = jrd.jobid
WHERE jrd.end_time IS NOT NULL
GROUP BY j.jobname;
```

### Monitor Recent Predictions

```sql
-- Check how many predictions were generated recently
SELECT 
  prediction_date,
  COUNT(*) as prediction_count,
  AVG(confidence) as avg_confidence
FROM predictions
WHERE prediction_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY prediction_date
ORDER BY prediction_date DESC;
```

### Monitor Reminder Activity

```sql
-- Check enabled reminders by type
SELECT 
  reminder_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE enabled = true) as enabled_count
FROM reminders
WHERE deleted_at IS NULL
GROUP BY reminder_type;
```

## Troubleshooting

### Job Not Running

**Check if job is scheduled:**
```sql
SELECT * FROM cron.job WHERE jobname = 'nightly-predictions';
```

**Check if job is active:**
```sql
SELECT jobname, active FROM cron.job WHERE jobname = 'nightly-predictions';
```

**Manually trigger the job:**
```sql
SELECT run_all_user_predictions();
```

### Jobs Running But No Results

**Check function permissions:**
```sql
-- Ensure functions have SECURITY DEFINER
\df+ run_all_user_predictions
\df+ check_and_send_reminders
```

**Check for errors in job history:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'nightly-predictions')
ORDER BY start_time DESC LIMIT 5;
```

### pg_cron Extension Missing

If `CREATE EXTENSION pg_cron` fails:

1. Install pg_cron package:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-15-cron
   
   # RHEL/CentOS
   sudo yum install pg_cron_15
   ```

2. Add to `postgresql.conf`:
   ```ini
   shared_preload_libraries = 'pg_cron'
   ```

3. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

4. Create extension:
   ```sql
   CREATE EXTENSION pg_cron;
   ```

### Permission Denied Errors

Ensure the database user has necessary permissions:

```sql
-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION run_all_user_predictions() TO cron_runner;
GRANT EXECUTE ON FUNCTION check_and_send_reminders() TO cron_runner;

-- Grant permissions on tables (if needed)
GRANT SELECT, INSERT ON predictions TO cron_runner;
GRANT SELECT ON reminders TO cron_runner;
GRANT SELECT ON user_accounts TO cron_runner;
```

### Jobs Running Too Slowly

**Optimize queries in functions:**
- Add indexes on frequently queried columns
- Limit the number of records processed per run
- Consider batch processing

**Split large jobs:**
```sql
-- Instead of processing all users at once, process in batches
SELECT cron.schedule(
  'predictions-batch-1',
  '0 2 * * *',
  'SELECT run_predictions_for_batch(0, 1000)'
);

SELECT cron.schedule(
  'predictions-batch-2',
  '5 2 * * *',
  'SELECT run_predictions_for_batch(1000, 2000)'
);
```

## Advanced Configuration

### Custom Schedules

Change reminder checks to every 30 minutes:
```sql
SELECT cron.unschedule('hourly-reminders');
SELECT cron.schedule(
  'half-hourly-reminders',
  '0,30 * * * *',
  'SELECT check_and_send_reminders()'
);
```

Run predictions twice daily (2 AM and 2 PM):
```sql
SELECT cron.unschedule('nightly-predictions');
SELECT cron.schedule(
  'twice-daily-predictions',
  '0 2,14 * * *',
  'SELECT run_all_user_predictions()'
);
```

### Different Timezones

pg_cron uses the database server's timezone. To schedule for a specific timezone:

```sql
-- Set database timezone to EST
SET TIMEZONE TO 'America/New_York';

-- Then schedule jobs - they'll run in EST
SELECT cron.schedule(
  'nightly-predictions-est',
  '0 2 * * *',  -- 2 AM EST
  'SELECT run_all_user_predictions()'
);
```

### Logging and Alerting

Create a custom logging table:

```sql
CREATE TABLE cron_job_logs (
  id SERIAL PRIMARY KEY,
  job_name TEXT,
  run_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT,
  records_processed INT,
  error_message TEXT
);

-- Update functions to log results
CREATE OR REPLACE FUNCTION run_all_user_predictions()
RETURNS TABLE (...) AS $$
DECLARE
  records_count INT := 0;
BEGIN
  -- Process predictions
  -- ...
  
  -- Log result
  INSERT INTO cron_job_logs (job_name, status, records_processed)
  VALUES ('nightly-predictions', 'success', records_count);
  
  RETURN QUERY ...;
END;
$$ LANGUAGE plpgsql;
```

## Production Checklist

- [ ] pg_cron extension installed and configured
- [ ] Jobs scheduled with appropriate times for your timezone
- [ ] Job monitoring set up (alerts for failures)
- [ ] Backup strategy includes cron job configurations
- [ ] Resource limits configured to prevent runaway jobs
- [ ] Error handling and logging implemented in functions
- [ ] Regular review of job run history
- [ ] Documentation updated with any custom schedules

## Resources

- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Cron Expression Syntax](https://crontab.guru/)
- [PostgreSQL Extensions](https://www.postgresql.org/docs/current/contrib.html)

## Support

For issues with cron jobs:
1. Check job run history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
2. Manually test functions: `SELECT run_all_user_predictions();`
3. Check PostgreSQL logs for errors
4. Verify extension is properly installed: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
