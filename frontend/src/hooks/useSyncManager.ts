import { useState, useEffect, useCallback } from 'react'
import { isOnline, addOnlineListener } from '@/lib/supabase'
import { syncQueue } from '@/lib/data-layer'
import type { SyncQueueItem } from '@/types/database'

interface SyncState {
  isOnline: boolean
  isProcessing: boolean
  pendingItems: SyncQueueItem[]
  lastSyncTime?: Date
  syncErrors: string[]
}

export function useSyncManager() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isProcessing: false,
    pendingItems: [],
    syncErrors: []
  })

  const processQueue = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isProcessing: true }))
    
    try {
      await syncQueue.process()
      const items = syncQueue.getItems()
      setSyncState(prev => ({
        ...prev,
        isProcessing: false,
        pendingItems: items,
        lastSyncTime: new Date(),
        syncErrors: items.filter(item => item.lastError).map(item => item.lastError!)
      }))
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        isProcessing: false,
        syncErrors: [...prev.syncErrors, error instanceof Error ? error.message : 'Unknown error']
      }))
    }
  }, [])

  const retryFailedItems = useCallback(() => {
    processQueue()
  }, [processQueue])

  const clearQueue = useCallback(() => {
    syncQueue.clear()
    setSyncState(prev => ({
      ...prev,
      pendingItems: [],
      syncErrors: []
    }))
  }, [])

  // Load initial sync state
  useEffect(() => {
    syncQueue.loadFromStorage()
    const items = syncQueue.getItems()
    setSyncState(prev => ({
      ...prev,
      isOnline: isOnline(),
      pendingItems: items
    }))
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const removeListener = addOnlineListener((online) => {
      setSyncState(prev => ({ ...prev, isOnline: online }))
      
      if (online && syncQueue.getItems().length > 0) {
        // Auto-sync when coming back online
        setTimeout(() => processQueue(), 1000)
      }
    })

    return removeListener
  }, [processQueue])

  // Periodic sync check (every 30 seconds when online)
  useEffect(() => {
    if (!syncState.isOnline) return

    const interval = setInterval(() => {
      if (syncQueue.getItems().length > 0) {
        processQueue()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [syncState.isOnline, processQueue])

  return {
    ...syncState,
    processQueue,
    retryFailedItems,
    clearQueue
  }
}
