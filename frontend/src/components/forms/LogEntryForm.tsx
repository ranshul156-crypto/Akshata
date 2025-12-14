import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { LogEntryFormData, logEntrySchema, commonSymptoms } from '@/lib/validations'
import { CycleDataService, syncQueue } from '@/lib/data-layer'
import { getCurrentUser } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface LogEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate?: Date
  onSuccess?: () => void
}

interface SymptomOption {
  id: string
  label: string
  value: string
}

const symptomOptions: SymptomOption[] = commonSymptoms.map(symptom => ({
  id: symptom,
  label: symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  value: symptom
}))

export function LogEntryForm({ open, onOpenChange, initialDate = new Date(), onSuccess }: LogEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [medications, setMedications] = useState<string[]>([''])
  const [newMedication, setNewMedication] = useState('')

  const form = useForm<LogEntryFormData>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      date: format(initialDate, 'yyyy-MM-dd'),
      symptoms: [],
      medications: [],
      other_symptoms: {},
    },
  })

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form
  const watchedMood = watch('mood')
  const watchedPainLevel = watch('pain_level')
  const watchedSleepQuality = watch('sleep_quality')

  const onSubmit = async (data: LogEntryFormData) => {
    try {
      setIsSubmitting(true)
      
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const logEntry = {
        ...data,
        symptoms: selectedSymptoms,
        medications: medications.filter(med => med.trim() !== ''),
        other_symptoms: data.other_symptoms || {},
      }

      await CycleDataService.logDayEntry(user.id, logEntry)

      // Show success feedback
      onOpenChange(false)
      onSuccess?.()
      
      // Reset form
      setSelectedSymptoms([])
      setMedications([''])
      form.reset()
    } catch (error) {
      console.error('Error submitting log entry:', error)
      // Show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    )
  }

  const addMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications(prev => [...prev, newMedication.trim()])
      setNewMedication('')
    }
  }

  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset form state when closing
      setSelectedSymptoms([])
      setMedications([''])
      form.reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Daily Entry</DialogTitle>
          <DialogDescription>
            Track your cycle, symptoms, and wellbeing for {format(initialDate, 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="w-full"
            />
            {errors.date && (
              <p className="text-sm text-destructive mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Flow Intensity */}
          <div>
            <Label htmlFor="flow_intensity">Flow Intensity</Label>
            <select
              id="flow_intensity"
              {...register('flow_intensity')}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select flow intensity</option>
              <option value="none">None</option>
              <option value="spotting">Spotting</option>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
            </select>
            {errors.flow_intensity && (
              <p className="text-sm text-destructive mt-1">{errors.flow_intensity.message}</p>
            )}
          </div>

          {/* Symptoms */}
          <div>
            <Label>Symptoms</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {symptomOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(option.value)}
                    onChange={() => handleSymptomToggle(option.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Wellbeing Metrics */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Wellbeing Metrics</h3>
            
            {/* Mood */}
            <div>
              <Label htmlFor="mood">Mood: {watchedMood || 'Not set'}</Label>
              <Slider
                id="mood"
                min={1}
                max={10}
                step={1}
                value={[watchedMood || 1]}
                onValueChange={([value]) => setValue('mood', value)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Very Low</span>
                <span>Very High</span>
              </div>
            </div>

            {/* Pain Level */}
            <div>
              <Label htmlFor="pain_level">Pain Level: {watchedPainLevel || 0}</Label>
              <Slider
                id="pain_level"
                min={0}
                max={10}
                step={1}
                value={[watchedPainLevel || 0]}
                onValueChange={([value]) => setValue('pain_level', value)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>No Pain</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Sleep Quality */}
            <div>
              <Label htmlFor="sleep_quality">Sleep Quality: {watchedSleepQuality || 'Not set'}</Label>
              <Slider
                id="sleep_quality"
                min={1}
                max={10}
                step={1}
                value={[watchedSleepQuality || 1]}
                onValueChange={([value]) => setValue('sleep_quality', value)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Very Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>

          {/* Medications */}
          <div>
            <Label>Medications Taken</Label>
            <div className="space-y-2 mt-2">
              {medications.map((medication, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={medication}
                    onChange={(e) => {
                      const newMedications = [...medications]
                      newMedications[index] = e.target.value
                      setMedications(newMedications)
                    }}
                    placeholder="Medication name"
                  />
                  {medications.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMedication(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex space-x-2">
                <Input
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Add new medication"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                />
                <Button type="button" onClick={addMedication}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about your day..."
              className="mt-1"
            />
            {errors.notes && (
              <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
