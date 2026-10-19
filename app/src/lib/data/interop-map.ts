// Digital interoperability on the map (map plan 4d): which institutions are
// connected, to what, and whether the connections are working, drawn only
// from records the platform holds — never from templates or generated values.
//
// - Agreed exchanges: approved federation grants and approved integration
//   clients (Connected systems, /admin/integrations): reported.
// - Live exchanges: an institution's own systems calling the platform with
//   their keys (case systems, facility systems) — observed, with the time of
//   the last call and its result; healthy, quiet or failing.
// - Reporting: the share of each region's published sites that reported in
//   the last 31 days (an observation recorded for the site in the national
//   twin, or a call from the connected system that sent it): observed.
//
// An institution is placed at its registered seat (a published
// "government-office" site it owns, certified first); the central government
// at the capital. Institutions without a seat are listed, not placed.

import { listGrants, listIntegrations, listMinistries } from '@/lib/data/store';
import { listFeeds } from '@/lib/data/case-import';
import { listFacilities, listSiteFeeds, type Facility, type Viewer } from '@/lib/data/facilities';
import { stateAsOf } from '@/lib/twin/register';
import { nationCapital } from '@/lib/nation/registry';

export interface InteropNode { id: string; name: string; seat?: { lng: number; lat: number; siteId?: string; certified: boolean; capital?: boolean } }
export type LinkHealth = 'healthy' | 'quiet' | 'failing' | 'agreed';
export interface InteropLink {
  from: string; to: string;
  kind: 'agreed' | 'live';
  label: string;
  /** The record it comes from (grant, integration, feed). */
  record: string;
  health: LinkHealth;
  lastCallAt?: string;
  detail?: string;
}
export interface RegionReporting { code?: string; name: string; sites: number; reporting: number }

const DAY = 86_400_000;
export const CENTRAL = 'central-government';

function seatOf(sites: Facility[], ministryId: string): InteropNode['seat'] {
  const own = sites.filter(s => s.ownerId === ministryId && s.category === 'government-office' && !('generalised' in s && (s as { generalised?: boolean }).generalised));
  const best = own.find(s => s.certification.state === 'certified') ?? own[0];
  return best ? { lng: best.location.lng, lat: best.location.lat, siteId: best.id, certified: best.certification.state === 'certified' } : undefined;
}

const callHealth = (last: string | undefined, refused: boolean, now: number): LinkHealth =>
  !last ? 'quiet' : refused ? 'failing' : now - Date.parse(last) <= 2 * DAY ? 'healthy' : now - Date.parse(last) <= 14 * DAY ? 'quiet' : 'failing';

/** The viewer decides which seats are placed exactly: a restricted seat is never placed for a viewer without need. */
export function interoperability(viewer: Viewer, now = Date.now()): { nodes: InteropNode[]; links: InteropLink[]; regions: RegionReporting[]; unplaced: string[] } {
  const ministries = listMinistries().filter(m => m.status !== 'merged');
  const sites = listFacilities({}, viewer);
  const cap = nationCapital();
  const nodes: InteropNode[] = [
    { id: CENTRAL, name: 'Central government', ...(cap ? { seat: { lng: cap.lng, lat: cap.lat, certified: cap.chosen, capital: true } } : {}) },
    ...ministries.map(m => ({ id: m.id, name: m.name, ...(seatOf(sites, m.id) ? { seat: seatOf(sites, m.id)! } : {}) })),
  ];
  const known = new Set(nodes.map(n => n.id));
  const byName = new Map(ministries.map(m => [m.name.toLowerCase(), m.id]));
  const links: InteropLink[] = [];

  for (const g of listGrants().filter(x => x.status === 'approved')) {
    const from = g.fromTenant === 'home' ? CENTRAL : g.fromTenant, to = g.toTenant === 'home' ? CENTRAL : g.toTenant;
    if (!known.has(from) || !known.has(to)) continue;
    links.push({ from, to, kind: 'agreed', label: g.reason, record: `Federation grant ${g.id}`, health: 'agreed', detail: `${g.scopes.join(', ')}${g.approvedBy ? ` · approved by ${g.approvedBy}` : ''}` });
  }
  for (const c of listIntegrations().filter(x => x.status === 'approved')) {
    const owner = byName.get(c.ownerOrg.toLowerCase());
    if (!owner) continue;
    links.push({ from: owner, to: CENTRAL, kind: 'agreed', label: c.name, record: `Integration ${c.id}`, health: 'agreed', detail: c.scopes.join(', ') });
  }
  for (const m of ministries) {
    for (const f of listFeeds(m.id).filter(x => !x.revokedAt)) {
      links.push({ from: m.id, to: CENTRAL, kind: 'live', label: `${f.name} (cases)`, record: `Case system ${f.id}`, lastCallAt: f.lastCallAt,
        health: callHealth(f.lastCallAt, !!f.lastResult && f.lastResult.refused > 0 && !f.lastResult.added && !f.lastResult.updated, now),
        detail: f.lastCallAt ? `${f.calls} calls` : 'connected, not called yet' });
    }
    for (const f of listSiteFeeds(m.id).filter(x => !x.revokedAt)) {
      links.push({ from: m.id, to: CENTRAL, kind: 'live', label: `${f.name} (sites)`, record: `Facility system ${f.id}`, lastCallAt: f.lastCallAt,
        health: callHealth(f.lastCallAt, /^refused|^0 added, 0 updated, [1-9]/.test(f.lastResult ?? ''), now),
        detail: f.lastCallAt ? `${f.calls} calls · ${f.lastResult ?? ''}` : 'connected, not called yet' });
    }
  }

  // Reporting by region: a published site reported if the twin recorded an observation for it, or its connected system called, in the last 31 days.
  const since = new Date(now - 31 * DAY).toISOString();
  const observed = new Set(stateAsOf({}).filter(o => o.recordedAt >= since && o.entityId.startsWith('facility:')).map(o => o.entityId.slice('facility:'.length)));
  const feedCalled = new Map<string, boolean>();
  for (const m of ministries) for (const f of listSiteFeeds(m.id)) feedCalled.set(f.id, !!f.lastCallAt && f.lastCallAt >= since && !f.revokedAt);
  const regions = new Map<string, RegionReporting>();
  for (const s of sites) {
    const key = s.place.regionCode ?? s.place.region ?? '—';
    const r = regions.get(key) ?? { code: s.place.regionCode, name: s.place.region ?? 'Outside the drawn boundary', sites: 0, reporting: 0 };
    r.sites++;
    if (observed.has(s.id) || (s.source.feedId && feedCalled.get(s.source.feedId))) r.reporting++;
    regions.set(key, r);
  }
  return { nodes, links, regions: [...regions.values()], unplaced: nodes.filter(n => !n.seat && links.some(l => l.from === n.id || l.to === n.id)).map(n => n.name) };
}
