// The Prisma mirror store against a real Postgres with civic-api's
// migrations (row-level security, the receipt rule): after a platform
// restore it removes the platform tenant's rows the restored read no longer
// holds, keeps payment records (receipts are append-only) and names them, and leaves
// rows of other tenants alone. Runs when MIRROR_TEST_DATABASE_URL names a
// migrated, throwaway database; skipped otherwise.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { PrismaMirrorStore } from '../src/mirror/prisma-store';
import { toBatch, type PlatformSnapshot } from '../src/mirror/follower';

const URL = process.env.MIRROR_TEST_DATABASE_URL;
const prisma = URL ? new PrismaClient({ datasources: { db: { url: URL } } }) : null;
after(async () => { await prisma?.$disconnect(); });

const snap = (auditSeq: number, extra: boolean): PlatformSnapshot => ({
  at: '2026-10-19T00:00:00.000Z', auditSeq,
  tenant: { name: 'drill', stateName: 'Republic of Example', iso3: 'KEN', state: 'active' },
  registers: {
    institutions: [
      { id: 'min-a', slug: 'a', name: 'Ministry A', archetype: 'HEALTH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', departments: [{ id: 'dep-a', name: 'Hospitals' }], modules: [{ moduleKey: 'hospitals', enabled: true }] },
      ...(extra ? [{ id: 'min-b', slug: 'b', name: 'Ministry B', archetype: 'HEALTH', status: 'active', createdAt: '2026-01-02T00:00:00.000Z', departments: [{ id: 'dep-b', name: 'Clinics' }], modules: [{ moduleKey: 'clinics', enabled: true }] }] : []),
    ],
    permits: [
      { id: 'PM-1', type: 'food-handling', title: 'Kiosk', applicantName: 'A', municipality: 'M', status: 'in-review', fields: {}, timeline: [{ status: 'submitted', at: '2026-01-02T00:00:00.000Z' }] },
      ...(extra ? [{ id: 'PM-2', type: 'food-handling', title: 'Stall', applicantName: 'B', municipality: 'M', status: 'submitted', fields: {}, timeline: [{ status: 'submitted', at: '2026-10-02T00:00:00.000Z' }] }] : []),
    ],
    payments: {
      bills: [
        { id: 'B-1', kind: 'property-tax', description: 'Rates', amountMinor: 1000, currency: 'KES', dueDate: '2026-11-01T00:00:00.000Z', status: 'due' },
        ...(extra ? [
          { id: 'B-2', kind: 'permit-fee', description: 'Fee', amountMinor: 500, currency: 'KES', dueDate: '2026-11-01T00:00:00.000Z', status: 'paid' },
          { id: 'B-3', kind: 'permit-fee', description: 'Fee', amountMinor: 700, currency: 'KES', dueDate: '2026-11-01T00:00:00.000Z', status: 'due' },
        ] : []),
      ],
      receipts: extra ? [{ id: 'R-2', billId: 'B-2', kind: 'payment', payload: {}, amountMinor: 500, currency: 'KES', rail: 'bank', prevHash: '0', hash: 'h2', createdAt: '2026-10-19T00:00:00.000Z' }] : [],
    },
  } as never,
});

test('after a platform restore the Prisma store removes what the restore took back, keeps payment records for reconciliation, and leaves other tenants alone', { skip: !prisma && 'MIRROR_TEST_DATABASE_URL not set' }, async () => {
  const db = prisma!;
  const store = new PrismaMirrorStore(db);
  // A row from before the mirror, in civic-api's own tenant.
  await db.tenant.upsert({ where: { id: 'own-tenant' }, update: {}, create: { id: 'own-tenant', slug: 'own', name: 'Own', kind: 'NATIONAL', status: 'ACTIVE' as never, country: 'KEN', officialLangs: [], settings: {} } });
  await db.permit.upsert({ where: { id: 'OWN-1' }, update: {}, create: { id: 'OWN-1', tenantId: 'own-tenant', applicantName: 'Own', municipality: 'M', type: 'FOOD_HANDLING' as never, title: 'Own permit', status: 'SUBMITTED' as never, fields: {}, submittedAt: new Date() } }).catch(e => { throw new Error(`seeding a pre-mirror permit: ${(e as Error).message}`); });

  await store.write(toBatch(snap(90, true)), { cursor: 90, dataSeq: 90, fullSyncAt: new Date() });
  assert.equal(await db.permit.count({ where: { id: { in: ['PM-1', 'PM-2'] } } }), 2);
  assert.equal(await db.ministry.count({ where: { id: { in: ['min-a', 'min-b'] } } }), 2);
  assert.equal(await db.receipt.count({ where: { id: 'R-2' } }), 1);

  await store.write(toBatch(snap(61, false)), { cursor: 61, dataSeq: 61, fullSyncAt: new Date(), restore: true, event: { id: 'evt-restore-drill', auditSeq: 61, type: 'org.civicos.backup.restore' } });
  assert.equal(await db.permit.count({ where: { id: 'PM-2' } }), 0, 'the permit the restore took back is removed');
  assert.equal(await db.permitTransition.count({ where: { permitId: 'PM-2' } }), 0);
  assert.equal(await db.ministry.count({ where: { id: 'min-b' } }), 0, 'so is the ministry, with its departments and modules');
  assert.equal(await db.department.count({ where: { id: 'dep-b' } }), 0);
  assert.equal(await db.receipt.count({ where: { id: 'R-2' } }), 1, 'a receipt is never deleted');
  assert.equal(await db.bill.count({ where: { id: { in: ['B-2', 'B-3'] } } }), 2, 'nor is a bill');
  assert.equal(await db.permit.count({ where: { id: { in: ['PM-1', 'OWN-1'] } } }), 2, 'what the platform holds, and other tenants\' rows, stay');
  const st = await store.state();
  assert.equal(st.cursor, 61);
  assert.match(String(st.lastError), /restore removed rows the platform no longer holds: 1 permits, 1 institutions/);
  assert.match(String(st.lastError), /kept for reconciliation with the payments team: 1 receipt\(s\) \(R-2\), 2 bill\(s\) \((B-2, B-3|B-3, B-2)\)/);
});
