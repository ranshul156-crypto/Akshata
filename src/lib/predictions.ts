import { addDays, isWithinInterval, max, parseISO } from 'date-fns';

import type { CycleEntry } from '@/hooks/useCycleEntries';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type Args = {
  monthStart: Date;
  monthEnd: Date;
  profile: Profile | null;
  cycleEntries: CycleEntry[];
};

export function computePredictedWindow({ monthStart, monthEnd, profile, cycleEntries }: Args) {
  if (!profile) return null;

  const loggedBleedDates = cycleEntries
    .filter((e) => e.flow_intensity && e.flow_intensity !== 'none')
    .map((e) => parseISO(e.entry_date));

  const base = loggedBleedDates.length > 0 ? max(loggedBleedDates) : new Date();

  const predictedStart = addDays(base, profile.cycle_length_days);
  const predictedEnd = addDays(predictedStart, Math.max(profile.period_length_days - 1, 0));

  const range: Date[] = [];
  for (let d = predictedStart; d <= predictedEnd; d = addDays(d, 1)) {
    if (isWithinInterval(d, { start: monthStart, end: monthEnd })) range.push(d);
  }

  return {
    start: predictedStart,
    end: predictedEnd,
    range,
  };
}
