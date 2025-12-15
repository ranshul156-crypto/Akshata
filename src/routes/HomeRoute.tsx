import { addMonths, endOfMonth, endOfWeek, format, formatISO, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';

import { ProfileOnboardingDialog } from '@/components/profile/ProfileOnboardingDialog';
import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useCycleEntries } from '@/hooks/useCycleEntries';
import { useProfile } from '@/hooks/useProfile';
import { useUserAccount } from '@/hooks/useUserAccount';
import { computePredictedWindow } from '@/lib/predictions';

export function HomeRoute() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const monthGridStart = useMemo(() => startOfWeek(startOfMonth(month), { weekStartsOn: 0 }), [month]);
  const monthGridEnd = useMemo(() => endOfWeek(endOfMonth(month), { weekStartsOn: 0 }), [month]);

  const { data: userAccountResult, isLoading: accountLoading, error: accountError } = useUserAccount();
  const userId = userAccountResult?.account.id;

  const profileQuery = useProfile(userId);
  const profile = profileQuery.data ?? null;

  const cycleEntriesQuery = useCycleEntries({
    userId,
    startDate: formatISO(monthGridStart, { representation: 'date' }),
    endDate: formatISO(monthGridEnd, { representation: 'date' }),
  });

  const prediction = useMemo(() => {
    return computePredictedWindow({
      monthStart: monthGridStart,
      monthEnd: monthGridEnd,
      profile,
      cycleEntries: cycleEntriesQuery.data ?? [],
    });
  }, [cycleEntriesQuery.data, monthGridEnd, monthGridStart, profile]);

  if (accountLoading) {
    return <Spinner label="Loading your workspace" />;
  }

  if (accountError) {
    return <Alert title="Unable to load your account" variant="danger" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-text-muted">Cycle length</p>
          <p className="mt-1 text-2xl font-semibold text-text">
            {profile ? `${profile.cycle_length_days} days` : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-muted">Period length</p>
          <p className="mt-1 text-2xl font-semibold text-text">
            {profile ? `${profile.period_length_days} days` : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-muted">Next predicted period</p>
          <p className="mt-1 text-2xl font-semibold text-text">
            {prediction?.start ? format(prediction.start, 'MMM d') : '—'}
          </p>
          <p className="mt-1 text-xs text-text-muted">Placeholder prediction (local calc)</p>
        </Card>
      </div>

      {profileQuery.isLoading ? <Spinner label="Loading profile" /> : null}
      {profileQuery.error ? (
        <Alert title="Unable to load profile" variant="danger" />
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-text">{format(month, 'MMMM yyyy')}</h2>
            <p className="text-sm text-text-muted">Use arrow keys to move day focus.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMonth((m) => addMonths(m, -1))}>
              <span className="sr-only">Previous month</span>
              Prev
            </Button>
            <Button variant="secondary" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <span className="sr-only">Next month</span>
              Next
            </Button>
          </div>
        </div>

        {cycleEntriesQuery.isLoading ? (
          <Card>
            <Spinner label="Loading calendar" />
          </Card>
        ) : cycleEntriesQuery.error ? (
          <Alert title="Unable to load cycle entries" variant="danger" />
        ) : (
          <>
            <CalendarMonth
              month={month}
              cycleEntries={cycleEntriesQuery.data ?? []}
              predictedRange={prediction?.range ?? []}
            />
            {(cycleEntriesQuery.data?.length ?? 0) === 0 ? (
              <div className="pt-3">
                <Alert title="No cycle entries yet" variant="info">
                  Your calendar is ready. Log a day to see it highlighted. In dev, a small demo seed is
                  added on first sign-in unless you set
                  <code className="mx-1 rounded bg-slate-100 px-1">VITE_DEMO_SEED=false</code>.
                </Alert>
              </div>
            ) : null}
          </>
        )}
      </section>

      <ProfileOnboardingDialog
        open={!!userId && profileQuery.isFetched && !profileQuery.error && profile === null}
        userId={userId}
      />
    </div>
  );
}
