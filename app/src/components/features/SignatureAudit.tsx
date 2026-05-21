'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { recentSignedStepsRows, fetchOfficerPublicKey, type SignedStepRow } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { canonicalSignatureMaterial } from '@/lib/db/signatures';
import { verifyMessage } from '@/lib/db/webcrypto';

type VerificationStatus = 'pending' | 'verified' | 'failed' | 'no-key' | 'digest' | 'unsupported';

interface VerificationResult {
  step: SignedStepRow;
  status: VerificationStatus;
  detail: string;
}

const tone: Record<VerificationStatus, string | undefined> = {
  verified: TONE.ok,
  failed:   TONE.alert,
  digest:   TONE.warn,
  pending:  TONE.link,
  'no-key': TONE.warn,
  unsupported: TONE.neutral,
};

const label: Record<VerificationStatus, string> = {
  verified: 'verified',
  failed:   'failed',
  digest:   'digest',
  pending:  'pending',
  'no-key': 'no key',
  unsupported: 'unsupported',
};

/**
 * SignatureAudit — auditor's verification surface.
 *
 * Walks recent signed work_item_steps and verifies each signature
 * against the actor officer's registered public JWK. Three outcomes:
 *
 *   verified  — ECDSA signature checked out against the actor's JWK.
 *   failed    — signature didn't match (genuine tamper).
 *   digest    — 8-char FNV-1a digest (fallback, tamper-evident but
 *               not identity-proof).
 *   no-key    — actor has no registered signing key; ECDSA sig can't
 *               be checked.
 *
 * The verification happens entirely in the browser. The substrate
 * provides the raw step + JWK; the page re-derives the canonical
 * material and runs WebCrypto verify locally — no trust in the
 * runtime that produced the signature.
 */
export function SignatureAudit() {
  const { ready } = useIdentity();
  const [results, setResults] = React.useState<VerificationResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      const steps = await recentSignedStepsRows(40);
      // Fetch JWKs in parallel, dedup by actor_id.
      const actorIds = Array.from(new Set(
        steps.map(s => s.actor_id).filter((x): x is string => x != null),
      ));
      const jwks = new Map<string, JsonWebKey | null>();
      await Promise.all(actorIds.map(async id => {
        jwks.set(id, await fetchOfficerPublicKey(id));
      }));

      const verifications = await Promise.all(steps.map(async (s): Promise<VerificationResult> => {
        if (!s.signature_hash) return { step: s, status: 'pending', detail: 'no signature' };
        if (s.signature_hash.length === 8) {
          return { step: s, status: 'digest', detail: 'FNV-1a fallback' };
        }
        if (!s.actor_id) return { step: s, status: 'no-key', detail: 'no actor_id on step' };
        const jwk = jwks.get(s.actor_id);
        if (!jwk) return { step: s, status: 'no-key', detail: 'actor has no registered signing key' };
        const at = s.signed_at ? new Date(s.signed_at).getTime() : new Date(s.at).getTime();
        // Canonical material: <actor_id>|<scope>|<ref>|<action>|<at_ms>
        // — the exact form the runtime signs in lib/db/signatures.
        const message = canonicalSignatureMaterial(
          s.actor_id, s.work_item_scope, s.work_item_ref, s.action, at,
        );
        const ok = await verifyMessage(jwk, message, s.signature_hash);
        if (ok == null) return { step: s, status: 'unsupported', detail: 'WebCrypto unavailable' };
        return ok
          ? { step: s, status: 'verified', detail: 'ECDSA P-256 ✓' }
          : { step: s, status: 'failed', detail: 'signature mismatch' };
      }));
      setResults(verifications);
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_item_steps' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Signature Audit" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  const tallies = results.reduce<Record<VerificationStatus, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
  }, { pending: 0, verified: 0, failed: 0, 'no-key': 0, digest: 0, unsupported: 0 });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Signature Audit</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            client-side · WebCrypto verify
          </span>
        </div>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          disabled={loading}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
        >
          {loading ? 'verifying…' : 'refresh'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(['verified','failed','digest','no-key','unsupported','pending'] as const).map(k => (
          <div key={k} className="rounded-[3px] border border-line bg-surface px-3 py-2">
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label[k]}</div>
            <div className="font-mono text-[15px] tabular-nums" style={{ color: tone[k] }}>{tallies[k]}</div>
          </div>
        ))}
      </div>

      <Panel title="Recent signed steps" meta={`${results.length}`} bodyClass="!p-0">
        {results.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No signed steps in scope. Take an approve/reject/resolve action on
            a persistent work item while signed in as an officer.
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {results.map(r => (
              <div key={r.step.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{r.step.seq}</span>
                  <span className="w-20 shrink-0 truncate font-mono text-link">{r.step.action}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {r.step.from_stage ?? '—'} → {r.step.to_stage}
                  </span>
                  <span className="w-32 shrink-0 truncate text-right text-ink-soft">{r.step.actor_name}</span>
                  <span
                    className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: tone[r.status] }}
                  >
                    {label[r.status]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                  <span className="truncate">{r.detail}</span>
                  {r.step.signature_hash ? (
                    <span className="ml-auto truncate">
                      sig {r.step.signature_hash.slice(0, 16)}{r.step.signature_hash.length > 16 ? '…' : ''}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Verification runs in the browser using WebCrypto SubtleCrypto.verify.
        Each ECDSA P-256 signature is checked against the actor officer's
        registered public JWK; the substrate is not asked whether a
        signature is valid — only for the materials.
      </p>
    </div>
  );
}

