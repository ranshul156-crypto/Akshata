import { createClient } from '@supabase/supabase-js';

import { getEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  getEnv('VITE_SUPABASE_URL'),
  getEnv('VITE_SUPABASE_ANON_KEY'),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
