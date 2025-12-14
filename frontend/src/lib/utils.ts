import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDateKey(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isToday(date: Date | string): boolean {
  const today = new Date()
  const d = new Date(date)
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const d = new Date(date)
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  )
}

export function getRelativeTime(date: Date | string): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return formatDate(date)
}

// Generate calendar grid
export function generateCalendarGrid(
  currentDate: Date,
  startOnMonday = true
): Date[][] {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // First day of the month
  const firstDay = new Date(year, month, 1)
  
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)
  
  // Start from the beginning of the week
  const startDate = new Date(firstDay)
  const startDayOfWeek = startDate.getDay()
  
  if (startOnMonday) {
    // Adjust to Monday as first day of week
    startDate.setDate(startDate.getDate() - (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1))
  } else {
    // Sunday as first day
    startDate.setDate(startDate.getDate() - startDayOfWeek)
  }
  
  // Generate 6 weeks grid
  const weeks: Date[][] = []
  let currentWeek = []
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    
    currentWeek.push(date)
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  
  return weeks
}
