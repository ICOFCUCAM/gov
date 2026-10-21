// What the form pages (/gov/law/procedures/forms/[key] and its print view)
// read: a procedure's form (the version asked for, else the one in force,
// else the latest) or a library form, as it renders, with its register
// status from the publication gates. Server only.

import { activePackage, getPackage, listPackages } from '@/lib/casework/packages';
import type { FormView } from './contract';
import { formView } from './server';
import { publicationOf, STATUS_LABEL } from './publication';
import { scopeOf, formIds } from './scope';
import { SPEC_LIBRARY } from './library/definitions';
import { CANONICAL_LIBRARY } from './library/catalogue';

export interface FormPage { view: FormView; status: { label: string; note?: string } }

export function formPage(key: string, version?: number, locale?: string): FormPage | null {
  const p = version ? getPackage(key, version) : activePackage(key) ?? listPackages({ key }).sort((a, b) => b.version - a.version)[0];
  if (p) {
    const pub = publicationOf(p);
    return { view: formView(p, locale), status: { label: STATUS_LABEL[pub.status], ...(pub.blockers[0] ? { note: `next: ${pub.blockers[0]}` } : {}) } };
  }
  const lib = SPEC_LIBRARY.find(f => f.key === key || f.specId === key) ?? CANONICAL_LIBRARY.find(f => f.key === key || f.specId === key);
  if (!lib) return null;
  const scope = scopeOf(formIds(lib.key, lib.form), lib.fields);
  return {
    view: formView({ ...lib, version: 1, state: 'draft', library: true }, locale),
    status: scope.status === 'excluded' ? { label: STATUS_LABEL.excluded, note: scope.reason } : { label: STATUS_LABEL.contract_draft, note: 'a library form: not approved, waits for its procedure' },
  };
}
