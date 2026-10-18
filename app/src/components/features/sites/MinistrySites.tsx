'use client';

// An institution's own sites (the Sites tab of its workspace): its sites on
// the national map, the list with their stage and certification, what waits
// on its officials (publish, certify, confirm moves), recording a new site,
// loading a file, connecting the institution's own system, and the phone
// page for capturing sites in the field.
// API: /api/org/ministries/{id}/facilities; rules: lib/data/facilities.ts.

import * as React from 'react';
import Link from 'next/link';
import { NationMap } from '@/components/map/NationMap';
import { SiteForm, methodName } from './SiteForm';
import { SiteDetail, WaitingList, useSiteAction } from './SiteActions';
import { ImportPanel } from './ImportPanel';
import { SiteFeeds } from './SiteFeeds';
import { CERT_WORD, Msg, STATE_WORD, btn, callApi, sitePoints, useInstitutions, useRegister, when, type FacilityImport, type Site } from './shared';

export function MinistrySites({ id, name }: { id: string; name?: string }) {
  const { data: vocab, error } = useRegister(`ministry=${encodeURIComponent(id)}&state=published`);
  const institutions = useInstitutions();
  const [own, setOwn] = React.useState<{ sites: Site[]; imports: FacilityImport[] } | null>(null);
  const [loadErr, setLoadErr] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState<'form' | 'file' | 'system' | null>(null);
  const load = React.useCallback(async () => {
    try { setOwn(await callApi(`/api/org/ministries/${encodeURIComponent(id)}/facilities`)); setLoadErr(''); }
    catch (e) { setLoadErr((e as Error).message); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const { act, busy, msg } = useSiteAction(load);

  if ((error || loadErr) && (!vocab || !own)) return <p role="alert" className="text-[13px] text-alert">The sites could not be read: {error || loadErr}</p>;
  if (!vocab || !own) return <p className="text-[13px] text-ink-muted">Loading the institution&rsquo;s sites…</p>;
  const ownerName = (x: string) => institutions.find(m => m.id === x)?.name ?? (x === id ? name ?? x : x);
  const live = own.sites.filter(s => s.state !== 'withdrawn');
  const site = selected ? own.sites.find(s => s.id === selected) : undefined;
  const cat = (s: Site) => vocab.categories.find(c => c.key === s.category);
  const all = { ...vocab, sites: own.sites };

  return (
    <div className="space-y-4 text-[14px] text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-[13px] text-ink-soft">
          The places {name ?? 'this institution'} runs, each with where it stands. {live.length} recorded, {live.filter(s => s.state === 'published').length} published,
          {' '}{live.filter(s => s.certification.state === 'certified' && s.state === 'published').length} with a certified location.
          {' '}<Link href="/gov/sites" className="text-link underline">The whole register</Link>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button className={btn} aria-pressed={adding === 'form'} onClick={() => setAdding(adding === 'form' ? null : 'form')}>Add a site</button>
          <button className={btn} aria-pressed={adding === 'file'} onClick={() => setAdding(adding === 'file' ? null : 'file')}>Load a file</button>
          <button className={btn} aria-pressed={adding === 'system'} onClick={() => setAdding(adding === 'system' ? null : 'system')}>Connect a system</button>
          <Link href={`/gov/sites/capture?ministry=${encodeURIComponent(id)}`} className={btn}>Capture on a phone</Link>
        </div>
      </div>

      {adding === 'form' ? (
        <section className="rounded-[3px] border border-line bg-surface p-4" aria-label="Add a site">
          <SiteForm ministryId={id} ministryName={name} vocab={all} onRecorded={() => void load()} />
        </section>
      ) : null}
      {adding === 'system' ? <SiteFeeds id={id} name={name} accepted={vocab.policy.methods.includes('system-feed')} /> : null}
      {adding === 'file' ? (
        <section className="rounded-[3px] border border-line bg-surface p-4" aria-label="Load a file">
          <ImportPanel vocab={vocab} institutions={institutions} fixedMinistry={id} onLoaded={load} />
        </section>
      ) : null}

      <NationMap
        title={`Sites of ${name ?? 'the institution'}`}
        kind="reported"
        source="Declared by the institution; certified locations have been checked"
        compact
        maxHeight={440}
        points={sitePoints(own.sites, vocab.categories)}
        pointsLabel="Published sites"
        emptyNote="No published site yet. Add one, load a file or capture on a phone; a second official publishes each site."
      />

      <section className="space-y-2 rounded-[3px] border border-line bg-surface p-4">
        <h3 className="text-[15px] font-semibold">Waiting on the institution</h3>
        <Msg msg={msg} />
        <WaitingList sites={live} vocab={all} act={act} busy={busy} ownerName={ownerName} />
      </section>

      <section className="space-y-2 rounded-[3px] border border-line bg-surface p-4">
        <h3 className="text-[15px] font-semibold">Sites</h3>
        {own.sites.length ? (
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Site</th><th className="text-start font-semibold">Where</th><th className="text-start font-semibold">How captured</th><th className="text-start font-semibold">Location</th><th className="text-start font-semibold">Stage</th></tr></thead>
            <tbody>
              {own.sites.map(s => (
                <tr key={s.id} id={`site-${s.id}`} className={`border-b border-line-soft align-top ${selected === s.id ? 'bg-surface-2' : ''}`}>
                  <td className="py-1.5"><span aria-hidden className="me-1.5">{cat(s)?.glyph}</span>
                    <button type="button" className="focus-ring font-semibold text-link underline-offset-2 hover:underline" onClick={() => setSelected(selected === s.id ? null : s.id)}>{s.name}</button>
                    <span className="block text-[12px] text-ink-muted">{cat(s)?.label}</span>
                  </td>
                  <td>{s.place.region ?? '—'}{s.place.district ? `, ${s.place.district}` : ''}</td>
                  <td>{methodName(s.location.method, vocab)}{s.location.accuracyM ? ` · ${s.location.accuracyM} m` : ''}</td>
                  <td>{s.state === 'published' ? CERT_WORD[s.certification.state].replace('Location ', '') : '—'}</td>
                  <td>{STATE_WORD[s.state]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-[13px] text-ink-muted">No site recorded yet.</p>}
        {site ? <SiteDetail site={site} vocab={all} act={act} busy={busy} ownerName={ownerName} onClose={() => setSelected(null)} /> : null}
        {own.imports.length ? (
          <details>
            <summary className="cursor-pointer text-[13px] text-link">Files loaded ({own.imports.length})</summary>
            <ul className="mt-1 space-y-0.5 text-[12px] text-ink-soft">
              {own.imports.map(i => <li key={i.id}>{when(i.at)} · {i.by} · {i.format.toUpperCase()} · {i.accepted} of {i.rows} rows · fingerprint <span className="font-mono">{i.sha256.slice(0, 12)}…</span></li>)}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}
