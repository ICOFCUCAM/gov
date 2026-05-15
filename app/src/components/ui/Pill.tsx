import * as React from 'react';
import { cn } from '@/lib/utils';

export type PillTone = 'neutral' | 'ok' | 'warn' | 'alert';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

const toneClasses: Record<PillTone, string> = {
  neutral: 'bg-surface-2 text-ink-soft ring-1 ring-line',
  ok: 'bg-ok/15 text-ok ring-1 ring-ok/30',
  warn: 'bg-warn/15 text-warn ring-1 ring-warn/30',
  alert: 'bg-alert/15 text-alert ring-1 ring-alert/30',
};

export function Pill({ tone = 'neutral', className, ...props }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Dot({ tone = 'neutral' }: { tone?: PillTone }) {
  const map: Record<PillTone, string> = {
    neutral: 'bg-ink-soft',
    ok: 'bg-ok',
    warn: 'bg-warn',
    alert: 'bg-alert',
  };
  return <span className={cn('inline-block h-2 w-2 rounded-full', map[tone])} aria-hidden />;
}
