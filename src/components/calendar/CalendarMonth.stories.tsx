import type { Meta, StoryObj } from '@storybook/react';
import { addDays, formatISO, startOfMonth } from 'date-fns';

import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import type { CycleEntry } from '@/hooks/useCycleEntries';

const meta: Meta<typeof CalendarMonth> = {
  title: 'Calendar/CalendarMonth',
  component: CalendarMonth,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CalendarMonth>;

const today = new Date();
const month = startOfMonth(today);

const cycleEntries: CycleEntry[] = [
  {
    id: '1',
    user_id: 'user',
    entry_date: formatISO(addDays(today, -2), { representation: 'date' }),
    flow_intensity: 'heavy',
    notes: 'Logged entry',
    symptoms: [],
    created_at: formatISO(today),
    updated_at: formatISO(today),
  },
];

export const Default: Story = {
  args: {
    month,
    cycleEntries,
    predictedRange: [addDays(today, 5), addDays(today, 6), addDays(today, 7)],
  },
};
