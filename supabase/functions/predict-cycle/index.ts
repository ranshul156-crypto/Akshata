import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CycleEntry {
  entry_date: string;
  flow_intensity: string | null;
}

interface UserProfile {
  cycle_length_days: number;
  period_length_days: number;
}

interface PredictionResult {
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

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

function predictCycle(
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

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
    }

    const { user_id, user_auth_id } = await req.json();

    if (!user_id && !user_auth_id) {
      return new Response(
        JSON.stringify({ error: 'user_id or user_auth_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let userId = user_id;
    if (!userId && user_auth_id) {
      const { data: userData, error: userError } = await supabase
        .from('user_accounts')
        .select('id')
        .eq('auth_id', user_auth_id)
        .single();

      if (userError || !userData) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      userId = userData.id;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cycle_length_days, period_length_days')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: cycleEntries, error: entriesError } = await supabase
      .from('cycle_entries')
      .select('entry_date, flow_intensity')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(90);

    if (entriesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cycle entries' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prediction = predictCycle(cycleEntries || [], profile);

    const { error: insertError } = await supabase
      .from('predictions')
      .insert({
        user_id: userId,
        prediction_date: new Date().toISOString().split('T')[0],
        cycle_start_date: prediction.next_period_start,
        cycle_end_date: prediction.next_period_end,
        confidence: prediction.confidence,
        source: prediction.source,
        metadata: {
          ...prediction.metadata,
          fertility_window_start: prediction.fertility_window_start,
          fertility_window_end: prediction.fertility_window_end
        }
      });

    if (insertError) {
      console.error('Failed to insert prediction:', insertError);
    }

    return new Response(
      JSON.stringify({ success: true, prediction }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('Error in predict-cycle function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
