'use client';

// An institution's own sites (the Sites tab of its workspace): its sites on
// the national map, the list with their stage and certification, what waits
// on its officials (publish, certify, confirm moves), recording a new site,
// loading a file, connecting the institution's own system, and the phone
// page for capturing sites in the field.
// Paged like /gov/sites: the sites table reads the institution's sites a page
// at a time from the server (GET /api/facilities?ministry=&limit=, with its
// total and a search), the waiting list reads only what waits (?waiting=1),
// the map reads the published sites (as vector tiles above 20,000, clustered
// at low zoom), and an open record is read on its own when it is not on a
// page.
// API: /api/org/ministries/{id}/facilities; rules: lib/data/facilities.ts.

import * as React from 'react';
import Link from 'next/link';
import { NationMap } from '@/components/map/NationMap';
import { SiteForm, methodName } from './SiteForm';
import { SiteDetail, WaitingList, useSiteAction } from './SiteActions';
import { ImportPanel } from './ImportPanel';
import { SiteFeeds } from './SiteFeeds';
import { CERT_WORD, Msg, STATE_WORD, btn, callApi, input, label, sitePoints, siteTiles, useInstitutions, useRegister, when, type FacilityImport, type Site, type Vocabulary } from './shared';
import { TILE_REGISTER_SITES } from '@/lib/map/tile-loader';

/** Rows of the sites table read at first (four times as many are read by "Show more"), as on /gov/sites. */
const ROWS = 500;
/** Most items of the waiting list read at once. */
const WAITING = 1000;

/** Sites and their page from GET /api/facilities?ministry=…&limit=…; `more` appends the next page. */
interface Paged { sites: Site[]; total: number; next: number | null }

export function MinistrySites({ id, name }: { id: string; name?: string }) {
  // The vocabulary and the institution's own counts without the sites: the table, the
  // waiting list and the map each read only what they show.
  const mq = `ministry=${encodeURIComponent(id)}`;
  const { data: vocab, error, reload: reloadVocab } = useRegister(`${mq}&sites=none`);
  const institutions = useInstitutions();
  const [imports, setImports] = React.useState<FacilityImport[] | null>(null);
  const [loadErr, setLoadErr] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState<'form' | 'file' | 'system' | null>(null);
  // Bumped after every change so the table, the waiting list and the map read again.
  const [round, setRound] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [q, setQ] = React.useState('');
  React.useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  const loadImports = React.useCallback(async () => {
    try { setImports((await callApi<{ imports: FacilityImport[] }>(`/api/org/ministries/${encodeURIComponent(id)}/facilities?sites=none`)).imports); setLoadErr(''); }
    catch (e) { setLoadErr((e as Error).message); }
  }, [id]);
  React.useEffect(() => { void loadImports(); }, [loadImports]);
  const load = React.useCallback(async () => { await Promise.all([reloadVocab(), loadImports()]); setRound(n => n + 1); }, [reloadVocab, loadImports]);
  const { act, busy, msg } = useSiteAction(load);

  // The institution's sites table, a page at a time (the server filters, counts and generalises).
  const tableQuery = `${mq}&state=all${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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

  // What waits on the institution's officials, read on its own (not from the table's page).
  const [waiting, setWaiting] = React.useState<Paged | null>(null);
  React.useEffect(() => {
    let live = true;
    callApi<Vocabulary>(`/api/facilities?${mq}&state=all&waiting=1&limit=${WAITING}`)
      .then(j => { if (live) setWaiting({ sites: j.sites, total: j.page?.total ?? j.sites.length, next: j.page?.next ?? null }); })
      .catch(() => { if (live) setWaiting({ sites: [], total: 0, next: null }); });
    return () => { live = false; };
  }, [mq, round]);

  // The map: the institution's published sites as points, or from vector tiles at national scale.
  const counts = vocab?.ministryCounts;
  const large = (counts?.published ?? 0) > TILE_REGISTER_SITES;
  const version = React.useMemo(() => (vocab ? `${Date.now()}-${round}` : ''), [vocab, round]);
  const tiles = React.useMemo(() => (large && vocab ? siteTiles(vocab.categories, { ministry: id, version }) : undefined), [large, vocab, id, version]);
  const [mapSites, setMapSites] = React.useState<Site[]>([]);
  React.useEffect(() => {
    if (!vocab || large) { setMapSites([]); return; }
    let live = true;
    callApi<Vocabulary>(`/api/facilities?${mq}&state=published`).then(j => { if (live) setMapSites(j.sites); }).catch(() => { if (live) setMapSites([]); });
    return () => { live = false; };
  }, [vocab, large, mq, round]);

  // A map point's link ("#site-ID") opens that site's record.
  React.useEffect(() => {
    const read = () => { const h = decodeURIComponent(window.location.hash); if (h.startsWith('#site-')) setSelected(h.slice(6)); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  // The site whose record is open: from what is already read, else read on its own.
  const known = React.useMemo(() => [...(table?.sites ?? []), ...(waiting?.sites ?? []), ...mapSites], [table, waiting, mapSites]);
  const inKnown = selected ? known.find(s => s.id === selected) : undefined;
  const [fetched, setFetched] = React.useState<{ id: string; site: Site | null } | null>(null);
  React.useEffect(() => {
    if (!selected || inKnown) return;
    let live = true;
    callApi<{ site: Site }>(`/api/facilities/${encodeURIComponent(selected)}`)
      .then(j => { if (live) setFetched({ id: selected, site: j.site }); })
      .catch(() => { if (live) setFetched({ id: selected, site: null }); });
    return () => { live = false; };
  }, [selected, inKnown, round]);

  if ((error || loadErr) && (!vocab || !imports)) return <p role="alert" className="text-[13px] text-alert">The sites could not be read: {error || loadErr}</p>;
  if (!vocab || !imports) return <p className="text-[13px] text-ink-muted">Loading the institution&rsquo;s sites…</p>;
  const ownerName = (x: string) => institutions.find(m => m.id === x)?.name ?? (x === id ? name ?? x : x);
  const shown = table?.sites ?? [];
  const live = waiting?.sites ?? [];
  const site = inKnown ?? (fetched && fetched.id === selected ? fetched.site ?? undefined : undefined);
  const cat = (s: Site) => vocab.categories.find(c => c.key === s.category);
  const all = { ...vocab, sites: mapSites };
  const c = counts ?? { total: 0, published: 0, certified: 0, awaiting: 0, byCategory: {} };

  return (
    <div className="space-y-4 text-[14px] text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-[13px] text-ink-soft">
          The places {name ?? 'this institution'} runs, each with where it stands. {c.total.toLocaleString()} recorded, {c.published.toLocaleString()} published,
          {' '}{c.certified.toLocaleString()} with a certified location.
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
          <SiteForm ministryId={id} ministryName={name} vocab={all} tiles={tiles} onRecorded={() => void load()} />
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
        points={large ? undefined : sitePoints(mapSites, vocab.categories)}
        pointTiles={tiles}
        cluster
        selectedPoint={selected ?? undefined}
        pointsLabel="Published sites"
        emptyNote={tiles || mapSites.length ? undefined : 'No published site yet. Add one, load a file or capture on a phone; a second official publishes each site.'}
      />

      <section className="space-y-2 rounded-[3px] border border-line bg-surface p-4">
        <h3 className="text-[15px] font-semibold">Waiting on the institution</h3>
        <Msg msg={msg} />
        {waiting ? <WaitingList sites={live} vocab={all} act={act} busy={busy} ownerName={ownerName} /> : <p className="text-[13px] text-ink-muted">Reading what is waiting…</p>}
        {waiting && waiting.total > waiting.sites.length ? (
          <p className="text-[12px] text-ink-muted">The first {waiting.sites.length.toLocaleString()} of {waiting.total.toLocaleString()} sites with something waiting; the rest appear as these are dealt with.</p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-[3px] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold">Sites</h3>
          <span className="text-[12px] text-ink-muted">{table ? `${shown.length.toLocaleString()} shown of ${table.total.toLocaleString()}${q ? ' matching' : ''}` : 'reading…'}</span>
        </div>
        <label className={`${label} max-w-sm`}>Search
          <input type="search" className={`${input} mt-1`} value={search} onChange={e => setSearch(e.currentTarget.value)} placeholder="Name, FAC id or code" />
        </label>
        {tableError ? <p role="alert" className="text-[13px] text-alert">The sites could not be read: {tableError}</p> : null}
        {!table ? <p className="text-[13px] text-ink-muted">Reading the sites…</p> : shown.length ? (
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Site</th><th className="text-start font-semibold">Where</th><th className="text-start font-semibold">How captured</th><th className="text-start font-semibold">Location</th><th className="text-start font-semibold">Stage</th></tr></thead>
            <tbody>
              {[...shown, ...(site && !shown.some(s => s.id === site.id) ? [site] : [])].map(s => (
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
        ) : <p className="text-[13px] text-ink-muted">{q ? 'No site matches.' : 'No site recorded yet.'}</p>}
        {table && table.next !== null ? (
          <button type="button" disabled={loadingMore} onClick={() => void more()} className="focus-ring rounded-[3px] border border-line px-2 py-1 text-[12px] text-ink-soft hover:text-ink disabled:opacity-50">
            {loadingMore ? 'Reading…' : `Show ${Math.min(ROWS * 4, table.total - shown.length).toLocaleString()} more of ${(table.total - shown.length).toLocaleString()} not shown`}
          </button>
        ) : null}
        {site ? <SiteDetail site={site} vocab={all} act={act} busy={busy} ownerName={ownerName} onClose={() => setSelected(null)} />
          : selected && fetched?.id === selected && !fetched.site ? <p className="text-[13px] text-ink-muted">That site is not in the register.</p> : null}
        {imports.length ? (
          <details>
            <summary className="cursor-pointer text-[13px] text-link">Files loaded ({imports.length})</summary>
            <ul className="mt-1 space-y-0.5 text-[12px] text-ink-soft">
              {imports.map(i => <li key={i.id}>{when(i.at)} · {i.by} · {i.format.toUpperCase()} · {i.accepted} of {i.rows} rows · fingerprint <span className="font-mono">{i.sha256.slice(0, 12)}…</span></li>)}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}
