-- Update reminder types to include medication and hydration
-- Drop the existing constraint and add a new one with additional types

ALTER TABLE public.reminders 
  DROP CONSTRAINT IF EXISTS reminders_reminder_type_check;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_reminder_type_check 
  CHECK (reminder_type IN ('period_start', 'period_end', 'fertile_window', 'medication', 'hydration', 'custom'));

-- Add comment for documentation
COMMENT ON COLUMN public.reminders.reminder_type IS 'Type of reminder: period_start, period_end, fertile_window, medication, hydration, or custom';
