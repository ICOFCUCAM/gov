import { cn } from '@/lib/utils';

/**
 * Considered empty state — calm, instructive, never a dead end. Conveys
 * "nominal / nothing to action" with optional guidance instead of a bare
 * box. Token-driven, light/dark parity. API kept backward-compatible.
 */
export function EmptyState({
  title,
  hint,
  glyph = '▣',
  action,
  className,
}: {
  title: string;
  hint?: React.ReactNode;
  glyph?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span
        aria-hidden
        className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-lg text-ink-muted ring-1 ring-line"
      >
        {glyph}
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
