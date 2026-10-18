'use client';

// Digital interoperability on the map (map plan 4d): institutions at their
// registered seats, the exchanges agreed between them and the live ones
// (their systems calling the platform) with how they are doing, and each
// region shaded by the share of its registered sites that reported in the
// last 31 days. Only records the platform holds (lib/data/interop-map.ts);
// it looks sparse until institutions register their seats and connect.

import * as React from 'react';
import { NationMap, type MapPoint, type MapValue } from '@/components/map/NationMap';
import type { InteropLink, InteropNode, RegionReporting } from '@/lib/data/interop-map';
import { STATUS } from '@/lib/theme/tokens';
import { callApi, when } from './shared';

const HEALTH_WORD: Record<InteropLink['health'], string> = { agreed: 'Agreed', healthy: 'Working', quiet: 'Quiet', failing: 'Failing' };
const HEALTH_TONE: Record<InteropLink['health'], 'ok' | 'warn' | 'alert' | 'neutral'> = { agreed: 'neutral', healthy: 'ok', quiet: 'warn', failing: 'alert' };

export function ConnectionsPanel() {
  const [data, setData] = React.useState<{ nodes: InteropNode[]; links: InteropLink[]; regions: RegionReporting[]; unplaced: string[]; asOf: string } | null>(null);
  const [err, setErr] = React.useState('');
  React.useEffect(() => { callApi<NonNullable<typeof data>>('/api/facilities/connections').then(setData).catch(e => setErr((e as Error).message)); }, []);
  if (err) return <p role="alert" className="text-[13px] text-alert">The connections could not be read: {err}</p>;
  if (!data) return <p className="text-[13px] text-ink-muted">Reading the connections…</p>;

  const name = (id: string) => data.nodes.find(n => n.id === id)?.name ?? id;
  const values: MapValue[] = data.regions.filter(r => r.code && r.sites).map(r => ({ key: r.code!, value: Math.round((r.reporting / r.sites) * 100), unit: '%', note: `${r.reporting} of ${r.sites} sites reported in the last 31 days` }));
  const points: MapPoint[] = data.nodes.filter(n => n.seat).map(n => ({ key: n.id, label: `${n.name}${n.seat!.capital ? ' (capital)' : ''}`, tone: n.seat!.certified ? 'ok' : 'warn', lng: n.seat!.lng, lat: n.seat!.lat, glyph: '⌂', ...(n.seat!.siteId ? { href: `/gov/sites#${n.seat!.siteId}` } : {}) }));
  const seat = new Map(data.nodes.filter(n => n.seat).map(n => [n.id, n.seat!]));

  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-ink-soft">
        Which institutions exchange data, under what agreement, and whether their systems are working — from the records in Connected systems and the
        institutions&rsquo; own systems calling the platform. Institutions stand at their registered offices (a published government office); the
        central government at the capital. Regions are shaded by the share of their registered sites that reported in the last 31 days.
      </p>
      <NationMap title="Who is connected" values={values} kind="observed" source="Connections recorded on the platform; reports in the last 31 days"
        valueLabel="Sites reporting" unit="%" points={points} pointsLabel="Seats" maxHeight={460} compact
        emptyNote="No region has registered sites yet."
        overlay={ctx => (
          <g aria-label="Exchanges between institutions">
            {data.links.map((l, i) => {
              const a = seat.get(l.from), b = seat.get(l.to);
              const pa = a && ctx.project(a.lng, a.lat), pb = b && ctx.project(b.lng, b.lat);
              if (!pa || !pb) return null;
              const tone = STATUS[HEALTH_TONE[l.health]];
              const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2 - 18 - (i % 3) * 8;
              return (
                <path key={i} d={`M${pa[0]},${pa[1]} Q${mx},${my} ${pb[0]},${pb[1]}`} fill="none" stroke={tone} strokeWidth={l.kind === 'live' ? 2 : 1.4}
                  strokeDasharray={l.health === 'quiet' ? '4 3' : l.kind === 'agreed' ? '1 0' : undefined} strokeOpacity={0.85}>
                  <title>{`${name(l.from)} → ${name(l.to)}: ${l.label} (${HEALTH_WORD[l.health]})`}</title>
                </path>
              );
            })}
          </g>
        )} />
      {data.unplaced.length ? <p className="text-ink-muted">Connected but not on the map until their offices are registered: {data.unplaced.join(', ')}.</p> : null}
      {data.links.length ? (
        <table className="w-full" data-stack>
          <caption className="sr-only">Exchanges between institutions</caption>
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Between</th><th className="text-start font-semibold">What</th><th className="text-start font-semibold">Kind</th><th className="text-start font-semibold">How it is doing</th><th className="text-start font-semibold">Record</th></tr></thead>
          <tbody>
            {data.links.map((l, i) => (
              <tr key={i} className="border-b border-line-soft">
                <td data-label="Between" className="py-1.5">{name(l.from)} → {name(l.to)}</td>
                <td data-label="What">{l.label}{l.detail ? <div className="text-ink-muted">{l.detail}</div> : null}</td>
                <td data-label="Kind">{l.kind === 'live' ? 'Live exchange' : 'Agreed exchange'}</td>
                <td data-label="How it is doing" className={l.health === 'failing' ? 'text-alert' : l.health === 'quiet' ? 'text-warn' : l.health === 'healthy' ? 'text-ok' : ''}>
                  {HEALTH_WORD[l.health]}{l.lastCallAt ? <div className="text-ink-muted">last call {when(l.lastCallAt)}</div> : null}
                </td>
                <td data-label="Record" className="text-ink-muted">{l.record}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-ink-muted">No exchanges are recorded yet: approve agreements and integrations in Connected systems, or connect an institution&rsquo;s own system.</p>}
    </div>
  );
}
