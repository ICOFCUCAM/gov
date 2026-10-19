// The mirror follower (src/mirror/follower.ts): signed platform events and a
// full re-sync keep civic-api's tables current, idempotently, behind a
// MirrorStore (here in memory, so no database is needed).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MirrorFollower, freshRegisters, onlyRegisters, registersFor, toBatch, type MirrorBatch, type MirrorMark, type MirrorState, type MirrorStore, type PlatformSnapshot } from '../src/mirror/follower';

class MemoryStore implements MirrorStore {
  st: MirrorState = { cursor: 0, lastEventAt: null, lastFullSyncAt: null, lastError: null };
  applied = new Map<string, number>();
  writes: { batch: MirrorBatch; mark: MirrorMark }[] = [];
  rows = new Map<string, unknown>();
  async state() { return { ...this.st }; }
  async hasApplied(id: string) { return this.applied.has(id); }
  async noteError(m: string) { this.st.lastError = m; }
  seqs: Record<string, number> = {};
  async write(all: MirrorBatch, mark: MirrorMark) {
    // The same rule as the Prisma store: an older read never lands over a newer one.
    const fresh = freshRegisters(all, this.seqs, mark.dataSeq);
    this.seqs = fresh.seqs;
    const batch = onlyRegisters(all, fresh.write);
    this.writes.push({ batch, mark });
    for (const [k, v] of Object.entries(batch)) {
      const list = Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v).flat() : [];
      for (const r of list as { id: string }[]) this.rows.set(`${k}:${r.id}`, r);
    }
    this.st.cursor = Math.max(this.st.cursor, mark.cursor);
    if (mark.event) { this.applied.set(mark.event.id, mark.event.auditSeq); this.st.lastEventAt = 'now'; }
    if (mark.fullSyncAt) this.st.lastFullSyncAt = mark.fullSyncAt.toISOString();
    this.st.lastError = null;
  }
}

const SECRET = 'whsec_test-secret';
const KEY = 'civ_abcdef12_mirror-key';
let feed: Server;
let base = '';
let feedCalls: { url: string; auth?: string }[] = [];
let feedStatus = 200;
let snapshot: PlatformSnapshot;

const ministry = (name: string) => ({ id: 'min-health', slug: 'health', name, archetype: 'HEALTH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', departments: [{ id: 'dep-1', name: 'Hospitals' }], modules: [{ moduleKey: 'hospitals', enabled: true }] });
const snap = (auditSeq: number, name = 'Ministry of Health'): PlatformSnapshot => ({
  at: '2026-10-19T00:00:00.000Z', auditSeq,
  tenant: { name: 'home', stateName: 'Republic of Example', iso3: 'KEN', state: 'active' },
  registers: {
    institutions: [ministry(name)],
    permits: [{ id: 'PM-1', type: 'food-handling', title: 'Kiosk', applicantName: 'A', municipality: 'M', status: 'in-review', fields: {}, timeline: [{ status: 'submitted', at: '2026-01-02T00:00:00.000Z' }] }],
    payments: { bills: [{ id: 'B-1', kind: 'property-tax', description: 'Rates', amountMinor: 1000, currency: 'KES', dueDate: '2026-11-01T00:00:00.000Z', status: 'due' }], receipts: [] },
    grants: [{ id: 'FG-1', fromTenant: 'home', toTenant: 'min-health', scopes: ['permit:read'], status: 'approved', reason: 'oversight', createdAt: '2026-01-01T00:00:00.000Z' }],
    lifecycle: { tenant: 'home', state: 'active', events: [{ at: '2026-01-01T00:00:00.000Z', from: 'provisioning', to: 'active', reason: 'go-live', actor: 'L. P.' }] },
    deployments: [{ id: 'DEP-1', releaseId: 'REL-1', strategy: 'blue-green', state: 'rolled-back', gates: [], startedAt: '2026-01-01T00:00:00.000Z' }],
  },
});

before(async () => {
  feed = createServer((req, res) => {
    feedCalls.push({ url: req.url!, auth: req.headers.authorization });
    res.statusCode = feedStatus;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(feedStatus === 200 ? snapshot : { error: 'refused' }));
  });
  await new Promise<void>(ok => feed.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(feed.address() as AddressInfo).port}`;
});
after(() => new Promise<void>(ok => feed.close(() => ok())));

const signed = (ev: object, secret = SECRET, ts = Math.floor(Date.now() / 1000)) => {
  const raw = JSON.stringify(ev);
  return { raw, headers: { 'x-civicos-timestamp': String(ts), 'x-civicos-signature': `sha256=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`, 'x-civicos-event-id': (ev as { id: string }).id } };
};
const event = (id: string, action: string, seq: number) => ({ specversion: '1.0', id, source: '/civicos/platform', type: `org.civicos.${action}`, subject: 'Ministry:min-health', auditseq: seq, data: { action } });

test('events map to the registers they change', () => {
  assert.deepEqual(registersFor('org.civicos.ministry.rename'), ['institutions']);
  assert.deepEqual(registersFor('org.civicos.department.add'), ['institutions']);
  assert.deepEqual(registersFor('org.civicos.permit.approve'), ['permits']);
  assert.deepEqual(registersFor('org.civicos.federation.approved'), ['grants']);
  assert.deepEqual(registersFor('org.civicos.federation.exchange'), []);
  assert.deepEqual(registersFor('org.civicos.facility.publish'), []);
});

test('platform records become civic-api rows in the platform\'s tenants', () => {
  const b = toBatch(snap(10));
  assert.deepEqual(b.tenants.map(t => [t.id, t.kind, t.status]), [['platform:home', 'NATIONAL', 'ACTIVE'], ['platform:min-health', 'AGENCY', 'ACTIVE']]);
  assert.equal(b.institutions![0]!.tenantId, 'platform:home');
  assert.equal(b.institutions![0]!.departments[0]!.id, 'min-health:dep-1');
  assert.equal(b.permits![0]!.type, 'FOOD_HANDLING');
  assert.equal(b.permits![0]!.status, 'IN_REVIEW');
  assert.equal(b.permits![0]!.citizenId, null);
  assert.equal(b.payments!.bills[0]!.kind, 'PROPERTY_TAX');
  assert.equal(b.grants![0]!.toTenantId, 'platform:min-health');
  assert.equal(b.deployments![0]!.strategy, 'BLUE_GREEN');
  assert.equal(b.deployments![0]!.state, 'ROLLED_BACK');
  assert.equal(b.lifecycle!.length, 1);
  assert.equal(toBatch(snap(10)).lifecycle![0]!.id, b.lifecycle![0]!.id, 'stable ids, so re-syncs do not duplicate');
});

test('a signed event is applied once: rows, event and cursor in one write; redelivery and older events change nothing', async () => {
  const store = new MemoryStore();
  const f = new MirrorFollower(store, { base, key: KEY, secret: SECRET });
  feedCalls = []; feedStatus = 200; snapshot = snap(42, 'Ministry of Health and Care');

  const ev = event('evt-1', 'ministry.rename', 42);
  const d = signed(ev);
  const r1 = await f.receive(d.headers, d.raw);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.applied, true);
  assert.deepEqual(r1.body.registers, ['institutions']);
  assert.equal(feedCalls.length, 1);
  assert.equal(feedCalls[0]!.url, '/api/platform/mirror?registers=institutions');
  assert.equal(feedCalls[0]!.auth, `Bearer ${KEY}`, 'the follower reads with its own key');
  assert.equal(store.st.cursor, 42);
  assert.equal((store.rows.get('institutions:min-health') as { name: string }).name, 'Ministry of Health and Care');
  assert.equal(store.writes.length, 1);
  assert.deepEqual(store.writes[0]!.mark.event, { id: 'evt-1', auditSeq: 42, type: 'org.civicos.ministry.rename' });

  // The same delivery again (at least once): acknowledged, nothing read or written.
  const r2 = await f.receive(d.headers, d.raw);
  assert.equal(r2.status, 200);
  assert.equal(r2.body.applied, false);
  assert.equal(r2.body.reason, 'already applied');
  assert.equal(feedCalls.length, 1);
  assert.equal(store.writes.length, 1);

  // An event the mirror is already current past: covered, not read.
  const older = signed(event('evt-0', 'ministry.create', 40));
  const r3 = await f.receive(older.headers, older.raw);
  assert.equal(r3.body.applied, false);
  assert.match(String(r3.body.reason), /covered/);
  assert.equal(feedCalls.length, 1);
  assert.equal(store.st.cursor, 42, 'the cursor never goes back');

  // An event of a register civic-api does not mirror: the cursor moves, nothing is read.
  const other = signed(event('evt-2', 'facility.publish', 43));
  const r4 = await f.receive(other.headers, other.raw);
  assert.equal(r4.body.applied, true);
  assert.deepEqual(r4.body.registers, []);
  assert.equal(feedCalls.length, 1);
  assert.equal(store.st.cursor, 43);
});

test('deliveries that are not the subscription\'s are refused before anything is read', async () => {
  const store = new MemoryStore();
  const f = new MirrorFollower(store, { base, key: KEY, secret: SECRET });
  feedCalls = [];
  const ev = event('evt-9', 'permit.create', 7);
  const forged = signed(ev, 'whsec_someone-else');
  assert.equal((await f.receive(forged.headers, forged.raw)).status, 401);
  const stale = signed(ev, SECRET, Math.floor(Date.now() / 1000) - 3600);
  assert.equal((await f.receive(stale.headers, stale.raw)).status, 401);
  const good = signed(ev);
  const tampered = good.raw.replace('"auditseq":7', '"auditseq":8');
  assert.equal((await f.receive(good.headers, tampered)).status, 401);
  assert.equal((await f.receive({ ...good.headers, 'x-civicos-event-id': 'evt-other' }, good.raw)).status, 400);
  assert.equal((await f.receive({}, good.raw)).status, 401);
  assert.equal(feedCalls.length, 0);
  assert.equal(store.writes.length, 0);
  // No secret configured: the follower cannot check, so it refuses (503).
  const off = new MirrorFollower(store, { base, key: KEY });
  assert.equal((await off.receive(good.headers, good.raw)).status, 503);
});

test('a feed that fails leaves the event unacknowledged (the platform delivers it again)', async () => {
  const store = new MemoryStore();
  const f = new MirrorFollower(store, { base, key: KEY, secret: SECRET });
  feedStatus = 403;
  const d = signed(event('evt-5', 'permit.approve', 5));
  const r = await f.receive(d.headers, d.raw);
  assert.equal(r.status, 503);
  assert.match(String(r.body.error), /mirror feed answered 403/);
  assert.equal(store.applied.size, 0);
  assert.equal(store.st.cursor, 0);
  assert.match(String(store.st.lastError), /evt-5/);
  feedStatus = 200; snapshot = snap(5);
  assert.equal((await f.receive(d.headers, d.raw)).status, 200);
  assert.equal(store.applied.has('evt-5'), true);
});

test('full re-sync writes every register and moves the cursor to the platform\'s audit sequence', async () => {
  const store = new MemoryStore();
  const f = new MirrorFollower(store, { base, key: KEY, secret: SECRET });
  feedCalls = []; feedStatus = 200; snapshot = snap(100);
  const r = await f.fullSync(new Date('2026-10-19T12:00:00.000Z'));
  assert.equal(r.auditSeq, 100);
  assert.match(feedCalls[0]!.url, /registers=institutions%2Cpermits%2Cpayments%2Cincidents%2Creleases%2Cdeployments%2Cbackups%2Cconfigs%2Clifecycle%2Cintegrations%2Cgrants%2Cwebhooks$/);
  assert.equal(store.st.cursor, 100);
  assert.equal(store.st.lastFullSyncAt, '2026-10-19T12:00:00.000Z');
  assert.ok(store.rows.has('permits:PM-1'));
  // Then an event the re-sync already covers is not read again.
  const d = signed(event('evt-50', 'permit.create', 50));
  assert.equal((await f.receive(d.headers, d.raw)).body.applied, false);
  assert.equal(feedCalls.length, 1);
  // Without its key, the follower does not read the feed.
  await assert.rejects(new MirrorFollower(store, { base, secret: SECRET }).fullSync(), /CIVICOS_MIRROR_KEY/);
});

test('several followers at once: an older read never lands over a newer one', async () => {
  const store = new MemoryStore();
  // A newer event read (sequence 60) is written first; a slower full read from sequence 55 arrives after it.
  await store.write(toBatch(snap(60, 'Newer name')), { cursor: 58, dataSeq: 60, event: { id: 'evt-58', auditSeq: 58, type: 'org.civicos.ministry.rename' } });
  await store.write(toBatch(snap(55, 'Older name')), { cursor: 55, dataSeq: 55, fullSyncAt: new Date() });
  assert.equal((store.rows.get('institutions:min-health') as { name: string }).name, 'Newer name');
  assert.equal(store.st.cursor, 58);
  // A register the newer read did not carry is still written from the older one.
  const partial = { ...toBatch(snap(70, 'Latest')), permits: undefined };
  await store.write(onlyRegisters(partial, ['institutions']), { cursor: 70, dataSeq: 70 });
  assert.deepEqual(freshRegisters(toBatch(snap(65)), store.seqs, 65).stale.sort(), ['institutions']);
});
