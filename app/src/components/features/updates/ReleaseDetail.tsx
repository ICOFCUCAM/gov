'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { bumpKind, gt, parseVersion } from '@/lib/updates/semver';
import { OnboardingFrame, Eyebrow, Section, Rule, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { ChamberRelease, ChangeKind, DeliveryMode, InstallAction, InstallEvent, ReleaseChange, UpdateChamber } from '@/lib/api/types';
import { fallbackMode, ProbationPanel } from './resilience';
import { ReadinessPanel } from './ReadinessPanel';
import { ProvenancePanel } from './Assurance';
import { WhatsNewPanel } from './Comms';
import { nationMessages } from '@/lib/nation/registry';
import {
  ArtifactTable, ChamberNav, ChamberTabs, ChangeChip, ChannelChip, Chip, CHANGE_LABEL, CHANGE_ORDER, ErrorLine, Loading, MODE_LABEL,
  Panel, PoweredBy, SeverityChip, StateChip, STATE_LABEL, VerifyGuide, VersionBadge, fmtBytes, fmtDate, fmtDateTime, useActor, useCenterTitle, useLink,
} from './ui';

const BUMP_LABEL: Record<string, string> = {
  major: 'Major upgrade — read the breaking changes', minor: 'Minor upgrade — new capability, compatible', patch: 'Patch — fixes only',
  'nation-build': 'Nation build on the same base', same: 'This is the version you run', downgrade: 'Older than what you run',
};

type Tab = DeliveryMode | 'clients';

function eventLabel(e: InstallEvent): string {
  if (e.action === 'prepare') return 'Restore point taken';
  if (e.action === 'install') return e.from === 'probation' ? 'Probation passed' : 'Installed — probation started';
  if (e.action === 'fallback') return 'Fell back to last known good';
  if (e.action === 'keep') return 'Kept despite failed checks';
  if (e.action === 'rollback' && e.from === e.to) return 'Data restored';
  return STATE_LABEL[e.to];
}
const DONE: Record<InstallAction, string> = {
  approve: 'Approved', schedule: 'Scheduled', unschedule: 'Schedule cancelled', prepare: 'Restore point taken and verified',
  install: 'Installed — probation started', skip: 'Skipped', reconsider: 'Reopened', rollback: 'Rollback recorded',
  fallback: 'Fallback to last known good recorded', keep: 'Kept despite failed checks', 'cancel-proposal': 'Proposal cancelled',
};

export function ReleaseDetail({ id }: { id: string }) {
  const { link, q } = useLink();
  const [data, setData] = React.useState<{ release: ChamberRelease; chamber: UpdateChamber } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    api.updates.release(id, link).then(setData).catch(e => setErr(e instanceof Error ? e.message : 'Could not load the release'));
  }, [id, link]);
  React.useEffect(load, [load]);
  const watching = data?.release.install.probation?.state === 'running' && data.release.install.state === 'probation';
  React.useEffect(() => {
    if (!watching) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [watching, load]);

  const { nation } = useCenterTitle(data?.chamber.nation.name, data?.chamber.nation.home ?? true);

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="release" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="release" />
        <Link href={`/updates${q}`} className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-night-muted no-underline transition-colors hover:text-[#f4e4bd]">← Update Center</Link>
        {err ? <div className="mt-6"><ErrorLine>{err}</ErrorLine></div> : !data ? <Loading label="Opening release…" /> : (
          <Body r={data.release} c={data.chamber} nation={nation} link={link} onChange={(next) => setData(next)} />
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Body({ r, c, nation, link, onChange }: { r: ChamberRelease; c: UpdateChamber; nation: string; link?: string; onChange: (d: { release: ChamberRelease; chamber: UpdateChamber }) => void }) {
  const running = r.id === c.nation.installedReleaseId;
  const bump = bumpKind(c.installed, r.version);
  // The diff: every change in releases you would gain, between what you run and this one.
  const gained = c.releases.filter(x => gt(x.version, c.installed) && !gt(x.version, r.version) && (x.id === r.id || !(x.channel === 'nation' && x.nationId && r.channel === 'global')));
  const diff: (ReleaseChange & { from: string })[] = gained.flatMap(x => x.changes.map(ch => ({ ...ch, from: x.version })));
  const diffBy = (k: ChangeKind) => diff.filter(d => d.kind === k);
  const migrations = gained.flatMap(x => x.migrations.map(m => ({ ...m, from: x.version })));
  const breaking = gained.flatMap(x => x.breakingChanges.map(b => ({ text: b, from: x.version })));
  const minutes = migrations.reduce((s, m) => s + m.estimatedMinutes, 0);
  const custom = (parseVersion(c.installed)?.build ?? 0) > 0 && r.channel === 'global' && r.newer;
  const fb = fallbackMode(r, c.nation);

  const tabs: { k: Tab; l: string }[] = [
    ...(['saas', 'self-hosted', 'air-gapped'] as DeliveryMode[]).filter(m => r.delivery.includes(m)).map(m => ({ k: m as Tab, l: MODE_LABEL[m] })),
    { k: 'clients', l: 'Apps, SBOM & docs' },
  ];
  const [tab, setTab] = React.useState<Tab>(r.delivery.includes(c.nation.deliveryMode) ? c.nation.deliveryMode : tabs[0]!.k);

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ChannelChip r={r} nationName={nation || undefined} />
          <SeverityChip severity={r.severity} />
          {r.recommended ? <Chip tone="#9be7c4">Recommended</Chip> : null}
          {running ? <Chip tone="#9be7c4" solid>Running</Chip> : <StateChip state={r.install.state} />}
        </div>
        <h1 className="mt-5 font-mono text-[2.6rem] font-extralight tabular-nums leading-none tracking-[-0.03em] text-transparent bg-clip-text sm:text-[3.4rem]" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{r.version}</h1>
        <p className="mt-3 text-[1.45rem] font-extralight tracking-[-0.02em] text-[#f3efe6]">{r.title}</p>
        <p className="mt-3 max-w-[66ch] text-[15px] font-light leading-relaxed text-night-muted">{r.summary}</p>
        <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-night-muted">
          Released {fmtDate(r.releasedAt)} · supported until {fmtDate(r.supportUntil)}{r.baseVersion ? ` · built on ${r.baseVersion}` : ''} · published by {r.publishedBy}
        </p>

        <Rule className="mt-8" strong />
        <dl className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: hair(0.1) }}>
          {[
            ['From → to', `${c.installed} → ${r.version}`],
            ['Minimum installed', `${r.minCompatibleVersion}${r.compatible ? '' : ' (not met)'}`],
            ['Migrations', migrations.length ? `${migrations.length} · ~${minutes} min` : 'None'],
            ['Rollback', gained.some(x => x.migrations.some(m => !m.reversible)) ? 'Partly irreversible' : 'Reversible'],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 bg-[#05070b] px-4 py-4">
              <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#d9c398]/70">{k}</dt>
              <dd className={`mt-1.5 truncate font-mono text-[13.5px] tabular-nums ${k === 'Minimum installed' && !r.compatible ? 'text-[#f1b36b]' : 'text-[#f3efe6]'}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <Rule flip />
        <p className="mt-3 text-[12.5px] font-light text-night-muted">{r.channel === 'nation' && r.newer ? `Nation build made on ${r.baseVersion} — includes it, plus features built for you` : BUMP_LABEL[bump]}.{!r.compatible && r.newer ? ` Install ${r.minCompatibleVersion} or later first; the Update Center shows the path.` : ''}</p>
        {custom ? <p className="mt-2 text-[12.5px] font-light text-[#f1b36b]/85">You run a nation build. This global release does not carry your nation’s features on its own; they return in your next nation build made on {r.version}.</p> : null}

        {r.blocked ? (
          <div role="alert" className="mt-6 rounded-[3px] border px-5 py-4" style={{ borderColor: '#f1b36b77', background: 'rgba(241,179,107,0.07)' }}>
            <p className="text-[14px] font-light text-[#f3efe6]/85"><Chip tone="#f1b36b" solid>{r.status === 'withdrawn' ? 'Withdrawn' : 'Halted'}</Chip>{' '}
              The publisher {r.status} this release{r.statusReason ? `: ${r.statusReason}` : ''}. It cannot be approved or installed.{running ? ' You run it: falling back to your last known good release is advised.' : ''}</p>
          </div>
        ) : null}
        {r.newer ? (
          <div className="mt-6 rounded-[3px] border px-5 py-4" style={{ borderColor: fb.automatic ? '#9be7c455' : '#f1b36b66', background: fb.automatic ? 'rgba(155,231,196,0.04)' : 'rgba(241,179,107,0.06)' }}>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em]" style={{ color: fb.automatic ? '#9be7c4' : '#f1b36b' }}>{r.compatibleWithPrevious ? 'Backward compatible' : 'Not backward compatible'} · if this release fails</p>
            <p className="mt-1.5 text-[13.5px] font-light text-white/70">{fb.text}.{!r.compatibleWithPrevious ? ' Read the data note under “Safe deployment” before you approve.' : ''}</p>
          </div>
        ) : null}

        <Section n="01" title={nationMessages().releaseNotes.whatsNew}>
          <WhatsNewPanel releaseId={r.id} link={link} />
        </Section>

        <Section n="02" title={r.newer ? 'What changes for you' : 'Changelog'} aside={r.newer && gained.length > 1 ? `Includes ${gained.length - 1} release${gained.length > 2 ? 's' : ''} you have not installed` : undefined}>
          <div className="grid gap-6">
            {CHANGE_ORDER.map(k => {
              const items = r.newer ? diffBy(k) : r.changes.filter(x => x.kind === k).map(x => ({ ...x, from: r.version }));
              if (!items.length) return null;
              return (
                <div key={k}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em]" style={{ color: CHAMPAGNE }}>{CHANGE_LABEL[k]} · {items.length}</p>
                  <ul className="mt-2.5 divide-y" style={{ borderColor: hair(0.08) }}>
                    {items.map((ch, i) => (
                      <li key={`${ch.from}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5" style={{ borderColor: hair(0.08) }}>
                        <ChangeChip kind={ch.kind} />
                        <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]/85">{ch.text}</span>
                        {ch.ref ? <span className="font-mono text-[10.5px] text-night-muted">{ch.ref}</span> : null}
                        {r.newer && ch.from !== r.version ? <span className="font-mono text-[10.5px] text-night-champagne">from {ch.from}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>

        {r.newer ? (
          <Section n="03" title="Readiness: preflight and staging">
            <ReadinessPanel r={r} link={link} />
          </Section>
        ) : null}

        <Section n="04" title="Upgrade, migrations and rollback">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-5"><p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Upgrade notes</p><p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/70">{r.upgradeNotes}</p></Panel>
            <Panel className="p-5"><p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Rollback notes</p><p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/70">{r.rollbackNotes}</p></Panel>
          </div>
          {breaking.length ? (
            <div className="mt-4 rounded-[3px] border px-5 py-4" style={{ borderColor: '#f1b36b55', background: 'rgba(241,179,107,0.05)' }}>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#f1b36b]">Breaking changes</p>
              <ul className="mt-2 space-y-1.5">{breaking.map((b, i) => <li key={i} className="text-[13.5px] font-light text-[#f3efe6]/85">{b.text} <span className="font-mono text-[10.5px] text-night-muted">({b.from})</span></li>)}</ul>
            </div>
          ) : null}
          {migrations.length ? (
            <div tabIndex={0} role="region" aria-label="Table (scrolls sideways)" className="focus-ring mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px] font-light">
                <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
                  <th className="py-2 pr-4 font-normal">Migration</th><th className="py-2 pr-4 font-normal">Kind</th><th className="py-2 pr-4 font-normal">Est.</th><th className="py-2 pr-4 font-normal">Reversible</th><th className="py-2 font-normal">From</th>
                </tr></thead>
                <tbody>{migrations.map(m => (
                  <tr key={`${m.from}-${m.id}`} className="border-t align-top" style={{ borderColor: hair(0.08) }}>
                    <td className="py-2.5 pr-4 text-[#f3efe6]/85">{m.description}</td>
                    <td className="py-2.5 pr-4 capitalize text-white/60">{m.kind}{m.pattern ? <span className="block font-mono text-[10px] normal-case text-night-muted">{m.pattern === 'in-place' ? 'in place' : m.pattern}</span> : null}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-white/60">{m.estimatedMinutes} min</td>
                    <td className="py-2.5 pr-4">{m.reversible ? <Chip tone="#9be7c4">Yes</Chip> : <Chip tone="#f1b36b">No</Chip>}</td>
                    <td className="py-2.5 font-mono text-[11px] text-night-muted">{m.from}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="mt-4 text-[13px] font-light text-night-muted">No migrations between {c.installed} and {r.version}.</p>}
        </Section>

        <Section n="05" title="Safe deployment and fallback">
          <div className="grid gap-3 md:grid-cols-3">
            {([
              ['saas', 'Hosted (SaaS)', 'Blue-green per tenant: the new version runs beside the current one and traffic shifts over. Switching back is instant and touches no data.'],
              ['self-hosted', 'Self-hosted', 'A/B installation slots: the install kit writes the new release to the standby slot and switches. install.sh, rollback.sh and the health probes ship in the kit.'],
              ['air-gapped', 'Air-gapped', 'The offline bundle carries a restore kit with the previous release’s images and scripts, so switching back needs nothing from outside.'],
            ] as [DeliveryMode, string, string][]).filter(([m]) => r.delivery.includes(m)).map(([m, t, d]) => (
              <Panel key={m} className="p-4">
                <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/75">{t}{m === c.nation.deliveryMode ? <Chip tone={CHAMPAGNE_HI}>Yours</Chip> : null}</p>
                <p className="mt-2 text-[13px] font-light leading-relaxed text-white/65">{d}</p>
              </Panel>
            ))}
          </div>
          <ol className="mt-5 grid gap-2 text-[13px] font-light text-white/65">
            <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>1</span> · A verified restore point of {c.installed} is taken before the install (database snapshot, configuration, release artifacts).</li>
            <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>2</span> · The release runs on probation for {c.nation.settings.probationMinutes} minutes: readiness, liveness, error rate and latency against baseline, audit-chain integrity, and smoke tests of sign-in, wallet, payments and registry.</li>
            <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>3</span> · Passing makes it your last known good release. Failing — {c.nation.settings.fallback === 'ask' || !r.compatibleWithPrevious ? 'you decide whether to switch back' : 'the software switches back to the last known good release automatically'}. Data is never restored automatically.</li>
          </ol>
          <div className="mt-4 rounded-[3px] border px-4 py-3 text-[12.5px] font-light leading-relaxed text-white/60" style={{ borderColor: hair(0.14) }}>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#d9c398]/70">Data</span>{' '}
            {r.compatibleWithPrevious
              ? 'Every migration is expand/contract: the previous release keeps working on the new schema, so switching back leaves all data — payments, applications, registrations — in place.'
              : `This release changes data in place (${r.migrations.filter(m => !m.reversible || m.pattern === 'in-place').map(m => m.description).join('; ')}). The previous release may not run on the changed data; restoring the snapshot is a separate decision and loses everything written after it.`}
          </div>
        </Section>

        <Section n="06" title="Delivery and downloads">
          <div role="tablist" aria-label="Delivery mode" className="flex flex-wrap gap-2">
            {tabs.map(t => (
              <button key={t.k} role="tab" type="button" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
                className="rounded-full border px-4 py-1.5 text-[12.5px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]"
                style={{ borderColor: tab === t.k ? CHAMPAGNE : hair(0.2), color: tab === t.k ? CHAMPAGNE_HI : 'rgba(243,239,230,0.6)', background: tab === t.k ? hair(0.1) : 'transparent' }}>
                {t.l}{t.k === c.nation.deliveryMode ? ' · yours' : ''}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="mt-5 min-h-[160px]">
            {tab === 'saas' ? (
              <p className="max-w-[62ch] text-[14px] font-light leading-relaxed text-white/60">
                Hosted nations download nothing. Approve the release, then schedule it into a maintenance window you choose — or apply it now. The hosting team acts only inside your window, and the change is recorded only when your administrator confirms it.
              </p>
            ) : tab === 'air-gapped' ? (
              <>
                <p className="mb-4 max-w-[66ch] text-[14px] font-light leading-relaxed text-white/60">
                  For networks with no outside connection. Download the bundle on a connected workstation, verify it there, copy it with its <code className="font-mono text-[12px]">.asc</code> signature to approved removable media, verify it again inside the secure network, then load images into your internal registry and run the included installer.
                </p>
                <ArtifactTable artifacts={r.artifacts.filter(a => a.mode === 'air-gapped')} channelKey={c.nation.channelKey} downloadUrl={api.updates.downloadUrl} />
              </>
            ) : tab === 'clients' ? (
              <ArtifactTable artifacts={r.artifacts.filter(a => a.mode === 'any')} channelKey={c.nation.channelKey} downloadUrl={api.updates.downloadUrl} />
            ) : (
              <ArtifactTable artifacts={r.artifacts.filter(a => a.mode === tab)} channelKey={c.nation.channelKey} downloadUrl={api.updates.downloadUrl} />
            )}
          </div>
          <p className="mt-4 text-[12px] font-light text-night-muted">Download links serve a placeholder manifest (file name, size, checksum and signature). This environment hosts no release binaries.</p>
        </Section>

        <Section n="07" title="Verify before you install">
          <VerifyGuide publisherKey={c.publisherKey} />
        </Section>

        <div id="provenance" className="scroll-mt-6">
          <Section n="08" title="Build provenance" aside="SLSA v1 · in-toto attestations">
            <ProvenancePanel releaseId={r.id} link={link} />
          </Section>
        </div>

        <Section n="09" title="Compliance evidence" aside="Generated from your records">
          <p className="max-w-[70ch] text-[13.5px] font-light leading-relaxed text-white/60">Certification references, security-test summary, SBOMs, provenance, escrow, advisory status for {r.version}, and your own install record and audit-chain entries for it — as a readable pack and a JSON manifest with a digest.</p>
          <Link href={`/updates/${r.id}/evidence${link ? `?link=${encodeURIComponent(link)}` : ''}`} className="mt-3 inline-block text-[13px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>Open the evidence pack →</Link>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Decision r={r} c={c} link={link} onChange={onChange} />
      </aside>
    </div>
  );
}

function Decision({ r, c, link, onChange }: { r: ChamberRelease; c: UpdateChamber; link?: string; onChange: (d: { release: ChamberRelease; chamber: UpdateChamber }) => void }) {
  const [actor, setActor] = useActor();
  const [note, setNote] = React.useState('');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [mode, setMode] = React.useState<DeliveryMode>(r.delivery.includes(c.nation.deliveryMode) ? c.nation.deliveryMode : r.delivery[0]!);
  const [verified, setVerified] = React.useState(false);
  const [ack, setAck] = React.useState(false);
  const [busy, setBusy] = React.useState<InstallAction | 'restore-data' | null>(null);
  const [lossAck, setLossAck] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Default window: tomorrow 02:00–04:00 local, formatted for datetime-local.
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(2, 0, 0, 0);
    const f = (x: Date) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStart(f(d)); setEnd(f(new Date(d.getTime() + 2 * 3600000)));
  }, []);

  const running = r.id === c.nation.installedReleaseId;
  const s = r.install.state;
  // A release scheduled into a hosted window is applied as a hosted upgrade.
  React.useEffect(() => { if (s === 'scheduled') setMode('saas'); }, [s]);
  const rp = r.install.restorePoint;
  const rpValid = !!rp && rp.verified && rp.version === c.installed;
  const pr = r.install.probation;
  const pending = r.install.pending;
  const can = {
    approve: (s === 'available' || s === 'rolled-back' || s === 'fallen-back') && r.newer && !r.blocked,
    schedule: (s === 'approved' || s === 'scheduled') && r.delivery.includes('saas') && !r.blocked,
    unschedule: s === 'scheduled',
    prepare: (s === 'approved' || s === 'scheduled') && r.newer && !r.blocked && !rpValid,
    install: (s === 'approved' || s === 'scheduled') && r.newer && !r.blocked,
    skip: s === 'available' || s === 'approved' || s === 'scheduled',
    reconsider: s === 'skipped',
    rollback: (s === 'installed' || s === 'probation') && running && c.nation.history.length > 0 && pr?.state !== 'awaiting-decision',
    decideFailure: s === 'probation' && pr?.state === 'awaiting-decision',
    restoreData: !!rp && rp.verified && !rp.restoredAt && c.installed === rp.version && (s === 'fallen-back' || s === 'rolled-back'),
  };
  const fb = fallbackMode(r, c.nation);
  const irreversible = r.migrations.some(m => !m.reversible);
  const securitySkip = r.severity === 'security' || r.severity === 'critical';

  async function act(action: InstallAction) {
    setErr(null); setDone(null);
    if (!actor.trim()) { setErr('Enter your name and office — every decision is signed.'); return; }
    setBusy(action);
    try {
      const res = await api.updates.decide(r.id, {
        action, by: actor.trim(), note: note.trim() || undefined, link,
        window: action === 'schedule' ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : undefined,
        mode: action === 'install' ? mode : undefined,
        verified: action === 'install' ? verified : undefined,
        acknowledge: action === 'rollback' ? ack : undefined,
      });
      const next = await api.updates.release(r.id, link);
      onChange(next);
      setNote('');
      setDone((res as { pending?: boolean }).pending
        ? `Proposed — a second, different official must now ${action === 'install' ? 'approve the install' : 'approve'}. Written to the audit chain.`
        : `${DONE[action]} — written to the audit chain.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Decision failed');
    } finally { setBusy(null); }
  }

  async function restoreData() {
    setErr(null); setDone(null);
    if (!actor.trim()) { setErr('Enter your name and office — every decision is signed.'); return; }
    setBusy('restore-data');
    try {
      const res = await api.updates.restoreData(r.id, { by: actor.trim(), acknowledgeLoss: lossAck, link });
      onChange(await api.updates.release(r.id, link));
      // A real backup is restored four-eyes: the first official proposes, a second confirms.
      setDone(res.pending
        ? `Restore proposed. ${res.proposal?.warning.text ?? ''} A second, different official confirms it within 30 minutes.`
        : 'Data restored from the snapshot — written to the audit chain.');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Restore failed'); }
    finally { setBusy(null); }
  }

  return (
    <Panel strong className="p-5 sm:p-6">
      <Eyebrow>Your decision</Eyebrow>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[13px] font-light text-night-muted">Status</span>
        {running && s !== 'probation' ? <Chip tone="#9be7c4" solid>Running</Chip> : <StateChip state={s} />}
      </div>
      {r.newer && !r.blocked ? <p className="mt-2 text-[12px] font-light leading-relaxed" style={{ color: fb.automatic ? '#9be7c4cc' : '#f1b36bcc' }}>If it fails: {fb.automatic ? 'automatic switch back (software only)' : 'you are asked first'}.</p> : null}
      {r.install.window && s === 'scheduled' ? (
        <p className="mt-2 text-[12.5px] font-light text-night-muted">Window: {fmtDateTime(r.install.window.start)} → {fmtDateTime(r.install.window.end)}</p>
      ) : null}
      <p className="mt-3 text-[12px] font-light leading-relaxed text-night-muted">Never automatic. Each step is taken by a named person and written to the audit chain. Approving and installing need two different officials.</p>

      <Rule className="my-5" />
      <div className="grid gap-4">
        <Field label="Decision by"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="Name, office" autoComplete="name" /></Field>
        <Field label="Note" hint={securitySkip && can.skip ? 'Skipping a security release needs a reason.' : can.rollback ? 'A rollback needs a reason.' : undefined}>
          <textarea className={`${inputCls} min-h-[72px] resize-y`} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional — tested in staging, change ticket…" />
        </Field>
      </div>

      <div className="mt-5 grid gap-3">
        {pending ? (
          <div role="status" className="rounded-[3px] border px-4 py-3" style={{ borderColor: '#c9b6ff66', background: 'rgba(201,182,255,0.06)' }}>
            <p className="text-[12.5px] font-light text-[#f3efe6]/85"><span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#c9b6ff]">Four-eyes</span> {pending.by} proposed to {pending.action} {r.version} on {fmtDateTime(pending.at)}. A second, different official must approve it.</p>
            <button type="button" className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-night-muted hover:text-[#f1938f]" disabled={!!busy} onClick={() => act('cancel-proposal')}>Cancel the proposal</button>
          </div>
        ) : null}
        {can.approve ? <button type="button" className={goldBtn} style={goldStyle} disabled={!!busy || !r.compatible} onClick={() => act('approve')}>{busy === 'approve' ? 'Recording…' : pending?.action === 'approve' ? `Approve as second official` : `Propose approval of ${r.version}`}</button> : null}
        {can.approve && !r.compatible ? <p className="text-[12px] text-[#f1b36b]">Needs {r.minCompatibleVersion} or later installed first.</p> : null}

        {can.schedule ? (
          <fieldset className="grid gap-3 rounded-[3px] border p-4" style={{ borderColor: hair(0.16) }}>
            <legend className="px-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Hosted: maintenance window</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="Starts"><input type="datetime-local" className={inputCls} value={start} onChange={e => setStart(e.target.value)} /></Field>
              <Field label="Ends"><input type="datetime-local" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} /></Field>
            </div>
            <button type="button" className={ghostBtn} disabled={!!busy} onClick={() => act('schedule')}>{busy === 'schedule' ? 'Scheduling…' : s === 'scheduled' ? 'Move window' : 'Schedule into this window'}</button>
          </fieldset>
        ) : null}
        {can.unschedule ? <button type="button" className={ghostBtn} disabled={!!busy} onClick={() => act('unschedule')}>Cancel the scheduled window</button> : null}

        {(can.prepare || (rp && (s === 'approved' || s === 'scheduled'))) ? (
          <fieldset className="grid gap-2 rounded-[3px] border p-4" style={{ borderColor: rpValid ? '#9be7c455' : hair(0.16) }}>
            <legend className="px-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Step 1 · Restore point</legend>
            {rpValid && rp ? (
              <div className="text-[12.5px] font-light text-white/70">
                <p className="flex flex-wrap items-center gap-2"><Chip tone="#9be7c4" solid>Verified</Chip><span className="font-mono text-[11.5px]">{rp.id}</span></p>
                <p className="mt-1.5 font-mono text-[10.5px] text-night-muted">{rp.version} · {fmtDateTime(rp.createdAt)} · {fmtBytes(rp.sizeBytes)}</p>
                <p className="mt-1 text-night-muted">{rp.contents.join(' · ')}</p>
              </div>
            ) : (
              <>
                <p className="text-[12.5px] font-light text-night-muted">Snapshot the database, configuration and the artifacts of {c.installed} before installing. Required.</p>
                <button type="button" className={ghostBtn} disabled={!!busy} onClick={() => act('prepare')}>{busy === 'prepare' ? 'Taking and verifying…' : 'Take restore point'}</button>
              </>
            )}
          </fieldset>
        ) : null}

        {can.install ? (
          <fieldset className="grid gap-3 rounded-[3px] border p-4" style={{ borderColor: hair(0.16) }}>
            <legend className="px-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Step 2 · Install and start probation</legend>
            <Field label="Delivered as">
              <Select value={mode} onChange={e => setMode(e.target.value as DeliveryMode)}>
                {r.delivery.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
              </Select>
            </Field>
            {mode !== 'saas' ? (
              <label className="flex items-start gap-3 text-[12.5px] font-light leading-snug text-white/65">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d9c398]" checked={verified} onChange={e => setVerified(e.target.checked)} />
                We verified every checksum and signature against the publisher key before installing.
              </label>
            ) : null}
            <button type="button" className={goldBtn} style={goldStyle} disabled={!!busy || !r.compatible || !rpValid || (pending?.action !== 'install' && mode !== 'saas' && !verified)} onClick={() => act('install')}>
              {busy === 'install' ? 'Recording…' : pending?.action === 'install' ? 'Approve install as second official' : mode === 'saas' ? 'Propose: apply now' : 'Propose: mark as installed'}
            </button>
            {!rpValid ? <p className="text-[11.5px] text-night-muted">Take the restore point first.</p> : null}
          </fieldset>
        ) : null}

        {s === 'probation' && pr ? <ProbationPanel p={pr} release={r} nation={c.nation} compact /> : null}

        {can.decideFailure ? (
          <fieldset className="grid gap-3 rounded-[3px] border p-4" style={{ borderColor: '#f1938f77' }}>
            <legend className="px-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#f1938f]">Probation failed — your decision</legend>
            <p className="text-[12.5px] font-light text-white/65">Switch the software back to {pr!.lkgVersion} (data untouched), or keep {r.version} with a recorded reason.</p>
            <button type="button" className={goldBtn} style={goldStyle} disabled={!!busy} onClick={() => act('fallback')}>{busy === 'fallback' ? 'Switching back…' : `Fall back to ${pr!.lkgVersion}`}</button>
            <button type="button" className={ghostBtn} disabled={!!busy} onClick={() => act('keep')}>Keep {r.version} (reason in the note)</button>
          </fieldset>
        ) : null}

        {can.rollback ? (
          <fieldset className="grid gap-3 rounded-[3px] border p-4" style={{ borderColor: '#f1b36b44' }}>
            <legend className="px-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#f1b36b]">Roll back to {c.nation.history[c.nation.history.length - 1]!.version}</legend>
            {irreversible ? (
              <label className="flex items-start gap-3 text-[12.5px] font-light leading-snug text-white/65">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#f1b36b]" checked={ack} onChange={e => setAck(e.target.checked)} />
                This release ran a migration that cannot be reversed. I understand what stays: {r.rollbackNotes}
              </label>
            ) : null}
            <button type="button" className={ghostBtn} disabled={!!busy || (irreversible && !ack)} onClick={() => act('rollback')}>{busy === 'rollback' ? 'Recording…' : 'Record rollback'}</button>
          </fieldset>
        ) : null}

        {can.restoreData && rp ? (
          <fieldset className="grid gap-3 rounded-[3px] border p-4" style={{ borderColor: '#f1938f55' }}>
            <legend className="px-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#f1938f]">Last resort · restore data</legend>
            <p className="text-[12.5px] font-light leading-relaxed text-white/65">
              The software is back on {rp.version}; your data was not touched. Restoring snapshot {rp.id} replaces the database with its state at <strong className="font-normal text-[#f3efe6]">{fmtDateTime(rp.createdAt)}</strong>.
              <strong className="mt-1 block font-normal text-[#f1938f]">Everything written since — payments, applications, registrations — will be lost.</strong>
            </p>
            <label className="flex items-start gap-3 text-[12.5px] font-light leading-snug text-white/65">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#f1938f]" checked={lossAck} onChange={e => setLossAck(e.target.checked)} />
              I understand that all data written after {fmtDateTime(rp.createdAt)} is lost.
            </label>
            {rp.backupId ? <p className="text-[12px] font-light text-night-muted">Backup {rp.backupId}{rp.checks?.length ? ` · verified: ${rp.checks.length} checks` : ''}. An administrator proposes the restore and a second official confirms it; the current state is backed up first.</p> : rp.simulated ? <p className="text-[12px] font-light text-night-muted">Simulated restore point: nothing was copied.</p> : null}
            <button type="button" className={ghostBtn} disabled={!!busy || !lossAck} onClick={restoreData}>{busy === 'restore-data' ? 'Restoring…' : 'Restore data snapshot'}</button>
          </fieldset>
        ) : null}

        {can.skip ? <button type="button" className={`${ghostBtn} border-white/15 text-white/60`} disabled={!!busy} onClick={() => act('skip')}>Skip this release</button> : null}
        {can.reconsider ? <button type="button" className={ghostBtn} disabled={!!busy} onClick={() => act('reconsider')}>Reconsider</button> : null}
        {!Object.values(can).some(Boolean) ? (
          <p className="text-[13px] font-light text-night-muted">{running ? 'This is the version you run.' : r.newer ? 'No decision is open on this release.' : 'Older than the version you run — nothing to decide.'}</p>
        ) : null}
      </div>

      <div className="mt-4 min-h-[20px]" aria-live="polite">
        {err ? <ErrorLine>{err}</ErrorLine> : done ? <p className="text-[12.5px] text-[#9be7c4]">{done}</p> : null}
      </div>

      {r.install.events.length ? (
        <>
          <Rule className="my-5" />
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Decision record</p>
          <ol className="mt-3 space-y-3">
            {[...r.install.events].reverse().map((e, i) => (
              <li key={i} className="text-[12.5px] font-light leading-snug">
                <p className="flex flex-wrap items-center gap-x-2 text-[#f3efe6]/85">
                  <span>{eventLabel(e)}</span><span className="text-night-faint">by</span><span>{e.by}</span>
                  {typeof e.auditSeq === 'number' ? <span className="font-mono text-[10px] text-night-champagne">audit #{e.auditSeq}</span> : null}
                </p>
                <p className="font-mono text-[10.5px] text-night-muted">{fmtDateTime(e.at)}{e.mode ? ` · ${MODE_LABEL[e.mode]}` : ''}</p>
                {e.window ? <p className="text-night-muted">Window {fmtDateTime(e.window.start)} → {fmtDateTime(e.window.end)}</p> : null}
                {e.note ? <p className="text-night-muted">“{e.note}”</p> : null}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <div className="mt-5"><VersionBadge version={c.installed} label="You run" size="sm" /></div>
    </Panel>
  );
}
