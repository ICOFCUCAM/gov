'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable, publicClient } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { registerSigningKeyRow } from '@/lib/db/repos/identity';
import { refreshIdentity } from '@/services/identity';
import { ensureSigningKey, publicSigningJwk } from '@/lib/db/webcrypto';
import { signOut } from '@/lib/db/auth';
import { myRecentStepsRows, type ActorStepRow } from '@/lib/db/repos/work-items';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { PostureBadge } from '@/components/identity/PostureBadge';

interface OfficerSelf {
  id: string;
  name: string;
  email: string | null;
  role: string;
  charter_id: string | null;
  active: boolean;
  signing_public_key: JsonWebKey | null;
  created_at: string;
  updated_at: string;
}

/**
 * OfficerProfile — the signed-in actor's own record + key management.
 *
 * Shows what the substrate knows about you (name, role, charter,
 * active status, when the record was created and last updated, and
 * whether your signing public key is registered). Lets you:
 *   • Generate / re-register your WebCrypto signing key (per device)
 *   • Sign out
 *
 * Citizens see a simplified version — no key affordance, since the
 * signing flow is officer-side today.
 */
export function OfficerProfile() {
  const { actor, session, ready } = useIdentity();
  const [self, setSelf] = React.useState<OfficerSelf | null>(null);
  const [deviceJwk, setDeviceJwk] = React.useState<JsonWebKey | null>(null);
  const [busy, setBusy] = React.useState<'register' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [activity, setActivity] = React.useState<ActorStepRow[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    const sb = publicClient();
    if (!sb || !actor || actor.kind !== 'officer') { setSelf(null); return; }
    const { data, error } = await sb.from('civicos_officers').select('*')
      .eq('id', actor.id).limit(1).maybeSingle();
    if (error || !data) { setSelf(null); return; }
    setSelf(data as OfficerSelf);
  }, [actor]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    void publicSigningJwk().then(jwk => setDeviceJwk(jwk));
  }, []);

  const refreshActivity = React.useCallback(async () => {
    if (!actor || actor.kind !== 'officer') { setActivity([]); return; }
    setActivity(await myRecentStepsRows(actor.id, 30));
  }, [actor]);

  React.useEffect(() => { if (ready) void refreshActivity(); }, [ready, refreshActivity]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_item_steps' as const }], []),
    refreshActivity,
  );

  if (!available) {
    return (
      <Panel title="Profile" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  if (!session) {
    return (
      <Panel title="Profile" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">Sign in to view your substrate profile.</p>
        <a href="/sign-in?from=/gov/me"
           className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          Sign in
        </a>
      </Panel>
    );
  }

  const isCitizen = actor?.kind === 'citizen';

  async function registerKey() {
    setBusy('register'); setError(null); setInfo(null);
    try {
      await ensureSigningKey();
      const jwk = await publicSigningJwk();
      if (!jwk) { setError('WebCrypto not available on this device'); return; }
      const row = await registerSigningKeyRow(jwk);
      if (!row) { setError('register_signing_key RPC failed'); return; }
      setDeviceJwk(jwk);
      setInfo('Public key registered for this device.');
      await refresh();
      await refreshIdentity();
    } finally {
      setBusy(null);
    }
  }

  const fingerprint = (jwk: JsonWebKey | null) => {
    if (!jwk) return null;
    // Lightweight fingerprint — first 12 chars of base64url(JSON(JWK)).
    try {
      const s = JSON.stringify(jwk);
      let hash = 0;
      for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
      const hex = (hash >>> 0).toString(16).padStart(8, '0');
      return `${jwk.kty ?? '?'}:${jwk.crv ?? '?'}:${hex}`;
    } catch { return null; }
  };

  const deviceFp = fingerprint(deviceJwk);
  const registeredFp = fingerprint(self?.signing_public_key ?? null);
  const keysMatch = deviceFp && registeredFp && deviceFp === registeredFp;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Profile</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            self · keys · session
          </span>
          {actor?.kind === 'officer' && actor.charterId ? <PostureBadge charterId={actor.charterId} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window === 'undefined') return;
              if (!confirm('Clear all per-device preferences, the watchlist, and the "seen" set? Your substrate records are unaffected.')) return;
              const keys: string[] = [];
              for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && (k.startsWith('civicos.pref.') || k.startsWith('civicos.watchlist.') || k.startsWith('civicos.seen.'))) keys.push(k);
              }
              keys.forEach(k => window.localStorage.removeItem(k));
              alert(`Cleared ${keys.length} keys.`);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            clear local state
          </button>
          <button
            type="button"
            onClick={async () => { await signOut(); window.location.href = '/'; }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            sign out
          </button>
        </div>
      </div>

      <Panel title="Session" meta={session.user.email ?? ''} bodyClass="!p-3 text-[11px]">
        <div className="grid grid-cols-2 gap-2">
          <Field label="auth.uid" value={session.user.id} mono />
          <Field label="Email" value={session.user.email ?? '—'} mono />
          {actor ? (
            <>
              <Field label="Kind" value={actor.kind} />
              <Field label="Name" value={actor.name} />
              {actor.kind === 'officer' ? (
                <>
                  <Field label="Role" value={actor.role ?? '—'} />
                  <Field label="Charter" value={actor.charterId ?? '—'} mono />
                </>
              ) : null}
            </>
          ) : (
            <Field label="Profile" value="unlinked" />
          )}
        </div>
      </Panel>

      {self ? (
        <Panel title="Officer record" meta={self.id} bodyClass="!p-3 text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Active" value={self.active ? 'yes' : 'no'} />
            <Field label="Updated" value={new Date(self.updated_at).toLocaleString()} />
            <Field label="Created" value={new Date(self.created_at).toLocaleString()} />
            <Field label="Joined" value={self.charter_id ?? '—'} mono />
          </div>
        </Panel>
      ) : null}

      {!isCitizen ? (
        <Panel title="My recent activity" meta={`${activity.length} steps`} bodyClass="!p-0">
          {activity.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No transitions attributed to you yet.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {activity.map(s => (
                <div key={s.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{s.seq}</span>
                    <span className="w-20 shrink-0 truncate font-mono text-link">{s.action}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{s.work_item_title}</span>
                    <span className="w-24 shrink-0 truncate text-right font-mono text-ink-soft">{s.work_item_ref}</span>
                    <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">
                      {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                    <span>{s.from_stage ?? '—'} → {s.to_stage}</span>
                    {s.signature_hash ? (
                      <span className="ml-auto">{s.signature_hash.length === 8 ? 'digest' : 'ECDSA'} · {s.signature_hash.slice(0, 12)}…</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {!isCitizen ? (
        <Panel title="Signing keys" meta={keysMatch ? 'matched' : registeredFp ? 'mismatch' : 'unregistered'} bodyClass="!p-3 text-[11px] space-y-2">
          <p className="text-ink-muted">
            Your ECDSA P-256 private key lives on this device in IndexedDB and never
            leaves it. The public JWK is registered to the substrate so any auditor
            can verify your signatures offline.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="This device" value={deviceFp ?? '(no key yet)'} mono />
            <Field label="Registered" value={registeredFp ?? '(not registered)'} mono />
          </div>
          {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
          {info  ? <p className="text-[10px]" style={{ color: TONE.ok }}>{info}</p>     : null}
          <div className="flex gap-2">
            <button type="button" disabled={busy === 'register'}
              onClick={() => { void registerKey(); }}
              className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
              {busy === 'register' ? 'registering…'
                : registeredFp == null ? 'generate + register key'
                : keysMatch ? 're-register this device'
                : 'register this device (replaces previous)'}
            </button>
          </div>
          {!keysMatch && registeredFp ? (
            <p className="text-[10px]" style={{ color: TONE.warn }}>
              Heads up: a different device's public key is currently registered.
              Re-registering will replace it; existing signatures from the previous
              device will no longer verify against the new key.
            </p>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
