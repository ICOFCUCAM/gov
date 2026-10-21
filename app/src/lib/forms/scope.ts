// The binding scope of forms (owner's direction of 21 October 2026,
// docs/forms-catalogue/DIRECTION-2026-10-21-REGISTER-FIRST.md §1, and
// CLAUDE.md): what the platform never implements, and what waits for a legal
// review recorded by an authorised official. These are scope restrictions,
// not warnings: an excluded form cannot be drafted for publication, and a
// form that needs a legal review is not published until one is recorded
// (lib/forms/publication.ts).
//
// The lists by catalogue id are the requirements register's
// (docs/requirements/form-scope.json, read here as it stands; the register
// changes them, citing the rule). The field words below add a check of our
// own: a form whose fields name a patient, a student, a suspect… falls in the
// same scope even when no id says so. Where the catalogue reuses an ID for
// two different forms (HLT-MED-004 is an additional information request in
// Part 6 and an excluded dispensing record in the supplement's Stage B), a
// form that names the catalogue document it answers (FormSpec.catalogueSource)
// is matched against that document's entry only. Pure: the designer loads it.

import FORM_SCOPE from './data/form-scope.json';

export type ScopeStatus = 'allowed' | 'excluded' | 'legal_review';
export interface ScopeFinding { status: ScopeStatus; reason?: string; matched?: string }

interface ScopeEntry { source?: string; id: string; title?: string; scope: 'excluded' | 'requires_legal_review' | 'allowed'; rule?: string; reason?: string }
const ENTRIES = (FORM_SCOPE as { forms: ScopeEntry[] }).forms;
const listed = (scope: ScopeEntry['scope']): Record<string, string> =>
  Object.fromEntries(ENTRIES.filter(e => e.scope === scope).map(e => [e.id.toUpperCase(), `${e.title ? `${e.title}: ` : ''}${e.rule ?? e.reason ?? scope}`]));

/** Whether an id's entry in a scope applies to a form from this catalogue document (every entry applies when the form names none). */
const appliesTo = (id: string, scope: ScopeEntry['scope'], source?: string): boolean =>
  !source || ENTRIES.some(e => e.id.toUpperCase() === id && e.scope === scope && (!e.source || e.source === source));

/** Forms whose implementation the approved scope prohibits, by catalogue id (the register's `excluded`). */
export const EXCLUDED_FORMS: Record<string, string> = listed('excluded');

/** Forms blocked until a legal review is recorded by an authorised official (the register's `requires_legal_review`). */
export const LEGAL_REVIEW_FORMS: Record<string, string> = listed('requires_legal_review');

/** Forms the register names as allowed (a form not listed is in scope by default; neither is ever approved through this list). */
export const ALLOWED_FORMS: Record<string, string> = listed('allowed');

/** Words in a field's key that put a form in the excluded scope (patient and clinical data, named students). */
export const EXCLUDED_FIELD_WORDS: Record<string, string> = {
  patient: 'patient data', clinical: 'clinical data', diagnosis: 'clinical data', prescription: 'clinical data', dispensing: 'dispensing to a named patient',
  'care plan': 'a personal care plan', student: 'a named student record', pupil: 'a named student record', learner: 'a named student record',
  'result value': 'an individual assessment result', 'assessment result': 'an individual assessment result',
  // Individual public-health records (owner's direction 2026-10-21 §1; form-scope.json HLT-PH-001 … 010, 012, 013, 016 … 018): a person
  // vaccinated, a traced contact, a specimen or a laboratory result stay in the health authority's own systems.
  vaccinee: 'an individual vaccination record', 'vaccinated person': 'an individual vaccination record', 'vaccination record': 'an individual vaccination record',
  'immunisation record': 'an individual vaccination record', 'immunization record': 'an individual vaccination record',
  'contact tracing': 'an individual contact record', 'traced contact': 'an individual contact record', 'case person': 'an individual case record',
  specimen: 'an individual laboratory record', 'laboratory result': 'an individual laboratory record', 'lab result': 'an individual laboratory record',
};

/** Words in a field's key that make a form wait for a legal review (suspects, prison admission, intelligence, voters). */
export const LEGAL_REVIEW_FIELD_WORDS: Record<string, string> = {
  suspect: 'a suspect', accused: 'an accused person', prisoner: 'prison admission', inmate: 'prison admission', 'custody admission': 'prison admission',
  intelligence: 'intelligence', voter: 'voter registration',
};

/** A field key as lower-case words ("patientId", "patient_id", "a.patient-id" → "patient id"). */
const wordsOf = (key: string) => ` ${key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(' ')} `;

function matchWords(keys: string[], words: Record<string, string>): { word: string; why: string; key: string } | undefined {
  for (const key of keys) {
    const w = wordsOf(key);
    for (const [word, why] of Object.entries(words)) if (w.includes(` ${word} `)) return { word, why, key };
  }
  return undefined;
}

/** Every key in a field list, nested questions included. */
function keysOf(fields: { key: string; items?: unknown }[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    out.push(f.key);
    if (Array.isArray(f.items)) out.push(...keysOf(f.items as { key: string; items?: unknown }[]));
  }
  return out;
}

/**
 * Where a form stands in the approved scope, from its catalogue ids and its
 * fields' keys. Exclusion wins over legal review. With `source` (the
 * catalogue document the form answers), an id is matched against that
 * document's entries only; the field words apply whatever the source.
 */
export function scopeOf(ids: (string | undefined)[], fields: { key: string; items?: unknown }[], source?: string): ScopeFinding {
  const known = ids.filter((x): x is string => !!x).map(x => x.toUpperCase());
  for (const id of known) if (EXCLUDED_FORMS[id] && appliesTo(id, 'excluded', source)) return { status: 'excluded', reason: EXCLUDED_FORMS[id], matched: id };
  const keys = keysOf(fields);
  const ex = matchWords(keys, EXCLUDED_FIELD_WORDS);
  if (ex) return { status: 'excluded', reason: `The field ${ex.key} is ${ex.why}, which the approved scope excludes`, matched: ex.key };
  for (const id of known) if (LEGAL_REVIEW_FORMS[id] && appliesTo(id, 'requires_legal_review', source)) return { status: 'legal_review', reason: LEGAL_REVIEW_FORMS[id], matched: id };
  const lr = matchWords(keys, LEGAL_REVIEW_FIELD_WORDS);
  if (lr) return { status: 'legal_review', reason: `The field ${lr.key} records ${lr.why}: a legal review by an authorised official comes first`, matched: lr.key };
  return { status: 'allowed' };
}

/** The catalogue ids a form names (its specification id and the field series ids it answers). */
export function formIds(key: string, form?: { spec?: { id?: string }; catalogueIds?: string[] }): string[] {
  return [key, form?.spec?.id, ...(form?.catalogueIds ?? [])].filter((x): x is string => !!x);
}

/** A form's scope finding: its key, its specification and catalogue ids (read against the catalogue document it names), its fields. */
export function formScope(key: string, form: { spec?: { id?: string }; catalogueIds?: string[]; catalogueSource?: string } | undefined, fields: { key: string; items?: unknown }[]): ScopeFinding {
  return scopeOf(formIds(key, form), fields, form?.catalogueSource);
}
