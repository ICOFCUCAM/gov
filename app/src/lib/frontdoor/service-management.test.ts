// Service management (plan step I13; forms catalogue Part 13 §2.5, §9): the
// dashboard registry, service-level objectives whose targets are the nation's
// (none ships, a target in force only once a second official approves it),
// performance computed from the records (never generated; Sample where sample
// cases count, Not connected where nothing carries the service), reports
// frozen with their hash and validated by a second official, disruptions,
// changes decided by a second official, and architecture exceptions that
// always expire.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { openCase, act, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { resetDecisions } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
await import('@/lib/casework/modules');
const { proposeService, publishService, resetServiceCatalogue } = await import('./catalogue');
const sm = await import('./service-management');
type Actor = import('@/lib/casework/engine').Actor;

let X = '', Y = '', lawId = '', SVC = '', INFO = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => X): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const cat = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => X) => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } as never });
const today = new Date().toISOString().slice(0, 10);

describe('service management', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDecisions, resetLaw, resetServiceCatalogue, sm.resetServiceManagement]) r();
    [X, Y] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: {} } }, 'Administrator');
    const law = recordVersion({ instrument: { title: 'Service Standards Act', type: 'act', jurisdiction: 'X', year: 2024, number: '2', issuingAuthority: 'Parliament' }, dates: { inForce: '2024-01-01' }, provisions: [{ eId: 'sec_4', num: '4', text: 'Each service publishes its standard of service.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
    const d = draftPackage({ key: 'sm.licence', version: 1, owner: X, title: 'Trading licence', refPrefix: 'SML', citations: [], fields: [], documents: [],
      stages: [{ key: 'open', label: 'Open' }, { key: 'granted', label: 'Granted', terminal: true }], actions: [{ key: 'grant', label: 'Grant', from: ['open'], to: 'granted', decision: 'grant', needs: { role: 'signatory' }, requires: { reasons: true } }],
      deadlines: [], notifications: [], retention: 'licences', sensitivity: 'normal', authority: { permitType: 'trading' }, tests: [{ name: 'g', steps: [{ action: 'grant', expect: 'granted' }] }] }, 'Author', 'author', registeredEffects()) as { key: string };
    approvePackage(d.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    const base = { description: 'Licence to trade', owner: { institution: X }, legalBasis: [{ instrument: lawId, eId: 'sec_4' }], forms: [], eligibility: '', representatives: false, evidence: [], fee: null, channels: ['online'], outcome: '', review: '', languages: [], accessibility: '', privacy: 'normal', contact: '', lifeEvents: [], category: '' };
    const s = proposeService({ terms: { ...base, name: 'Trading licence', procedure: 'sm.licence', declared: 'active' }, reason: 'New' }, cat('o1')) as { id: string };
    publishService(s.id, cat('s1', 'signatory'));
    SVC = s.id;
    const i = proposeService({ terms: { ...base, name: 'Market days', declared: 'informational' }, reason: 'New' }, cat('o1')) as { id: string };
    publishService(i.id, cat('s1', 'signatory'));
    INFO = i.id;
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('computes performance from the records only: Record for real cases, Sample where samples count, Not connected for a service no procedure carries; never in production from samples', async () => {
    const period = { from: '2026-01-01', to: '2030-12-31' };
    const info = sm.servicePerformance(INFO, period) as { figures: Record<string, { kind: string; value: unknown }> };
    expect(Object.values(info.figures).every(f => f.kind === 'unavailable' && f.value === null)).toBe(true);
    // Nothing yet: not a zero presented as a measured fact for the median.
    let p = sm.servicePerformance(SVC, period) as { figures: Record<string, { kind: string; value: unknown }> };
    expect(p.figures.received).toMatchObject({ value: 0, kind: 'record' });
    expect(p.figures.medianDaysToDecision).toMatchObject({ value: null, kind: 'unavailable' });
    const a = openCase({ procedure: 'sm.licence', fields: {} }, off('o1')) as { id: string };
    openCase({ procedure: 'sm.licence', fields: {} }, off('o1'));
    { await act(a.id, { action: 'grant', reason: 'Fine' }, off('s1', 'signatory')); const g = await act(a.id, { action: 'grant' }, off('s2', 'signatory')); if ('error' in g) throw new Error(g.error); }
    p = sm.servicePerformance(SVC, period) as typeof p;
    expect(p.figures).toMatchObject({ received: { value: 2, kind: 'record' }, decided: { value: 1 }, open: { value: 1 }, medianDaysToDecision: { value: 0, kind: 'record', unit: 'd' } });
    openCase({ procedure: 'sm.licence', fields: {}, source: 'sample' }, off('o1'));
    p = sm.servicePerformance(SVC, period) as typeof p;
    expect(p.figures.received).toMatchObject({ value: 3, kind: 'sample' });
    vi.stubEnv('CIVICOS_MODE', 'production');
    p = sm.servicePerformance(SVC, period) as typeof p;
    expect(p.figures.received).toMatchObject({ value: 2, kind: 'record' });
  });

  it('ships no target: an objective says none is set until the nation\'s target, cited, is approved by a different official who can sign there', async () => {
    const o = sm.defineObjective({ service: SVC, measure: 'median-days-to-decision', methodology: 'Days from opening to the sealed decision, cases of the procedure' }, cat('o1')) as { id: string };
    let perf = sm.servicePerformance(SVC, { from: '2026-01-01', to: '2030-12-31' }) as { objectives: { target: number | null; met: boolean | null }[] };
    expect(perf.objectives).toEqual([expect.objectContaining({ target: null, met: null })]);
    expect(sm.proposeTarget(o.id, { value: 10 }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/Cite the law/) });
    sm.proposeTarget(o.id, { value: 10, citations: [{ instrument: lawId, eId: 'sec_4' }] }, cat('o1'));
    expect(sm.approveTarget(o.id, cat('o2'))).toMatchObject({ error: expect.stringMatching(/can sign/) });
    expect(sm.approveTarget(o.id, cat('s1', 'signatory', () => Y))).toMatchObject({ error: expect.stringMatching(/institution that owns the service/) });
    sm.approveTarget(o.id, cat('s1', 'signatory'));
    const a = openCase({ procedure: 'sm.licence', fields: {} }, off('o1')) as { id: string };
    { await act(a.id, { action: 'grant', reason: 'Fine' }, off('s1', 'signatory')); const g = await act(a.id, { action: 'grant' }, off('s2', 'signatory')); if ('error' in g) throw new Error(g.error); }
    perf = sm.servicePerformance(SVC, { from: '2026-01-01', to: '2030-12-31' }) as typeof perf;
    expect(perf.objectives).toEqual([expect.objectContaining({ target: 10, met: true })]);
    // A report freezes the figures with their hash; a different official validates it.
    const r = sm.recordReport({ service: SVC, from: '2026-01-01', to: '2030-12-31' }, cat('o1')) as { id: string; sha256: string };
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(sm.validateReport(r.id, cat('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(sm.validateReport(r.id, cat('s2', 'signatory'))).toMatchObject({ validatedBy: { name: 'Official s2' } });
  });

  it('registers dashboards, disruptions, changes and exceptions with their approvals; an exception always expires', () => {
    expect(sm.proposeDashboard({ institution: X, title: 'Licensing', purpose: 'Weekly review of licensing', sources: ['made-up'], access: 'internal' }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/indicator definition/) });
    const dsh = sm.proposeDashboard({ institution: X, title: 'Licensing', purpose: 'Weekly review of licensing', sources: ['metric:licences.open'], access: 'internal', limitations: 'Cases opened on paper are counted when typed in' }, cat('o1')) as { id: string };
    expect(sm.publishDashboard(dsh.id, cat('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(sm.publishDashboard(dsh.id, cat('s1', 'signatory'))).toMatchObject({ versions: [expect.objectContaining({ state: 'published' })] });
    const dis = sm.reportDisruption({ service: SVC, impact: 'Online applications cannot be sent', channels: ['online'] }, cat('o1')) as { id: string };
    expect(sm.openDisruptions(SVC).map(d => d.id)).toEqual([dis.id]);
    sm.updateDisruption(dis.id, { text: 'Provider contacted' }, cat('o1'));
    sm.updateDisruption(dis.id, { resolve: true, recovery: 'Service restored after the provider fixed the link' }, cat('o2'));
    expect(sm.openDisruptions(SVC)).toEqual([]);
    const ch = sm.proposeChange({ service: SVC, description: 'Accept scanned evidence', reason: 'Fewer visits', impact: 'Applicants upload instead of visiting' }, cat('o1')) as { id: string };
    expect(sm.decideChange(ch.id, { outcome: 'approved', reasons: 'Agreed' }, cat('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(sm.decideChange(ch.id, { outcome: 'approved', reasons: 'Agreed' }, cat('s1', 'signatory'))).toMatchObject({ decision: { outcome: 'approved' } });
    expect(sm.proposeException({ institution: X, requirement: 'Second sign-in step', scope: 'Kiosk accounts', justification: 'Hardware pending' }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/always expires/) });
    const ex = sm.proposeException({ institution: X, requirement: 'Second sign-in step', scope: 'Kiosk accounts', justification: 'Hardware pending', expiresOn: '2027-01-31' }, cat('o1')) as { id: string };
    sm.approveException(ex.id, cat('s1', 'signatory'));
    const x = sm.serviceManagement([X]).exceptions[0]!;
    expect(sm.exceptionState(x, new Date('2026-12-01'))).toBe('in-force');
    expect(sm.exceptionState(x, new Date('2027-01-31'))).toBe('expired');
    expect(today).toMatch(/^\d{4}/);
  });
});
