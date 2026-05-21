'use client';

import * as React from 'react';

/** Consistent empty-state copy block. */
export function SubstrateEmpty({
  title, hint, className = '',
}: { title: string; hint?: string; className?: string }) {
  return (
    <div className={`px-3 py-6 text-center ${className}`}>
      <div className="text-[11px] text-ink">{title}</div>
      {hint ? <div className="mt-1 text-[10px] text-ink-muted">{hint}</div> : null}
    </div>
  );
}

/** Small inline spinner using CSS only. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-line border-t-link ${className}`} />
  );
}
