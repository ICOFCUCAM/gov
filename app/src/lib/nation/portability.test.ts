// The three portability tests (docs/CONSTITUTIONAL_ARCHITECTURE.md §8.4; plan
// phase 7), run against three ILLUSTRATIVE profiles: a presidential federal
// republic (US-like), a parliamentary constitutional monarchy with devolution
// (UK-like) and a federation of emirates with constituent rulers (UAE-like).
//
// THESE TESTS PROVE THE MECHANISM, NEVER THE LEGAL MAPPING. Each profile is
// built only through the platform's own setup, registry, relationship, office,
// laws and legislative-record functions — the same ones every installation
// uses — with no country-specific code anywhere. The institutions, standings,
// relationships and texts below are abbreviated illustrations chosen to
// exercise the rules (guidance §7.3: "illustrative architectural profiles,
// not complete legal mappings"); none is a statement of any country's law,
// and a real installation needs its mapping validated by the nation's legal
// authorities and an independent review before activation.
//
//   Test 1 — structural portability: each profile is representable
//            (institutions, standings, offices, relationships, classification).
//   Test 2 — negative authorization: the executive cannot exercise a
//            legislature's or a court's power or write their records; a
//            minister cannot instruct an independent body without an approved
//            relationship; a federal institution cannot exercise a constituent
//            unit's reserved power (modelled minimally: standing `subnational`
//            plus the scope of approved relationships).
//   Test 3 — transition safety: changing an officeholder, an institution's
//            standing, a relationship and a law version keeps history, keeps
//            old decisions' legal basis and never silently transfers powers.
import { describe, it, expect, beforeAll } from 'vitest';
import { createMinistry, getMinistry } from '@/lib/data/store/ministries';
import { setSovereign, getSovereign, completeSetup } from '@/lib/data/store/sovereign';
import { db as storeDb } from '@/lib/data/store/state';
import { recordTermsDuringSetup, institutionBounds, termsOf, proposeInstitutionTerms, confirmInstitutionTerms } from '@/lib/data/store/institutions';
import { proposeRelationship, confirmRelationship, relationshipGrants, getRelationship, resetRelationships } from '@/lib/data/store/relationships';
import { recordVersion, confirmVersion, cite, versionOn, resetLaw, getInstrument } from '@/lib/law/register';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import { resetOffices, recordOfficeDuringSetup, listOffices, proposeHolding, confirmHolding, endHolding, listHoldings } from './office-register';
import { classificationOf, styleLabel } from './classification';
import { caseFacts } from '@/lib/casework/engine';
import type { Case } from '@/lib/casework/types';
import type { AuthorityKey } from './deployment';
import type { InstitutionStanding, IndependenceRule } from '@/lib/api/types';
import type { BranchKey } from '@/lib/gov/constitution';
import {
  ministryPermission, canReadInstitution, caseActRefusal, caseReadRefusal, directiveTargetRefusal, apiPermission, assentRefusal,
  legislativeRecordRefusal, EXECUTIVE_OFFICE, type Scope, type OfficialRole,
} from '@/lib/auth/roles';
import {
  resetLegislature, draftProcedure, approveProcedure, introduceBill, recordStage, recordVote, passBill, recordAssent, recordCommencement,
  publishBill, certifyBill, transmitToLaws, type LegislativeActor,
} from '@/lib/legislature/register';

const SETUP_TOKEN = 'test-setup-token-portability-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

// ── An illustrative profile, as data ────────────────────────────────────────

interface InstitutionSpec { key: string; name: string; standing: InstitutionStanding; branch?: BranchKey; independence?: Partial<Record<'decisions' | 'appointment' | 'dismissal' | 'funding' | 'instructions', IndependenceRule>> }
interface ProfileSpec {
  label: string;
  stateName: string;
  classification: { stateForms: string[]; governmentForms: string[]; territorialArrangements: string[]; legalTraditions: string[]; authorityTypes: string[]; style: string };
  institutions: InstitutionSpec[];
  authorities: Partial<Record<AuthorityKey, string>>;
  offices: { key: string; title: string; kind: string; institution: string }[];
  /** Relationships the illustration approves (two officials) and those it leaves as drafts ("requires legal mapping"). */
  relationships: { key: string; from: string; to: string; type: string; scope?: { recordTypes?: string[]; purposes?: string[] }; approve: boolean }[];
  /** Roles in the illustration: the executive's centre, a ministry, the legislature, a court, the head of state's office, an independent body, constituent units. */
  roles: { executiveMinistry: string; legislature: string; court: string; headOfState: string; independentBody: string; constituent: string[] };
}

const US_LIKE: ProfileSpec = {
  label: 'presidential federal republic (US-like, illustrative)',
  stateName: 'Illustrative Presidential Federation',
  classification: { stateForms: ['republic', 'federation'], governmentForms: ['presidential'], territorialArrangements: ['federal'], legalTraditions: ['common_law'], authorityTypes: ['constitutional', 'statutory'], style: 'federation' },
  institutions: [
    { key: 'eop', name: 'Executive Office of the President', standing: 'executive-ministry', branch: 'executive' },
    { key: 'treasury', name: 'Department of the Treasury', standing: 'executive-ministry', branch: 'executive' },
    { key: 'congress', name: 'Congress', standing: 'legislature', branch: 'legislature' },
    { key: 'supreme-court', name: 'Supreme Court', standing: 'judiciary', branch: 'judiciary' },
    { key: 'election-commission', name: 'Federal Election Commission', standing: 'independent-statutory', independence: { decisions: { protected: true } } },
    { key: 'state-a', name: 'Government of State A', standing: 'subnational' },
    { key: 'state-b', name: 'Government of State B', standing: 'subnational' },
  ],
  // The president is head of state and of government: the same office's institution is named for the head of state.
  authorities: { legislature: 'congress', judiciary: 'supreme-court', headOfState: 'eop', lawRegister: 'treasury', electoral: 'election-commission' },
  offices: [
    { key: 'president', title: 'President', kind: 'head-of-state', institution: 'eop' },
    { key: 'speaker', title: 'Speaker of the House', kind: 'presiding-officer', institution: 'congress' },
    { key: 'chief-justice', title: 'Chief Justice', kind: 'chief-justice', institution: 'supreme-court' },
    { key: 'governor-a', title: 'Governor of State A', kind: 'governor', institution: 'state-a' },
  ],
  relationships: [
    { key: 'senate-confirms', from: 'congress', to: 'supreme-court', type: 'appoint', approve: false },
    { key: 'fec-reads-treasury', from: 'election-commission', to: 'treasury', type: 'request_information', scope: { recordTypes: ['cases'], purposes: ['Campaign finance inquiry'] }, approve: true },
  ],
  roles: { executiveMinistry: 'treasury', legislature: 'congress', court: 'supreme-court', headOfState: 'eop', independentBody: 'election-commission', constituent: ['state-a', 'state-b'] },
};

const UK_LIKE: ProfileSpec = {
  label: 'parliamentary constitutional monarchy with devolution (UK-like, illustrative)',
  stateName: 'Illustrative United Kingdom-like Monarchy',
  classification: { stateForms: ['monarchy', 'union'], governmentForms: ['parliamentary', 'constitutional-monarchy'], territorialArrangements: ['unitary', 'devolved'], legalTraditions: ['common_law', 'mixed'], authorityTypes: ['constitutional', 'statutory'], style: 'kingdom' },
  institutions: [
    { key: 'crown', name: 'The Sovereign\'s Household', standing: 'head-of-state', branch: 'crown' },
    { key: 'cabinet-office', name: 'Cabinet Office', standing: 'executive-ministry', branch: 'executive' },
    { key: 'home-office', name: 'Home Office', standing: 'executive-ministry', branch: 'executive' },
    { key: 'parliament', name: 'Parliament', standing: 'legislature', branch: 'legislature' },
    { key: 'supreme-court', name: 'Supreme Court', standing: 'judiciary', branch: 'judiciary' },
    { key: 'electoral-commission', name: 'Electoral Commission', standing: 'independent-statutory', independence: { decisions: { protected: true }, instructions: { protected: true, note: 'Reports to Parliament (illustrative)' } } },
    { key: 'devolved-a', name: 'Devolved Government A', standing: 'subnational' },
    { key: 'devolved-b', name: 'Devolved Government B', standing: 'subnational' },
  ],
  authorities: { legislature: 'parliament', judiciary: 'supreme-court', headOfState: 'crown', lawRegister: 'cabinet-office', electoral: 'electoral-commission' },
  offices: [
    { key: 'sovereign', title: 'The Sovereign', kind: 'head-of-state', institution: 'crown' },
    { key: 'prime-minister', title: 'Prime Minister', kind: 'head-of-government', institution: 'cabinet-office' },
    { key: 'home-secretary', title: 'Home Secretary', kind: 'minister', institution: 'home-office' },
    { key: 'clerk', title: 'Clerk of the House', kind: 'clerk', institution: 'parliament' },
    { key: 'first-minister-a', title: 'First Minister of A', kind: 'head-of-government', institution: 'devolved-a' },
  ],
  relationships: [
    { key: 'parliament-receives-reports', from: 'parliament', to: 'electoral-commission', type: 'receive_reports', approve: false },
  ],
  roles: { executiveMinistry: 'home-office', legislature: 'parliament', court: 'supreme-court', headOfState: 'crown', independentBody: 'electoral-commission', constituent: ['devolved-a', 'devolved-b'] },
};

const UAE_LIKE: ProfileSpec = {
  label: 'federation of emirates with constituent rulers (UAE-like, illustrative)',
  stateName: 'Illustrative Federation of Emirates',
  classification: { stateForms: ['federation', 'monarchy'], governmentForms: ['federal_constitutional_arrangement'], territorialArrangements: ['federal', 'constituent_emirates'], legalTraditions: ['civil_law', 'islamic_law'], authorityTypes: ['constitutional', 'statutory', 'religious'], style: 'emirate' },
  institutions: [
    { key: 'supreme-council', name: 'Federal Supreme Council', standing: 'independent-constitutional', branch: 'federal-council' },
    { key: 'president', name: 'Office of the President of the Federation', standing: 'head-of-state', branch: 'crown' },
    { key: 'council-of-ministers', name: 'Council of Ministers', standing: 'executive-ministry', branch: 'executive' },
    { key: 'interior', name: 'Federal Ministry of Interior', standing: 'executive-ministry', branch: 'executive' },
    { key: 'fnc', name: 'Federal National Council', standing: 'legislature', branch: 'legislature' },
    { key: 'federal-judiciary', name: 'Federal Supreme Court', standing: 'judiciary', branch: 'judiciary' },
    { key: 'audit', name: 'Federal Audit Authority', standing: 'independent-statutory', independence: { decisions: { protected: true } } },
    { key: 'emirate-a', name: 'Government of Emirate A', standing: 'subnational' },
    { key: 'emirate-b', name: 'Government of Emirate B', standing: 'subnational' },
  ],
  authorities: { legislature: 'fnc', judiciary: 'federal-judiciary', headOfState: 'president', lawRegister: 'council-of-ministers', supremeAudit: 'audit' },
  offices: [
    { key: 'president', title: 'President of the Federation', kind: 'head-of-state', institution: 'president' },
    { key: 'prime-minister', title: 'Prime Minister', kind: 'head-of-government', institution: 'council-of-ministers' },
    { key: 'ruler-a', title: 'Ruler of Emirate A', kind: 'traditional-leader', institution: 'emirate-a' },
    { key: 'ruler-b', title: 'Ruler of Emirate B', kind: 'traditional-leader', institution: 'emirate-b' },
  ],
  relationships: [
    // Guidance §7.3 C marks these "requires legal mapping": they stay drafts and grant nothing.
    { key: 'elects-president', from: 'supreme-council', to: 'president', type: 'appoint', approve: false },
    { key: 'approves-pm', from: 'supreme-council', to: 'council-of-ministers', type: 'appoint', approve: false },
    { key: 'interior-asks-emirate', from: 'interior', to: 'emirate-a', type: 'request_information', scope: { recordTypes: ['cases'], purposes: ['Federal statistics return'] }, approve: true },
  ],
  roles: { executiveMinistry: 'interior', legislature: 'fnc', court: 'federal-judiciary', headOfState: 'president', independentBody: 'audit', constituent: ['emirate-a', 'emirate-b'] },
};

const PROFILES = [US_LIKE, UK_LIKE, UAE_LIKE];

// ── Building a profile through the platform's own functions ────────────────

interface Built {
  spec: ProfileSpec;
  id: Record<string, string>;
  office: Record<string, string>;
  rel: Record<string, string>;
  constitution: string;
  accounts: Record<string, string>;
}
const ADMIN_A = { by: 'Administrator A', byId: 'local:admin-a' };
const ADMIN_B = { by: 'Administrator B', byId: 'local:admin-b', role: 'administrator' };

async function build(spec: ProfileSpec): Promise<Built> {
  storeDb.setup = null;
  resetLaw(); resetRelationships(); resetOffices(); resetLegislature(); resetOfficials();
  // An illustrative constitutional text in the laws register, so every change can cite a provision (never a real text).
  const law = ok(recordVersion({ instrument: { title: `${spec.stateName} — illustrative constitution`, type: 'constitution', jurisdiction: 'illustrative', year: 2000, number: `${PROFILES.indexOf(spec) + 1}` , issuingAuthority: 'Illustration' },
    dates: { inForce: '2000-01-01' }, provisions: Array.from({ length: 9 }, (_, i) => ({ eId: `art_${i + 1}`, num: String(i + 1), text: `Illustrative article ${i + 1}.` })), source: { kind: 'sample' } }, 'Law clerk 1', 'local:law-1'));
  ok(confirmVersion(law.instrument.id, law.version.id, 'Law clerk 2', 'local:law-2'));
  const id: Record<string, string> = {};
  for (const i of spec.institutions) {
    const m = ok(createMinistry({ archetype: 'GENERIC', name: i.name, slug: `${i.key}-${Math.random().toString(36).slice(2, 7)}` }));
    id[i.key] = m.id;
    ok(recordTermsDuringSetup(m.id, { standing: i.standing, ...(i.branch ? { branch: i.branch } : {}), ...(i.independence ? { independence: i.independence } : {}) }, 'Setup'));
  }
  const authorities = Object.fromEntries(Object.entries(spec.authorities).map(([k, v]) => [k, id[v!]!]));
  ok(setSovereign({ stateName: spec.stateName, constitution: { ...getSovereign().constitution, classification: spec.classification } as never, deployment: { ...getSovereign().deployment, authorities } }, 'Setup'));
  const office: Record<string, string> = {};
  for (const o of spec.offices) office[o.key] = ok(recordOfficeDuringSetup({ title: o.title, kind: o.kind, institution: id[o.institution], legalBasis: [{ instrument: law.instrument.id, eId: 'art_2' }] }, { by: 'Setup', role: 'administrator' })).id;
  // Accounts: the first with the setup code; then officials of each institution the tests act for.
  const accounts: Record<string, string> = {};
  accounts.admin = ok(await createAccount({ email: 'admin@x.test', name: 'Admin', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null)).id;
  for (const [k, inst, role] of [['hosOfficer', spec.roles.headOfState, 'officer'], ['hosOfficer2', spec.roles.headOfState, 'officer'], ['hosSigner', spec.roles.headOfState, 'signatory']] as const) {
    accounts[k] = ok(await createAccount({ email: `${k}@x.test`, name: k, office: 'Official', password: 'correct horse battery', role, institution: id[inst] }, 'Setup')).id;
  }
  completeSetup('Setup');
  const rel: Record<string, string> = {};
  for (const r of spec.relationships) {
    const p = ok(proposeRelationship({ from: id[r.from], to: id[r.to], type: r.type, scope: { recordTypes: r.scope?.recordTypes ?? [], purposes: r.scope?.purposes ?? [] }, legalBasis: [{ instrument: law.instrument.id, eId: 'art_3' }] }, ADMIN_A));
    rel[r.key] = p.relationship.id;
    if (r.approve) ok(confirmRelationship(p.relationship.id, ADMIN_B, () => false));
  }
  return { spec, id, office, rel, constitution: law.instrument.id, accounts };
}

const scope = (role: OfficialRole, institution?: string): Scope => ({ role, ...(institution ? { institution } : {}), bounds: institutionBounds() });
const legActor = (by: string, s: Scope): LegislativeActor => ({ by, byId: `local:${by.toLowerCase().replace(/\W+/g, '-')}`, scope: s });

/** A law enacted through the legislature's own record and confirmed in the laws register (used by test 3). */
function enact(b: Built, title: string, text: string, inForce: string, lawInstrument?: string): { instrument: string; version: string } {
  const leg = b.id[b.spec.roles.legislature]!;
  const staff = legActor('Table Office', scope('officer', leg));
  const clerk = legActor('Clerk', scope('signatory', leg));
  const hos = legActor('Head of state\'s secretary', scope('signatory', b.id[b.spec.roles.headOfState]));
  const bill = ok(introduceBill({ title, provisions: [{ eId: 'sec_1', num: '1', text }], date: '2026-02-01', ...(lawInstrument ? { lawInstrument } : {}) }, staff));
  for (const stage of ['second-reading', 'third-reading']) {
    if (stage === 'third-reading') { ok(recordStage(bill.id, { stage: 'committee', date: '2026-02-02' }, staff)); }
    ok(recordStage(bill.id, { stage, date: '2026-02-02' }, staff));
    ok(recordVote(bill.id, { yes: 10, no: 2, date: '2026-02-02' }, clerk));
  }
  ok(passBill(bill.id, { date: '2026-02-03' }, clerk));
  ok(recordAssent(bill.id, { outcome: 'assented', date: '2026-02-04' }, hos));
  ok(recordCommencement(bill.id, { inForce }, clerk));
  ok(publishBill(bill.id, { date: '2026-02-05', reference: `Official journal ${title}`, actNumber: `${title.length}-${inForce.slice(0, 4)}` }, clerk));
  ok(certifyBill(bill.id, clerk));
  const sent = ok(transmitToLaws(bill.id, clerk));
  ok(confirmVersion(sent.instrument, sent.version, 'Registrar of laws', 'local:registrar'));
  return sent;
}

// ── The tests, per profile ──────────────────────────────────────────────────

describe.each(PROFILES)('portability (mechanism, not the legal mapping): $label', spec => {
  let b: Built;
  beforeAll(async () => { b = await build(spec); });

  it('test 1 · structural portability (mechanism only): every institution, standing, office, relationship and the classification are represented without country-specific code', () => {
    for (const i of spec.institutions) {
      const m = getMinistry(b.id[i.key]!)!;
      expect(m.name).toBe(i.name);
      expect(termsOf(m)).toMatchObject({ standing: i.standing, ...(i.branch ? { branch: i.branch } : {}) });
    }
    const c = classificationOf(getSovereign());
    expect(c).toMatchObject({ derived: false, stateForms: spec.classification.stateForms, territorialArrangements: spec.classification.territorialArrangements, style: spec.classification.style });
    expect(styleLabel(c.style ?? 'government')).toMatch(/Official .* Platform/);
    const offices = listOffices();
    for (const o of spec.offices) expect(offices.find(x => x.id === b.office[o.key])).toMatchObject({ title: o.title, kind: o.kind, institution: b.id[o.institution], inForce: true });
    // Head of state and head of government stay separate offices wherever the profile records both.
    const heads = offices.filter(o => o.kind === 'head-of-state' && o.inForce);
    expect(heads).toHaveLength(1);
    const bounds = institutionBounds();
    const r = spec.roles;
    expect(bounds.independent).toEqual(expect.arrayContaining([b.id[r.legislature], b.id[r.court], b.id[r.headOfState], b.id[r.independentBody]]));
    expect(bounds.judicial).toContain(b.id[r.court]);
    expect(bounds.subnational).toEqual(expect.arrayContaining(r.constituent.map(k => b.id[k])));
    expect(bounds.independent).not.toContain(b.id[r.executiveMinistry]);
    expect(bounds.legislature).toBe(b.id[r.legislature]);
    // Relationships the illustration approved grant; those left for legal mapping stay drafts and grant nothing.
    for (const rel of spec.relationships) {
      const v = getRelationship(b.rel[rel.key]!)!;
      expect(v.status, rel.key).toBe(rel.approve ? 'approved' : 'draft');
      expect(relationshipGrants().some(g => g.id === b.rel[rel.key]), rel.key).toBe(rel.approve);
    }
  });

  it('test 2 · negative authorization (mechanism only): the executive cannot exercise the legislature\'s or a court\'s power, nor write their records', () => {
    const r = spec.roles;
    const wg = scope('administrator');
    const ministry = scope('signatory', b.id[r.executiveMinistry]);
    const leg = b.id[r.legislature]!, court = b.id[r.court]!;
    for (const s of [wg, ministry, scope('officer'), scope('auditor')]) {
      expect(legislativeRecordRefusal(s, leg, 'record')).toBeTruthy();
      expect(legislativeRecordRefusal(s, leg, 'sign')).toBeTruthy();
      expect(apiPermission(s, 'POST', '/api/legislature/bills')).toBeTruthy();
      expect(ministryPermission(s, court)).toBeTruthy();
      expect(caseActRefusal(s, caseFacts({ owner: court, sensitivity: 'normal' } as Case))).toBeTruthy();
      expect(caseReadRefusal(s, caseFacts({ owner: court, sensitivity: 'normal' } as Case), 'Any purpose')).toMatch(/court/);
    }
    // Only the legislature's own officials keep its record; only the head of state's office records assent.
    expect(legislativeRecordRefusal(scope('signatory', leg), leg, 'sign')).toBeNull();
    expect(assentRefusal(ministry, b.id[r.headOfState], leg)).toBeTruthy();
    expect(assentRefusal(wg, b.id[r.headOfState], leg)).toBeTruthy();
    expect(assentRefusal(scope('signatory', b.id[r.headOfState]), b.id[r.headOfState], leg)).toBeNull();
    // The court's own officials keep their cases.
    expect(caseActRefusal(scope('officer', court), caseFacts({ owner: court, sensitivity: 'normal' } as Case))).toBeNull();
  });

  it('test 2 · negative authorization (mechanism only): no instruction reaches an independent body without an approved relationship covering it', () => {
    const r = spec.roles;
    const body = { id: b.id[r.independentBody]!, name: 'Independent body' };
    const bounds = institutionBounds();
    const minister = { id: b.id[r.executiveMinistry]!, name: 'Ministry' };
    expect(directiveTargetRefusal(bounds, minister, 'instruction', [body])).toMatch(/independent and cannot be instructed/);
    expect(directiveTargetRefusal(bounds, { id: EXECUTIVE_OFFICE, name: 'Executive office' }, 'policy', [body])).toMatch(/independent and cannot be instructed/);
    // A request, a communication or a referral may go to anyone.
    expect(directiveTargetRefusal(bounds, minister, 'request', [body])).toBeNull();
    expect(ministryPermission(scope('administrator'), body.id)).toMatch(/independent/);
    // Where the nation's law gives such a power, it is recorded as a relationship: proposed citing the law, confirmed
    // by the independent body itself, and it covers only the kinds of directive it lists.
    const p = ok(proposeRelationship({ from: minister.id, to: body.id, type: 'instruct', scope: { recordTypes: ['policy'] }, legalBasis: [{ instrument: b.constitution, eId: 'art_6' }] }, ADMIN_A));
    expect(confirmRelationship(p.relationship.id, ADMIN_B, () => false)).toMatchObject({ error: expect.stringMatching(/independent/) });
    expect(directiveTargetRefusal(institutionBounds(), minister, 'policy', [body])).toMatch(/cannot be instructed/);
    ok(confirmRelationship(p.relationship.id, { by: 'Body signatory', byId: 'local:body-signer', role: 'signatory', institution: body.id }, id => id === body.id));
    expect(directiveTargetRefusal(institutionBounds(), minister, 'policy', [body])).toBeNull();
    expect(directiveTargetRefusal(institutionBounds(), minister, 'instruction', [body])).toMatch(/cannot be instructed/);
    expect(ministryPermission(scope('signatory', minister.id), body.id)).toBeTruthy();
  });

  it('test 2 · negative authorization (mechanism only): central or federal scope cannot exercise a constituent unit\'s reserved power', () => {
    const r = spec.roles;
    const unit = b.id[r.constituent[0]!]!, other = b.id[r.constituent[1]!]!;
    const wg = scope('administrator');
    const federal = scope('signatory', b.id[r.executiveMinistry]);
    for (const s of [wg, federal, scope('officer')]) {
      expect(ministryPermission(s, unit)).toBeTruthy();
      expect(apiPermission(s, 'POST', `/api/org/ministries/${unit}/queue`)).toBeTruthy();
      expect(caseActRefusal(s, caseFacts({ owner: unit, sensitivity: 'normal' } as Case))).toBeTruthy();
    }
    expect(ministryPermission(wg, unit)).toMatch(/regional or local government/);
    expect(canReadInstitution(wg, unit)).toMatch(/regional or local government/);
    expect(caseReadRefusal(wg, caseFacts({ owner: unit, sensitivity: 'normal' } as Case))).toMatch(/regional or local government/);
    const bounds = institutionBounds();
    expect(directiveTargetRefusal(bounds, { id: EXECUTIVE_OFFICE, name: 'Central government' }, 'instruction', [{ id: unit, name: 'Unit' }])).toMatch(/regional or local government/);
    // One constituent unit does not act for another either; its own officials act at home.
    expect(ministryPermission(scope('administrator', other), unit)).toBeTruthy();
    expect(ministryPermission(scope('officer', unit), unit)).toBeNull();
    // Where the illustration approved a read relationship (UAE-like: the federal interior ministry asks an emirate for a
    // statistics return), it lets that ministry read for that purpose only — never act, never decide.
    const rel = spec.relationships.find(x => x.approve && x.to === r.constituent[0] && x.type === 'request_information');
    if (rel) {
      const s = scope('officer', b.id[rel.from]);
      expect(canReadInstitution(s, unit, rel.scope!.purposes![0])).toBeNull();
      expect(canReadInstitution(s, unit, 'Something else')).toMatch(/purpose/);
      expect(caseActRefusal(s, caseFacts({ owner: unit, sensitivity: 'normal' } as Case))).toBeTruthy();
      expect(ministryPermission(s, unit)).toBeTruthy();
    }
  });

  it('test 3 · transition safety (mechanism only): a new officeholder keeps the history and gains no power', () => {
    const hos = spec.offices.find(o => o.kind === 'head-of-state')!;
    const officeId = b.office[hos.key]!;
    const hosInst = b.id[spec.roles.headOfState]!;
    const leg = b.id[spec.roles.legislature]!;
    const admin = { by: 'Admin', byId: `local:${b.accounts.admin}`, role: 'administrator' as const };
    // The head of state's office is independent: its own administrator links its holder; the whole government cannot.
    expect(proposeHolding({ officeId, accountId: b.accounts.hosOfficer }, admin)).toMatchObject({ error: expect.stringMatching(/own institution/) });
    const hosAdmin = { by: 'HoS Admin', byId: 'local:hos-admin', role: 'administrator' as const, institution: hosInst };
    const hosSigner = { by: 'HoS Signer', byId: `local:${b.accounts.hosSigner}`, role: 'signatory' as const, institution: hosInst };
    const h1 = ok(proposeHolding({ officeId, accountId: b.accounts.hosOfficer, from: '2026-01-01' }, hosAdmin));
    ok(confirmHolding(h1.id, hosSigner));
    // Holding the office grants nothing the account's role does not: an officer holding it still cannot record assent.
    const holder = scope('officer', hosInst);
    expect(assentRefusal(holder, hosInst, leg)).toMatch(/can sign/);
    // A change of holder: the first holding ends with its date and reason, the second begins; both kept.
    ok(endHolding(h1.id, { reason: 'Term ended', to: '2026-06-30' }, hosAdmin));
    const h2 = ok(proposeHolding({ officeId, accountId: b.accounts.hosOfficer2, from: '2026-07-01' }, hosAdmin));
    ok(confirmHolding(h2.id, hosSigner));
    const holdings = listHoldings(officeId);
    expect(holdings.map(h => [h.accountId, h.state])).toEqual(expect.arrayContaining([[b.accounts.hosOfficer, 'ended'], [b.accounts.hosOfficer2, 'active']]));
    expect(holdings.find(h => h.id === h1.id)).toMatchObject({ to: '2026-06-30' });
    expect(assentRefusal(scope('officer', hosInst), hosInst, leg)).toMatch(/can sign/);
  });

  it('test 3 · transition safety (mechanism only): a change of standing waits for two officials and its date, keeps every version, and moves reach only then', () => {
    const agency = b.id[spec.roles.executiveMinistry]!;
    const before = institutionBounds();
    expect(before.independent).not.toContain(agency);
    const proposed = ok(proposeInstitutionTerms(agency, { standing: 'independent-statutory', independence: { decisions: { protected: true } }, effectiveFrom: '2030-01-01', legalBasis: [{ instrument: b.constitution, eId: 'art_4' }] }, ADMIN_A));
    expect(proposed).toMatchObject({ by: ADMIN_A.by });
    // Proposed: nothing moves.
    expect(institutionBounds().independent).not.toContain(agency);
    expect(ministryPermission(scope('administrator'), agency)).toBeNull();
    expect(confirmInstitutionTerms(agency, { ...ADMIN_A, role: 'administrator' }, { ownSigners: false })).toMatchObject({ error: expect.stringMatching(/different/) });
    ok(confirmInstitutionTerms(agency, ADMIN_B, { ownSigners: false }));
    // Adopted but not yet in force: still nothing moves.
    expect(institutionBounds().independent).not.toContain(agency);
    expect(ministryPermission(scope('administrator'), agency)).toBeNull();
    // From its date it applies; the history keeps the adopted version with who proposed and confirmed it.
    const later = new Date('2030-01-02T00:00:00Z');
    expect(institutionBounds(later).independent).toContain(agency);
    expect(ministryPermission({ role: 'administrator', bounds: institutionBounds(later) }, agency)).toMatch(/independent/);
    const m = getMinistry(agency)!;
    expect(m.terms?.history?.at(-1)).toMatchObject({ outcome: 'adopted', by: ADMIN_A.by, confirmed: { by: ADMIN_B.by } });
    expect(termsOf(m).standing).toBe('executive-ministry');
    expect(termsOf(m, later).standing).toBe('independent-statutory');
  });

  it('test 3 · transition safety (mechanism only): suspending a relationship stops its grant and keeps both versions; drafts never grant', () => {
    const approved = spec.relationships.find(r => r.approve);
    const draft = spec.relationships.find(r => !r.approve);
    if (draft) expect(relationshipGrants().some(g => g.id === b.rel[draft.key])).toBe(false);
    if (!approved) return;
    const id = b.rel[approved.key]!;
    expect(relationshipGrants().some(g => g.id === id)).toBe(true);
    ok(proposeRelationship({ id, status: 'suspended', legalBasis: [{ instrument: b.constitution, eId: 'art_5' }] }, ADMIN_A));
    // Proposed only: still in force.
    expect(relationshipGrants().some(g => g.id === id)).toBe(true);
    ok(confirmRelationship(id, ADMIN_B, () => false));
    expect(relationshipGrants().some(g => g.id === id)).toBe(false);
    const v = getRelationship(id)!;
    expect(v.status).toBe('suspended');
    expect(v.history.filter(h => h.outcome === 'adopted')).toHaveLength(2);
    // The read it allowed is refused now.
    const s = scope('officer', b.id[approved.from]);
    expect(canReadInstitution(s, b.id[approved.to]!, approved.scope!.purposes![0])).toBeTruthy();
  });

  it('test 3 · transition safety (mechanism only): a new law version enacted through the legislature leaves old decisions on the version they cited', () => {
    const leg = b.id[spec.roles.legislature]!;
    const staff = legActor('Table Office', scope('officer', leg));
    const clerk = legActor('Clerk', scope('signatory', leg));
    const d = ok(draftProcedure({ fromReference: true, title: 'Illustrative standing orders', chambers: ['Chamber'] }, staff));
    ok(approveProcedure(d.version, clerk, '2026-01-01'));
    const v1 = enact(b, 'Illustrative Records Act', 'Records are kept for ten years.', '2026-03-01');
    // A decision made on 2026-04-01 cites the provision as it stood that day.
    const decision = ok(cite(v1.instrument, 'sec_1', '2026-04-01', 'An illustrative decision'));
    expect(decision.version).toBe(v1.version);
    // An amending act gives the instrument a new version in force later.
    const v2 = enact(b, 'Illustrative Records (Amendment) Act', 'Records are kept for twenty years.', '2027-01-01', v1.instrument);
    expect(v2.instrument).toBe(v1.instrument);
    expect(v2.version).not.toBe(v1.version);
    // The old decision's legal basis is unchanged: the same version and digest, and the law as it stood then.
    expect(cite(v1.instrument, 'sec_1', '2026-04-01')).toMatchObject({ version: v1.version, digest: decision.digest });
    expect(ok(versionOn(v1.instrument, '2026-04-01')).provisions[0]!.text).toBe('Records are kept for ten years.');
    expect(ok(versionOn(v1.instrument, '2027-02-01')).provisions[0]!.text).toBe('Records are kept for twenty years.');
    // Both versions are kept, each with the legislature's provenance.
    const inst = getInstrument(v1.instrument)!;
    expect(inst.versions.map(v => v.source.kind)).toEqual(['legislature', 'legislature']);
    // The relationships approved earlier still cite the constitution version they were approved under.
    for (const r of spec.relationships.filter(x => x.approve)) {
      expect(getRelationship(b.rel[r.key]!)!.history.find(h => h.version === 1)!.basis[0]).toMatchObject({ instrument: b.constitution, eId: 'art_3' });
    }
  });
});

describe('portability tests: no country-specific code', () => {
  it('builds every profile with the same functions; the platform code names none of the illustrative countries', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(__dirname, '..');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) { if (!['geo', 'i18n'].includes(n)) walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(n) || /\.test\.tsx?$/.test(n)) continue;
        // Only the authorization and constitutional mechanism is checked: these files decide powers.
        if (!/(auth\/roles|data\/store\/(institutions|relationships)|nation\/office-register|legislature\/register|law\/register)\.ts$/.test(p)) continue;
        if (/United States|United Kingdom|Emirates|\bUSA\b|\bGBR\b|\bARE\b/.test(readFileSync(p, 'utf8'))) hits.push(p);
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
