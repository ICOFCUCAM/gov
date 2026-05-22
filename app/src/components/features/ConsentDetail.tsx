'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { consentById, revokeConsentRow, grantConsentRow, extendMyConsent } from '@/lib/db/repos/citizen';
import { substrateAvailable } from '@/lib/db/client';
import type { ConsentRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { consentStatusTone } from '@/lib/tone';

export function ConsentDetail({ id }: { id: string }) {
  const { actor, ready } = useIdentity();
  const [row, setRow] = React.useState<ConsentRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setRow(await consentById(id));
  }, [available, id]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  if (!available) {
    return <SubstrateNotConfigured title="Consent" />;
  }
  if (!row) {
    return (
      <Panel title="Consent" meta={id} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No consent record with id <span className="font-mono">{id}</span> is visible.{' '}
          <Link href="/wallet/substrate" className="text-link underline">Back to wallet</Link>
        </p>
      </Panel>
    );
  }

  const isMine = actor?.kind === 'citizen' && actor.id === row.citizen_id;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Consent</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: consentStatusTone(row.status), color: consentStatusTone(row.status) }}>
            {row.status}
          </span>
        </div>
        <Link href="/wallet/substrate" className="font-mono text-[10px] text-link underline">← wallet</Link>
      </div>

      <Panel title="Metadata" meta={row.id.slice(0, 8)} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Target charter" value={row.target_charter_id} mono />
          <Field label="Scope" value={row.scope} mono />
          <Field label="Status" value={row.status} />
          {row.granted_at ? <Field label="Granted" value={new Date(row.granted_at).toLocaleString()} /> : null}
          {row.revoked_at ? <Field label="Revoked" value={new Date(row.revoked_at).toLocaleString()} /> : null}
          {row.expires_at ? <Field label="Expires" value={new Date(row.expires_at).toLocaleString()} /> : null}
        </div>

        {isMine ? (
          <div className="flex flex-wrap gap-1">
            {row.status === 'granted' ? (
              <>
                <button type="button" disabled={busy}
                  onClick={async () => { setBusy(true); try { await revokeConsentRow(row.id); await refresh(); } finally { setBusy(false); } }}
                  className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                  revoke
                </button>
                <button type="button" disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const when = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                      await extendMyConsent(row.id, when);
                      await refresh();
                    } finally { setBusy(false); }
                  }}
                  className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                  extend 90d
                </button>
              </>
            ) : row.status === 'revoked' || row.status === 'expired' ? (
              <button type="button" disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try { await grantConsentRow(row.citizen_id, row.target_charter_id, row.scope); await refresh(); }
                  finally { setBusy(false); }
                }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                re-grant
              </button>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {row.payload && Object.keys(row.payload).length > 0 ? (
        <Panel title="Payload" meta="jsonb" bodyClass="!p-3 text-[10px]">
          <pre className="overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono">{JSON.stringify(row.payload, null, 2)}</pre>
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
