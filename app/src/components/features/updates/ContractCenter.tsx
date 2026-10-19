'use client';

// Licence and contract: the nation's contract summary (kind, modules, seats,
// term, renewal, support tier, billing) and the publisher's view of all.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { formatMoney } from '@/lib/nation/registry';
import { OnboardingFrame, Eyebrow, Section, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { Contract, ContractInvoice, AdvisorySeverity } from '@/lib/api/types';
import { ChamberNav, ChamberTabs, Chip, ErrorLine, Loading, Panel, PoweredBy, fmtDate, fmtDateTime, useActor, useCenterTitle, useLink } from './ui';
import { TierTable } from './SupportCenter';
import { PATH_TITLE } from './HostingCenter';

export const KIND_TEXT: Record<Contract['kind'], string> = { 'hosted-subscription': 'Hosted subscription', 'self-run-subscription': 'Platform subscription (you run it)', 'perpetual-licence': 'Perpetual licence with support and updates' };
const INV_TONE: Record<ContractInvoice['status'], string> = { paid: '#9be7c4', due: '#f4d58d', overdue: '#f1938f', upcoming: '#a5abb5' };
export const RENEWAL_TEXT: Record<Contract['renewal']['status'], string> = { 'not-due': 'Not due', 'notice-period': 'Renewal window open', proposed: 'Renewal proposed', renewed: 'Renewed', lapsed: 'Lapsed' };
const RENEWAL_TONE: Record<Contract['renewal']['status'], string> = { 'not-due': '#a5abb5', 'notice-period': '#f4d58d', proposed: CHAMPAGNE, renewed: '#9be7c4', lapsed: '#f1938f' };
const hrs = (h: number) => (h < 72 ? `${h} h` : `${Math.round(h / 24)} days`);

export function InvoiceTable({ invoices }: { invoices: ContractInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[12.5px] font-light">
        <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-3 font-normal">Invoice</th><th className="py-2 pr-3 font-normal">For</th><th className="py-2 pr-3 font-normal">Issued</th><th className="py-2 pr-3 font-normal">Due</th><th className="py-2 pr-3 text-right font-normal">Amount</th><th className="py-2 font-normal">Status</th></tr></thead>
        <tbody>{invoices.map(i => (
          <tr key={`${i.source}:${i.id}`} className="border-t" style={{ borderColor: hair(0.08) }}>
            <td className="py-2 pr-3 font-mono text-[11px] text-white/55">{i.id}</td>
            <td className="py-2 pr-3 text-white/70">{i.description}<span className="block text-[10.5px] text-white/35">{i.source === 'security-store' ? 'Security store' : 'Platform'}{i.reference ? ` · ref ${i.reference}` : ''}</span></td>
            <td className="py-2 pr-3 font-mono text-[11px] text-white/55">{fmtDate(i.issuedAt)}</td>
            <td className="py-2 pr-3 font-mono text-[11px] text-white/55">{fmtDate(i.dueAt)}</td>
            <td className="py-2 pr-3 text-right font-mono text-[12px] text-[#f3efe6]">{formatMoney(i.amount, { compact: false, digits: 0, currency: i.currency })}</td>
            <td className="py-2"><Chip tone={INV_TONE[i.status]} solid={i.status === 'overdue'}>{i.status}{i.paidAt ? ` ${fmtDate(i.paidAt)}` : ''}</Chip></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function ContractCenter() {
  const { link, q } = useLink();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.contract>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api.updates.contract(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service')); }, [link]);
  React.useEffect(load, [load]);
  const { nation } = useCenterTitle(d?.contract.nationName, true);
  const c = d?.contract;
  const money = (v: number) => formatMoney(v, { compact: false, digits: 0, currency: c?.currency });
  return (
    <OnboardingFrame right={<ChamberNav q={q} active="contract" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="contract" />
        <Eyebrow>Update Center · licence and contract</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          {nation ? <><span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span>’s contract</> : 'Your contract'}
        </h1>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !d || !c ? <Loading label="Opening the contract…" /> : (
          <>
            <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Contract', `${KIND_TEXT[c.kind]}`, `${c.id} · ${PATH_TITLE[c.hostingPath]}${c.plan ? ` · ${c.plan} plan` : ''}`],
                ['Term', `${fmtDate(c.term.start)} – ${fmtDate(c.term.end)}`, `${c.term.years} year${c.term.years > 1 ? 's' : ''}`],
                ['Annual fee', money(c.annualFee), c.localPricing ? c.feeBasis : `${c.feeBasis} · reference currency until your contract rate is set`],
                ['Support', d.tier.label, d.tier.coverage],
              ].map(([k, v, s]) => (
                <Panel key={k} className="px-4 py-3">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">{k}</p>
                  <p className="mt-1 text-[16px] font-light text-[#f3efe6]">{v}</p>
                  <p className="mt-0.5 text-[11.5px] font-light text-white/45">{s}</p>
                </Panel>
              ))}
            </div>
            <Renewal c={c} link={link} onDone={load} money={money} />
            <Section n="01" title="Modules and seats" aside={`${c.modules.filter(m => m.entitled).length} of ${c.modules.length} modules`}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                  {c.modules.map(m => (
                    <li key={m.key} className="flex items-center gap-2 rounded-[2px] border px-3 py-2 text-[13px] font-light" style={{ borderColor: hair(m.entitled ? 0.2 : 0.08), color: m.entitled ? 'rgba(243,239,230,0.85)' : 'rgba(243,239,230,0.35)' }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.entitled ? '#9be7c4' : 'rgba(243,239,230,0.2)' }} />{m.label}{m.entitled ? null : <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.16em]">Not included</span>}
                    </li>
                  ))}
                </ul>
                <Panel className="px-4 py-4">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Officer seats</p>
                  <p className="mt-1 text-[1.6rem] font-extralight text-[#f3efe6]">{c.seats.used.toLocaleString()} <span className="text-[14px] text-white/45">of {c.seats.licensed.toLocaleString()} in use</span></p>
                  <div className="mt-3 h-2 rounded-full" style={{ background: hair(0.1) }}><div className="h-2 rounded-full" style={{ width: `${Math.min(100, (c.seats.used / c.seats.licensed) * 100)}%`, background: c.seats.used / c.seats.licensed > 0.9 ? '#f1b36b' : '#9be7c4' }} /></div>
                  <p className="mt-2 text-[11.5px] text-white/40">Citizens are not counted as seats.</p>
                </Panel>
              </div>
            </Section>
            <Section n="02" title="Billing" aside={c.outstanding ? `${money(c.outstanding)} outstanding` : 'Nothing outstanding'}>
              <InvoiceTable invoices={c.invoices} />
              <p className="mt-3 text-[12px] font-light text-white/45">Platform invoices follow the contract; security-store invoices are the ones in the <Link href={`/updates/security${q}`} className="underline underline-offset-4" style={{ color: CHAMPAGNE }}>security store</Link>, shown here for one view of what you owe.</p>
            </Section>
            <Section n="03" title="Service levels in this contract" aside={`${d.tier.label} tier`}>
              <TierTable policy={d.tier} priorities={d.priorities} />
              <p className="mt-3 text-[12.5px] font-light text-white/55">Security patch commitments: {(Object.keys(d.patchCommitments) as AdvisorySeverity[]).map(s => `${s} ${hrs(d.patchCommitments[s])}`).join(' · ')}. Source code held in escrow — see <Link href={`/updates/assurance${q}`} className="underline underline-offset-4" style={{ color: CHAMPAGNE }}>Assurance</Link>.</p>
            </Section>
            <Section n="04" title="Contract history">
              <ol className="grid gap-1.5">{[...c.history].reverse().map((h, i) => (
                <li key={i} className="text-[12.5px] font-light text-white/65"><span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(h.at)}</span> · {h.by} · <span className="text-[#f4e4bd]">{h.action}</span>{h.note ? ` — ${h.note}` : ''}</li>
              ))}</ol>
              <ChangeRequest link={link} onDone={load} />
            </Section>
          </>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Renewal({ c, link, onDone, money }: { c: Contract; link?: string; onDone: () => void; money: (v: number) => string }) {
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  const tone = RENEWAL_TONE[c.renewal.status];
  async function accept() {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name below first.'); return; }
    try { await api.updates.contractAction({ action: 'accept-renewal', by: actor, link }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not accept'); }
  }
  const p = c.renewal.proposal;
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-[3px] border px-5 py-4 sm:flex-row sm:items-center" style={{ borderColor: `${tone}66`, background: `${tone}0d` }}>
      <Chip tone={tone} solid={c.renewal.status === 'lapsed'}>{RENEWAL_TEXT[c.renewal.status]}</Chip>
      <p className="flex-1 text-[13.5px] font-light text-[#f3efe6]/85">
        {c.renewal.status === 'proposed' && p ? `The publisher proposes ${p.years} more year${p.years > 1 ? 's' : ''} at ${money(p.annualFee)} a year (${p.by}, ${fmtDate(p.at)}). Nothing renews unless an official accepts.`
          : c.renewal.status === 'renewed' ? `Renewed by ${c.renewal.acceptedBy} on ${fmtDate(c.renewal.acceptedAt)}; the term now ends ${fmtDate(c.term.end)}.`
          : c.renewal.status === 'notice-period' ? `The term ends ${fmtDate(c.term.end)}. The renewal window opened ${fmtDate(c.renewal.noticeFrom)} (${c.renewal.noticeDays} days before). Renewal is never automatic.`
          : c.renewal.status === 'lapsed' ? `The term ended ${fmtDate(c.term.end)}. Your data and installed software remain yours; new releases and support need a renewal.`
          : `The term ends ${fmtDate(c.term.end)}; the renewal window opens ${fmtDate(c.renewal.noticeFrom)}.`}
      </p>
      {c.renewal.status === 'proposed' ? <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={accept}>Accept renewal</button> : null}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

function ChangeRequest({ link, onDone }: { link?: string; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const [note, setNote] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  async function send() {
    setErr(null);
    try { await api.updates.contractAction({ action: 'request-change', by: actor, note, link }); setNote(''); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not send'); }
  }
  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <input aria-label="Your name" className={`${inputCls} w-[220px] py-2 text-[13px]`} value={actor} onChange={e => setActor(e.target.value)} placeholder="Your name" />
      <input aria-label="Change needed" className={`${inputCls} min-w-[240px] flex-1 py-2 text-[13px]`} value={note} onChange={e => setNote(e.target.value)} placeholder="Change you need (modules, seats, tier, term…)" />
      <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={send}>Ask for a change</button>
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

// ── Publisher console ─────────────────────────────────────────────────
export function PublisherContracts() {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.publisher.contracts>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [seats, setSeats] = React.useState<Record<string, string>>({});
  const [ref, setRef] = React.useState<Record<string, string>>({});
  const load = React.useCallback(() => { api.updates.publisher.contracts().then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, []);
  React.useEffect(load, [load]);
  if (!d) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  async function act(nationId: string, body: Record<string, unknown>) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.contractAction({ nationId, by: actor, ...body } as never); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Action failed'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
            <th className="py-2 pr-3 font-normal">Nation</th><th className="py-2 pr-3 font-normal">Contract</th><th className="py-2 pr-3 font-normal">Tier</th><th className="py-2 pr-3 font-normal">Seats</th><th className="py-2 pr-3 font-normal">Term ends</th><th className="py-2 pr-3 font-normal">Renewal</th><th className="py-2 pr-3 text-right font-normal">Annual</th><th className="py-2 pr-3 text-right font-normal">Outstanding</th><th className="py-2 font-normal" />
          </tr></thead>
          <tbody>{d.contracts.map(c => (
            <tr key={c.id} className="border-t align-middle" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3 text-[#f3efe6]">{c.nationName}<span className="block font-mono text-[10px] text-white/40">{c.id}</span></td>
              <td className="py-2 pr-3 text-white/65">{KIND_TEXT[c.kind]}<span className="block text-[10.5px] text-white/40">{PATH_TITLE[c.hostingPath]}{c.plan ? ` · ${c.plan}` : ''}</span></td>
              <td className="py-2 pr-3">
                <Select aria-label={`Tier for ${c.nationName}`} value={c.supportTier} onChange={e => act(c.nationId, { action: 'set-tier', tier: e.target.value })} className="w-auto py-1.5 text-[12px]">
                  <option value="standard">Standard</option><option value="enterprise">Enterprise</option><option value="sovereign">Sovereign</option>
                </Select>
              </td>
              <td className="py-2 pr-3 font-mono text-[11.5px] text-white/60">{c.seats.used}/{c.seats.licensed}</td>
              <td className="py-2 pr-3 font-mono text-[11.5px] text-white/60">{fmtDate(c.term.end)}</td>
              <td className="py-2 pr-3"><Chip tone={RENEWAL_TONE[c.renewal.status]}>{RENEWAL_TEXT[c.renewal.status]}</Chip></td>
              <td className="py-2 pr-3 text-right font-mono text-[12px] text-white/75">{formatMoney(c.annualFee, { compact: true, currency: c.currency })}</td>
              <td className="py-2 pr-3 text-right font-mono text-[12px]" style={{ color: c.outstanding ? '#f4d58d' : 'rgba(243,239,230,0.45)' }}>{c.outstanding ? formatMoney(c.outstanding, { compact: true, currency: c.currency }) : '—'}</td>
              <td className="py-2 text-right"><button type="button" className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 hover:text-[#f4e4bd]" onClick={() => setOpen(o => (o === c.id ? null : c.id))}>{open === c.id ? 'Close' : 'Manage'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {d.contracts.filter(c => c.id === open).map(c => (
        <Panel key={c.id} className="grid grid-cols-[minmax(0,1fr)] gap-3 px-4 py-4">
          <p className="text-[13px] font-light text-[#f3efe6]">{c.nationName} — {c.id}</p>
          <div className="flex flex-wrap items-end gap-2">
            <input aria-label="Licensed seats" type="number" className={`${inputCls} w-[120px] py-2 text-[13px]`} value={seats[c.id] ?? String(c.seats.licensed)} onChange={e => setSeats({ ...seats, [c.id]: e.target.value })} />
            <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act(c.nationId, { action: 'set-seats', licensed: Number(seats[c.id] ?? c.seats.licensed) })}>Set seats</button>
            {[1, 3, 5].map(y => <button key={y} type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act(c.nationId, { action: 'propose-renewal', years: y })}>Propose {y}-year renewal</button>)}
          </div>
          <div className="flex flex-wrap gap-3">
            {d.modules.map(m => {
              const on = c.modules.find(x => x.key === m.key)?.entitled;
              const next = c.modules.filter(x => x.entitled).map(x => x.key);
              return (
                <label key={m.key} className="flex items-center gap-1.5 text-[12px] font-light text-white/65">
                  <input type="checkbox" checked={!!on} onChange={e => act(c.nationId, { action: 'set-modules', modules: e.target.checked ? [...next, m.key] : next.filter(k => k !== m.key) })} />{m.label}
                </label>
              );
            })}
          </div>
          {c.invoices.filter(i => i.source === 'platform' && (i.status === 'due' || i.status === 'overdue')).map(i => (
            <div key={i.id} className="flex flex-wrap items-end gap-2 text-[12.5px] text-white/60">
              <span className="font-mono text-[11px]">{i.id}</span> {formatMoney(i.amount, { compact: false, digits: 0, currency: i.currency })} {i.status}
              <input aria-label="Payment reference" className={`${inputCls} w-[180px] py-1.5 text-[12.5px]`} value={ref[i.id] ?? ''} onChange={e => setRef({ ...ref, [i.id]: e.target.value })} placeholder="Payment reference" />
              <button type="button" className={`${ghostBtn} py-1.5 text-[12px]`} onClick={() => act(c.nationId, { action: 'mark-paid', invoiceId: i.id, reference: ref[i.id] })}>Payment received</button>
            </div>
          ))}
        </Panel>
      ))}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}
