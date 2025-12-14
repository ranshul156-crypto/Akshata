-- Initial Schema Setup for Menstrual Cycle Tracking Application
-- Covers all required entities with RLS, indexes, and foreign keys

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER ACCOUNT TABLE
-- ============================================================================
CREATE TABLE public.user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE, -- Supabase Auth UID
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete timestamp
  preferences JSONB DEFAULT '{}',
  is_anonymized BOOLEAN DEFAULT false,
  analytics_opt_in BOOLEAN DEFAULT true
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_accounts_auth_id ON public.user_accounts(auth_id);
CREATE INDEX idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX idx_user_accounts_created_at ON public.user_accounts(created_at);
CREATE INDEX idx_user_accounts_deleted_at ON public.user_accounts(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies for user_accounts
CREATE POLICY "Users can view their own account"
  ON public.user_accounts
  FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update their own account"
  ON public.user_accounts
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Service role can manage all accounts"
  ON public.user_accounts
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PROFILE TABLE
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  cycle_length_days INT DEFAULT 28,
  period_length_days INT DEFAULT 5,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cycle_length_valid CHECK (cycle_length_days >= 21 AND cycle_length_days <= 35),
  CONSTRAINT period_length_valid CHECK (period_length_days >= 3 AND period_length_days <= 10)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- CYCLE ENTRY TABLE
-- ============================================================================
CREATE TABLE public.cycle_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  flow_intensity TEXT CHECK (flow_intensity IN ('light', 'medium', 'heavy', 'spotting', 'none')),
  notes TEXT,
  symptoms JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entry_date)
);

ALTER TABLE public.cycle_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cycle_entries_user_id ON public.cycle_entries(user_id);
CREATE INDEX idx_cycle_entries_entry_date ON public.cycle_entries(entry_date);
CREATE INDEX idx_cycle_entries_user_date ON public.cycle_entries(user_id, entry_date DESC);

-- RLS Policies for cycle_entries
CREATE POLICY "Users can view their own cycle entries"
  ON public.cycle_entries
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their own cycle entries"
  ON public.cycle_entries
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own cycle entries"
  ON public.cycle_entries
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own cycle entries"
  ON public.cycle_entries
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all cycle entries"
  ON public.cycle_entries
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- SYMPTOM LOG TABLE
-- ============================================================================
CREATE TABLE public.symptom_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mood INT CHECK (mood >= 1 AND mood <= 10),
  pain_level INT CHECK (pain_level >= 0 AND pain_level <= 10),
  sleep_quality INT CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  other_symptoms JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, log_date)
);

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_symptom_logs_user_id ON public.symptom_logs(user_id);
CREATE INDEX idx_symptom_logs_log_date ON public.symptom_logs(log_date);
CREATE INDEX idx_symptom_logs_user_date ON public.symptom_logs(user_id, log_date DESC);

-- RLS Policies for symptom_logs
CREATE POLICY "Users can view their own symptom logs"
  ON public.symptom_logs
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their own symptom logs"
  ON public.symptom_logs
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own symptom logs"
  ON public.symptom_logs
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own symptom logs"
  ON public.symptom_logs
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all symptom logs"
  ON public.symptom_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PREDICTION TABLE
-- ============================================================================
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  cycle_start_date DATE,
  cycle_end_date DATE,
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT CHECK (source IN ('historical', 'ai', 'user_input', 'hybrid')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX idx_predictions_prediction_date ON public.predictions(prediction_date);
CREATE INDEX idx_predictions_user_date ON public.predictions(user_id, prediction_date DESC);

-- RLS Policies for predictions
CREATE POLICY "Users can view their own predictions"
  ON public.predictions
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their own predictions"
  ON public.predictions
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own predictions"
  ON public.predictions
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all predictions"
  ON public.predictions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- REMINDER TABLE
-- ============================================================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('period_start', 'period_end', 'fertile_window', 'custom')),
  schedule_config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_enabled ON public.reminders(enabled);
CREATE INDEX idx_reminders_user_enabled ON public.reminders(user_id, enabled);

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
  ON public.reminders
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Users can create their own reminders"
  ON public.reminders
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own reminders"
  ON public.reminders
  FOR UPDATE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders
  FOR DELETE
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all reminders"
  ON public.reminders
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- CHAT INTERACTION TABLE
-- ============================================================================
CREATE TABLE public.chat_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT,
  response_metadata JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.chat_interactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_interactions_user_id ON public.chat_interactions(user_id);
CREATE INDEX idx_chat_interactions_created_at ON public.chat_interactions(created_at DESC);
CREATE INDEX idx_chat_interactions_user_created ON public.chat_interactions(user_id, created_at DESC);

-- RLS Policies for chat_interactions
CREATE POLICY "Users can view their own chat interactions"
  ON public.chat_interactions
  FOR SELECT
  USING (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create chat interactions"
  ON public.chat_interactions
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.user_accounts WHERE auth_id = auth.uid()));

CREATE POLICY "Service role can manage all chat interactions"
  ON public.chat_interactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Soft delete function for user accounts
CREATE OR REPLACE FUNCTION soft_delete_user_account(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_accounts
  SET deleted_at = CURRENT_TIMESTAMP
  WHERE id = user_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Export user data function
CREATE OR REPLACE FUNCTION export_user_data(user_id UUID)
RETURNS TABLE (
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'account', row_to_json(ua.*),
    'profile', row_to_json(p.*),
    'cycle_entries', jsonb_agg(row_to_json(ce.*)),
    'symptom_logs', jsonb_agg(row_to_json(sl.*)),
    'predictions', jsonb_agg(row_to_json(pr.*)),
    'reminders', jsonb_agg(row_to_json(r.*)
    )
  )
  FROM public.user_accounts ua
  LEFT JOIN public.profiles p ON ua.id = p.user_id
  LEFT JOIN public.cycle_entries ce ON ua.id = ce.user_id
  LEFT JOIN public.symptom_logs sl ON ua.id = sl.user_id
  LEFT JOIN public.predictions pr ON ua.id = pr.user_id
  LEFT JOIN public.reminders r ON ua.id = r.user_id AND r.deleted_at IS NULL
  WHERE ua.id = user_id
  GROUP BY ua.id, p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER FUNCTIONS FOR AGGREGATES
-- ============================================================================

-- Function to update user account's updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_accounts updated_at
CREATE TRIGGER update_user_accounts_timestamp
BEFORE UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION update_user_accounts_updated_at();

-- Function to update profile's updated_at timestamp
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Function to update cycle_entries updated_at timestamp
CREATE OR REPLACE FUNCTION update_cycle_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cycle_entries updated_at
CREATE TRIGGER update_cycle_entries_timestamp
BEFORE UPDATE ON public.cycle_entries
FOR EACH ROW
EXECUTE FUNCTION update_cycle_entries_updated_at();

-- Function to update symptom_logs updated_at timestamp
CREATE OR REPLACE FUNCTION update_symptom_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for symptom_logs updated_at
CREATE TRIGGER update_symptom_logs_timestamp
BEFORE UPDATE ON public.symptom_logs
FOR EACH ROW
EXECUTE FUNCTION update_symptom_logs_updated_at();

-- Function to update predictions updated_at timestamp
CREATE OR REPLACE FUNCTION update_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for predictions updated_at
CREATE TRIGGER update_predictions_timestamp
BEFORE UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION update_predictions_updated_at();

-- Function to update reminders updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reminders updated_at
CREATE TRIGGER update_reminders_timestamp
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION update_reminders_updated_at();

-- Function to update chat_interactions updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for chat_interactions updated_at
CREATE TRIGGER update_chat_interactions_timestamp
BEFORE UPDATE ON public.chat_interactions
FOR EACH ROW
EXECUTE FUNCTION update_chat_interactions_updated_at();
