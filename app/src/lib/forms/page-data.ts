// What the form pages (/gov/law/procedures/forms/[key] and its print view)
// read: a procedure's form (the version asked for, else the one in force,
// else the latest) or a library form, as it renders, with its register
// status from the publication gates. Server only.

import { activePackage, getPackage, listPackages } from '@/lib/casework/packages';
import type { FormView } from './contract';
import { formView } from './server';
import { libraryPublication, publicationOf, STATUS_LABEL } from './publication';
import { SPEC_LIBRARY } from './library/definitions';
import { CANONICAL_LIBRARY } from './library/catalogue';
import { CATALOGUE_CONTRACTS, type CatalogueLibraryForm } from './library/catalogue-contracts';
export type { CatalogueLibraryForm };

export interface FormPage { view: FormView; status: { label: string; note?: string }; library?: ReturnType<typeof libraryInfo> }

/** Every library form (the specification's, the field series' and the catalogue contracts CivicOS wrote), with what it waits for. */
export function libraryForms() {
  return [
    ...SPEC_LIBRARY.map(f => ({ def: f, waitsFor: f.attachesTo ? `its procedure ${f.attachesTo} carries it as a draft` : `the plan step that builds its service (${f.awaits})`, catalogue: undefined as CatalogueLibraryForm | undefined })),
    ...CANONICAL_LIBRARY.map(f => ({ def: f, waitsFor: `the plan step that builds its service (${f.awaits})`, catalogue: undefined as CatalogueLibraryForm | undefined })),
    ...CATALOGUE_CONTRACTS.map(f => ({ def: f, waitsFor: f.procedure ? `a new version of ${f.procedure.key} carrying it (stage ${f.procedure.stage}), drafted, tested and approved by two officials` : (f.awaits ?? 'its procedure'), catalogue: f })),
  ];
}

export function findLibraryForm(key: string) {
  return libraryForms().find(x => x.def.key === key || x.def.specId === key);
}

/** What the designer and the form page show about a library form (components/features/forms/LibraryDetails.tsx). */
export function libraryInfo(found: NonNullable<ReturnType<typeof findLibraryForm>>) {
  const { def: lib, catalogue: c, waitsFor } = found;
  return {
    specId: lib.specId, owner: lib.owner, awaits: waitsFor, notes: lib.notes, deviations: 'deviations' in lib ? lib.deviations : [],
    ...(c ? { catalogue: c.catalogue, procedure: c.procedure, exchange: c.exchange ?? null, filledBy: c.filledBy, nationValues: c.nationValues, countryDecisions: c.form.countryDecisions ?? [], items: c.items.length } : {}),
  };
}

export function formPage(key: string, version?: number, locale?: string): FormPage | null {
  const p = version ? getPackage(key, version) : activePackage(key) ?? listPackages({ key }).sort((a, b) => b.version - a.version)[0];
  if (p) {
    const pub = publicationOf(p);
    return { view: formView(p, locale), status: { label: STATUS_LABEL[pub.status], ...(pub.blockers[0] ? { note: `next: ${pub.blockers[0]}` } : {}) } };
  }
  const lib = findLibraryForm(key);
  if (!lib) return null;
  const pub = libraryPublication(lib.def, lib.waitsFor);
  return {
    view: formView({ ...lib.def, version: 1, state: 'draft', library: true }, locale),
    status: { label: STATUS_LABEL[pub.status], note: pub.status === 'excluded' ? pub.scope.reason : 'a library form: not approved, waits for its procedure' },
    library: libraryInfo(lib),
  };
}
