import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Input';
import { ModalContent, ModalRoot } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabaseClient';

export function ProfileOnboardingDialog({
  open,
  userId,
}: {
  open: boolean;
  userId: string | undefined;
}) {
  const queryClient = useQueryClient();

  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [firstName, setFirstName] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Missing userId');

      const { error } = await supabase.from('profiles').insert({
        user_id: userId,
        cycle_length_days: cycleLength,
        period_length_days: periodLength,
        first_name: firstName.trim().length > 0 ? firstName.trim() : null,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return (
    <ModalRoot open={open}>
      <ModalContent
        title="Set up your cycle preferences"
        description="This helps generate calm, accessible calendar visuals and predictions."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <InputField
            label="First name (optional)"
            inputId="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Cycle length (days)"
              inputId="cycleLength"
              type="number"
              inputMode="numeric"
              min={21}
              max={35}
              required
              value={String(cycleLength)}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              hint="Typical range: 21–35"
            />
            <InputField
              label="Period length (days)"
              inputId="periodLength"
              type="number"
              inputMode="numeric"
              min={3}
              max={10}
              required
              value={String(periodLength)}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              hint="Typical range: 3–10"
            />
          </div>

          {mutation.error ? (
            <p className="text-sm font-medium text-rose-700" role="alert">
              {mutation.error instanceof Error ? mutation.error.message : 'Unable to save profile'}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Continue'}
          </Button>

          <p className="text-xs text-text-muted">
            Your preferences are stored securely in your profile. You can update them later.
          </p>
        </form>
      </ModalContent>
    </ModalRoot>
  );
}
