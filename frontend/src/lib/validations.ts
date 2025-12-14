import { z } from 'zod'

// Base validation schemas
export const flowIntensitySchema = z.enum(['light', 'medium', 'heavy', 'spotting', 'none'])

export const moodSchema = z.number()
  .min(1, 'Mood must be at least 1')
  .max(10, 'Mood cannot exceed 10')

export const painLevelSchema = z.number()
  .min(0, 'Pain level must be at least 0')
  .max(10, 'Pain level cannot exceed 10')

export const sleepQualitySchema = z.number()
  .min(1, 'Sleep quality must be at least 1')
  .max(10, 'Sleep quality cannot exceed 10')

// Common symptoms that can be selected
export const commonSymptoms = [
  'cramps',
  'bloating',
  'headache',
  'breast_tenderness',
  'fatigue',
  'mood_swings',
  'acne',
  'back_pain',
  'nausea',
  'diarrhea',
  'constipation',
  'hot_flashes',
  'night_sweats',
  'irritability',
  'anxiety',
  'depression',
  'food_cravings',
  'increased_appetite',
  'decreased_appetite',
  'concentration_issues',
  'insomnia',
  'difficulty_sleeping'
]

export const symptomSchema = z.array(z.string())

// Medication schema
export const medicationSchema = z.array(z.string().min(1, 'Medication name cannot be empty'))

// Main logging form schema
export const logEntrySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  flow_intensity: flowIntensitySchema.optional(),
  symptoms: symptomSchema.default([]),
  mood: moodSchema.optional(),
  pain_level: painLevelSchema.optional(),
  sleep_quality: sleepQualitySchema.optional(),
  medications: medicationSchema.default([]),
  notes: z.string().optional(),
  other_symptoms: z.record(z.any()).default({})
})

// Type exports
export type LogEntryFormData = z.infer<typeof logEntrySchema>
export type FlowIntensity = z.infer<typeof flowIntensitySchema>

// Quick log schema (for simpler daily logging)
export const quickLogSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  flow_intensity: flowIntensitySchema,
  mood: moodSchema,
  pain_level: painLevelSchema,
  sleep_quality: sleepQualitySchema.optional(),
  notes: z.string().optional()
})

export type QuickLogFormData = z.infer<typeof quickLogSchema>
