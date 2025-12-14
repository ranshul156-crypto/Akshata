import React, { useState, useEffect } from 'react'
import { format, addMonths, subMonths, isSameMonth, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateCalendarGrid } from '@/lib/utils'
import type { CycleEntry, SymptomLog } from '@/types/database'

interface CalendarProps {
  onDateClick: (date: Date) => void
  onQuickLog: (date: Date) => void
  cycleEntries: CycleEntry[]
  symptomLogs: SymptomLog[]
  currentUserId: string
}

interface CalendarEntry {
  date: Date
  cycleEntry?: CycleEntry
  symptomLog?: SymptomLog
  hasLogEntry: boolean
  hasSymptoms: boolean
  flowIntensity?: string
  mood?: number
  painLevel?: number
}

export function Calendar({ 
  onDateClick, 
  onQuickLog, 
  cycleEntries, 
  symptomLogs, 
  currentUserId 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<Map<string, CalendarEntry>>(new Map())

  // Process entries into calendar format
  useEffect(() => {
    const dataMap = new Map<string, CalendarEntry>()
    
    // Process cycle entries
    cycleEntries.forEach(entry => {
      const date = new Date(entry.entry_date)
      const dateKey = date.toISOString().split('T')[0]
      dataMap.set(dateKey, {
        date,
        cycleEntry: entry,
        hasLogEntry: true,
        hasSymptoms: entry.symptoms && entry.symptoms.length > 0,
        flowIntensity: entry.flow_intensity
      })
    })

    // Merge symptom logs
    symptomLogs.forEach(log => {
      const date = new Date(log.log_date)
      const dateKey = date.toISOString().split('T')[0]
      const existing = dataMap.get(dateKey)
      
      if (existing) {
        existing.symptomLog = log
        existing.mood = log.mood
        existing.painLevel = log.pain_level
      } else {
        dataMap.set(dateKey, {
          date,
          symptomLog: log,
          hasLogEntry: false,
          hasSymptoms: Object.keys(log.other_symptoms).length > 0,
          mood: log.mood,
          painLevel: log.pain_level
        })
      }
    })

    setCalendarData(dataMap)
  }, [cycleEntries, symptomLogs])

  const calendarGrid = generateCalendarGrid(currentDate, true)
  
  const getDateClasses = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    const entry = calendarData.get(dateKey)
    
    let classes = "relative w-full h-24 p-2 border border-border hover:bg-accent transition-colors cursor-pointer "
    
    if (!isSameMonth(date, currentDate)) {
      classes += "text-muted-foreground bg-muted/30 "
    }
    
    if (isToday(date)) {
      classes += "bg-primary/10 border-primary "
    }
    
    if (entry?.hasLogEntry) {
      classes += "bg-blue-50 dark:bg-blue-950/20 "
    }
    
    if (entry?.hasSymptoms) {
      classes += "bg-orange-50 dark:bg-orange-950/20 "
    }
    
    if (entry?.flowIntensity) {
      classes += "border-l-4 border-l-red-400 "
    }
    
    return classes
  }

  const getDayContent = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    const entry = calendarData.get(dateKey)
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${isToday(date) ? 'font-bold text-primary' : ''}`}>
            {date.getDate()}
          </span>
          
          {/* Quick Add Button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/20"
            onClick={(e) => {
              e.stopPropagation()
              onQuickLog(date)
            }}
            title={`Quick log for ${format(date, 'MMM d')}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Entry Indicators */}
        {entry && (
          <div className="space-y-1">
            {entry.flowIntensity && (
              <div className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1 py-0.5 rounded">
                {entry.flowIntensity}
              </div>
            )}
            
            {entry.mood && (
              <div className="flex items-center space-x-1">
                <span className="text-xs">😊</span>
                <span className="text-xs">{entry.mood}</span>
              </div>
            )}
            
            {entry.painLevel && entry.painLevel > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs">😣</span>
                <span className="text-xs">{entry.painLevel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-background border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {calendarGrid.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`group ${getDateClasses(date)}`}
                onClick={() => onDateClick(date)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onDateClick(date)
                  }
                }}
              >
                {getDayContent(date)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 rounded"></div>
            <span>Has cycle entry</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 rounded"></div>
            <span>Has symptoms</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-l-4 border-l-red-400"></div>
            <span>Flow intensity logged</span>
          </div>
        </div>
      </div>
    </div>
  )
}
