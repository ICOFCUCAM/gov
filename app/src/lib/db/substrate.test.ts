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
});
