// Departments as records (plan I2): an accountable office of the institution,
// functions, services and staff that are the institution's own accounts, every
// version kept; recorded directly only during setup, afterwards proposed by one
// administrator and confirmed by a different official, an independent
// institution's departments by its own officials only; ended with a reason and
// kept; earlier readers of { id, name } keep working.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMinistry, getMinistry } from '@/lib/data/store/ministries';
import { completeSetup, setSovereign } from '@/lib/data/store/sovereign';
import { db } from '@/lib/data/store/state';
import { recordTermsDuringSetup } from '@/lib/data/store/institutions';
import { resetOffices, recordOfficeDuringSetup } from '@/lib/nation/office-register';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import { departmentsOf, recordDepartmentDuringSetup, proposeDepartmentChange, confirmDepartmentChange, departmentChange, waitingDepartmentChanges } from './departments';

const SETUP_TOKEN = 'test-setup-token-departments-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

const mk = (name: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
const ADMIN = { by: 'Ama Mensah, Head of Service', byId: 'local:ama', role: 'administrator' };
const OTHER = { by: 'Kofi Boateng, Permanent Secretary', byId: 'local:kofi', role: 'signatory' };
let inst = '', other = '', office = '', staff = '', outsider = '';

beforeEach(async () => {
  resetOffices(); resetOfficials(); db.setup = null;
  await createAccount({ email: 'first@gov.test', name: 'First', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null);
  inst = mk('Ministry of Works'); other = mk('Ministry of Lands');
  const o = recordOfficeDuringSetup({ title: 'Director of Administration', kind: 'permanent-secretary', institution: inst, effectiveFrom: '2020-01-01' }, { ...ADMIN, role: 'administrator' as const });
  if ('error' in o) throw new Error(o.error);
  office = o.id;
  const a = await createAccount({ email: 'clerk@gov.test', name: 'Efua Clerk', office: 'Payroll officer', password: 'correct horse battery', role: 'officer', institution: inst }, 'First');
  const b = await createAccount({ email: 'lands@gov.test', name: 'Yaw Lands', office: 'Officer', password: 'correct horse battery', role: 'officer', institution: other }, 'First');
  if ('error' in a || 'error' in b) throw new Error('accounts');
  staff = a.id; outsider = b.id;
});
afterEach(() => { db.setup = null; setSovereign({ deployment: { authorities: {} } }, 'test'); });

describe('departments as records', () => {
  it('records a department with its accountable office, functions, services and staff during setup, every version kept', () => {
    const r = recordDepartmentDuringSetup(inst, { kind: 'establish', terms: { name: 'Finance and Administration', office, functions: ['hr', 'finance'], services: [{ name: 'Payroll' }], staff: [staff] }, reason: 'Establishment order' }, ADMIN);
    if ('error' in r) throw new Error(r.error);
    expect(r).toMatchObject({ name: 'Finance and Administration', office, functions: ['hr', 'finance'], staff: [staff], version: 1 });
    expect(r.history).toHaveLength(1);
    const v = departmentsOf(inst).find(d => d.id === r.id)!;
    expect(v).toMatchObject({ officeTitle: 'Director of Administration', status: 'active', staffNames: [{ id: staff, name: 'Efua Clerk' }] });
    // Earlier readers of { id, name } keep working.
    expect(getMinistry(inst)!.departments.find(d => d.id === r.id)).toMatchObject({ id: r.id, name: 'Finance and Administration' });
  });

  it('refuses an office or staff of another institution, an unknown function and a change without its reason', () => {
    const otherOffice = recordOfficeDuringSetup({ title: 'Director of Lands', kind: 'agency-director', institution: other, effectiveFrom: '2020-01-01' }, { ...ADMIN, role: 'administrator' as const });
    if ('error' in otherOffice) throw new Error(otherOffice.error);
    const est = (terms: object, reason = 'Order') => recordDepartmentDuringSetup(inst, { kind: 'establish', terms: { name: 'X', ...terms }, reason }, ADMIN);
    expect(est({ office: otherOffice.id })).toMatchObject({ error: expect.stringMatching(/belongs to another institution/) });
    expect(est({ staff: [outsider] })).toMatchObject({ error: expect.stringMatching(/not an official of/) });
    expect(est({ functions: ['payroll-magic'] })).toMatchObject({ error: expect.stringMatching(/Functions are among/) });
    expect(est({}, '')).toMatchObject({ error: expect.stringMatching(/reason/) });
  });

  it('after setup: proposed by one administrator, confirmed by a different official; the department amended and ended keeps every version', () => {
    const d = recordDepartmentDuringSetup(inst, { kind: 'establish', terms: { name: 'Records' }, reason: 'Order' }, ADMIN);
    if ('error' in d) throw new Error(d.error);
    completeSetup('Admin');
    expect(recordDepartmentDuringSetup(inst, { kind: 'end', department: d.id, reason: 'x' }, ADMIN)).toMatchObject({ error: expect.stringMatching(/change process/) });
    expect(proposeDepartmentChange(inst, { kind: 'amend', department: d.id, terms: { office, functions: ['records'] }, reason: 'Records management function' }, [], OTHER)).toMatchObject({ error: expect.stringMatching(/An administrator proposes/) });
    const p = proposeDepartmentChange(inst, { kind: 'amend', department: d.id, terms: { office, functions: ['records'] }, reason: 'Records management function' }, [], ADMIN);
    expect(p).not.toHaveProperty('error');
    expect(waitingDepartmentChanges().map(w => w.id)).toContain(inst);
    // The same person cannot confirm.
    expect(confirmDepartmentChange(inst, ADMIN)).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    expect(confirmDepartmentChange(inst, OTHER)).not.toHaveProperty('error');
    expect(getMinistry(inst)!.departments.find(x => x.id === d.id)).toMatchObject({ office, functions: ['records'], version: 2 });
    // The earlier route's end, after setup, is a proposal: nothing ends until a second official confirms.
    const end = departmentChange(inst, { kind: 'end', department: d.id, reason: 'Merged into Finance and Administration' }, [], ADMIN);
    expect(end).toHaveProperty('proposed');
    expect(getMinistry(inst)!.departments.find(x => x.id === d.id)!.status).not.toBe('ended');
    expect(confirmDepartmentChange(inst, OTHER)).not.toHaveProperty('error');
    const kept = getMinistry(inst)!.departments.find(x => x.id === d.id)!;
    expect(kept).toMatchObject({ status: 'ended', endReason: 'Merged into Finance and Administration', endedBy: ADMIN.by });
    expect(kept.history!.map(h => [h.change, h.version])).toEqual([['establish', 1], ['amend', 2], ['end', 3]]);
    expect(kept.history!.at(-1)).toMatchObject({ change: 'end', by: ADMIN.by, confirmedBy: OTHER.by, status: 'ended' });
    expect(departmentsOf(inst).some(x => x.id === d.id)).toBe(false);
    expect(departmentsOf(inst, { ended: true }).find(x => x.id === d.id)).toMatchObject({ status: 'ended', ended: { reason: 'Merged into Finance and Administration' } });
  });

  it('keeps an independent institution\'s departments its own: whole-government administrators neither propose nor confirm there', () => {
    const court = mk('High Court');
    recordTermsDuringSetup(court, { standing: 'judiciary' }, 'Admin');
    completeSetup('Admin');
    const whole = { ...ADMIN, byId: 'local:wg' };
    expect(proposeDepartmentChange(court, { kind: 'establish', terms: { name: 'Registry' }, reason: 'Order' }, [], whole)).toMatchObject({ error: expect.stringMatching(/independent: its own administrators/) });
    const own = { by: 'Court Administrator', byId: 'local:ca', role: 'administrator', institution: court };
    expect(proposeDepartmentChange(court, { kind: 'establish', terms: { name: 'Registry' }, reason: 'Order' }, [], own)).not.toHaveProperty('error');
    expect(confirmDepartmentChange(court, { by: 'Head of Service', byId: 'local:hos', role: 'signatory' })).toMatchObject({ error: expect.stringMatching(/independent: one of its own officials/) });
    expect(confirmDepartmentChange(court, { by: 'Chief Registrar', byId: 'local:cr', role: 'signatory', institution: court })).not.toHaveProperty('error');
    expect(departmentsOf(court).some(d => d.name === 'Registry')).toBe(true);
  });
});
