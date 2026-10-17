'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { gt } from '@/lib/updates/semver';
import { OnboardingFrame, Eyebrow, Section, Rule, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { ChangeKind, DeliveryMode, FeatureRequest, FeatureRequestStage, PublisherOverview, ReleaseSeverity } from '@/lib/api/types';
import {
  ChannelChip, Chip, CopyValue, ErrorLine, Loading, MODE_LABEL, Panel, PoweredBy, SEVERITY_LABEL, SeverityChip, STAGES, STAGE_LABEL,
  StateChip, fmtDate, useActor,
} from './ui';
import { RequestCard } from './FeatureRequests';
import { IncidentCard } from './resilience';

const CHANGE_KINDS: ChangeKind[] = ['feature', 'fix', 'security', 'breaking', 'deprecation'];
const NEXT: Partial<Record<FeatureRequestStage, FeatureRequestStage>> = {
  requested: 'under-review', 'under-review': 'scoped', scoped: 'in-development', 'in-development': 'ready',
};

/**
 * Publisher console — the platform team's side of the Update Center:
 * enrolled nations and their private links, publishing global releases and
 * nation builds, the install matrix, and the feature-request pipeline.
 */
export function PublisherConsole() {
  const [o, setO] = React.useState<PublisherOverview | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.updates.publisher.overview().then(r => setO(r.overview)).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the publisher service'));
  }, []);
  React.useEffect(load, [load]);

  return (
    <OnboardingFrame right={
      <nav aria-label="Publisher" className="flex items-center gap-4">
        <Link href="/updates" className="uppercase transition-colors hover:text-[#f4e4bd]">Chamber</Link>
        <Link href="/platform" className="uppercase transition-colors hover:text-[#f4e4bd]">Pipeline</Link>
      </nav>
    }>
      <div className="flex-1 py-10 lg:py-14">
        <Eyebrow>Publisher console · platform team only</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Release <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>distribution</span>
        </h1>
        <p className="mt-4 max-w-[68ch] text-[15px] font-light leading-relaxed text-white/55">
          Publish global releases to every nation, build releases for one nation from its requests, and see where each nation stands.
          Publishing makes a release available; each nation decides when, and whether, to install it.
        </p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !o ? <Loading label="Loading distribution…" /> : <Body o={o} reload={load} />}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Body({ o, reload }: { o: PublisherOverview; reload: () => void }) {
  const nameOf = (id?: string) => o.nations.find(n => n.id === id)?.name ?? id ?? '';
  return (
    <>
      <Section n="01" title="Subscribed nations" aside={`${o.nations.length} enrolled`}>
        <div className="grid gap-3">
          {o.nations.map(n => (
            <Panel key={n.id} strong={n.home} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-light text-[#f3efe6]">{n.name}{n.home ? <Chip tone={CHAMPAGNE_HI}>This installation</Chip> : null}<Chip tone={n.settings.ring === 'pilot' ? '#c9b6ff' : '#a5abb5'}>{n.settings.ring === 'pilot' ? 'Pilot ring' : 'General ring'}</Chip></p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{MODE_LABEL[n.deliveryMode]}{n.iso3 ? ` · ${n.iso3}` : ''} · since {fmtDate(n.enrolledAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[15px] tabular-nums text-[#f4e4bd]">{n.installedVersion}</span>
                {n.available ? <Chip tone={CHAMPAGNE}>{n.available} waiting</Chip> : <Chip tone="#9be7c4">Current</Chip>}
                {n.securityPending ? <Chip tone="#f1938f" solid>{n.securityPending} security</Chip> : null}
                {n.openRequests ? <Chip tone="#a9c7e8">{n.openRequests} open requests</Chip> : null}
              </div>
              <div className="min-w-0"><span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-[#d9c398]/60">Private link</span><CopyValue value={`/updates?link=${n.channelKey}`} short label={`${n.name} link`} /></div>
              <Link href={n.home ? '/updates' : `/updates?link=${encodeURIComponent(n.channelKey)}`} className="whitespace-nowrap text-[12.5px] underline decoration-[#d9c398]/40 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>Open chamber →</Link>
            </Panel>
          ))}
        </div>
        <EnrolForm onDone={reload} />
      </Section>

      <Section n="02" title="Publish a release">
        <PublishForm o={o} onDone={reload} />
      </Section>

      <Section n="03" title="Release health and safety" aside="Halt stops new approvals and installs; nations already on it are advised to fall back">
        <ReleaseSafety o={o} reload={reload} />
      </Section>

      <Section n="04" title="Fallback incidents across nations" aside={`${o.incidents.length} recorded`}>
        <div className="grid gap-3">
          {o.incidents.map(i => <IncidentCard key={i.id} i={{ ...i, acknowledgedAt: i.acknowledgedAt ?? i.openedAt }} />)}
          {!o.incidents.length ? <p className="text-[13.5px] font-light text-white/50">No fallbacks reported.</p> : null}
        </div>
      </Section>

      <Section n="05" title="Install matrix" aside="Each nation’s own decision — never pushed">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px] font-light">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
                <th className="py-2 pr-4 font-normal">Release</th>
                {o.nations.map(n => <th key={n.id} className="py-2 pr-4 font-normal">{n.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {o.releases.map(r => (
                <tr key={r.id} className="border-t align-middle" style={{ borderColor: hair(0.08) }}>
                  <td className="py-3 pr-4">
                    <p className="flex flex-wrap items-center gap-2"><span className="font-mono tabular-nums text-[#f4e4bd]">{r.version}</span><ChannelChip r={r} nationName={r.channel === 'nation' ? nameOf(r.nationId) : undefined} /><SeverityChip severity={r.severity} /></p>
                    <p className="mt-1 text-[12px] text-white/45">{r.title} · {fmtDate(r.releasedAt)}</p>
                  </td>
                  {o.nations.map(n => {
                    const st = o.installs[n.id]?.[r.id];
                    const running = n.installedReleaseId === r.id;
                    const older = st === 'available' && !gt(r.version, n.installedVersion);
                    return <td key={n.id} className="py-3 pr-4">{!st ? <span className="font-mono text-[11px] text-white/20" title="Not visible to this nation">—</span> : running ? <Chip tone="#9be7c4" solid>Running</Chip> : older ? <Chip tone="#8a8f99">Older</Chip> : <StateChip state={st} />}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="06" title="Feature request pipeline" aside={`${o.requests.filter(q => q.stage !== 'delivered' && q.stage !== 'declined').length} open`}>
        <Pipeline requests={o.requests} nameOf={nameOf} onDone={reload} />
      </Section>
    </>
  );
}

function ReleaseSafety({ o, reload }: { o: PublisherOverview; reload: () => void }) {
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  async function act(id: string, action: 'halt' | 'resume' | 'withdraw' | 'promote') {
    setErr(null);
    let reason: string | undefined;
    if (action === 'halt' || action === 'withdraw') {
      reason = window.prompt(action === 'halt' ? 'Why is this release halted? (shown to nations)' : 'Why is this release withdrawn? (permanent; shown to nations)') ?? undefined;
      if (!reason) return;
    }
    try { await api.updates.publisher.setStatus(id, { action, reason, by: actor || undefined }); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }
  const btn = 'rounded-full border px-3 py-1 text-[11.5px] transition-colors disabled:opacity-40';
  return (
    <>
      <div className="min-h-[18px]" aria-live="polite"><ErrorLine>{err}</ErrorLine></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
            <th className="py-2 pr-4 font-normal">Release</th><th className="py-2 pr-4 font-normal">Ring · status</th><th className="py-2 pr-4 font-normal">Installs</th><th className="py-2 pr-4 font-normal">Passed</th><th className="py-2 pr-4 font-normal">Fallbacks</th><th className="py-2 pr-4 font-normal">Failure rate</th><th className="py-2 font-normal">Actions</th>
          </tr></thead>
          <tbody>
            {o.releases.map(r => (
              <tr key={r.id} className="border-t align-middle" style={{ borderColor: hair(0.08) }}>
                <td className="py-3 pr-4"><span className="font-mono tabular-nums text-[#f4e4bd]">{r.version}</span><span className="block text-[11.5px] text-white/40">{r.title}{r.compatibleWithPrevious ? '' : ' · not backward compatible'}</span></td>
                <td className="py-3 pr-4"><span className="flex flex-wrap gap-1.5">
                  <Chip tone={r.rollout === 'pilot' ? '#c9b6ff' : '#a5abb5'}>{r.rollout === 'pilot' ? 'Pilot' : 'GA'}</Chip>
                  <Chip tone={r.status === 'active' ? '#9be7c4' : '#f1b36b'} solid={r.status !== 'active'}>{r.status}</Chip>
                </span>{r.statusReason ? <span className="mt-1 block max-w-[220px] text-[11px] text-white/45">{r.statusReason}</span> : null}</td>
                <td className="py-3 pr-4 font-mono tabular-nums">{r.stats.installs}</td>
                <td className="py-3 pr-4 font-mono tabular-nums">{r.stats.passed}</td>
                <td className="py-3 pr-4 font-mono tabular-nums">{r.stats.fallbacks}</td>
                <td className="py-3 pr-4"><span className="font-mono tabular-nums" style={{ color: r.stats.failureRate >= 25 ? '#f1938f' : r.stats.failureRate > 0 ? '#f1b36b' : '#9be7c4' }}>{r.stats.installs ? `${r.stats.failureRate}%` : '—'}</span></td>
                <td className="py-3"><span className="flex flex-wrap gap-1.5">
                  {r.status === 'active' ? <button type="button" className={btn} style={{ borderColor: '#f1b36b88', color: '#f1b36b' }} onClick={() => act(r.id, 'halt')}>Halt</button> : null}
                  {r.status === 'halted' ? <button type="button" className={btn} style={{ borderColor: hair(0.3), color: '#f3efe6' }} onClick={() => act(r.id, 'resume')}>Resume</button> : null}
                  {r.status !== 'withdrawn' ? <button type="button" className={btn} style={{ borderColor: '#f1938f66', color: '#f1938f' }} onClick={() => act(r.id, 'withdraw')}>Recall</button> : null}
                  {r.rollout === 'pilot' && r.status === 'active' ? <button type="button" className={btn} style={{ borderColor: hair(0.3), color: CHAMPAGNE_HI }} onClick={() => act(r.id, 'promote')}>Promote to GA</button> : null}
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pipeline({ requests, nameOf, onDone }: { requests: FeatureRequest[]; nameOf: (id: string) => string; onDone: () => void }) {
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  async function move(q: FeatureRequest, to: FeatureRequestStage) {
    setErr(null);
    let note: string | undefined;
    if (to === 'declined') {
      note = window.prompt(`Reason for declining ${q.id} (shown to the nation):`) ?? undefined;
      if (!note) return;
    }
    setBusy(q.id);
    try { await api.updates.publisher.advance(q.id, { to, note, by: actor || undefined }); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not move the request'); }
    finally { setBusy(null); }
  }
  const columns: FeatureRequestStage[] = [...STAGES, 'declined'];
  return (
    <>
      <div className="min-h-[20px]" aria-live="polite"><ErrorLine>{err}</ErrorLine></div>
      <div className="grid gap-6 xl:grid-cols-2">
        {columns.map(stage => {
          const items = requests.filter(q => q.stage === stage);
          if (!items.length && (stage === 'declined')) return null;
          return (
            <div key={stage}>
              <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em]" style={{ color: CHAMPAGNE }}>{STAGE_LABEL[stage]}<span className="tabular-nums text-white/35">{items.length}</span></p>
              <Rule className="mt-1.5" />
              <ul className="mt-3 grid gap-3">
                {items.map(q => (
                  <RequestCard key={q.id} x={q} nationLabel={nameOf(q.nationId)} actions={NEXT[q.stage] ? (
                    <>
                      <button type="button" disabled={busy === q.id} onClick={() => move(q, NEXT[q.stage]!)} className="rounded-full border px-3 py-1 text-[11.5px] text-[#f3efe6]/85 hover:border-[#d9c398]/70 hover:text-[#f4e4bd] disabled:opacity-40" style={{ borderColor: hair(0.3) }}>Move to {STAGE_LABEL[NEXT[q.stage]!]} →</button>
                      <button type="button" disabled={busy === q.id} onClick={() => move(q, 'declined')} className="rounded-full border px-3 py-1 text-[11.5px] text-white/45 hover:text-[#f1938f] disabled:opacity-40" style={{ borderColor: hair(0.15) }}>Decline</button>
                    </>
                  ) : q.stage === 'ready' ? <span className="text-[11.5px] text-white/45">Deliver by publishing a nation build ↑</span> : null} />
                ))}
                {!items.length ? <li className="text-[12.5px] font-light text-white/30">Empty</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

function EnrolForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [iso3, setIso3] = React.useState('');
  const [mode, setMode] = React.useState<DeliveryMode>('saas');
  const [ver, setVer] = React.useState('1.4.0');
  const [err, setErr] = React.useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api.updates.publisher.enrol({ name, iso3: iso3 || undefined, deliveryMode: mode, installedVersion: ver }); setName(''); setIso3(''); setOpen(false); onDone(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not enrol'); }
  }
  return (
    <div className="mt-4">
      <button type="button" className={ghostBtn} onClick={() => setOpen(v => !v)} aria-expanded={open}>{open ? 'Close' : '+ Enrol a nation'}</button>
      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.6fr_1fr_0.8fr_auto] lg:items-end">
          <Field label="Nation or deployment"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} required /></Field>
          <Field label="ISO 3166 alpha-3"><input className={inputCls} value={iso3} onChange={e => setIso3(e.target.value.toUpperCase())} maxLength={3} placeholder="Optional" /></Field>
          <Field label="Delivery"><Select value={mode} onChange={e => setMode(e.target.value as DeliveryMode)}>{(Object.keys(MODE_LABEL) as DeliveryMode[]).map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</Select></Field>
          <Field label="Running version"><input className={inputCls} value={ver} onChange={e => setVer(e.target.value)} required /></Field>
          <button type="submit" className={goldBtn} style={goldStyle}>Enrol & issue link</button>
          <div className="sm:col-span-2 lg:col-span-5"><ErrorLine>{err}</ErrorLine></div>
        </form>
      ) : null}
    </div>
  );
}

function PublishForm({ o, onDone }: { o: PublisherOverview; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const globals = o.releases.filter(r => r.channel === 'global');
  const [channel, setChannel] = React.useState<'global' | 'nation'>('nation');
  const [nationId, setNationId] = React.useState(o.nations[0]?.id ?? '');
  const [baseVersion, setBase] = React.useState(globals[0]?.version ?? '');
  const [version, setVersion] = React.useState('');
  const [platformReleaseId, setPlatform] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [severity, setSeverity] = React.useState<ReleaseSeverity>('feature');
  const [recommended, setRecommended] = React.useState(false);
  const [minCompat, setMinCompat] = React.useState(globals[1]?.version ?? globals[0]?.version ?? '');
  const [changes, setChanges] = React.useState('feature: ');
  const [breaking, setBreaking] = React.useState('');
  const [migration, setMigration] = React.useState('');
  const [migrationPattern, setMigrationPattern] = React.useState<'expand' | 'in-place'>('expand');
  const [pilot, setPilot] = React.useState(false);
  const [upgradeNotes, setUpgrade] = React.useState('');
  const [rollbackNotes, setRollback] = React.useState('');
  const [supportMonths, setSupport] = React.useState(18);
  const [delivery, setDelivery] = React.useState<DeliveryMode[]>(['saas', 'self-hosted', 'air-gapped']);
  const [delivers, setDelivers] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const ready = o.requests.filter(q => q.nationId === nationId && q.stage === 'ready');
  const nextBuild = (() => {
    const n = o.releases.filter(r => r.nationId === nationId && r.baseVersion === baseVersion).length;
    return `${baseVersion}+sov.${n + 1}`;
  })();

  function parseChanges() {
    return changes.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const m = /^(feature|fix|security|breaking|deprecation)\s*:\s*(.+)$/i.exec(l);
      return m ? { kind: m[1]!.toLowerCase() as ChangeKind, text: m[2]!.trim() } : { kind: 'feature' as ChangeKind, text: l };
    }).filter(c => c.text);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null); setBusy(true);
    try {
      const mig = migration.trim() ? [{ kind: 'database', description: migration.trim(), reversible: migrationPattern === 'expand', estimatedMinutes: 10, pattern: migrationPattern }] : [];
      const r = await api.updates.publisher.publish({
        channel, nationId: channel === 'nation' ? nationId : undefined, baseVersion: channel === 'nation' ? baseVersion : undefined,
        version: channel === 'global' ? version : undefined, platformReleaseId: channel === 'global' && platformReleaseId ? platformReleaseId : undefined,
        title, summary, severity, recommended, minCompatibleVersion: minCompat, changes: parseChanges(),
        rollout: channel === 'global' && pilot ? 'pilot' : 'general',
        breakingChanges: breaking.split('\n').map(s => s.trim()).filter(Boolean), migrations: mig,
        upgradeNotes, rollbackNotes, supportMonths, delivery, deliversRequests: channel === 'nation' ? delivers : [], by: actor || undefined,
      });
      setOk(`Published ${r.release.version}. It is now available — nothing has been installed anywhere.`);
      setTitle(''); setSummary(''); setChanges('feature: '); setBreaking(''); setMigration(''); setDelivers([]); setVersion('');
      onDone();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not publish'); }
    finally { setBusy(false); }
  }

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  return (
    <Panel strong className="p-5 sm:p-7">
      <form onSubmit={submit} className="grid gap-5" aria-label="Publish a release">
        <div role="radiogroup" aria-label="Channel" className="flex flex-wrap gap-2">
          {(['nation', 'global'] as const).map(ch => (
            <button key={ch} type="button" role="radio" aria-checked={channel === ch} onClick={() => setChannel(ch)}
              className="rounded-full border px-4 py-1.5 text-[12.5px] transition-colors"
              style={{ borderColor: channel === ch ? CHAMPAGNE : hair(0.2), color: channel === ch ? CHAMPAGNE_HI : 'rgba(243,239,230,0.6)', background: channel === ch ? hair(0.1) : 'transparent' }}>
              {ch === 'global' ? 'Global release — every nation' : 'Nation build — one nation'}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channel === 'nation' ? (
            <>
              <Field label="For nation"><Select value={nationId} onChange={e => { setNationId(e.target.value); setDelivers([]); }}>{o.nations.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</Select></Field>
              <Field label="Built on global"><Select value={baseVersion} onChange={e => setBase(e.target.value)}>{globals.map(g => <option key={g.id} value={g.version}>{g.version}</option>)}</Select></Field>
              <Field label="Version" hint="Assigned automatically."><input className={`${inputCls} opacity-70`} value={nextBuild} readOnly /></Field>
            </>
          ) : (
            <>
              <Field label="Version" hint="Semantic version, e.g. 1.5.0"><input className={inputCls} value={version} onChange={e => setVersion(e.target.value)} required placeholder="1.5.0" /></Field>
              <Field label="From the pipeline" hint="Stable platform releases not yet distributed.">
                <Select value={platformReleaseId} onChange={e => { setPlatform(e.target.value); const p = o.promotable.find(x => x.id === e.target.value); if (p) { setVersion(p.version); if (!title) setTitle(p.notes); } }}>
                  <option value="">None</option>
                  {o.promotable.map(p => <option key={p.id} value={p.id}>{p.version} — {p.notes}</option>)}
                </Select>
              </Field>
            </>
          )}
          <Field label="Minimum installed version"><input className={inputCls} value={minCompat} onChange={e => setMinCompat(e.target.value)} required /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Title"><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} /></Field>
          <Field label="Severity"><Select value={severity} onChange={e => setSeverity(e.target.value as ReleaseSeverity)}>{(Object.keys(SEVERITY_LABEL) as ReleaseSeverity[]).map(s => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}</Select></Field>
        </div>
        <Field label="Summary"><textarea className={`${inputCls} min-h-[70px] resize-y`} value={summary} onChange={e => setSummary(e.target.value)} required /></Field>
        <Field label="Changelog" hint={`One per line, prefixed with a kind: ${CHANGE_KINDS.join(', ')}.`}>
          <textarea className={`${inputCls} min-h-[100px] resize-y font-mono text-[13px]`} value={changes} onChange={e => setChanges(e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Breaking changes" hint="One per line. Leave empty if none."><textarea className={`${inputCls} min-h-[70px] resize-y`} value={breaking} onChange={e => setBreaking(e.target.value)} /></Field>
          <div className="grid gap-2">
            <Field label="Database migration" hint="Describe it, if this release migrates data."><textarea className={`${inputCls} min-h-[70px] resize-y`} value={migration} onChange={e => setMigration(e.target.value)} /></Field>
            <Select aria-label="Migration pattern" value={migrationPattern} onChange={e => setMigrationPattern(e.target.value as 'expand' | 'in-place')}>
              <option value="expand">Expand/contract — backward compatible (automatic fallback allowed)</option>
              <option value="in-place">In place — not backward compatible (nations are asked before any fallback)</option>
            </Select>
          </div>
          <Field label="Upgrade notes"><textarea className={`${inputCls} min-h-[70px] resize-y`} value={upgradeNotes} onChange={e => setUpgrade(e.target.value)} /></Field>
          <Field label="Rollback notes"><textarea className={`${inputCls} min-h-[70px] resize-y`} value={rollbackNotes} onChange={e => setRollback(e.target.value)} /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <fieldset>
            <legend className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/65">Delivery modes</legend>
            <div className="mt-2.5 flex flex-wrap gap-4">
              {(Object.keys(MODE_LABEL) as DeliveryMode[]).map(m => (
                <label key={m} className="flex items-center gap-2 text-[13px] font-light text-white/70">
                  <input type="checkbox" className="h-4 w-4 accent-[#d9c398]" checked={delivery.includes(m)} onChange={() => setDelivery(d => toggle(d, m))} />{MODE_LABEL[m]}
                </label>
              ))}
              <label className="flex items-center gap-2 text-[13px] font-light text-white/70">
                <input type="checkbox" className="h-4 w-4 accent-[#9be7c4]" checked={recommended} onChange={e => setRecommended(e.target.checked)} />Mark recommended
              </label>
              {channel === 'global' ? (
                <label className="flex items-center gap-2 text-[13px] font-light text-white/70">
                  <input type="checkbox" className="h-4 w-4 accent-[#c9b6ff]" checked={pilot} onChange={e => setPilot(e.target.checked)} />Start in the pilot ring
                </label>
              ) : null}
            </div>
          </fieldset>
          <Field label="Support (months)"><input type="number" min={1} max={120} className={inputCls} value={supportMonths} onChange={e => setSupport(Number(e.target.value))} /></Field>
        </div>

        {channel === 'nation' ? (
          <fieldset>
            <legend className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/65">Delivers requests (ready)</legend>
            {ready.length ? (
              <div className="mt-2.5 grid gap-2">
                {ready.map(q => (
                  <label key={q.id} className="flex items-start gap-3 text-[13px] font-light text-white/75">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d9c398]" checked={delivers.includes(q.id)} onChange={() => setDelivers(d => toggle(d, q.id))} />
                    <span><span className="font-mono text-[11px] text-white/40">{q.id}</span> {q.title}</span>
                  </label>
                ))}
              </div>
            ) : <p className="mt-2 text-[12.5px] font-light text-white/40">No requests from this nation are marked ready. Move them through the pipeline below.</p>}
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-[280px]"><Field label="Published by"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="Release engineering" /></Field></div>
          <button type="submit" className={goldBtn} style={goldStyle} disabled={busy}>{busy ? 'Publishing…' : channel === 'global' ? 'Publish to every nation' : 'Publish nation build'}</button>
        </div>
        <div className="min-h-[20px]" aria-live="polite">{err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12.5px] text-[#9be7c4]">{ok}</p> : null}</div>
      </form>
    </Panel>
  );
}
