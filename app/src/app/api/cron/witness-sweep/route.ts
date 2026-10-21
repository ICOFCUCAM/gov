// Witness-sweep cron — emits a substrate-self attestation per visible
// scope. The substrate becomes its own first witness, so even before any
// external auditor signs the chain there's a continuous attestation
// timeline. Any divergence between the cron's recorded hash and the
// live hash is a tamper indicator.
//
// Auth: CIVICOS_CRON_SECRET as Authorization: Bearer (header only).
// Cadence: recommended every 15 minutes. Idempotent per (scope, seq):
// attestations are insert-only, so a point already attested is reported as
// such and never replaced.
//
// Signed (go-live review H-1): the platform signs `scope|seq|hash|label` with
// its audit signing key (Ed25519, lib/keys/custody.ts) and registers that
// public key for the self-witness label before its first attestation of the
// run (idempotent), so the divergence watchdog can verify these rows like
// any other witness's.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { serverClient } from '@/lib/db/client';
import { signer, developmentKeyRefusal } from '@/lib/keys/custody';
import { canonicalWitnessMaterial } from '@/lib/db/signatures';
import { base64ToHex, jwkFromPublicPem } from '@/lib/audit/witness-signature';

export const dynamic = 'force-dynamic';

const WITNESS_LABEL = 'substrate-self-witness';

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

async function runJob(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  // A production installation never witnesses with a development key (step I0.1).
  const keyRefused = developmentKeyRefusal('audit');
  if (keyRefused) return NextResponse.json({ error: keyRefused }, { status: 503 });

  const url = new URL(req.url);
  const scopeLimit = Math.max(1, Number(url.searchParams.get('scopes') ?? '50') | 0);

  const { data: scopeRows } = await sb
    .from('civicos_audit_entries').select('scope')
    .order('at', { ascending: false }).limit(500);
  const scopes = Array.from(new Set(((scopeRows ?? []) as { scope: string }[]).map(r => r.scope))).slice(0, scopeLimit);

  const results: { scope: string; latestSeq: number | null; attested: boolean; already?: boolean }[] = [];
  const audit = signer('audit');
  let jwk: ReturnType<typeof jwkFromPublicPem> | null = null;
  for (const scope of scopes) {
    const { data: latest } = await sb.from('civicos_audit_entries')
      .select('seq,hash')
      .eq('scope', scope)
      .order('seq', { ascending: false })
      .limit(1);
    const row = (latest as { seq: number; hash: string }[] | null)?.[0];
    if (!row) {
      results.push({ scope, latestSeq: null, attested: false });
      continue;
    }
    if (!jwk) {
      // Register this platform's current public key for the self-witness (idempotent).
      const half = await audit.load();
      jwk = jwkFromPublicPem(half.publicKeyPem);
      const { error: kErr } = await sb.rpc('civicos_register_witness_key', {
        p_witness_label: WITNESS_LABEL, p_public_jwk: jwk as never, p_registered_by: 'witness-sweep (platform)',
      });
      if (kErr) return NextResponse.json({ error: 'could not register the self-witness key' }, { status: 502 });
    }
    const sig = await audit.sign(canonicalWitnessMaterial(scope, row.seq, row.hash, WITNESS_LABEL));
    const { error } = await sb.rpc('civicos_record_witness_attestation', {
      p_scope: scope,
      p_observed_seq: row.seq,
      p_observed_hash: row.hash,
      p_witness_label: WITNESS_LABEL,
      p_witness_jwk: jwk as never,
      p_witness_signature: base64ToHex(sig.signature),
    });
    const already = (error as { code?: string } | null)?.code === '23505';
    results.push({ scope, latestSeq: row.seq, attested: !error || already, ...(already ? { already: true } : {}) });
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    witness_label: WITNESS_LABEL,
    scopes_swept: results.length,
    attested: results.filter(r => r.attested).length,
    results,
  });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const GET = cronRoute('witness-sweep', runJob);
export const POST = GET;
