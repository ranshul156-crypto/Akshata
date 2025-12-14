import { supabase } from './supabase'
import type {
  CycleEntry,
  CycleEntryInsert,
  CycleEntryUpdate,
  SymptomLog,
  SymptomLogInsert,
  SymptomLogUpdate,
  LogEntry,
  SyncQueueItem,
} from '@/types/database'

// Sync Queue Management
class SyncQueue {
  private queue: SyncQueueItem[] = []
  private maxRetries = 3
  private processing = false

  add(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    }
    
    this.queue.push(queueItem)
    this.saveToStorage()
  }

  async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) continue
      
      try {
        await this.processItem(item)
        console.log(`Sync successful for item ${item.id}`)
      } catch (error) {
        console.error(`Sync failed for item ${item.id}:`, error)
        
        if (item.retries < this.maxRetries) {
          item.retries++
          this.queue.push(item)
        } else {
          console.error(`Max retries reached for item ${item.id}`)
        }
      }
    }
    
    this.processing = false
    this.saveToStorage()
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'cycle_entry':
        await this.processCycleEntry(item)
        break
      case 'symptom_log':
        await this.processSymptomLog(item)
        break
      default:
        throw new Error(`Unknown item type: ${item.type}`)
    }
  }

  private async processCycleEntry(item: SyncQueueItem) {
    const { userId, date, data } = item.data
    
    switch (item.action) {
      case 'create':
      case 'update':
        // Check if entry exists
        const { data: existing } = await supabase
          .from('cycle_entries')
          .select('id')
          .eq('user_id', userId)
          .eq('entry_date', date)
          .single()
        
        if (existing) {
          // Update existing entry
          await supabase
            .from('cycle_entries')
            .update(data as CycleEntryUpdate)
            .eq('id', existing.id)
        } else {
          // Create new entry
          await supabase
            .from('cycle_entries')
            .insert({
              user_id: userId,
              entry_date: date,
              ...data,
            } as CycleEntryInsert)
        }
        break
        
      case 'delete':
        await supabase
          .from('cycle_entries')
          .delete()
          .eq('user_id', userId)
          .eq('entry_date', date)
        break
    }
  }

  private async processSymptomLog(item: SyncQueueItem) {
    const { userId, date, data } = item.data
    
    switch (item.action) {
      case 'create':
      case 'update':
        // Check if log exists
        const { data: existing } = await supabase
          .from('symptom_logs')
          .select('id')
          .eq('user_id', userId)
          .eq('log_date', date)
          .single()
        
        if (existing) {
          // Update existing log
          await supabase
            .from('symptom_logs')
            .update(data as SymptomLogUpdate)
            .eq('id', existing.id)
        } else {
          // Create new log
          await supabase
            .from('symptom_logs')
            .insert({
              user_id: userId,
              log_date: date,
              ...data,
            } as SymptomLogInsert)
        }
        break
        
      case 'delete':
        await supabase
          .from('symptom_logs')
          .delete()
          .eq('user_id', userId)
          .eq('log_date', date)
        break
    }
  }

  private saveToStorage() {
    localStorage.setItem('sync_queue', JSON.stringify(this.queue))
  }

  loadFromStorage() {
    const stored = localStorage.getItem('sync_queue')
    if (stored) {
      this.queue = JSON.parse(stored)
    }
  }

  clear() {
    this.queue = []
    localStorage.removeItem('sync_queue')
  }

  getItems(): SyncQueueItem[] {
    return [...this.queue]
  }
}

export const syncQueue = new SyncQueue()

// Atomic logging operations
export class CycleDataService {
  static async logDayEntry(userId: string, entry: LogEntry): Promise<void> {
    const isOnline = navigator.onLine
    
    // Prepare data for both tables
    const cycleData: CycleEntryUpdate | CycleEntryInsert = {
      flow_intensity: entry.flow_intensity,
      symptoms: entry.symptoms,
      notes: entry.notes,
    }
    
    const symptomData: SymptomLogUpdate | SymptomLogInsert = {
      mood: entry.mood,
      pain_level: entry.pain_level,
      sleep_quality: entry.sleep_quality,
      other_symptoms: entry.other_symptoms,
      notes: entry.notes,
    }
    
    if (!isOnline) {
      // Add to sync queue for offline
      syncQueue.add({
        type: 'cycle_entry',
        action: 'upsert',
        data: { userId, date: entry.date, data: cycleData },
      })
      
      syncQueue.add({
        type: 'symptom_log',
        action: 'upsert',
        data: { userId, date: entry.date, data: symptomData },
      })
      
      return
    }
    
    try {
      // Atomic operation using RPC function (if exists)
      const { error } = await supabase.rpc('upsert_daily_log', {
        user_id: userId,
        log_date: entry.date,
        cycle_data: cycleData,
        symptom_data: symptomData,
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Atomic upsert failed, falling back to individual operations:', error)
      
      // Fallback to individual operations with transaction-like behavior
      await this.individualUpsert(userId, entry.date, cycleData, symptomData)
    }
  }

  private static async individualUpsert(
    userId: string,
    date: string,
    cycleData: CycleEntryUpdate | CycleEntryInsert,
    symptomData: SymptomLogUpdate | SymptomLogInsert
  ): Promise<void> {
    // Upsert cycle entry
    const { data: existingCycle } = await supabase
      .from('cycle_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .single()
    
    if (existingCycle) {
      await supabase
        .from('cycle_entries')
        .update(cycleData as CycleEntryUpdate)
        .eq('id', existingCycle.id)
    } else {
      await supabase
        .from('cycle_entries')
        .insert({
          user_id: userId,
          entry_date: date,
          ...cycleData,
        } as CycleEntryInsert)
    }
    
    // Upsert symptom log
    const { data: existingSymptom } = await supabase
      .from('symptom_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', date)
      .single()
    
    if (existingSymptom) {
      await supabase
        .from('symptom_logs')
        .update(symptomData as SymptomLogUpdate)
        .eq('id', existingSymptom.id)
    } else {
      await supabase
        .from('symptom_logs')
        .insert({
          user_id: userId,
          log_date: date,
          ...symptomData,
        } as SymptomLogInsert)
    }
  }

  static async getLogsForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ cycleEntries: CycleEntry[]; symptomLogs: SymptomLog[] }> {
    const [cycleResult, symptomResult] = await Promise.all([
      supabase
        .from('cycle_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: false }),
      
      supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date', { ascending: false }),
    ])
    
    return {
      cycleEntries: cycleResult.data || [],
      symptomLogs: symptomResult.data || [],
    }
  }

  static async getLatestLogs(userId: string, limit = 10): Promise<{ cycleEntries: CycleEntry[]; symptomLogs: SymptomLog[] }> {
    const [cycleResult, symptomResult] = await Promise.all([
      supabase
        .from('cycle_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .limit(limit),
      
      supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(limit),
    ])
    
    return {
      cycleEntries: cycleResult.data || [],
      symptomLogs: symptomResult.data || [],
    }
  }
}

// Conflict resolution
export class ConflictResolver {
  static resolveLocalVsRemote<T extends { updated_at: string }>(
    local: T,
    remote: T
  ): T {
    const localTime = new Date(local.updated_at).getTime()
    const remoteTime = new Date(remote.updated_at).getTime()
    
    // Latest edit wins
    return remoteTime > localTime ? remote : local
  }
}
