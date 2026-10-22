// Plan I2: the catalogue's task-level permission identifiers as roles.ts rules
// (institutions and roles, never offices); attribute scope by facility,
// jurisdiction and task (narrows, never widens); transparent delegation read
// in authorisation only within its institution, period and steps.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TASK_PERMISSIONS, taskRefusal, attributeRefusal, delegationCovering, caseActRefusal, caseReadRefusal, type DelegationGrant } from './roles';

const rows = JSON.parse(readFileSync(join(process.cwd(), '..', 'docs/requirements/requirements.json'), 'utf8')) as { id: string; category: string; text: string }[];

describe('task-level permission identifiers', () => {
  it('expresses every identifier the catalogue names, each mapped to a role and an institution, never to an office', () => {
    const named = rows.filter(r => r.category === 'permission').map(r => r.text.trim());
    expect(named.length).toBeGreaterThanOrEqual(57);
    expect(named.filter(id => !TASK_PERMISSIONS.some(t => t.id === id))).toEqual([]);
    for (const t of TASK_PERMISSIONS) {
      expect(['any', 'officer', 'signatory', 'administrator', 'auditor'], t.id).toContain(t.role);
      expect(typeof t.keeper === 'string' ? ['mapping', 'own'] : ['slot'], t.id).toContain(typeof t.keeper === 'string' ? t.keeper : 'slot');
      expect(Object.keys(t), t.id).not.toContain('office');
      expect(JSON.stringify(t.keeper), t.id).not.toMatch(/office/i);
      if (t.decision) expect(['signatory', 'administrator'], t.id).toContain(t.role);
    }
    expect(new Set(TASK_PERMISSIONS.map(t => t.id)).size).toBe(TASK_PERMISSIONS.length);
    // The parts the catalogue holds for legal review stay unbuilt.
    for (const id of ['police.evidence.register', 'police.custody.record', 'election.voter.register']) expect(TASK_PERMISSIONS.find(t => t.id === id)!.built).toBe('legal review');
  });

  it('allows a task only to the role at the institution responsible, whatever office an official holds', () => {
    const at = 'inst-legislature';
    expect(taskRefusal({ role: 'officer', institution: at }, 'legislature.bill.submit', at)).toBeNull();
    expect(taskRefusal({ role: 'officer', institution: at }, 'legislature.vote.record', at)).toMatch(/can sign/);
    expect(taskRefusal({ role: 'signatory', institution: 'executive' }, 'legislature.vote.record', at)).toMatch(/institution responsible/);
    expect(taskRefusal({ role: 'administrator' }, 'legislature.vote.record', at)).toMatch(/institution responsible/);
    expect(taskRefusal({ role: 'auditor' }, 'government.audit.read', at)).toBeNull();
    expect(taskRefusal({ role: 'officer', institution: 'p' }, 'police.evidence.register', 'p')).toMatch(/legal review/);
    expect(taskRefusal({ role: 'officer', institution: 'x' }, 'no.such.task', 'x')).toMatch(/No task/);
  });
});

describe('attribute scope', () => {
  const s = { role: 'officer' as const, institution: 'health', attributes: { facilities: ['FAC-1'], jurisdictions: ['Nairobi'], tasks: ['administration.payroll.prepare'] } };
  it('narrows: outside the account\'s facilities, jurisdictions or tasks is refused; unscoped accounts are not touched', () => {
    expect(attributeRefusal(s, { facility: 'FAC-1', jurisdiction: 'Nairobi', task: 'administration.payroll.prepare' })).toBeNull();
    expect(attributeRefusal(s, { facility: 'FAC-2', jurisdiction: 'Nairobi' })).toMatch(/facility outside your scope/);
    expect(attributeRefusal(s, { facility: 'FAC-1', jurisdiction: 'Mombasa' })).toMatch(/scoped to Nairobi/);
    expect(attributeRefusal(s, { facility: 'FAC-1', jurisdiction: 'Nairobi', task: 'administration.payroll.review' })).toMatch(/named tasks/);
    expect(attributeRefusal(s, {})).toMatch(/names none/);
    expect(attributeRefusal({ role: 'officer', institution: 'health' }, { facility: 'FAC-9' })).toBeNull();
  });
  it('applies in the case rules for acting and reading, never widening a role', () => {
    const c = { owner: 'health', sensitivity: 'normal' as const, facility: 'FAC-2', jurisdiction: 'Nairobi' };
    expect(caseActRefusal(s, c)).toMatch(/facility outside your scope/);
    expect(caseReadRefusal(s, c)).toMatch(/facility outside your scope/);
    expect(caseActRefusal(s, { ...c, facility: 'FAC-1' })).toBeNull();
    // A scope never lets an officer decide.
    expect(caseActRefusal(s, { ...c, facility: 'FAC-1', decision: true })).toMatch(/can sign/);
  });
});

describe('transparent delegation', () => {
  const g: DelegationGrant = { id: 'D-1', delegator: { id: 'local:dir', name: 'Director' }, institution: 'works', procedures: ['adm.policy'], actions: ['approve'], from: '2026-01-01', until: '2027-01-01', basis: 'Public Service Act sec_12' };
  const s = { id: 'local:dep', role: 'officer' as const, institution: 'works', delegations: [g] };
  it('covers only its institution, procedures, steps and period, never the delegator', () => {
    expect(delegationCovering(s, 'works', 'adm.policy.works', 'approve', undefined, '2026-10-21')).toMatchObject({ id: 'D-1' });
    expect(delegationCovering(s, 'works', 'adm.policy.works', 'reject', undefined, '2026-10-21')).toBeNull();
    expect(delegationCovering(s, 'works', 'adm.establishment.works', 'approve', undefined, '2026-10-21')).toBeNull();
    expect(delegationCovering(s, 'works', 'adm.policy.works', 'approve', undefined, '2027-01-01')).toBeNull();
    expect(delegationCovering({ ...s, institution: 'lands' }, 'works', 'adm.policy.works', 'approve', undefined, '2026-10-21')).toBeNull();
    expect(delegationCovering({ ...s, id: 'local:dir' }, 'works', 'adm.policy.works', 'approve', undefined, '2026-10-21')).toBeNull();
  });
  it('lets a decision be taken under it only where the procedure marks the step delegable', () => {
    const c = { owner: 'works', sensitivity: 'normal' as const, decision: true, recordType: 'adm.policy.works', action: 'approve' };
    expect(caseActRefusal(s, c)).toMatch(/can sign/);
    expect(caseActRefusal(s, { ...c, delegable: true })).toBeNull();
  });
});
