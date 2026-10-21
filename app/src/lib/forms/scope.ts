// The binding scope of forms (owner's direction of 21 October 2026,
// docs/forms-catalogue/DIRECTION-2026-10-21-REGISTER-FIRST.md §1, and
// CLAUDE.md): what the platform never implements, and what waits for a legal
// review recorded by an authorised official. These are scope restrictions,
// not warnings: an excluded form cannot be drafted for publication, and a
// form that needs a legal review is not published until one is recorded
// (lib/forms/publication.ts).
//
// The requirements register will keep the same lists in
// docs/requirements/form-scope.json; until it lands this module is the one
// place they are defined, and scope.test.ts compares the two once it exists.
// Pure: the designer loads it.

export type ScopeStatus = 'allowed' | 'excluded' | 'legal_review';
export interface ScopeFinding { status: ScopeStatus; reason?: string; matched?: string }

/** Forms whose implementation the approved scope prohibits, by catalogue id. */
export const EXCLUDED_FORMS: Record<string, string> = {
  'HLT-PAT-001': 'Patient registration: no patient or clinical field anywhere, no national patient record.',
  'HLT-ENC-002': 'Individual clinical encounters are excluded.',
  'HLT-REF-003': 'Patient-specific referrals are excluded.',
  'HLT-MED-004': 'Dispensing records on named patients are excluded.',
  'HLT-CARE-008': 'Personal care plans are excluded.',
  'EDU-STD-001': 'Named student registration is excluded: there is no student record system.',
  'EDU-ENR-003': 'Enrolment of named students is excluded.',
  'EDU-ATT-004': 'Individual attendance is excluded (aggregate returns only).',
  'EDU-RES-005': 'Individual assessment results are excluded.',
};

/** Forms blocked until a legal review is recorded by an authorised official. */
export const LEGAL_REVIEW_FORMS: Record<string, string> = {
  'JUS-PRO-006': 'Suspect-identifying prosecution referral: a legal review comes first.',
  'JUS-COR-008': 'Prison admission records: a legal review comes first.',
  'SEC-INT-006': 'Intelligence products: a legal review comes first.',
  'SEC-OVS-007': 'Intelligence oversight records: a legal review comes first.',
  'ELE-REG-004': 'Voter registration: a legal review comes first.',
};

/** Words in a field's key that put a form in the excluded scope (patient and clinical data, named students). */
export const EXCLUDED_FIELD_WORDS: Record<string, string> = {
  patient: 'patient data', clinical: 'clinical data', diagnosis: 'clinical data', prescription: 'clinical data', dispensing: 'dispensing to a named patient',
  'care plan': 'a personal care plan', student: 'a named student record', pupil: 'a named student record', learner: 'a named student record',
  'result value': 'an individual assessment result', 'assessment result': 'an individual assessment result',
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
 * fields' keys. Exclusion wins over legal review.
 */
export function scopeOf(ids: (string | undefined)[], fields: { key: string; items?: unknown }[]): ScopeFinding {
  const known = ids.filter((x): x is string => !!x).map(x => x.toUpperCase());
  for (const id of known) if (EXCLUDED_FORMS[id]) return { status: 'excluded', reason: EXCLUDED_FORMS[id], matched: id };
  const keys = keysOf(fields);
  const ex = matchWords(keys, EXCLUDED_FIELD_WORDS);
  if (ex) return { status: 'excluded', reason: `The field ${ex.key} is ${ex.why}, which the approved scope excludes`, matched: ex.key };
  for (const id of known) if (LEGAL_REVIEW_FORMS[id]) return { status: 'legal_review', reason: LEGAL_REVIEW_FORMS[id], matched: id };
  const lr = matchWords(keys, LEGAL_REVIEW_FIELD_WORDS);
  if (lr) return { status: 'legal_review', reason: `The field ${lr.key} records ${lr.why}: a legal review by an authorised official comes first`, matched: lr.key };
  return { status: 'allowed' };
}

/** The catalogue ids a form names (its specification id and the field series ids it answers). */
export function formIds(key: string, form?: { spec?: { id?: string }; catalogueIds?: string[] }): string[] {
  return [key, form?.spec?.id, ...(form?.catalogueIds ?? [])].filter((x): x is string => !!x);
}
