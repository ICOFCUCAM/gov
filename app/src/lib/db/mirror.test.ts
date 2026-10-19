import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ serverClient: () => serverClientMock() }));

import { queueMirror, flushMirror, mirrorStatus, resetMirror, reconcileMirror, adoptSubstrateDirectives, institutionRows } from './mirror';
import { resetDirectives, draftDirective, directive, listDirectives } from '@/lib/data/directives';
import { listAudit } from '@/lib/data/store';

type Result = { data: unknown; error: { message: string } | null };
function substrate(rpc: (fn: string, args: Record<string, unknown>) => Result | Promise<Result>, held: unknown[] = []) {
  return {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => rpc(fn, args)),
    from: vi.fn(() => ({ select: () => ({ order: () => ({ limit: async () => ({ data: held, error: null }) }) }) })),
  };
}

beforeEach(() => { serverClientMock.mockReset(); resetMirror(); resetDirectives(); });

describe('the substrate mirror of platform registers (D8)', () => {
  it('does nothing without the substrate: the platform record stands alone', async () => {
    serverClientMock.mockReturnValue(null);
    draftDirective({ ref: 'DIR-1', title: 'One', by: 'Officer' });
    queueMirror('directive', 'DIR-1');
    await flushMirror();
    expect(mirrorStatus()).toMatchObject({ configured: false, pending: 0, written: 0 });
  });

  it('copies the platform\'s record after its change and takes it off the queue', async () => {
    const sb = substrate(() => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(sb);
    draftDirective({ ref: 'DIR-1', title: 'One', by: 'Officer' });
    queueMirror('directive', 'DIR-1');
    await flushMirror();
    expect(sb.rpc).toHaveBeenCalledWith('civicos_mirror_directive', { p_row: directive('DIR-1') });
    expect(mirrorStatus()).toMatchObject({ configured: true, pending: 0, written: 1, failed: 0 });
  });

  it('keeps a refused record queued with its error and writes it on the next flush', async () => {
    let fail = true;
    const sb = substrate(() => (fail ? { data: null, error: { message: 'substrate down' } } : { data: null, error: null }));
    serverClientMock.mockReturnValue(sb);
    draftDirective({ ref: 'DIR-2', title: 'Two', by: 'Officer' });
    queueMirror('directive', 'DIR-2');
    await flushMirror();
    const s = mirrorStatus();
    expect(s.pending).toBe(1);
    expect(s.items[0]).toMatchObject({ id: 'directive:DIR-2', attempts: 1, lastError: 'substrate down' });
    expect(s.lastError).toBe('directive:DIR-2: substrate down');
    // The platform's change stands whatever the mirror does.
    expect(directive('DIR-2')!.status).toBe('drafting');
    fail = false;
    await flushMirror();
    expect(mirrorStatus()).toMatchObject({ pending: 0, written: 1, failed: 1 });
  });

  it('writes a record again when it changed while being written', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => { release = r; });
    let calls = 0;
    const sb = substrate(async () => { calls++; if (calls === 1) await gate; return { data: null, error: null }; });
    serverClientMock.mockReturnValue(sb);
    draftDirective({ ref: 'DIR-3', title: 'Three', by: 'Officer' });
    queueMirror('directive', 'DIR-3');
    const flushing = flushMirror();
    queueMirror('directive', 'DIR-3'); // changed again meanwhile
    release();
    await flushing;
    expect(calls).toBe(2);
    expect(mirrorStatus().pending).toBe(0);
  });

  it('re-copies everything on reconcile: every directive and the institutions', async () => {
    const sb = substrate(() => ({ data: null, error: null }));
    serverClientMock.mockReturnValue(sb);
    draftDirective({ ref: 'DIR-A', title: 'A', by: 'Officer' });
    draftDirective({ ref: 'DIR-B', title: 'B', by: 'Officer' });
    const s = await reconcileMirror();
    expect(s.pending).toBe(0);
    const directives = sb.rpc.mock.calls.filter(c => c[0] === 'civicos_mirror_directive').map(c => (c[1] as { p_row: { ref: string } }).p_row.ref);
    expect(directives.sort()).toEqual(['DIR-A', 'DIR-B']);
    const charters = sb.rpc.mock.calls.filter(c => c[0] === 'civicos_mirror_institution').map(c => (c[1] as { p_charter_id: string }).p_charter_id);
    expect(charters).toEqual(institutionRows().map(r => r.charterId));
    expect(charters).toContain('presidency');
  });

  it('charter rows come from the registry: standing institutions active, one row per ministry charter', () => {
    const rows = institutionRows();
    expect(new Set(rows.map(r => r.charterId)).size).toBe(rows.length);
    expect(rows.find(r => r.charterId === 'judiciary')).toMatchObject({ kind: 'branch', activated: true });
    for (const r of rows.filter(x => x.kind === 'ministry')) expect(r.meta.source).toBe('platform');
  });

  it('takes over the directives a substrate held before, once, audited, keeping the platform\'s own', async () => {
    draftDirective({ ref: 'DIR-OWN', title: 'Platform\'s', by: 'Officer' });
    const held = [
      { id: '0b0e4a8c-1111-4222-8333-444455556666', ref: 'DIR-OLD', kind: 'policy', issued_by_charter_id: 'presidency', issued_by_name: 'President', title: 'Older', citation: null, status: 'effective', targets: ['ministry-health'], payload: {}, signed_at: '2026-05-01T00:00:00Z', signed_by_id: null, effective_at: '2026-05-01T00:00:00Z', rescinded_at: null, created_at: '2026-04-30T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
      { id: 'x', ref: 'DIR-OWN', kind: 'policy', issued_by_charter_id: 'presidency', issued_by_name: 'Someone', title: 'Substrate copy', citation: null, status: 'effective', targets: [], payload: {}, signed_at: null, signed_by_id: null, effective_at: null, rescinded_at: null, created_at: '2026-04-30T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
    ];
    const sb = substrate(() => ({ data: null, error: null }), held);
    serverClientMock.mockReturnValue(sb);
    expect(await adoptSubstrateDirectives()).toBe(1);
    expect(directive('DIR-OLD')).toMatchObject({ status: 'effective', title: 'Older', issued_by_name: 'President' });
    expect(directive('DIR-OWN')!.title).toBe('Platform\'s');
    expect(listAudit().some(e => e.action === 'directive.adopt' && /1 directive taken over/.test(e.detail ?? ''))).toBe(true);
    expect(await adoptSubstrateDirectives()).toBe(0);
    expect(sb.from).toHaveBeenCalledTimes(1);
    expect(listDirectives().length).toBe(2);
    expect(mirrorStatus().directivesAdoptedAt).not.toBeNull();
  });
});
