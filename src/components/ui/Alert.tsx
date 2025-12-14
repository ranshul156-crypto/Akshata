import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Alert({
  title,
  children,
  variant = 'info',
}: {
  title: string;
  children?: ReactNode;
  variant?: 'info' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-sm',
        variant === 'info' && 'border-slate-200 bg-slate-50 text-slate-700',
        variant === 'danger' && 'border-rose-200 bg-rose-50 text-rose-800',
      )}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm leading-relaxed">{children}</div> : null}
    </div>
  );
}
