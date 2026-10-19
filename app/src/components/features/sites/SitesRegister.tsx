'use client';

// The national facility register for the whole government (/gov/sites, a tab
// of National data): every published site on the national map, the register
// as a table with how each position was captured and whether its location is
// certified, what is waiting on officials (publish, certify, confirm moves),
// one site's record, adding a site, loading existing data from a file, and
// how the nation runs its register (its policy). Sites are declared by their
// institutions (reported); certified sites have had their location checked.
// At national scale (more than 20,000 published sites) the map reads the
// sites as vector tiles for what it shows and draws them with WebGL
// (components/map/NationMap.tsx `pointTiles`), and the register table shows
// them a page at a time; below that everything is as before.
// Design: docs/FACILITY_REGISTER_REVIEW.md. Rules: lib/data/facilities.ts.

import * as React from 'react';
import Link from 'next/link';
import { NationMap } from '@/components/map/NationMap';
import { ActingOfficial } from '@/components/ui/ActingOfficial';
import { useOfficial, useSignIn } from '@/lib/official';
import { SiteForm, methodName } from './SiteForm';
import { SiteDetail, WaitingList, useSiteAction } from './SiteActions';
import { PolicyPanel } from './PolicyPanel';
import { ImportPanel } from './ImportPanel';
import { CandidatesPanel } from './CandidatesPanel';
import { ConnectionsPanel } from './ConnectionsPanel';
import {
  CERT_WORD, Count, LEVEL_WORD, Msg, STATE_WORD, input, label, sitePoints, siteTiles, useInstitutions, useRegister,
  type Site,
} from './shared';
import { TILE_REGISTER_SITES } from '@/lib/map/tile-loader';

/** Rows of the register table shown at first (and added by "Show more"). */
const ROWS = 500;

type StateFilter = 'current' | 'published' | 'proposed' | 'withdrawn';

function Panel({ id, title, meta, children }: { id?: string; title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="space-y-3 rounded-[3px] border border-line bg-surface p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={id ? `${id}-h` : undefined} className="text-[16px] font-semibold text-ink">{title}</h3>
        {meta ? <span className="text-[12px] text-ink-muted">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function SitesRegister() {
  const { data, error, reload } = useRegister('state=all');
  const institutions = useInstitutions();
  const [official, setOfficial] = useOfficial();
  const own = useSignIn()?.official?.institution;
  const [filter, setFilter] = React.useState({ ministry: '', category: '', region: '', state: 'current' as StateFilter });
  const [selected, setSelected] = React.useState<string | null>(null);
  const [addFor, setAddFor] = React.useState('');
  const { act, busy, msg } = useSiteAction(reload);
  const detailRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (own) setAddFor(own); }, [own]);

  // A map point or a link "#site-ID" opens that site's record.
  React.useEffect(() => {
    // "#site-FAC-00012" from the register itself; "#FAC-00012" from the other maps' links.
    const read = () => { const h = decodeURIComponent(window.location.hash); if (h.startsWith('#site-')) setSelected(h.slice(6)); else if (/^#FAC-\d+$/.test(h)) setSelected(h.slice(1)); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  React.useEffect(() => { if (selected) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'nearest' })); }, [selected]);
  const [rows, setRows] = React.useState(ROWS);
  React.useEffect(() => { setRows(ROWS); }, [filter]);
  // A national-scale register is drawn from vector tiles; each reload of the register reads them afresh.
  const large = (data?.counts.published ?? 0) > TILE_REGISTER_SITES;
  const version = React.useMemo(() => (data ? String(Date.now()) : ''), [data]);
  const tiles = React.useMemo(() => (large && data && (filter.state === 'current' || filter.state === 'published')
    ? siteTiles(data.categories, { ministry: filter.ministry, category: filter.category, region: filter.region, version }) : undefined),
  [large, data, filter.ministry, filter.category, filter.region, filter.state, version]);

  if (error && !data) return <p role="alert" className="text-alert">The register could not be read: {error}</p>;
  if (!data) return <p className="text-[13px] text-ink-muted">Loading the register…</p>;

  const ownerName = (id: string) => institutions.find(m => m.id === id)?.name ?? id;
  const regions = [...new Set(data.sites.map(s => s.place.region).filter((r): r is string => !!r))].sort();
  const shown = data.sites.filter(s =>
    (filter.state === 'current' ? s.state !== 'withdrawn' : s.state === filter.state)
    && (!filter.ministry || s.ownerId === filter.ministry)
    && (!filter.category || s.category === filter.category)
    && (!filter.region || s.place.region === filter.region));
  const site = selected ? data.sites.find(s => s.id === selected) : undefined;
  const cat = (s: Site) => data.categories.find(c => c.key === s.category);
  const live = data.sites.filter(s => s.state !== 'withdrawn');

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 text-[14px] text-ink">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Sites on the national map</h2>
          <p className="mt-1 max-w-3xl text-ink-soft">
            Every school, health facility, police station, power station, airport and office, recorded once by the institution that owns it with
            where it stands. Positions are declared by the institutions; a certified location has been checked
            ({data.policy.certification === 'institution' ? 'by the institution' : data.policy.certification === 'mapping-agency' ? 'by the mapping agency' : 'by the institution, then the mapping agency'}).
            {' '}<Link href="/gov/sites/capture" className="text-link underline">Capture a site on a phone</Link>
            {' · '}<a href="/api/facilities/cityjson" className="text-link underline" download>Download in 3D (CityJSON)</a>
          </p>
        </div>
        <ActingOfficial name={official} onChange={setOfficial} />
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Count n={data.counts.total} label="Sites recorded" note="not withdrawn" />
        <Count n={data.counts.published} label="Published" />
        <Count n={data.counts.certified} label="Location certified" />
        <Count n={data.counts.awaiting} label="Awaiting certification" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4" role="group" aria-label="Filter the register">
        <label className={label}>Institution
          <select className={`${input} mt-1`} value={filter.ministry} onChange={e => setFilter({ ...filter, ministry: e.currentTarget.value })}>
            <option value="">All institutions</option>
            {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className={label}>Kind of site
          <select className={`${input} mt-1`} value={filter.category} onChange={e => setFilter({ ...filter, category: e.currentTarget.value })}>
            <option value="">All kinds</option>
            {data.categories.map(c => <option key={c.key} value={c.key}>{c.glyph} {c.label}{data.counts.byCategory[c.key] ? ` (${data.counts.byCategory[c.key]})` : ''}</option>)}
          </select>
        </label>
        <label className={label}>Region
          <select className={`${input} mt-1`} value={filter.region} onChange={e => setFilter({ ...filter, region: e.currentTarget.value })}>
            <option value="">All regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className={label}>Stage
          <select className={`${input} mt-1`} value={filter.state} onChange={e => setFilter({ ...filter, state: e.currentTarget.value as StateFilter })}>
            <option value="current">Published and waiting</option>
            <option value="published">Published</option>
            <option value="proposed">Waiting to be published</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </label>
      </div>

      <NationMap
        title="Published sites"
        kind="reported"
        source="Declared by the institutions that own them; certified locations have been checked"
        points={large ? undefined : sitePoints(shown, data.categories)}
        pointTiles={tiles}
        selectedPoint={selected ?? undefined}
        pointsLabel="Published sites (circle: location certified; diamond: awaiting certification; triangle: location rejected)"
        emptyNote={shown.some(s => s.state === 'published') ? undefined : 'No published site matches yet. Institutions add sites below, on the phone page or from a file; each is published by a second official.'}
      />

      <details className="rounded-[3px] border border-line p-3 text-[13px]">
        <summary className="cursor-pointer font-semibold">Kinds of site and the standards they map to</summary>
        <p className="mt-1 text-ink-soft">Each kind of site is exchanged in the vocabularies other systems use: INSPIRE themes and codes, HXL hashtags (humanitarian data), OpenStreetMap tags (which also recognise kinds of site in open datasets) and Smart Data Models types. The open data service carries them with every site.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[12px]">
            <caption className="sr-only">Kinds of site and their INSPIRE, HXL, OpenStreetMap and Smart Data Models equivalents</caption>
            <thead><tr className="border-b border-line text-ink-muted">
              <th className="py-1 text-start font-semibold">Kind of site</th><th className="text-start font-semibold">INSPIRE</th><th className="text-start font-semibold">HXL</th>
              <th className="text-start font-semibold">OpenStreetMap</th><th className="text-start font-semibold">Smart Data Models</th>
            </tr></thead>
            <tbody>
              {data.categories.filter(c => c.standards).map(c => (
                <tr key={c.key} className="border-b border-line-soft align-top">
                  <td className="py-1"><span aria-hidden className="me-1.5">{c.glyph}</span>{c.label}</td>
                  <td>{c.standards!.inspire.theme} · {c.standards!.inspire.featureType}{c.standards!.inspire.code ? <span className="font-mono"> {c.standards!.inspire.code}</span> : null}</td>
                  <td className="font-mono">{c.standards!.hxl.tag}</td>
                  <td className="font-mono">{Object.entries(c.standards!.osm.tags).flatMap(([k, vs]) => vs.map(v => `${k}=${v}`)).join(', ')}</td>
                  <td>{c.standards!.smartDataModel.type} <span className="text-ink-muted">({c.standards!.smartDataModel.category})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <Panel id="waiting" title="Waiting on you" meta="publish, certify, confirm moves">
        <Msg msg={msg} />
        <WaitingList sites={live} vocab={data} act={act} busy={busy} ownerName={ownerName} />
      </Panel>

      <Panel id="register" title="The register" meta={`${shown.length} of ${data.sites.length} sites`}>
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-ink-muted">
                  <th className="py-1 text-start font-semibold">Site</th><th className="text-start font-semibold">Institution</th><th className="text-start font-semibold">Where</th>
                  <th className="text-start font-semibold">How captured</th><th className="text-start font-semibold">Accuracy</th><th className="text-start font-semibold">Location</th>
                  <th className="text-start font-semibold">Sensitivity</th><th className="text-start font-semibold">Stage</th>
                </tr>
              </thead>
              <tbody>
                {(shown.length > rows ? [...shown.slice(0, rows), ...(site && shown.indexOf(site) >= rows ? [site] : [])] : shown).map(s => (
                  <tr key={s.id} id={`site-${s.id}`} className={`border-b border-line-soft align-top ${selected === s.id ? 'bg-surface-2' : ''}`}>
                    <td className="py-1.5">
                      <span aria-hidden className="me-1.5">{cat(s)?.glyph}</span>
                      <a href={`#site-${s.id}`} className="font-semibold text-link underline-offset-2 hover:underline" onClick={() => setSelected(s.id)}>{s.name}</a>
                      <span className="block text-[12px] text-ink-muted">{cat(s)?.label}</span>
                    </td>
                    <td>{ownerName(s.ownerId)}</td>
                    <td>{s.place.region ?? <span className="text-warn">outside drawn boundary</span>}{s.place.district ? <span className="block text-[12px] text-ink-muted">{s.place.district}</span> : null}</td>
                    <td>{methodName(s.location.method, data)}</td>
                    <td className="font-mono">{s.location.accuracyM ? `${s.location.accuracyM.toLocaleString()} m` : '—'}</td>
                    <td className={s.state !== 'published' ? 'text-ink-muted' : s.certification.state === 'certified' ? 'text-ok' : s.certification.state === 'rejected' ? 'text-alert' : 'text-warn'}>
                      {s.state === 'published' ? CERT_WORD[s.certification.state].replace('Location ', '') : '—'}
                      {s.certification.stamps.length ? <span className="block text-[12px] text-ink-muted">{s.certification.stamps.map(st => `${st.decision} by ${st.by}`).join('; ')}</span> : null}
                    </td>
                    <td>{LEVEL_WORD[s.sensitivity]}{s.generalised ? <span className="block text-[12px] text-warn">position generalised</span> : null}</td>
                    <td>{STATE_WORD[s.state]}{s.pendingVersion ? <span className="block text-[12px] text-warn">move waiting</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-ink-muted">No site matches.</p>}
        {shown.length > rows ? (
          <button type="button" onClick={() => setRows(n => n + ROWS * 4)} className="focus-ring rounded-[3px] border border-line px-2 py-1 text-[12px] text-ink-soft hover:text-ink">
            Show {Math.min(ROWS * 4, shown.length - rows).toLocaleString()} more of {(shown.length - rows).toLocaleString()} not shown
          </button>
        ) : null}
        <div ref={detailRef}>
          {site ? <SiteDetail site={site} vocab={data} act={act} busy={busy} ownerName={ownerName} onClose={() => { setSelected(null); history.replaceState(null, '', window.location.pathname + window.location.search); }} />
            : selected ? <p className="text-[13px] text-ink-muted">That site is not in the register.</p> : null}
        </div>
      </Panel>

      <Panel id="add" title="Add a site" meta="recorded as proposed; a different official publishes it">
        <label className={`${label} max-w-md`}>Institution that owns the site
          <select className={`${input} mt-1`} value={addFor} disabled={!!own} onChange={e => setAddFor(e.currentTarget.value)}>
            <option value="">Choose an institution</option>
            {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {own ? <span className="mt-1 block text-[12px] text-ink-muted">You record sites for your own institution.</span> : null}
        </label>
        {addFor ? <SiteForm key={addFor} ministryId={addFor} ministryName={ownerName(addFor)} vocab={data} onRecorded={() => void reload()} /> : null}
      </Panel>

      <Panel id="load" title="Load existing data" meta="checked first; nothing changes until you load">
        <ImportPanel vocab={data} institutions={institutions} onLoaded={reload} />
      </Panel>

      <Panel id="connections" title="Who is connected" meta="from records on the platform only">
        <ConnectionsPanel />
      </Panel>

      <Panel id="open-data" title="Suggestions from open data" meta="nothing is published from an open dataset">
        <CandidatesPanel vocab={data} institutions={institutions} onChanged={reload} />
      </Panel>

      <Panel id="policy" title="How the nation runs its register" meta={`policy version ${data.policy.version}`}>
        <PolicyPanel vocab={data} institutions={institutions} onChanged={reload} />
      </Panel>
    </div>
  );
}
