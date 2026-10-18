'use client';

// One line at the top of every console page saying what its figures are
// (lib/twin/signal.ts): most come from the reference model and are samples
// until the nation connects sources in the National Twin; figures from a
// connected source are marked Observed. Dismissible for this browser session.

import * as React from 'react';
import Link from 'next/link';

const KEY = 'civicos.referenceNotice.dismissed';

export function ReferenceNotice() {
  const [hidden, setHidden] = React.useState(true);
  const [metrics, setMetrics] = React.useState<number | null>(null);
  React.useEffect(() => {
    try { setHidden(sessionStorage.getItem(KEY) === '1'); } catch { setHidden(false); }
    fetch('/api/twin/sources', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(d => setMetrics(d?.metrics?.length ?? 0)).catch(() => setMetrics(0));
  }, []);
  if (hidden) return null;
  return (
    <div role="note" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-dashed border-line bg-surface px-3 py-2 text-[12.5px] text-ink-soft">
      <span>
        {metrics
          ? <>Figures from the nation&rsquo;s own data are real ({metrics} kind{metrics === 1 ? '' : 's'} connected so far); the rest are <b className="text-ink">examples</b>, marked as such, until your ministries connect their data.</>
          : <>Most figures on these screens are <b className="text-ink">examples</b> until your ministries connect their data. Examples are marked.</>}
        {' '}<Link href="/gov/twin" className="font-semibold text-link underline-offset-2 hover:underline">National data</Link>
      </span>
      <button type="button" className="focus-ring rounded-[3px] px-2 py-0.5 text-[12px] text-ink-muted hover:text-ink" onClick={() => { setHidden(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* not remembered */ } }}>
        Dismiss
      </button>
    </div>
  );
}
