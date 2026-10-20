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

interface TypeRow { key: string; title: string; keeper: string | null }
interface OrgRow { standings: { register: string; state: string }[] }

/** The registers this institution keeps (organisations register types), with how many organisations stand in each. */
export function MinistryRegisters({ ministryId }: { ministryId: string }) {
  const [data, setData] = React.useState<{ types: TypeRow[]; organisations: OrgRow[] } | null>(null);
  React.useEffect(() => {
    fetch('/api/organisations?limit=2000', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null));
  }, []);
  const mine = (data?.types ?? []).filter(t => t.keeper === ministryId);
  if (!mine.length) return null;
  return (
    <p className="text-sm text-ink-soft">
      Registers kept here:{' '}
      {mine.map((t, i) => {
        const granted = (data?.organisations ?? []).filter(o => o.standings.some(s => s.register === t.key && s.state === 'granted')).length;
        const applied = (data?.organisations ?? []).filter(o => o.standings.some(s => s.register === t.key && s.state === 'applied')).length;
        return <span key={t.key}>{i ? '; ' : ''}<strong>{t.title}</strong> {granted} in good standing{applied ? `, ${applied} applying` : ''}</span>;
      })}.{' '}
      <Link className="underline underline-offset-2" href="/gov/organisations">Open the register</Link>
    </p>
  );
}
