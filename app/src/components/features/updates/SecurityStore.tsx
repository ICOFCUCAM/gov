'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { formatMoney } from '@/lib/nation/registry';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { SecurityCenter, SecurityOrder, SecurityCategory, OrderStage } from '@/lib/api/types';
import { PosturePanel } from './resilience';
import { AdvisoriesPanel } from './AdvisoriesPanel';
import { ChamberNav, ChamberTabs, Chip, CopyValue, ErrorLine, Loading, Panel, PoweredBy, fmtDate, useActor, useCenterTitle, useLink } from './ui';

const CATEGORY_LABEL: Record<SecurityCategory, string> = {
  vulnerability: 'Vulnerability scanning', container: 'Container & image', edr: 'Host EDR', mdr: 'Managed detection', waf: 'Web firewall',
  siem: 'SIEM / monitoring', backup: 'Ransomware-resilient backup', endpoint: 'Endpoint',
};
const STAGE_TONE: Record<OrderStage, string> = { quote: '#d9c398', ordered: '#9cc3ff', invoiced: '#c9b6ff', active: '#9be7c4', expired: '#f1b36b', cancelled: '#8a8f99' };
const STAGE_TEXT: Record<OrderStage, string> = { quote: 'Quote', ordered: 'Purchase order', invoiced: 'Invoiced', active: 'Licence active', expired: 'Expired', cancelled: 'Cancelled' };
const DAY = 86_400_000;

/**
 * Security store: baseline protection included for every nation, paid
 * advanced tools from certified partners (instant payment or government
 * procurement), bring-your-own tooling, the nation's own software,
 * definitions and the security posture.
 */
export function SecurityStore() {
  const { link, q } = useLink();
  const [s, setS] = React.useState<SecurityCenter | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.updates.security(link).then(r => setS(r.security)).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the security store'));
  }, [link]);
  React.useEffect(load, [load]);
  const { nation } = useCenterTitle(s?.nation.name, s?.nation.home ?? true);

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="security" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="security" />
        <Eyebrow>Update Center · security</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Security for {nation ? <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span> : 'this installation'}
        </h1>
        <p className="mt-4 max-w-[68ch] text-[15px] font-light leading-relaxed text-night-muted">
          Every nation is protected by the included baseline, paid or not, and security updates are never held back by payment or licence status. Advanced server-side tools come from certified partners; or bring your own and attest to it.
        </p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !s ? <Loading label="Opening the security store…" /> : <Body s={s} link={link} reload={load} />}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Body({ s, link, reload }: { s: SecurityCenter; link?: string; reload: () => void }) {
  const money = (v: number) => formatMoney(v, { compact: false, digits: 2, currency: s.currency });
  return (
    <>
      <Section n="01" title="Security posture">
        <PosturePanel p={s.posture} />
      </Section>

      <Section n="02" title="Security advisories and exposure" aside="CSAF/VEX · patch commitments">
        <AdvisoriesPanel link={link} q={link ? `?link=${encodeURIComponent(link)}` : ''} />
      </Section>

      <Section n="03" title="Included for every nation" aside={<span className="text-[#9be7c4]/80">No nation is left unprotected for non-payment</span>}>
        <Panel strong className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="flex flex-wrap items-center gap-2"><Chip tone="#9be7c4" solid>{s.baseline.active ? 'Active' : 'Inactive'}</Chip><span className="text-[15px] font-light text-[#f3efe6]">Baseline protection — free, always on</span></p>
            <ul className="mt-3 grid gap-1.5">
              {s.baseline.covers.map(c => <li key={c} className="text-[13px] font-light text-white/70"><span aria-hidden className="mr-2 text-[#9be7c4]">✓</span>{c}</li>)}
            </ul>
          </div>
          <div className="text-[12.5px] font-light text-night-muted md:text-right">
            <p>{s.baseline.products.join(', ')}</p>
            <p className="mt-1 font-mono text-[11px]">Last scan {s.baseline.lastScanAt ? fmtDate(s.baseline.lastScanAt) : '—'}</p>
          </div>
        </Panel>
      </Section>

      <Section n="04" title="Certified partners — advanced protection" aside={s.localPricing ? `Prices per unit per year, ${s.currency}` : `Prices in ${s.referenceCurrency} until your contract rate is set`}>
        <div className="grid gap-4 xl:grid-cols-2">
          {s.catalogue.filter(p => p.tier === 'paid').map(p => <ProductCard key={p.id} p={p} money={money} link={link} reload={reload} />)}
        </div>
        <p className="mt-4 text-[12px] font-light text-night-muted">Vendors and products are placeholders for certified partners. Two purchase routes: pay at once on your payment rail, or government procurement (quote → purchase order → invoice → bank transfer → licence).</p>
      </Section>

      <Section n="05" title="Orders, licences and billing" aside={`${s.orders.length} on record`}>
        <div className="grid gap-3">
          {s.orders.map(o => <OrderRow key={o.id} o={o} s={s} money={money} link={link} reload={reload} />)}
          {!s.orders.length ? <p className="text-[13.5px] font-light text-night-muted">No orders yet.</p> : null}
        </div>
      </Section>

      <Section n="06" title="Bring your own security tooling">
        <Byo s={s} link={link} reload={reload} />
      </Section>

      <Section n="07" title="Your own software">
        <Software s={s} link={link} reload={reload} />
      </Section>

      <Section n="08" title="Security definitions">
        <Definitions s={s} link={link} reload={reload} />
      </Section>
    </>
  );
}

function ProductCard({ p, money, link, reload }: { p: SecurityCenter['catalogue'][number]; money: (v: number) => string; link?: string; reload: () => void }) {
  const [actor] = useActor();
  const [edition, setEdition] = React.useState(p.editions[0]!.key);
  const [seats, setSeats] = React.useState(10);
  const [years, setYears] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const ed = p.editions.find(e => e.key === edition)!;
  async function quote() {
    setErr(null); setOk(null);
    if (!actor.trim()) { setErr('Set your name in an order step or settings first.'); return; }
    setBusy(true);
    try { const r = await api.updates.quote({ productId: p.id, edition, seats, years, by: actor, link }); setOk(`Quote ${r.order.id} — ${money(r.order.total)}`); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not quote'); }
    finally { setBusy(false); }
  }
  return (
    <Panel className="flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="#a9c7e8">{CATEGORY_LABEL[p.category]}</Chip>
        <span className="ml-auto font-mono text-[10px] text-night-muted">v{p.latestVersion}</span>
      </div>
      <p className="mt-3 text-[17px] font-light text-[#f3efe6]">{p.name}</p>
      <p className="mt-0.5 text-[12px] font-light text-[#d9c398]/75">{p.vendor}</p>
      <p className="mt-2 text-[13px] font-light leading-relaxed text-night-muted">{p.summary}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-night-muted">{p.platforms.join(' · ')}</p>
      <details className="mt-3 text-[12.5px] font-light text-night-muted">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted hover:text-[#f4e4bd]">Certification · platform {p.certification.platformVersions}</summary>
        <ul className="mt-2 space-y-1">{p.certification.tested.map(t => <li key={t}>· {t}</li>)}</ul>
        <p className="mt-1 text-night-muted">{p.certification.notes}</p>
      </details>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {p.editions.map(e => (
          <button key={e.key} type="button" onClick={() => setEdition(e.key)} aria-pressed={edition === e.key}
            className="rounded-[3px] border p-3 text-left transition-colors" style={{ borderColor: edition === e.key ? CHAMPAGNE : hair(0.14), background: edition === e.key ? hair(0.06) : 'transparent' }}>
            <span className="block text-[13px] text-[#f3efe6]">{e.name}</span>
            <span className="mt-0.5 block font-mono text-[12px] tabular-nums text-[#f4e4bd]">{money(p.prices[e.key] ?? 0)}</span>
            <span className="block text-[10.5px] text-night-muted">per {p.unit} / year</span>
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-0.5">{ed.features.map(f => <li key={f} className="text-[12px] font-light text-night-muted">· {f}</li>)}</ul>
      <div className="mt-auto grid grid-cols-[1fr_1fr_auto] items-end gap-2 pt-4">
        <Field label={`${p.unit === 'server' ? 'Servers' : 'Seats'}`}><input type="number" min={1} className={inputCls} value={seats} onChange={e => setSeats(Number(e.target.value))} /></Field>
        <Field label="Term"><Select value={years} onChange={e => setYears(Number(e.target.value))}><option value={1}>1 year</option><option value={2}>2 years (−5%)</option><option value={3}>3 years (−10%)</option></Select></Field>
        <button type="button" className={`${ghostBtn} py-2.5`} disabled={busy} onClick={quote}>{busy ? '…' : 'Quote'}</button>
      </div>
      <div className="mt-2 min-h-[18px]" aria-live="polite">{err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12px] text-[#9be7c4]">{ok}</p> : null}</div>
    </Panel>
  );
}

function OrderRow({ o, s, money, link, reload }: { o: SecurityOrder; s: SecurityCenter; money: (v: number) => string; link?: string; reload: () => void }) {
  const [actor, setActor] = useActor();
  const [po, setPo] = React.useState('');
  const [ref, setRef] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const p = s.catalogue.find(x => x.id === o.productId);
  const left = o.licence ? Math.ceil((Date.parse(o.licence.expiresAt) - Date.now()) / DAY) : 0;
  async function step(action: 'order' | 'pay' | 'pay-now' | 'cancel' | 'renew' | 'install-software', extra: { poNumber?: string; paymentReference?: string } = {}) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name.'); return; }
    setBusy(true);
    try { await api.updates.orderAction(o.id, { action, by: actor, link, ...extra } as never); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Step failed'); }
    finally { setBusy(false); }
  }
  const path: OrderStage[] = o.poNumber || o.stage === 'ordered' || o.stage === 'invoiced' ? ['quote', 'ordered', 'invoiced', 'active'] : ['quote', 'active'];
  const at = path.indexOf(o.stage === 'expired' ? 'active' : o.stage);
  return (
    <Panel className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-night-muted">{o.id}</span>
        <span className="text-[15px] font-light text-[#f3efe6]">{p?.name ?? o.productId}</span>
        <span className="text-[12px] text-night-muted">{o.edition} · {o.seats} × {o.years}y</span>
        <span className="font-mono text-[13px] tabular-nums text-[#f4e4bd]">{money(o.total)}</span>
        <span className="ml-auto"><Chip tone={STAGE_TONE[o.stage]} solid={o.stage === 'active'}>{STAGE_TEXT[o.stage]}</Chip></span>
      </div>
      {o.stage !== 'cancelled' ? (
        <ol className="mt-3 flex gap-1" aria-label={`Stage: ${STAGE_TEXT[o.stage]}`}>
          {path.map((st, i) => (
            <li key={st} className="min-w-0 flex-1">
              <span aria-hidden className="block h-[3px] rounded-full" style={{ background: i <= at ? (o.stage === 'expired' ? '#f1b36b' : STAGE_TONE[o.stage]) : hair(0.14) }} />
              <span className={`mt-1 block truncate font-mono text-[8.5px] uppercase tracking-[0.12em] ${i === at ? 'text-[#f4e4bd]' : 'text-night-faint'}`}>{STAGE_TEXT[st]}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {o.licence && (o.stage === 'active' || o.stage === 'expired') ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-light text-white/65">
          <span className="flex items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-champagne">Licence</span><CopyValue value={o.licence.key} label="licence key" /></span>
          <span>{o.licence.seats} seats · until {fmtDate(o.licence.expiresAt)}</span>
          {o.stage === 'active' && left <= 30 ? <Chip tone="#f1b36b" solid>Renew — {Math.max(0, left)} days left</Chip> : null}
          {o.stage === 'expired' ? <Chip tone="#f1b36b" solid>Expired — security updates still install</Chip> : null}
          <span>Agent {o.installedVersion ?? 'not installed'}{p && o.installedVersion !== p.latestVersion ? ` · ${p.latestVersion} available` : ''}</span>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        {o.stage === 'quote' ? (
          <>
            {s.policy.paths.includes('instant') ? <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} disabled={busy} onClick={() => step('pay-now')}>Pay now · {money(o.total)}</button> : null}
            {s.policy.paths.includes('procurement') ? (
              <span className="flex items-end gap-2">
                <input aria-label="Purchase order number" className={`${inputCls} w-[170px] py-2 text-[13px]`} value={po} onChange={e => setPo(e.target.value)} placeholder="Purchase order no." />
                <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} disabled={busy} onClick={() => step('order', { poNumber: po })}>Raise PO → invoice</button>
              </span>
            ) : null}
            <button type="button" className="px-2 text-[12px] text-night-muted hover:text-[#f1938f]" disabled={busy} onClick={() => step('cancel')}>Cancel</button>
          </>
        ) : null}
        {o.stage === 'invoiced' && o.invoice ? (
          <>
            <span className="text-[12.5px] font-light text-white/60">Invoice {o.invoice.id} · due {fmtDate(o.invoice.dueAt)} · PO {o.poNumber}</span>
            <input aria-label="Bank transfer reference" className={`${inputCls} w-[190px] py-2 text-[13px]`} value={ref} onChange={e => setRef(e.target.value)} placeholder="Transfer reference" />
            <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} disabled={busy} onClick={() => step('pay', { paymentReference: ref })}>Record bank transfer</button>
          </>
        ) : null}
        {o.stage === 'active' ? (
          <>
            <a href={api.updates.securityDownloadUrl(s.nation.channelKey, o.id)} download className={`${ghostBtn} py-2 text-[12.5px] no-underline`}>↓ Signed download (placeholder)</a>
            {p && o.installedVersion !== p.latestVersion ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} disabled={busy} onClick={() => step('install-software')}>Record install of {p.latestVersion}</button> : null}
          </>
        ) : null}
        {(o.stage === 'active' || o.stage === 'expired') ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} disabled={busy} onClick={() => step('renew')}>Renew</button> : null}
        {!actor ? <input aria-label="Your name" className={`${inputCls} w-[160px] py-2 text-[13px]`} value={actor} onChange={e => setActor(e.target.value)} placeholder="Your name" /> : null}
      </div>
      {o.payment ? (
        <p className="mt-2 font-mono text-[10.5px] text-night-muted">
          Billing: {o.invoice ? `${o.invoice.id} · ` : ''}{o.payment.method === 'transfer' ? `bank transfer ${o.payment.reference}` : o.payment.method === 'instant' ? `paid at once by ${o.payment.rail}` : 'included'} · receipt {o.payment.receiptId} · {fmtDate(o.payment.paidAt)}
        </p>
      ) : null}
      <div className="min-h-[16px]" aria-live="polite"><ErrorLine>{err}</ErrorLine></div>
    </Panel>
  );
}

function Byo({ s, link, reload }: { s: SecurityCenter; link?: string; reload: () => void }) {
  const [actor, setActor] = useActor();
  const [f, setF] = React.useState({ product: '', vendor: '', version: '', category: 'edr', servers: s.nation.estate.servers, endpoints: s.nation.estate.endpoints, lastScanAt: new Date().toISOString().slice(0, 10), attestation: '', scope: 'estate' });
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    try {
      const r = await api.updates.registerByo({ ...f, servers: Number(f.servers), endpoints: Number(f.endpoints), lastScanAt: new Date(f.lastScanAt).toISOString(), by: actor, link });
      setOk(`${r.tool.id} registered — no purchase needed.`); reload();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not register'); }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <p className="text-[13.5px] font-light leading-relaxed text-white/60">Use your own security tools instead of buying. Register each tool and attest to its last scan. An estate-wide attestation with a scan in the last 30 days counts as full coverage of the platform; one scoped to your own software covers what you build yourself. Either way, updates are never blocked.</p>
        <ul className="mt-4 grid gap-2">
          {s.byo.map(b => (
            <Panel as="li" key={b.id} className="px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-light text-[#f3efe6]">{b.product} <span className="text-[12px] text-night-muted">{b.vendor} · v{b.version}</span><span className="ml-auto"><Chip tone={b.scope === 'estate' ? '#9be7c4' : '#a9c7e8'}>{b.scope === 'estate' ? 'Whole estate' : 'Own software'}</Chip></span></p>
              <p className="mt-1 text-[12px] font-light text-night-muted">{CATEGORY_LABEL[b.category]} · {b.coverage.servers} servers · {b.coverage.endpoints} endpoints · last scan {fmtDate(b.lastScanAt)} · attested by {b.attestedBy}</p>
              <p className="mt-1 text-[12px] font-light text-night-muted">“{b.attestation}”</p>
            </Panel>
          ))}
        </ul>
      </div>
      <Panel strong className="p-5">
        <form onSubmit={submit} className="grid gap-3" aria-label="Register your own security tooling">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product"><input className={inputCls} value={f.product} onChange={up('product')} required /></Field>
            <Field label="Vendor"><input className={inputCls} value={f.vendor} onChange={up('vendor')} required /></Field>
            <Field label="Version"><input className={inputCls} value={f.version} onChange={up('version')} required /></Field>
            <Field label="Category"><Select value={f.category} onChange={up('category')}>{(Object.keys(CATEGORY_LABEL) as SecurityCategory[]).map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
            <Field label="Servers covered"><input type="number" min={0} className={inputCls} value={f.servers} onChange={up('servers')} /></Field>
            <Field label="Endpoints covered"><input type="number" min={0} className={inputCls} value={f.endpoints} onChange={up('endpoints')} /></Field>
            <Field label="Last scan"><input type="date" className={inputCls} value={f.lastScanAt} onChange={up('lastScanAt')} required /></Field>
            <Field label="Scope"><Select value={f.scope} onChange={up('scope')}><option value="estate">Whole estate</option><option value="nation-software">Our own software only</option></Select></Field>
          </div>
          <Field label="Attestation" hint="What was scanned, and the result."><textarea className={`${inputCls} min-h-[70px]`} value={f.attestation} onChange={up('attestation')} required /></Field>
          <Field label="Attested by"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} required /></Field>
          <button type="submit" className={goldBtn} style={goldStyle}>Register — no purchase</button>
          <div className="min-h-[18px]" aria-live="polite">{err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12.5px] text-[#9be7c4]">{ok}</p> : null}</div>
        </form>
      </Panel>
    </div>
  );
}

function Software({ s, link, reload }: { s: SecurityCenter; link?: string; reload: () => void }) {
  const [actor] = useActor();
  const [f, setF] = React.useState({ name: '', version: '', kind: 'module' });
  const [err, setErr] = React.useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api.updates.registerSoftware({ ...f, by: actor, link }); setF({ name: '', version: '', kind: 'module' }); reload(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not register'); }
  }
  return (
    <div>
      <p className="text-[13.5px] font-light leading-relaxed text-white/60">Modules, integrations and builds your government supplies itself. They may rely on your own registered security tooling — no purchase required.</p>
      <ul className="mt-4 grid gap-2">
        {s.software.map(x => (
          <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b py-2.5 text-[13.5px] font-light" style={{ borderColor: hair(0.08) }}>
            <span className="font-mono text-[11px] text-night-muted">{x.id}</span>
            <span className="min-w-0 flex-1 text-[#f3efe6]/85">{x.name} <span className="font-mono text-[11px] text-night-muted">v{x.version}</span></span>
            <Chip tone="#a9c7e8">{x.kind}</Chip>
            <Chip tone={x.securedBy === 'byo' ? '#9be7c4' : CHAMPAGNE}>{x.securedBy === 'byo' ? `Own tooling · ${x.securedByRef}` : `Licence · ${x.securedByRef}`}</Chip>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_0.6fr_0.8fr_auto] sm:items-end" aria-label="Register your own software">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} required /></Field>
        <Field label="Version"><input className={inputCls} value={f.version} onChange={e => setF(x => ({ ...x, version: e.target.value }))} required /></Field>
        <Field label="Kind"><Select value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value }))}><option value="module">Module</option><option value="integration">Integration</option><option value="build">Build</option></Select></Field>
        <button type="submit" className={ghostBtn}>Register</button>
      </form>
      <div className="mt-2 min-h-[18px]"><ErrorLine>{err}</ErrorLine></div>
    </div>
  );
}

function Definitions({ s, link, reload }: { s: SecurityCenter; link?: string; reload: () => void }) {
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  const d = s.definitions;
  const behind = d.installed !== d.latest;
  async function apply() {
    setErr(null);
    try { await api.updates.applyDefinitions(actor, link); reload(); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not apply'); }
  }
  return (
    <Panel className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="flex flex-wrap items-center gap-2"><Chip tone={d.automaticActive ? '#9be7c4' : '#f1b36b'} solid>{d.policy === 'automatic' ? 'Automatic' : 'Manual'}</Chip><span className="text-[14px] font-light text-[#f3efe6]">Definitions are data, not software — {d.policy === 'automatic' ? 'they update on their own' : 'you apply them'}.</span></p>
        <p className="mt-2 font-mono text-[11.5px] text-night-muted">Installed {d.installed} ({fmtDate(d.installedAt)}) · latest {d.latest}</p>
        <p className="mt-1 text-[12px] font-light text-night-muted">Security software itself never upgrades on its own; change the policy in Settings.</p>
      </div>
      {behind ? <button type="button" className={goldBtn} style={goldStyle} onClick={apply}>Apply {d.latest}</button> : <Chip tone="#9be7c4">Current</Chip>}
      <div className="md:col-span-2"><ErrorLine>{err}</ErrorLine></div>
    </Panel>
  );
}
