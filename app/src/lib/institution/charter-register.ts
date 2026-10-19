// The institution (charter) register as the platform holds it (architecture
// review D8): the standing branches and agencies (lib/institution/charters.ts)
// and one row per charter of the ministry registry (/api/org/ministries). This
// is the answer every screen and route reads; the substrate's
// civicos.institutions is a mirror of these rows written by lib/db/mirror.ts,
// never read as the register (register-owners.test.ts checks).
//
// Server only (reads the platform stores). Browser code reads it through
// GET /api/public/charters (lib/db/repos/institutions.ts).

import { listMinistries } from '@/lib/data/store/ministries';
import { getSetup } from '@/lib/data/store/sovereign';
import { STANDING_CHARTERS, ministryCharter } from '@/lib/institution/charters';

export interface InstitutionMirrorRow {
  charterId: string; label: string; kind: string; domain: string; archetypeOrBranch: string;
  activated: boolean; meta: Record<string, unknown>;
}

/** A charter row with the times the platform keeps for it. */
export interface CharterRecord extends InstitutionMirrorRow {
  /** When the charter first became active: its earliest ministry's activation; for the standing institutions, the installation's launch (setup completion). Null when not known. */
  activatedAt: string | null;
  /** When the charter entered the register: its earliest ministry's creation; for the standing institutions, the installation's launch. Null before launch. */
  registeredAt: string | null;
}

const earliest = (a: string | null, b: string | null): string | null => (!a ? b : !b ? a : a < b ? a : b);

/**
 * The charter rows: the standing branches and agencies (always active), then
 * one row per charter of the ministry registry (ministries of one archetype
 * share a charter, as in the orchestration registry; it is active while any
 * of them is). This is what the mirror writer copies to the substrate.
 */
export function charterRecords(): CharterRecord[] {
  const launched = getSetup()?.completedAt ?? null;
  const rows = new Map<string, CharterRecord>();
  for (const a of STANDING_CHARTERS) {
    rows.set(a.id, { charterId: a.id, label: a.label, kind: a.kind, domain: a.domain, archetypeOrBranch: a.archetypeOrBranch, activated: true, meta: {}, activatedAt: launched, registeredAt: launched });
  }
  for (const m of listMinistries()) {
    if (m.status === 'merged') continue;
    const a = ministryCharter(m);
    const prev = rows.get(a.id);
    const active = m.status === 'active';
    const instances = [...((prev?.meta.instances as string[] | undefined) ?? []), m.id];
    // A ministry is created active, so a record from before activatedAt was kept became active at its creation.
    const firstActive = m.activatedAt ?? (active ? m.createdAt : null);
    rows.set(a.id, {
      charterId: a.id, label: prev && !active ? prev.label : a.label, kind: a.kind, domain: a.domain, archetypeOrBranch: a.archetypeOrBranch,
      activated: (prev?.activated ?? false) || active,
      meta: { instanceId: active || !prev ? m.id : prev.meta.instanceId, instances, source: 'platform' },
      activatedAt: earliest(prev?.activatedAt ?? null, firstActive),
      registeredAt: earliest(prev?.registeredAt ?? null, m.createdAt),
    });
  }
  return [...rows.values()];
}

/** The rows the mirror writer copies (the record without the platform's times). */
export function institutionRows(): InstitutionMirrorRow[] {
  return charterRecords().map(({ activatedAt: _a, registeredAt: _r, ...row }) => row);
}

export interface CharterQuery {
  /** true: active only; false: idle only; undefined: all. */
  activated?: boolean;
  kind?: string;
  charter?: string;
  /** Text in the charter id, label or domain. */
  q?: string;
}

/** The register filtered, ordered by charter id (as the substrate listings were). */
export function findCharters(opts: CharterQuery = {}): CharterRecord[] {
  const q = opts.q?.trim().toLowerCase();
  return charterRecords()
    .filter(r => opts.activated === undefined || r.activated === opts.activated)
    .filter(r => !opts.kind || r.kind === opts.kind)
    .filter(r => !opts.charter || r.charterId === opts.charter)
    .filter(r => !q || [r.charterId, r.label, r.domain].some(v => v.toLowerCase().includes(q)))
    .sort((a, b) => a.charterId.localeCompare(b.charterId));
}
