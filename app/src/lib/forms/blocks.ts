// Building blocks for forms (lib/forms/contract.ts): the questions every
// government asks again and again, defined once and composed into forms, so
// hundreds of forms ask for a person, a date of birth, an address or a
// declaration the same way. A block makes contract fields (and the evidence
// documents they need); the form keeps them, versioned with its procedure,
// so changing a block later never silently changes an approved form. The
// form designer inserts blocks; the loader of form contracts in the
// specification's shape (lib/forms/spec-import.ts) maps their types to them.
//
// Names are culture-neutral: the full name as the person writes it comes
// first and is the only required part; given and family names are optional
// parts, because many naming systems have no family name, put it first, or
// use patronyms and clan names. A date of birth may be a year or a month and
// may be estimated. An address may be informal: landmarks, or a position.

import type { ContractDocument, ContractField, FormSpec, NamedRule } from './contract';

export interface BlockResult { fields: ContractField[]; documents?: ContractDocument[] }
export interface BlockOptions {
  key: string;
  label?: string;
  hint?: string;
  required?: boolean;
  specField?: string | string[];
  section?: string;
  multiple?: boolean;
}
const base = (o: BlockOptions, block: string, label: string): Pick<ContractField, 'key' | 'label' | 'block'> & Partial<ContractField> => ({
  key: o.key, label: o.label ?? label, block,
  ...(o.hint ? { hint: o.hint } : {}), ...(o.required ? { required: true } : {}), ...(o.specField ? { specField: o.specField } : {}), ...(o.section ? { section: o.section } : {}),
});

/** A person's name: the full name as written (required), and optional parts for registers that need them. */
export function personName(o: BlockOptions): BlockResult {
  return { fields: [{
    ...base(o, 'person-name', 'Full name'), type: 'group', personalDataClass: 'personal',
    hint: o.hint ?? 'Write the name in full, in the order the person uses it. Add the parts below only if they apply.',
    items: [
      { key: 'fullName', label: 'Full name, as written', type: 'text', required: true, rules: [{ rule: 'length', min: 1, max: 200 }], personalDataClass: 'personal' },
      { key: 'givenNames', label: 'Given names (if the person has them)', type: 'text', rules: [{ rule: 'length', max: 120 }], personalDataClass: 'personal' },
      { key: 'familyNames', label: 'Family or surname (if the person has one)', type: 'text', rules: [{ rule: 'length', max: 120 }], personalDataClass: 'personal' },
      { key: 'otherNames', label: 'Other names (patronymic, clan or known as)', type: 'text', rules: [{ rule: 'length', max: 120 }], personalDataClass: 'personal' },
    ],
  }] };
}

/** A date of birth that may be a year or a month, and may be estimated. */
export function dateOfBirth(o: BlockOptions): BlockResult {
  return { fields: [{
    ...base(o, 'date-of-birth', 'Date of birth'), type: 'group', personalDataClass: 'personal',
    hint: o.hint ?? 'If the exact date is not known, give the year and month, or the year only.',
    items: [
      { key: 'date', label: 'Date, month or year of birth', type: 'text', required: true, rules: [{ rule: 'pattern', pattern: 'partial-date' }], personalDataClass: 'personal', hint: 'For example 2019-03-27, 2019-03 or 2019' },
      { key: 'estimated', label: 'This date is estimated', type: 'boolean', personalDataClass: 'personal' },
    ],
  }] };
}

/** A person: their register reference where they have one, and their name. */
export function person(o: BlockOptions & { active?: boolean }): BlockResult {
  return { fields: [{
    ...base(o, 'person', 'Person'), type: 'party', parties: ['person'], personalDataClass: 'personal',
    ...(o.multiple ? { multiple: true } : {}),
    hint: o.hint ?? 'Give the birth registration number if the person has one, and the name in full.',
    rules: [{ rule: 'existingRecord', ...(o.active ? { active: true } : {}) }],
  }] };
}

/** An organisation in the organisations register. */
export function organisation(o: BlockOptions & { active?: boolean; pendingProcedure?: string }): BlockResult {
  return { fields: [{
    ...base(o, 'organisation', 'Organisation'), type: 'party', parties: ['organisation'], personalDataClass: 'administrative',
    ...(o.multiple ? { multiple: true } : {}),
    hint: o.hint ?? 'Give the registration number from the organisations register, and the registered name.',
    rules: [{ rule: 'existingRecord', ...(o.active ? { active: true } : {}), ...(o.pendingProcedure ? { pendingProcedure: o.pendingProcedure } : {}) }],
  }] };
}

/** A person or an organisation (a party). */
export function party(o: BlockOptions & { parties?: ('person' | 'organisation' | 'institution')[] }): BlockResult {
  return { fields: [{
    ...base(o, 'party', 'Person or organisation'), type: 'party', parties: o.parties ?? ['person', 'organisation'], personalDataClass: 'personal',
    ...(o.multiple ? { multiple: true } : {}),
    hint: o.hint ?? 'Give the register reference if they have one, and the name in full.',
    rules: [{ rule: 'existingRecord' }],
  }] };
}

/** An address, including an informal one: a street address, landmarks, or a position. */
export function address(o: BlockOptions & { kinds?: ContractField['locationKinds'] }): BlockResult {
  return { fields: [{
    ...base(o, 'address', 'Address'), type: 'location', locationKinds: o.kinds ?? ['address', 'described', 'point'], personalDataClass: 'restricted',
    hint: o.hint ?? 'If there is no street address, describe the place by landmarks (for example: behind the market, blue gate), or give its position.',
  }] };
}

/** How to reach the applicant, on a channel the platform can verify. */
export function contact(o: BlockOptions & { verified?: boolean }): BlockResult {
  return { fields: [{
    ...base(o, 'contact', 'How we can contact you'), type: 'contact', contactMethods: ['email', 'phone', 'post', 'in-person'], personalDataClass: 'personal',
    ...(o.verified ? { rules: [{ rule: 'verifiedChannel' }] } : {}),
    hint: o.hint ?? 'We use this only for this application.',
  }] };
}

/** Who is applying and in what capacity: the applicant themselves, a legal representative or an authorised agent, with evidence of authority. */
export function representation(o: { capacityKey?: string; representativeKey?: string; evidenceKey?: string; specField?: { capacity?: string; evidence?: string } } = {}): BlockResult {
  const cap = o.capacityKey ?? 'actingCapacity', rep = o.representativeKey ?? 'representative', ev = o.evidenceKey ?? 'representationEvidence';
  return {
    fields: [
      { key: cap, label: 'Are you applying for yourself or for someone else?', type: 'enum', required: true, block: 'representation', personalDataClass: 'administrative',
        valuesSource: { kind: 'list', values: [{ value: 'self', label: 'For myself (or my own organisation)' }, { value: 'legal_representative', label: 'As a legal representative' }, { value: 'authorized_agent', label: 'As an authorised agent' }] },
        ...(o.specField?.capacity ? { specField: o.specField.capacity } : {}) },
      { key: rep, label: 'Your name and register reference, as representative', type: 'party', parties: ['person', 'organisation'], block: 'representation', personalDataClass: 'personal',
        showWhen: { field: cap, notEquals: 'self' }, rules: [{ rule: 'requiredWhen', field: cap, notEquals: 'self' }, { rule: 'existingRecord' }] },
      { key: ev, label: 'Evidence of your authority to act', type: 'document', evidence: 'authority-evidence', block: 'representation', personalDataClass: 'restricted',
        showWhen: { field: cap, notEquals: 'self' }, rules: [{ rule: 'requiredWhen', field: cap, notEquals: 'self' }, { rule: 'profile', profile: 'evidence-policy' }],
        ...(o.specField?.evidence ? { specField: o.specField.evidence } : {}) },
    ],
    documents: [{ class: 'authority-evidence', label: 'Evidence of authority to act (power of attorney, appointment or mandate)', required: false, purpose: 'Shows that the person applying may act for the applicant.', formats: ['PDF', 'JPEG', 'paper original'] }],
  };
}

/** A declaration the applicant confirms; signed: confirmed by an identified applicant. */
export function declaration(o: BlockOptions & { version: string; statements: { key: string; text: string }[]; signed?: boolean; extra?: NamedRule[] }): BlockResult {
  return { fields: [{
    ...base(o, 'declaration', 'Declaration'), type: 'attestation', required: o.required ?? true, personalDataClass: 'restricted',
    attestation: { version: o.version, statements: o.statements, ...(o.signed ? { signature: true } : {}) },
    ...(o.signed || o.extra ? { rules: [...(o.signed ? [{ rule: 'signature' } as NamedRule] : []), ...(o.extra ?? [])] } : {}),
  }] };
}

/** Consent to a stated use of the information, where the law asks for consent (separate from the declaration). */
export function consent(o: BlockOptions & { version: string; purpose: string }): BlockResult {
  return { fields: [{
    ...base(o, 'consent', 'Consent'), type: 'attestation', personalDataClass: 'administrative',
    attestation: { version: o.version, statements: [{ key: 'consent', text: o.purpose }] },
  }] };
}

/** A fee from an approved rule: the applicant never types an amount; the rule in force calculates it. */
export function feeFromRule(o: BlockOptions & { prefix: string }): BlockResult {
  return { fields: [{
    ...base(o, 'fee-from-rule', 'Fee'), type: 'enum', valuesSource: { kind: 'rules', prefix: o.prefix }, personalDataClass: 'administrative',
    hint: o.hint ?? 'The amount is calculated by the approved rule in force; it is never typed in.',
  }] };
}

/** Evidence to provide, with the document it asks for. */
export function evidence(o: BlockOptions & { evidenceClass: string; documentLabel?: string; purpose?: string; formats?: string[]; alternative?: string; documentRequired?: boolean }): BlockResult {
  return {
    fields: [{ ...base(o, 'evidence', o.documentLabel ?? 'Evidence'), type: 'document', evidence: o.evidenceClass, personalDataClass: 'restricted', ...(o.multiple ? { multiple: true } : {}), rules: [{ rule: 'profile', profile: 'evidence-policy' }] }],
    documents: [{ class: o.evidenceClass, label: o.documentLabel ?? o.label ?? 'Evidence', required: o.documentRequired ?? !!o.required, ...(o.multiple ? { multiple: true } : {}), ...(o.purpose ? { purpose: o.purpose } : {}), formats: o.formats ?? ['PDF', 'JPEG', 'paper original'], ...(o.alternative ? { alternative: o.alternative } : {}) }],
  };
}

/** A bank account for payments to the applicant (financial information). */
export function bankAccount(o: BlockOptions): BlockResult {
  return { fields: [{
    ...base(o, 'bank-account', 'Bank or mobile money account for payment'), type: 'group', personalDataClass: 'restricted', confidentiality: 'financial',
    hint: o.hint ?? 'The account must be in the applicant\'s name.',
    items: [
      { key: 'holder', label: 'Account holder\'s name', type: 'text', required: true, rules: [{ rule: 'length', max: 200 }], personalDataClass: 'restricted' },
      { key: 'institution', label: 'Bank or mobile money provider', type: 'text', required: true, rules: [{ rule: 'length', max: 120 }], personalDataClass: 'restricted' },
      { key: 'account', label: 'Account number, IBAN or mobile money number', type: 'text', required: true, rules: [{ rule: 'pattern', pattern: 'account-number' }], personalDataClass: 'restricted' },
    ],
  }] };
}

/** The language the applicant wants to be answered in (the nation's official languages). */
export function languagePreference(o: BlockOptions): BlockResult {
  return { fields: [{ ...base(o, 'language', 'Which language should we use to write to you?'), type: 'enum', valuesSource: { kind: 'register', register: 'languages' }, personalDataClass: 'administrative' }] };
}

/** Identity evidence an official may record as seen at an office (proposed: the nation's law decides what counts). */
export const IDENTITY_EVIDENCE: NonNullable<FormSpec['identityEvidence']> = [
  { key: 'national-id', label: 'National identity card' },
  { key: 'passport', label: 'Passport' },
  { key: 'birth-certificate', label: 'Birth certificate or registration' },
  { key: 'residence-permit', label: 'Residence permit' },
  { key: 'driving-licence', label: 'Driving licence' },
  { key: 'other-official', label: 'Another official document (named in the case)' },
];

/** Standard notices: how the information is used, the applicant's rights, what happens next. */
export function standardNotices(o: { institution?: string; next?: string } = {}): NonNullable<FormSpec['notices']> {
  return [
    { key: 'privacy', title: 'How we use your information', text: `${o.institution ?? 'The institution responsible'} uses what you give only to decide this application and to keep the records the law requires. Officials who handle it can see it; every time someone reads it, that is recorded. It is not shared with other institutions except through a lawful, recorded exchange.` },
    { key: 'rights', title: 'Your rights', text: 'You can ask to see what is held about you and to correct it. If the application is refused you are told why, under which law, and how to ask for a review or appeal.' },
    { key: 'next', title: 'What happens next', text: o.next ?? 'You get a reference straight away. An official checks the application and the evidence, may ask you for more, and a decision is made by an official with the authority to make it.' },
  ];
}

/** The blocks the form designer offers, by name. */
export const BLOCKS: { key: string; label: string; description: string; make: (key: string) => BlockResult }[] = [
  { key: 'person-name', label: 'Person\'s name', description: 'Full name as written, with optional given, family and other names.', make: key => personName({ key }) },
  { key: 'date-of-birth', label: 'Date of birth', description: 'A date, month or year, and whether it is estimated.', make: key => dateOfBirth({ key }) },
  { key: 'person', label: 'Person (with register reference)', description: 'A person by birth registration number and name.', make: key => person({ key }) },
  { key: 'organisation', label: 'Organisation', description: 'An organisation in the organisations register.', make: key => organisation({ key }) },
  { key: 'party', label: 'Person or organisation', description: 'Either, with a register reference where they have one.', make: key => party({ key }) },
  { key: 'address', label: 'Address (formal or informal)', description: 'A street address, landmarks or a position on the map.', make: key => address({ key }) },
  { key: 'contact', label: 'Contact', description: 'Email, phone, post or in person; verified where a service is connected.', make: key => contact({ key, verified: true }) },
  { key: 'representation', label: 'Representative or agent', description: 'Applying for someone else, with evidence of authority.', make: key => representation({ capacityKey: key }) },
  { key: 'declaration', label: 'Declaration and signature', description: 'Statements the identified applicant confirms, versioned.', make: key => declaration({ key, version: '1', statements: [{ key: 'true', text: 'The information I have given is true and complete to the best of my knowledge.' }], signed: true }) },
  { key: 'consent', label: 'Consent', description: 'Consent to a stated use, kept apart from the declaration.', make: key => consent({ key, version: '1', purpose: 'I agree that my information may be used for the purpose stated in the notice.' }) },
  { key: 'fee-from-rule', label: 'Fee from an approved rule', description: 'The fee rule in force; no amount is typed.', make: key => feeFromRule({ key, prefix: 'fee.' }) },
  { key: 'evidence', label: 'Evidence', description: 'A document the procedure asks for, with its purpose and formats.', make: key => evidence({ key, evidenceClass: `${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, label: 'Evidence' }) },
  { key: 'bank-account', label: 'Bank or mobile money account', description: 'For payments to the applicant (financial information).', make: key => bankAccount({ key }) },
  { key: 'language', label: 'Language preference', description: 'One of the nation\'s official languages.', make: key => languagePreference({ key }) },
];
