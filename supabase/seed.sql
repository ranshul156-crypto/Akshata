-- Seed data for testing Supabase backend
-- This file is used for local development and testing

-- Note: In production, auth_id values would be from Supabase Auth
-- For testing, we use placeholder UUIDs that can be replaced with actual auth IDs

-- Create test users
INSERT INTO public.user_accounts (auth_id, email, preferences, is_anonymized, analytics_opt_in)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com', '{"language": "en", "timezone": "UTC"}', false, true),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com', '{"language": "en", "timezone": "EST"}', false, false),
  ('00000000-0000-0000-0000-000000000003', 'charlie@example.com', '{"language": "es", "timezone": "CST"}', true, true)
ON CONFLICT (auth_id) DO NOTHING;

-- Create profiles
INSERT INTO public.profiles (user_id, cycle_length_days, period_length_days, first_name, last_name, notes)
SELECT id, 28, 5, 'Alice', 'Smith', 'Regular cycles'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (user_id, cycle_length_days, period_length_days, first_name, last_name, notes)
SELECT id, 31, 6, 'Bob', 'Johnson', 'Slightly longer cycles'
FROM public.user_accounts WHERE email = 'bob@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (user_id, cycle_length_days, period_length_days, first_name, last_name, notes)
SELECT id, 26, 4, 'Charlie', 'Williams', 'Shorter cycles'
FROM public.user_accounts WHERE email = 'charlie@example.com'
ON CONFLICT DO NOTHING;

-- Create cycle entries for Alice
INSERT INTO public.cycle_entries (user_id, entry_date, flow_intensity, notes, symptoms)
SELECT id, CURRENT_DATE - INTERVAL '5 days', 'heavy', 'Day 1 of period', '["cramps", "headache"]'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.cycle_entries (user_id, entry_date, flow_intensity, notes, symptoms)
SELECT id, CURRENT_DATE - INTERVAL '4 days', 'heavy', 'Day 2 of period', '["cramps"]'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.cycle_entries (user_id, entry_date, flow_intensity, notes, symptoms)
SELECT id, CURRENT_DATE - INTERVAL '3 days', 'medium', 'Day 3 of period', '[]'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

-- Create symptom logs for Alice
INSERT INTO public.symptom_logs (user_id, log_date, mood, pain_level, sleep_quality, other_symptoms, notes)
SELECT id, CURRENT_DATE - INTERVAL '5 days', 5, 7, 6, '{"bloating": true, "energy": "low"}', 'Not feeling great'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.symptom_logs (user_id, log_date, mood, pain_level, sleep_quality, other_symptoms, notes)
SELECT id, CURRENT_DATE - INTERVAL '4 days', 6, 5, 7, '{"bloating": true}', 'Slightly better'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

-- Create predictions for Alice
INSERT INTO public.predictions (user_id, prediction_date, cycle_start_date, cycle_end_date, confidence, source, metadata)
SELECT id, CURRENT_DATE, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '25 days', 0.95, 'historical', '{"method": "average_cycle_length"}'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

-- Create reminders for Alice
INSERT INTO public.reminders (user_id, reminder_type, schedule_config, enabled)
SELECT id, 'period_start', '{"days_before": 0, "time": "09:00"}', true
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.reminders (user_id, reminder_type, schedule_config, enabled)
SELECT id, 'fertile_window', '{"days_before": 0, "time": "10:00"}', true
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

-- Create chat interactions for Alice
INSERT INTO public.chat_interactions (user_id, prompt, response, response_metadata)
SELECT id, 'What should I expect during my period?', 'During your period, you may experience cramping, bloating, mood changes, and varying flow levels.', '{"source": "faq", "accuracy": 0.95}'
FROM public.user_accounts WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;
