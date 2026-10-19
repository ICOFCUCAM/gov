'use client';

// One entity of the national twin, as its persistent identifier resolves to it
// (/id/<kind>/<code> → /gov/twin?entity=<id>): its stable id and URI, the ids
// other systems use for it, and its latest observed values with their sources.

import * as React from 'react';

interface Profile {
  entity: { id: string; kind: string; name: string; code?: string; uri?: string };
  keys: { system: string; key: string }[];
  observations: { metric: string; value: number; unit: string; validFrom: string; sourceId: string; runId: string }[];
  sources: { id: string; name: string; publisher: string }[];
}

export function TwinEntityCard({ id, onClose }: { id: string; onClose: () => void }) {
  const [p, setP] = React.useState<Profile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setP(null); setError(null);
    void fetch(`/api/twin/entities/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error(r.status === 404 ? 'No such entity in the register' : `Request failed (${r.status})`); setP(await r.json()); })
      .catch(e => setError((e as Error).message));
  }, [id]);
  const source = new Map((p?.sources ?? []).map(s => [s.id, s]));
  return (
    <section className="rounded-[3px] border border-line bg-surface p-4" aria-label="Entity">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">{p?.entity.name ?? id}</h2>
        <button type="button" className="focus-ring text-[12px] text-link underline" onClick={onClose}>Close</button>
      </div>
      {error ? <p className="text-alert">{error}</p> : !p ? <p className="text-ink-soft">Loading…</p> : (
        <div className="grid gap-3 text-[12px] md:grid-cols-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-ink-soft">Kind</dt><dd>{p.entity.kind}</dd>
            <dt className="text-ink-soft">Id</dt><dd className="font-mono">{p.entity.id}</dd>
            {p.entity.code ? <><dt className="text-ink-soft">Code</dt><dd className="font-mono">{p.entity.code}</dd></> : null}
            {p.entity.uri ? <><dt className="text-ink-soft">Identifier</dt><dd className="break-all font-mono">{p.entity.uri}</dd></> : null}
            {p.keys.map(k => <React.Fragment key={`${k.system}:${k.key}`}><dt className="text-ink-soft">{k.system}</dt><dd className="font-mono">{k.key}</dd></React.Fragment>)}
          </dl>
          {p.observations.length ? (
            <table className="w-full">
              <thead><tr className="text-ink-muted"><th className="text-start font-semibold">Metric</th><th className="text-end font-semibold">Value</th><th className="ps-2 text-start font-semibold">True from</th><th className="ps-2 text-start font-semibold">Source</th></tr></thead>
              <tbody>{p.observations.map(o => (
                <tr key={o.metric}><td className="font-mono">{o.metric}</td><td className="text-end font-mono tabular-nums">{o.value.toLocaleString('en')} {o.unit}</td><td className="ps-2 font-mono">{o.validFrom}</td><td className="ps-2">{source.get(o.sourceId)?.name ?? o.sourceId}</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="text-ink-soft">No observations for it yet.</p>}
        </div>
      )}
    </section>
  );
}
