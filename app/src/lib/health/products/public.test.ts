// The public product check exposes only approved, publishable information
// (owner's direction of 21 October 2026, health integration): a scan of every
// output of publicProductView() for dossier content, personal data and
// unpublished enforcement records, under every classification, as
// parcels-privacy.test.ts scans the parcel register's outputs for holders.
// There is no product register yet: this is the rule the register, its public
// check and the product-status exchange service must meet.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { publicProductView, NEVER_PUBLIC, EMPTY_CLASSIFICATION, type ProductRecord, type ProductAttributeKey, type PublicClassification, type PublicProduct } from './public';

const DOSSIER = 'DOSSIER-CTD-MODULE3-27182818', PERSON = 'Wanjiru Testqualified', EMAIL = 'qp.31415926@example.org', GROUNDS = 'GROUNDS-UNDISCLOSED-161803';
const UNPUBLISHED = 'UNPUBLISHED-RECALL-NOTICE-141421', DRAFT_COND = 'DRAFT-CONDITION-173205', FINDING = 'GMP-FINDING-MAJOR-223606', COMPOSITION = 'EXCIPIENT-RATIO-264575';
// Anything confidential, personal, unapproved or unpublished, as text or as a key.
const PRIVATE = new RegExp([DOSSIER, PERSON, EMAIL, GROUNDS, UNPUBLISHED, DRAFT_COND, FINDING, COMPOSITION, 'Testreporter', '"grounds"', '"reporters"', '"dossier"', '"assessmentReport"', '"inspectionFindings"', '"qualifiedPerson"', '"contactPerson"', '"composition"'].join('|'), 'i');

const approved = { decision: 'DEC-1', at: '2026-05-01T10:00:00.000Z' };
const record = (): ProductRecord => ({
  productId: 'PRD-0001', kind: 'medicine', version: 3,
  attributes: {
    name: { value: 'Sampleprofen 200 mg tablets', class: 'public', approvedBy: approved },
    strength: { value: '200 mg', class: 'public', approvedBy: approved },
    dosageForm: { value: 'Tablet', class: 'public', approvedBy: approved },
    holder: { value: { organisationId: 'ORG-9', name: 'Sample Pharma Ltd' }, class: 'public', approvedBy: approved },
    authorisationNumber: { value: 'MA-2026-0001', class: 'public', approvedBy: approved },
    status: { value: 'authorised', class: 'public', approvedBy: approved },
    validUntil: { value: '2031-05-01', class: 'public', approvedBy: approved },
    // Recorded but not yet decided: an applicant's proposed condition.
    conditions: { value: DRAFT_COND, class: 'public' },
    activeIngredients: { value: ['ibuprofen'], class: 'public', approvedBy: approved },
    // Commercially confidential and personal, even though approved.
    composition: { value: COMPOSITION, class: 'commercial_confidential', approvedBy: approved },
    manufacturingSites: { value: [{ site: 'SITE-1', contact: EMAIL }], class: 'commercial_confidential', approvedBy: approved },
    dossier: { value: DOSSIER, class: 'commercial_confidential', approvedBy: approved },
    assessmentReport: { value: `Assessment of ${DOSSIER}`, class: 'restricted', approvedBy: approved },
    inspectionFindings: { value: FINDING, class: 'restricted', approvedBy: approved },
    qualifiedPerson: { value: { name: PERSON, email: EMAIL }, class: 'personal', approvedBy: approved },
    // A mislabelled record: personal data marked public, and listed by a careless classification. NEVER_PUBLIC still holds it back.
    contactPerson: { value: { name: PERSON, email: EMAIL }, class: 'public', approvedBy: approved },
    legalBasis: { value: { instrument: 'ACT-1', eId: 'sec_5' }, class: 'administrative', approvedBy: approved },
  },
  enforcement: [
    { id: 'E1', kind: 'safety_notice', at: '2026-06-01', approvedBy: approved, publishedAt: '2026-06-02', publicNotice: 'Store below 25 °C.', grounds: GROUNDS, reporters: [{ name: 'Testreporter', contact: EMAIL }] },
    // Decided but not published, published wording without a decision, and neither.
    { id: 'E2', kind: 'recall', at: '2026-07-01', approvedBy: approved, publicNotice: UNPUBLISHED, grounds: GROUNDS },
    { id: 'E3', kind: 'suspension', at: '2026-07-02', publishedAt: '2026-07-03', publicNotice: UNPUBLISHED, grounds: GROUNDS },
    { id: 'E4', kind: 'withdrawal', at: '2026-07-04', grounds: GROUNDS },
  ],
});

const ALL = Object.keys(record().attributes) as ProductAttributeKey[];
const CLASSIFICATIONS: [string, PublicClassification][] = [
  ['the shipped classification (empty, unapproved)', EMPTY_CLASSIFICATION],
  ['a classification listing everything, not approved', { fields: ALL, approved: false }],
  ['a classification listing everything, approved', { fields: ALL, approved: true, version: 2 }],
  ['a narrow approved classification', { fields: ['name', 'status', 'holder'], approved: true, version: 1 }],
];

describe('the public product check: approved, publishable information only', () => {
  it.each(CLASSIFICATIONS)('never carries dossier content, personal data or unpublished enforcement records: %s', (_label, c) => {
    const out = publicProductView(record(), c);
    expect(JSON.stringify(out)).not.toMatch(PRIVATE);
    for (const k of NEVER_PUBLIC) expect(out.fields, k).not.toHaveProperty(k);
    // Only kind, date and notice of published, decided records.
    expect(out.notices).toEqual([{ kind: 'safety_notice', at: '2026-06-02', notice: 'Store below 25 °C.' }]);
    expect(out.source).toMatchObject({ record: 'regulator', version: 3 });
  });

  it('returns no attribute until the nation approves a classification that lists it', () => {
    expect(publicProductView(record()).fields).toEqual({});
    expect(publicProductView(record(), { fields: ALL, approved: false }).fields).toEqual({});
    expect(Object.keys(publicProductView(record(), { fields: ['name', 'status', 'holder'], approved: true }).fields).sort()).toEqual(['holder', 'name', 'status']);
  });

  it('returns an attribute only when it is approved, public and listed', () => {
    const out = publicProductView(record(), { fields: ALL, approved: true, version: 2 });
    expect(Object.keys(out.fields).sort()).toEqual(['activeIngredients', 'authorisationNumber', 'dosageForm', 'holder', 'name', 'status', 'strength', 'validUntil']);
    // Not approved (a draft condition), not public (administrative legal basis, confidential sites): withheld.
    expect(out.fields).not.toHaveProperty('conditions');
    expect(out.fields).not.toHaveProperty('legalBasis');
    expect(out.fields).not.toHaveProperty('manufacturingSites');
    expect(out.source.classificationVersion).toBe(2);
  });

  it('copies values, so a change to the view never reaches the record', () => {
    const r = record();
    const out = publicProductView(r, { fields: ['holder'], approved: true });
    (out.fields.holder as { name: string }).name = 'changed';
    expect((r.attributes.holder!.value as { name: string }).name).toBe('Sample Pharma Ltd');
  });

  it('has no field in its type for anything never public (the type is the contract)', () => {
    const shape: Record<keyof PublicProduct, true> = { productId: true, kind: true, fields: true, notices: true, source: true };
    expect(Object.keys(publicProductView(record())).sort()).toEqual(Object.keys(shape).sort());
  });

  it('is the rule HLT-MED-024 names, and the I4 register and integration register point to it', () => {
    const root = join(process.cwd(), '..');
    const contract = JSON.parse(readFileSync(join(process.cwd(), 'src/lib/forms/library/catalogue-contracts/HLT-MED-024.json'), 'utf8')) as { library: { policies: Record<string, string> } };
    expect(contract.library.policies['answer.public_view']).toMatch(/publicProductView\(\).*lib\/health\/products\/public\.ts/);
    expect(existsSync(join(root, 'docs/HEALTH_I4_DEPENDENCIES.md'))).toBe(true);
    expect(readFileSync(join(root, 'docs/INTEGRATION_REGISTER.md'), 'utf8')).toMatch(/publicProductView\(\)[\s\S]*Rule built; since 20\.17 and 20\.20 the register and the exchange read through it/);
  });
});
