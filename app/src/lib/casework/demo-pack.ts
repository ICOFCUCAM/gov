// The demo data pack (demo and training installations only): one step that
// makes an installation ready to show end to end. It creates or refreshes the
// demo cast (lib/auth/demo-cast.ts), loads the demonstration set of sample
// acts and procedures (lib/casework/demo.ts), and opens one sample case under
// each approved procedure, opened by that institution's demo officer through
// openCase() like any case, marked as a sample (source 'sample'). Nothing is
// decided: every step after opening is taken by people. Repeating it opens no
// second case for a procedure that already has an open sample one. A
// production installation refuses it, and who is responsible is never chosen
// for the nation here: a register with no institution named is reported.

import { samplesAllowed } from '@/lib/ops/mode';
import { listAccounts } from '@/lib/auth/officials';
import { refreshCast } from '@/lib/auth/demo-cast';
import { loadDemonstration } from './demo';
import { activePackage, listPackages, ownerInstitution } from './packages';
import { listCases, openCase } from './engine';
import { authorityFor } from '@/lib/data/store/sovereign';
import { recordAudit } from '@/lib/data/store/audit';
import type { FieldSpec } from './types';

export interface DemoPackResult {
  cast: { created: number; updated: number; retired: number };
  procedures: string[];
  cases: { ref: string; id: string; procedure: string }[];
  skipped: { procedure: string; why: string }[];
}

/** A value each field type accepts, plainly marked as a sample. */
function sampleValue(f: FieldSpec, today: string): unknown {
  switch (f.type) {
    case 'number': return 1;
    case 'boolean': return false;
    case 'date': return today;
    case 'choice': return f.options?.[0] ?? '';
    case 'longtext': return 'Sample details for a demonstration (not a real record).';
    case 'person': return 'Sample person';
    case 'organisation': return 'Sample organisation';
    case 'place': return 'Sample place';
    default: return 'Sample';
  }
}

export function loadDemoPack(by: string, now = new Date()): DemoPackResult | { error: string } {
  if (!samplesAllowed()) return { error: 'A production installation holds no sample records' };
  const cast = refreshCast(by);
  if ('error' in cast) return cast;
  const demo = loadDemonstration(by, now);
  if ('error' in demo) return demo;

  const today = now.toISOString().slice(0, 10);
  const officers = listAccounts().filter(a => a.demo && !a.disabled && a.role === 'officer');
  const keys = [...new Set(listPackages({ state: 'approved' }).map(p => p.key))].sort();
  const cases: DemoPackResult['cases'] = [];
  const skipped: DemoPackResult['skipped'] = [];
  for (const key of keys) {
    const pkg = activePackage(key, today);
    if (!pkg) continue;
    const owner = ownerInstitution(pkg.owner, authorityFor);
    if (!owner) { skipped.push({ procedure: pkg.title, why: 'No institution is named as responsible (Who is responsible)' }); continue; }
    if (listCases({ procedure: key, open: true }).some(c => c.source === 'sample')) { skipped.push({ procedure: pkg.title, why: 'A sample case is already open' }); continue; }
    const officer = officers.find(a => a.institution === owner);
    if (!officer) { skipped.push({ procedure: pkg.title, why: 'The institution has no demo officer: refresh the cast' }); continue; }
    const id = `local:${officer.id}`;
    const c = openCase({
      procedure: key, source: 'sample', idempotencyKey: `demo-pack-${key}-${pkg.version}`,
      fields: Object.fromEntries(pkg.fields.map(f => [f.key, sampleValue(f, today)])),
      subject: [{ kind: 'unregistered', name: 'Sample applicant (demonstration)' }],
    }, { id, name: `${officer.name}, ${officer.office}`, institution: owner, scope: { id, role: 'officer', institution: owner } }, now);
    if ('error' in c) { skipped.push({ procedure: pkg.title, why: c.error }); continue; }
    cases.push({ ref: c.ref, id: c.id, procedure: pkg.title });
  }
  recordAudit(by, 'demo.pack', 'Demonstration:pack', 'ok', `Cast ${cast.created} new · ${demo.approved.length} procedures approved · ${cases.length} sample cases opened · ${skipped.length} skipped`);
  return { cast: { created: cast.created, updated: cast.updated, retired: cast.retired }, procedures: [...demo.approved, ...demo.present], cases, skipped };
}
