import type { InputHTMLAttributes } from 'react';
import * as Label from '@radix-ui/react-label';

import { cn } from '@/lib/cn';

export function InputField({
  label,
  inputId,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  inputId: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = [hint ? `${inputId}-hint` : null, error ? `${inputId}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      <Label.Root htmlFor={inputId} className="text-sm font-medium text-text">
        {label}
      </Label.Root>
      <input
        id={inputId}
        className={cn(
          'focus-ring tap-target w-full rounded-xl border border-border bg-surface px-3 text-sm text-text placeholder:text-slate-400',
          error && 'border-rose-400 ring-rose-200',
        )}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
