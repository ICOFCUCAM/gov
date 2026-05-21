// lib/db/search — cross-table substrate search.
//
// PostgREST gives us per-view ilike filtering. We fan out to the
// lifecycle tables most operators care about, score the matches by
// table and recency, and return a unified hit list. RLS clips what
// each session sees automatically.

import { publicClient, substrateAvailable } from '@/lib/db/client';

export type SearchHitKind =
  | 'work-item' | 'directive' | 'dispatch' | 'escalation'
  | 'service-request' | 'appeal' | 'institution' | 'officer';

export interface SearchHit {
  kind: SearchHitKind;
  id: string;
  ref: string;
  label: string;
  detail: string;
  href: string;
  at: number;
}

const sb = () => publicClient();

async function search<T>(view: string, columns: string[], q: string, limit = 8): Promise<T[]> {
  const c = sb();
  if (!c) return [];
  // PostgREST or-filter on multiple columns ilike. We escape commas
  // inside the value because the or filter is comma-delimited.
  const safe = q.replace(/[%,()]/g, ' ').trim();
  if (!safe) return [];
  const or = columns.map(col => `${col}.ilike.%${safe}%`).join(',');
  const { data, error } = await c.from(view).select('*').or(or).limit(limit);
  if (error || !data) return [];
  return data as T[];
}

export async function substrateSearch(query: string): Promise<SearchHit[]> {
  if (!substrateAvailable() || !query.trim()) return [];
  const [wi, dr, ds, es, sr, ap, ins, off] = await Promise.all([
    search<{ id: string; ref: string; title: string; scope: string; current_stage: string; created_at: string }>(
      'civicos_work_items', ['ref', 'title', 'scope'], query),
    search<{ id: string; ref: string; title: string; status: string; issued_by_charter_id: string; updated_at: string }>(
      'civicos_directives', ['ref', 'title', 'issued_by_charter_id'], query),
    search<{ id: string; ref: string; kind: string; detail: string | null; issued_by_charter_id: string; dispatched_at: string }>(
      'civicos_dispatches', ['ref', 'kind', 'detail', 'issued_by_charter_id'], query),
    search<{ id: string; source_charter_id: string; target_charter_id: string | null; reason: string; severity: string; triggered_at: string }>(
      'civicos_escalations', ['reason', 'source_charter_id', 'target_charter_id'], query),
    search<{ id: string; ref: string; service: string; title: string | null; target_charter_id: string; submitted_at: string }>(
      'civicos_service_requests', ['ref', 'service', 'title', 'target_charter_id'], query),
    search<{ id: string; ref: string; ground: string; originating_charter_id: string; filed_at: string }>(
      'civicos_appeals', ['ref', 'ground', 'originating_charter_id'], query),
    search<{ id: string; charter_id: string; label: string; domain: string; kind: string; created_at: string }>(
      'civicos_institutions', ['charter_id', 'label', 'domain'], query),
    search<{ id: string; name: string; email: string | null; role: string; charter_id: string | null; created_at: string }>(
      'civicos_officers', ['name', 'email', 'role', 'charter_id'], query),
  ]);

  const hits: SearchHit[] = [
    ...wi.map(r => ({ kind: 'work-item' as const, id: r.id, ref: r.ref,
      label: r.title, detail: `${r.scope} · ${r.current_stage}`,
      href: `/gov/items/${encodeURIComponent(r.ref)}`,
      at: new Date(r.created_at).getTime() })),
    ...dr.map(r => ({ kind: 'directive' as const, id: r.id, ref: r.ref,
      label: r.title, detail: `${r.issued_by_charter_id} · ${r.status}`,
      href: `/gov/directives/${encodeURIComponent(r.ref)}`,
      at: new Date(r.updated_at).getTime() })),
    ...ds.map(r => ({ kind: 'dispatch' as const, id: r.id, ref: r.ref,
      label: r.detail ?? r.kind, detail: r.issued_by_charter_id,
      href: `/gov/dispatches/${encodeURIComponent(r.ref)}`,
      at: new Date(r.dispatched_at).getTime() })),
    ...es.map(r => ({ kind: 'escalation' as const, id: r.id, ref: r.id,
      label: r.reason, detail: `${r.severity} · ${r.source_charter_id}${r.target_charter_id ? ' → ' + r.target_charter_id : ''}`,
      href: `/gov/escalations/${r.id}`,
      at: new Date(r.triggered_at).getTime() })),
    ...sr.map(r => ({ kind: 'service-request' as const, id: r.id, ref: r.ref,
      label: r.title ?? r.service, detail: r.target_charter_id,
      href: `/gov/intake/request/${encodeURIComponent(r.ref)}`,
      at: new Date(r.submitted_at).getTime() })),
    ...ap.map(r => ({ kind: 'appeal' as const, id: r.id, ref: r.ref,
      label: r.ground, detail: r.originating_charter_id,
      href: `/gov/intake/appeal/${encodeURIComponent(r.ref)}`,
      at: new Date(r.filed_at).getTime() })),
    ...ins.map(r => ({ kind: 'institution' as const, id: r.id, ref: r.charter_id,
      label: r.label, detail: `${r.kind} · ${r.domain}`,
      href: '/gov/registry', at: new Date(r.created_at).getTime() })),
    ...off.map(r => ({ kind: 'officer' as const, id: r.id, ref: r.email ?? r.id,
      label: r.name, detail: `${r.role}${r.charter_id ? ' · ' + r.charter_id : ''}`,
      href: '/gov/officers', at: new Date(r.created_at).getTime() })),
  ];

  hits.sort((a, b) => b.at - a.at);
  return hits;
}
