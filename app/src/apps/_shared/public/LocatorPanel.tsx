'use client';

// A public site's "find us" locator: the institution's own published sites
// from the national facility register on the nation's real outline, with a
// working search box (name, region or district), category tabs that filter by
// register category where they name one, and an accessible list (name, region,
// a link that opens the place in the visitor's own maps app). When the
// institution has registered nothing yet it says so instead of showing pins.
// The data is prepared on the server (locator-data.ts). When the institution
// has more sites than the page carries, a search or "Show all" reads the rest
// from the platform's own public tile archive (locator-archive.ts, loaded on
// demand); nothing leaves the platform.

import * as React from 'react';
import type { SiteLocations, LocatorSite } from './locator-types';

// The locator's wording comes from siteMessages(locale).locator (lib/i18n,
// every site language), passed in by the page as `text`; this English copy
// is the fallback for callers that do not pass it.
export const LOCATOR_TEXT = {
  empty: 'Locations will appear here once the {name} registers its offices.',
  noMatch: 'No registered location matches.',
  count: '{count} registered locations',
  countOne: '1 registered location',
  showAll: 'Show all {count}',
  showFewer: 'Show fewer',
  approx: 'approximate location',
  open: 'Open in maps',
  openLabel: 'Open {name} in your maps app',
  mapLabel: '{country}: {count} registered locations of the {name}',
  mapEmpty: '{country}: no registered locations yet',
  source: 'From the national facility register',
  more: 'Showing {shown} of {total}; search to narrow.',
  tabs: 'Kinds of location',
} as const;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

export interface LocatorTheme { primary: string; ink: string; line: string; surfaceMute: string }

const LIST_FIRST = 4;

export function LocatorPanel({
  data, institution, placeholder, tabs, pinLabel, theme, radius, tabStyle = 'chips', order = 'tabs-first', inputClass = '', text = LOCATOR_TEXT,
}: {
  /** The locator's wording in the visitor's language: siteMessages(locale).locator. */
  text?: { [K in keyof typeof LOCATOR_TEXT]: string };
  data?: SiteLocations;
  /** The institution's name, for the empty state. */
  institution: string;
  placeholder: string;
  tabs: string[];
  pinLabel: string;
  theme: LocatorTheme;
  /** Corner radius of the design (composed presets); the Civic Standard look when absent. */
  radius?: number;
  tabStyle?: 'chips' | 'panel';
  order?: 'tabs-first' | 'map-first';
  inputClass?: string;
}) {
  const id = React.useId();
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState(0);
  const [all, setAll] = React.useState(false);
  const [hot, setHot] = React.useState<string | null>(null);
  // The rest of the institution's sites, read from the public tile archive once the visitor searches or asks for all.
  const [extra, setExtra] = React.useState<LocatorSite[] | null>(null);
  const wantsMore = !!data?.institutionId && !!data.map?.mercator && data.total > data.sites.length && (q.trim() !== '' || all);
  React.useEffect(() => {
    if (!wantsMore || extra || !data) return;
    let live = true;
    setExtra([]);
    import('./locator-archive').then(m => m.archiveSites(data)).then(s => { if (live) setExtra(s); }).catch(() => { if (live) setExtra(null); });
    return () => { live = false; };
  }, [wantsMore]); // eslint-disable-line react-hooks/exhaustive-deps
  const sites = React.useMemo(() => {
    const base = data?.sites ?? [];
    if (!extra?.length) return base;
    const have = new Set(base.map(s => s.id));
    return [...base, ...extra.filter(s => !have.has(s.id))];
  }, [data, extra]);
  const cats = data?.tabCategories?.[tab] ?? null;
  const needle = q.trim().toLowerCase();
  const match = (s: LocatorSite) =>
    (!cats || cats.includes(s.category)) &&
    (!needle || [s.name, s.region, s.district, s.categoryLabel].some(v => v?.toLowerCase().includes(needle)));
  const shown = sites.filter(match);
  const list = all ? shown : shown.slice(0, LIST_FIRST);
  const rad = radius ?? 8;
  const map = data?.map ?? null;
  const empty = !sites.length;

  const search = (
    <div className={`flex items-center gap-2 border px-2 py-1.5 text-[12px] text-slate-600 ${inputClass}`} style={{ borderColor: theme.line, borderRadius: radius ?? 6 }}>
      <span aria-hidden>⌕</span>
      <label htmlFor={`${id}-q`} className="sr-only">{placeholder}</label>
      <input id={`${id}-q`} type="search" value={q} onChange={e => { setQ(e.target.value); setAll(false); }} placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-600 focus:outline-none" />
    </div>
  );

  const tabButton = (t: string, i: number) => {
    const on = tab === i;
    return (
      <button key={t} type="button" aria-pressed={on} onClick={() => { setTab(i); setAll(false); }}
        title={data?.tabCategories?.[i] ? undefined : 'Shows every registered location'}
        className={tabStyle === 'panel' ? 'w-full border px-3 py-2 text-start text-[12px] font-medium' : 'rounded-full px-2.5 py-0.5 text-[10px] font-medium'}
        style={tabStyle === 'panel'
          ? { borderColor: on ? theme.primary : theme.line, borderInlineStartWidth: on ? 3 : 1, borderRadius: rad, color: theme.ink }
          : on ? { background: theme.primary, color: '#fff' } : { border: `1px solid ${theme.line}`, color: '#475569' }}>{t}</button>
    );
  };
  const tabRow = tabStyle === 'panel'
    ? <ul className="mt-3 grid grid-cols-2 gap-2" aria-label={text.tabs}>{tabs.map((t, i) => <li key={t}>{tabButton(t, i)}</li>)}</ul>
    : <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={text.tabs}>{tabs.map(tabButton)}</div>;

  const pins = shown.filter(s => Number.isFinite(s.x) && Number.isFinite(s.y));
  const dimmed = sites.filter(s => !match(s) && Number.isFinite(s.x));
  const many = pins.length > 30;
  const mapBox = (
    <div className="relative mt-2 overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.surfaceMute}, #c3d4e6)`, borderRadius: radius ?? 8 }}>
      {map ? (
        <svg viewBox={`0 0 ${map.w} ${map.h}`} className="block h-36 w-full" preserveAspectRatio="xMidYMid meet" role="img"
          aria-label={empty ? fill(text.mapEmpty, { country: map.country }) : fill(text.mapLabel, { country: map.country, count: pins.length, name: institution })}>
          <title>{map.credit}</title>
          {map.land ? <path d={map.land} fill="#fff" fillOpacity="0.88" stroke={theme.primary} strokeOpacity={map.regions ? 0.18 : 0.45} strokeWidth={map.regions ? 0.5 : 0.9} strokeLinejoin="round" /> : null}
          {map.capital ? (
            <g aria-hidden>
              <circle cx={map.capital.x} cy={map.capital.y} r="2.6" fill="none" stroke={theme.ink} strokeOpacity="0.55" strokeWidth="0.9" />
              <circle cx={map.capital.x} cy={map.capital.y} r="0.9" fill={theme.ink} fillOpacity="0.55" />
            </g>
          ) : null}
          {dimmed.length ? <path d={dimmed.map(s => `M${s.x - 2} ${s.y}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`).join('')} fill={theme.primary} fillOpacity="0.22" /> : null}
          {many
            ? <path d={pins.map(s => `M${s.x - 2.6} ${s.y}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0`).join('')} fill={theme.primary} stroke="#fff" strokeWidth="0.8" />
            : pins.map(s => {
              const big = hot === s.id;
              return (
                <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
                  {s.approx ? <circle r="11" fill={theme.primary} fillOpacity="0.12" stroke={theme.primary} strokeOpacity="0.4" strokeDasharray="2 2" strokeWidth="0.6" /> : null}
                  <circle r={big ? 9 : 7} fill={theme.primary} stroke="#fff" strokeWidth="1.4" />
                  <text y={big ? 3.2 : 2.5} textAnchor="middle" fontSize={big ? 8.5 : 7} fontWeight="700" fill="#fff">{pinLabel}</text>
                </g>
              );
            })}
        </svg>
      ) : <div className="h-36" aria-hidden />}
      {empty ? (
        <p className="absolute inset-x-3 bottom-2 rounded-md bg-white/95 px-2 py-1.5 text-center text-[11px] font-medium text-slate-700 shadow-sm">
          {fill(text.empty, { name: institution })}
        </p>
      ) : null}
    </div>
  );

  const listBlock = empty ? null : (
    <div className="mt-2">
      <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-[10px] text-slate-600" role="status">
        <span className="font-semibold" style={{ color: theme.ink }}>{shown.length === 1 ? text.countOne : fill(text.count, { count: shown.length })}</span>
        <span>{text.source}</span>
      </p>
      {shown.length ? (
        <ul className="mt-1 divide-y" style={{ borderColor: theme.line }}>
          {list.map(s => (
            <li key={s.id} className="flex items-start justify-between gap-2 py-1.5" style={{ borderColor: theme.line }}
              onMouseEnter={() => setHot(s.id)} onMouseLeave={() => setHot(null)}>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold" style={{ color: theme.ink }}>{s.name}</span>
                <span className="block truncate text-[10.5px] text-slate-600">
                  {[s.district, s.region].filter(Boolean).join(', ') || s.categoryLabel}{s.region ? ` · ${s.categoryLabel}` : ''}{s.status !== 'operational' ? ` · ${s.status}` : ''}{s.approx ? ` · ${text.approx}` : ''}
                </span>
              </span>
              <a href={`geo:${s.lat},${s.lng}?q=${s.lat},${s.lng}(${encodeURIComponent(s.name)})`} onFocus={() => setHot(s.id)} onBlur={() => setHot(null)}
                aria-label={fill(text.openLabel, { name: s.name })}
                className="shrink-0 text-[10.5px] font-semibold underline-offset-2 hover:underline" style={{ color: theme.primary }}>{text.open}</a>
            </li>
          ))}
        </ul>
      ) : <p className="mt-1 text-[11px] text-slate-600">{text.noMatch}</p>}
      {shown.length > LIST_FIRST ? (
        <button type="button" onClick={() => setAll(a => !a)} aria-expanded={all} className="mt-1 text-[11px] font-semibold" style={{ color: theme.primary }}>
          {all ? text.showFewer : fill(text.showAll, { count: shown.length })}
        </button>
      ) : null}
      {data && data.total > sites.length ? <p className="mt-1 text-[10px] text-slate-600">{fill(text.more, { shown: sites.length, total: data.total })}</p> : null}
    </div>
  );

  return (
    <>
      {search}
      {order === 'tabs-first' ? <>{tabRow}{mapBox}</> : <>{mapBox}{tabRow}</>}
      {listBlock}
    </>
  );
}
