import { describe, it, expect, beforeEach } from 'vitest';
import { resetDirectives, draftDirective, signDirective, rescindDirective, listDirectives, settleDirectives, directive } from './directives';
import { listAudit } from '@/lib/data/store';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('directives kept by the platform', () => {
  beforeEach(() => resetDirectives());

  it('drafts, signs and withdraws, each under a named official in the audit chain', () => {
    const d = ok(draftDirective({ ref: 'DIR-1', kind: 'budget', title: 'Release of fiscal reserves', by: 'Cabinet Secretary, Treasury' }));
    expect(d).toMatchObject({ status: 'drafting', issued_by_name: 'Cabinet Secretary, Treasury', issued_by_charter_id: 'platform' });
    const s = ok(signDirective('DIR-1', 'President'));
    expect(s).toMatchObject({ status: 'effective', signed_by_id: 'President' });
    expect(signDirective('DIR-1', 'President')).toEqual({ error: expect.stringMatching(/Only a draft/) });
    expect(ok(rescindDirective('DIR-1', 'President')).status).toBe('rescinded');
    const actions = listAudit().filter(e => e.resource === 'Directive:DIR-1').map(e => e.action);
    expect(actions).toEqual(expect.arrayContaining(['directive.draft', 'directive.sign', 'directive.rescind']));
  });

  it('takes effect at a later time when one is given', () => {
    ok(draftDirective({ ref: 'DIR-2', title: 'Expenditure freeze', by: 'A' }));
    const later = new Date(Date.now() + 3_600_000).toISOString();
    expect(ok(signDirective('DIR-2', 'B', later)).status).toBe('signed');
    settleDirectives(new Date(Date.now() + 7_200_000));
    expect(directive('DIR-2')?.status).toBe('effective');
  });

  it('refuses unnamed officials, duplicates and empty titles; lists newest first', () => {
    expect(draftDirective({ ref: 'X-1', title: 't' })).toEqual({ error: expect.stringMatching(/Name the official/) });
    ok(draftDirective({ ref: 'X-1', title: 'First', by: 'A' }));
    expect(draftDirective({ ref: 'X-1', title: 'Again', by: 'A' })).toEqual({ error: expect.stringMatching(/already exists/) });
    expect(draftDirective({ ref: 'X-2', title: ' ', by: 'A' })).toEqual({ error: expect.stringMatching(/title/) });
    expect(draftDirective({ ref: 'bad ref!', title: 't', by: 'A' })).toEqual({ error: expect.stringMatching(/reference/) });
    expect(listDirectives({ status: 'drafting' }).map(d => d.ref)).toEqual(['X-1']);
  });
});

describe('legal basis', () => {
  it('cites the provisions a directive rests on, as in force on the day, and refuses unknown ones', async () => {
    const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
    resetLaw();
    const r = recordVersion({ instrument: { title: 'Public Service Act', type: 'act', jurisdiction: 'X', year: 2001, number: '3', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_4', num: '4', text: 'The minister may issue instructions.' }] }, 'A', 'a');
    if ('error' in r) throw new Error(r.error);
    confirmVersion(r.instrument.id, r.version.id, 'B', 'b');
    const d = draftDirective({ ref: 'DIR-LB-1', title: 'Instruction', by: 'Officer', legalBasis: [{ instrument: r.instrument.id, eId: 'sec_4' }] });
    expect(d).toMatchObject({ payload: { legalBasis: [{ instrument: r.instrument.id, eId: 'sec_4', version: r.version.id, digest: r.version.digest, num: '4' }] } });
    expect(draftDirective({ ref: 'DIR-LB-2', title: 'Instruction', by: 'Officer', legalBasis: [{ instrument: r.instrument.id, eId: 'sec_9' }] })).toHaveProperty('error');
  });
});
