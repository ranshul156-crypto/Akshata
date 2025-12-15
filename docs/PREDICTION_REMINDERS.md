# Prediction & Reminders System Documentation

This document explains the prediction and reminders system for the Menstrual Cycle Tracking Application.

## Table of Contents

- [Overview](#overview)
- [Prediction Service](#prediction-service)
- [Reminders System](#reminders-system)
- [Scheduling & Automation](#scheduling--automation)
- [Edge Functions](#edge-functions)
- [Configuration](#configuration)
- [Testing](#testing)
- [API Reference](#api-reference)

## Overview

The prediction and reminders system consists of:

1. **Prediction Algorithm**: Deterministic calculation of next period start/end and fertility window
2. **Edge Functions**: Serverless functions for prediction generation and reminder notifications
3. **Database Triggers**: Automatic prediction updates when cycle data changes
4. **Cron Jobs**: Scheduled tasks for nightly predictions and hourly reminder checks
5. **Reminders**: User-configurable notifications for various cycle events

## Prediction Service

### Algorithm

The prediction algorithm analyzes historical cycle data to predict:
- Next period start date
- Next period end date
- Fertility window (start and end dates)

**Algorithm Logic:**

1. **Identify Cycle Starts**: Parse cycle entries to find period start dates
2. **Calculate Cycle Lengths**: Compute days between consecutive cycle starts
3. **Statistical Analysis**: Calculate average cycle length and standard deviation
4. **Confidence Scoring**: 
   - Profile default (no data): 0.5 confidence
   - Hybrid (1-2 cycles): 0.6-0.7 confidence
   - Historical (3+ cycles): 0.7-0.95 confidence (inversely proportional to standard deviation)
5. **Date Calculation**: 
   - Next period start = Last cycle start + Predicted cycle length
   - Next period end = Period start + Period length - 1
   - Fertility window = Days 9-15 of cycle (ovulation ± 5 days)

### Prediction Sources

- **`profile_default`**: No historical data, uses profile defaults (28-day cycle, 5-day period)
- **`hybrid`**: 1-2 cycles analyzed, combines historical data with profile defaults
- **`historical`**: 3+ cycles analyzed, uses only historical patterns

### Data Structure

Predictions are stored in the `predictions` table:

```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  prediction_date DATE NOT NULL,
  cycle_start_date DATE,
  cycle_end_date DATE,
  confidence NUMERIC(3, 2),
  source TEXT,
  metadata JSONB
);
```

**Metadata Fields:**
```json
{
  "cycles_analyzed": 3,
  "average_cycle_length": 28.5,
  "std_deviation": 1.2,
  "fertility_window_start": "2024-12-15",
  "fertility_window_end": "2024-12-20"
}
```

## Reminders System

### Reminder Types

1. **`period_start`**: Notification before period is expected to start
2. **`period_end`**: Notification when period is expected to end
3. **`fertile_window`**: Notification before fertile window begins
4. **`medication`**: Daily medication reminders
5. **`hydration`**: Daily hydration reminders
6. **`custom`**: User-defined reminders

### Schedule Configuration

Reminders use a JSON configuration stored in `schedule_config`:

```json
{
  "time": "09:00",
  "days_before": 3,
  "frequency": "daily",
  "custom_message": "Optional custom message"
}
```

**Fields:**
- `time`: Time of day to send reminder (HH:MM format, 24-hour)
- `days_before`: Days before event to send reminder (for cycle-based reminders)
- `frequency`: `"daily"` or `"once"` (for medication/hydration reminders)
- `custom_message`: Optional custom message to override default

### Data Structure

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  schedule_config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP
);
```

## Scheduling & Automation

### Database Trigger

Automatically triggers prediction update when a cycle entry is added or modified:

```sql
CREATE TRIGGER trigger_cycle_entry_prediction_update
  AFTER INSERT OR UPDATE
  ON public.cycle_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_prediction_update();
```

### Cron Jobs

The system uses PostgreSQL's `pg_cron` extension for scheduled tasks:

#### 1. Nightly Predictions (2 AM UTC)

Generates predictions for all active users:

```sql
SELECT cron.schedule(
  'nightly-predictions',
  '0 2 * * *',
  'SELECT run_all_user_predictions()'
);
```

#### 2. Hourly Reminder Checks

Checks and sends due reminders every hour:

```sql
SELECT cron.schedule(
  'hourly-reminders',
  '0 * * * *',
  'SELECT check_and_send_reminders()'
);
```

### Manual Triggers

#### Trigger Prediction for Specific User

```sql
SELECT trigger_user_prediction('user-uuid-here');
```

#### Run Predictions for All Users

```sql
SELECT * FROM run_all_user_predictions();
```

#### Check and Send Reminders

```sql
SELECT * FROM check_and_send_reminders();
```

## Edge Functions

### predict-cycle

Generates predictions for a specific user.

**Endpoint:** `/functions/v1/predict-cycle`

**Request:**
```json
{
  "user_id": "uuid",
  "user_auth_id": "auth-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "next_period_start": "2024-12-25",
    "next_period_end": "2024-12-29",
    "fertility_window_start": "2024-12-18",
    "fertility_window_end": "2024-12-23",
    "confidence": 0.85,
    "source": "historical",
    "metadata": {
      "cycles_analyzed": 3,
      "average_cycle_length": 28.5,
      "std_deviation": 1.2
    }
  }
}
```

### send-reminders

Checks and sends due reminders for all users.

**Endpoint:** `/functions/v1/send-reminders`

**Request:** POST (no body required)

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "sent": 3,
  "results": [
    {
      "reminder_id": "uuid",
      "user_id": "uuid",
      "reminder_type": "period_start",
      "sent": true,
      "message": "Your period is expected to start around 2024-12-25. Stay prepared!"
    }
  ]
}
```

## Configuration

### Environment Variables

Required environment variables for Edge Functions:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Service (Optional)
EMAIL_SERVICE_URL=https://api.example.com/send-email
EMAIL_API_KEY=your-email-api-key
```

### Local Development

For local development with Docker Compose:

```bash
# .env.local
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Email Integration

If `EMAIL_SERVICE_URL` and `EMAIL_API_KEY` are configured, the system will send email notifications. Otherwise, it logs notifications to console (in-app notification placeholder).

**Email Service API Contract:**
```json
POST ${EMAIL_SERVICE_URL}
Authorization: Bearer ${EMAIL_API_KEY}
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Cycle Tracker Reminder: period_start",
  "body": "Your period is expected to start around 2024-12-25. Stay prepared!"
}
```

## Testing

### Unit Tests

Test the prediction algorithm with deterministic datasets:

```bash
# Using Deno
deno run --allow-read utils/prediction-algorithm.test.ts

# Using Node/TypeScript
npm test
```

### Database Tests

Run comprehensive SQL tests:

```bash
# Test prediction functions and stored procedures
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/test_predictions.sql

# Expected output: All tests pass, no errors
```

### Manual Testing

#### 1. Create a Test User

```sql
INSERT INTO user_accounts (auth_id, email)
VALUES ('test-uuid', 'test@example.com');

INSERT INTO profiles (user_id, cycle_length_days, period_length_days)
VALUES ((SELECT id FROM user_accounts WHERE auth_id = 'test-uuid'), 28, 5);
```

#### 2. Add Cycle Data

```sql
INSERT INTO cycle_entries (user_id, entry_date, flow_intensity)
VALUES 
  ((SELECT id FROM user_accounts WHERE auth_id = 'test-uuid'), '2024-01-01', 'medium'),
  ((SELECT id FROM user_accounts WHERE auth_id = 'test-uuid'), '2024-01-02', 'heavy'),
  ((SELECT id FROM user_accounts WHERE auth_id = 'test-uuid'), '2024-01-29', 'medium');
```

#### 3. Trigger Prediction

```sql
SELECT trigger_user_prediction(
  (SELECT id FROM user_accounts WHERE auth_id = 'test-uuid')
);
```

#### 4. View Predictions

```sql
SELECT * FROM predictions 
WHERE user_id = (SELECT id FROM user_accounts WHERE auth_id = 'test-uuid')
ORDER BY prediction_date DESC;
```

#### 5. Create Test Reminders

```sql
INSERT INTO reminders (user_id, reminder_type, schedule_config, enabled)
VALUES 
  ((SELECT id FROM user_accounts WHERE auth_id = 'test-uuid'), 
   'period_start', 
   '{"days_before": 3, "time": "09:00"}'::JSONB, 
   true);
```

#### 6. Test Reminder Check

```sql
SELECT * FROM check_and_send_reminders();
```

## API Reference

### Stored Procedures

#### `trigger_prediction_update()`

Automatically called by trigger when cycle entry changes.

**Returns:** Trigger result (NEW record)

#### `run_all_user_predictions()`

Runs prediction generation for all active users.

**Returns:** 
```sql
TABLE (
  user_id UUID,
  status TEXT,
  message TEXT
)
```

#### `check_and_send_reminders()`

Checks and queues reminders that are due.

**Returns:**
```sql
TABLE (
  reminder_count INT,
  status TEXT
)
```

#### `trigger_user_prediction(user_id UUID)`

Manually trigger prediction for a specific user.

**Parameters:**
- `user_id`: UUID of the user

**Returns:** JSONB
```json
{
  "success": true,
  "user_id": "uuid",
  "message": "Prediction generation queued"
}
```

### REST API Endpoints

All endpoints use Supabase's auto-generated REST API:

#### Get User's Predictions

```bash
GET /rest/v1/predictions?user_id=eq.{user_id}&order=prediction_date.desc
Authorization: Bearer {anon_key}
```

#### Get User's Reminders

```bash
GET /rest/v1/reminders?user_id=eq.{user_id}&deleted_at=is.null
Authorization: Bearer {anon_key}
```

#### Create Reminder

```bash
POST /rest/v1/reminders
Authorization: Bearer {anon_key}
Content-Type: application/json

{
  "user_id": "uuid",
  "reminder_type": "period_start",
  "schedule_config": {
    "days_before": 3,
    "time": "09:00"
  },
  "enabled": true
}
```

#### Update Reminder

```bash
PATCH /rest/v1/reminders?id=eq.{reminder_id}
Authorization: Bearer {anon_key}
Content-Type: application/json

{
  "enabled": false
}
```

#### Delete Reminder (Soft Delete)

```bash
PATCH /rest/v1/reminders?id=eq.{reminder_id}
Authorization: Bearer {anon_key}
Content-Type: application/json

{
  "deleted_at": "2024-12-15T10:30:00Z"
}
```

## Deployment

### Production Setup

1. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy predict-cycle
   supabase functions deploy send-reminders
   ```

2. **Enable pg_cron Extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

3. **Schedule Cron Jobs:**
   ```sql
   -- Nightly predictions at 2 AM UTC
   SELECT cron.schedule(
     'nightly-predictions',
     '0 2 * * *',
     'SELECT run_all_user_predictions()'
   );

   -- Hourly reminder checks
   SELECT cron.schedule(
     'hourly-reminders',
     '0 * * * *',
     'SELECT check_and_send_reminders()'
   );
   ```

4. **Configure Environment Variables:**
   Set production values for:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMAIL_SERVICE_URL` (optional)
   - `EMAIL_API_KEY` (optional)

5. **Verify RLS Policies:**
   Ensure all tables have appropriate RLS policies enabled.

### Monitoring

Monitor cron job execution:

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

Check for failed jobs:

```sql
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

## Troubleshooting

### Predictions Not Generating

1. Check if user has profile:
   ```sql
   SELECT * FROM profiles WHERE user_id = 'user-uuid';
   ```

2. Check if user has cycle entries:
   ```sql
   SELECT * FROM cycle_entries WHERE user_id = 'user-uuid';
   ```

3. Manually trigger prediction:
   ```sql
   SELECT trigger_user_prediction('user-uuid');
   ```

### Reminders Not Sending

1. Verify reminder is enabled:
   ```sql
   SELECT * FROM reminders WHERE id = 'reminder-uuid';
   ```

2. Check if prediction exists:
   ```sql
   SELECT * FROM predictions WHERE user_id = 'user-uuid'
   ORDER BY prediction_date DESC LIMIT 1;
   ```

3. Verify cron job is running:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'hourly-reminders';
   ```

### Edge Function Errors

1. Check Edge Function logs:
   ```bash
   supabase functions logs predict-cycle
   supabase functions logs send-reminders
   ```

2. Test locally:
   ```bash
   supabase functions serve predict-cycle
   ```

3. Verify environment variables are set correctly.

## Security Considerations

1. **Service Role Key**: Never expose in client-side code. Only use in Edge Functions and backend processes.

2. **RLS Policies**: All predictions and reminders tables enforce user isolation via RLS.

3. **Email Content**: Reminder messages contain minimal personal information. Avoid including sensitive health data in notifications.

4. **Rate Limiting**: Consider implementing rate limits on Edge Function calls to prevent abuse.

5. **Data Privacy**: Users can disable analytics_opt_in to prevent prediction metadata from being used for analytics.

## Future Enhancements

- **Machine Learning**: Integrate ML models for more accurate predictions
- **Push Notifications**: Add support for mobile push notifications
- **SMS Notifications**: Integrate with SMS providers
- **Snooze Functionality**: Allow users to snooze reminders
- **Recurring Custom Reminders**: Support complex recurring patterns
- **Prediction Accuracy Tracking**: Track prediction accuracy over time
- **Multi-cycle Predictions**: Generate predictions for next N cycles

## Support

For issues or questions:
- Check the main [README.md](../README.md)
- Review [BACKEND_SETUP_GUIDE.md](../BACKEND_SETUP_GUIDE.md)
- Run tests: `make db-test`
- Check Supabase Studio: http://localhost:54323
