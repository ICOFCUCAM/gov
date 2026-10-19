// The mirror's rows in civic-api's own Postgres tables (MirrorStore,
// follower.ts). The only code in the service that writes its tables: one
// transaction per batch, with the event it applies and the cursor.
//
//  - Records are upserted by the platform's id; departments and module
//    activations of a mirrored ministry are replaced by the platform's set
//    (the platform removes departments).
//  - Receipts are append-only in civic-api (rules in migration 0002): a
//    mirrored receipt is inserted once, with the next sequence of its tenant.
//  - A mirrored release whose version and channel a row from before the
//    mirror already holds is left out (named in lastError), not forced.
//  - Rows from before the mirror, in civic-api's own tenants, are left as
//    they are; mirrored rows live in the platform's tenants (platform:<name>).

import { Prisma, type PrismaClient } from '@prisma/client';
import { freshRegisters, onlyRegisters, type MirrorBatch, type MirrorMark, type MirrorState, type MirrorStore } from './follower';

const STATE_ID = 'platform';
const KEEP_APPLIED = 5000;

type Tx = Prisma.TransactionClient;
const json = (v: unknown) => v as Prisma.InputJsonValue;

export class PrismaMirrorStore implements MirrorStore {
  constructor(private readonly prisma: PrismaClient) {}

  async state(): Promise<MirrorState> {
    const s = await this.prisma.mirrorState.findUnique({ where: { id: STATE_ID } });
    return {
      cursor: s?.cursor ?? 0,
      lastEventAt: s?.lastEventAt?.toISOString() ?? null,
      lastFullSyncAt: s?.lastFullSyncAt?.toISOString() ?? null,
      lastError: s?.lastError ?? null,
    };
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return !!(await this.prisma.mirrorAppliedEvent.findUnique({ where: { eventId } }));
  }

  async noteError(message: string): Promise<void> {
    await this.prisma.mirrorState.upsert({ where: { id: STATE_ID }, update: { lastError: message.slice(0, 2000) }, create: { id: STATE_ID, lastError: message.slice(0, 2000) } });
  }

  async write(batch: MirrorBatch, mark: MirrorMark): Promise<void> {
    const skipped: string[] = [];
    await this.prisma.$transaction(async tx => {
      // One writer at a time across replicas: the state row is locked for the transaction.
      await tx.mirrorState.upsert({ where: { id: STATE_ID }, update: {}, create: { id: STATE_ID } });
      const locked = await tx.$queryRaw<{ registerSeqs: Record<string, number> | null }[]>`SELECT "registerSeqs" FROM "MirrorState" WHERE "id" = ${STATE_ID} FOR UPDATE`;
      const fresh = freshRegisters(batch, locked[0]?.registerSeqs ?? {}, mark.dataSeq);
      if (fresh.stale.length) skipped.push(`older read of ${fresh.stale.join(', ')} (a newer one is written)`);
      const b = onlyRegisters(batch, fresh.write);
      const home = b.tenants.find(t => t.settings.home)?.id;
      // Row-level security (migration 0002) scopes tenant rows to app.tenant_id.
      if (home) await tx.$executeRaw`SELECT set_config('app.tenant_id', ${home}, true)`;
      for (const t of b.tenants) {
        await tx.tenant.upsert({
          where: { id: t.id },
          update: { name: t.name, status: t.status as never, country: t.country, settings: json(t.settings) },
          create: { id: t.id, slug: t.slug, name: t.name, kind: t.kind, status: t.status as never, country: t.country, officialLangs: [], settings: json(t.settings) },
        });
      }
      for (const m of b.institutions ?? []) await this.ministry(tx, m);
      for (const p of b.permits ?? []) {
        const data = { tenantId: p.tenantId, citizenId: null, applicantName: p.applicantName, municipality: p.municipality, type: p.type as never, title: p.title, status: p.status as never, fields: json(p.fields), aiClass: p.aiClass, submittedAt: p.submittedAt, decisionDueAt: p.decisionDueAt };
        await tx.permit.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
        for (const t of p.timeline) {
          const row = { permitId: p.id, status: t.status as never, note: t.note, officerName: t.officerName, at: t.at };
          await tx.permitTransition.upsert({ where: { id: t.id }, update: row, create: { id: t.id, ...row } });
        }
      }
      if (b.payments) {
        for (const x of b.payments.bills) {
          const data = { tenantId: x.tenantId, citizenId: null, kind: x.kind as never, description: x.description, amountMinor: x.amountMinor, currency: x.currency, dueDate: x.dueDate, status: x.status as never };
          await tx.bill.upsert({ where: { id: x.id }, update: data, create: { id: x.id, ...data } });
        }
        for (const r of b.payments.receipts) {
          if (await tx.receipt.findUnique({ where: { id: r.id } })) continue; // receipts never change
          const last = await tx.receipt.findFirst({ where: { tenantId: r.tenantId }, orderBy: { seq: 'desc' }, select: { seq: true } });
          const bill = await tx.bill.findUnique({ where: { id: r.billId }, select: { id: true } });
          await tx.receipt.create({ data: { id: r.id, tenantId: r.tenantId, billId: bill ? r.billId : null, kind: r.kind, payload: json(r.payload), amountMinor: r.amountMinor, currency: r.currency, rail: r.rail, prevHash: r.prevHash, hash: r.hash, seq: (last?.seq ?? 0) + 1, createdAt: r.createdAt } });
        }
      }
      for (const i of b.incidents ?? []) {
        const data = { tenantId: i.tenantId, severity: i.severity as never, title: i.title, scope: i.scope, status: i.status as never, owner: i.owner, openedAt: i.openedAt, acknowledgedAt: i.acknowledgedAt, resolvedAt: i.resolvedAt, events: json(i.events) };
        await tx.incident.upsert({ where: { id: i.id }, update: data, create: { id: i.id, ...data } });
      }
      for (const r of b.releases ?? []) {
        const clash = await tx.release.findFirst({ where: { version: r.version, channel: r.channel as never, NOT: { id: r.id } }, select: { id: true } });
        if (clash) { skipped.push(`release ${r.id} (${r.version}/${r.channel}: row ${clash.id} from before the mirror holds it)`); continue; }
        const data = { version: r.version, channel: r.channel as never, status: r.status as never, notes: r.notes, schemaMigration: r.schemaMigration, approvedBy: r.approvedBy, createdAt: r.createdAt };
        await tx.release.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } });
      }
      for (const d of b.deployments ?? []) {
        if (!(await tx.release.findUnique({ where: { id: d.releaseId }, select: { id: true } }))) { skipped.push(`deployment ${d.id} (release ${d.releaseId} not mirrored)`); continue; }
        const data = { tenantId: d.tenantId, releaseId: d.releaseId, strategy: d.strategy as never, state: d.state as never, gates: json(d.gates), startedAt: d.startedAt, completedAt: d.completedAt };
        await tx.deployment.upsert({ where: { id: d.id }, update: data, create: { id: d.id, ...data } });
      }
      for (const x of b.backups ?? []) {
        const data = { tenantId: x.tenantId, kind: x.kind as never, status: x.status as never, location: x.location, encrypted: x.encrypted, sizeBytes: x.sizeBytes === null ? null : BigInt(x.sizeBytes), createdAt: x.createdAt };
        await tx.backupRecord.upsert({ where: { id: x.id }, update: data, create: { id: x.id, ...data } });
      }
      for (const c of b.configs ?? []) {
        const data = { tenantId: null, scope: c.scope as never, version: c.version, contentHash: c.contentHash, signedBy: c.signedBy, status: c.status as never, createdAt: c.createdAt };
        await tx.configBundle.upsert({ where: { id: c.id }, update: data, create: { id: c.id, payload: json({ heldBy: 'platform' }), ...data } });
      }
      for (const e of b.lifecycle ?? []) {
        await tx.tenantLifecycleEvent.upsert({ where: { id: e.id }, update: {}, create: e });
      }
      for (const c of b.integrations ?? []) {
        const data = { tenantId: c.tenantId, kind: c.kind as never, name: c.name, ownerOrg: c.ownerOrg, contact: c.contact, keyHash: c.keyHash, scopes: c.scopes, status: c.status as never, rateLimitRpm: c.rateLimitRpm, approvedBy: c.approvedBy, createdAt: c.createdAt };
        await tx.integrationClient.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } });
      }
      for (const g of b.grants ?? []) {
        const data = { fromTenantId: g.fromTenantId, toTenantId: g.toTenantId, scopes: g.scopes, status: g.status as never, reason: g.reason, approvedBy: g.approvedBy, expiresAt: g.expiresAt, createdAt: g.createdAt };
        await tx.federationGrant.upsert({ where: { id: g.id }, update: data, create: { id: g.id, ...data } });
      }
      for (const w of b.webhooks ?? []) {
        const data = { tenantId: w.tenantId, topic: w.topic, url: w.url, secretHash: w.secretHash, status: w.status as never, failures: w.failures, createdAt: w.createdAt };
        await tx.webhookSubscription.upsert({ where: { id: w.id }, update: data, create: { id: w.id, ...data } });
      }

      const now = new Date();
      const prev = await tx.mirrorState.findUnique({ where: { id: STATE_ID } });
      const cursor = Math.max(prev?.cursor ?? 0, mark.cursor);
      const note = skipped.length ? `Left out: ${skipped.join('; ')}`.slice(0, 2000) : null;
      const fields = { cursor, registerSeqs: json(fresh.seqs), ...(mark.event ? { lastEventAt: now } : {}), ...(mark.fullSyncAt ? { lastFullSyncAt: mark.fullSyncAt } : {}), lastError: note };
      await tx.mirrorState.upsert({ where: { id: STATE_ID }, update: fields, create: { id: STATE_ID, ...fields } });
      if (mark.event) {
        await tx.mirrorAppliedEvent.upsert({ where: { eventId: mark.event.id }, update: {}, create: { eventId: mark.event.id, auditSeq: mark.event.auditSeq, type: mark.event.type } });
        const old = await tx.mirrorAppliedEvent.findMany({ orderBy: { auditSeq: 'desc' }, skip: KEEP_APPLIED, take: 1, select: { auditSeq: true } });
        if (old[0]) await tx.mirrorAppliedEvent.deleteMany({ where: { auditSeq: { lte: old[0].auditSeq } } });
      }
    }, { timeout: 60_000 });
  }

  private async ministry(tx: Tx, m: NonNullable<MirrorBatch['institutions']>[number]): Promise<void> {
    const data = { tenantId: m.tenantId, slug: m.slug, name: m.name, archetype: m.archetype as never, status: m.status as never, mergedIntoId: m.mergedIntoId, createdAt: m.createdAt };
    await tx.ministry.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } });
    // The platform's departments and modules are the set; the platform removes departments.
    await tx.department.deleteMany({ where: { ministryId: m.id, id: { notIn: m.departments.map(d => d.id) } } });
    for (const d of m.departments) {
      // A name another (removed) department held is freed first: @@unique([ministryId, name]).
      await tx.department.deleteMany({ where: { ministryId: m.id, name: d.name, NOT: { id: d.id } } });
      await tx.department.upsert({ where: { id: d.id }, update: { ministryId: m.id, name: d.name }, create: d });
    }
    await tx.moduleActivation.deleteMany({ where: { ministryId: m.id, moduleKey: { notIn: m.modules.map(x => x.moduleKey) } } });
    for (const x of m.modules) {
      await tx.moduleActivation.upsert({ where: { ministryId_moduleKey: { ministryId: m.id, moduleKey: x.moduleKey } }, update: { enabled: x.enabled }, create: x });
    }
  }
}
