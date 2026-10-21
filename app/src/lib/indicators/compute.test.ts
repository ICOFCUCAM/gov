// Indicator values computed from records (plan step I3): counts, durations and
// completion from the case engine and the registers, never typed; each value
// with its kind, method version, period and coverage; a national figure only
// when every region reports; small cells held back; sample records never
// counted in production; a definition with no source is "Not connected",
// never zero.
import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, act, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { samplePackage } from '@/lib/casework/testkit';
import { registerEvent, resetCivil } from '@/lib/civil/register';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetDecisions } from '@/lib/records/decisions';
import { getDefinition, resetIndicators } from './register';
import { computeValue, governmentValue, institutionValues, monthPeriod, monthsBack, seriesOf } from './compute';
import { contractOf } from './contract';
import { indicatorSmallCells, resetIndicatorSmallCells } from './disclosure';

let INST = '';
const official = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: INST } });
const SEPT = { month: '2026-09', now: new Date('2026-10-21T12:00:00Z') };

function procedure() {
  const d = draftPackage(samplePackage({
    owner: 'businessRegister', documents: [],
    actions: [
      { key: 'grant', label: 'Grant', from: ['submitted'], to: 'granted', decision: 'grant', needs: { role: 'signatory' }, requires: { reasons: true } },
      { key: 'refuse', label: 'Refuse', from: ['submitted'], to: 'refused', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    deadlines: [], tests: [{ name: 'grant', steps: [{ action: 'grant', expect: 'granted' }] }],
  }), 'Author', 'author', registeredEffects());
  if ('error' in d) throw new Error(d.error);
  const a = approvePackage(d.key, d.version, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
  if ('error' in a) throw new Error(a.error);
}
const open = (name: string, at: string, sample = false) => {
  const c = openCase({ procedure: 'test.licence', fields: { name }, ...(sample ? { source: 'sample' as const } : {}) }, official('clerk'), new Date(at));
  if ('error' in c) throw new Error(c.error);
  return c;
};

describe('indicator values from records', () => {
  beforeEach(() => {
    resetCases(); resetPackages(); resetIndicators(); resetCivil(); resetLaw(); resetDecisions(); resetIndicatorSmallCells();
    INST = listMinistries()[0]!.id;
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { businessRegister: INST, civilRegistration: INST } } }, 'test');
  });

  it('months are periods with an exclusive end', () => {
    expect(monthPeriod('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01', month: '2026-12' });
    expect(monthsBack(3, '2026-02')).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('is Not connected, never zero, while no approved procedure keeps the institution\'s cases', () => {
    const v = computeValue(getDefinition('casework.cases_opened')!, { ...SEPT, institution: INST, samples: false });
    expect(v).toMatchObject({ value: null, kind: 'unavailable', status: 'draft', coverage: { completeness: 'none' } });
    expect(v.reason).toMatch(/no approved procedure/);
    expect(contractOf(getDefinition('casework.cases_opened')!, v)).toMatchObject({ provenance: 'not_connected', value: null, classification: 'draft_definition' });
  });

  it('counts, times and shares cases from the case engine, with method version, period, coverage and lineage', async () => {
    procedure();
    const a = open('A', '2026-09-02T09:00:00Z'), b = open('B', '2026-09-05T09:00:00Z');
    open('C', '2026-09-20T09:00:00Z');
    open('Old', '2026-08-30T09:00:00Z');
    expect(await act(a.id, { action: 'grant', reason: 'Meets the conditions' }, official('s', 'signatory'), new Date('2026-09-06T09:00:00Z'))).not.toHaveProperty('error');
    expect(await act(b.id, { action: 'refuse', reason: 'Does not' }, official('s', 'signatory'), new Date('2026-09-15T09:00:00Z'))).not.toHaveProperty('error');
    const o = (id: string) => computeValue(getDefinition(id)!, { ...SEPT, institution: INST, samples: false });
    expect(o('casework.cases_opened')).toMatchObject({ value: 3, kind: 'record', unit: '{cases}', period: { start: '2026-09-01', end: '2026-10-01' }, source: { method: 'cases.opened@1', registerId: 'case-work' }, coverage: { expected: 1, reporting: 1, completeness: 'complete' }, records: { count: 3, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    expect(o('casework.cases_decided').value).toBe(2);
    expect(o('casework.backlog').value).toBe(2);
    // a at 4 days, b at 10: median 7
    expect(o('casework.days_to_decision')).toMatchObject({ value: 7, unit: 'd' });
    expect(o('casework.decided_on_time')).toMatchObject({ value: 100, numerator: 2, denominator: 2, unit: '%' });
    // by procedure
    expect(o('casework.cases_opened').groups).toEqual([expect.objectContaining({ key: 'test.licence', value: 3 })]);
    // a series of the last months
    const s = seriesOf('casework.cases_opened', 3, { ...SEPT, institution: INST, samples: false });
    expect(s.map(x => [x.period.start, x.value])).toEqual([['2026-07-01', 0], ['2026-08-01', 1], ['2026-09-01', 3]]);
    // the whole government: counted at the one institution that runs a procedure
    expect(governmentValue(getDefinition('casework.cases_opened')!, { ...SEPT, samples: false })).toMatchObject({ value: 3, institutions: 1 });
    expect(institutionValues(INST, { ...SEPT, samples: false }).length).toBeGreaterThan(5);
  });

  it('cites the law: the share of decisions citing a law version', async () => {
    procedure();
    const law = recordVersion({ instrument: { title: 'Licensing Act', type: 'act', jurisdiction: 'xx', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'Licences.' }], source: { kind: 'sample' } }, 'Recorder', 'rec') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'Confirmer', 'conf');
    const a = open('A', '2026-09-02T09:00:00Z'), b = open('B', '2026-09-03T09:00:00Z');
    await act(a.id, { action: 'grant', reason: 'ok', citations: [{ instrument: law.instrument.id, eId: 'sec_1' }] }, official('s', 'signatory'), new Date('2026-09-04T09:00:00Z'));
    await act(b.id, { action: 'grant', reason: 'ok' }, official('s', 'signatory'), new Date('2026-09-04T09:00:00Z'));
    expect(computeValue(getDefinition('casework.decisions_citing_law')!, { ...SEPT, institution: INST, samples: false })).toMatchObject({ value: 50, numerator: 1, denominator: 2 });
  });

  it('never counts sample records in production; in demo and training they mark the value Sample', () => {
    procedure();
    open('Real', '2026-09-02T09:00:00Z');
    open('Sample', '2026-09-03T09:00:00Z', true);
    const def = getDefinition('casework.cases_opened')!;
    expect(computeValue(def, { ...SEPT, institution: INST, samples: false })).toMatchObject({ value: 1, kind: 'record' });
    expect(computeValue(def, { ...SEPT, institution: INST, samples: true })).toMatchObject({ value: 2, kind: 'sample' });
    expect(contractOf(def, computeValue(def, { ...SEPT, institution: INST, samples: true }))).toMatchObject({ provenance: 'sample' });
  });

  it('shows a national figure only when every region reports, and holds small cells back', () => {
    const def = getDefinition('civil.births_registered')!;
    const birth = (region: string, at: string) => registerEvent({ kind: 'birth', date: '2026-08-01', place: { region }, case: `c-${region}-${at}`, child: { given: 'A', family: 'B', sex: 'female' } }, 'Registrar', new Date(at));
    // nothing yet: not connected
    expect(computeValue(def, { ...SEPT, samples: false })).toMatchObject({ kind: 'unavailable', value: null });
    birth('North', '2026-09-03T10:00:00Z'); birth('North', '2026-09-04T10:00:00Z');
    // no threshold adopted: held back, never shown, never zero
    const held = computeValue(def, { ...SEPT, samples: false });
    expect(held).toMatchObject({ value: null, kind: 'record', disclosure: { suppressed: 'no-threshold' } });
    // the nation adopts a threshold of 2 (two officials, citing the law)
    const law = recordVersion({ instrument: { title: 'Statistics Act', type: 'act', jurisdiction: 'xx', year: 2020, number: '2', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'Disclosure control.' }], source: { kind: 'sample' } }, 'Recorder', 'rec') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'Confirmer', 'conf');
    expect(indicatorSmallCells.propose(2, [{ instrument: law.instrument.id, eId: 'sec_9' }], 'Admin A', 'admin-a')).not.toHaveProperty('error');
    expect(indicatorSmallCells.confirm('Admin A', 'admin-a')).toHaveProperty('error');
    expect(indicatorSmallCells.confirm('Admin B', 'admin-b')).not.toHaveProperty('error');
    // only North reports: no national figure, North's value shown, South missing (not zero)
    const partial = computeValue(def, { ...SEPT, samples: false });
    expect(partial).toMatchObject({ value: null, coverage: { expected: 2, reporting: 1, completeness: 'partial' }, disclosure: { version: 1 } });
    expect(partial.reason).toMatch(/Only 1 of 2 regions/);
    expect(partial.groups).toEqual([expect.objectContaining({ key: 'North', value: 2 }), expect.objectContaining({ key: 'South', value: null })]);
    birth('South', '2026-09-10T10:00:00Z');
    const full = computeValue(def, { ...SEPT, samples: false });
    // every region reports: the national figure stands; South's single birth is a small cell, so the breakdown is withheld
    expect(full).toMatchObject({ value: 3, coverage: { completeness: 'complete' }, disclosure: { breakdownWithheld: true } });
    expect(full.groups).toBeUndefined();
    expect(contractOf(def, full)).toMatchObject({ indicator_id: 'civil.births_registered', value: 3, provenance: 'observed', quality_status: 'not_assessed', classification: 'draft_definition', coverage: { expected_sources: 2, reporting_sources: 2, completeness: 'complete' } });
  });

  it('hides an institution\'s draft figure from officials outside its reach', () => {
    procedure();
    open('A', '2026-09-02T09:00:00Z');
    const def = getDefinition('casework.cases_opened')!;
    const outsider = { role: 'officer' as const, institution: 'somewhere-else' };
    expect(computeValue(def, { ...SEPT, institution: INST, samples: false, viewer: outsider })).toMatchObject({ value: null, kind: 'unavailable', reason: expect.stringMatching(/Not published/) });
    expect(computeValue(def, { ...SEPT, institution: INST, samples: false, viewer: { role: 'officer', institution: INST } })).toMatchObject({ value: 1 });
  });
});
