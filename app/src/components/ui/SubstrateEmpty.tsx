'use client';

import * as React from 'react';
import { Panel } from '@/components/features/SituationRoom';

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

/**
 * Standard panel for a part of the platform that needs the shared database
 * (the substrate), which this installation has not connected. Officials read
 * a plain sentence; the technical detail stays behind "Technical details".
 */
export function SubstrateNotConfigured({
  title,
  message = 'Substrate not configured.',
}: { title: string; message?: string }) {
  return (
    <Panel title={title} meta="not switched on" bodyClass="!p-3">
      <p className="text-[13px] text-ink-soft">
        This part of the platform is not switched on for this installation yet. It needs the shared database, which an
        administrator connects (see <a href="/gov/configuration" className="text-link underline underline-offset-2">National settings</a>).
      </p>
      <details className="mt-2 text-[12px] text-ink-muted">
        <summary className="cursor-pointer">Technical details</summary>
        <p className="mt-1">{message} Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (register 1.1).</p>
      </details>
    </Panel>
  );
}
