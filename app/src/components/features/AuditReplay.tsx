'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';
import { replayDump, type ReplayReport } from '@/lib/audit/replay';

/**
 * AuditReplay — paste a substrate export, walk every chain, cross-check
 * every witness attestation, render a pass/fail report.
 *
 * Pure client-side: no network calls, no auth. The same verification an
 * external auditor runs offline; bundled into the operator console so the
 * substrate's tamper-detection story is end-to-end demonstrable.
 *
 * Two input modes:
 *   • Paste JSON into the textarea
 *   • Drop a .json file onto the drop zone
 *
 * The dump shape expected is what `/api/substrate/export` produces.
 */
export function AuditReplay() {
  const [raw, setRaw] = React.useState('');
  const [report, setReport] = React.useState<ReplayReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function run(text: string) {
    setError(null);
    setReport(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError('invalid JSON: ' + (e instanceof Error ? e.message : String(e)));
      return;
    }
    const r = replayDump(parsed);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setReport(r);
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setRaw(text);
      run(text);
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  const failedScopes = report?.chains.filter(c => !c.chainOk) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Audit Replay" badge="offline · pure client" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => run(raw)} disabled={!raw.trim()}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            replay
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            load .json
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={e => { const f = e.currentTarget.files?.[0]; if (f) onFile(f); }} />
          <button type="button" onClick={() => { setRaw(''); setReport(null); setError(null); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            clear
          </button>
        </div>
      </div>

      <p className="text-[10px] text-ink-muted">
        Paste a substrate export (the JSON produced by <code className="font-mono">/api/substrate/export</code>)
        or drop a .json file. Every audit chain is walked locally; every
        witness attestation is cross-checked against the live chain. No
        data leaves the browser.
      </p>

      <div onDragOver={e => e.preventDefault()} onDrop={onDrop}
        className="rounded-[3px] border border-dashed border-line bg-bg p-3">
        <textarea
          value={raw}
          onChange={e => setRaw(e.currentTarget.value)}
          rows={8}
          placeholder="{ &quot;tables&quot;: { &quot;audit_entries&quot;: { &quot;rows&quot;: [&hellip;] }, &quot;audit_witnesses&quot;: { &quot;rows&quot;: [&hellip;] } } }"
          className="block w-full rounded-[3px] border border-line bg-surface px-2 py-1 font-mono text-[10px]"
          spellCheck={false}
        />
        <p className="mt-1 font-mono text-[9px] text-ink-muted">drop .json file anywhere in this box</p>
      </div>

      {error ? (
        <Panel title="Parse error" meta="invalid input" bodyClass="!p-3">
          <p className="font-mono text-[10px]" style={{ color: TONE.alert }}>{error}</p>
        </Panel>
      ) : null}

      {report ? (
        <>
          <div className="rounded-[3px] border px-3 py-2 text-[11px]"
            style={{ borderColor: report.ok ? TONE.ok : TONE.alert, color: report.ok ? TONE.ok : TONE.alert }}>
            {report.ok
              ? `✓ ${report.scopes_checked} chain${report.scopes_checked === 1 ? '' : 's'} intact · ${report.witnesses.matched} attestation${report.witnesses.matched === 1 ? '' : 's'} consistent`
              : `✗ failure · ${failedScopes.length} chain${failedScopes.length === 1 ? '' : 's'} broken · ${report.witnesses.divergent.length} witness divergence${report.witnesses.divergent.length === 1 ? '' : 's'}`}
          </div>

          <Panel title="Per-scope chain replay" meta={`${report.chains.length}`} bodyClass="!p-0">
            {report.chains.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-ink-muted">No audit entries in the dump.</p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {report.chains.map(c => (
                  <div key={c.scope} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-44 shrink-0 truncate font-mono text-link">{c.scope}</span>
                      <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">{c.entries}</span>
                      <span className="min-w-0 flex-1 truncate text-[8.5px] font-bold uppercase tracking-wider"
                        style={{ color: c.chainOk ? TONE.ok : TONE.alert }}>
                        {c.chainOk ? 'intact' : `broken at seq ${c.brokenAtSeq}`}
                      </span>
                    </div>
                    {c.reason ? <p className="mt-0.5 font-mono text-[9px]" style={{ color: TONE.alert }}>{c.reason}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Witness cross-check`} meta={`${report.witnesses.matched}/${report.witnesses.attestations} match`} bodyClass="!p-0">
            {report.witnesses.divergent.length === 0 ? (
              <p className="px-3 py-4 text-[11px]" style={{ color: TONE.ok }}>
                ✓ Every witness attestation agrees with the chain in the dump.
              </p>
            ) : (
              <div className="max-h-[260px] overflow-y-auto">
                {report.witnesses.divergent.map(d => (
                  <div key={d.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-44 shrink-0 truncate font-mono text-link">{d.scope}</span>
                      <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink">@{d.observed_seq}</span>
                      <span className="min-w-0 flex-1 truncate font-mono" style={{ color: TONE.alert }}>
                        attested {d.observed_hash.slice(0, 12)}… ≠ live {(d.live_hash ?? '(missing)').slice(0, 12)}…
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-ink-muted">{d.witness_label}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
