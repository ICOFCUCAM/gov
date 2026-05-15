import * as React from 'react';
import { cn } from '@/lib/utils';
import type { HealthStatus, IncidentSeverity } from '@/lib/api/types';

const statusDot: Record<HealthStatus, string> = {
  ok: 'bg-ok',
  degraded: 'bg-warn',
  down: 'bg-alert',
};
const statusWord: Record<HealthStatus, string> = {
  ok: 'OK',
  degraded: 'Degraded',
  down: 'Down',
};

/** Calm health tile: one signal, one number, one line of context. */
export function HealthTile({
  label,
  status,
  metric,
  detail,
}: {
  label: string;
  status: HealthStatus;
  metric?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className={cn('h-2 w-2 rounded-full', statusDot[status])} aria-hidden />
          {statusWord[status]}
        </span>
      </div>
      {metric ? (
        <div className="mt-1 font-serif text-2xl">{metric}</div>
      ) : null}
      {detail ? (
        <div className="mt-1 text-sm text-ink-muted">{detail}</div>
      ) : null}
    </div>
  );
}

/** Single headline number with a label. No chart noise. */
export function MetricStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'alert';
}) {
  const color =
    tone === 'ok'
      ? 'text-ok'
      : tone === 'warn'
        ? 'text-[#6a4d00]'
        : tone === 'alert'
          ? 'text-alert'
          : 'text-ink';
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className={cn('mt-1 font-serif text-3xl', color)}>{value}</div>
    </div>
  );
}

/** Queue depth vs SLA threshold — a quiet bar, not a dashboard explosion. */
export function ThresholdBar({
  value,
  threshold,
  breaching,
}: {
  value: number;
  threshold: number;
  breaching: boolean;
}) {
  const pct =
    threshold > 0 ? Math.min(100, Math.round((value / threshold) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="img"
      aria-label={`${value} of ${threshold}${breaching ? ', breaching' : ''}`}
    >
      <div
        className={cn('h-full', breaching ? 'bg-alert' : 'bg-ok')}
        style={{ width: `${threshold > 0 ? pct : 0}%` }}
      />
    </div>
  );
}

const sevTone: Record<IncidentSeverity, string> = {
  sev1: 'bg-[#f7e3e1] text-alert',
  sev2: 'bg-[#f7e3e1] text-alert',
  sev3: 'bg-[#fbf2dd] text-[#6a4d00]',
  sev4: 'bg-surface-2 text-ink-soft',
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
        sevTone[severity],
      )}
    >
      {severity}
    </span>
  );
}
