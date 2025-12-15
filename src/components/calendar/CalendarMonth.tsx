import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import type { CycleEntry } from '@/hooks/useCycleEntries';

type Props = {
  month: Date;
  cycleEntries: CycleEntry[];
  predictedRange: Date[];
};

function toDateKey(d: Date) {
  return formatISO(d, { representation: 'date' });
}

export function CalendarMonth({ month, cycleEntries, predictedRange }: Props) {
  const gridStart = useMemo(() => startOfWeek(startOfMonth(month), { weekStartsOn: 0 }), [month]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(month), { weekStartsOn: 0 }), [month]);

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      result.push(d);
    }
    return result;
  }, [gridEnd, gridStart]);

  const entryByDate = useMemo(() => {
    const map = new Map<string, CycleEntry>();
    for (const entry of cycleEntries) map.set(entry.entry_date, entry);
    return map;
  }, [cycleEntries]);

  const predictedKeys = useMemo(() => new Set(predictedRange.map(toDateKey)), [predictedRange]);

  const [activeDate, setActiveDate] = useState<Date>(() => {
    const today = new Date();
    return isSameMonth(today, month) ? today : startOfMonth(month);
  });

  useEffect(() => {
    const today = new Date();
    setActiveDate(isSameMonth(today, month) ? today : startOfMonth(month));
  }, [month]);

  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    buttonRefs.current.clear();
  }, [gridStart, gridEnd]);

  function moveFocus(next: Date) {
    const nextKey = toDateKey(next);
    const el = buttonRefs.current.get(nextKey);
    if (!el) return;

    setActiveDate(next);
    requestAnimationFrame(() => el.focus());
  }

  function onGridKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') return;

    const current = activeDate;

    let next: Date | null = null;
    if (e.key === 'ArrowLeft') next = addDays(current, -1);
    if (e.key === 'ArrowRight') next = addDays(current, 1);
    if (e.key === 'ArrowUp') next = addDays(current, -7);
    if (e.key === 'ArrowDown') next = addDays(current, 7);

    if (next) {
      e.preventDefault();
      if (next < gridStart || next > gridEnd) return;
      moveFocus(next);
    }
  }

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" onKeyDown={onGridKeyDown}>
        {weekdayLabels.map((d) => (
          <div
            key={d}
            className="px-1 pb-1 text-center text-xs font-semibold text-text-muted"
            role="columnheader"
          >
            {d}
          </div>
        ))}

        {days.map((day) => {
          const key = toDateKey(day);
          const entry = entryByDate.get(key);

          const isLogged = !!entry?.flow_intensity && entry.flow_intensity !== 'none';
          const isPredicted = predictedKeys.has(key) && !isLogged;
          const inMonth = isSameMonth(day, month);

          const ariaLabelParts = [format(day, 'EEEE, MMMM d, yyyy')];
          if (isLogged) ariaLabelParts.push(`Logged: ${entry.flow_intensity}`);
          else if (isPredicted) ariaLabelParts.push('Predicted period day');
          if (isToday(day)) ariaLabelParts.push('Today');

          return (
            <button
              key={key}
              ref={(el) => {
                if (!el) return;
                buttonRefs.current.set(key, el);
              }}
              role="gridcell"
              type="button"
              tabIndex={isSameDay(day, activeDate) ? 0 : -1}
              onFocus={() => setActiveDate(day)}
              className={cn(
                'focus-ring tap-target relative flex h-11 items-center justify-center rounded-xl text-sm font-medium sm:h-12',
                inMonth ? 'text-text' : 'text-slate-400',
                !isLogged && !isPredicted && 'bg-surface hover:bg-slate-50',
                isLogged && 'bg-menstrual-logged text-white',
                isPredicted && 'bg-menstrual-predicted text-rose-900 ring-1 ring-inset ring-rose-300',
              )}
              aria-label={ariaLabelParts.join('. ')}
              aria-current={isToday(day) ? 'date' : undefined}
              data-date={key}
            >
              <span aria-hidden>{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <LegendSwatch className="bg-menstrual-logged" label="Logged" />
          <LegendSwatch
            className="bg-menstrual-predicted ring-1 ring-inset ring-rose-300"
            label="Predicted"
          />
          <LegendSwatch className="bg-surface ring-1 ring-inset ring-border" label="No data" />
        </div>
        <p className="text-xs text-text-muted">
          Tip: use arrow keys to move focus. Tab exits the calendar.
        </p>
      </div>
    </Card>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <span className={cn('h-3 w-3 rounded-full', className)} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
