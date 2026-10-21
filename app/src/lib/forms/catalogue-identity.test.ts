// A form's identity is its catalogue, form ID and version (owner's direction
// of 21 October 2026, docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md
// §1 and §5). The acceptance criterion, for HLT-MED-004 and every other ID
// the catalogue uses for two different forms: both entries coexist, an
// excluded entry stays blocked, the other is evaluated on its own, and neither
// can be substituted for the other through a bare ID, the API, an approval
// record or a procedure draft.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { installReferenceProcedures, REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { draftPackage, getPackage, resetPackages, editDraft } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import { GET } from '@/app/api/case-packages/route';
import { scopeOf, EXCLUDED_FIELD_WORDS } from './scope';
import { catalogueEntries, catalogueIdOf, DUPLICATE_IDS, formIdentity, parseFormIdentity, ambiguityRefusal } from './identity';
import { CATALOGUE_CONTRACTS, catalogueContract } from './library/catalogue-contracts';
import { resolveLibraryForm, findLibraryForm, libraryPublicationOf } from './page-data';
import { publicationOf, recordApproval, resetPublication, publicationIdentity, contractDigest } from './publication';

const ROOT = join(process.cwd(), '..');
const FIELD_SERIES = 'docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md';
const SUPPLEMENT = 'docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md';
const ALLOWED = 'FIELD-SERIES-PARTS-05-07:HLT-MED-004@1';
const EXCLUDED = 'SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13:HLT-MED-004';

/** The fourteen IDs the verified gap report lists as the same ID for different forms. */
const DUPLICATES = ['EDU-ACC-008', 'EDU-RES-005', 'ENV-PER-004', 'HLT-FAC-006', 'HLT-MED-004', 'JUS-COR-008', 'JUS-PRO-006', 'LND-REG-003', 'SEC-INT-006', 'TRN-AVI-007', 'TRN-INF-008', 'TRN-MAR-006', 'TRN-OPS-005', 'TRN-ROAD-003'];

interface Row { id: string; source: string; category: string; catalogue_id?: string; form_status?: string; scope?: string; contract?: string }
const ROWS = (JSON.parse(readFileSync(join(ROOT, 'docs', 'requirements', 'requirements.json'), 'utf8')) as Row[]).filter(r => r.category === 'form' && r.catalogue_id);
const SCOPE = (JSON.parse(readFileSync(join(ROOT, 'docs', 'requirements', 'form-scope.json'), 'utf8')) as { forms: { source: string; id: string; scope: string }[] }).forms;
/** The approved scope of one catalogue entry, as the register keeps it. */
const scopeFor = (source: string, id: string) => {
  const s = SCOPE.find(e => e.source === source && e.id === id)?.scope;
  return s === 'excluded' ? 'excluded' : s === 'requires_legal_review' ? 'legal_review' : 'allowed';
};

const req = (q: string) => new NextRequest(`http://localhost/api/case-packages?${q}`);
const flat = (fs: { key: string; label?: string; type?: string; items?: unknown }[]): { key: string; label?: string; type?: string }[] => fs.flatMap(x => [x, ...(Array.isArray(x.items) ? flat(x.items as { key: string }[]) : [])]);

let CIVIL = '';
let citation = { instrument: '', eId: 'sec_12', version: '', digest: '', on: '2026-01-01' };
function setup() {
  for (const r of [resetLaw, resetPackages, resetPublication]) r();
  CIVIL = listMinistries()[0]!.id;
  setSovereign({ languages: [], deployment: { authorities: { civilRegistration: CIVIL, lawRegister: CIVIL } } } as never, 'Administrator');
  const v = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' }, dates: { inForce: '2020-06-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Every birth shall be registered by the Registrar.' }] }, 'Legal officer A', 'la');
  if ('error' in v) throw new Error(v.error);
  confirmVersion(v.instrument.id, v.version.id, 'Legal officer B', 'lb');
  citation = { ...citation, instrument: v.instrument.id, version: v.version.id, digest: v.version.digest };
  installReferenceProcedures('Administrator');
  setNationDays();
}
/** A procedure draft whose form claims a catalogue form (the birth reference's fields, so only the identity differs). */
const draftClaiming = (form: { catalogueIds?: string[]; catalogueSource?: string }, fields = REFERENCE_BIRTH.fields) =>
  draftPackage({ ...asNationSets(REFERENCE_BIRTH), version: 2, reference: false, citations: [citation], fields, form: { ...REFERENCE_BIRTH.form!, ...form, spec: { id: form.catalogueIds?.[0] ?? 'x', version: '1' } } } as never, 'Official rg', 'rg', registeredEffects());
const signer = (id: string) => ({ id, name: `Official ${id}`, scope: { id, role: 'signatory' as const, institution: CIVIL } });

describe('form identity: catalogue + form ID + version', () => {
  it('writes and reads one format, and every library contract carries its identity as its key', () => {
    expect(formIdentity({ source: FIELD_SERIES, formId: 'HLT-MED-004', version: 1 })).toBe(ALLOWED);
    expect(parseFormIdentity(ALLOWED)).toEqual({ catalogue: 'FIELD-SERIES-PARTS-05-07', formId: 'HLT-MED-004', version: '1' });
    expect(parseFormIdentity(EXCLUDED)).toEqual({ catalogue: 'SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13', formId: 'HLT-MED-004' });
    expect(parseFormIdentity('HLT-MED-004')).toBeNull();
    for (const f of CATALOGUE_CONTRACTS) {
      expect(f.identity, f.specId).toBe(formIdentity({ source: f.catalogue.source, formId: f.specId, version: f.json.form_version }));
      expect(f.key).toBe(f.identity);
      expect(findLibraryForm(f.identity)?.def.key).toBe(f.key);
    }
    expect(new Set(CATALOGUE_CONTRACTS.map(f => f.identity)).size).toBe(CATALOGUE_CONTRACTS.length);
  });

  it('matches every library contract to exactly one register row by its identity (the register keeps the same identity)', () => {
    for (const f of CATALOGUE_CONTRACTS) {
      const rows = ROWS.filter(r => r.source === f.catalogue.source && (r as Row & { form_identity?: string }).form_identity === f.identity);
      expect(rows.length, f.identity).toBe(1);
      expect((rows[0] as Row & { form_identity?: string }).form_identity, f.identity).toBe(f.identity);
    }
  });

  it('knows the fourteen IDs the gap report lists, each in two different catalogues', () => {
    expect(Object.keys(DUPLICATE_IDS).sort()).toEqual([...DUPLICATES].sort());
  });
});

describe.each(DUPLICATES)('%s: two catalogue entries, never substituted for each other', id => {
  beforeEach(setup);
  const entries = () => catalogueEntries(id);

  it('both entries coexist, in the catalogue and in the register', () => {
    const e = entries();
    expect(e).toHaveLength(2);
    expect(new Set(e.map(x => x.catalogue)).size).toBe(2);
    expect(new Set(e.map(x => x.identity)).size).toBe(2);
    for (const x of e) expect(ROWS.filter(r => r.source === x.source && r.catalogue_id === id), x.identity).toHaveLength(1);
  });

  it('each is evaluated for scope on its own catalogue entry; the bare ID never makes a form eligible', () => {
    for (const x of entries()) expect(scopeOf([id], [], x.source).status, x.identity).toBe(scopeFor(x.source, id));
    // A bare ID is read against every entry: it is never more permissive than the strictest.
    const strict = entries().map(x => scopeFor(x.source, id));
    const bare = scopeOf([id], []).status;
    if (strict.includes('excluded')) expect(bare).toBe('excluded');
    else if (strict.includes('legal_review')) expect(bare).toBe('legal_review');
  });

  it('a bare ID is refused with both candidates, never resolved to one: in the library, the page and the API', async () => {
    for (const ref of [id, `library.${id}`, id.toLowerCase()]) {
      const r = resolveLibraryForm(ref);
      expect(r && 'ambiguous' in r, ref).toBe(true);
      if (r && 'ambiguous' in r) {
        expect(r.ambiguous.candidates.map(c => c.identity.split('@')[0]).sort()).toEqual(entries().map(e => e.identity).sort());
        expect(r.ambiguous.error).toMatch(/A bare form ID identifies no form/);
      }
      expect(findLibraryForm(ref)).toBeUndefined();
    }
    for (const q of [`form=${encodeURIComponent(id)}`, `publication=${encodeURIComponent(id)}&version=1`]) {
      const res = GET(req(q));
      expect(res.status, q).toBe(409);
      const j = await res.json() as { error: string; candidates: { identity: string }[] };
      expect(j.candidates).toHaveLength(2);
      expect(j.error).toContain(id);
    }
    const c = catalogueContract(id);
    if (c && 'error' in c) expect(c.candidates).toHaveLength(2);
    else expect(c).toBeUndefined();
  });

  it('each identity resolves to its own entry, never to the other', async () => {
    for (const x of entries()) {
      const r = resolveLibraryForm(x.identity);
      expect(r, x.identity).not.toBeNull();
      const got = r && 'found' in r ? parseFormIdentity(r.found.identity)!.catalogue : r && 'entry' in r ? r.entry.catalogue : null;
      expect(got, x.identity).toBe(x.catalogue);
      const res = GET(req(`form=${encodeURIComponent(x.identity)}`));
      expect(res.status).toBe(200);
      const j = await res.json() as { library?: { identity: string }; entry?: { identity: string } };
      expect((j.library?.identity ?? j.entry?.identity ?? '').startsWith(`${x.catalogue}:`)).toBe(true);
    }
  });

  it('a procedure draft names its catalogue: without it the ID is refused, and an excluded entry is never drafted', () => {
    const bare = draftClaiming({ catalogueIds: [id] });
    expect(bare).toHaveProperty('error');
    expect((bare as { error: string }).error).toMatch(/Outside the approved scope|names 2 different catalogue forms/);
    for (const x of entries()) {
      resetPackages(); installReferenceProcedures('Administrator');
      const r = draftClaiming({ catalogueIds: [id], catalogueSource: x.source });
      if (scopeFor(x.source, id) === 'excluded') expect(r, x.identity).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
      else {
        expect(r, x.identity).not.toHaveProperty('error');
        // It is published under its own identity; the other entry's identity is never its own.
        const p = getPackage('civil.birth', 2)!;
        expect(publicationIdentity(p)).toBe(`${x.catalogue}:${id}@1`);
        if (scopeFor(x.source, id) === 'legal_review') expect(publicationOf(p).human.find(g => g.id === 'scope-review')).toMatchObject({ applies: true, passed: false });
      }
    }
    // A catalogue that does not list the ID is refused.
    resetPackages(); installReferenceProcedures('Administrator');
    expect(draftClaiming({ catalogueIds: [id], catalogueSource: 'docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md' })).toMatchObject({ error: expect.stringMatching(/does not list it|Outside the approved scope/) });
  });
});

describe('HLT-MED-004: the excluded dispensing record and the allowed information request', () => {
  beforeEach(setup);

  it('keeps the excluded entry blocked: no contract, never drafted, nothing to publish', async () => {
    const r = resolveLibraryForm(EXCLUDED);
    expect(r && 'entry' in r).toBe(true);
    if (r && 'entry' in r) expect(r.entry).toMatchObject({ scope: 'excluded', title: 'Medicine authorization or dispensing record', source: SUPPLEMENT });
    // No contract for it anywhere in the library (the files name their catalogue source).
    const dir = join(process.cwd(), 'src', 'lib', 'forms', 'library', 'catalogue-contracts');
    for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { catalogue: { source: string; id: string } };
      expect(c.catalogue.source === SUPPLEMENT && c.catalogue.id === 'HLT-MED-004', f).toBe(false);
    }
    expect(CATALOGUE_CONTRACTS.filter(f => f.specId === 'HLT-MED-004').map(f => f.identity)).toEqual([ALLOWED]);
    const page = await GET(req(`form=${encodeURIComponent(EXCLUDED)}`)).json() as { entry: { draftable: boolean; contract: boolean; note: string } };
    expect(page.entry).toMatchObject({ draftable: false, contract: false });
    expect(page.entry.note).toMatch(/Excluded by the approved scope/);
    const pub = GET(req(`publication=${encodeURIComponent(EXCLUDED)}&version=1`));
    expect(pub.status).toBe(404);
    expect(((await pub.json()) as { error: string }).error).toMatch(/no contract/);
    // It cannot be drafted for publication, whatever the draft says about it.
    expect(draftClaiming({ catalogueIds: ['HLT-MED-004'], catalogueSource: SUPPLEMENT })).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
    expect(draftClaiming({ catalogueIds: ['HLT-MED-004'] })).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
    // The register keeps it excluded.
    expect(ROWS.find(r => r.id === 'HLT-MED-004@P6')).toMatchObject({ form_status: 'excluded', scope: 'excluded', source: SUPPLEMENT });
  });

  it('evaluates the allowed entry on its own: allowed, a contract draft, its procedure missing', () => {
    const r = resolveLibraryForm(ALLOWED);
    expect(r && 'found' in r).toBe(true);
    const found = (r as { found: Parameters<typeof libraryPublicationOf>[0] }).found;
    const pub = libraryPublicationOf(found);
    expect(pub.scope.status).toBe('allowed');
    expect(pub.status).toBe('contract_draft');
    expect(pub.identity).toBe(ALLOWED);
    expect(pub.procedure).toMatchObject({ state: 'missing', required: true });
    expect(pub.automatic.find(g => g.id === 'procedure-link')).toMatchObject({ passed: false, detail: [expect.stringMatching(/^procedure: missing/)] });
    expect(ROWS.find(r => r.id === 'HLT-MED-004')).toMatchObject({ form_status: 'contract_draft', source: FIELD_SERIES });
  });

  it('carries no patient-specific or dispensing field: the scope words and an explicit list', () => {
    const f = CATALOGUE_CONTRACTS.find(x => x.identity === ALLOWED)!;
    const fields = flat(f.fields);
    expect(scopeOf([f.specId], f.fields, f.catalogue.source).status).toBe('allowed');
    // The scope's own words find nothing in its keys.
    for (const x of fields) for (const w of Object.keys(EXCLUDED_FIELD_WORDS)) expect(` ${x.key.replace(/[^a-z0-9]+/gi, ' ').toLowerCase()} `, x.key).not.toContain(` ${w} `);
    // An explicit list of what a dispensing or patient record would carry: none in a key or a label.
    const FORBIDDEN = /patient|dispens|prescri|clinical|diagnos|treatment|medical.?history|date.?of.?birth|birth.?date|national.?id|health.?id|dose|administered|pharmacist|recipient|care.?plan|encounter|condition|allerg/i;
    for (const x of fields) {
      expect(x.key, x.key).not.toMatch(FORBIDDEN);
      expect(x.label ?? '', x.key).not.toMatch(FORBIDDEN);
    }
    // No question about a person at all: it is about an application and its dossier.
    expect(fields.filter(x => ['person', 'party'].includes(x.type ?? '')).map(x => x.key)).toEqual([]);
    expect(f.deviations.map(d => d.id)).toContain('stage-b-id');
  });

  it('cannot be substituted through a procedure draft or an edit into the excluded entry', () => {
    // A draft carrying the allowed entry passes; the same draft re-pointed at the supplement's entry, or given a dispensing field, does not.
    expect(draftClaiming({ catalogueIds: ['HLT-MED-004'], catalogueSource: FIELD_SERIES })).not.toHaveProperty('error');
    const p = getPackage('civil.birth', 2)!;
    expect(editDraft('civil.birth', 2, { form: { ...p.form!, catalogueSource: SUPPLEMENT } }, 'Official ed', 'ed', registeredEffects())).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
    expect(editDraft('civil.birth', 2, { form: { ...p.form!, catalogueSource: undefined } }, 'Official ed', 'ed', registeredEffects())).toMatchObject({ error: expect.stringMatching(/Outside the approved scope|names 2 different/) });
    expect(editDraft('civil.birth', 2, { fields: [...p.fields, { key: 'dispensingRecord', label: 'Dispensing record', type: 'text' }] as never }, 'Official ed', 'ed', registeredEffects())).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
    expect(getPackage('civil.birth', 2)!.form!.catalogueSource).toBe(FIELD_SERIES);
  });

  it('cannot be substituted through an approval record: an act counts only for the identity it was given on', () => {
    expect(draftClaiming({ catalogueIds: ['HLT-MED-004'], catalogueSource: FIELD_SERIES })).not.toHaveProperty('error');
    const p = getPackage('civil.birth', 2)!;
    expect(recordApproval('civil.birth', 2, { kind: 'privacy', note: 'Reviewed' }, signer('pv'))).not.toHaveProperty('error');
    const privacy = () => publicationOf(getPackage('civil.birth', 2)!).human.find(g => g.id === 'privacy')!;
    expect(privacy().passed).toBe(true);
    const store = (globalThis as unknown as { __civicosFormPublication: { acts: { form: string; kind: string; digest: string }[] } }).__civicosFormPublication;
    expect(store.acts.at(-1)).toMatchObject({ form: ALLOWED.replace('@1', '@1'), digest: contractDigest(p) });
    // The same act under the excluded entry's identity (same procedure, same contract hash) is not this form's approval.
    store.acts.at(-1)!.form = EXCLUDED;
    expect(privacy().passed).toBe(false);
    // An act recorded before identities were kept takes the identity of the version it was given on.
    delete (store.acts.at(-1) as { form?: string }).form;
    expect(privacy().passed).toBe(true);
    expect(store.acts.at(-1)!.form).toBe(ALLOWED);
  });

  it('names the candidates in a refusal and shows the allowed one in the library listing with its identity', async () => {
    expect(ambiguityRefusal('HLT-MED-004')).toMatch(new RegExp(`${EXCLUDED}.*excluded by the approved scope`));
    const lib = await GET(req('library=1')).json() as { forms: { identity: string; specId: string; scope: { status: string } }[]; duplicates: { id: string; candidates: { identity: string }[] }[] };
    expect(lib.forms.filter(f => f.specId === 'HLT-MED-004').map(f => f.identity)).toEqual([ALLOWED]);
    expect(lib.duplicates.find(d => d.id === 'HLT-MED-004')!.candidates.map(c => c.identity).sort()).toEqual([EXCLUDED, ALLOWED.replace('@1', '')].sort());
    expect(catalogueIdOf(SUPPLEMENT)).toBe('SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13');
  });
});
