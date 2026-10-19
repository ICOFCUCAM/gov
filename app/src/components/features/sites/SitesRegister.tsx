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
// them a page at a time. The register table reads the register a page at a
// time from the server (GET /api/facilities?limit=, with the total that
// matches its filters and search), the waiting list reads only what waits
// (?waiting=1), and an open record is read on its own when it is not on a page.
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
  CERT_WORD, Count, LEVEL_WORD, Msg, STATE_WORD, STATUS_WORD, callApi, input, label, sitePoints, siteTiles, useInstitutions, useRegister,
  type Site, type Vocabulary,
} from './shared';
import { TILE_REGISTER_SITES } from '@/lib/map/tile-loader';

/** Rows of the register table read at first (four times as many are read by "Show more"). */
const ROWS = 500;
/** Most items of the waiting list read at once. */
const WAITING = 1000;

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

/** Sites and their page from GET /api/facilities?limit=…; `more` appends the next page. */
interface Paged { sites: Site[]; total: number; next: number | null }

const filterQuery = (f: { ministry: string; category: string; region: string }) =>
  `${f.ministry ? `&ministry=${encodeURIComponent(f.ministry)}` : ''}${f.category ? `&category=${encodeURIComponent(f.category)}` : ''}${f.region ? `&region=${encodeURIComponent(f.region)}` : ''}`;

export function SitesRegister() {
  // The vocabulary, counts and policy without the sites: the table, the waiting
  // list and the map each read only what they show.
  const { data, error, reload: reloadVocab } = useRegister('sites=none');
  const institutions = useInstitutions();
  const [official, setOfficial] = useOfficial();
  const own = useSignIn()?.official?.institution;
  const [filter, setFilter] = React.useState({ ministry: '', category: '', region: '', state: 'current' as StateFilter, status: '', q: '' });
  const [search, setSearch] = React.useState('');
  React.useEffect(() => { const t = setTimeout(() => setFilter(f => (f.q === search.trim() ? f : { ...f, q: search.trim() })), 300); return () => clearTimeout(t); }, [search]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [addFor, setAddFor] = React.useState('');
  // Bumped after every change so the table, the waiting list and the map read again.
  const [round, setRound] = React.useState(0);
  const reload = React.useCallback(async () => { await reloadVocab(); setRound(n => n + 1); }, [reloadVocab]);
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
  // A national-scale register is drawn from vector tiles; each reload of the register reads them afresh.
  const large = (data?.counts.published ?? 0) > TILE_REGISTER_SITES;
  const version = React.useMemo(() => (data ? `${Date.now()}-${round}` : ''), [data, round]);
  const mapStage = filter.state === 'current' || filter.state === 'published';
  const tiles = React.useMemo(() => (large && data && mapStage
    ? siteTiles(data.categories, { ministry: filter.ministry, category: filter.category, region: filter.region, version }) : undefined),
  [large, data, filter.ministry, filter.category, filter.region, mapStage, version]);
  // Every published site for the add form's map, read from tiles at national scale.
  const allTiles = React.useMemo(() => (large && data ? siteTiles(data.categories, { version }) : undefined), [large, data, version]);

  // The register table, a page at a time (the server filters, counts and generalises).
  const fq = filterQuery(filter);
  const tableQuery = `state=${filter.state}${fq}${filter.status ? `&status=${encodeURIComponent(filter.status)}` : ''}${filter.q ? `&q=${encodeURIComponent(filter.q)}` : ''}`;
  const [table, setTable] = React.useState<Paged | null>(null);
  const [tableError, setTableError] = React.useState('');
  const [loadingMore, setLoadingMore] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    callApi<Vocabulary>(`/api/facilities?${tableQuery}&limit=${ROWS}&offset=0`)
      .then(j => { if (live) { setTable({ sites: j.sites, total: j.page?.total ?? j.sites.length, next: j.page?.next ?? null }); setTableError(''); } })
      .catch(e => { if (live) setTableError((e as Error).message); });
    return () => { live = false; };
  }, [tableQuery, round]);
  const more = async () => {
    if (!table || table.next === null) return;
    setLoadingMore(true);
    try {
      const j = await callApi<Vocabulary>(`/api/facilities?${tableQuery}&limit=${ROWS * 4}&offset=${table.next}`);
      setTable(t => (t ? { sites: [...t.sites, ...j.sites], total: j.page?.total ?? t.total, next: j.page?.next ?? null } : t));
    } catch (e) { setTableError((e as Error).message); }
    finally { setLoadingMore(false); }
  };

  // What waits on officials, read on its own (not from the table's page).
  const [waiting, setWaiting] = React.useState<Paged | null>(null);
  React.useEffect(() => {
    let live = true;
    callApi<Vocabulary>(`/api/facilities?state=all&waiting=1&limit=${WAITING}`)
      .then(j => { if (live) setWaiting({ sites: j.sites, total: j.page?.total ?? j.sites.length, next: j.page?.next ?? null }); })
      .catch(() => { if (live) setWaiting({ sites: [], total: 0, next: null }); });
    return () => { live = false; };
  }, [round]);

  // Below national scale the map draws the published sites that match the filters as points.
  const [mapSites, setMapSites] = React.useState<Site[]>([]);
  React.useEffect(() => {
    if (!data || large || !mapStage) { setMapSites([]); return; }
    let live = true;
    callApi<Vocabulary>(`/api/facilities?state=published${fq}`).then(j => { if (live) setMapSites(j.sites); }).catch(() => { if (live) setMapSites([]); });
    return () => { live = false; };
  }, [data, large, mapStage, fq, round]);
  // Every published site for the add form's map (below national scale).
  const [allSites, setAllSites] = React.useState<Site[]>([]);
  React.useEffect(() => {
    if (!data || large || !addFor) return;
    let live = true;
    callApi<Vocabulary>('/api/facilities?state=published').then(j => { if (live) setAllSites(j.sites); }).catch(() => undefined);
    return () => { live = false; };
  }, [data, large, addFor, round]);

  // The site whose record is open: from what is already read, else read on its own.
  const known = React.useMemo(() => [...(table?.sites ?? []), ...(waiting?.sites ?? []), ...mapSites], [table, waiting, mapSites]);
  const [fetched, setFetched] = React.useState<{ id: string; site: Site | null } | null>(null);
  const inKnown = selected ? known.find(s => s.id === selected) : undefined;
  React.useEffect(() => {
    if (!selected || inKnown) return;
    let live = true;
    callApi<{ site: Site }>(`/api/facilities/${encodeURIComponent(selected)}`)
      .then(j => { if (live) setFetched({ id: selected, site: j.site }); })
      .catch(() => { if (live) setFetched({ id: selected, site: null }); });
    return () => { live = false; };
  }, [selected, inKnown, round]);

  if (error && !data) return <p role="alert" className="text-alert">The register could not be read: {error}</p>;
  if (!data) return <p className="text-[13px] text-ink-muted">Loading the register…</p>;

  const ownerName = (id: string) => institutions.find(m => m.id === id)?.name ?? id;
  const regions = data.regions ?? [];
  const shown = table?.sites ?? [];
  const site = inKnown ?? (fetched && fetched.id === selected ? fetched.site ?? undefined : undefined);
  const lookingUp = !!selected && !site && !(fetched && fetched.id === selected);
  const cat = (s: Site) => data.categories.find(c => c.key === s.category);
  const live = waiting?.sites ?? [];

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

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Filter the register">
        <label className={label}>Search
          <input type="search" className={`${input} mt-1`} value={search} onChange={e => setSearch(e.currentTarget.value)} placeholder="Name, FAC id or code" />
        </label>
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
        <label className={label}>Status
          <select className={`${input} mt-1`} value={filter.status} onChange={e => setFilter({ ...filter, status: e.currentTarget.value })}>
            <option value="">Any status</option>
            {data.statuses.map(s => <option key={s} value={s}>{STATUS_WORD[s]}</option>)}
          </select>
        </label>
      </div>
      {filter.status || filter.q ? <p className="text-[12px] text-ink-muted">Search and status narrow the register table; the map shows every published site for the other filters.</p> : null}

      <NationMap
        title="Published sites"
        kind="reported"
        source="Declared by the institutions that own them; certified locations have been checked"
        points={large ? undefined : sitePoints(mapSites, data.categories)}
        pointTiles={tiles}
        cluster
        selectedPoint={selected ?? undefined}
        pointsLabel="Published sites (circle: location certified; diamond: awaiting certification; triangle: location rejected)"
        emptyNote={tiles || mapSites.length ? undefined : 'No published site matches yet. Institutions add sites below, on the phone page or from a file; each is published by a second official.'}
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
        {waiting ? <WaitingList sites={live} vocab={data} act={act} busy={busy} ownerName={ownerName} /> : <p className="text-[13px] text-ink-muted">Reading what is waiting…</p>}
        {waiting && waiting.total > waiting.sites.length ? (
          <p className="text-[12px] text-ink-muted">The first {waiting.sites.length.toLocaleString()} of {waiting.total.toLocaleString()} sites with something waiting; the rest appear as these are dealt with.</p>
        ) : null}
      </Panel>

      <Panel id="register" title="The register" meta={table ? `${shown.length.toLocaleString()} shown of ${table.total.toLocaleString()} matching · ${data.counts.total.toLocaleString()} recorded` : 'reading…'}>
        {tableError ? <p role="alert" className="text-[13px] text-alert">The register table could not be read: {tableError}</p> : null}
        {!table ? <p className="text-[13px] text-ink-muted">Reading the register…</p> : shown.length ? (
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
                {[...shown, ...(site && !shown.some(s => s.id === site.id) ? [site] : [])].map(s => (
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
        {table && table.next !== null ? (
          <button type="button" disabled={loadingMore} onClick={() => void more()} className="focus-ring rounded-[3px] border border-line px-2 py-1 text-[12px] text-ink-soft hover:text-ink disabled:opacity-50">
            {loadingMore ? 'Reading…' : `Show ${Math.min(ROWS * 4, table.total - shown.length).toLocaleString()} more of ${(table.total - shown.length).toLocaleString()} not shown`}
          </button>
        ) : null}
        <div ref={detailRef}>
          {site ? <SiteDetail site={site} vocab={data} act={act} busy={busy} ownerName={ownerName} onClose={() => { setSelected(null); history.replaceState(null, '', window.location.pathname + window.location.search); }} />
            : lookingUp ? <p className="text-[13px] text-ink-muted">Reading the site…</p>
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
        {addFor ? <SiteForm key={addFor} ministryId={addFor} ministryName={ownerName(addFor)} vocab={{ ...data, sites: allSites }} tiles={allTiles} onRecorded={() => void reload()} /> : null}
      </Panel>

      <Panel id="load" title="Load existing data" meta="checked first; nothing changes until you load">
        <ImportPanel vocab={data} institutions={institutions} onLoaded={reload} />
      </Panel>

      <Panel id="connections" title="Who is connected" meta="from records on the platform only">
        <ConnectionsPanel />
      </Panel>

      <Panel id="open-data" title="Suggestions from open data" meta="nothing is published from an open dataset">
        <CandidatesPanel vocab={{ ...data, sites: known }}institutions={institutions} onChanged={reload} />
      </Panel>

      <Panel id="policy" title="How the nation runs its register" meta={`policy version ${data.policy.version}`}>
        <PolicyPanel vocab={data} institutions={institutions} onChanged={reload} />
      </Panel>
    </div>
  );
}
