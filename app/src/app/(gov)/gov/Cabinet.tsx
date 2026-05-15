'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { MetricStat } from '@/components/ui/Ops';
import { Section, DataTable, EnterpriseTable, StatusText, type Column } from '@/components/ui/DataSystem';
import { api } from '@/lib/api/client';
import { WorkspaceSkeleton } from '@/components/ui/Skeleton';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { identityFor } from '@/lib/archetype-profiles';
import type {
  CabinetOverview,
  NationalCoordination,
  NationalSnapshot,
  SovereignPreset,
  SovereignProfile,
  StateForm,
} from '@/lib/api/types';

const FORMS: { v: StateForm; preset: Partial<SovereignProfile> }[] = [
  { v: 'republic', preset: { executiveTitle: 'President', legislatureName: 'National Assembly', regionNoun: 'region' } },
  { v: 'federation', preset: { executiveTitle: 'Chancellor', legislatureName: 'Federal Assembly', regionNoun: 'state' } },
  { v: 'monarchy', preset: { executiveTitle: 'Prime Minister', legislatureName: 'Council of State', regionNoun: 'province' } },
  { v: 'city-state', preset: { executiveTitle: 'Prime Minister', legislatureName: 'Parliament', regionNoun: 'district' } },
  { v: 'union', preset: { executiveTitle: 'High Representative', legislatureName: 'Union Council', regionNoun: 'member state' } },
  { v: 'parliamentary', preset: { executiveTitle: 'Prime Minister', legislatureName: 'Parliament', regionNoun: 'county' } },
];

type Inst = CabinetOverview['institutions'][number];

export function Cabinet() {
  const [ov, setOv] = React.useState<CabinetOverview | null>(null);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [presets, setPresets] = React.useState<SovereignPreset[]>([]);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const [o, n, p, c] = await Promise.all([
      api.cabinet.overview(),
      api.cabinet.national(),
      api.sovereign.presets(),
      api.cabinet.coordination().catch(() => null),
    ]);
    setOv(o);
    setNat(n);
    setPresets(p.presets);
    setCoord(c);
  }, []);
  React.useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 20_000);
    return () => clearInterval(poll);
  }, [load]);

  async function applyPreset(key: string) {
    setBusy(true);
    try {
      await api.sovereign.applyPreset(key);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api.sovereign.update({
        stateName: String(f.get('stateName')),
        stateForm: f.get('stateForm') as StateForm,
        executiveTitle: String(f.get('executiveTitle')),
        legislatureName: String(f.get('legislatureName')),
        currency: String(f.get('currency')),
        regionNoun: String(f.get('regionNoun')),
        locale: String(f.get('locale')),
        seal: String(f.get('seal')),
        accent: String(f.get('accent')),
        motto: String(f.get('motto')),
      });
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!ov) return <WorkspaceSkeleton label="Loading sovereign overview" />;
  const s = ov.sovereign;
  const t = ov.totals;
  const ident = resolveIdentity(s);

  const cols: Column<Inst>[] = [
    { key: 'n', header: 'Institution', filter: i => i.name, sort: (a, b) => a.name.localeCompare(b.name), render: i => {
        const id = identityFor(i.archetype);
        return (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid h-6 w-6 shrink-0 place-items-center rounded-sm text-xs text-white"
              style={{ backgroundColor: id.accent }}
            >
              {id.glyph}
            </span>
            <Link href={`/gov/ministry/${i.id}`} className="focus-ring font-medium text-link underline underline-offset-2">
              {i.name}
            </Link>
          </span>
        );
      } },
    { key: 'a', header: 'Archetype', filter: i => i.archetype, sort: (a, b) => a.archetype.localeCompare(b.archetype), render: i => <span className="text-ink-muted">{i.archetype}</span> },
    { key: 'st', header: 'Status', filter: i => i.status, sort: (a, b) => a.status.localeCompare(b.status), render: i => (
        <StatusText tone={i.status === 'active' ? 'ok' : 'warn'}>{i.status}</StatusText>
      ) },
    { key: 'q', header: 'Open queue', align: 'right', sort: (a, b) => a.openQueue - b.openQueue, render: i => i.openQueue },
    { key: 'inc', header: 'Active incidents', align: 'right', sort: (a, b) => a.activeIncidents - b.activeIncidents, render: i =>
        i.activeIncidents > 0 ? <StatusText tone="alert">{i.activeIncidents}</StatusText> : '0' },
    { key: 'go', header: '', align: 'right', render: i => (
        <Link href={`/gov/ministry/${i.id}`} className="text-xs text-link underline underline-offset-2">
          Open workspace →
        </Link>
      ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cabinet</h1>
          <p className="text-sm text-ink-muted">
            {s.stateName} · whole-of-government command. {s.executiveTitle} ·{' '}
            {s.legislatureName}.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(v => !v)}>
          {editing ? 'Cancel' : 'Configure sovereign profile'}
        </Button>
      </div>

      {editing ? (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Sovereign profile</h2>
          <p className="mb-3 text-sm text-ink-muted">
            Global-state neutral. The platform serves a republic, federation,
            monarchy, city-state, or union identically — terminology adapts.
          </p>
          <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">State name
              <input name="stateName" defaultValue={s.stateName} required
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">State form
              <select name="stateForm" defaultValue={s.stateForm}
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2">
                {FORMS.map(f => <option key={f.v} value={f.v}>{f.v}</option>)}
              </select>
            </label>
            <label className="text-sm">Executive title
              <input name="executiveTitle" defaultValue={s.executiveTitle} required
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">Legislature
              <input name="legislatureName" defaultValue={s.legislatureName} required
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">Currency (ISO 4217)
              <input name="currency" defaultValue={s.currency} required
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">Sub-national noun
              <input name="regionNoun" defaultValue={s.regionNoun} required
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">Locale
              <input name="locale" defaultValue={s.locale} required
                placeholder="en · fr · ar"
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">Insignia (monogram)
              <input name="seal" defaultValue={s.seal ?? ''}
                placeholder="auto from state name"
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <label className="text-sm">Theme accent
              <input name="accent" type="color" defaultValue={s.accent ?? '#1f2630'}
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-1" />
            </label>
            <label className="text-sm">Formal style / motto
              <input name="motto" defaultValue={s.motto ?? ''}
                className="mt-1 min-h-tap w-full rounded-sm border border-line bg-surface p-2" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {coord ? (
        <Section
          title="Executive briefing & strategic alerts"
          meta={
            <span
              className="rounded-sm px-2 py-0.5 text-xs font-semibold tracking-widest"
              style={{
                backgroundColor: coord.posture.level === 'alert' ? '#f7e3e1' : coord.posture.level === 'warn' ? '#fbf2dd' : '#dceee4',
                color: coord.posture.level === 'alert' ? '#b22e28' : coord.posture.level === 'warn' ? '#6a4d00' : '#227c4d',
              }}
            >
              {coord.posture.label} · risk {coord.posture.nationalRisk}
            </span>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Institutions under pressure
              </div>
              {coord.fabric.slice(0, 5).map(f => {
                const tone = f.pressure >= 78 ? 'alert' : f.pressure >= 60 ? 'warn' : 'ok';
                return (
                  <div key={f.ministryId} className="flex items-center gap-2 py-0.5 text-sm">
                    <span className="w-40 shrink-0 truncate">{f.ministry}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full"
                        style={{ width: `${f.pressure}%`, backgroundColor: tone === 'alert' ? '#b22e28' : tone === 'warn' ? '#9a6e00' : '#227c4d' }}
                      />
                    </span>
                    <span className="w-8 text-right tabular-nums">{f.pressure}</span>
                    <span className="w-3 text-center text-[10px] text-ink-muted">
                      {f.trend === 'rising' ? '▲' : f.trend === 'falling' ? '▼' : '■'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Strategic alerts
              </div>
              <ul className="space-y-1 text-sm">
                {coord.chronology
                  .filter(c => c.kind === 'propagation' || c.kind === 'escalation' || c.kind === 'incident')
                  .slice(-6)
                  .reverse()
                  .map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.tone === 'alert' ? '#b22e28' : c.tone === 'warn' ? '#9a6e00' : '#227c4d' }}
                      />
                      <span><strong>{c.title}</strong> <span className="text-ink-muted">— {c.detail}</span></span>
                    </li>
                  ))}
                {coord.chronology.length === 0 ? (
                  <li className="text-ink-muted">No strategic alerts in the current window.</li>
                ) : null}
              </ul>
              <Link href="/gov/coordination" className="mt-2 inline-block text-xs text-link underline underline-offset-2">
                Open National Coordination Intelligence →
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Sovereign profile presets" meta="one-click global-state neutrality">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <Button
              key={p.key}
              variant={s.stateForm === p.profile.stateForm ? 'primary' : 'secondary'}
              disabled={busy}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Applies a country-shaped profile (terminology, executive title,
          legislature, currency, sub-national noun). The platform serves a
          republic, federation, monarchy, emirate, city-state, or union
          identically.
        </p>
      </Section>

      <Section title="Sovereign identity & order of precedence" meta={`${ident.locale} · ${ident.dir.toUpperCase()}`}>
        <div className="grid gap-4 lg:grid-cols-[auto,1fr]">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-14 w-14 place-items-center rounded-sm text-base font-bold text-white ring-1 ring-black/10"
              style={{ backgroundColor: ident.accent }}
            >
              {ident.seal}
            </span>
            <div className="text-sm">
              <div className="font-semibold">{ident.stateName}</div>
              <div className="text-ink-muted">{ident.motto || '— no formal style set —'}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                <span className="inline-block h-3 w-3 rounded-[2px] ring-1 ring-black/10" style={{ backgroundColor: ident.accent }} />
                {ident.accent}
              </div>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'r', header: 'Precedence', align: 'right', render: (o: typeof ident.protocol[number]) => o.rank },
              { key: 'o', header: 'Office', render: o => <strong>{o.office}</strong> },
              { key: 'h', header: 'Held by', render: o => <span className="text-ink-muted">{o.holder}</span> },
            ]}
            rows={ident.protocol.map(o => ({ ...o, id: String(o.rank) }))}
            rowKey={o => String(o.rank)}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Constitutional order of precedence, resolved from the sovereign
          profile. The platform renders insignia, formal style, locale and
          writing direction without code changes — neutral across republics,
          federations, monarchies, emirates, city-states and unions.
        </p>
      </Section>

      {nat ? (
        <Section
          title="National indicators"
          meta={`${nat.classification} · ${nat.environment}`}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {nat.indicators.map(ind => (
              <MetricStat
                key={ind.label}
                label={ind.label}
                value={`${ind.value}${ind.unit}`}
                tone="neutral"
              />
            ))}
          </div>
        </Section>
      ) : null}

      {nat && nat.crossMinistryIncidents.length > 0 ? (
        <Section
          title="Cross-ministry incidents"
          meta={`${nat.crossMinistryIncidents.length} active`}
        >
          <EnterpriseTable
            columns={[
              { key: 'm', header: 'Ministry', filter: c => c.ministry, sort: (a, b) => a.ministry.localeCompare(b.ministry), render: (c: NationalSnapshot['crossMinistryIncidents'][number]) => (
                  <Link href={`/gov/ministry/${c.ministryId}`} className="font-medium text-link underline underline-offset-2">
                    {c.ministry}
                  </Link>
                ) },
              { key: 'l', header: 'Incident', filter: c => c.label, sort: (a, b) => a.label.localeCompare(b.label), render: c => c.label },
              { key: 's', header: 'Severity', filter: c => c.severity, sort: (a, b) => a.severity.localeCompare(b.severity), render: c => (
                  <StatusText tone={c.severity === 'sev1' || c.severity === 'sev2' ? 'alert' : 'warn'}>
                    {c.severity.toUpperCase()}
                  </StatusText>
                ) },
              { key: 'a', header: 'Current authority', filter: c => c.authority, sort: (a, b) => a.authority.localeCompare(b.authority), render: c => c.authority },
            ]}
            rows={nat.crossMinistryIncidents.map((c, i) => ({ ...c, id: String(i) }))}
            rowKey={(_c, i) => String(i)}
            search
            searchPlaceholder="Filter cross-ministry incidents…"
            initialSort={{ key: 's', dir: 'asc' }}
          />
        </Section>
      ) : null}

      <Section title="Whole-of-government posture" meta={`generated ${new Date(ov.generatedAt).toLocaleString()}`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricStat label="Institutions" value={String(t.institutions)} tone="neutral" />
          <MetricStat label="Active" value={String(t.activeMinistries)} tone="ok" />
          <MetricStat label="Active incidents" value={String(t.activeIncidents)} tone={t.activeIncidents === 0 ? 'ok' : 'alert'} />
          <MetricStat label="Queues breaching" value={String(t.queuesBreaching)} tone={t.queuesBreaching === 0 ? 'ok' : 'warn'} />
          <MetricStat label="Audit integrity" value={t.auditIntact ? 'intact' : 'BROKEN'} tone={t.auditIntact ? 'ok' : 'alert'} />
        </div>
      </Section>

      <Section title="Institutions" meta={`${ov.institutions.length} composed`}>
        <EnterpriseTable
          columns={cols}
          rows={ov.institutions}
          rowKey={i => i.id}
          search
          searchPlaceholder="Filter institutions…"
          initialSort={{ key: 'inc', dir: 'desc' }}
          empty="No institutions composed yet. Use Institutions admin to provision from an archetype."
          expand={i => (
            <div className="space-y-2 text-sm">
              <div className="grid gap-x-8 gap-y-1 sm:grid-cols-3">
                <div className="flex justify-between"><span className="text-ink-muted">Archetype</span><span>{i.archetype}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Status</span><span className="capitalize">{i.status}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Open queue</span><span className="tabular-nums">{i.openQueue}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Active incidents</span><span className="tabular-nums">{i.activeIncidents}</span></div>
              </div>
              <Link href={`/gov/ministry/${i.id}`} className="inline-block text-xs text-link underline underline-offset-2">
                Open {i.name} workspace — regional oversight, approvals, incidents, field operations →
              </Link>
            </div>
          )}
        />
      </Section>

      <p className="text-xs text-ink-muted">
        Sovereign command surface. No individual citizen records, officer
        click data, or political affiliations appear here. Humans govern;
        the platform surfaces. (Companions 156 / 158.)
      </p>
    </div>
  );
}
