// lib/db/substrate.test — end-to-end proof of persistence.
//
// This test EXERCISES the real Supabase substrate when env vars are set
// AND the host is reachable. It is silently skipped when:
//   • NEXT_PUBLIC_SUPABASE_URL / KEY are unset (no credentials)
//   • the host is unreachable (e.g. sandboxed dev env with egress firewall)
//
// CI without credentials passes; CI with credentials + network proves the
// substrate is alive.
//
// Three properties proven when active:
//   1. REMEMBER   — an audit entry written via the contract survives a
//                   fresh client; the DB is the canonical source.
//   2. CHAIN      — the DB's hash chain matches the in-memory implementation
//                   byte-for-byte (FNV-1a parity proof).
//   3. INTEGRITY  — verify_audit_chain reports intact for a fresh chain.
//                   (Tamper detection at DB level is verified separately
//                   by the migration's direct-UPDATE block test, which
//                   raises an exception when an attacker bypasses RLS.)

import { describe, it, expect, beforeAll } from 'vitest';
import { publicClient, substrateAvailable, __resetClients } from './client';
import { appendAuditRow, auditTrailRows, verifyChainRow } from './repos/audit';
import { publishEventRow, recentEventsRows } from './repos/events';
import { registerInstitutionRow, activateInstitutionRow, listInstitutionsRows } from './repos/institutions';
import {
  syncWorkflowDefinitionRow, openWorkItemRow, transitionWorkItemRow,
  workItemRow, workItemStepsRows,
} from './repos/work-items';
import {
  recordDirectiveRow, signDirectiveRow, rescindDirectiveRow,
  recordDispatchRow, acknowledgeDispatchRow, closeDispatchRow,
  recordEscalationRow, recordPostureRow, listPostureHistoryRows,
} from './repos/memory';
import { defineTelemetryStreamRow, recordTelemetrySampleRow, recentTelemetrySamplesRows } from './repos/telemetry';
import {
  registerCitizenRow, submitServiceRequestRow, updateServiceRequestRow,
  grantConsentRow, revokeConsentRow, fileAppealRow, decideAppealRow,
} from './repos/citizen';
import { currentActor } from './repos/identity';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const HAS_CREDS = !!(URL && KEY);

// Probe the substrate once. If the host is blocked by an egress firewall
// (sandboxed dev environments) we treat the substrate as unavailable so
// the integration suite skips gracefully.
let HOST_REACHABLE = false;
if (HAS_CREDS) {
  try {
    const probe = await fetch(`${URL}/rest/v1/`, { headers: { apikey: KEY! } });
    HOST_REACHABLE = probe.status !== 403 || probe.headers.get('x-deny-reason') !== 'host_not_allowed';
  } catch { HOST_REACHABLE = false; }
}

const ACTIVE = HAS_CREDS && HOST_REACHABLE;

describe.skipIf(!ACTIVE)('CivicOS substrate — persistent audit chain', () => {
  // Unique scope per test run so concurrent test executions don't collide.
  const scope = `vitest:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(() => {
    __resetClients();
    expect(substrateAvailable()).toBe(true);
  });

  it('REMEMBERS — entries written via append_audit are readable after a fresh client', async () => {
    const a = await appendAuditRow(scope, 'vitest', 'create', 'item-1', 'first');
    expect(a).not.toBeNull();
    expect(a!.seq).toBe(1);
    expect(a!.prevHash).toBe('00000000');

    const b = await appendAuditRow(scope, 'vitest', 'sign', 'item-1', '');
    expect(b).not.toBeNull();
    expect(b!.seq).toBe(2);
    expect(b!.prevHash).toBe(a!.hash);

    // Reset clients, prove the chain is still readable from a fresh client.
    __resetClients();
    const trail = await auditTrailRows(scope, 10);
    expect(trail).toHaveLength(2);
    expect(trail[0]!.seq).toBe(2); // newest first
    expect(trail[1]!.seq).toBe(1);
    expect(trail[1]!.hash).toBe(a!.hash);
  });

  it('CHAIN — DB-side FNV-1a matches the in-memory digest', async () => {
    // Mirror the JS digest exactly.
    function digest(s: string): string {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    }
    const trail = await auditTrailRows(scope, 10);
    expect(trail.length).toBeGreaterThan(0);
    // Walk the chain newest-last and verify each hash with the JS digest.
    const ordered = [...trail].reverse();
    let prev = '00000000';
    for (const e of ordered) {
      const expected = digest(`${prev}|${e.seq}|${e.scope}|${e.actor}|${e.action}|${e.subject}|${e.detail}`);
      expect(e.prevHash).toBe(prev);
      expect(e.hash).toBe(expected);
      prev = e.hash;
    }
  });

  it('INTEGRITY — verify_audit_chain reports intact for the fresh chain', async () => {
    const v = await verifyChainRow(scope);
    expect(v).not.toBeNull();
    expect(v!.intact).toBe(true);
    expect(v!.brokenAt).toBeNull();
    expect(v!.entries).toBeGreaterThanOrEqual(2);
  });

  it('FEDERATION — events written via publish_event are readable from a fresh client', async () => {
    const channel = `vitest-${scope.slice(0, 16)}`;
    const ev = await publishEventRow(
      'institution.escalation',
      'vitest.app',
      channel,
      { reason: 'integration-proof', severity: 'minor' },
    );
    expect(ev).not.toBeNull();
    expect(ev!.type).toBe('institution.escalation');
    expect(ev!.payload).toMatchObject({ reason: 'integration-proof' });

    __resetClients();
    const rows = await recentEventsRows({ channel, limit: 5 });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.source).toBe('vitest.app');
    expect(rows[0]!.payload).toMatchObject({ severity: 'minor' });
  });

  it('REGISTRY — institutions persist and activate via the contract', async () => {
    const charter = `vitest-inst-${Date.now()}`;
    const domain = `vitest-domain-${Date.now()}`;
    const reg = await registerInstitutionRow({
      charterId: charter,
      label: 'Vitest Ministry',
      kind: 'ministry',
      domain,
      archetypeOrBranch: 'HEALTH',
      meta: { instanceId: 'MIN-VITEST' },
    });
    expect(reg).not.toBeNull();
    expect(reg!.activated).toBe(false);

    const act = await activateInstitutionRow(charter);
    expect(act).not.toBeNull();
    expect(act!.activated).toBe(true);
    expect(act!.activated_at).not.toBeNull();

    // Re-register (idempotent ON CONFLICT) doesn't reset activation.
    const reg2 = await registerInstitutionRow({
      charterId: charter, label: 'Vitest Ministry (renamed)',
      kind: 'ministry', domain, archetypeOrBranch: 'HEALTH',
    });
    expect(reg2).not.toBeNull();
    expect(reg2!.activated).toBe(true);
    expect(reg2!.label).toBe('Vitest Ministry (renamed)');

    const rows = await listInstitutionsRows({ activated: true });
    expect(rows.some(r => r.charter_id === charter)).toBe(true);
  });

  it('WORKFLOW — open and transition a work item end-to-end; invalid action rejected', async () => {
    const wfId = `vitest-wf-${Date.now()}`;
    const ref = `WI-VITEST-${Date.now()}`;
    const def = await syncWorkflowDefinitionRow({
      workflowId: wfId,
      institutionCharterId: 'vitest',
      archetype: 'GENERIC',
      title: 'Vitest Approval',
      kind: 'approval',
      definition: {
        terminal: ['Closed', 'Rejected'],
        transitions: {
          Submitted:     { advance: 'Triaged' },
          Triaged:       { advance: 'Under review' },
          'Under review':{ approve: 'Decision', reject: 'Rejected' },
          Decision:      { resolve: 'Closed' },
        },
      },
    });
    expect(def).not.toBeNull();

    const item = await openWorkItemRow({
      ref, scope: `vitest:${ref}`, workflowId: wfId, kind: 'approval',
      title: 'Test item', currentStage: 'Submitted', priority: 'priority',
      originatingCharterId: 'vitest', assigneeName: 'Vitest Assignee',
    });
    expect(item).not.toBeNull();
    expect(item!.current_stage).toBe('Submitted');

    // Invalid transition (no rule for approve from Submitted) is rejected.
    const bad = await transitionWorkItemRow({ ref, action: 'approve', actorName: 'X' });
    expect(bad).not.toBeNull();
    expect(bad!.ok).toBe(false);
    if (bad && !bad.ok) expect(bad.reason).toBe('invalid_transition');

    // Happy path advances through all stages.
    for (const action of ['advance', 'advance', 'approve', 'resolve'] as const) {
      const r = await transitionWorkItemRow({ ref, action, actorName: 'Vitest' });
      expect(r).not.toBeNull();
      expect(r!.ok).toBe(true);
    }

    const final = await workItemRow(ref);
    expect(final).not.toBeNull();
    expect(final!.current_stage).toBe('Closed');
    expect(final!.closed).toBe(true);
    expect(final!.closed_at).not.toBeNull();

    const steps = await workItemStepsRows(ref);
    expect(steps).toHaveLength(5); // open + 4 transitions
    expect(steps[steps.length - 1]!.to_stage).toBe('Closed');

    // Transitioning a closed item is rejected.
    const afterClose = await transitionWorkItemRow({ ref, action: 'advance', actorName: 'X' });
    expect(afterClose!.ok).toBe(false);
    if (afterClose && !afterClose.ok) expect(afterClose.reason).toBe('closed');
  });

  it('MEMORY — directive lifecycle: draft → sign → rescind', async () => {
    const ref = `DIR-VITEST-${Date.now()}`;
    const d = await recordDirectiveRow({
      ref, kind: 'executive-order', issuedByCharterId: 'presidency',
      title: 'Test directive', targets: ['ministry-health'],
      payload: { rationale: 'integration proof' },
    });
    expect(d).not.toBeNull();
    expect(d!.status).toBe('drafting');

    const signed = await signDirectiveRow(ref);
    expect(signed).not.toBeNull();
    expect(signed!.status).toBe('signed');
    expect(signed!.signed_at).not.toBeNull();

    const rescinded = await rescindDirectiveRow(ref);
    expect(rescinded!.status).toBe('rescinded');
    expect(rescinded!.rescinded_at).not.toBeNull();
  });

  it('MEMORY — dispatch lifecycle: record → acknowledge → close', async () => {
    const ref = `DSP-VITEST-${Date.now()}`;
    const d = await recordDispatchRow({
      ref, issuedByCharterId: 'emergency-response',
      kind: 'unit-deploy', priority: 'urgent', detail: 'Unit 14 → grid 4N',
      targetCharterId: 'police-command',
    });
    expect(d).not.toBeNull();
    expect(d!.status).toBe('dispatched');

    const ack = await acknowledgeDispatchRow(ref);
    expect(ack!.status).toBe('acknowledged');
    expect(ack!.acknowledged_at).not.toBeNull();

    const closed = await closeDispatchRow(ref);
    expect(closed!.status).toBe('closed');
    expect(closed!.closed_at).not.toBeNull();
  });

  it('MEMORY — escalation recorded with severity and source', async () => {
    const e = await recordEscalationRow({
      sourceCharterId: 'ministry-interior',
      severity: 'major',
      reason: `vitest-escalation-${Date.now()}`,
      targetCharterId: 'noc',
      triggeredByActor: 'vitest',
    });
    expect(e).not.toBeNull();
    expect(e!.severity).toBe('major');
    expect(e!.resolved_at).toBeNull();
  });

  it('TELEMETRY — stream definition and append-only samples', async () => {
    const sid = `vitest.metric.${Date.now()}`;
    const stream = await defineTelemetryStreamRow({
      streamId: sid, charterId: 'platform', label: 'Vitest metric',
      unit: 'ops/min', warnThreshold: 80, alertThreshold: 95,
    });
    expect(stream).not.toBeNull();

    const s1 = await recordTelemetrySampleRow({ streamId: sid, value: 42.5 });
    const s2 = await recordTelemetrySampleRow({ streamId: sid, value: 87.0 });
    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();

    const samples = await recentTelemetrySamplesRows(sid, 10);
    expect(samples.length).toBeGreaterThanOrEqual(2);
    // Newest first.
    expect(samples[0]!.value).toBe(87.0);
  });

  it('CITIZEN — service request lifecycle (submit → ack → resolve with satisfaction)', async () => {
    const cit = await registerCitizenRow({
      nationalId: `NID-VITEST-${Date.now()}`, displayName: 'Vitest Citizen', region: 'r1',
    });
    expect(cit).not.toBeNull();
    const ref = `SR-VITEST-${Date.now()}`;
    const sub = await submitServiceRequestRow({
      ref, citizenId: cit!.id, targetCharterId: 'ministry-health',
      service: 'birth-cert', domain: 'health', title: 'Birth certificate',
      payload: { copies: 1 },
    });
    expect(sub!.status).toBe('submitted');

    const acked = await updateServiceRequestRow({ ref, status: 'in-progress' });
    expect(acked!.acknowledged_at).not.toBeNull();
    expect(acked!.status).toBe('in-progress');

    const resolved = await updateServiceRequestRow({
      ref, status: 'resolved', satisfaction: 5, payloadPatch: { outcome: 'issued' },
    });
    expect(resolved!.status).toBe('resolved');
    expect(resolved!.resolved_at).not.toBeNull();
    expect(resolved!.satisfaction).toBe(5);
    expect((resolved!.payload as Record<string, unknown>).outcome).toBe('issued');
  });

  it('CITIZEN — consent grant supersedes prior active grant for same scope', async () => {
    const cit = await registerCitizenRow({
      nationalId: `NID-CONSENT-${Date.now()}`, displayName: 'Consent Tester',
    });
    expect(cit).not.toBeNull();

    const first = await grantConsentRow(cit!.id, 'ministry-health', 'health.records');
    expect(first!.status).toBe('granted');

    // Re-grant supersedes — the unique partial index would otherwise block a
    // duplicate active row. The RPC marks the prior one expired.
    const second = await grantConsentRow(cit!.id, 'ministry-health', 'health.records');
    expect(second!.status).toBe('granted');
    expect(second!.id).not.toBe(first!.id);

    const revoked = await revokeConsentRow(second!.id);
    expect(revoked!.status).toBe('revoked');
    expect(revoked!.revoked_at).not.toBeNull();
  });

  it('CITIZEN — appeal filed and decided with reasoning + publication', async () => {
    const cit = await registerCitizenRow({
      nationalId: `NID-APPEAL-${Date.now()}`, displayName: 'Appellant',
    });
    const ref = `AP-VITEST-${Date.now()}`;
    const filed = await fileAppealRow({
      ref, citizenId: cit!.id, originatingCharterId: 'ministry-health',
      ground: 'procedural-error',
    });
    expect(filed!.status).toBe('filed');

    const decided = await decideAppealRow(ref, 'upheld', 'finding for applicant', true);
    expect(decided!.status).toBe('decided');
    expect(decided!.decision).toBe('upheld');
    expect(decided!.published_at).not.toBeNull();
  });

  it('IDENTITY — current_actor returns null for unauthenticated anon sessions', async () => {
    // The test harness uses the anonymous publishable key; no session is
    // attached, so the contract must return null rather than a stale
    // actor or a permission error.
    const a = await currentActor();
    expect(a).toBeNull();
  });

  it('POSTURE — snapshots persist and listings sort newest-first', async () => {
    const charter = `vitest-charter-${Date.now()}`;
    const s1 = await recordPostureRow({
      charterId: charter, posture: 'steady', readiness: 80, stress: 20,
    });
    expect(s1).not.toBeNull();
    expect(s1!.posture).toBe('steady');

    const s2 = await recordPostureRow({
      charterId: charter, posture: 'elevated', readiness: 65, stress: 55,
    });
    expect(s2).not.toBeNull();
    expect(s2!.posture).toBe('elevated');

    const rows = await listPostureHistoryRows({ charter, limit: 10 });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]!.posture).toBe('elevated'); // newest first
    expect(rows[1]!.posture).toBe('steady');
  });

  it('CATALOGUE — institutions and facilities listings honor filters', async () => {
    // Register a fresh institution then prove it's visible in the kind filter.
    const charter = `vitest-cat-${Date.now()}`;
    const dom = `vitest-cat-domain-${Date.now()}`;
    const reg = await registerInstitutionRow({
      charterId: charter, label: 'Vitest Catalogue', kind: 'agency',
      domain: dom, archetypeOrBranch: 'GENERIC',
    });
    expect(reg).not.toBeNull();

    const agencies = await listInstitutionsRows({ kind: 'agency' });
    expect(agencies.some(r => r.charter_id === charter)).toBe(true);

    const activated = await listInstitutionsRows({ activated: true });
    // Newly registered is NOT activated by default.
    expect(activated.some(r => r.charter_id === charter)).toBe(false);
  });

  it('SEARCH — substrate search returns hits matching a freshly-recorded directive', async () => {
    const { substrateSearch } = await import('./search');
    const stamp = Date.now();
    const ref = `DIR-SRCH-${stamp}`;
    const needle = `SearchSmokeTest${stamp}`;
    const d = await recordDirectiveRow({
      ref, kind: 'executive-order', issuedByCharterId: 'presidency',
      title: needle,
    });
    expect(d).not.toBeNull();
    const hits = await substrateSearch(needle);
    expect(hits.some(h => h.ref === ref)).toBe(true);
  });

  it('CONTRACT — direct INSERT to audit_entries is denied (RLS)', async () => {
    const sb = publicClient();
    expect(sb).not.toBeNull();
    // Direct INSERT through the anon/publishable key must be refused —
    // the only sanctioned path is the RPC contract.
    // The view `civicos_audit_entries` has no INSERT triggers and the
    // underlying table denies non-service-role writes — either way, the
    // direct path is closed; only the RPC contract opens the door.
    const { error } = await sb!.from('civicos_audit_entries').insert({
      scope, actor: 'attacker', action: 'tamper', subject: 'x',
    } as never);
    expect(error).not.toBeNull();
  });

  /* ── Witness attestations ─────────────────────────────────────── */

  it('WITNESS — recording an attestation appears in the public view', async () => {
    const { recordWitnessAttestationRow, recentWitnessRows } = await import('./repos/audit');
    const stamp = Date.now();
    const myScope = `${scope}:witness:${stamp}`;
    // Seed an audit entry under this scope so we have a real (seq, hash).
    await appendAuditRow(myScope, 'witness-test', 'seed', 's', 'd');
    const trail = await auditTrailRows(myScope, 5);
    expect(trail.length).toBeGreaterThan(0);
    const head = trail[0]!;

    const w = await recordWitnessAttestationRow({
      scope: myScope, observedSeq: head.seq, observedHash: head.hash,
      label: `integration-${stamp}`,
    });
    expect(w).not.toBeNull();
    expect(w!.observedSeq).toBe(head.seq);
    expect(w!.observedHash).toBe(head.hash);

    const list = await recentWitnessRows({ scope: myScope, limit: 10 });
    expect(list.some(x => x.label === `integration-${stamp}`)).toBe(true);
  });

  it('WITNESS — second attestation by same label upserts in place', async () => {
    const { recordWitnessAttestationRow, recentWitnessRows } = await import('./repos/audit');
    const stamp = Date.now() + 1;
    const myScope = `${scope}:witness-upsert:${stamp}`;
    await appendAuditRow(myScope, 't', 's', 'x', 'y');
    const trail = await auditTrailRows(myScope, 5);
    const head = trail[0]!;

    const label = `upsert-${stamp}`;
    const a = await recordWitnessAttestationRow({
      scope: myScope, observedSeq: head.seq, observedHash: head.hash, label,
    });
    const b = await recordWitnessAttestationRow({
      scope: myScope, observedSeq: head.seq, observedHash: head.hash, label,
    });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.id).toBe(b!.id); // same row updated, not duplicated

    const list = await recentWitnessRows({ scope: myScope, limit: 10 });
    const mine = list.filter(x => x.label === label);
    expect(mine).toHaveLength(1);
  });

  it('WITNESS — agreement check reports consistent for a freshly attested chain', async () => {
    const { recordWitnessAttestationRow, witnessAgreementRow } = await import('./repos/audit');
    const stamp = Date.now() + 2;
    const myScope = `${scope}:witness-agree:${stamp}`;
    await appendAuditRow(myScope, 't', 's', 'x', 'y');
    const trail = await auditTrailRows(myScope, 5);
    const head = trail[0]!;

    await recordWitnessAttestationRow({
      scope: myScope, observedSeq: head.seq, observedHash: head.hash,
      label: `agree-${stamp}`,
    });
    const agreement = await witnessAgreementRow(myScope);
    expect(agreement).not.toBeNull();
    expect(agreement!.consistent).toBe(true);
    expect(agreement!.attestations).toBeGreaterThan(0);
    expect(agreement!.latestSeq).toBe(head.seq);
  });
});
