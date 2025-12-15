-- Test script for prediction functionality
-- Tests the prediction functions and stored procedures

\echo ''
\echo '=========================================='
\echo 'Prediction System Tests'
\echo '=========================================='
\echo ''

BEGIN;

-- Create test user and profile
\echo '1. Setting up test data...'

INSERT INTO public.user_accounts (id, auth_id, email)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 'prediction-test@example.com')
ON CONFLICT (auth_id) DO NOTHING;

INSERT INTO public.profiles (user_id, cycle_length_days, period_length_days)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, 28, 5)
ON CONFLICT DO NOTHING;

-- Add sample cycle entries spanning 3 cycles
DELETE FROM public.cycle_entries WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

-- Cycle 1: Started 84 days ago (3 cycles * 28 days)
INSERT INTO public.cycle_entries (user_id, entry_date, flow_intensity, notes)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '84 days', 'medium', 'Cycle 1 Day 1'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '83 days', 'heavy', 'Cycle 1 Day 2'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '82 days', 'medium', 'Cycle 1 Day 3'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '81 days', 'light', 'Cycle 1 Day 4'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '80 days', 'spotting', 'Cycle 1 Day 5'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '79 days', 'none', 'Cycle 1 Done');

-- Cycle 2: Started 56 days ago (2 cycles * 28 days)
INSERT INTO public.cycle_entries (user_id, entry_date, flow_intensity, notes)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '56 days', 'medium', 'Cycle 2 Day 1'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '55 days', 'heavy', 'Cycle 2 Day 2'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '54 days', 'medium', 'Cycle 2 Day 3'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '53 days', 'light', 'Cycle 2 Day 4'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '52 days', 'spotting', 'Cycle 2 Day 5');

-- Cycle 3: Started 28 days ago (1 cycle * 28 days)
INSERT INTO public.cycle_entries (user_id, entry_date, flow_intensity, notes)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '28 days', 'medium', 'Cycle 3 Day 1'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '27 days', 'heavy', 'Cycle 3 Day 2'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '26 days', 'medium', 'Cycle 3 Day 3'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '25 days', 'light', 'Cycle 3 Day 4'),
  ('11111111-1111-1111-1111-111111111111'::UUID, CURRENT_DATE - INTERVAL '24 days', 'spotting', 'Cycle 3 Day 5');

\echo 'Test data created successfully!'
\echo ''

-- Test 2: Verify cycle entries exist
\echo '2. Verifying cycle entries...'
SELECT 
  COUNT(*) as total_entries,
  MIN(entry_date) as earliest_entry,
  MAX(entry_date) as latest_entry
FROM public.cycle_entries
WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

\echo ''

-- Test 3: Test the trigger function
\echo '3. Testing trigger function...'
SELECT trigger_user_prediction('11111111-1111-1111-1111-111111111111'::UUID) as trigger_result;

\echo ''

-- Test 4: Test the batch prediction function
\echo '4. Testing batch prediction function...'
SELECT * FROM run_all_user_predictions() WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

\echo ''

-- Test 5: Verify predictions can be inserted
\echo '5. Testing prediction insertion...'
DELETE FROM public.predictions WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

INSERT INTO public.predictions (user_id, prediction_date, cycle_start_date, cycle_end_date, confidence, source, metadata)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  CURRENT_DATE,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '5 days',
  0.85,
  'historical',
  '{"cycles_analyzed": 3, "average_cycle_length": 28.0, "fertility_window_start": "2024-12-15", "fertility_window_end": "2024-12-20"}'::JSONB
);

SELECT 
  prediction_date,
  cycle_start_date,
  cycle_end_date,
  confidence,
  source,
  metadata->>'cycles_analyzed' as cycles_analyzed
FROM public.predictions
WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

\echo ''

-- Test 6: Test reminders function
\echo '6. Testing reminders check function...'
SELECT * FROM check_and_send_reminders();

\echo ''

-- Test 7: Create test reminders
\echo '7. Creating test reminders...'
DELETE FROM public.reminders WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

INSERT INTO public.reminders (user_id, reminder_type, schedule_config, enabled)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, 'period_start', '{"days_before": 3, "time": "09:00"}'::JSONB, true),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'fertile_window', '{"days_before": 2, "time": "10:00"}'::JSONB, true),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'medication', '{"frequency": "daily", "time": "08:00"}'::JSONB, true),
  ('11111111-1111-1111-1111-111111111111'::UUID, 'hydration', '{"frequency": "daily", "time": "12:00"}'::JSONB, true);

SELECT 
  reminder_type,
  schedule_config,
  enabled,
  created_at
FROM public.reminders
WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID
ORDER BY reminder_type;

\echo ''

-- Test 8: Test RLS policies for predictions
\echo '8. Testing RLS policies for predictions...'
SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

SELECT COUNT(*) as user_can_view_own_predictions
FROM public.predictions
WHERE user_id = '11111111-1111-1111-1111-111111111111'::UUID;

\echo ''

-- Test 9: Test reminder types constraint
\echo '9. Testing reminder types constraint...'
DO $$
BEGIN
  -- Try to insert invalid reminder type (should fail)
  BEGIN
    INSERT INTO public.reminders (user_id, reminder_type, schedule_config)
    VALUES ('11111111-1111-1111-1111-111111111111'::UUID, 'invalid_type', '{}'::JSONB);
    RAISE EXCEPTION 'Invalid reminder type was accepted (test failed)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'Correctly rejected invalid reminder type';
  END;
  
  -- Try to insert valid new types
  INSERT INTO public.reminders (user_id, reminder_type, schedule_config)
  VALUES 
    ('11111111-1111-1111-1111-111111111111'::UUID, 'medication', '{"frequency": "daily"}'::JSONB),
    ('11111111-1111-1111-1111-111111111111'::UUID, 'hydration', '{"frequency": "daily"}'::JSONB)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Successfully inserted medication and hydration reminder types';
END $$;

\echo ''

ROLLBACK;

\echo ''
\echo '=========================================='
\echo 'All prediction tests completed!'
\echo '=========================================='
\echo ''
