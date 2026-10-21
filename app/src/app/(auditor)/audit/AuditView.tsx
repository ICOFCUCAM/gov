'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TONE, Panel, Spark, seed, waveSeries } from '@/components/features/SituationRoom';
import { api } from '@/lib/api/client';
import type { AuditEntry, AuditVerification } from '@/lib/api/types';
import { useRenderNow } from '@/lib/clock/render-now';
import { useOfficial } from '@/lib/official';
import { ActingOfficial } from '@/components/ui/ActingOfficial';
import { SignalTag } from '@/components/ui/SignalTag';
import { GeneratedFold, useGenerated, useTile, shownValue } from '@/components/ui/Generated';
import type { SignalKind } from '@/lib/twin/signal';
import { WATCH_FINDING_ACTIONS } from '@/lib/records/watch-actions';

type TeleFig = { l: string; v: string; sub: string; t: string; kind: SignalKind; src?: string };

/** A headline tile marked by its source; a generated one is "Not connected" in production (lib/twin/generated.ts). */
function AuditTile({ m }: { m: TeleFig }) {
  const tile = useTile(m.v, m.kind, m.src);
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted"><span className="truncate">{m.l}</span>{tile.marker}</div>
      <div className={`font-mono leading-tight tabular-nums ${tile.folded ? 'text-[11px] text-ink-muted' : 'text-lg'}`} style={tile.folded ? undefined : { color: TONE[m.t] }}>{tile.value}</div>
      {tile.folded ? null : <div className="truncate text-[8px] text-ink-muted">{m.sub}</div>}
    </div>
  );
}

/** "12s ago", "4m ago", "3h ago". */
function ago(iso: string | undefined, now: number): string {
  if (!iso) return 'not yet';
  const sec = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.round(sec / 60)}m ago` : `${Math.round(sec / 3600)}h ago`;
}

const CONTROLS = [
  { l: 'Access control', k: 'ac' },
  { l: 'Change management', k: 'cm' },
  { l: 'Data integrity', k: 'di' },
  { l: 'Incident response', k: 'ir' },
  { l: 'Segregation of duties', k: 'sd' },
  { l: 'Cryptographic assurance', k: 'ca' },
];

const BODIES = [
  { l: 'Constitutional Court', s: 'Quarterly review', t: 'ok' },
  { l: 'National Audit Office', s: 'Continuous attest', t: 'ok' },
  { l: 'Parliamentary Oversight', s: 'Session active', t: 'warn' },
  { l: 'Inspector-General', s: 'Standing mandate', t: 'ok' },
];

type Verification = AuditVerification | null;
const PAGE = 200;

/** Download the ledger as shown, with the verification result it was read under. */
function exportLedger(events: AuditEntry[], verify: Verification) {
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), verification: verify, events }, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `audit-ledger-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** A SHA-256 seal over the chain head and the verification result: anyone holding the same ledger gets the same seal. */
async function seal(events: AuditEntry[], verify: Verification): Promise<string> {
  if (!verify?.ok) return 'No seal: verify the chain first (it must be intact).';
  const head = events.reduce<AuditEntry | undefined>((h, e) => (!h || e.seq > h.seq ? e : h), undefined);
  const text = JSON.stringify(['civicos-audit-seal', head?.seq ?? 0, head?.hash ?? 'GENESIS', verify.checked]);
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `Seal (SHA-256 over head entry ${head?.seq ?? 0} and ${verify.checked} verified links): ${hex}`;
}

/** "Signed head N at T, anchored, time-stamped by <TSA> at <genTime>": the last head signed with the platform's audit key (lib/audit/sign.ts), with the nation's RFC 3161 time-stamp when there is one. */
function SignedHeadLine({ verify }: { verify: Verification }) {
  const s = verify?.signed;
  if (!verify) return null;
  if (!s || s.signedHeads === 0) return <p>No signed head yet: the head is signed every few entries and by the anchor job.</p>;
  if (!s.ok) return <p role="alert" style={{ color: TONE.alert }}>Signed heads do not match: {s.problem}.</p>;
  const h = s.head!;
  const where = h.anchoredTo?.length ? `, anchored (${h.anchoredTo.join(', ')}) at ${new Date(h.anchoredAt!).toLocaleString()}` : ', not anchored yet';
  return (
    <p data-testid="signed-head">
      Signed head {h.seq} at {new Date(h.at).toLocaleString()}{where} · key {h.keyId}
      {h.production ? '' : ' · development key, not evidence for production'}
      {s.currentKey === false ? ' · signed with an earlier key' : ''}
      {h.timestamp ? <span data-testid="head-timestamp"> · time-stamped by {h.timestamp.tsa} at {new Date(h.timestamp.genTime).toLocaleString()}{h.timestamp.trusted === false ? ' (TSA certificate not trusted)' : ''}</span> : null}
      {!h.timestamp && h.timestampError ? ` · not time-stamped: ${h.timestampError}` : ''}
      {s.pending ? ` · ${s.pending} head${s.pending === 1 ? '' : 's'} waiting for the key provider's signature` : ''}
    </p>
  );
}

export function AuditView() {
  const [events, setEvents] = React.useState<AuditEntry[] | null>(null);
  // The chain is read a page at a time (go-live review M-8): the newest page is refreshed, older pages are added on request.
  const [older, setOlder] = React.useState<AuditEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [nextBefore, setNextBefore] = React.useState<number | undefined>(undefined);
  const olderLoaded = React.useRef(false);
  const [verify, setVerify] = React.useState<Verification>(null);
  const [now, setNow] = React.useState(useRenderNow());
  const [official, setOfficial] = useOfficial();
  const [note, setNote] = React.useState<string | null>(null);

  // Reading the chain's entries is limited to auditors and the data-protection authority's officials
  // (GET /api/audit, canReadAuditChain() in lib/auth/roles.ts). A refused official sees the refusal, the
  // page stops asking for the entries, and the chain's verification (public) keeps refreshing.
  const [refused, setRefused] = React.useState<string | null>(null);
  const refusedRef = React.useRef(false);
  const load = React.useCallback(async () => {
    const verifyP = api.audit.verify().catch(() => null);
    if (!refusedRef.current) {
      const res = await fetch(`/api/audit?limit=${PAGE}`, { cache: 'no-store' }).catch(() => null);
      if (res && (res.status === 401 || res.status === 403)) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        refusedRef.current = true;
        setRefused(body.error ?? (res.status === 401 ? 'Sign in as an official to read the audit chain.' : 'This account may not read the audit chain.'));
      } else if (res && res.ok) {
        const page = (await res.json()) as { events: AuditEntry[]; total: number; nextBefore?: number };
        setEvents(page.events);
        setTotal(page.total);
        // Until older pages are read, the cursor follows the newest page.
        if (!olderLoaded.current) setNextBefore(page.nextBefore);
      }
    }
    const v = await verifyP;
    if (v) setVerify(v);
  }, []);

  async function loadOlder() {
    if (nextBefore === undefined) return;
    const page = await api.audit.list({ before: nextBefore, limit: PAGE });
    olderLoaded.current = true;
    setOlder(o => [...o, ...page.events]);
    setNextBefore(page.nextBefore);
  }

  React.useEffect(() => {
    void load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(() => void load(), 15_000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [load]);

  async function openInquiry() {
    if (!official) { setNote('Name the acting official first: an inquiry is opened under a person.'); return; }
    const head = evs[0];
    try {
      const { incident } = await api.ops.incidents.create({ severity: 'sev3', title: `Audit inquiry${head ? ` from entry ${head.seq}` : ''}`, scope: 'audit', by: official });
      setNote(`Inquiry opened as incident ${incident.id} (Operations).`);
    } catch (e) { setNote(e instanceof Error ? e.message : 'Could not open the inquiry'); }
  }

  const epoch = Math.floor(now / 15000);
  const ts = now / 4000;
  const intact = verify?.ok ?? true;
  const tone = intact ? 'ok' : 'alert';
  const evs = React.useMemo(() => {
    const head = events ?? [];
    const seen = new Set(head.map(e => e.id));
    return [...head, ...older.filter(e => !seen.has(e.id))];
  }, [events, older]);
  const denied = evs.filter(e => e.outcome !== 'ok').length;
  const sp = (k: string, lo = 35, hi = 90) => waveSeries(`au:${k}`, ts, 16, lo, hi);
  const gen = useGenerated();

  // Findings the access watches raised (lib/records/access-watch.ts) in the last 30 days, among the entries read.
  const since = now - 30 * 86_400_000;
  const findings = evs.filter(e => WATCH_FINDING_ACTIONS[e.action] && Date.parse(e.at) >= since);
  const partial = Math.max(total, evs.length) > evs.length;
  const CHAIN_SRC = 'The audit chain and its verification (GET /api/audit, /api/audit/verify)';

  // Every headline figure is read from the audit chain and its verification; none is generated.
  const tele: TeleFig[] = [
    { l: 'Chain integrity', v: verify ? (intact ? 'INTACT' : 'BROKEN') : '—', sub: intact ? 'tamper-evident' : 'investigate', t: tone, kind: 'record', src: CHAIN_SRC },
    { l: 'Events recorded', v: refused ? '—' : String(Math.max(total, evs.length)), sub: refused ? 'entries not readable by this account' : `+${evs.filter(e => now - Date.parse(e.at) < 86_400_000).length} / 24h`, t: 'ok', kind: refused ? 'unavailable' : 'record', src: CHAIN_SRC },
    { l: 'Verified links', v: String(verify?.checked ?? 0), sub: 'hash continuity', t: 'ok', kind: 'record', src: CHAIN_SRC },
    { l: 'Non-ok outcomes', v: refused ? '—' : String(denied), sub: refused ? 'entries not readable by this account' : denied ? 'review queue' : 'clean', t: denied ? 'warn' : 'ok', kind: refused ? 'unavailable' : 'record', src: CHAIN_SRC },
    { l: 'Watch findings · 30 days', v: refused ? '—' : String(findings.length), sub: refused ? 'entries not readable by this account' : partial ? `in the newest ${evs.length} entries · a prompt, never a conclusion` : 'a prompt, never a conclusion', t: findings.length ? 'warn' : 'ok', kind: refused ? 'unavailable' : 'record', src: 'Findings the access watches raised on the audit chain (lib/records/access-watch.ts)' },
    { l: 'Attestation', v: !verify ? '—' : !intact ? 'BROKEN' : verify.complete === false ? 'CATCHING UP' : 'CURRENT', sub: verify ? `verified ${ago(verify.verifiedAt, now)}${verify.fullCheckAt ? ` · full check ${ago(verify.fullCheckAt, now)}` : ''}` : 'not verified yet', t: !verify ? 'neutral' : intact ? 'ok' : 'alert', kind: 'record', src: 'The chain\'s verification (GET /api/audit/verify)' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => <AuditTile key={m.l} m={m} />)}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel signal="sample" title="Control assurance" meta="continuous attestation" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1">
            {CONTROLS.map(c => {
              const v = 78 + Math.round(seed(`ctl:${c.k}:${epoch}`) * 21);
              const tn = v >= 95 ? 'ok' : v >= 88 ? 'warn' : 'alert';
              return (
                <div key={c.k} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{c.l}</span>
                  <div className="h-4 w-14 shrink-0 opacity-70"><Spark pts={sp(`c:${c.k}`, 60, 95)} tone={tn} /></div>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: TONE[tn] }}>{v}%</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel signal="sample" title="Oversight bodies" meta="independent mandate" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1">
            {BODIES.map(b => (
              <div key={b.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-ink">{b.l}</span>
                  <span className="block truncate text-[9px] text-ink-muted">{b.s}</span>
                </span>
                <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[b.t]} 18%, transparent)`, color: TONE[b.t] }}>{b.t === 'ok' ? 'Active' : 'In session'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel signal="record" title="Anomaly signals" meta="access watches · last 30 days" bodyClass="!p-1.5">
          {/* What the access watches raised on the audit chain: a prompt to look, never a conclusion. */}
          <div className="mb-1.5 grid grid-cols-1 gap-1">
            {refused ? <p className="text-[10px] text-ink-muted">Read by auditors and the data-protection authority only.</p> : findings.length === 0 ? <p className="text-[10px] text-ink-muted">No finding raised{partial ? ` in the newest ${evs.length} entries` : ''}.</p> : findings.slice(0, 6).map(f => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{WATCH_FINDING_ACTIONS[f.action]} · {f.resource}</span>
                <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">#{f.seq} · {new Date(f.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <GeneratedFold marked what="Example behavioural signals">
          <div className="grid grid-cols-1 gap-1">
            {[
              { l: 'Off-hours privileged action', t: 'warn' },
              { l: 'Repeated denied access', t: 'alert' },
              { l: 'Config drift detected', t: 'ok' },
              { l: 'Bulk export pattern', t: 'warn' },
              { l: 'Role escalation request', t: 'ok' },
            ].map((a, i) => (
              <div key={a.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{a.l}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: TONE[a.t] }}>×{1 + Math.round(seed(`anq:${i}:${epoch}`) * 6)}</span>
              </div>
            ))}
          </div>
          </GeneratedFold>
        </Panel>

        <Panel signal="record" title="Integrity actions" meta="oversight authority" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {([
              { l: 'Re-verify chain', g: '⛓', a: () => void api.audit.verify(true).then(v => { setVerify(v); setNote(v.ok ? `Chain verified: ${v.checked} links intact.` : `Chain broken at entry ${v.brokenAtSeq}.`); }) },
              { l: 'Export ledger', g: '▤', a: () => exportLedger(evs, verify) },
              { l: 'Freeze segment', g: '⊘', off: 'Needs the substrate legal-hold function; not connected yet (register 1.14).' },
              { l: 'Open inquiry', g: '⚖', a: () => void openInquiry() },
              { l: 'Notify oversight', g: '◈', off: 'No notification channel to oversight bodies is connected yet (register 1.14).' },
              { l: 'Attestation seal', g: '✓', a: () => void seal(evs, verify).then(setNote) },
            ] as { l: string; g: string; a?: () => void; off?: string }[]).map((q, i) => (
              <button key={q.l} onClick={q.a} disabled={!!q.off} title={q.off} aria-describedby={q.off ? 'integrity-off' : undefined}
                className="focus-ring group flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1.5 text-left text-[10px] font-medium text-ink-soft transition-all hover:bg-surface-2/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[11px]" style={{ color: i === 3 ? TONE.warn : TONE.ok }}>{q.g}</span>
                <span className="min-w-0 truncate">{q.l}{q.off ? ' · not connected' : ''}</span>
              </button>
            ))}
          </div>
          <div className="mt-1.5 space-y-1 px-0.5 text-[10px] text-ink-muted">
            <ActingOfficial name={official} onChange={setOfficial} />
            <SignedHeadLine verify={verify} />
            <p id="integrity-off">Freezing a segment and notifying oversight bodies need functions that are not connected yet.</p>
            {note ? <p role="status" className="break-all text-ink-soft">{note}</p> : null}
          </div>
        </Panel>
      </div>

      <Panel
        signal="record"
        title="Tamper-evident audit chain"
        meta={
          <span className="flex items-center gap-2">
            {verify ? (
              <span className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tone]} 16%, transparent)`, color: TONE[tone] }}>
                {intact ? `✓ ${verify.checked} links verified` : `✗ broken @ seq ${verify.brokenAtSeq}`}
              </span>
            ) : null}
            <Button variant="secondary" onClick={() => void api.audit.verify(true).then(setVerify)}>Re-verify</Button>
          </span>
        }
        bodyClass="overflow-auto !p-0"
      >
        {refused ? (
          <div role="status" className="space-y-1 p-3 text-xs text-ink-soft">
            <p><strong>The chain&apos;s entries are not shown to this account.</strong> {refused}</p>
            <p className="text-ink-muted">Who acted, on which record, is read only by auditors and the officials of the data-protection authority, so that those who run the platform do not oversee themselves. The chain&apos;s verification above stays open to every official.</p>
          </div>
        ) : events === null ? (
          <p className="p-3 text-xs text-ink-muted">Replaying hash chain…</p>
        ) : events.length === 0 ? (
          <EmptyState title="No audit events yet" hint="State-changing actions (decisions, payments, escalations) are hash-chained here as they occur." />
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8px] uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-1.5">Seq</th><th className="px-2 py-1.5">When</th><th className="px-2 py-1.5">Actor</th>
                <th className="px-2 py-1.5">Action</th><th className="px-2 py-1.5">Resource</th><th className="px-3 py-1.5">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {evs.map(e => {
                const ok = e.outcome === 'ok';
                return (
                  <tr key={e.id} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                    <td className="px-3 py-1.5 font-mono text-ink-muted">{e.seq}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-ink-muted">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-ink-soft">{e.actor}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-ink">{e.action}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-ink-muted">{e.resource}</td>
                    <td className="px-3 py-1.5">
                      <span className="rounded-[2px] px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[ok ? 'ok' : 'alert']} 16%, transparent)`, color: TONE[ok ? 'ok' : 'alert'] }}>{e.outcome}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {events !== null && events.length > 0 ? (
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5 text-[10px] text-ink-muted">
            <span>Showing {evs.length} of {Math.max(total, evs.length)} entries, newest first.</span>
            {nextBefore !== undefined ? <Button variant="secondary" onClick={() => void loadOlder()}>Load older entries</Button> : null}
          </div>
        ) : null}
      </Panel>

      {/* Operational command strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {/* Integrity from the chain's verification; the rest is generated (Sample, or "Not connected" in production). */}
        {[
          { l: 'Integrity posture', v: verify ? (intact ? 'ASSURED' : 'BREACH') : '—', t: verify ? tone : 'neutral', kind: 'record' as SignalKind, src: 'The chain\'s verification (GET /api/audit/verify)' },
          { l: 'Verification tempo', v: shownValue(gen, `${Math.round(20 + seed(`avt:${epoch}`) * 40)} / min`), t: gen.show ? 'ok' : 'neutral', kind: gen.kind, src: gen.src },
          { l: 'Open inquiries', v: shownValue(gen, `${denied ? 1 : 0} active`), t: !gen.show ? 'neutral' : denied ? 'warn' : 'ok', kind: gen.kind, src: gen.src },
          { l: 'Coverage', v: shownValue(gen, `${94 + Math.round(seed(`cov:${epoch}`) * 5)}%`), t: gen.show ? 'ok' : 'neutral', kind: gen.kind, src: gen.src },
          { l: 'Oversight', v: shownValue(gen, 'INDEPENDENT'), t: gen.show ? 'ok' : 'neutral', kind: gen.kind, src: gen.src },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="flex min-w-0 flex-wrap items-center gap-1 uppercase tracking-[0.14em] text-ink-muted">{s.l}<SignalTag kind={s.kind} source={s.src} /></span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Integrity posture' || s.l === 'Oversight' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Read-only oversight. Every state-changing action is hash-chained and tamper-evident. No citizen records are exposed — only the ledger of what was done, by whom, to which resource.
      </p>
    </div>
  );
}
