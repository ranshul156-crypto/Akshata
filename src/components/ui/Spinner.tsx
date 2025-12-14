import { cn } from '@/lib/cn';

export function Spinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)} role="status" aria-live="polite">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700"
        aria-hidden
      />
      <span className="text-sm text-text-muted">{label ?? 'Loading'}</span>
    </div>
  );
}
