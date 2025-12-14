import { useQuery } from '@tanstack/react-query';
import { formatISO } from 'date-fns';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';

type UserAccount = Database['public']['Tables']['user_accounts']['Row'];

type Result = {
  account: UserAccount;
  created: boolean;
};

async function seedDemoCycleEntries(userId: string) {
  const shouldSeed = import.meta.env.DEV && import.meta.env.VITE_DEMO_SEED !== 'false';
  if (!shouldSeed) return;

  const today = new Date();
  const demoEntries: Database['public']['Tables']['cycle_entries']['Insert'][] = [
    {
      user_id: userId,
      entry_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4), {
        representation: 'date',
      }),
      flow_intensity: 'heavy',
      notes: 'Demo: day 1',
      symptoms: ['cramps'],
    },
    {
      user_id: userId,
      entry_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), {
        representation: 'date',
      }),
      flow_intensity: 'heavy',
      notes: 'Demo: day 2',
      symptoms: ['cramps'],
    },
    {
      user_id: userId,
      entry_date: formatISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), {
        representation: 'date',
      }),
      flow_intensity: 'medium',
      notes: 'Demo: day 3',
      symptoms: [],
    },
  ];

  const { error } = await supabase.from('cycle_entries').insert(demoEntries);

  // Ignore unique conflicts / seeding twice.
  if (error && error.code !== '23505') {
    throw error;
  }
}

export function useUserAccount() {
  const { user } = useAuth();

  return useQuery<Result>({
    queryKey: ['userAccount', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing, error: selectError } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) return { account: existing, created: false };

      const email = user.email;
      if (!email) throw new Error('Missing email for authenticated user');

      const { data: created, error: insertError } = await supabase
        .from('user_accounts')
        .insert({ auth_id: user.id, email })
        .select('*')
        .single();

      if (insertError) throw insertError;

      await seedDemoCycleEntries(created.id);

      return { account: created, created: true };
    },
  });
}
