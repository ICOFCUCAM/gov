'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { ServiceImpact, SlaClock, SlaReport, StatusPage, SupportTierPolicy, TicketPriority, TicketView } from '@/lib/api/types';
import { ChamberNav, ChamberTabs, Chip, ErrorLine, Loading, Panel, PoweredBy, fmtDate, fmtDateTime, useActor, useCenterTitle, useLink } from './ui';

export const IMPACT_TONE: Record<ServiceImpact, string> = { operational: '#9be7c4', degraded: '#f4d58d', 'partial-outage': '#f1b36b', 'major-outage': '#f1938f', maintenance: '#a9c7e8' };
export const IMPACT_TEXT: Record<ServiceImpact, string> = { operational: 'Operational', degraded: 'Degraded', 'partial-outage': 'Partial outage', 'major-outage': 'Major outage', maintenance: 'Maintenance' };
export const PRIORITY_TONE: Record<TicketPriority, string> = { P1: '#f1938f', P2: '#f1b36b', P3: '#f4d58d', P4: '#a5abb5' };
const STATE_TEXT: Record<TicketView['state'], string> = { open: 'Open', acknowledged: 'Acknowledged', 'in-progress': 'In progress', 'waiting-on-nation': 'Waiting on you', resolved: 'Resolved', closed: 'Closed' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function duration(min: number): string {
  const m = Math.abs(min);
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 48 * 60) return `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`;
  return `${Math.round(m / 1440)} days`;
}
const minutes = (min: number) => (min < 60 ? `${min} min` : min < 1440 ? `${min / 60} h` : `${min / 1440} d`);
const hours = (h: number) => (h < 48 ? `${h} h` : `${h / 24} d`);

/** One SLA timer: running with time left, paused, met or breached. */
export function SlaTimer({ label, c }: { label: string; c: SlaClock }) {
  const tone = c.state === 'met' ? '#9be7c4' : c.state === 'breached' ? '#f1938f' : c.state === 'paused' ? '#a9c7e8' : (c.minutesLeft ?? 0) < 60 ? '#f1b36b' : '#f4d58d';
  const text = c.state === 'running' ? `${duration(c.minutesLeft ?? 0)} left` : c.state === 'paused' ? 'paused' : c.state;
  return <Chip tone={tone} solid={c.state === 'breached'} title={`Due ${fmtDateTime(c.dueAt)}`}>{label} · {text}</Chip>;
}

export function SupportCenter() {
  const { link, q } = useLink();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.support>> | null>(null);
  const [status, setStatus] = React.useState<StatusPage | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.updates.support(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the support desk'));
    api.updates.status(link).then(r => setStatus(r.status)).catch(() => setStatus(null));
  }, [link]);
  React.useEffect(load, [load]);
  const { nation } = useCenterTitle(status?.nation.name, true);
  const open = d?.tickets.filter(t => t.state !== 'resolved' && t.state !== 'closed') ?? [];

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="support" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="support" />
        <Eyebrow>Update Center · support and service levels</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Support{nation ? <> for <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span></> : null}
        </h1>
        <p className="mt-4 max-w-[70ch] text-[15px] font-light leading-relaxed text-white/55">
          Open a ticket about any release or incident and follow it to resolution against the response and resolution times in your contract. Every fallback opens a priority-two ticket by itself. Availability, incidents and ticket performance are reported every month.
        </p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !d ? <Loading label="Opening the support desk…" /> : (
          <>
            {status ? (
              <Link href={`/updates/status${q}`} className="mt-8 flex flex-wrap items-center gap-3 rounded-[2px] border px-4 py-3 no-underline transition-colors hover:border-[#d9c398]/50" style={{ borderColor: hair(0.18) }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: IMPACT_TONE[status.overall] }} />
                <span className="text-[14px] font-light text-[#f3efe6]">{status.overall === 'operational' ? 'All services operational' : `Services: ${IMPACT_TEXT[status.overall].toLowerCase()}`}</span>
                {status.maintenance.upcoming.length ? <span className="text-[12.5px] font-light text-white/50">· next maintenance {fmtDate(status.maintenance.upcoming[0]!.start)}</span> : null}
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: CHAMPAGNE }}>Status page →</span>
              </Link>
            ) : null}
            <Section n="01" title="Your tickets" aside={`${open.length} open · ${d.policy.label} tier`}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                {d.tickets.map(t => <TicketCard key={t.id} t={t} link={link} q={q} onDone={load} />)}
                {!d.tickets.length ? <p className="text-[13.5px] font-light text-white/50">No tickets yet.</p> : null}
              </div>
            </Section>
            <Section n="02" title="Open a ticket">
              <TicketForm d={d} link={link} onDone={load} />
            </Section>
            <Section n="03" title="Monthly service report" aside="Availability · incidents · ticket SLAs">
              <ReportPanel link={link} />
            </Section>
            <Section n="04" title="Your service levels" aside={`${d.policy.label} · ${d.policy.coverage}`}>
              <TierTable policy={d.policy} priorities={d.priorities} />
            </Section>
          </>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

export function TierTable({ policy, priorities }: { policy: SupportTierPolicy; priorities?: Record<TicketPriority, string> }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
            <th className="py-2 pr-4 font-normal">Priority</th><th className="py-2 pr-4 font-normal">First response</th><th className="py-2 pr-4 font-normal">Resolution</th>{priorities ? <th className="py-2 font-normal">Meaning</th> : null}
          </tr></thead>
          <tbody>{(Object.keys(policy.targets) as TicketPriority[]).map(p => (
            <tr key={p} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-4"><Chip tone={PRIORITY_TONE[p]}>{p}</Chip></td>
              <td className="py-2 pr-4 font-mono text-[12px] text-[#f4e4bd]">{minutes(policy.targets[p].responseMinutes)}</td>
              <td className="py-2 pr-4 font-mono text-[12px] text-[#f4e4bd]">{hours(policy.targets[p].resolutionHours)}</td>
              {priorities ? <td className="py-2 text-white/55">{priorities[p]}</td> : null}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] font-light text-white/50">Hosted availability target {policy.uptimeTarget}% a month (planned maintenance excluded); service credit {policy.creditPct}% of the monthly fee when missed. The resolution clock pauses while we are waiting on you. Figures are placeholders until your contract sets them.</p>
    </>
  );
}

function TicketCard({ t, link, q, onDone }: { t: TicketView; link?: string; q: string; onDone: () => void }) {
  const [actor] = useActor();
  const [open, setOpen] = React.useState(t.state === 'waiting-on-nation');
  const [text, setText] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const done = t.state === 'resolved' || t.state === 'closed';
  async function act(action: 'reply' | 'close' | 'reopen') {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name in the ticket form first.'); return; }
    try { await api.updates.ticketAction(t.id, { action, by: actor, text: text || undefined, link }); setText(''); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }
  return (
    <Panel strong={t.state === 'waiting-on-nation'} className="min-w-0 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-white/45">{t.id}</span>
        <Chip tone={PRIORITY_TONE[t.priority]} solid={t.priority === 'P1' && !done}>{t.priority}</Chip>
        <span className="min-w-0 flex-1 text-[14.5px] font-light text-[#f3efe6]">{t.title}</span>
        <Chip tone={t.state === 'waiting-on-nation' ? CHAMPAGNE : done ? '#9be7c4' : '#a9c7e8'} solid={t.state === 'waiting-on-nation'}>{STATE_TEXT[t.state]}</Chip>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SlaTimer label="Response" c={t.sla.response} />
        <SlaTimer label="Resolution" c={t.sla.resolution} />
        <span className="font-mono text-[10.5px] text-white/40">Opened {fmtDateTime(t.openedAt)} by {t.openedBy} · {t.tier}</span>
        {t.link ? <Link href={t.link.kind === 'release' ? `/updates/${t.link.id}${q}` : `/updates/status${q}`} className="font-mono text-[10.5px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>{t.link.kind === 'release' ? `Release ${t.link.id}` : `Incident ${t.link.id}`}</Link> : null}
        {t.source === 'fallback-incident' ? <Chip tone="#c9b6ff">Opened automatically</Chip> : null}
      </div>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">{open ? 'Hide' : 'Show'} thread ({t.thread.length})</button>
      {open ? (
        <div className="mt-3">
          <ol className="grid gap-2">
            {t.thread.map((m, i) => (
              <li key={i} className={`rounded-[2px] border px-3 py-2 ${m.side === 'nation' ? 'sm:mr-10' : 'sm:ml-10'}`} style={{ borderColor: hair(m.side === 'publisher' ? 0.22 : 0.1), background: m.side === 'publisher' ? 'rgba(217,195,152,0.05)' : 'transparent' }}>
                <p className="font-mono text-[10px] text-white/40">{m.by}{m.side === 'publisher' ? ' (publisher)' : m.side === 'system' ? '' : ''} · {fmtDateTime(m.at)}</p>
                <p className="mt-0.5 text-[13px] font-light leading-relaxed text-white/75">{m.text}</p>
              </li>
            ))}
          </ol>
          {t.state !== 'closed' ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <textarea aria-label="Message" className={`${inputCls} min-h-[44px] min-w-[220px] flex-1 py-2 text-[13px]`} value={text} onChange={e => setText(e.target.value)} placeholder={t.state === 'resolved' ? 'Why it is not resolved (to reopen)' : 'Reply'} />
              {t.state !== 'resolved' ? <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => act('reply')}>Send</button> : (
                <>
                  <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => act('close')}>Confirm resolved</button>
                  <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act('reopen')}>Reopen</button>
                </>
              )}
            </div>
          ) : null}
          <div className="min-h-[16px]"><ErrorLine>{err}</ErrorLine></div>
        </div>
      ) : null}
    </Panel>
  );
}

function TicketForm({ d, link, onDone }: { d: Awaited<ReturnType<typeof api.updates.support>>; link?: string; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const [priority, setPriority] = React.useState<TicketPriority>('P3');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [about, setAbout] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const [kind, id] = about ? about.split(':') as ['release' | 'incident', string] : [undefined, undefined];
    try {
      await api.updates.openTicket({ priority, title, description, by: actor, about: kind && id ? { kind, id } : undefined, link });
      setTitle(''); setDescription(''); setAbout(''); onDone();
    } catch (x) { setErr(x instanceof Error ? x.message : 'Could not open the ticket'); }
    setBusy(false);
  }
  const target = d.policy.targets[priority];
  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Field label="Your name">
        <input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="e.g. Chief Information Officer" />
      </Field>
      <Field label="Priority" hint={`${d.priorities[priority]} — response within ${minutes(target.responseMinutes)}, resolution within ${hours(target.resolutionHours)}`}>
        <Select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}>
          {(['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </Field>
      <Field label="Title">
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="What is wrong, in one line" />
      </Field>
      <Field label="About">
        <Select value={about} onChange={e => setAbout(e.target.value)}>
          <option value="">General (no release or incident)</option>
          <optgroup label="Releases">{d.linkable.releases.map(r => <option key={r.id} value={`release:${r.id}`}>{r.version} — {r.title}</option>)}</optgroup>
          {d.linkable.incidents.length ? <optgroup label="Fallback incidents">{d.linkable.incidents.map(i => <option key={i.id} value={`incident:${i.id}`}>{i.id} — {i.title}</option>)}</optgroup> : null}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" hint="What happened, who is affected, since when, and what you have tried.">
          <textarea className={`${inputCls} min-h-[96px]`} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className={`${goldBtn} px-5 py-2.5 text-[13px]`} style={goldStyle}>Open ticket</button>
        <ErrorLine>{err}</ErrorLine>
      </div>
    </form>
  );
}

function ReportPanel({ link }: { link?: string }) {
  const [month, setMonth] = React.useState<string | undefined>();
  const [d, setD] = React.useState<{ report: SlaReport; months: string[] } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.slaReport(month, link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not build the report')); }, [month, link]);
  if (!d) return <div className="min-h-[220px]"><ErrorLine>{err}</ErrorLine></div>;
  const r = d.report;
  const qs = new URLSearchParams({ month: r.month, download: '1', ...(link ? { link } : {}) });
  const label = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select aria-label="Month" value={r.month} onChange={e => setMonth(e.target.value)} className="w-auto">
          {d.months.map(m => <option key={m} value={m}>{label(m)}</option>)}
        </Select>
        <a href={`/api/releases/sla-report?${qs}`} download className="text-[12.5px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>Download JSON ↓</a>
        <span className="ml-auto font-mono text-[10px] text-white/40">{r.tier.label} tier · generated {fmtDateTime(r.generatedAt)}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Availability</p>
          <p className="mt-1 text-[1.8rem] font-extralight" style={{ color: r.uptimeMet ? '#9be7c4' : '#f1938f' }}>{r.serviceUptime.toFixed(3)}%</p>
          <p className="text-[12px] font-light text-white/50">Target {r.tier.uptimeTarget}% · {r.uptimeMet ? 'met' : `missed — ${r.creditPct}% service credit`}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">First response on time</p>
          <p className="mt-1 text-[1.8rem] font-extralight text-[#f3efe6]">{r.tickets.responsePct === null ? '—' : `${r.tickets.responsePct}%`}</p>
          <p className="text-[12px] font-light text-white/50">{r.tickets.opened} ticket{r.tickets.opened === 1 ? '' : 's'} opened</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Resolved on time</p>
          <p className="mt-1 text-[1.8rem] font-extralight text-[#f3efe6]">{r.tickets.resolutionPct === null ? '—' : `${r.tickets.resolutionPct}%`}</p>
          <p className="text-[12px] font-light text-white/50">{r.incidents.length} incident{r.incidents.length === 1 ? '' : 's'} this month</p>
        </Panel>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-4 font-normal">Service</th><th className="py-2 pr-4 font-normal">Availability</th><th className="py-2 font-normal">Unplanned downtime</th></tr></thead>
          <tbody>{r.uptime.map(u => (
            <tr key={u.key} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-4 text-white/70">{u.label}</td>
              <td className="py-2 pr-4 font-mono text-[12px]" style={{ color: u.uptime >= r.tier.uptimeTarget ? '#9be7c4' : '#f1938f' }}>{u.uptime.toFixed(3)}%</td>
              <td className="py-2 font-mono text-[12px] text-white/55">{u.downtimeMinutes ? `${u.downtimeMinutes} min` : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-4 font-normal">Priority</th><th className="py-2 pr-4 font-normal">Opened</th><th className="py-2 pr-4 font-normal">Response met / breached</th><th className="py-2 pr-4 font-normal">Resolution met / breached</th><th className="py-2 font-normal">Still open</th></tr></thead>
          <tbody>{(Object.keys(r.tickets.byPriority) as TicketPriority[]).map(p => { const b = r.tickets.byPriority[p]; return (
            <tr key={p} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-4"><Chip tone={PRIORITY_TONE[p]}>{p}</Chip></td>
              <td className="py-2 pr-4 font-mono text-[12px] text-white/70">{b.opened}</td>
              <td className="py-2 pr-4 font-mono text-[12px]"><span className="text-[#9be7c4]">{b.responseMet}</span> / <span className={b.responseBreached ? 'text-[#f1938f]' : 'text-white/45'}>{b.responseBreached}</span></td>
              <td className="py-2 pr-4 font-mono text-[12px]"><span className="text-[#9be7c4]">{b.resolutionMet}</span> / <span className={b.resolutionBreached ? 'text-[#f1938f]' : 'text-white/45'}>{b.resolutionBreached}</span></td>
              <td className="py-2 font-mono text-[12px] text-white/55">{b.open}</td>
            </tr>
          ); })}</tbody>
        </table>
      </div>
      {r.incidents.length ? (
        <ul className="grid gap-1.5">
          {r.incidents.map(i => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-light text-white/65">
              <span className="font-mono text-[10.5px] text-white/40">{i.id}</span>
              <Chip tone={i.kind === 'fallback' ? '#c9b6ff' : IMPACT_TONE[i.impact as ServiceImpact] ?? '#a5abb5'}>{i.kind === 'fallback' ? `fallback · ${i.impact}` : IMPACT_TEXT[i.impact as ServiceImpact] ?? i.impact}</Chip>
              <span className="min-w-0 flex-1">{i.title}</span>
              <span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(i.startedAt)}{i.minutes !== undefined ? ` · ${duration(i.minutes)}` : ''}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-[12.5px] font-light text-white/50">No incidents in {label(r.month)}.</p>}
    </div>
  );
}

// ── Status page ───────────────────────────────────────────────────────
export function StatusCenter() {
  const { link, q } = useLink();
  const [s, setS] = React.useState<StatusPage | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.status(link).then(r => setS(r.status)).catch(e => setErr(e instanceof Error ? e.message : 'Could not load the status page')); }, [link]);
  const { nation } = useCenterTitle(s?.nation.name, true);
  return (
    <OnboardingFrame right={<ChamberNav q={q} active="support" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="support" />
        <Eyebrow>Update Center · service status</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Status{nation ? <> — <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span></> : null}
        </h1>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !s ? <Loading label="Checking services…" /> : <StatusView s={s} q={q} />}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function StatusView({ s, q }: { s: StatusPage; q: string }) {
  const groups: { k: 'installation' | 'hosted' | 'publisher'; title: string; note: string }[] = [
    { k: 'installation', title: 'Your installation (live)', note: 'From the operations dashboard of this installation.' },
    { k: 'hosted', title: 'Hosted platform', note: 'Run for you by the publisher.' },
    { k: 'publisher', title: 'Publisher services', note: s.nation.deliveryMode === 'saas' ? 'Updates, advisories and support.' : 'You run the platform yourselves; these are the services you rely on from the publisher.' },
  ];
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[2px] border px-5 py-4" style={{ borderColor: `${IMPACT_TONE[s.overall]}66`, background: `${IMPACT_TONE[s.overall]}10` }}>
        <span className="h-3 w-3 rounded-full" style={{ background: IMPACT_TONE[s.overall] }} />
        <span className="text-[17px] font-light text-[#f3efe6]">{s.overall === 'operational' ? 'All services operational' : IMPACT_TEXT[s.overall]}</span>
        <span className="ml-auto font-mono text-[10.5px] text-white/40">Updated {fmtDateTime(s.generatedAt)}</span>
      </div>
      {s.active.length ? (
        <Section n="01" title="Happening now">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3">{s.active.map(i => <IncidentItem key={i.id} i={i} />)}</div>
        </Section>
      ) : null}
      <Section n={s.active.length ? '02' : '01'} title="Services" aside="90 days · planned maintenance excluded">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {groups.map(g => {
            const cs = s.components.filter(c => c.group === g.k);
            if (!cs.length) return null;
            return (
              <div key={g.k}>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/75">{g.title}</p>
                <p className="mb-2 text-[12px] font-light text-white/45">{g.note}</p>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                  {cs.map(c => (
                    <Panel key={c.key} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[14px] font-light text-[#f3efe6]">{c.label}</span>
                        {c.uptime90 !== undefined ? <span className="font-mono text-[10.5px] text-white/45">{c.uptime90.toFixed(3)}% uptime</span> : null}
                        {c.detail ? <span className="text-[12px] font-light text-white/45">{c.detail}</span> : null}
                        <span className="ml-auto"><Chip tone={IMPACT_TONE[c.status]}>{IMPACT_TEXT[c.status]}</Chip></span>
                      </div>
                      {c.days ? (
                        <div className="mt-2 flex h-6 gap-[2px]" role="img" aria-label={`${c.label}: daily status for 90 days`}>
                          {c.days.map(d => <span key={d.date} title={`${d.date}: ${IMPACT_TEXT[d.impact]}`} className="min-w-0 flex-1 rounded-[1px]" style={{ background: d.impact === 'operational' ? 'rgba(155,231,196,0.35)' : IMPACT_TONE[d.impact] }} />)}
                        </div>
                      ) : null}
                    </Panel>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
      <Section n={s.active.length ? '03' : '02'} title="Maintenance" aside="Announced work and your windows">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {s.maintenance.upcoming.map((m, i) => (
            <Panel key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <Chip tone={m.kind === 'install' ? CHAMPAGNE : IMPACT_TONE.maintenance}>{m.kind === 'install' ? 'Your upgrade' : 'Publisher'}</Chip>
              <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{m.title}</span>
              <span className="font-mono text-[11px] text-white/55">{fmtDateTime(m.start)} → {fmtDateTime(m.end)}</span>
            </Panel>
          ))}
          {!s.maintenance.upcoming.length ? <p className="text-[13px] font-light text-white/50">No maintenance announced.</p> : null}
          <p className="text-[12.5px] font-light text-white/50">
            Your maintenance windows: {s.maintenance.windows.map(w => `${DAYS[w.day]} ${w.start} (${w.hours} h)`).join(' · ') || 'none set'}
            {s.maintenance.blackouts.length ? ` · blackouts: ${s.maintenance.blackouts.map(b => `${b.label} (${fmtDate(b.start)}–${fmtDate(b.end)})`).join(', ')}` : ''}
            {' · '}<Link href={`/updates/settings${q}`} className="underline underline-offset-4" style={{ color: CHAMPAGNE }}>change control</Link>
          </p>
        </div>
      </Section>
      <Section n={s.active.length ? '04' : '03'} title="Past 30 days">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {s.recent.map(i => <IncidentItem key={i.id} i={i} />)}
          {s.fallbackIncidents.map(i => (
            <Panel key={i.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-[11px] text-white/45">{i.id}</span>
                <Chip tone="#c9b6ff">Fallback · {i.trigger}</Chip>
                <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">Software {i.fromVersion} → {i.toVersion}</span>
                <span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(i.openedAt)}</span>
              </div>
            </Panel>
          ))}
          {!s.recent.length && !s.fallbackIncidents.length ? <p className="text-[13px] font-light text-[#9be7c4]">No incidents in the past 30 days.</p> : null}
        </div>
      </Section>
      <p className="mt-10 text-[12.5px] font-light text-white/45">Something wrong that is not shown here? <Link href={`/updates/support${q}`} className="underline underline-offset-4" style={{ color: CHAMPAGNE }}>Open a support ticket</Link>.</p>
    </>
  );
}

function IncidentItem({ i }: { i: StatusPage['active'][number] }) {
  const last = i.updates[i.updates.length - 1]!;
  return (
    <Panel className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] text-white/45">{i.id}</span>
        <Chip tone={IMPACT_TONE[i.impact]} solid={i.impact === 'major-outage' && !i.resolvedAt}>{IMPACT_TEXT[i.impact]}</Chip>
        <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{i.title}</span>
        <span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(i.startedAt)}{i.resolvedAt ? ` · ${duration((Date.parse(i.resolvedAt) - Date.parse(i.startedAt)) / 60_000)}` : ''}</span>
      </div>
      <p className="mt-1.5 text-[12.5px] font-light text-white/60"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d9c398]/70">{last.state}</span> {last.text}</p>
    </Panel>
  );
}
