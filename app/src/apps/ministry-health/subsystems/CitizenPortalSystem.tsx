'use client';

// Domain 4 — Citizen Health Portal. The warm, human counterpoint to the
// command surfaces: a consumer-grade health super-app. Soft navy + emerald
// accent, rounded cards, friendly rhythm. Mode C.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { citizenPortalView } from '@/lib/gov/health-operations';
import { RingGauge, Sparkline, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { EncounterThread } from '@/apps/_shared/InstitutionChain';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: Tone) => (t === 'info' ? 'rgb(var(--c-link))' : `rgb(var(--c-${t}))`);
const ACC = ACCENT.citizen!;
const NAV = ['Overview', 'Health Timeline', 'Appointments', 'Prescriptions', 'Lab Results', 'Immunizations', 'Telemedicine', 'Insurance', 'Health Wallet', 'Wearables', 'Family Health', 'Emergency', 'Health Records', 'Wellness', 'Settings'];

function Card({ title, action, children }: { title?: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border p-3" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0c121b' }}>
      {title ? (
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-ink">{title}</h3>
          {action ? <span className="text-[10px]" style={{ color: ACC }}>{action}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

// Focused section view — every nav link routes here so each is genuinely
// active (not a dead highlight). Surfaces the real engine slice per item.
function PortalSection({ name, v }: { name: string; v: ReturnType<typeof citizenPortalView> }) {
  const Title = ({ t }: { t: string }) => <h2 className="mb-2 text-[15px] font-bold text-ink">{t}</h2>;
  const rows = (items: { a: string; b?: string; c?: string; tone?: Tone }[]) => (
    <div className="space-y-1">
      {items.map((r, i) => (
        <div key={i} className="flex items-center gap-2 rounded-[8px] border px-3 py-2 text-[11px]" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0a0f17' }}>
          <span className="min-w-0 flex-1 truncate text-ink-soft">{r.a}</span>
          {r.b ? <span className="shrink-0 font-mono text-[10px] text-ink-muted">{r.b}</span> : null}
          {r.c ? <span className="shrink-0 text-[9px] font-bold uppercase" style={{ color: r.tone ? C(r.tone) : ACC }}>{r.c}</span> : null}
        </div>
      ))}
    </div>
  );
  let body: React.ReactNode;
  switch (name) {
    case 'Health Timeline':
      body = rows(v.timeline.map(t => ({ a: `${t.kind} · ${t.detail}`, b: t.date, c: t.status, tone: t.tone })));
      break;
    case 'Appointments':
      body = rows([{ a: `${v.upcoming.spec} · ${v.upcoming.doctor}`, b: `${v.upcoming.date} ${v.upcoming.time}`, c: 'Upcoming', tone: 'ok' }, { a: v.upcoming.place }]);
      break;
    case 'Prescriptions':
      body = rows(v.meds.list.map(m => ({ a: `${m.drug} · ${m.instr}`, b: `${m.daysLeft}d left`, c: m.daysLeft <= 5 ? 'Refill' : 'Active', tone: m.tone })));
      break;
    case 'Lab Results':
    case 'Health Records':
      body = rows([
        { a: 'Reports', b: `${v.records.reports}` }, { a: 'Lab Results', b: `${v.records.labs}` },
        { a: 'Imaging', b: `${v.records.imaging}` }, { a: 'Documents', b: `${v.records.documents}` },
      ]);
      break;
    case 'Immunizations':
      body = rows(v.immun.list.map(im => ({ a: im.vaccine, b: im.date, c: im.done ? 'Done' : 'Due', tone: im.done ? 'ok' : 'warn' })));
      break;
    case 'Telemedicine':
      body = rows(v.doctors.map(d => ({ a: `${d.name} · ${d.spec}`, b: `★ ${d.rating}`, c: d.available ? 'Available' : 'Busy', tone: d.available ? 'ok' : 'warn' })));
      break;
    case 'Insurance':
      body = rows([
        { a: v.insurance.plan, c: 'Active', tone: 'ok' }, { a: 'Policy No', b: v.insurance.policyNo },
        { a: 'Valid till', b: v.insurance.validTill }, { a: 'Coverage used', b: `${v.insurance.coverageUsedPct}%` },
      ]);
      break;
    case 'Health Wallet':
      body = rows([{ a: 'Available balance', b: `${v.wallet.points.toLocaleString()} HS Points`, c: 'Redeem', tone: 'ok' }]);
      break;
    case 'Wearables':
      body = rows(v.overview.map(o => ({ a: o.label, b: `${o.value} ${o.sub}`, tone: o.tone })));
      break;
    default:
      body = (
        <div className="rounded-[8px] border px-3 py-6 text-center" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0a0f17' }}>
          <div className="text-[12px] font-semibold text-ink-soft">{name}</div>
          <div className="mt-1 text-[10px] text-ink-muted">This service is active. Detailed {name.toLowerCase()} workflow opens here.</div>
        </div>
      );
  }
  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <Title t={name} />
        <span className="text-[10px]" style={{ color: ACC }}>Citizen Health Portal</span>
      </div>
      {body}
    </Card>
  );
}


export function CitizenPortalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const v = citizenPortalView(id, ts);
  const [navSel, setNavSel] = React.useState('Overview');
  const [navOpen, setNavOpen] = React.useState(false);
  const [booked, setBooked] = React.useState(false);
  const scoreTone: Tone = v.healthScore >= 85 ? 'ok' : v.healthScore >= 70 ? 'ok' : v.healthScore >= 55 ? 'warn' : 'alert';

  return (
    <div className="rounded-[12px] p-2" style={{ background: '#070b11' }}>
      {/* Top bar */}
      <div className="mb-2 flex flex-wrap items-center gap-3 rounded-[10px] border px-3 py-2" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: `linear-gradient(100deg,#0a0f17,color-mix(in srgb,${ACC} 6%,#0a0f17))` }}>
        <button type="button" aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen(o => !o)}
          className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border text-[13px] lg:hidden"
          style={{ borderColor: `color-mix(in srgb,${ACC} 45%,#1c2733)`, color: ACC }}>{navOpen ? '✕' : '☰'}</button>
        <div className="min-w-0">
          <div className="text-[12px] font-bold tracking-tight text-ink">MINISTRY OF HEALTH</div>
          <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: ACC }}>Citizen Health Portal</div>
        </div>
        <div className="mx-2 hidden min-w-[180px] flex-1 items-center gap-2 rounded-full border px-3 py-1 sm:flex" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)' }}>
          <span className="text-ink-muted">⌕</span><span className="text-[10px] text-ink-muted">Search services, doctors, hospitals…</span>
        </div>
        <span className="relative grid h-7 w-7 place-items-center rounded-full border text-[11px] text-ink-soft" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)' }}>
          ◔<span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full text-[7px] font-bold text-black" style={{ background: C('alert') }}>{v.unread}</span>
        </span>
        <span className="rounded-full border px-2 py-0.5 text-[9px] text-ink-muted" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)' }}>EN</span>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold" style={{ color: ACC, border: `1px solid ${ACC}` }}>AR</span>
          <div className="leading-tight">
            <div className="text-[10px] font-medium text-ink">{v.name}</div>
            <div className="text-[8px]" style={{ color: ACC }}>✓ Verified</div>
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen ? (
        <div className="mb-2 rounded-[10px] border p-2 lg:hidden" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0c121b' }}>
          <div className="grid max-h-[50vh] grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
            {NAV.map(n => (
              <button key={n} type="button" onClick={() => { setNavSel(n); setNavOpen(false); }}
                className="focus-ring rounded-[7px] px-2 py-2 text-left text-[11px] transition-colors"
                style={{ color: navSel === n ? '#04130d' : 'rgb(var(--c-ink-soft))', background: navSel === n ? ACC : 'color-mix(in srgb,#1c2733 50%,transparent)' }}>{n}</button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-[8px] border p-2 text-center" style={{ borderColor: `color-mix(in srgb,${C('alert')} 40%,transparent)`, background: `color-mix(in srgb,${C('alert')} 9%,#0c121b)` }}>
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: C('alert') }}>Emergency SOS</div>
              <div className="my-0.5 text-[18px] font-bold" style={{ color: C('alert') }}>998</div>
              <div className="text-[7.5px] text-ink-muted">Tap to call · Share location</div>
            </div>
            <div className="rounded-[8px] border p-2 text-center" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)' }}>
              <div className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Health ID</div>
              <div className="mx-auto my-1 grid h-9 w-9 place-items-center rounded-[4px] border text-[6px] text-ink-muted" style={{ borderColor: ACC }} aria-hidden>▦ QR</div>
              <div className="font-mono text-[7.5px] text-ink-soft">{v.healthId}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-[150px_1fr]">
        {/* Left rail */}
        <div className="hidden flex-col gap-1.5 lg:flex">
          <div className="rounded-[10px] border p-1.5" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0c121b' }}>
            {NAV.map(n => (
              <button key={n} onClick={() => setNavSel(n)}
                className="focus-ring block w-full rounded-[7px] px-2 py-1.5 text-left text-[10px] transition-colors"
                style={{ color: navSel === n ? '#04130d' : 'rgb(var(--c-ink-soft))', background: navSel === n ? ACC : 'transparent' }}>{n}</button>
            ))}
          </div>
          <div className="rounded-[10px] border p-2.5 text-center" style={{ borderColor: `color-mix(in srgb,${C('alert')} 40%,transparent)`, background: `color-mix(in srgb,${C('alert')} 9%,#0c121b)` }}>
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: C('alert') }}>Emergency SOS</div>
            <div className="my-1 text-[20px] font-bold" style={{ color: C('alert') }}>998</div>
            <div className="text-[8px] text-ink-muted">Tap to call · Share location</div>
          </div>
          <div className="rounded-[10px] border p-2.5 text-center" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0c121b' }}>
            <div className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Health ID</div>
            <div className="mx-auto my-1.5 grid h-12 w-12 place-items-center rounded-[4px] border text-[7px] text-ink-muted" style={{ borderColor: ACC }} aria-hidden>▦ QR</div>
            <div className="font-mono text-[8px] text-ink-soft">{v.healthId}</div>
            <div className="text-[8px]" style={{ color: ACC }}>✓ Verified</div>
          </div>
        </div>

        {/* Main */}
        <div className="space-y-2">
          {navSel !== 'Overview' ? <PortalSection name={navSel} v={v} /> : null}
          <div className={navSel === 'Overview' ? 'space-y-2' : 'hidden'}>
          {/* Hero + upcoming */}
          <div className="grid gap-2 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-[10px] border p-4" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: `radial-gradient(120% 120% at 80% 20%,color-mix(in srgb,${ACC} 14%,#0c121b),#0c121b)` }}>
              <div className="text-[12px] text-ink-muted">Good morning,</div>
              <div className="flex items-center gap-2 text-[22px] font-bold text-ink">{v.name} <span style={{ color: ACC }}>✓</span></div>
              <div className="mt-0.5 font-mono text-[10px] text-ink-muted">Health ID: {v.healthId}</div>
              <div className="mt-3 inline-flex items-center gap-3 rounded-[10px] border px-4 py-2.5" style={{ borderColor: `color-mix(in srgb,${ACC} 35%,transparent)`, background: '#0a0f17' }}>
                <RingGauge value={v.healthScore} label={v.healthBand} tone={scoreTone} size={70} sub="/100" />
                <div>
                  <div className="text-[10px] text-ink-muted">Health score</div>
                  <div className="text-[24px] font-bold" style={{ color: C(scoreTone) }}>{v.healthScore}<span className="text-[11px] text-ink-muted"> {v.healthBand}</span></div>
                  <div className="text-[9px]" style={{ color: ACC }}>View details →</div>
                </div>
              </div>
            </div>
            <Card title="Upcoming appointment" action="View All">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `color-mix(in srgb,${C('alert')} 16%,transparent)`, color: C('alert') }}>♥</span>
                <div>
                  <div className="text-[12px] font-semibold text-ink">{v.upcoming.type}</div>
                  <div className="text-[10px] text-ink-muted">{v.upcoming.doctor} · {v.upcoming.spec}</div>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-[10px] text-ink-soft">
                <div>🗓 {v.upcoming.date} · {v.upcoming.time}</div>
                <div>📍 {v.upcoming.place}</div>
              </div>
              <button onClick={() => setBooked(true)} className="focus-ring mt-2 w-full rounded-[8px] py-1.5 text-[10px] font-semibold" style={{ background: booked ? 'color-mix(in srgb,#1c2733 70%,transparent)' : ACC, color: booked ? 'rgb(var(--c-ink-soft))' : '#04130d' }}>{booked ? '✓ Confirmed' : 'View appointment'}</button>
            </Card>
          </div>

          {/* Timeline | Health overview | Medicines */}
          <div className="grid gap-2 xl:grid-cols-3">
            <Card title="Health timeline" action="View Full Timeline">
              <div className="space-y-2">
                {v.timeline.map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex flex-col items-center"><span className="mt-1 h-2 w-2 rounded-full" style={{ background: C(e.tone) }} />{i < v.timeline.length - 1 ? <span className="w-px flex-1 bg-[#1c2733]" /> : null}</div>
                    <div className="min-w-0 pb-1">
                      <div className="text-[9px] text-ink-muted">{e.date}</div>
                      <div className="text-[11px] font-medium text-ink">{e.kind}</div>
                      <div className="flex items-center gap-2 text-[9px] text-ink-soft">{e.detail}<span className="rounded-[3px] px-1 py-0.5 text-[7px] font-bold uppercase" style={{ background: `color-mix(in srgb,${C(e.tone)} 16%,transparent)`, color: C(e.tone) }}>{e.status}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Health overview" action="This Week">
              <div className="space-y-2.5">
                {v.overview.map(o => (
                  <div key={o.label} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-ink-muted">{o.label}</div>
                      <div className="text-[14px] font-semibold text-ink">{o.value} <span className="text-[9px] text-ink-muted">{o.sub}</span></div>
                    </div>
                    <Sparkline points={o.series} tone={o.tone} width={70} height={20} />
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Medicines & prescriptions" action="View All">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[8px] border border-line-soft px-2 py-1.5"><div className="text-[9px] text-ink-muted">Active</div><div className="text-[18px] font-bold text-ink">{v.meds.active}</div></div>
                <div className="rounded-[8px] border border-line-soft px-2 py-1.5"><div className="text-[9px] text-ink-muted">Pending refills</div><div className="text-[18px] font-bold" style={{ color: C('warn') }}>{v.meds.pendingRefills}</div></div>
              </div>
              <div className="mt-2 space-y-1.5">
                {v.meds.list.map(med => (
                  <div key={med.drug} className="flex items-center justify-between rounded-[8px] border border-line-soft px-2 py-1.5">
                    <div><div className="text-[11px] text-ink">{med.drug}</div><div className="text-[8px] text-ink-muted">{med.instr}</div></div>
                    <span className="text-[9px] font-semibold" style={{ color: C(med.tone) }}>{med.daysLeft} days left</span>
                  </div>
                ))}
              </div>
              <button className="focus-ring mt-2 w-full rounded-[8px] py-1.5 text-[10px] font-semibold" style={{ background: ACC, color: '#04130d' }}>⛟ Order medicines</button>
            </Card>
          </div>

          {/* Records summary | Insurance */}
          <div className="grid gap-2 xl:grid-cols-2">
            <Card title="Health records summary" action="View All Records">
              <div className="grid grid-cols-4 gap-2">
                {[['Reports', v.records.reports], ['Lab results', v.records.labs], ['Imaging', v.records.imaging], ['Documents', v.records.documents]].map(([l, n]) => (
                  <div key={l as string} className="rounded-[8px] border border-line-soft px-2 py-2 text-center"><div className="text-[18px] font-bold text-ink">{n as number}</div><div className="text-[8px] text-ink-muted">{l as string}</div></div>
                ))}
              </div>
            </Card>
            <Card title="Insurance & coverage" action="View Details">
              <div className="flex items-center gap-2">
                <span style={{ color: ACC }}>🛡</span>
                <div><div className="text-[12px] font-semibold text-ink">{v.insurance.plan}</div><div className="text-[9px]" style={{ color: ACC }}>Active policy</div></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-ink-muted">
                <div>Policy: <span className="text-ink-soft">{v.insurance.policyNo}</span></div>
                <div>Valid till: <span className="text-ink-soft">{v.insurance.validTill}</span></div>
              </div>
              <div className="mt-2 text-[9px] text-ink-muted">Coverage used · {v.insurance.coverageUsedPct}%</div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${v.insurance.coverageUsedPct}%`, background: ACC }} /></div>
            </Card>
          </div>

          {/* Immunization | Telemedicine | Wallet */}
          <div className="grid gap-2 xl:grid-cols-3">
            <Card title="Immunization status" action="View All">
              <div className="flex items-center gap-3">
                <RingGauge value={v.immun.uptoDatePct} label="up to date" tone={v.immun.uptoDatePct >= 80 ? 'ok' : 'warn'} size={76} sub="%" />
                <div className="min-w-0 flex-1 space-y-1">
                  {v.immun.list.map(im => (
                    <div key={im.vaccine} className="flex items-center justify-between text-[9px]">
                      <div><div className="text-ink-soft">{im.vaccine}</div><div className="text-[8px] text-ink-muted">{im.date}</div></div>
                      <span style={{ color: im.done ? C('ok') : C('warn') }}>{im.done ? '✓' : '◷'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card title="Telemedicine" action="Connect Now">
              <div className="space-y-1.5">
                {v.doctors.map(d => (
                  <div key={d.name} className="flex items-center gap-2 rounded-[8px] border border-line-soft px-2 py-1.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full text-[9px] font-bold" style={{ color: ACC, border: `1px solid ${ACC}` }}>{d.name.split(' ')[1]![0]}</span>
                    <div className="min-w-0 flex-1"><div className="truncate text-[10px] text-ink">{d.name}</div><div className="text-[8px] text-ink-muted">{d.spec} · ★{d.rating} · {d.exp}y</div></div>
                    <span className="text-[8px]" style={{ color: C('ok') }}>● {d.available ? 'Available' : 'Busy'}</span>
                  </div>
                ))}
              </div>
              <button className="focus-ring mt-2 w-full rounded-[8px] py-1.5 text-[10px] font-semibold" style={{ background: ACC, color: '#04130d' }}>Start consultation</button>
              <div className="mt-2">
                <EncounterThread scope={`enc:health:careteam:${id}`} now={now} accent={ACC}
                  selfAuthor="PUBLIC" officialName={v.upcoming.doctor} publicName={v.name}
                  title="Message your care team" />
              </div>
            </Card>
            <Card title="Health wallet" action="View Transactions">
              <div className="text-[9px] text-ink-muted">Available balance</div>
              <div className="text-[20px] font-bold text-ink">{v.wallet.points.toLocaleString()}.00 <span className="text-[10px]" style={{ color: ACC }}>HS Points</span></div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[8px] text-ink-muted">
                {['Medicines', 'Lab tests', 'Consults', 'Wellness'].map(r => <div key={r} className="rounded-[6px] border border-line-soft py-1.5">{r}</div>)}
              </div>
              <button className="focus-ring mt-2 w-full rounded-[8px] border py-1.5 text-[10px] font-semibold" style={{ borderColor: ACC, color: ACC }}>View rewards store</button>
            </Card>
          </div>

          {/* Find services | Alerts */}
          <div className="grid gap-2 xl:grid-cols-2">
            <Card title="Find healthcare services" action="View All Hospitals">
              <div className="mb-2 flex gap-1 text-[9px]">
                {['Hospitals', 'Clinics', 'Labs', 'Pharmacies'].map((s, i) => (
                  <span key={s} className="rounded-full px-2 py-0.5" style={{ background: i === 0 ? ACC : 'transparent', color: i === 0 ? '#04130d' : 'rgb(var(--c-ink-muted))', border: i === 0 ? 'none' : '1px solid color-mix(in srgb,#1c2733 70%,transparent)' }}>{s}</span>
                ))}
              </div>
              <div className="space-y-1.5">
                {v.services.map(s => (
                  <div key={s.name} className="flex items-center justify-between rounded-[8px] border border-line-soft px-2 py-1.5">
                    <div><div className="text-[11px] text-ink">{s.name}</div><div className="text-[8px] text-ink-muted">{s.sub} · ★{s.rating} ({s.reviews})</div></div>
                    <div className="text-right"><div className="text-[10px] font-semibold text-ink-soft">{s.km} km</div><div className="text-[7.5px]" style={{ color: ACC }}>{s.tag}</div></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Health alerts & advisories" action="View All">
              <div className="space-y-1.5">
                {v.alerts.map(a => (
                  <div key={a.title} className="rounded-[8px] border border-line-soft px-2.5 py-1.5" style={{ borderLeft: `3px solid ${C(a.tone)}` }}>
                    <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: C(a.tone) }}>{a.title}</span><span className="text-[8px] text-ink-muted">{a.date}</span></div>
                    <div className="text-[9px] text-ink-soft">{a.body}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          </div>

          {/* Mobile-style tab bar */}
          <div className="flex items-center justify-around rounded-[10px] border px-2 py-2 text-[9px] text-ink-muted" style={{ borderColor: 'color-mix(in srgb,#1c2733 70%,transparent)', background: '#0c121b' }}>
            {([['Home', 'Overview', '⌂'], ['Services', 'Appointments', '▦'], ['Health ID', 'Health Records', '▣'], ['Messages', 'Emergency', '✉'], ['Profile', 'Insurance', '◔']] as const).map(([tb, target, ic]) => {
              const on = navSel === target;
              return (
                <button key={tb} type="button" onClick={() => { setNavSel(target); setNavOpen(false); }}
                  className="focus-ring flex flex-1 flex-col items-center gap-0.5 rounded-[7px] py-1 transition-colors"
                  style={{ color: on ? ACC : 'rgb(var(--c-ink-muted))', background: on ? `color-mix(in srgb,${ACC} 14%,transparent)` : 'transparent' }}>
                  <span className="text-[12px]">{ic}</span>{tb}
                </button>
              );
            })}
          </div>

          <RuntimeQueue scope={`${id}:portal`} kind="approval" title="Citizen services runtime — request → verify → fulfil → notify" by="Citizen Services" role={role} withheld={withheld} />
        </div>
      </div>
    </div>
  );
}
