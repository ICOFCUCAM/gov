// A form's identity (owner's direction of 21 October 2026,
// docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md §1): the
// catalogue document it comes from, its form ID and its version,
// `catalogue_id + form_id + version`. The catalogue reuses IDs for different
// forms (HLT-MED-004 is an additional information request in the field
// series' Part 6 and an excluded dispensing record in the supplement's Stage
// B; the gap report lists fourteen such IDs), so a bare form ID never
// establishes scope eligibility and never identifies a record: a lookup by a
// bare ID that more than one catalogue uses is refused, naming the
// candidates, and never resolved to one of them.
//
// Written `CATALOGUE:FORM-ID@VERSION`, e.g.
// `FIELD-SERIES-PARTS-05-07:HLT-MED-004@1`. The catalogue id is the source
// document's file name without `.md`. A catalogue entry that has no contract
// in the library (the supplement's excluded HLT-MED-004) is named by
// catalogue and form ID only (`SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13:HLT-MED-004`);
// a contract always carries its version. Every place that looks up, stores,
// approves or publishes a library or catalogue form uses formIdentity():
// the form library and its pages (lib/forms/page-data.ts), the API's
// ?library=, ?form= and ?publication= (app/api/case-packages), publication
// approvals (lib/forms/publication.ts), drafting a procedure that carries a
// catalogue form (lib/casework/packages.ts), and the register and gap report
// (app/scripts/requirements/catalogue.py, the same format). Server only: it
// reads the generated gap report.

import GAP from '../../../../docs/forms-catalogue/gap-report.json';
import FORM_SCOPE from '../../../../docs/requirements/form-scope.json';

export interface FormIdentity {
  /** The catalogue document (file name without .md). */
  catalogue: string;
  /** The form ID in that catalogue. */
  formId: string;
  /** The contract's version; absent only for a catalogue entry with no contract in the library. */
  version?: string;
}

const CATALOGUE_DIR: Record<string, string> = { 'INSTITUTIONAL_ARCHITECTURE_SPEC': 'docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md' };

/** The catalogue id of a source document ("docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md" → "FIELD-SERIES-PARTS-05-07"). */
export const catalogueIdOf = (source: string): string => source.split('/').pop()!.replace(/\.md$/i, '');

/** The source document of a catalogue id. */
export const catalogueSourceOf = (catalogue: string): string => CATALOGUE_DIR[catalogue] ?? `docs/forms-catalogue/${catalogue}.md`;

/** The one written form of an identity: `CATALOGUE:FORM-ID@VERSION` (no `@` for an entry with no contract). */
export function formIdentity(x: FormIdentity | { source: string; formId: string; version?: string | number }): string {
  const catalogue = 'catalogue' in x ? x.catalogue : catalogueIdOf(x.source);
  const v = x.version === undefined || x.version === null || x.version === '' ? '' : `@${String(x.version)}`;
  return `${catalogue}:${x.formId}${v}`;
}

const IDENTITY = /^([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9._-]*)(?:@([0-9][0-9A-Za-z.-]*))?$/;

/** Read a written identity; null when the text is not one (a bare ID, a procedure key). */
export function parseFormIdentity(s: string): FormIdentity | null {
  const m = IDENTITY.exec(String(s ?? '').trim());
  return m ? { catalogue: m[1]!, formId: m[2]!, ...(m[3] ? { version: m[3] } : {}) } : null;
}

/** Whether two identities name the same form (and, when both carry one, the same version). */
export function sameForm(a: FormIdentity | null | undefined, b: FormIdentity | null | undefined, opts: { version?: boolean } = { version: true }): boolean {
  if (!a || !b) return false;
  if (a.catalogue !== b.catalogue || a.formId.toUpperCase() !== b.formId.toUpperCase()) return false;
  return !opts.version || (a.version ?? '') === (b.version ?? '');
}

/**
 * The identity of the catalogue form a procedure's form (FormSpec) carries:
 * the catalogue it names (catalogueSource), its catalogue ID and the
 * contract's version. Null when it names no catalogue (a procedure's own
 * form, or one that names a catalogue ID without its catalogue, which
 * catalogueIdRefusal() refuses where the ID is ambiguous).
 */
export function identityOfForm(form: { catalogueSource?: string; catalogueIds?: string[]; spec?: { id?: string; version?: string } } | undefined): FormIdentity | null {
  if (!form?.catalogueSource) return null;
  const formId = form.catalogueIds?.[0] ?? form.spec?.id;
  if (!formId) return null;
  return { catalogue: catalogueIdOf(form.catalogueSource), formId, ...(form.spec?.version ? { version: String(form.spec.version) } : {}) };
}

// ── The catalogue's entries by ID ─────────────────────────────────────────────

export interface CatalogueEntry {
  identity: string;
  catalogue: string;
  source: string;
  formId: string;
  title: string;
  /** The approved scope of this entry (docs/requirements/form-scope.json), where the register lists it. */
  scope?: 'excluded' | 'requires_legal_review' | 'allowed';
  rule?: string;
}

interface ScopeEntry { source?: string; id: string; title?: string; scope: CatalogueEntry['scope']; rule?: string; reason?: string }
const SCOPE_ENTRIES = (FORM_SCOPE as { forms: ScopeEntry[] }).forms;
/** IDs the catalogue uses for different forms in different documents (the gap report's duplicate IDs: [file, title] per occurrence). */
export const DUPLICATE_IDS: Record<string, [string, string][]> = (GAP as unknown as { duplicate_ids: Record<string, [string, string][]> }).duplicate_ids;

/** Every catalogue entry known to carry this ID: each occurrence of a duplicate ID, and the scope list's entries, by catalogue. */
export function catalogueEntries(formId: string): CatalogueEntry[] {
  const id = formId.toUpperCase();
  const out = new Map<string, CatalogueEntry>();
  for (const [file, title] of DUPLICATE_IDS[id] ?? []) {
    const catalogue = catalogueIdOf(file);
    out.set(catalogue, { identity: formIdentity({ catalogue, formId: id }), catalogue, source: catalogueSourceOf(catalogue), formId: id, title });
  }
  for (const e of SCOPE_ENTRIES.filter(x => x.id.toUpperCase() === id && x.source)) {
    const catalogue = catalogueIdOf(e.source!);
    const had = out.get(catalogue);
    out.set(catalogue, { identity: formIdentity({ catalogue, formId: id }), catalogue, source: e.source!, formId: id, title: had?.title ?? e.title ?? id, ...(e.scope ? { scope: e.scope } : {}), ...(e.rule ?? e.reason ? { rule: e.rule ?? e.reason } : {}) });
  }
  return [...out.values()];
}

/** Whether an ID names different forms in different catalogues. */
export const isAmbiguousId = (formId: string): boolean => (DUPLICATE_IDS[formId.toUpperCase()]?.length ?? 0) > 1;

/** The refusal for a bare ID that names more than one catalogue form: the candidates, never one of them. */
export function ambiguityRefusal(formId: string, candidates: { identity: string; title?: string; scope?: string }[] = catalogueEntries(formId)): string | null {
  if (candidates.length < 2) return null;
  const list = candidates.map(c => `${c.identity}${c.title ? ` (${c.title}${c.scope === 'excluded' ? '; excluded by the approved scope' : c.scope === 'requires_legal_review' ? '; held for a legal review' : ''})` : ''}`).join('; ');
  return `${formId} names ${candidates.length} different catalogue forms: ${list}. A bare form ID identifies no form: name the catalogue, the form ID and the version (CATALOGUE:FORM-ID@VERSION).`;
}

/**
 * Refusal for a procedure's form that names a catalogue ID: an ID the
 * catalogue reuses must come with the catalogue it answers (catalogueSource),
 * and that catalogue must be one that uses it.
 */
export function catalogueIdRefusal(form: { catalogueSource?: string; catalogueIds?: string[] } | undefined): string | null {
  for (const id of form?.catalogueIds ?? []) {
    if (!isAmbiguousId(id)) continue;
    const entries = catalogueEntries(id);
    if (!form?.catalogueSource) return `The form names ${ambiguityRefusal(id, entries)}`;
    if (!entries.some(e => e.catalogue === catalogueIdOf(form.catalogueSource!))) return `The form names ${id} from ${catalogueIdOf(form.catalogueSource)}, which does not list it (it is listed in ${entries.map(e => e.catalogue).join(', ')})`;
  }
  return null;
}
