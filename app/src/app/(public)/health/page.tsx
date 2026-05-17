// Public Ministry of Health website (Layer 14). Public-facing, Mode C
// (clean, human, trustworthy), mobile-first. Server component, SSR-safe
// and deterministic — no client state, no hydration mismatch.

import Link from 'next/link';
import { publicHealthSite } from '@/lib/gov/health-operations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Health — Public Portal' };

const C = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;

export default function PublicHealthPage() {
  const s = publicHealthSite(100); // deterministic, SSR-stable

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-[12px] text-link underline underline-offset-2">← Home</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Ministry of Health</h1>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">Public Portal</span>
      </header>

      {s.emergencyBanner.active ? (
        <div className="rounded-[6px] border px-4 py-3 text-[13px] font-medium" style={{ borderColor: C(s.emergencyBanner.tone), color: C(s.emergencyBanner.tone), background: `color-mix(in srgb, ${C(s.emergencyBanner.tone)} 10%, transparent)` }}>
          ⚠ {s.emergencyBanner.text}
        </div>
      ) : (
        <div className="rounded-[6px] border border-line bg-surface px-4 py-3 text-[13px] text-ink-soft">{s.emergencyBanner.text}</div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.kpis.map(k => (
          <div key={k.label} className="rounded-[8px] border border-line bg-surface p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink-muted">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: C(k.tone) }}>{k.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: 'Find a hospital', v: `${s.findable.hospitals.toLocaleString()} online`, href: '/app/health/grid' },
          { l: 'Find a pharmacy', v: `${s.findable.pharmacies.toLocaleString()} online`, href: '/app/health/pharma' },
          { l: 'Find an ambulance', v: `${s.findable.ambulances.toLocaleString()} on call`, href: '/app/health/emergency' },
          { l: 'Find a laboratory', v: `${s.findable.labs.toLocaleString()} online`, href: '/app/health/lab' },
        ].map(c => (
          <Link key={c.l} href={c.href} className="focus-ring rounded-[8px] border border-line bg-surface p-4 no-underline transition-colors hover:bg-surface-2">
            <div className="text-[14px] font-medium text-ink">{c.l}</div>
            <div className="mt-0.5 text-[12px] text-ink-muted">{c.v}</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">Public health advisories</h2>
          {s.advisories.map((a, i) => (
            <div key={i} className="rounded-[8px] border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${C(a.tone)} 14%, transparent)`, color: C(a.tone) }}>{a.level}</span>
                <span className="text-[14px] font-medium text-ink">{a.title}</span>
              </div>
              <p className="mt-1 text-[12px] text-ink-muted">{a.body}</p>
            </div>
          ))}
          <h2 className="pt-2 text-[13px] font-semibold uppercase tracking-wider text-ink-soft">Disease updates</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {s.diseaseUpdates.map(d => (
              <div key={d.disease} className="flex items-center justify-between rounded-[8px] border border-line bg-surface px-4 py-2.5">
                <span className="text-[13px] text-ink">{d.disease}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C(d.tone) }}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">Vaccination campaigns</h2>
          {s.campaigns.map(c => (
            <div key={c.name} className="rounded-[8px] border border-line bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">{c.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-ink-muted">{c.status}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${c.coveragePct}%`, backgroundColor: C(c.tone) }} /></div>
              <div className="mt-0.5 text-right text-[11px] tabular-nums" style={{ color: C(c.tone) }}>{c.coveragePct}%</div>
            </div>
          ))}
          <h2 className="pt-2 text-[13px] font-semibold uppercase tracking-wider text-ink-soft">National programmes</h2>
          <ul className="space-y-1.5">
            {s.programmes.map(p => <li key={p} className="rounded-[6px] border border-line bg-surface px-3 py-2 text-[12px] text-ink-soft">{p}</li>)}
          </ul>
        </div>
      </section>

      <footer className="flex flex-wrap gap-4 border-t border-line pt-4 text-[12px] text-ink-muted">
        {['Careers', 'Procurement notices', 'Regulations', 'Downloads & forms', 'Public data', 'Contact'].map(f => (
          <span key={f} className="cursor-default">{f}</span>
        ))}
      </footer>
    </main>
  );
}
