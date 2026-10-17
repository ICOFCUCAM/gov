'use client';

// Support lifecycle: each release line's active, security-only and
// end-of-life windows as a timeline, the chamber's end-of-life warning, and
// the publisher's policy editor.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { inputCls, goldBtn, goldStyle, hair, CHAMPAGNE } from '@/components/features/onboarding/Chrome';
import type { LifecycleLine, LifecyclePolicy, LifecycleWarning } from '@/lib/api/types';
import { Chip, ErrorLine, fmtDate, useActor } from './ui';

const PHASE_TONE = { active: '#9be7c4', 'security-only': '#f4d58d', 'end-of-life': '#f1938f' } as const;
const PHASE_TEXT = { active: 'Active', 'security-only': 'Security fixes only', 'end-of-life': 'End of life' } as const;
const LEVEL_TONE: Record<LifecycleWarning['level'], string> = { notice: '#a9c7e8', warning: '#f4d58d', urgent: '#f1b36b', expired: '#f1938f' };

/** The chamber's banner when the installed line nears end of life. */
export function LifecycleBanner({ w, q }: { w: LifecycleWarning; q: string }) {
  const tone = LEVEL_TONE[w.level];
  const months = Math.max(0, Math.round(w.daysLeft / 30.44));
  return (
    <div role="note" className="mt-8 flex flex-col gap-3 rounded-[3px] border px-5 py-4 sm:flex-row sm:items-center" style={{ borderColor: `${tone}66`, background: `linear-gradient(90deg, ${tone}1a, ${tone}05)` }}>
      <Chip tone={tone} solid={w.level === 'urgent' || w.level === 'expired'}>{w.level === 'expired' ? 'End of life' : `${months} month${months === 1 ? '' : 's'} of support left`}</Chip>
      <p className="flex-1 text-[14px] font-light text-[#f3efe6]/85">
        {w.level === 'expired'
          ? `Release line ${w.line} (you run ${w.version}) reached end of life on ${fmtDate(w.endOfLife)} and no longer receives security fixes.`
          : `Release line ${w.line} (you run ${w.version}) reaches end of life on ${fmtDate(w.endOfLife)}; after that it receives no security fixes.`}
        {' '}<span className="text-white/50">{w.moveTo ? `Plan the move to ${w.moveTo}.` : 'Plan your next upgrade; nothing is installed without your decision.'}</span>
      </p>
      <Link href={`/updates${q}#lifecycle`} className="whitespace-nowrap text-[13px] underline decoration-[#d9c398]/40 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>See the lifecycle →</Link>
    </div>
  );
}

/** Timeline of every line: active and security-only windows, today, and the installed line. */
export function LifecycleTimeline({ lines, installedLine, policy }: { lines: LifecycleLine[]; installedLine?: string; policy: LifecyclePolicy }) {
  if (!lines.length) return <p className="text-[13px] font-light text-white/50">No release lines yet.</p>;
  const now = Date.now();
  const start = Math.min(...lines.map(l => Date.parse(l.gaAt)), now);
  const end = Math.max(...lines.map(l => Date.parse(l.endOfLife)), now);
  const pct = (t: number) => `${((t - start) / (end - start)) * 100}%`;
  const years: number[] = [];
  for (let y = new Date(start).getUTCFullYear() + 1; Date.UTC(y, 0, 1) < end; y++) years.push(y);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-light text-white/50">
        <Chip tone={PHASE_TONE.active}>Active</Chip><Chip tone={PHASE_TONE['security-only']}>Security fixes only</Chip><Chip tone={PHASE_TONE['end-of-life']}>End of life</Chip>
        <span className="ml-auto">Standard {policy.standard.activeMonths}+{policy.standard.securityMonths} months · LTS {policy.lts.activeMonths}+{policy.lts.securityMonths} months · notices {policy.noticeMonths.join(', ')} months before</span>
      </div>
      <div className="relative">
        {lines.map(l => {
          const mine = l.line === installedLine;
          return (
            <div key={l.line} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)]">
              <div className="min-w-0">
                <span className={`font-mono text-[13px] ${mine ? 'text-[#f4e4bd]' : 'text-white/75'}`}>{l.line}</span>
                <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: l.kind === 'lts' ? '#c9b6ff' : 'rgba(243,239,230,0.45)' }}>{l.kind === 'lts' ? 'LTS' : 'Std'}</span>
                {mine ? <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: CHAMPAGNE }}>You run this</span> : null}
              </div>
              <div className="relative h-7 rounded-[2px]" style={{ background: hair(0.05), outline: mine ? `1px solid ${CHAMPAGNE}66` : undefined }}
                title={`${l.line}: active until ${fmtDate(l.activeUntil)}, security fixes until ${fmtDate(l.endOfLife)}`}
                aria-label={`${l.line} ${l.kind === 'lts' ? 'long-term support' : 'standard'}: active ${fmtDate(l.gaAt)} to ${fmtDate(l.activeUntil)}, security fixes only until ${fmtDate(l.endOfLife)}; now ${PHASE_TEXT[l.phase].toLowerCase()}`} role="img">
                <span className="absolute inset-y-1 rounded-l-[2px]" style={{ left: pct(Date.parse(l.gaAt)), width: `calc(${pct(Date.parse(l.activeUntil))} - ${pct(Date.parse(l.gaAt))})`, background: `${PHASE_TONE.active}99` }} />
                <span className="absolute inset-y-1 rounded-r-[2px]" style={{ left: pct(Date.parse(l.activeUntil)), width: `calc(${pct(Date.parse(l.endOfLife))} - ${pct(Date.parse(l.activeUntil))})`, background: `${PHASE_TONE['security-only']}88` }} />
                <span className="absolute inset-y-0 w-[2px]" style={{ left: pct(Date.parse(l.endOfLife)), background: PHASE_TONE['end-of-life'] }} />
                <span className="absolute -inset-y-1 w-px" style={{ left: pct(now), background: '#f3efe6cc' }} aria-hidden title="Today" />
                {l.notices.map(n => <span key={n.months} className="absolute -top-1 h-2 w-2 -translate-x-1/2 rotate-45" title={`${n.months}-month notice ${n.issuedAt && n.issuedAt !== 'superseded' ? `issued ${fmtDate(n.issuedAt)}` : 'due'}`} style={{ left: pct(Date.parse(n.dueAt)), background: '#f1b36b' }} />)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
        <span />
        <div className="relative h-4 font-mono text-[9.5px] text-white/40">
          {years.map(y => <span key={y} className="absolute -translate-x-1/2" style={{ left: pct(Date.UTC(y, 0, 1)) }}>{y}</span>)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-3 font-normal">Line</th><th className="py-2 pr-3 font-normal">Now</th><th className="py-2 pr-3 font-normal">First release</th><th className="py-2 pr-3 font-normal">Active until</th><th className="py-2 pr-3 font-normal">End of life</th><th className="py-2 font-normal">Latest</th></tr></thead>
          <tbody>{lines.map(l => (
            <tr key={l.line} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3 font-mono text-[12px] text-[#f4e4bd]">{l.line} {l.kind === 'lts' ? 'LTS' : ''}</td>
              <td className="py-2 pr-3"><Chip tone={PHASE_TONE[l.phase]}>{PHASE_TEXT[l.phase]}</Chip></td>
              <td className="py-2 pr-3 font-mono text-[11.5px] text-white/60">{fmtDate(l.gaAt)}</td>
              <td className="py-2 pr-3 font-mono text-[11.5px] text-white/60">{fmtDate(l.activeUntil)}</td>
              <td className="py-2 pr-3 font-mono text-[11.5px] text-white/60">{fmtDate(l.endOfLife)}</td>
              <td className="py-2 font-mono text-[11.5px] text-white/60">{l.latestVersion}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/** The chamber section: loads this nation's lines. */
export function LifecyclePanel({ link }: { link?: string }) {
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.lifecycle>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.lifecycle(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load the lifecycle')); }, [link]);
  if (!d) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  return <LifecycleTimeline lines={d.lines} installedLine={d.installedLine} policy={d.policy} />;
}

/** Publisher console: the policy and every line across nations. */
export function PublisherLifecycle() {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.publisher.lifecycle>> | null>(null);
  const [p, setP] = React.useState<LifecyclePolicy | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api.updates.publisher.lifecycle().then(r => { setD(r); setP(r.policy); }).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, []);
  React.useEffect(load, [load]);
  if (!d || !p) return <div className="min-h-[220px]"><ErrorLine>{err}</ErrorLine></div>;
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  async function save() {
    setErr(null); setOk(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.setLifecycle({ ...p!, by: actor }); setOk('Policy saved — written to the audit chain.'); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not save'); }
  }
  const win = (k: 'standard' | 'lts', f: 'activeMonths' | 'securityMonths', label: string) => (
    <label className="grid gap-1 text-[11.5px] text-white/50">{label}
      <input type="number" min={0} className={`${inputCls} w-[96px] py-2 text-[13px]`} value={p[k][f]} onChange={e => setP({ ...p, [k]: { ...p[k], [f]: num(e.target.value) } })} />
    </label>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <LifecycleTimeline lines={d.lines} policy={d.policy} />
      <div className="flex flex-wrap gap-2 text-[12px] font-light text-white/55">
        {d.lines.map(l => <span key={l.line}>{l.line}: {d.nationsOnLine[l.line]?.length ? d.nationsOnLine[l.line]!.join(', ') : 'no nations'}</span>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, <span key={`s${i}`} className="text-white/25">·</span>, x] : [x]), [])}
      </div>
      <div className="flex flex-wrap items-end gap-4 rounded-[2px] border p-4" style={{ borderColor: hair(0.14) }}>
        {win('standard', 'activeMonths', 'Standard · active')}
        {win('standard', 'securityMonths', 'Standard · security only')}
        {win('lts', 'activeMonths', 'LTS · active')}
        {win('lts', 'securityMonths', 'LTS · security only')}
        <label className="grid gap-1 text-[11.5px] text-white/50">Notices (months before)
          <input className={`${inputCls} w-[140px] py-2 text-[13px]`} value={p.noticeMonths.join(', ')} onChange={e => setP({ ...p, noticeMonths: e.target.value.split(/[,\s]+/).filter(Boolean).map(Number) })} />
        </label>
        <div className="grid gap-1 text-[11.5px] text-white/50">LTS lines
          <div className="flex flex-wrap gap-3 py-2">
            {d.lines.map(l => (
              <label key={l.line} className="flex items-center gap-1.5 font-mono text-[12px] text-white/70">
                <input type="checkbox" checked={p.ltsLines.includes(l.line)} onChange={e => setP({ ...p, ltsLines: e.target.checked ? [...p.ltsLines, l.line] : p.ltsLines.filter(x => x !== l.line) })} />{l.line}
              </label>
            ))}
          </div>
        </div>
        <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={save}>Save policy</button>
      </div>
      {p.updatedBy ? <p className="text-[11.5px] text-white/40">Last changed by {p.updatedBy} on {fmtDate(p.updatedAt)}.</p> : null}
      <p className="min-h-[16px] text-[12px] text-[#9be7c4]">{ok}</p>
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}
