import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';

export type CycleEntry = Database['public']['Tables']['cycle_entries']['Row'];

export function useCycleEntries(params: {
  userId: string | undefined;
  startDate: string;
  endDate: string;
}) {
  const { userId, startDate, endDate } = params;

  return useQuery<CycleEntry[]>({
    queryKey: ['cycleEntries', userId, startDate, endDate],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('Missing userId');

      const { data, error } = await supabase
        .from('cycle_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
