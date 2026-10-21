// What the form pages (/gov/law/procedures/forms/[key] and its print view)
// read: a procedure's form (the version asked for, else the one in force,
// else the latest) or a library form, as it renders, with its register
// status from the publication gates. Server only.
//
// A library form is found by its identity (lib/forms/identity.ts: catalogue
// + form ID + version), by its library key, or by a bare catalogue ID only
// where no other catalogue uses that ID: an ambiguous bare ID is refused with
// the candidates, never resolved to one of them. A catalogue entry with no
// contract in the library (the supplement's excluded HLT-MED-004) is shown
// as that entry: its scope, and that it has no contract and cannot be
// drafted for publication.

import { activePackage, getPackage, listPackages } from '@/lib/casework/packages';
import { serviceDirectory } from '@/lib/exchange/services';
import { AUTHORITIES } from '@/lib/nation/deployment';
import type { FormView } from './contract';
import { formView } from './server';
import { libraryPublication, linkSubject, ownerOf, publicationOf, STATUS_LABEL } from './publication';
import { procedureLink, LINK_LABEL, type ProcedureLinkView } from './procedure-link';
import { ambiguityRefusal, catalogueEntries, catalogueIdOf, formIdentity, parseFormIdentity, sameForm, type CatalogueEntry } from './identity';
import { SPEC_LIBRARY } from './library/definitions';
import { CANONICAL_LIBRARY } from './library/catalogue';
import { CATALOGUE_CONTRACTS, type CatalogueLibraryForm } from './library/catalogue-contracts';
export type { CatalogueLibraryForm };

export interface FormPage { view: FormView; status: { label: string; note?: string }; library?: ReturnType<typeof libraryInfo> }

/** The field series document a canonical form's Part comes from ("Part 2 §2.2" → FIELD-SERIES-PARTS-01-02). */
const canonicalCatalogue = (source: string): string => (/Part [12]\b/.test(source) ? 'FIELD-SERIES-PARTS-01-02' : 'FIELD-SERIES-PARTS-03-04');

/** Every library form (the specification's, the field series' and the catalogue contracts CivicOS wrote), with what it waits for and its identity. */
export function libraryForms() {
  return [
    ...SPEC_LIBRARY.map(f => ({ def: f, identity: formIdentity({ catalogue: 'INSTITUTIONAL_ARCHITECTURE_SPEC', formId: f.specId, version: f.form?.spec?.version ?? f.form?.version ?? '1.0' }), waitsFor: f.attachesTo ? `its procedure ${f.attachesTo} carries it as a draft` : `the plan step that builds its service (${f.awaits})`, catalogue: undefined as CatalogueLibraryForm | undefined })),
    ...CANONICAL_LIBRARY.map(f => ({ def: f, identity: formIdentity({ catalogue: canonicalCatalogue(f.source), formId: f.specId, version: f.form?.spec?.version ?? '1' }), waitsFor: `the plan step that builds its service (${f.awaits})`, catalogue: undefined as CatalogueLibraryForm | undefined })),
    ...CATALOGUE_CONTRACTS.map(f => ({ def: f, identity: f.identity, waitsFor: f.procedure ? `a new version of ${f.procedure.key} carrying it (stage ${f.procedure.stage}), drafted, tested and approved by two officials` : (f.awaits ?? 'its procedure'), catalogue: f })),
  ];
}
export type LibraryEntry = ReturnType<typeof libraryForms>[number];

/** What a reference to a form resolves to: one library form, a catalogue entry with no contract, or a refusal naming the candidates. */
export type Resolved = { found: LibraryEntry } | { entry: CatalogueEntry } | { ambiguous: { formId: string; error: string; candidates: { identity: string; title: string; scope?: string; contract: boolean }[] } };

/** Resolve a form reference: an identity, a library key, or a bare catalogue ID that only one catalogue uses. */
export function resolveLibraryForm(ref: string): Resolved | null {
  const all = libraryForms();
  const id = parseFormIdentity(ref);
  if (id) {
    // By identity: a contract by catalogue, ID and version (without the version, the one contract of that entry).
    const hits = all.filter(x => sameForm(parseFormIdentity(x.identity), id, { version: !!id.version }));
    if (hits.length === 1) return { found: hits[0]! };
    if (hits.length > 1) return null;
    if (id.version) return null;
    const entry = catalogueEntries(id.formId).find(e => e.catalogue === id.catalogue);
    return entry ? { entry } : null;
  }
  const byKey = all.find(x => x.def.key === ref);
  if (byKey) return { found: byKey };
  // A bare ID: every catalogue form that carries it, the library's and the catalogue's.
  const bare = ref.replace(/^library\./, '');
  const mine = all.filter(x => x.def.specId.toUpperCase() === bare.toUpperCase());
  const entries = catalogueEntries(bare);
  const cats = new Map<string, { identity: string; title: string; scope?: string; contract: boolean }>();
  for (const x of mine) cats.set(parseFormIdentity(x.identity)!.catalogue, { identity: x.identity, title: x.def.title, contract: true });
  for (const e of entries) if (!cats.has(e.catalogue)) cats.set(e.catalogue, { identity: e.identity, title: e.title, ...(e.scope ? { scope: e.scope } : {}), contract: false });
  for (const e of entries) { const c = cats.get(e.catalogue); if (c && e.scope && !c.scope) c.scope = e.scope; }
  const candidates = [...cats.values()];
  if (candidates.length > 1) return { ambiguous: { formId: bare.toUpperCase(), error: ambiguityRefusal(bare.toUpperCase(), candidates)!, candidates } };
  if (mine.length === 1) return { found: mine[0]! };
  return null;
}

/** A library form by identity, key or unambiguous bare ID; undefined when none or ambiguous (use resolveLibraryForm() to say why). */
export function findLibraryForm(key: string): LibraryEntry | undefined {
  const r = resolveLibraryForm(key);
  return r && 'found' in r ? r.found : undefined;
}

/** The exchange services that exist (a form an exchange service answers needs its service). */
export const serviceIds = (): string[] => serviceDirectory().map(s => s.id);

/** A library form's procedure link, from the package register as it stands. */
export function linkOf(found: LibraryEntry): ProcedureLinkView {
  return procedureLink({ ...linkSubject(found.def), identity: found.identity }, { services: serviceIds() });
}

/** Its publication: the gates as they stand, with its procedure link and owner. */
export function libraryPublicationOf(found: LibraryEntry) {
  return libraryPublication({ ...found.def, identity: found.identity }, found.waitsFor, new Date(), { link: linkOf(found) });
}

const slotLabel = (k: string) => AUTHORITIES.find(a => a.key === k)?.label ?? k;

/** What the designer and the form page show about a library form (components/features/forms/LibraryDetails.tsx). */
export function libraryInfo(found: LibraryEntry) {
  const { def: lib, catalogue: c, waitsFor, identity } = found;
  const link = linkOf(found);
  const owner = ownerOf(lib.owner);
  return {
    specId: lib.specId, identity, owner: lib.owner, ownerLabel: slotLabel(lib.owner), awaits: waitsFor, notes: lib.notes, deviations: 'deviations' in lib ? lib.deviations : [],
    // Who owns it as the profile stands: named, or a provisional stand-in (never proof of legal competence).
    ownerResolution: { ...owner, ...('actingSlot' in owner ? { actingLabel: slotLabel(owner.actingSlot) } : {}) },
    // Computed from the package register on every read; never stored.
    procedureLink: { state: link.state, label: LINK_LABEL[link.state], required: link.required, detail: link.detail, ...(link.carriedBy ? { carriedBy: link.carriedBy } : {}), ...(link.exchange ? { exchange: link.exchange } : {}) },
    ...(c ? { catalogue: c.catalogue, catalogueId: catalogueIdOf(c.catalogue.source), procedure: c.procedure, exchange: c.exchange ?? null, filledBy: c.filledBy, nationValues: c.nationValues, countryDecisions: c.form.countryDecisions ?? [], items: c.items.length } : {}),
  };
}

/** A catalogue entry with no contract in the library, as the page shows it (its scope; no contract; never drafted when excluded). */
export function entryInfo(e: CatalogueEntry) {
  const excluded = e.scope === 'excluded';
  return {
    ...e,
    contract: false as const,
    draftable: !excluded,
    note: excluded
      ? 'Excluded by the approved scope: implementation is prohibited. It has no contract, cannot be drafted for publication and cannot stand in for any other form with the same ID.'
      : e.scope === 'requires_legal_review'
        ? 'Held for a legal review: no contract is in the library, and none is published until an authorised official records the review.'
        : 'No contract for this catalogue entry is in the library yet.',
  };
}

export type FormPageResult = FormPage | { ambiguous: Extract<Resolved, { ambiguous: unknown }>['ambiguous'] } | { entry: ReturnType<typeof entryInfo> };

export function formPage(key: string, version?: number, locale?: string): FormPageResult | null {
  const p = version ? getPackage(key, version) : activePackage(key) ?? listPackages({ key }).sort((a, b) => b.version - a.version)[0];
  if (p) {
    const pub = publicationOf(p);
    return { view: formView(p, locale), status: { label: STATUS_LABEL[pub.status], ...(pub.blockers[0] ? { note: `next: ${pub.blockers[0]}` } : {}) } };
  }
  const r = resolveLibraryForm(key);
  if (!r) return null;
  if ('ambiguous' in r) return { ambiguous: r.ambiguous };
  if ('entry' in r) return { entry: entryInfo(r.entry) };
  const lib = r.found;
  const pub = libraryPublicationOf(lib);
  return {
    view: formView({ ...lib.def, version: 1, state: 'draft', library: true }, locale),
    status: { label: STATUS_LABEL[pub.status], note: pub.status === 'excluded' ? pub.scope.reason : `a library form: not approved; procedure: ${pub.procedure.state.replace('_', ' ')}` },
    library: libraryInfo(lib),
  };
}
