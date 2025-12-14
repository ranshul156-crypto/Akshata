import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const base =
  'tap-target focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'bg-surface text-text ring-1 ring-inset ring-border hover:bg-slate-50',
  ghost: 'bg-transparent text-text hover:bg-slate-100',
  danger: 'bg-rose-700 text-white hover:bg-rose-600',
};

export function Button({ className, variant = 'primary', type = 'button', ...props }: Props) {
  return <button type={type} className={cn(base, variants[variant], className)} {...props} />;
}
