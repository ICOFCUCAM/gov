// The form contract (plan step I1): the same rules and messages in the
// browser and on the server, old procedures unchanged, personal classes out
// of lists and events, one definition in three channels, the assisted
// channel audited, accessibility basics, and the nation's day counts.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { setSovereign, listMinistries, listAudit } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { installReferenceProcedures, REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { draftPackage, approvePackage, getPackage, resetPackages, withSampleDeadlines, unsetDays } from '@/lib/casework/packages';
import { registeredEffects, resetCases, submitForm, getCase, type Actor } from '@/lib/casework/engine';
import { listView } from '@/lib/casework/view';
import { checkAnswers, fieldClass, isPersonalField, optionsOf, type ContractField } from './contract';
import { formView } from './server';
import { receiptOf } from './receipt';
import { resetPublication } from './publication';
import { pagesOf } from '@/components/features/forms/answers';
import { FormRenderer } from '@/components/features/forms/FormRenderer';
import { PrintForm } from '@/components/features/forms/PrintForm';
import type { Case } from '@/lib/casework/types';

const TODAY = new Date().toISOString().slice(0, 10);

describe('field checks', () => {
  it('keeps the messages of procedures written before the contract', () => {
    const old: ContractField[] = [
      { key: 'age', label: 'Age', type: 'number', required: true },
      { key: 'born', label: 'Date of birth', type: 'date' },
      { key: 'name', label: 'Name', type: 'text', required: true, personal: true },
      { key: 'kind', label: 'Kind', type: 'choice', options: ['a', 'b'] },
    ];
    const r = checkAnswers(old, { age: 'x', born: '31/12/2020', kind: 'c' }, { mode: 'partial', today: TODAY });
    expect(r.errors.map(e => e.message)).toEqual(['Age must be a number', 'Date of birth must be a date (YYYY-MM-DD)', 'Kind must be one of a, b']);
    expect(r.errors.find(e => e.field === 'born')).toBeDefined();
    expect(r.errors.find(e => e.field === 'kind')).toBeDefined();
    // The old personal flag reads as the personal class; anything else as administrative.
    expect(fieldClass(old[2]!)).toBe('personal');
    expect(fieldClass(old[0]!)).toBe('administrative');
    expect(checkAnswers(old, { age: 4, name: 'A' }, { mode: 'partial', today: TODAY }).errors).toEqual([]);
  });

  it('runs the registered rules, failing closed on one it does not know', () => {
    const f: ContractField[] = [
      { key: 'weekly_hours', label: 'Weekly hours', type: 'number', rules: [{ rule: 'registered', name: 'NONNEGATIVE' }] },
      { key: 'maker_id', label: 'Maker', type: 'text' },
      { key: 'approver_id', label: 'Approver', type: 'text', rules: [{ rule: 'registered', name: 'APPROVER-DIFFERS-FROM-MAKER' }] },
    ];
    const r = checkAnswers(f, { weekly_hours: -1, maker_id: 'u1', approver_id: 'U1 ' }, { mode: 'partial', today: TODAY });
    expect(r.errors.map(e => e.field).sort()).toEqual(['approver_id', 'weekly_hours']);
    expect(checkAnswers(f, { weekly_hours: 40, maker_id: 'u1', approver_id: 'u2' }, { mode: 'partial', today: TODAY }).errors).toEqual([]);
  });
});

describe('a form in its procedure', () => {
  let CIVIL = '';
  const official = (id: string): Actor => ({ id, name: `Registrar ${id}`, scope: { id, role: 'officer', institution: CIVIL } });
  const valid = {
    childGiven: 'Amara', childFamily: 'Okafor', sex: 'female', birthDate: '2026-09-01', region: 'North', motherGiven: 'Ngozi', motherFamily: 'Okafor',
    birthPlace: { kind: 'described', text: 'District hospital' }, informantName: { kind: 'person', name: 'Ngozi Okafor' }, evidence: ['later'], declaration: { version: '1', confirmed: ['true'] },
  };

  beforeEach(() => {
    for (const r of [resetLaw, resetPackages, resetCases, resetPublication]) r();
    CIVIL = listMinistries()[0]!.id;
    setSovereign({ regions: ['North', 'South'], languages: [], deployment: { authorities: { civilRegistration: CIVIL, lawRegister: CIVIL } } } as never, 'Administrator');
    const v = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' }, dates: { inForce: '2020-06-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Every birth shall be registered by the Registrar.' }] }, 'Legal officer A', 'la');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'Legal officer B', 'lb');
    installReferenceProcedures('Administrator');
    setNationDays();
    const d = draftPackage({ ...asNationSets(REFERENCE_BIRTH), version: 2, reference: false, citations: [{ instrument: v.instrument.id, eId: 'sec_12', version: v.version.id, digest: v.version.digest, on: '2026-01-01' }] }, 'Registrar general', 'rg', registeredEffects());
    if ('error' in d) throw new Error(d.error);
    const a = approvePackage('civil.birth', 2, 'Deputy', 'drg', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    if ('error' in a) throw new Error(a.error);
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('refuses on the server with the same message the browser shows', async () => {
    const view = formView(getPackage('civil.birth', 2)!);
    const bad = { ...valid, birthDate: '2999-01-01', childGiven: '' };
    const client = checkAnswers(getPackage('civil.birth', 2)!.fields, bad, { mode: 'submit', today: TODAY, options: optionsOf(view) });
    const server = await submitForm({ procedure: 'civil.birth', channel: 'assisted', assisted: { identityEvidence: view.form?.identityEvidence?.[0]?.key ?? 'national-id' }, fields: bad, declaration: { version: '1' } }, official('o1'));
    expect('error' in server).toBe(true);
    const sm = new Map(('fieldErrors' in server ? server.fieldErrors ?? [] : []).map(e => [e.field, e.message]));
    expect(client.errors.length).toBeGreaterThan(0);
    for (const e of client.errors) if (sm.has(e.field)) expect(sm.get(e.field)).toBe(e.message);
    expect(client.errors.some(e => sm.get(e.field) === e.message)).toBe(true);
  });

  it('records an assisted application: who assisted, the identity evidence seen, in the audit chain', async () => {
    const view = formView(getPackage('civil.birth', 2)!);
    const evidence = view.form?.identityEvidence?.[0]?.key ?? 'national-id';
    const without = await submitForm({ procedure: 'civil.birth', channel: 'assisted', fields: valid, declaration: { version: '1' } }, official('o1'));
    expect(without).toMatchObject({ error: expect.stringMatching(/identity/i) });
    const c = await submitForm({ procedure: 'civil.birth', channel: 'assisted', assisted: { identityEvidence: evidence, servicePoint: 'North office' }, fields: valid, declaration: { version: '1' } }, official('o1'));
    if ('error' in c) throw new Error(c.error);
    expect(getCase(c.id)!.intake).toMatchObject({ channel: 'assisted', assisted: { by: { id: 'o1' }, identityEvidence: expect.any(String), servicePoint: 'North office' } });
    const entry = listAudit().find(e => e.action === 'case.open.assisted' && e.resource === `Case:${c.ref}`);
    expect(entry?.detail).toMatch(/assisted by Registrar o1 at North office · identity evidence seen/);
    expect(receiptOf(getCase(c.id)!)).toMatchObject({ ref: c.ref, channel: 'assisted' });
  });

  it('keeps personal classes out of lists and events', async () => {
    const view = formView(getPackage('civil.birth', 2)!);
    const c = await submitForm({ procedure: 'civil.birth', channel: 'assisted', assisted: { identityEvidence: view.form?.identityEvidence?.[0]?.key ?? 'national-id' }, fields: valid, declaration: { version: '1' } }, official('o1'));
    if ('error' in c) throw new Error(c.error);
    const personal = getPackage('civil.birth', 2)!.fields.filter(isPersonalField).map(f => f.key);
    expect(personal).toEqual(expect.arrayContaining(['childGiven', 'motherFamily']));
    const listed = listView(getCase(c.id)! as Case);
    for (const k of personal) expect(listed.fields).not.toHaveProperty(k);
    const opened = listAudit().filter(e => e.resource === `Case:${c.ref}`).map(e => e.detail ?? '').join(' ');
    for (const v of ['Amara', 'Ngozi', 'Okafor']) expect(opened).not.toContain(v);
  });

  it('renders one definition in three channels with the same questions, labelled for assistive technology', () => {
    const view = formView(getPackage('civil.birth', 2)!);
    const applicant = view.fields.filter(f => (f.audience ?? 'applicant') === 'applicant').map(f => f.key);
    const selfService = pagesOf(view.fields.filter(f => (f.audience ?? 'applicant') === 'applicant')).flatMap(p => p.fields.map(f => f.key));
    expect(selfService.sort()).toEqual([...applicant].sort());
    const assisted = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel: 'assisted', preview: true }));
    const paper = renderToStaticMarkup(React.createElement(PrintForm, { view }));
    for (const k of applicant) {
      expect(assisted, `assisted ${k}`).toContain(`field-${k}`);
      expect(paper, `paper ${k}`).toContain(`id="field-${k}"`);
    }
    // Every input has its label; hints are described; no positive tab order.
    const ids = [...assisted.matchAll(/<input[^>]*\sid="([^"]+)"/g)].map(m => m[1]!);
    expect(ids.length).toBeGreaterThan(3);
    for (const id of ids) expect(assisted.includes(`for="${id}"`) || new RegExp(`<label[^>]*>(?:(?!</label>).)*id="${id}"`, 's').test(assisted), id).toBe(true);
    expect(assisted).not.toMatch(/tabindex="[1-9]/);
    expect(assisted).toContain('aria-describedby');
  });

  it('ships day counts unset: a version is approved only with the nation\'s own, never demonstration ones in production', () => {
    expect(unsetDays(REFERENCE_BIRTH).length).toBeGreaterThan(0);
    const d = draftPackage({ ...REFERENCE_BIRTH, version: 3, reference: false }, 'Registrar general', 'rg', registeredEffects());
    if ('error' in d) throw new Error(d.error);
    expect(approvePackage('civil.birth', 3, 'Deputy', 'drg', undefined, registeredEffects())).toMatchObject({ error: expect.stringMatching(/Set the days/) });
    const sample = withSampleDeadlines(REFERENCE_BIRTH);
    expect(sample.sampleDeadlines).toBe(true);
    expect(unsetDays(sample)).toEqual([]);
    vi.stubEnv('CIVICOS_MODE', 'production');
    const s = draftPackage({ ...sample, version: 4, reference: false } as never, 'Registrar general', 'rg', registeredEffects());
    if ('error' in s) throw new Error(s.error);
    expect(approvePackage('civil.birth', 4, 'Deputy', 'drg', undefined, registeredEffects())).toMatchObject({ error: expect.stringMatching(/sample day counts/) });
  });
});
