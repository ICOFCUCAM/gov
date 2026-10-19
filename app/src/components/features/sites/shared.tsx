'use client';

// What the facility register screens share: the shapes the API returns, one
// way to call it (the server's refusal text comes back as the error), the
// register's vocabulary and the plain words for its states. Rules and storage:
// lib/data/facilities.ts; this file only reads and calls the platform's API.

import * as React from 'react';
import type {
  CaptureMethod, CertStage, Facility, FacilityCategory, FacilityImport, FacilityPolicy, FacilityStatus,
  LocationCheck, PolicyChange, SensitivityAuthority, SensitivityRule,
} from '@/lib/data/facilities';
import type { MapPoint } from '@/components/map/NationMap';
import { FACILITY_TILES, type PointTileSource } from '@/lib/map/tile-loader';
import type { CategoryStandards } from '@/lib/data/facility-standards';

export type { CaptureMethod, CertStage, Facility, FacilityImport, FacilityPolicy, FacilityStatus, LocationCheck, PolicyChange, SensitivityAuthority, SensitivityRule };
export type Site = Facility & { generalised?: boolean };
export type Category = FacilityCategory & { rule: SensitivityRule; standards?: CategoryStandards };
export interface Method { key: CaptureMethod; label: string; how: string; typicalAccuracyM: number }
export interface Vocabulary {
  sites: Site[];
  counts: { total: number; published: number; certified: number; awaiting: number; byCategory: Record<string, number> };
  policy: FacilityPolicy;
  mappingAgency: { id: string; name: string } | null;
  categories: Category[];
  methods: Method[];
  authorities: { key: SensitivityAuthority; label: string }[];
  statuses: FacilityStatus[];
}
export interface Institution { id: string; name: string; status: string }

export const input = 'focus-ring w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
export const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
export const label = 'block text-[13px] text-ink-soft';
export const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');

/** False when the page's own security settings (Permissions-Policy) forbid reading the device's location. */
export function locationAllowed(): boolean {
  try {
    const d = document as Document & { permissionsPolicy?: { allowsFeature(f: string): boolean }; featurePolicy?: { allowsFeature(f: string): boolean } };
    const pol = d.permissionsPolicy ?? d.featurePolicy;
    return pol ? pol.allowsFeature('geolocation') : true;
  } catch { return true; }
}
export const LOCATION_BLOCKED = 'This installation\'s security settings do not let pages read the device\'s location. Ask the platform administrator to allow it for the site pages, or use a photo or typed coordinates.';

/** A network failure (nothing reached the server), as opposed to a refusal. */
export class OfflineError extends Error {}

/** Call this platform's own API; a refusal comes back as an Error with the server's own words. */
export async function callApi<T>(url: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new OfflineError('The platform could not be reached');
  }
  const j = await r.json().catch(() => ({})) as T & { error?: string };
  if (!r.ok) {
    const e = new Error(j.error ?? `Refused (${r.status})`) as Error & { body?: unknown; status?: number };
    e.body = j; e.status = r.status;
    throw e;
  }
  return j;
}

/** The register's vocabulary and sites (GET /api/facilities). */
export function useRegister(query = 'state=all'): { data: Vocabulary | null; error: string; reload: () => Promise<void> } {
  const [data, setData] = React.useState<Vocabulary | null>(null);
  const [error, setError] = React.useState('');
  const reload = React.useCallback(async () => {
    try { setData(await callApi<Vocabulary>(`/api/facilities?${query}`)); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, [query]);
  React.useEffect(() => { void reload(); }, [reload]);
  return { data, error, reload };
}

export function useInstitutions(): Institution[] {
  const [list, setList] = React.useState<Institution[]>([]);
  React.useEffect(() => {
    void callApi<{ ministries: Institution[] }>('/api/org/ministries')
      .then(d => setList(d.ministries.filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setList([]));
  }, []);
  return list;
}

export const STATUS_WORD: Record<FacilityStatus, string> = {
  planned: 'Planned', 'under-construction': 'Under construction', operational: 'Open', partial: 'Partly open', closed: 'Closed', decommissioned: 'Decommissioned',
};
export const STATE_WORD: Record<Site['state'], string> = { proposed: 'Waiting to be published', published: 'Published', withdrawn: 'Withdrawn' };
export const CERT_WORD: Record<Site['certification']['state'], string> = { awaiting: 'Location awaiting certification', certified: 'Location certified', rejected: 'Location rejected' };
export const STAGE_WORD: Record<CertStage, string> = { institution: 'the owning institution', 'mapping-agency': 'the mapping agency' };
export const LEVEL_WORD: Record<SensitivityRule['level'], string> = { public: 'Public', restricted: 'Restricted', confidential: 'Confidential' };
export const CERT_MODE_WORD: Record<FacilityPolicy['certification'], string> = {
  institution: 'Each institution certifies its own sites',
  'mapping-agency': 'The national mapping agency certifies every location',
  both: 'The institution certifies, then the mapping agency',
};

/** The certification stage waiting next, if any. */
export function nextStage(s: Site): CertStage | undefined {
  if (s.state !== 'published' || s.certification.state !== 'awaiting') return undefined;
  return s.certification.required.find(st => !s.certification.stamps.some(x => x.stage === st && x.decision === 'certified'));
}

/** Published sites as map points: certified ok, awaiting warn, rejected alert. */
export function sitePoints(sites: Site[], categories: Category[]): MapPoint[] {
  return sites.filter(s => s.state === 'published').map(s => ({
    key: s.id,
    label: `${s.name}${s.generalised ? ' (position generalised)' : ''} · ${CERT_WORD[s.certification.state]}`,
    tone: s.certification.state === 'certified' ? 'ok' : s.certification.state === 'rejected' ? 'alert' : 'warn',
    lng: s.location.lng, lat: s.location.lat,
    glyph: categories.find(c => c.key === s.category)?.glyph,
    href: `#site-${s.id}`,
  }));
}

/**
 * Published sites as a tile-backed map layer, for a national-scale register:
 * the same points as sitePoints() (tone by certification, glyph, link to the
 * record), read from the viewer-aware vector tiles for what the map shows,
 * with the register's filters applied to the tiles' properties.
 */
export function siteTiles(categories: Category[], o: { ministry?: string; category?: string; region?: string; version?: string } = {}): PointTileSource {
  const glyph = new Map(categories.map(c => [c.key, c.glyph]));
  return {
    source: FACILITY_TILES, layer: 'facilities', version: o.version, label: 'Published sites',
    toPoint: f => {
      const p = f.props;
      if ((o.ministry && p.owner !== o.ministry) || (o.category && p.category !== o.category) || (o.region && p.region !== o.region)) return null;
      const cert = (p.certification === 'certified' || p.certification === 'rejected' ? p.certification : 'awaiting') as Site['certification']['state'];
      const id = String(p.id ?? f.key), name = String(p.name ?? id), generalised = p.generalised === true;
      return { key: id, name, label: `${name}${generalised ? ' (position generalised)' : ''} · ${CERT_WORD[cert]}`, tone: cert === 'certified' ? 'ok' : cert === 'rejected' ? 'alert' : 'warn', glyph: glyph.get(String(p.category)), href: `#site-${id}`, generalised };
    },
  };
}

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p role="status" className={`text-[13px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p>;
}

/** One figure with its label (counts above the register). */
export function Count({ n, label: l, note }: { n: number; label: string; note?: string }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="font-mono text-[20px] font-semibold tabular-nums text-ink">{n.toLocaleString()}</div>
      <div className="text-[12px] text-ink-soft">{l}</div>
      {note ? <div className="text-[11px] text-ink-muted">{note}</div> : null}
    </div>
  );
}
