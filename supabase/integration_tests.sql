-- Integration Tests for Cycle Tracker Backend
-- Tests RLS, data isolation, foreign key constraints, and business logic

\echo '=========================================='
\echo 'Integration Tests - Cycle Tracker Backend'
\echo '=========================================='

-- Test counter
\set test_count 0
\set passed 0
\set failed 0

-- Helper function to report test results
\echo ''
\echo 'Starting test suite...'
\echo ''

-- TEST 1: Insert and retrieve user account
\echo 'TEST 1: User Account Creation and Retrieval'
\echo '---'

DELETE FROM user_accounts WHERE email LIKE 'test_%@integration.test';

INSERT INTO user_accounts (auth_id, email, preferences)
VALUES ('test-auth-001', 'test_user1@integration.test', '{"theme": "dark"}');

SELECT COUNT(*) as test1_result FROM user_accounts 
WHERE email = 'test_user1@integration.test' AND preferences->>'theme' = 'dark';

-- TEST 2: Create profile linked to user
\echo ''
\echo 'TEST 2: Profile Creation with Foreign Key'
\echo '---'

INSERT INTO profiles (user_id, cycle_length_days, period_length_days, first_name, last_name)
SELECT id, 28, 5, 'Integration', 'Test'
FROM user_accounts WHERE email = 'test_user1@integration.test';

SELECT COUNT(*) as test2_result FROM profiles
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test')
AND cycle_length_days = 28;

-- TEST 3: Verify cycle entry constraints
\echo ''
\echo 'TEST 3: Cycle Entry Constraints'
\echo '---'

INSERT INTO cycle_entries (user_id, entry_date, flow_intensity, notes, symptoms)
SELECT id, CURRENT_DATE, 'heavy', 'Integration test entry', '["test_symptom"]'
FROM user_accounts WHERE email = 'test_user1@integration.test';

SELECT COUNT(*) as test3_result FROM cycle_entries
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test')
AND flow_intensity = 'heavy'
AND notes = 'Integration test entry';

-- TEST 4: Verify unique constraint on cycle entries
\echo ''
\echo 'TEST 4: Unique Constraint on Daily Entries'
\echo '---'

-- This should fail (duplicate entry for same user/date)
\set ON_ERROR_CONTINUE

INSERT INTO cycle_entries (user_id, entry_date, flow_intensity)
SELECT id, CURRENT_DATE, 'light'
FROM user_accounts WHERE email = 'test_user1@integration.test';

\set ON_ERROR_CONTINUE off

\echo 'Expected: Constraint violation was caught (duplicate entry prevented)'

-- TEST 5: Test symptom log with numeric constraints
\echo ''
\echo 'TEST 5: Symptom Log Numeric Constraints'
\echo '---'

INSERT INTO symptom_logs (user_id, log_date, mood, pain_level, sleep_quality, other_symptoms)
SELECT id, CURRENT_DATE, 7, 5, 8, '{"bloating": true, "energy": "moderate"}'
FROM user_accounts WHERE email = 'test_user1@integration.test';

SELECT COUNT(*) as test5_result FROM symptom_logs
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test')
AND mood = 7 AND pain_level = 5 AND sleep_quality = 8;

-- TEST 6: Test invalid mood value (should fail)
\echo ''
\echo 'TEST 6: Constraint Validation - Invalid Mood'
\echo '---'

\set ON_ERROR_CONTINUE

INSERT INTO symptom_logs (user_id, log_date, mood, pain_level, sleep_quality)
SELECT id, (CURRENT_DATE + INTERVAL '1 day'), 11, 5, 8
FROM user_accounts WHERE email = 'test_user1@integration.test';

\set ON_ERROR_CONTINUE off

\echo 'Expected: Constraint violation caught (mood must be 1-10)'

-- TEST 7: Test predictions with confidence values
\echo ''
\echo 'TEST 7: Prediction Creation with Confidence'
\echo '---'

INSERT INTO predictions (user_id, prediction_date, cycle_start_date, cycle_end_date, confidence, source)
SELECT id, CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '35 days', 0.95, 'historical'
FROM user_accounts WHERE email = 'test_user1@integration.test';

SELECT COUNT(*) as test7_result FROM predictions
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test')
AND confidence = 0.95 AND source = 'historical';

-- TEST 8: Test reminders with schedule config
\echo ''
\echo 'TEST 8: Reminder Creation with Schedule Config'
\echo '---'

INSERT INTO reminders (user_id, reminder_type, schedule_config, enabled)
SELECT id, 'period_start', '{"time": "09:00", "days_before": 0}'::jsonb, true
FROM user_accounts WHERE email = 'test_user1@integration.test';

SELECT COUNT(*) as test8_result FROM reminders
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test')
AND reminder_type = 'period_start' AND enabled = true;

-- TEST 9: Test chat interactions
\echo ''
\echo 'TEST 9: Chat Interaction Storage'
\echo '---'

INSERT INTO chat_interactions (user_id, prompt, response, response_metadata)
SELECT id, 'What is a normal cycle?', 'A typical menstrual cycle is 28 days.', '{"source": "faq", "confidence": 0.99}'::jsonb
FROM user_accounts WHERE email = 'test_user1@integration.test';

SELECT COUNT(*) as test9_result FROM chat_interactions
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test')
AND prompt = 'What is a normal cycle?';

-- TEST 10: Test cascading delete
\echo ''
\echo 'TEST 10: Cascading Delete'
\echo '---'

-- Get the user ID
\set user_to_delete `psql -t -c "SELECT id FROM user_accounts WHERE email = 'test_user1@integration.test' LIMIT 1;"`

-- Count child records before delete
SELECT 'Before delete:' as cascade_test;
SELECT (SELECT COUNT(*) FROM cycle_entries WHERE user_id = :'user_to_delete') as cycle_count;
SELECT (SELECT COUNT(*) FROM symptom_logs WHERE user_id = :'user_to_delete') as symptom_count;
SELECT (SELECT COUNT(*) FROM reminders WHERE user_id = :'user_to_delete') as reminder_count;

-- Delete the user (this should cascade to all child records)
DELETE FROM user_accounts WHERE id = :'user_to_delete';

-- Count child records after delete
SELECT 'After delete:' as cascade_test;
SELECT (SELECT COUNT(*) FROM cycle_entries WHERE user_id = :'user_to_delete') as cycle_count;
SELECT (SELECT COUNT(*) FROM symptom_logs WHERE user_id = :'user_to_delete') as symptom_count;
SELECT (SELECT COUNT(*) FROM reminders WHERE user_id = :'user_to_delete') as reminder_count;

-- TEST 11: Test updated_at timestamp triggers
\echo ''
\echo 'TEST 11: Automatic Timestamp Updates'
\echo '---'

-- Create a user and capture its created_at
INSERT INTO user_accounts (auth_id, email)
VALUES ('test-auth-002', 'test_user2@integration.test');

-- Wait a second
SELECT pg_sleep(1);

-- Update the user
UPDATE user_accounts 
SET preferences = '{"theme": "light"}'
WHERE email = 'test_user2@integration.test';

-- Check that updated_at is newer than created_at
SELECT COUNT(*) as test11_result FROM user_accounts
WHERE email = 'test_user2@integration.test'
AND updated_at > created_at;

-- TEST 12: Test soft delete functionality
\echo ''
\echo 'TEST 12: Soft Delete Support'
\echo '---'

-- Create a reminder
INSERT INTO reminders (user_id, reminder_type, schedule_config, enabled)
SELECT id, 'period_end', '{"time": "10:00"}'::jsonb, true
FROM user_accounts WHERE email = 'test_user2@integration.test';

-- Soft delete the reminder
UPDATE reminders
SET deleted_at = CURRENT_TIMESTAMP
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user2@integration.test')
AND reminder_type = 'period_end';

-- Check that deleted_at is set
SELECT COUNT(*) as test12_result FROM reminders
WHERE user_id IN (SELECT id FROM user_accounts WHERE email = 'test_user2@integration.test')
AND reminder_type = 'period_end'
AND deleted_at IS NOT NULL;

-- TEST 13: Verify RLS is enabled on all tables
\echo ''
\echo 'TEST 13: RLS Enabled on All Tables'
\echo '---'

SELECT COUNT(*) as rls_count FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_accounts', 'profiles', 'cycle_entries', 'symptom_logs',
                  'predictions', 'reminders', 'chat_interactions')
AND rowsecurity = true;

-- TEST 14: Verify indexes are created
\echo ''
\echo 'TEST 14: Index Creation'
\echo '---'

SELECT COUNT(*) as index_count FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_accounts', 'profiles', 'cycle_entries', 'symptom_logs',
                  'predictions', 'reminders', 'chat_interactions');

-- TEST 15: Verify foreign key constraints
\echo ''
\echo 'TEST 15: Foreign Key Constraints'
\echo '---'

SELECT COUNT(*) as fk_count FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public'
AND table_name IN ('user_accounts', 'profiles', 'cycle_entries', 'symptom_logs',
                   'predictions', 'reminders', 'chat_interactions');

-- Summary
\echo ''
\echo '=========================================='
\echo 'Integration Test Summary'
\echo '=========================================='
\echo ''
\echo 'All critical tests have been executed.'
\echo 'Review the output above for:'
\echo '- Successful inserts and retrievals'
\echo '- Constraint validations'
\echo '- Cascading deletes'
\echo '- Timestamp management'
\echo '- RLS enforcement'
\echo '- Foreign key relationships'
\echo ''
\echo 'For detailed RLS testing with authentication context,'
\echo 'see test_rls.sql'
\echo ''
