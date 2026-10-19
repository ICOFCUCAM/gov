// The mirror feed (review D8): the registers that services/civic-api mirrors,
// read in one step with the audit sequence they are current to, so its mirror
// follower can write its own tables from the platform that owns them.
// civic-api reads it with its own integration key (scope `mirror:read`,
// registered and approved in Integrations); its webhook subscription (topic
// `*`) says when to read again. Read only: no credential of a caller and no
// key is ever in it (integration keys and webhook secrets stay hashed or
// sealed here). An official's session reads it too (the middleware's gate).
//
// ?registers=institutions,permits,… narrows it (default every register):
// institutions, permits, payments, incidents, releases, deployments, backups,
// configs, lifecycle, integrations, grants, webhooks.
import { NextRequest, NextResponse } from 'next/server';
import {
  auditHead, getLifecycle, getSovereign, listBackups, listBills, listConfigs, listDeployments, listGrants, listIncidents,
  listIntegrations, listMinistries, listPermits, listReceipts, listReleases, listWebhooks, verifyIntegrationKey,
} from '@/lib/data/store';
import { nationIso3 } from '@/lib/nation/registry';

export const dynamic = 'force-dynamic';

/** The scope an integration needs to read the mirror feed. */
const MIRROR_READ_SCOPE = 'mirror:read';

const REGISTERS = {
  institutions: () => listMinistries(),
  permits: () => listPermits(),
  payments: () => ({ bills: listBills(), receipts: listReceipts() }),
  incidents: () => listIncidents(),
  releases: () => listReleases(),
  deployments: () => listDeployments(),
  backups: () => listBackups(),
  configs: () => listConfigs(),
  lifecycle: () => getLifecycle(),
  // Without keys: the client list never holds them (only their hashes, kept apart).
  integrations: () => listIntegrations().map(({ id, kind, name, ownerOrg, scopes, status, rateLimitRpm, createdAt, approvedBy }) => ({ id, kind, name, ownerOrg, scopes, status, rateLimitRpm, createdAt, approvedBy })),
  grants: () => listGrants(),
  webhooks: () => listWebhooks().map(({ id, topic, url, status, failures, createdAt }) => ({ id, topic, url, status, failures, createdAt })),
} as const;
type Register = keyof typeof REGISTERS;

/**
 * @example response 200 {"at":"2026-10-19T12:00:00.000Z","auditSeq":1042,"tenant":{"name":"home","stateName":"Republic of Example","iso3":"KEN","state":"active"},"registers":{"institutions":[{"id":"min-health","slug":"health","name":"Ministry of Health","archetype":"HEALTH","status":"active","createdAt":"2026-01-01T00:00:00.000Z","departments":[{"id":"dep-health-hospitals","name":"Hospitals"}],"modules":[{"moduleKey":"hospitals","enabled":true}]}]}}
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth) {
    const r = verifyIntegrationKey(auth, MIRROR_READ_SCOPE);
    if (!r.ok) {
      const res = NextResponse.json({ error: r.error }, { status: r.status });
      if (r.status === 401) res.headers.set('WWW-Authenticate', `Bearer realm="civicos-mirror", scope="${MIRROR_READ_SCOPE}"`);
      if (r.retryAfterSeconds) res.headers.set('Retry-After', String(r.retryAfterSeconds));
      return res;
    }
  }
  const asked = (req.nextUrl.searchParams.get('registers') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const unknown = asked.filter(a => !(a in REGISTERS));
  if (unknown.length) return NextResponse.json({ error: `Unknown register: ${unknown.join(', ')}. Known: ${Object.keys(REGISTERS).join(', ')}` }, { status: 400 });
  const want = (asked.length ? asked : Object.keys(REGISTERS)) as Register[];
  // One synchronous read: every register and the audit sequence are of the same moment.
  const lifecycle = getLifecycle();
  const sovereign = getSovereign();
  const registers: Partial<Record<Register, unknown>> = {};
  for (const k of want) registers[k] = REGISTERS[k]();
  return NextResponse.json({
    at: new Date().toISOString(),
    auditSeq: auditHead()?.seq ?? 0,
    tenant: { name: lifecycle.tenant, stateName: sovereign.stateName, iso3: nationIso3() ?? null, state: lifecycle.state },
    registers,
  }, { headers: { 'cache-control': 'no-store' } });
}
