# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Menstrual Cycle Tracking Application.

## Available Functions

### 1. predict-cycle

Generates cycle predictions for a specific user based on historical data.

**Path:** `/functions/v1/predict-cycle`

**Method:** POST

**Request Body:**
```json
{
  "user_id": "uuid-of-user",
  "user_auth_id": "auth-uuid-of-user"
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

### 2. send-reminders

Checks and sends due reminders for all users.

**Path:** `/functions/v1/send-reminders`

**Method:** POST

**Request Body:** None required

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
      "message": "Your period is expected to start around 2024-12-25."
    }
  ]
}
```

## Local Development

### Prerequisites

- Deno 1.37+ (for running Edge Functions locally)
- Supabase CLI

### Running Locally

```bash
# Serve all functions
supabase functions serve

# Serve a specific function
supabase functions serve predict-cycle

# Test with curl
curl -X POST http://localhost:54321/functions/v1/predict-cycle \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid-here"}'
```

### Environment Variables

Create a `.env.local` file in the functions directory:

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EMAIL_SERVICE_URL=https://api.example.com/send-email
EMAIL_API_KEY=your-email-api-key
```

## Deployment

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy Specific Function

```bash
supabase functions deploy predict-cycle
supabase functions deploy send-reminders
```

### Set Environment Variables (Production)

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-production-key
supabase secrets set EMAIL_SERVICE_URL=https://api.example.com/send-email
supabase secrets set EMAIL_API_KEY=your-email-api-key
```

## Testing

### Test predict-cycle

```bash
curl -X POST http://localhost:54321/functions/v1/predict-cycle \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "11111111-1111-1111-1111-111111111111"
  }'
```

### Test send-reminders

```bash
curl -X POST http://localhost:54321/functions/v1/send-reminders \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json"
```

## Logs

View function logs:

```bash
# Local logs
supabase functions logs predict-cycle --local

# Production logs
supabase functions logs predict-cycle
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Client Application                  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              Supabase API Gateway                    │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  predict-cycle   │    │  send-reminders  │
│  Edge Function   │    │  Edge Function   │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌─────────────────────┐
         │  PostgreSQL         │
         │  - cycle_entries    │
         │  - profiles         │
         │  - predictions      │
         │  - reminders        │
         └─────────────────────┘
```

## Security

- Edge Functions run with service role privileges
- Always validate input data
- Use RLS policies to ensure data isolation
- Never expose service role key to clients
- Rate limit function calls if needed

## Troubleshooting

### Function Not Found

Ensure the function is deployed:
```bash
supabase functions list
```

### Permission Errors

Check that service role key is set:
```bash
supabase secrets list
```

### Function Timeouts

Edge Functions have a 60-second timeout. For long-running tasks, consider:
- Optimizing queries
- Processing in batches
- Using background jobs

## Further Documentation

- [Main Prediction & Reminders Documentation](../../docs/PREDICTION_REMINDERS.md)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
