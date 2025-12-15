/**
 * Shared prediction algorithm for menstrual cycle tracking
 * Calculates next period start/end and fertility window
 */

export interface CycleEntry {
  entry_date: string;
  flow_intensity: string | null;
}

export interface UserProfile {
  cycle_length_days: number;
  period_length_days: number;
}

export interface PredictionResult {
  next_period_start: string;
  next_period_end: string;
  fertility_window_start: string;
  fertility_window_end: string;
  confidence: number;
  source: 'historical' | 'profile_default' | 'hybrid';
  metadata: {
    cycles_analyzed: number;
    average_cycle_length?: number;
    std_deviation?: number;
  };
}

/**
 * Calculate average and standard deviation of cycle lengths
 */
function calculateCycleStats(cycleLengths: number[]): { average: number; stdDev: number } {
  if (cycleLengths.length === 0) {
    return { average: 0, stdDev: 0 };
  }

  const average = cycleLengths.reduce((sum, val) => sum + val, 0) / cycleLengths.length;
  
  if (cycleLengths.length === 1) {
    return { average, stdDev: 0 };
  }

  const variance = cycleLengths.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / (cycleLengths.length - 1);
  const stdDev = Math.sqrt(variance);

  return { average, stdDev };
}

/**
 * Identify cycle start dates from cycle entries
 * A cycle starts when flow_intensity is not 'none' or null after a gap
 */
function identifyCycleStarts(entries: CycleEntry[]): Date[] {
  if (entries.length === 0) return [];

  const sortedEntries = entries
    .map(e => ({ ...e, date: new Date(e.entry_date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const cycleStarts: Date[] = [];
  let inPeriod = false;

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    const hasFlow = entry.flow_intensity && entry.flow_intensity !== 'none';

    if (hasFlow && !inPeriod) {
      cycleStarts.push(entry.date);
      inPeriod = true;
    } else if (!hasFlow) {
      inPeriod = false;
    }
  }

  return cycleStarts;
}

/**
 * Calculate cycle lengths from cycle start dates
 */
function calculateCycleLengths(cycleStarts: Date[]): number[] {
  const lengths: number[] = [];
  
  for (let i = 1; i < cycleStarts.length; i++) {
    const lengthDays = Math.round(
      (cycleStarts[i].getTime() - cycleStarts[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    lengths.push(lengthDays);
  }

  return lengths;
}

/**
 * Add days to a date and return ISO string
 */
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * Main prediction function
 * 
 * @param cycleEntries - Past N cycle entries (should be sorted, most recent first)
 * @param profile - User profile with default cycle parameters
 * @param maxEntriesToAnalyze - Maximum number of entries to analyze (default: 90 days)
 * @returns PredictionResult with next period and fertility window
 */
export function predictCycle(
  cycleEntries: CycleEntry[],
  profile: UserProfile,
  maxEntriesToAnalyze = 90
): PredictionResult {
  const recentEntries = cycleEntries.slice(0, maxEntriesToAnalyze);
  const cycleStarts = identifyCycleStarts(recentEntries);
  
  let predictedCycleLength = profile.cycle_length_days;
  let confidence = 0.5;
  let source: PredictionResult['source'] = 'profile_default';
  let metadata: PredictionResult['metadata'] = {
    cycles_analyzed: 0
  };

  if (cycleStarts.length >= 2) {
    const cycleLengths = calculateCycleLengths(cycleStarts);
    const stats = calculateCycleStats(cycleLengths);
    
    predictedCycleLength = Math.round(stats.average);
    metadata = {
      cycles_analyzed: cycleLengths.length,
      average_cycle_length: stats.average,
      std_deviation: stats.stdDev
    };

    if (cycleLengths.length >= 3) {
      confidence = Math.max(0.5, Math.min(0.95, 1 - (stats.stdDev / stats.average) * 0.5));
      source = 'historical';
    } else {
      confidence = 0.6 + (cycleLengths.length * 0.1);
      source = 'hybrid';
    }
  }

  const lastCycleStart = cycleStarts.length > 0 
    ? cycleStarts[cycleStarts.length - 1]
    : new Date();

  const nextPeriodStart = addDays(lastCycleStart, predictedCycleLength);
  const nextPeriodEnd = addDays(lastCycleStart, predictedCycleLength + profile.period_length_days - 1);

  const ovulationDay = Math.round(predictedCycleLength / 2);
  const fertilityWindowStart = addDays(lastCycleStart, ovulationDay - 5);
  const fertilityWindowEnd = addDays(lastCycleStart, ovulationDay + 1);

  return {
    next_period_start: nextPeriodStart,
    next_period_end: nextPeriodEnd,
    fertility_window_start: fertilityWindowStart,
    fertility_window_end: fertilityWindowEnd,
    confidence: Math.round(confidence * 100) / 100,
    source,
    metadata
  };
}

/**
 * Generate multiple predictions (for next N cycles)
 */
export function predictMultipleCycles(
  cycleEntries: CycleEntry[],
  profile: UserProfile,
  numberOfCycles = 3
): PredictionResult[] {
  const predictions: PredictionResult[] = [];
  let currentEntries = [...cycleEntries];

  for (let i = 0; i < numberOfCycles; i++) {
    const prediction = predictCycle(currentEntries, profile);
    predictions.push(prediction);

    const syntheticEntry: CycleEntry = {
      entry_date: prediction.next_period_start,
      flow_intensity: 'medium'
    };
    currentEntries = [syntheticEntry, ...currentEntries];
  }

  return predictions;
}
