-- RPC Functions for atomic logging operations

-- Function for atomic upsert of daily logs (both cycle entries and symptom logs)
CREATE OR REPLACE FUNCTION upsert_daily_log(
  user_id UUID,
  log_date DATE,
  cycle_data JSONB,
  symptom_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
  cycle_entry_id UUID;
  symptom_log_id UUID;
  result JSONB;
BEGIN
  -- Verify user exists
  SELECT EXISTS(
    SELECT 1 FROM user_accounts 
    WHERE id = user_id AND deleted_at IS NULL
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User not found or deleted';
  END IF;

  -- Upsert cycle entry
  INSERT INTO cycle_entries (user_id, entry_date, flow_intensity, notes, symptoms)
  VALUES (
    user_id,
    log_date,
    (cycle_data->>'flow_intensity')::TEXT,
    cycle_data->>'notes',
    COALESCE((cycle_data->'symptoms')::TEXT[], '{}')
  )
  ON CONFLICT (user_id, entry_date) 
  DO UPDATE SET
    flow_intensity = COALESCE((cycle_data->>'flow_intensity')::TEXT, cycle_entries.flow_intensity),
    notes = COALESCE(cycle_data->>'notes', cycle_entries.notes),
    symptoms = COALESCE((cycle_data->'symptoms')::TEXT[], cycle_entries.symptoms),
    updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO cycle_entry_id;

  -- Upsert symptom log
  INSERT INTO symptom_logs (
    user_id, 
    log_date, 
    mood, 
    pain_level, 
    sleep_quality, 
    other_symptoms, 
    notes
  )
  VALUES (
    user_id,
    log_date,
    COALESCE((symptom_data->>'mood')::INTEGER, symptom_logs.mood),
    COALESCE((symptom_data->>'pain_level')::INTEGER, symptom_logs.pain_level),
    COALESCE((symptom_data->>'sleep_quality')::INTEGER, symptom_logs.sleep_quality),
    COALESCE(symptom_data->'other_symptoms', symptom_logs.other_symptoms, '{}'),
    COALESCE(symptom_data->>'notes', symptom_logs.notes)
  )
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET
    mood = COALESCE((symptom_data->>'mood')::INTEGER, symptom_logs.mood),
    pain_level = COALESCE((symptom_data->>'pain_level')::INTEGER, symptom_logs.pain_level),
    sleep_quality = COALESCE((symptom_data->>'sleep_quality')::INTEGER, symptom_logs.sleep_quality),
    other_symptoms = COALESCE(symptom_data->'other_symptoms', symptom_logs.other_symptoms),
    notes = COALESCE(symptom_data->>'notes', symptom_logs.notes),
    updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO symptom_log_id;

  -- Return result
  result := jsonb_build_object(
    'cycle_entry_id', cycle_entry_id,
    'symptom_log_id', symptom_log_id,
    'user_id', user_id,
    'log_date', log_date,
    'success', true
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id,
      'log_date', log_date
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_daily_log(UUID, DATE, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_log(UUID, DATE, JSONB, JSONB) TO service_role;

-- Function to get comprehensive logs for a date range
CREATE OR REPLACE FUNCTION get_logs_for_date_range(
  user_id UUID,
  start_date DATE,
  end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cycle_entries_data JSONB;
  symptom_logs_data JSONB;
  result JSONB;
BEGIN
  -- Get cycle entries
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ce.id,
      'user_id', ce.user_id,
      'entry_date', ce.entry_date,
      'flow_intensity', ce.flow_intensity,
      'notes', ce.notes,
      'symptoms', ce.symptoms,
      'created_at', ce.created_at,
      'updated_at', ce.updated_at
    )
  )
  INTO cycle_entries_data
  FROM cycle_entries ce
  WHERE ce.user_id = get_logs_for_date_range.user_id
    AND ce.entry_date >= start_date
    AND ce.entry_date <= end_date
    AND ce.deleted_at IS NULL
  ORDER BY ce.entry_date DESC;

  -- Get symptom logs
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sl.id,
      'user_id', sl.user_id,
      'log_date', sl.log_date,
      'mood', sl.mood,
      'pain_level', sl.pain_level,
      'sleep_quality', sl.sleep_quality,
      'other_symptoms', sl.other_symptoms,
      'notes', sl.notes,
      'created_at', sl.created_at,
      'updated_at', sl.updated_at
    )
  )
  INTO symptom_logs_data
  FROM symptom_logs sl
  WHERE sl.user_id = get_logs_for_date_range.user_id
    AND sl.log_date >= start_date
    AND sl.log_date <= end_date
    AND sl.deleted_at IS NULL
  ORDER BY sl.log_date DESC;

  -- Combine results
  result := jsonb_build_object(
    'cycle_entries', COALESCE(cycle_entries_data, '[]'::jsonb),
    'symptom_logs', COALESCE(symptom_logs_data, '[]'::jsonb),
    'date_range', jsonb_build_object('start_date', start_date, 'end_date', end_date),
    'user_id', user_id
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_logs_for_date_range(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_logs_for_date_range(UUID, DATE, DATE) TO service_role;
