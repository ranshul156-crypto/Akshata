import React from 'react'
import { format } from 'date-fns'
import { Calendar, Heart, Droplets, Moon, Activity, Pill } from 'lucide-react'
import type { CycleEntry, SymptomLog } from '@/types/database'
import { getRelativeTime } from '@/lib/utils'

interface TimelineProps {
  cycleEntries: CycleEntry[]
  symptomLogs: SymptomLog[]
  onEdit?: (date: Date) => void
}

interface TimelineItem {
  id: string
  date: string
  type: 'cycle' | 'symptom'
  data: CycleEntry | SymptomLog
  title: string
  description: string
  icon: React.ReactNode
  isComplete: boolean
}

export function Timeline({ cycleEntries, symptomLogs, onEdit }: TimelineProps) {
  // Combine and sort entries by date
  const timelineItems: TimelineItem[] = []

  cycleEntries.forEach(entry => {
    timelineItems.push({
      id: `cycle-${entry.id}`,
      date: entry.entry_date,
      type: 'cycle',
      data: entry,
      title: 'Cycle Entry',
      description: entry.flow_intensity 
        ? `Flow intensity: ${entry.flow_intensity}${entry.symptoms?.length ? `, ${entry.symptoms.length} symptoms` : ''}`
        : 'No flow intensity recorded',
      icon: <Droplets className="h-4 w-4" />,
      isComplete: !!(entry.flow_intensity || entry.symptoms?.length)
    })
  })

  symptomLogs.forEach(log => {
    timelineItems.push({
      id: `symptom-${log.id}`,
      date: log.log_date,
      type: 'symptom',
      data: log,
      title: 'Symptom Log',
      description: `Mood: ${log.mood || 'N/A'}, Pain: ${log.pain_level || 'N/A'}${log.sleep_quality ? `, Sleep: ${log.sleep_quality}` : ''}`,
      icon: <Activity className="h-4 w-4" />,
      isComplete: !!(log.mood || log.pain_level || log.sleep_quality || Object.keys(log.other_symptoms).length)
    })
  })

  // Sort by date descending (most recent first)
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (timelineItems.length === 0) {
    return (
      <div className="bg-background border rounded-lg p-8 text-center">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No entries yet</h3>
        <p className="text-sm text-muted-foreground">
          Start logging your cycle and symptoms to see them here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Recent Entries</h2>
        <span className="text-sm text-muted-foreground">
          {timelineItems.length} total entries
        </span>
      </div>

      <div className="space-y-4">
        {timelineItems.map((item, index) => (
          <div
            key={item.id}
            className="relative flex items-start space-x-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            {/* Timeline line */}
            {index < timelineItems.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-border"></div>
            )}

            {/* Icon */}
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white
              ${item.type === 'cycle' 
                ? 'bg-red-500' 
                : 'bg-blue-500'
              }
              ${!item.isComplete && 'opacity-60'}
            `}>
              {item.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">
                  {item.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(item.date)}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {item.description}
              </p>

              {/* Additional details */}
              <div className="mt-2 space-y-1">
                {item.type === 'cycle' && (
                  <CycleEntryDetails entry={item.data as CycleEntry} />
                )}
                {item.type === 'symptom' && (
                  <SymptomLogDetails log={item.data as SymptomLog} />
                )}
              </div>

              {/* Edit button */}
              {onEdit && (
                <button
                  onClick={() => onEdit(new Date(item.date))}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Edit entry
                </button>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0">
              {item.isComplete ? (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Complete entry"></div>
              ) : (
                <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Partial entry"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CycleEntryDetails({ entry }: { entry: CycleEntry }) {
  const details = []

  if (entry.flow_intensity) {
    details.push(
      <div key="flow" className="flex items-center space-x-1 text-xs">
        <Droplets className="h-3 w-3 text-red-500" />
        <span>Flow: {entry.flow_intensity}</span>
      </div>
    )
  }

  if (entry.symptoms?.length) {
    details.push(
      <div key="symptoms" className="flex items-center space-x-1 text-xs">
        <Heart className="h-3 w-3 text-pink-500" />
        <span>{entry.symptoms.length} symptoms</span>
      </div>
    )
  }

  if (entry.notes) {
    details.push(
      <div key="notes" className="text-xs text-muted-foreground truncate">
        "{entry.notes}"
      </div>
    )
  }

  return <div className="flex flex-wrap gap-3">{details}</div>
}

function SymptomLogDetails({ log }: { log: SymptomLog }) {
  const details = []

  if (log.mood) {
    details.push(
      <div key="mood" className="flex items-center space-x-1 text-xs">
        <span>😊</span>
        <span>Mood: {log.mood}/10</span>
      </div>
    )
  }

  if (log.pain_level && log.pain_level > 0) {
    details.push(
      <div key="pain" className="flex items-center space-x-1 text-xs">
        <span>😣</span>
        <span>Pain: {log.pain_level}/10</span>
      </div>
    )
  }

  if (log.sleep_quality) {
    details.push(
      <div key="sleep" className="flex items-center space-x-1 text-xs">
        <Moon className="h-3 w-3 text-blue-500" />
        <span>Sleep: {log.sleep_quality}/10</span>
      </div>
    )
  }

  if (Object.keys(log.other_symptoms).length) {
    details.push(
      <div key="symptoms" className="flex items-center space-x-1 text-xs">
        <Activity className="h-3 w-3 text-orange-500" />
        <span>{Object.keys(log.other_symptoms).length} symptoms</span>
      </div>
    )
  }

  if (log.notes) {
    details.push(
      <div key="notes" className="text-xs text-muted-foreground truncate">
        "{log.notes}"
      </div>
    )
  }

  return <div className="flex flex-wrap gap-3">{details}</div>
}
