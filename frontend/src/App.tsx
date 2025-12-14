import React, { useState } from 'react'
import { Calendar } from '@/components/calendar/Calendar'
import { Timeline } from '@/components/timeline/Timeline'
import { LogEntryForm } from '@/components/forms/LogEntryForm'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { useSyncManager } from '@/hooks/useSyncManager'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, isOnline } from '@/lib/supabase'
import { Plus, Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showLogForm, setShowLogForm] = useState(false)
  const [showLogFormForDate, setShowLogFormForDate] = useState<Date>(new Date())
  
  const { cycleEntries, symptomLogs, loading, error, refreshData, isSubscribed } = useRealtimeData()
  const { isOnline: online, isProcessing, pendingItems, retryFailedItems, clearQueue } = useSyncManager()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Load current user
  React.useEffect(() => {
    getCurrentUser().then(user => setCurrentUser(user))
  }, [])

  // Show toast notifications for sync status
  React.useEffect(() => {
    if (online && pendingItems.length > 0) {
      toast({
        title: "Syncing changes...",
        description: `${pendingItems.length} changes waiting to sync`,
        variant: "warning"
      })
    } else if (!online && pendingItems.length > 0) {
      toast({
        title: "You're offline",
        description: "Your changes will sync when you're back online",
        variant: "warning"
      })
    }
  }, [online, pendingItems.length, toast])

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowLogFormForDate(date)
    setShowLogForm(true)
  }

  const handleQuickLog = (date: Date) => {
    setShowLogFormForDate(date)
    setShowLogForm(true)
  }

  const handleLogSuccess = () => {
    refreshData()
    toast({
      title: "Entry saved!",
      description: "Your logging data has been saved successfully",
      variant: "success"
    })
  }

  const handleManualRetry = () => {
    retryFailedItems()
    toast({
      title: "Retrying sync...",
      description: "Attempting to sync pending changes"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your cycle data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error loading data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Cycle Tracker</h1>
            <p className="text-muted-foreground mt-1">
              Track your menstrual cycle and symptoms
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
              online ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{online ? 'Online' : 'Offline'}</span>
            </div>

            {/* Sync Status */}
            {pendingItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRetry}
                  disabled={isProcessing || !online}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {isProcessing ? 'Syncing...' : `Sync ${pendingItems.length}`}
                </Button>
              </div>
            )}

            {/* Real-time Status */}
            {isSubscribed && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updates active"></div>
            )}

            {/* Log Today Button */}
            <Button
              onClick={() => handleQuickLog(new Date())}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log Today
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <div className="space-y-6">
            <Calendar
              onDateClick={handleDateClick}
              onQuickLog={handleQuickLog}
              cycleEntries={cycleEntries}
              symptomLogs={symptomLogs}
              currentUserId={currentUser?.id || ''}
            />
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <Timeline
              cycleEntries={cycleEntries}
              symptomLogs={symptomLogs}
              onEdit={handleDateClick}
            />
          </div>
        </div>

        {/* Log Entry Form */}
        <LogEntryForm
          open={showLogForm}
          onOpenChange={setShowLogForm}
          initialDate={showLogFormForDate}
          onSuccess={handleLogSuccess}
        />

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </div>
  )
}

export default App
