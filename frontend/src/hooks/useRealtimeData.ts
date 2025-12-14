import { useState, useEffect, useCallback } from 'react'
import { supabase, subscribeToTable, getCurrentUser } from '@/lib/supabase'
import type { CycleEntry, SymptomLog, RealtimePayload } from '@/types/database'
import { CycleDataService } from '@/lib/data-layer'

interface UseRealtimeDataReturn {
  cycleEntries: CycleEntry[]
  symptomLogs: SymptomLog[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
  isSubscribed: boolean
}

export function useRealtimeData(): UseRealtimeDataReturn {
  const [cycleEntries, setCycleEntries] = useState<CycleEntry[]>([])
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const user = await getCurrentUser()
      if (!user) {
        setCycleEntries([])
        setSymptomLogs([])
        return
      }

      const { cycleEntries: entries, symptomLogs: logs } = await CycleDataService.getLatestLogs(
        user.id,
        100 // Load more entries for better calendar view
      )

      setCycleEntries(entries)
      setSymptomLogs(logs)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await loadData()
  }, [loadData])

  // Setup real-time subscriptions
  useEffect(() => {
    let subscriptions: Array<() => void> = []

    const setupSubscriptions = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          return
        }

        // Subscribe to cycle_entries changes
        const cycleSubscription = subscribeToTable(
          'cycle_entries',
          (payload: RealtimePayload<CycleEntry>) => {
            console.log('Cycle entry change received:', payload)
            
            setCycleEntries(prev => {
              switch (payload.eventType) {
                case 'INSERT':
                  return [...prev, payload.new].sort((a, b) => 
                    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
                  )
                case 'UPDATE':
                  return prev.map(entry => 
                    entry.id === payload.new.id ? payload.new : entry
                  )
                case 'DELETE':
                  return prev.filter(entry => entry.id !== payload.old.id)
                default:
                  return prev
              }
            })
          },
          `user_id=eq.${user.id}`
        )

        // Subscribe to symptom_logs changes
        const symptomSubscription = subscribeToTable(
          'symptom_logs',
          (payload: RealtimePayload<SymptomLog>) => {
            console.log('Symptom log change received:', payload)
            
            setSymptomLogs(prev => {
              switch (payload.eventType) {
                case 'INSERT':
                  return [...prev, payload.new].sort((a, b) => 
                    new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
                  )
                case 'UPDATE':
                  return prev.map(log => 
                    log.id === payload.new.id ? payload.new : log
                  )
                case 'DELETE':
                  return prev.filter(log => log.id !== payload.old.id)
                default:
                  return prev
              }
            })
          },
          `user_id=eq.${user.id}`
        )

        subscriptions.push(cycleSubscription)
        subscriptions.push(symptomSubscription)
        
        setIsSubscribed(true)
      } catch (err) {
        console.error('Error setting up subscriptions:', err)
        setError(err instanceof Error ? err.message : 'Failed to setup real-time subscriptions')
      }
    }

    setupSubscriptions()

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe())
      setIsSubscribed(false)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    cycleEntries,
    symptomLogs,
    loading,
    error,
    refreshData,
    isSubscribed
  }
}
