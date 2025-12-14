// Database types based on the Supabase schema

export interface UserAccount {
  id: string
  auth_id: string
  email: string
  created_at: string
  updated_at: string
  deleted_at?: string
  preferences: Record<string, any>
  is_anonymized: boolean
  analytics_opt_in: boolean
}

export interface Profile {
  id: string
  user_id: string
  cycle_length_days: number
  period_length_days: number
  first_name?: string
  last_name?: string
  date_of_birth?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type FlowIntensity = 'light' | 'medium' | 'heavy' | 'spotting' | 'none'

export interface CycleEntry {
  id: string
  user_id: string
  entry_date: string
  flow_intensity?: FlowIntensity
  notes?: string
  symptoms: string[]
  created_at: string
  updated_at: string
}

export interface SymptomLog {
  id: string
  user_id: string
  log_date: string
  mood?: number // 1-10
  pain_level?: number // 0-10
  sleep_quality?: number // 1-10
  other_symptoms: Record<string, any>
  notes?: string
  created_at: string
  updated_at: string
}

export type PredictionSource = 'historical' | 'ai' | 'user_input' | 'hybrid'

export interface Prediction {
  id: string
  user_id: string
  prediction_date: string
  cycle_start_date?: string
  cycle_end_date?: string
  confidence: number // 0.00-1.00
  source: PredictionSource
  created_at: string
  updated_at: string
}

export type ReminderType = 'period_start' | 'period_end' | 'fertile_window' | 'custom'

export interface Reminder {
  id: string
  user_id: string
  reminder_type: ReminderType
  schedule_config: Record<string, any>
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface ChatInteraction {
  id: string
  user_id: string
  prompt: string
  response: string
  response_metadata: Record<string, any>
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Combined logging data types
export interface LogEntry {
  date: string
  flow_intensity?: FlowIntensity
  symptoms: string[]
  mood?: number
  pain_level?: number
  sleep_quality?: number
  medications: string[]
  notes?: string
  other_symptoms: Record<string, any>
}

// Database insert types
export interface CycleEntryInsert {
  user_id: string
  entry_date: string
  flow_intensity?: FlowIntensity
  notes?: string
  symptoms?: string[]
}

export interface SymptomLogInsert {
  user_id: string
  log_date: string
  mood?: number
  pain_level?: number
  sleep_quality?: number
  other_symptoms?: Record<string, any>
  notes?: string
}

// Database update types
export interface CycleEntryUpdate {
  flow_intensity?: FlowIntensity
  notes?: string
  symptoms?: string[]
}

export interface SymptomLogUpdate {
  mood?: number
  pain_level?: number
  sleep_quality?: number
  other_symptoms?: Record<string, any>
  notes?: string
}

// Real-time subscription types
export interface RealtimePayload<T> {
  new: T
  old: T
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
}

export interface SyncQueueItem {
  id: string
  type: 'cycle_entry' | 'symptom_log'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  retries: number
  lastError?: string
}
