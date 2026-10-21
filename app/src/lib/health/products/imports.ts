// The register of import authorisations for medicines and medical devices
// (HLT-MED-013; Health I4 dependency procedure-import-and-controlled). Kept
// for the institution the nation names in the `medicinesRegulation` slot
// (lib/data/register-owners.ts), never a ministry by name.
//
// An authorisation is for one consignment: an importer of the organisations
// register holding a granted standing in the medicine-importers register, an
// authorised product of the register of medicines and medical devices, a
// quantity with its unit and a point of entry from the nation's list
// (medicines.country.entry_points, shipped empty), with the validity the
// decision states (none ships). The customs declaration is referenced, never
// copied: customs keeps it.
//
// Customs is kept apart: it learns only whether an authorisation with a given
// number is valid on a date, and until when, through the exchange service
// product.import-authorisation (lib/exchange/services.ts), for a purpose two
// officials approved for it; never the importer, product, quantity or file.
// No customs power is added here. Written only by the import authorisation
// procedure's decision (lib/health/products/procedures.ts;
// lib/casework/register-writes.test.ts). Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber } from '@/lib/data/numbering';
import { withDefaults } from '@/lib/data/defaults';

export interface ImportAuthorisation {
  id: string;
  /** MIA-YYYY-NNNNNN. */
  number: string;
  importer: string;
  product: string;
  quantity: { amount: number; unit: string };
  entryPoint: string;
  /** As the decision states it under the nation's law (none ships). */
  validUntil?: string;
  /** The customs declaration it is for, by reference only (customs keeps the declaration). */
  customsDeclaration?: string;
  case: string;
  at: string; by: string;
  /** The sealed decision that made it (attached once sealed); customs is told nothing before. */
  decision?: string;
  sample?: true;
}

type Db = { imports: ImportAuthorisation[]; miaSeq: number };
const seed = (): Db => ({ imports: [], miaSeq: 0 });
const g = globalThis as unknown as { __civicosMedicineImports?: Db };
const db = (): Db => touch('__civicosMedicineImports', g.__civicosMedicineImports = withDefaults(g.__civicosMedicineImports ??= seed(), seed()));
export function resetImports(): void { g.__civicosMedicineImports = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Record the import authorisation a decision makes (the caller, the
 * procedure's effect, has checked the importer's standing and that the product
 * is authorised). Customs learns nothing until the sealed decision is attached.
 */
export function authoriseImport(input: { importer: string; product: string; quantity: { amount: number; unit: string }; entryPoint: string; validUntil?: string; customsDeclaration?: string; sample?: true }, caseId: string, by: string, now = new Date()): ImportAuthorisation | { error: string } {
  if (!input.importer.trim() || !input.product.trim()) return { error: 'Name the importer and the product (their register numbers)' };
  if (!(input.quantity.amount > 0) || !input.quantity.unit.trim()) return { error: 'Give the quantity authorised, with its unit' };
  if (!input.entryPoint.trim()) return { error: 'Give the point of entry, from the nation\'s list' };
  if (input.validUntil && (!DATE.test(input.validUntil) || input.validUntil <= now.toISOString().slice(0, 10))) return { error: 'Valid until is a future date (YYYY-MM-DD), as the decision states it' };
  if (db().imports.some(i => i.case === caseId)) return { error: 'This case has already recorded its import authorisation' };
  const a: ImportAuthorisation = {
    id: uuid7(), number: nextNumber(db() as unknown as Record<string, unknown>, 'miaSeq', 'MIA', now), importer: input.importer.trim(), product: input.product.trim(),
    quantity: { amount: input.quantity.amount, unit: input.quantity.unit.trim().slice(0, 20) }, entryPoint: input.entryPoint.trim().slice(0, 120),
    ...(input.validUntil ? { validUntil: input.validUntil } : {}), ...(input.customsDeclaration?.trim() ? { customsDeclaration: input.customsDeclaration.trim().slice(0, 80) } : {}),
    case: caseId, at: now.toISOString(), by, ...(input.sample ? { sample: true as const } : {}),
  };
  db().imports.push(a);
  recordAudit(by, 'product.import.authorise', `ImportAuthorisation:${a.number}`, 'ok', `product ${a.product} · importer ${a.importer} · case ${caseId}${a.sample ? ' · sample' : ''}`);
  return clone(a);
}

/** Attach the sealed decision that made a case's import authorisation. */
export function attachImportDecision(caseId: string, decision: string): void {
  const a = db().imports.find(i => i.case === caseId);
  if (a && !a.decision) a.decision = decision;
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** The import authorisation a case recorded. */
export const importOfCase = (caseId: string): ImportAuthorisation | undefined => { const a = db().imports.find(i => i.case === caseId); return a ? clone(a) : undefined; };
/** The full record (the medicines regulator's; the caller checks canReadProduct() and writes the access log). */
export const getImportAuthorisation = (number: string): ImportAuthorisation | undefined => { const a = db().imports.find(i => i.number === number.trim()); return a ? clone(a) : undefined; };
/**
 * What customs may learn (the exchange service product.import-authorisation):
 * whether a decided authorisation with this number is valid on a date, and
 * until when. Never the importer, the product, the quantity or the file.
 */
export function importAuthorisationValid(number: string, on = new Date().toISOString().slice(0, 10)): { valid: boolean; validUntil?: string } {
  const a = db().imports.find(i => i.number === number.trim());
  if (!a || !a.decision || (a.validUntil && a.validUntil < on)) return { valid: false };
  return { valid: true, ...(a.validUntil ? { validUntil: a.validUntil } : {}) };
}
/** Counts (no record content). */
export const importCounts = (): { total: number; samples: number } => ({ total: db().imports.length, samples: db().imports.filter(i => i.sample).length });
