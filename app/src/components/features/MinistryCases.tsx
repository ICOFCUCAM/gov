'use client';

// Cases under the institution's approved procedures (lib/casework), shown in
// its workspace beside the queue: how many are open, waiting for a second
// official, or past a legal deadline, and a link to them. The queue items
// above stay as they are (imported, typed in, fed, sample).

import * as React from 'react';
import Link from 'next/link';

interface Row { id: string; ref: string; package: { key: string }; stage: string; pending?: unknown; deadlines: { due: string; met?: string; lapsed?: string }[] }

export function MinistryCases({ ministryId }: { ministryId: string }) {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  React.useEffect(() => {
    fetch(`/api/cases?owner=${encodeURIComponent(ministryId)}&open=true`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : { cases: [] })).then(j => setRows(j.cases as Row[])).catch(() => setRows([]));
  }, [ministryId]);
  if (!rows?.length) return null;
  const waiting = rows.filter(r => r.pending).length;
  const late = rows.filter(r => r.deadlines.some(d => d.lapsed && !d.met)).length;
  return (
    <p className="text-sm text-ink-soft">
      Cases under approved procedures: <strong>{rows.length}</strong> open{waiting ? `, ${waiting} waiting for a second official` : ''}{late ? `, ${late} past a legal deadline` : ''}.{' '}
      <Link className="underline underline-offset-2" href="/gov/work/cases/open">Open the cases</Link>
    </p>
  );
}
