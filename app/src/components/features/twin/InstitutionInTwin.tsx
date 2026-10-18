'use client';

// "This institution in the twin": its stable twin id, the ids other systems
// use for it, its latest observations with their sources, and where its data
// exchanges are managed. Observations only; nothing here is generated.

import * as React from 'react';
import Link from 'next/link';

interface Profile {
  entity: { id: string; name: string };
  keys: { system: string; key: string }[];
  observations: { metric: string; value: number; unit: string; validFrom: string; sourceId: string }[];
  sources: { id: string; name: string; publisher: string }[];
}

export function InstitutionInTwin({ ministryId }: { ministryId: string }) {
  const [p, setP] = React.useState<Profile | null | 'missing'>(null);
  React.useEffect(() => {
    fetch(`/api/twin/entities/${encodeURIComponent(`institution:${ministryId}`)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : 'missing')).then(setP).catch(() => setP('missing'));
  }, [ministryId]);
  const source = (id: string) => (p && p !== 'missing' ? p.sources.find(s => s.id === id)?.name : undefined) ?? id;
  return (
    <section aria-labelledby="in-twin" className="rounded-[3px] border border-line bg-surface p-3 text-[13px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="in-twin" className="text-sm font-semibold text-ink">This institution in the national twin</h2>
        <span className="flex gap-3 text-[12px]">
          <Link href="/gov/twin" className="text-link underline underline-offset-2">National Twin</Link>
          <Link href="/integrations" className="text-link underline underline-offset-2">Data exchanges</Link>
        </span>
      </div>
      {p === null ? <p className="mt-1 text-ink-muted">Loading…</p> : p === 'missing' ? (
        <p className="mt-1 text-ink-muted">Not in the twin's register yet; it joins when the institution is registered.</p>
      ) : (
        <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
          <dt className="text-ink-soft">Twin id</dt><dd className="font-mono">{p.entity.id}</dd>
          <dt className="text-ink-soft">Ids in other systems</dt>
          <dd>{p.keys.length ? p.keys.map(k => <span key={`${k.system}:${k.key}`} className="me-3 font-mono">{k.system}: {k.key}</span>) : <span className="text-ink-muted">None linked yet (link them on the National Twin page).</span>}</dd>
          <dt className="text-ink-soft">Observed</dt>
          <dd>{p.observations.length ? (
            <ul>{p.observations.map(o => <li key={o.metric}><span className="font-mono">{o.metric}</span> {o.value.toLocaleString('en')} {o.unit} <span className="text-ink-muted">· true from {o.validFrom} · {source(o.sourceId)}</span></li>)}</ul>
          ) : <span className="text-ink-muted">No source reports on this institution yet; its figures on this page are samples.</span>}</dd>
        </dl>
      )}
    </section>
  );
}
