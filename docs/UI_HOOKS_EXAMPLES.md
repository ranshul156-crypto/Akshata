# UI Hooks and Integration Examples

This document provides examples of how to integrate predictions and reminders into a frontend UI.

## Table of Contents

- [Fetching Predictions](#fetching-predictions)
- [Displaying Calendar with Predictions](#displaying-calendar-with-predictions)
- [Managing Reminders](#managing-reminders)
- [Summary Cards](#summary-cards)
- [Supabase Client Setup](#supabase-client-setup)

## Supabase Client Setup

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Fetching Predictions

### Get Latest Prediction

```typescript
async function getLatestPrediction(userId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('prediction_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching prediction:', error);
    return null;
  }

  return data;
}
```

### Get Predictions for Date Range

```typescript
async function getPredictionsForRange(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .gte('cycle_start_date', startDate)
    .lte('cycle_start_date', endDate)
    .order('prediction_date', { ascending: false });

  if (error) {
    console.error('Error fetching predictions:', error);
    return [];
  }

  return data;
}
```

### Trigger Manual Prediction

```typescript
async function triggerPrediction(userId: string) {
  const { data, error } = await supabase.functions.invoke('predict-cycle', {
    body: { user_id: userId }
  });

  if (error) {
    console.error('Error triggering prediction:', error);
    return null;
  }

  return data;
}
```

## Displaying Calendar with Predictions

### React Hook for Calendar

```typescript
import { useState, useEffect } from 'react';

interface CalendarDay {
  date: string;
  isPredictedPeriod: boolean;
  isFertileWindow: boolean;
  confidence?: number;
}

function useCalendarWithPredictions(userId: string, month: Date) {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCalendarData() {
      setLoading(true);

      // Get start and end of month
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      // Fetch predictions
      const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
        .gte('cycle_start_date', startDate)
        .lte('cycle_start_date', endDate);

      // Build calendar days
      const days: CalendarDay[] = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if date is in predicted period
        const prediction = predictions?.find(p => {
          const periodStart = new Date(p.cycle_start_date);
          const periodEnd = new Date(p.cycle_end_date);
          const date = new Date(dateStr);
          return date >= periodStart && date <= periodEnd;
        });

        // Check if date is in fertile window
        const fertileWindowPrediction = predictions?.find(p => {
          const fertilityStart = p.metadata?.fertility_window_start 
            ? new Date(p.metadata.fertility_window_start) 
            : null;
          const fertilityEnd = p.metadata?.fertility_window_end 
            ? new Date(p.metadata.fertility_window_end) 
            : null;
          const date = new Date(dateStr);
          return fertilityStart && fertilityEnd && date >= fertilityStart && date <= fertilityEnd;
        });

        days.push({
          date: dateStr,
          isPredictedPeriod: !!prediction,
          isFertileWindow: !!fertileWindowPrediction,
          confidence: prediction?.confidence || fertileWindowPrediction?.confidence
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      setCalendarDays(days);
      setLoading(false);
    }

    loadCalendarData();
  }, [userId, month]);

  return { calendarDays, loading };
}

// Usage in component
function Calendar({ userId }: { userId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { calendarDays, loading } = useCalendarWithPredictions(userId, currentMonth);

  if (loading) return <div>Loading calendar...</div>;

  return (
    <div className="calendar-grid">
      {calendarDays.map(day => (
        <div 
          key={day.date} 
          className={`
            calendar-day
            ${day.isPredictedPeriod ? 'predicted-period' : ''}
            ${day.isFertileWindow ? 'fertile-window' : ''}
          `}
        >
          <span className="date">{new Date(day.date).getDate()}</span>
          {day.isPredictedPeriod && (
            <span className="badge period-badge">
              Period {day.confidence && `(${Math.round(day.confidence * 100)}%)`}
            </span>
          )}
          {day.isFertileWindow && (
            <span className="badge fertile-badge">Fertile</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Managing Reminders

### Fetch User's Reminders

```typescript
async function getReminders(userId: string) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }

  return data;
}
```

### Create New Reminder

```typescript
interface CreateReminderInput {
  user_id: string;
  reminder_type: 'period_start' | 'period_end' | 'fertile_window' | 'medication' | 'hydration' | 'custom';
  schedule_config: {
    time?: string;
    days_before?: number;
    frequency?: 'daily' | 'once';
    custom_message?: string;
  };
  enabled?: boolean;
}

async function createReminder(input: CreateReminderInput) {
  const { data, error } = await supabase
    .from('reminders')
    .insert([input])
    .select()
    .single();

  if (error) {
    console.error('Error creating reminder:', error);
    return null;
  }

  return data;
}
```

### Update Reminder

```typescript
async function updateReminder(reminderId: string, updates: Partial<CreateReminderInput>) {
  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating reminder:', error);
    return null;
  }

  return data;
}
```

### Toggle Reminder (Enable/Disable)

```typescript
async function toggleReminder(reminderId: string, enabled: boolean) {
  const { data, error } = await supabase
    .from('reminders')
    .update({ enabled })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling reminder:', error);
    return null;
  }

  return data;
}
```

### Soft Delete Reminder

```typescript
async function deleteReminder(reminderId: string) {
  const { data, error } = await supabase
    .from('reminders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('Error deleting reminder:', error);
    return null;
  }

  return data;
}
```

### React Hook for Reminders

```typescript
function useReminders(userId: string) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReminders() {
      setLoading(true);
      const data = await getReminders(userId);
      setReminders(data);
      setLoading(false);
    }

    loadReminders();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReminders(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReminders(prev =>
              prev.map(r => (r.id === payload.new.id ? payload.new : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setReminders(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { reminders, loading };
}
```

## Summary Cards

### Next Period Card

```typescript
function NextPeriodCard({ userId }: { userId: string }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrediction() {
      const latest = await getLatestPrediction(userId);
      setPrediction(latest);
      setLoading(false);
    }
    loadPrediction();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!prediction) return <div>No prediction available</div>;

  const daysUntil = Math.ceil(
    (new Date(prediction.cycle_start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="card next-period-card">
      <h3>Next Period</h3>
      <p className="date">{prediction.cycle_start_date}</p>
      <p className="days-until">
        {daysUntil > 0 ? `in ${daysUntil} days` : 'Started'}
      </p>
      <div className="confidence">
        <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{ width: `${prediction.confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Fertility Window Card

```typescript
function FertilityWindowCard({ userId }: { userId: string }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrediction() {
      const latest = await getLatestPrediction(userId);
      setPrediction(latest);
      setLoading(false);
    }
    loadPrediction();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!prediction || !prediction.metadata?.fertility_window_start) {
    return <div>No fertility data available</div>;
  }

  const startDate = new Date(prediction.metadata.fertility_window_start);
  const endDate = new Date(prediction.metadata.fertility_window_end);
  const now = new Date();
  const isActive = now >= startDate && now <= endDate;

  return (
    <div className={`card fertility-card ${isActive ? 'active' : ''}`}>
      <h3>Fertility Window</h3>
      <p className="date-range">
        {prediction.metadata.fertility_window_start} - {prediction.metadata.fertility_window_end}
      </p>
      {isActive && <span className="badge active-badge">Active Now</span>}
    </div>
  );
}
```

### Reminders List Component

```typescript
function RemindersList({ userId }: { userId: string }) {
  const { reminders, loading } = useReminders(userId);

  const handleToggle = async (reminderId: string, enabled: boolean) => {
    await toggleReminder(reminderId, !enabled);
  };

  const handleDelete = async (reminderId: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      await deleteReminder(reminderId);
    }
  };

  if (loading) return <div>Loading reminders...</div>;

  return (
    <div className="reminders-list">
      <h3>Your Reminders</h3>
      {reminders.length === 0 ? (
        <p>No reminders configured</p>
      ) : (
        <ul>
          {reminders.map(reminder => (
            <li key={reminder.id} className="reminder-item">
              <div className="reminder-info">
                <strong>{reminder.reminder_type.replace('_', ' ')}</strong>
                {reminder.schedule_config.time && (
                  <span className="time">at {reminder.schedule_config.time}</span>
                )}
                {reminder.schedule_config.days_before && (
                  <span className="days">{reminder.schedule_config.days_before} days before</span>
                )}
              </div>
              <div className="reminder-actions">
                <button
                  onClick={() => handleToggle(reminder.id, reminder.enabled)}
                  className={reminder.enabled ? 'enabled' : 'disabled'}
                >
                  {reminder.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button onClick={() => handleDelete(reminder.id)} className="delete">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Real-time Updates

### Subscribe to Prediction Changes

```typescript
function usePredictionSubscription(userId: string) {
  const [latestPrediction, setLatestPrediction] = useState(null);

  useEffect(() => {
    // Initial fetch
    getLatestPrediction(userId).then(setLatestPrediction);

    // Subscribe to changes
    const subscription = supabase
      .channel('predictions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setLatestPrediction(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return latestPrediction;
}
```

## Complete Dashboard Example

```typescript
function Dashboard({ userId }: { userId: string }) {
  return (
    <div className="dashboard">
      <div className="summary-cards">
        <NextPeriodCard userId={userId} />
        <FertilityWindowCard userId={userId} />
      </div>

      <div className="main-content">
        <Calendar userId={userId} />
        <RemindersList userId={userId} />
      </div>
    </div>
  );
}
```

## Styling Examples

```css
/* Calendar Styles */
.calendar-day.predicted-period {
  background-color: #ffe6e6;
  border: 2px solid #ff6b6b;
}

.calendar-day.fertile-window {
  background-color: #e6f7ff;
  border: 2px solid #40a9ff;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.period-badge {
  background-color: #ff6b6b;
  color: white;
}

.fertile-badge {
  background-color: #40a9ff;
  color: white;
}

/* Card Styles */
.card {
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  background: white;
}

.confidence-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(to right, #ff6b6b, #51cf66);
  transition: width 0.3s ease;
}

/* Reminders Styles */
.reminder-item {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.reminder-actions button.enabled {
  background-color: #51cf66;
  color: white;
}

.reminder-actions button.disabled {
  background-color: #adb5bd;
  color: white;
}
```

## Testing

You can test these integrations using the Supabase Studio or curl:

```bash
# Test fetching predictions
curl -X GET "http://localhost:54321/rest/v1/predictions?user_id=eq.USER_ID" \
  -H "Authorization: Bearer ANON_KEY" \
  -H "apikey: ANON_KEY"

# Test creating a reminder
curl -X POST "http://localhost:54321/rest/v1/reminders" \
  -H "Authorization: Bearer ANON_KEY" \
  -H "apikey: ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "reminder_type": "period_start",
    "schedule_config": {"days_before": 3, "time": "09:00"},
    "enabled": true
  }'
```
