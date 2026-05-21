'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { auditTrailRows, verifyChainRow, type AuditEntry } from '@/lib/db/repos/audit';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { downloadJson } from '@/lib/csv-download';

/** AuditEntryDetail — single entry within its chain context.
 *  URL: /gov/audit/[scope]/[seq]. Resolves the scope's chain and
 *  pulls the entry by seq, showing prev/next entries so the hash
 *  linkage is visible at a glance. Verification is on-demand. */
export function AuditEntryDetail({ scope, seq }: { scope: string; seq: number }) {
  const { ready } = useIdentity();
  const [trail, setTrail] = React.useState<AuditEntry[]>([]);
  const [verifying, setVerifying] = React.useState(false);
  const [intact, setIntact] = React.useState<boolean | null>(null);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available || !ready) return;
    void auditTrailRows(scope, 200).then(setTrail);
  }, [available, ready, scope]);

  if (!available) {
    return <SubstrateNotConfigured title="Audit entry" />;
  }

  const ordered = [...trail].sort((a, b) => a.seq - b.seq);
  const entry = ordered.find(e => e.seq === seq);
  const prev = ordered.find(e => e.seq === seq - 1);
  const next = ordered.find(e => e.seq === seq + 1);

  if (!entry) {
    return (
      <Panel title="Audit entry" meta={`${scope} · #${seq}`} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No entry seq <span className="font-mono">{seq}</span> in scope{' '}
          <span className="font-mono">{scope}</span> visible at this scope.{' '}
          <Link href="/gov/audit" className="text-link underline">Back to explorer</Link>
        </p>
      </Panel>
    );
  }

  async function onVerify() {
    setVerifying(true);
    try {
      const r = await verifyChainRow(scope);
      setIntact(r?.intact ?? null);
    } finally { setVerifying(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Audit entry #{entry.seq}</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] text-link">{scope}</span>
        </div>
        <Link href="/gov/audit" className="font-mono text-[10px] text-link underline">← explorer</Link>
      </div>

      <Panel title="Entry" meta={entry.hash} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Seq" value={String(entry.seq)} mono />
          <Field label="At" value={new Date(entry.at).toLocaleString()} />
          <Field label="Action" value={entry.action} />
          <Field label="Actor" value={entry.actor} mono />
          <Field label="Subject" value={entry.subject} />
        </div>
        {entry.detail ? (
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Detail</div>
            <p className="mt-1 text-[11px] text-ink">{entry.detail}</p>
          </div>
        ) : null}
        <div className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px] text-ink-muted">
          prev_hash <span className="text-ink">{entry.prevHash}</span><br />
          hash      <span style={{ color: TONE.link }}>{entry.hash}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={verifying} onClick={onVerify}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
            {verifying ? 'verifying…' : 'verify scope chain'}
          </button>
          <button type="button"
            onClick={() => {
              downloadJson(`civicos-audit-${scope.replace(/[^a-z0-9._-]+/gi,'_')}-${entry.seq}`,
                { scope, entry, exported_at: new Date().toISOString() });
            }}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
            download entry
          </button>
          {intact != null ? (
            <span className="text-[10px] font-mono" style={{ color: intact ? TONE.ok : TONE.alert }}>
              {intact ? 'intact' : 'BROKEN'}
            </span>
          ) : null}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Prev" meta={prev ? `#${prev.seq}` : '—'} bodyClass="!p-3 text-[10px]">
          {prev ? (
            <div className="space-y-1">
              <Link href={`/gov/audit/${encodeURIComponent(scope)}/${prev.seq}`}
                className="block font-mono text-link underline">#{prev.seq} · {prev.action}</Link>
              <div className="truncate text-ink">{prev.subject}</div>
              <div className="font-mono text-ink-muted">hash {prev.hash}</div>
            </div>
          ) : <p className="text-ink-muted">First entry — no predecessor.</p>}
        </Panel>
        <Panel title="Next" meta={next ? `#${next.seq}` : '—'} bodyClass="!p-3 text-[10px]">
          {next ? (
            <div className="space-y-1">
              <Link href={`/gov/audit/${encodeURIComponent(scope)}/${next.seq}`}
                className="block font-mono text-link underline">#{next.seq} · {next.action}</Link>
              <div className="truncate text-ink">{next.subject}</div>
              <div className="font-mono text-ink-muted">prev {next.prevHash}</div>
            </div>
          ) : <p className="text-ink-muted">Latest entry — no successor yet.</p>}
        </Panel>
      </div>
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
