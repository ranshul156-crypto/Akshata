import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Reminder {
  id: string;
  user_id: string;
  reminder_type: string;
  schedule_config: {
    time?: string;
    days_before?: number;
    frequency?: string;
    custom_message?: string;
  };
  enabled: boolean;
}

interface User {
  id: string;
  email: string;
}

interface Prediction {
  cycle_start_date: string;
  cycle_end_date: string;
  metadata: {
    fertility_window_start?: string;
    fertility_window_end?: string;
  };
}

function shouldSendReminder(reminder: Reminder, prediction: Prediction | null): boolean {
  if (!reminder.enabled) return false;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (reminder.reminder_type === 'medication' || reminder.reminder_type === 'hydration') {
    const frequency = reminder.schedule_config.frequency || 'daily';
    if (frequency === 'daily') {
      return true;
    }
  }

  if (!prediction) return false;

  const daysBefore = reminder.schedule_config.days_before || 3;
  
  if (reminder.reminder_type === 'period_start') {
    const periodStart = new Date(prediction.cycle_start_date);
    const reminderDate = new Date(periodStart);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    return reminderDate.toISOString().split('T')[0] === today;
  }

  if (reminder.reminder_type === 'period_end') {
    const periodEnd = new Date(prediction.cycle_end_date);
    const reminderDate = new Date(periodEnd);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    return reminderDate.toISOString().split('T')[0] === today;
  }

  if (reminder.reminder_type === 'fertile_window') {
    const fertilityStart = prediction.metadata.fertility_window_start;
    if (!fertilityStart) return false;
    const fertilityDate = new Date(fertilityStart);
    const reminderDate = new Date(fertilityDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    return reminderDate.toISOString().split('T')[0] === today;
  }

  return false;
}

function generateReminderMessage(reminder: Reminder, prediction: Prediction | null): string {
  if (reminder.schedule_config.custom_message) {
    return reminder.schedule_config.custom_message;
  }

  switch (reminder.reminder_type) {
    case 'period_start':
      return prediction
        ? `Your period is expected to start around ${prediction.cycle_start_date}. Stay prepared!`
        : 'Period reminder';
    
    case 'period_end':
      return prediction
        ? `Your period is expected to end around ${prediction.cycle_end_date}.`
        : 'Period end reminder';
    
    case 'fertile_window':
      return prediction && prediction.metadata.fertility_window_start
        ? `Your fertile window starts around ${prediction.metadata.fertility_window_start}.`
        : 'Fertility window reminder';
    
    case 'medication':
      return 'Time to take your medication.';
    
    case 'hydration':
      return 'Remember to stay hydrated!';
    
    default:
      return 'Reminder notification';
  }
}

async function sendNotification(user: User, message: string, reminderType: string): Promise<boolean> {
  const emailService = Deno.env.get('EMAIL_SERVICE_URL');
  const emailApiKey = Deno.env.get('EMAIL_API_KEY');

  if (emailService && emailApiKey) {
    try {
      const response = await fetch(emailService, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          subject: `Cycle Tracker Reminder: ${reminderType}`,
          body: message,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  console.log(`[IN-APP NOTIFICATION] User: ${user.email}, Type: ${reminderType}, Message: ${message}`);
  return true;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'POST, OPTIONS', 
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
        } 
      });
    }

    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('enabled', true)
      .is('deleted_at', null);

    if (remindersError) {
      throw new Error(`Failed to fetch reminders: ${remindersError.message}`);
    }

    const results = [];

    for (const reminder of reminders || []) {
      const { data: user, error: userError } = await supabase
        .from('user_accounts')
        .select('id, email')
        .eq('id', reminder.user_id)
        .is('deleted_at', null)
        .single();

      if (userError || !user) {
        console.error(`User not found for reminder ${reminder.id}`);
        continue;
      }

      const { data: prediction, error: predictionError } = await supabase
        .from('predictions')
        .select('cycle_start_date, cycle_end_date, metadata')
        .eq('user_id', reminder.user_id)
        .order('prediction_date', { ascending: false })
        .limit(1)
        .single();

      if (predictionError && reminder.reminder_type !== 'medication' && reminder.reminder_type !== 'hydration') {
        console.log(`No prediction found for user ${reminder.user_id}`);
        continue;
      }

      if (shouldSendReminder(reminder, prediction)) {
        const message = generateReminderMessage(reminder, prediction);
        const sent = await sendNotification(user, message, reminder.reminder_type);
        
        results.push({
          reminder_id: reminder.id,
          user_id: reminder.user_id,
          reminder_type: reminder.reminder_type,
          sent,
          message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: reminders?.length || 0,
        sent: results.length,
        results 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Error in send-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
