'use client';

import * as React from 'react';
import { TONE } from '@/components/features/SituationRoom';

/** Small reusable chip row for filter selections. */
export function FilterChips<T extends string>({
  label, options, value, onChange, format,
}: {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {label ? <span className="text-[9px] uppercase tracking-wider text-ink-muted">{label}</span> : null}
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition-colors"
          style={{
            borderColor: value === o ? TONE.link : 'rgb(var(--c-line))',
            color: value === o ? TONE.link : 'rgb(var(--c-ink-muted))',
          }}
        >
          {format ? format(o) : o}
        </button>
      ))}
    </div>
  );
}
