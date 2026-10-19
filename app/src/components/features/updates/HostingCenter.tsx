'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { formatMoney } from '@/lib/nation/registry';
import { estimate as computeEstimate, validateQuestionnaire } from '@/lib/updates/hosting-model';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { HostingCenter as Center, HostingEstimate, HostingPath, HostingQuestionnaire, HostingRequest, HostingStage } from '@/lib/api/types';
import { ChamberNav, ChamberTabs, Chip, ErrorLine, Loading, Panel, PoweredBy, fmtDateTime, useActor, useCenterTitle, useLink } from './ui';

export const PATHS: { k: HostingPath; title: string; who: string; autonomy: string; tone: string; line: string; points: string[]; data: string }[] = [
  { k: 'sovereign-dc', title: 'Sovereign data centre', who: 'Your own staff, in your own facilities', autonomy: 'Full autonomy', tone: '#9be7c4',
    line: 'Build and run independent primary and disaster-recovery sites in the country.',
    points: ['Tier III-class primary + DR site', 'Hardware, network and security you own', 'Assessment: sizing, phased timeline, capital budget, running cost, staffing'], data: 'In your facilities' },
  { k: 'other-cloud', title: 'Another cloud', who: 'Your team, on a provider you choose', autonomy: 'High autonomy', tone: '#a9c7e8',
    line: 'Run the platform on a public hyperscaler, a regional sovereign cloud or your private cloud.',
    points: ['Compatibility check: Kubernetes, PostgreSQL, object storage, KMS', 'Residency fit and landing zone', 'Migration timeline and annual cloud + operations cost'], data: 'In the provider’s region you choose' },
  { k: 'hosted', title: 'Our hosted cloud', who: 'Our operations team', autonomy: 'Managed for you', tone: CHAMPAGNE,
    line: 'Subscribe yearly, or prepay five years at a discount. We operate; you decide every upgrade.',
    points: ['Standard, Enterprise or Sovereign-dedicated plans', 'Blue-green upgrades, probation, automatic software fallback', 'Data export at any time'], data: 'Our sovereign regions (or dedicated in yours)' },
  { k: 'perpetual', title: 'Buy outright', who: 'You, entirely on your own', autonomy: 'Complete independence', tone: '#c9b6ff',
    line: 'A perpetual licence: run it wherever and however you like, without consulting us.',
    points: ['One-off licence; issued at once from the price list', 'Optional support and update subscriptions', 'No connection to us required, ever'], data: 'Wherever you put it' },
];
export const PATH_TITLE: Record<HostingPath, string> = Object.fromEntries(PATHS.map(p => [p.k, p.title])) as Record<HostingPath, string>;
const STAGES: HostingStage[] = ['preliminary', 'in-review', 'issued', 'accepted'];
const STAGE_TEXT: Record<HostingStage, string> = { preliminary: 'Preliminary estimate', 'in-review': 'Engineering review', issued: 'Assessment issued', 'revision-requested': 'Revision requested', accepted: 'Accepted', withdrawn: 'Withdrawn' };
const weeksText = (w: { min: number; max: number }) => `${Math.round(w.min / 4.33)}–${Math.round(w.max / 4.33)} months`;

export function HostingCenter() {
  const { link, q } = useLink();
  const [c, setC] = React.useState<Center | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.updates.hosting(link).then(r => setC(r.hosting)).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service'));
  }, [link]);
  React.useEffect(load, [load]);
  const { nation } = useCenterTitle(c?.nation.name, c?.nation.home ?? true);
  const [path, setPath] = React.useState<HostingPath>('sovereign-dc');
  const formRef = React.useRef<HTMLDivElement>(null);
  const pick = (p: HostingPath) => { setPath(p); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="hosting" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="hosting" />
        <Eyebrow>Update Center · hosting & deployment</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Where {nation ? <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span> : 'this installation'} runs
        </h1>
        <p className="mt-4 max-w-[70ch] text-[15px] font-light leading-relaxed text-white/55">
          Four ways to run the platform, from complete autonomy to fully managed. Ask for an assessment of any of them; switch later with a migration plan. Your data can be exported at any time, and no path locks you in.
        </p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !c ? <Loading label="Assessing paths…" /> : (
          <>
            <Section n="01" title="Four paths, side by side" aside={`Indicative estimates · ${c.currency}${c.localPricing ? '' : ' (reference currency until a contract rate is set)'}`}>
              <Comparison c={c} onPick={pick} />
            </Section>
            <div ref={formRef} className="scroll-mt-6">
              <Section n="02" title="Request an assessment">
                <RequestForm c={c} path={path} setPath={setPath} link={link} onDone={load} />
              </Section>
            </div>
            <Section n="03" title="Your requests" aside={`${c.requests.length} on record`}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
                {c.requests.map(r => <RequestCard key={r.id} r={r} link={link} onDone={load} />)}
                {!c.requests.length ? <p className="text-[13.5px] font-light text-white/50">No requests yet.</p> : null}
              </div>
            </Section>
            <Section n="04" title="How the estimates are made" aside={`Cost model ${c.model.version}`}>
              <p className="max-w-[72ch] text-[13.5px] font-light leading-relaxed text-white/60">Every figure is computed from your answers with a published cost model: the unit costs below, multiplied out line by line (each line shows its basis). Unit costs are placeholders in US dollars until the publisher sets contract prices, and an engineering review adjusts the estimate before an official, versioned assessment is issued. Taxes, duties and land are excluded.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px] font-light">
                  <tbody>{c.model.unitCosts.map(u => (
                    <tr key={u.label} className="border-t" style={{ borderColor: hair(0.08) }}><td className="py-2 pr-4 text-white/65">{u.label}</td><td className="py-2 font-mono text-[12px] text-[#f4e4bd]">{u.value}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </Section>
          </>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Comparison({ c, onPick }: { c: Center; onPick: (p: HostingPath) => void }) {
  const money = (v: number) => formatMoney(v, { compact: true, currency: c.currency });
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PATHS.map(p => {
          const e = c.comparison[p.k];
          const current = c.currentPath === p.k;
          return (
            <Panel key={p.k} strong={current} className="flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2"><Chip tone={p.tone} solid>{p.autonomy}</Chip>{current ? <Chip tone="#9be7c4">Your path today</Chip> : null}</div>
              <p className="mt-3 text-[18px] font-light text-[#f3efe6]">{p.title}</p>
              <p className="mt-1 text-[12.5px] font-light text-white/45">{p.who}</p>
              <p className="mt-3 text-[13px] font-light leading-relaxed text-white/60">{p.line}</p>
              <dl className="mt-4 grid grid-cols-2 gap-px" style={{ background: hair(0.1) }}>
                {[['Up-front', money(e.capexTotal)], ['Per year', money(e.annualTotal)], ['5-year total', money(e.fiveYearTotal)], ['Time to live', weeksText(e.totalWeeks)]].map(([k, v]) => (
                  <div key={k} className="bg-[#05070b] px-3 py-2.5"><dt className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#d9c398]/60">{k}</dt><dd className="mt-1 font-mono text-[13px] tabular-nums text-[#f3efe6]">{v}</dd></div>
                ))}
              </dl>
              <ul className="mt-4 space-y-1">{p.points.map(t => <li key={t} className="text-[12px] font-light text-white/55">· {t}</li>)}</ul>
              {p.k === 'perpetual' ? <p className="mt-3 rounded-[2px] border px-3 py-2 text-[12px] font-light text-[#c9b6ff]" style={{ borderColor: '#c9b6ff44' }}>You can operate entirely on your own — no consultation with us is needed.</p> : null}
              <button type="button" className={`${ghostBtn} mt-auto w-full`} style={{ marginTop: 20 }} onClick={() => onPick(p.k)}>{p.k === 'perpetual' ? 'Get the licence quote' : 'Request assessment'}</button>
            </Panel>
          );
        })}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-4 font-normal">At a glance</th>{PATHS.map(p => <th key={p.k} className="py-2 pr-4 font-normal">{p.title}</th>)}</tr></thead>
          <tbody>
            {([
              ['Who operates it', (p: typeof PATHS[number]) => p.who],
              ['Where the data lives', (p: typeof PATHS[number]) => p.data],
              ['Up-front (estimate)', (p: typeof PATHS[number]) => money(c.comparison[p.k].capexTotal)],
              ['Per year (estimate)', (p: typeof PATHS[number]) => money(c.comparison[p.k].annualTotal)],
              ['Five years (estimate)', (p: typeof PATHS[number]) => money(c.comparison[p.k].fiveYearTotal)],
              ['Time to live', (p: typeof PATHS[number]) => weeksText(c.comparison[p.k].totalWeeks)],
              ['Leave later?', () => 'Yes — export and migrate'],
            ] as [string, (p: typeof PATHS[number]) => string][]).map(([label, f]) => (
              <tr key={label} className="border-t" style={{ borderColor: hair(0.08) }}>
                <td className="py-2.5 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</td>
                {PATHS.map(p => <td key={p.k} className="py-2.5 pr-4 text-white/75">{f(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] font-light text-white/40">Indicative, from {c.requests.length ? 'your latest answers' : 'default answers sized to your estate'}. The perpetual licence excludes the infrastructure you run it on.</p>
    </>
  );
}

function RequestForm({ c, path, setPath, link, onDone }: { c: Center; path: HostingPath; setPath: (p: HostingPath) => void; link?: string; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const [f, setF] = React.useState<HostingQuestionnaire>(c.basis);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const set = <K extends keyof HostingQuestionnaire>(k: K, v: HostingQuestionnaire[K]) => setF(x => ({ ...x, [k]: v }));
  const num = (k: keyof HostingQuestionnaire) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  const problems = validateQuestionnaire(f);
  const preview = problems.length ? null : computeEstimate(path, f, c.rate, c.currency, c.currentPath);
  const caps = f.capabilities ?? { kubernetes: true, managedPostgres: true, objectStorage: true, kms: true };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null); setBusy(true);
    try {
      const r = await api.updates.requestHosting({ path, questionnaire: f, by: actor, link });
      setOk(r.request.stage === 'issued' ? `${r.request.id}: licence quote issued — accept it below when ready.` : `${r.request.id}: preliminary estimate ready; engineering review requested.`);
      onDone();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not submit'); }
    finally { setBusy(false); }
  }

  const needsSite = path === 'sovereign-dc';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1fr)_440px]">
      <form onSubmit={submit} className="grid gap-6" aria-label="Hosting assessment questionnaire">
        <div role="radiogroup" aria-label="Path" className="grid gap-2 sm:grid-cols-2">
          {PATHS.map(p => (
            <label key={p.k} className="flex cursor-pointer items-center gap-3 rounded-[3px] border px-4 py-3" style={{ borderColor: path === p.k ? CHAMPAGNE : hair(0.14), background: path === p.k ? hair(0.06) : 'transparent' }}>
              <input type="radio" name="path" className="h-4 w-4 accent-[#d9c398]" checked={path === p.k} onChange={() => setPath(p.k)} />
              <span className="text-[14px] font-light text-[#f3efe6]">{p.title}</span>
            </label>
          ))}
        </div>
        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">1 · Scale</legend>
          <Field label="Population"><input type="number" className={inputCls} value={f.population} onChange={num('population')} /></Field>
          <Field label="Active users"><input type="number" className={inputCls} value={f.activeUsers} onChange={num('activeUsers')} /></Field>
          <Field label="Institutions in scope"><input type="number" className={inputCls} value={f.institutions} onChange={num('institutions')} /></Field>
          <Field label="Services in scope"><input type="number" className={inputCls} value={f.services} onChange={num('services')} /></Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">2 · Data residency and law</legend>
          <Field label="Data must stay"><Select value={f.residency} onChange={e => set('residency', e.target.value as HostingQuestionnaire['residency'])}><option value="in-country">In the country</option><option value="regional">In the region</option><option value="none">No restriction</option></Select></Field>
          <Field label="Legal constraints" hint="Laws, accreditation or classification rules that apply."><input className={inputCls} value={f.legalConstraints} onChange={e => set('legalConstraints', e.target.value)} placeholder="e.g. Data Protection Act; national cloud accreditation" /></Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">3 · Availability and recovery</legend>
          <Field label="Target availability"><Select value={f.availability} onChange={e => set('availability', Number(e.target.value))}>{[99.5, 99.9, 99.95, 99.99].map(a => <option key={a} value={a}>{a}%</option>)}</Select></Field>
          <Field label="RTO (hours)" hint="Longest acceptable outage"><input type="number" className={inputCls} value={f.rtoHours} onChange={num('rtoHours')} /></Field>
          <Field label="RPO (minutes)" hint="Most data you can afford to lose"><input type="number" className={inputCls} value={f.rpoMinutes} onChange={num('rpoMinutes')} /></Field>
        </fieldset>
        {needsSite || path === 'perpetual' ? (
          <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">4 · Facilities, power, connectivity, staff</legend>
            <Field label="Existing facilities"><Select value={f.existingFacility} onChange={e => set('existingFacility', e.target.value as HostingQuestionnaire['existingFacility'])}><option value="none">None — new build</option><option value="partial">Partial — needs upgrade</option><option value="tier3-ready">Tier III-ready space</option></Select></Field>
            <Field label="Power"><Select value={f.power} onChange={e => set('power', e.target.value as HostingQuestionnaire['power'])}><option value="reliable">Reliable grid</option><option value="unstable">Unstable grid</option></Select></Field>
            <Field label="Connectivity"><Select value={f.connectivity} onChange={e => set('connectivity', e.target.value as HostingQuestionnaire['connectivity'])}><option value="redundant-fibre">Redundant fibre</option><option value="single-link">Single link</option><option value="limited">Limited</option></Select></Field>
            <Field label="In-country IT staff"><input type="number" className={inputCls} value={f.itStaff} onChange={num('itStaff')} /></Field>
          </fieldset>
        ) : null}
        {path === 'other-cloud' ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">4 · Your cloud</legend>
            <Field label="Provider type"><Select value={f.cloudKind} onChange={e => set('cloudKind', e.target.value as HostingQuestionnaire['cloudKind'])}><option value="public-hyperscaler">Public hyperscaler</option><option value="regional-sovereign">Regional sovereign cloud</option><option value="private-cloud">Private cloud</option></Select></Field>
            <Field label="In-country region"><Select value={f.cloudRegionInCountry ? 'yes' : 'no'} onChange={e => set('cloudRegionInCountry', e.target.value === 'yes')}><option value="yes">Yes</option><option value="no">No</option></Select></Field>
            <div className="flex flex-wrap gap-4 sm:col-span-2">
              {(['kubernetes', 'managedPostgres', 'objectStorage', 'kms'] as const).map(k => (
                <label key={k} className="flex items-center gap-2 text-[13px] font-light text-white/70">
                  <input type="checkbox" className="h-4 w-4 accent-[#d9c398]" checked={caps[k]} onChange={e => set('capabilities', { ...caps, [k]: e.target.checked })} />
                  {{ kubernetes: 'Managed Kubernetes', managedPostgres: 'Managed PostgreSQL', objectStorage: 'Object storage', kms: 'KMS / customer keys' }[k]}
                </label>
              ))}
            </div>
            <Field label="In-country IT staff"><input type="number" className={inputCls} value={f.itStaff} onChange={num('itStaff')} /></Field>
          </fieldset>
        ) : null}
        {path === 'hosted' ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">4 · Plan and term</legend>
            <Field label="Plan"><Select value={f.plan} onChange={e => set('plan', e.target.value as HostingQuestionnaire['plan'])}><option value="standard">Standard</option><option value="enterprise">Enterprise</option><option value="sovereign-dedicated">Sovereign dedicated</option></Select></Field>
            <Field label="Term"><Select value={f.term} onChange={e => set('term', Number(e.target.value) as 1 | 5)}><option value={1}>Yearly</option><option value={5}>5 years prepaid (discount)</option></Select></Field>
          </fieldset>
        ) : null}
        {path === 'perpetual' ? (
          <fieldset className="flex flex-wrap gap-6">
            <legend className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">5 · Optional subscriptions</legend>
            <label className="flex items-center gap-2 text-[13px] font-light text-white/70"><input type="checkbox" className="h-4 w-4 accent-[#c9b6ff]" checked={f.support !== false} onChange={e => set('support', e.target.checked)} />Support</label>
            <label className="flex items-center gap-2 text-[13px] font-light text-white/70"><input type="checkbox" className="h-4 w-4 accent-[#c9b6ff]" checked={f.updates !== false} onChange={e => set('updates', e.target.checked)} />Updates (security releases)</label>
          </fieldset>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-[280px]"><Field label="Requested by"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="Name, office" required /></Field></div>
          <button type="submit" className={goldBtn} style={goldStyle} disabled={busy || problems.length > 0}>{busy ? 'Submitting…' : path === 'perpetual' ? 'Request licence quote' : 'Request assessment'}</button>
        </div>
        <div className="min-h-[20px]" aria-live="polite">{problems.length ? <ErrorLine>{problems[0]}</ErrorLine> : err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12.5px] text-[#9be7c4]">{ok}</p> : null}</div>
      </form>
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <Panel strong className="p-5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em]" style={{ color: CHAMPAGNE }}>Live preliminary estimate</p>
          <p className="mt-1 text-[16px] font-light text-[#f3efe6]">{PATH_TITLE[path]}</p>
          {preview ? <EstimateSummary e={preview} /> : <p className="mt-3 text-[12.5px] text-white/45">Complete the answers to see the estimate.</p>}
          <p className="mt-3 text-[11.5px] font-light text-white/40">Computed in your browser with the published cost model; the same figures are recorded with your request.</p>
        </Panel>
      </aside>
    </div>
  );
}

export function EstimateSummary({ e }: { e: HostingEstimate }) {
  const money = (v: number) => formatMoney(v, { compact: false, digits: 0, currency: e.currency });
  return (
    <dl className="mt-4 grid grid-cols-2 gap-px" style={{ background: hair(0.1) }}>
      {[['Up-front', money(e.capexTotal)], ['Per year', money(e.annualTotal)], ['5-year total', money(e.fiveYearTotal)], ['Timeline', `${e.totalWeeks.min}–${e.totalWeeks.max} weeks`]].map(([k, v]) => (
        <div key={k} className="min-w-0 bg-[#05070b] px-3 py-2.5"><dt className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#d9c398]/60">{k}</dt><dd className="mt-1 truncate font-mono text-[13px] tabular-nums text-[#f3efe6]" title={v}>{v}</dd></div>
      ))}
    </dl>
  );
}

/** A full assessment: sizing, timeline, budgets, compatibility, staffing, risks, migration and assumptions. */
export function EstimateView({ e }: { e: HostingEstimate }) {
  const money = (v: number) => formatMoney(v, { compact: false, digits: 0, currency: e.currency });
  const span = Math.max(1, e.totalWeeks.max);
  let offset = 0;
  const costTable = (title: string, lines: HostingEstimate['capex'], total: number) => (
    <div className="min-w-0">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">{title}</p>
      <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[300px] text-left text-[12.5px] font-light">
        <tbody>
          {lines.map(l => (
            <tr key={l.label} className="border-t align-top" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3"><span className="text-white/80">{l.label}</span><span className="block text-[11px] text-white/40">{l.basis}</span></td>
              <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-[#f4e4bd]">{money(l.amount)}</td>
            </tr>
          ))}
          <tr className="border-t" style={{ borderColor: hair(0.25) }}><td className="py-2 pr-3 text-white/60">Total (estimate)</td><td className="py-2 text-right font-mono tabular-nums text-[#f3efe6]">{money(total)}</td></tr>
        </tbody>
      </table></div>
    </div>
  );
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <EstimateSummary e={e} />
      {e.sizing ? (
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Sizing · {e.sizing.tier}</p>
          <p className="mt-2 text-[13px] font-light text-white/70">{e.sizing.vcpu} vCPU · {e.sizing.ramGb.toLocaleString()} GB RAM · {e.sizing.storageTb} TB storage · {e.sizing.bandwidthGbps} Gbps · {e.sizing.nodes} nodes{e.sizing.racks ? ` · ${e.sizing.racks} racks` : ''} — {e.sizing.sites.join(' + ')}</p>
        </div>
      ) : null}
      <div>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Phased timeline · {e.totalWeeks.min}–{e.totalWeeks.max} weeks</p>
        <ol className="mt-3 grid gap-2">
          {e.timeline.map(p => {
            const left = (offset / span) * 100, w = Math.max(2, ((p.maxWeeks) / span) * 100), wMin = ((p.minWeeks) / span) * 100;
            offset += p.minWeeks;
            return (
              <li key={p.phase} className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-3">
                <span className="text-[12.5px] font-light text-white/75">{p.phase} <span className="font-mono text-[10.5px] text-white/40">{p.minWeeks}–{p.maxWeeks} wk</span></span>
                <span className="relative block h-3 rounded-[2px]" style={{ background: hair(0.06) }} title={p.detail}>
                  <span className="absolute inset-y-0 rounded-[2px]" style={{ left: `${left}%`, width: `${Math.min(w, 100 - left)}%`, background: `${CHAMPAGNE}33` }} />
                  <span className="absolute inset-y-0 rounded-[2px]" style={{ left: `${left}%`, width: `${Math.min(wMin, 100 - left)}%`, background: CHAMPAGNE }} />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        {costTable('Capital budget', e.capex, e.capexTotal)}
        {costTable('Annual running cost', e.annual, e.annualTotal)}
      </div>
      {e.subscription ? <p className="text-[13px] font-light text-white/70">{e.subscription.plan} · {e.subscription.term === 5 ? `5 years prepaid (−${e.subscription.discountPct}%): ${money(e.subscription.termTotal)}` : `${money(e.subscription.annual)} per year`}. Includes: {e.subscription.includes.join('; ')}.</p> : null}
      {e.licence ? <p className="rounded-[3px] border px-4 py-3 text-[13px] font-light text-[#c9b6ff]" style={{ borderColor: '#c9b6ff44' }}>{e.licence.independent}</p> : null}
      {e.compatibility ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Compatibility</p>
            <ul className="mt-2 space-y-1.5">{e.compatibility.map(cp => <li key={cp.item} className="flex flex-wrap items-center gap-2 text-[12.5px] font-light text-white/70"><Chip tone={cp.status === 'ready' ? '#9be7c4' : cp.status === 'needs-work' ? '#f1b36b' : '#f1938f'}>{cp.status}</Chip>{cp.item} — <span className="text-white/45">{cp.note}</span></li>)}</ul>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Residency · landing zone</p>
            {e.residencyFit ? <p className="mt-2 text-[12.5px] font-light" style={{ color: e.residencyFit.fits ? '#9be7c4' : '#f1938f' }}>{e.residencyFit.note}</p> : null}
            <ul className="mt-2 space-y-1">{e.landingZone?.map(l => <li key={l} className="text-[12px] font-light text-white/55">· {l}</li>)}</ul>
          </div>
        </div>
      ) : null}
      {e.staffing ? (
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Staffing plan</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{e.staffing.map(s => <li key={s.role} className="text-[12.5px] font-light text-white/70"><span className="font-mono text-[#f4e4bd]">{s.count}</span> × {s.role} <span className="text-white/40">— {s.note}</span></li>)}</ul>
        </div>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <div><p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#f1b36b]/80">Risks</p><ul className="mt-2 space-y-1">{e.risks.map(r => <li key={r} className="text-[12.5px] font-light text-white/65">· {r}</li>)}</ul></div>
        <div><p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Prerequisites</p><ul className="mt-2 space-y-1">{e.prerequisites.map(r => <li key={r} className="text-[12.5px] font-light text-white/65">· {r}</li>)}</ul></div>
      </div>
      {e.migration ? (
        <div className="rounded-[3px] border p-4" style={{ borderColor: hair(0.16) }}>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Migration from {PATH_TITLE[e.migration.from]}</p>
          <ol className="mt-2 space-y-1">{e.migration.steps.map((s, i) => <li key={s} className="text-[12.5px] font-light text-white/70"><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>{i + 1}</span> · {s}</li>)}</ol>
          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#9be7c4]/80">Guarantees</p>
          <ul className="mt-1 space-y-1">{e.migration.guarantees.map(s => <li key={s} className="text-[12.5px] font-light text-white/70">✓ {s}</li>)}</ul>
        </div>
      ) : null}
      <details className="text-[12px] font-light text-white/50">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">Assumptions{e.adjustments ? ' · engineering adjustments' : ''}</summary>
        <ul className="mt-2 space-y-1">{e.assumptions.map(a => <li key={a}>· {a}</li>)}</ul>
        {e.adjustments ? <p className="mt-2">Engineering review: capital ×{e.adjustments.capexFactor}, running ×{e.adjustments.annualFactor}, timeline ×{e.adjustments.timelineFactor}.</p> : null}
      </details>
    </div>
  );
}

export function HostingStepper({ r }: { r: HostingRequest }) {
  const at = r.stage === 'revision-requested' ? 1 : r.stage === 'withdrawn' ? -1 : STAGES.indexOf(r.stage);
  return (
    <ol className="mt-3 flex gap-1" aria-label={`Stage: ${STAGE_TEXT[r.stage]}`}>
      {STAGES.map((s, i) => (
        <li key={s} className="min-w-0 flex-1">
          <span aria-hidden className="block h-[3px] rounded-full" style={{ background: i <= at ? (r.stage === 'accepted' ? '#9be7c4' : CHAMPAGNE) : hair(0.14) }} />
          <span className={`mt-1 block truncate font-mono text-[8.5px] uppercase tracking-[0.12em] ${i === at ? 'text-[#f4e4bd]' : 'text-white/30'}`}>{s === 'issued' && r.assessments.length ? `Issued v${r.assessments.length}` : STAGE_TEXT[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export function hostingStageChip(r: HostingRequest) {
  const tone = r.stage === 'accepted' ? '#9be7c4' : r.stage === 'issued' ? CHAMPAGNE_HI : r.stage === 'revision-requested' ? '#f1b36b' : r.stage === 'withdrawn' ? '#8a8f99' : '#a9c7e8';
  return <Chip tone={tone} solid={r.stage === 'accepted' || r.stage === 'issued'}>{STAGE_TEXT[r.stage]}{r.stage === 'issued' ? ` v${r.assessments.length}` : ''}</Chip>;
}

function RequestCard({ r, link, onDone }: { r: HostingRequest; link?: string; onDone: () => void }) {
  const [actor] = useActor();
  const [note, setNote] = React.useState('');
  const [open, setOpen] = React.useState(r.stage === 'issued' || r.stage === 'preliminary');
  const [err, setErr] = React.useState<string | null>(null);
  const latest = r.assessments[r.assessments.length - 1];
  const shown = latest?.estimate ?? r.preliminary;
  async function act(action: 'accept' | 'revise' | 'withdraw') {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name in the request form first.'); return; }
    try { await api.updates.hostingAction(r.id, { action, by: actor, note: note || undefined, link }); setNote(''); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }
  return (
    <Panel strong={r.stage === 'issued'} className="min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-white/40">{r.id}</span>
        <span className="text-[16px] font-light text-[#f3efe6]">{PATH_TITLE[r.path]}</span>
        {r.currentPath && r.currentPath !== r.path ? <Chip tone="#a9c7e8">Switch from {PATH_TITLE[r.currentPath]}</Chip> : null}
        <span className="ml-auto">{hostingStageChip(r)}</span>
      </div>
      <p className="mt-1 font-mono text-[10.5px] text-white/40">Requested {fmtDateTime(r.submittedAt)} by {r.submittedBy}{latest ? ` · assessment v${latest.version} issued ${fmtDateTime(latest.issuedAt)} by ${latest.issuedBy}` : ' · preliminary estimate (automatic)'}</p>
      <HostingStepper r={r} />
      {latest?.notes ? <p className="mt-3 rounded-[2px] border px-3 py-2 text-[12.5px] font-light text-white/70" style={{ borderColor: hair(0.14) }}><span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Engineering notes</span> {latest.notes}</p> : null}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">{open ? 'Hide' : 'Show'} {latest ? `assessment v${latest.version}` : 'preliminary estimate'}</button>
      {open ? <div className="mt-4"><EstimateView e={shown} /></div> : null}
      {r.stage === 'issued' || r.stage === 'preliminary' || r.stage === 'in-review' || r.stage === 'revision-requested' ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          {r.stage === 'issued' ? (
            <>
              <input aria-label="Note" className={`${inputCls} min-w-[220px] flex-1 py-2 text-[13px]`} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (required to ask for a revision)" />
              <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => act('accept')}>Accept v{latest!.version}</button>
              <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act('revise')}>Ask for a revision</button>
            </>
          ) : <span className="text-[12.5px] font-light text-white/50">{r.stage === 'in-review' ? 'With the publisher’s engineering review.' : r.stage === 'revision-requested' ? 'Revision requested; a new version will be issued.' : 'Waiting for the engineering review.'}</span>}
          <button type="button" className="px-2 text-[12px] text-white/40 hover:text-[#f1938f]" onClick={() => act('withdraw')}>Withdraw</button>
        </div>
      ) : null}
      {r.decision ? <p className="mt-3 text-[12.5px] text-[#9be7c4]">Accepted v{r.decision.version} by {r.decision.by} on {fmtDateTime(r.decision.at)}{r.decision.note ? ` — “${r.decision.note}”` : ''}. Path recorded.</p> : null}
      <div className="min-h-[16px]"><ErrorLine>{err}</ErrorLine></div>
    </Panel>
  );
}
