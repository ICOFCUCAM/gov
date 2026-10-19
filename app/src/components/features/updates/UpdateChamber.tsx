'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { parseVersion } from '@/lib/updates/semver';
import { OnboardingFrame, Eyebrow, Section, Rule, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { UpdateChamber as Chamber, ChamberRelease, SecurityPosture } from '@/lib/api/types';
import { AdvisoryBanners, IncidentBanners, PosturePanel, ProbationPanel } from './resilience';
import { AdvisoriesPanel } from './AdvisoriesPanel';
import { LifecycleBanner, LifecyclePanel } from './Lifecycle';
import {
  ChamberNav, ChamberTabs, ChannelChip, CopyValue, ErrorLine, Loading, MODE_LABEL, Panel, PoweredBy, SeverityChip,
  STAGES, STAGE_LABEL, StateChip, VerifyGuide, VersionBadge, fmtDate, useCenterTitle, useLink, Chip,
} from './ui';

/**
 * The nation's update chamber: what it runs, what is newer, the path to the
 * latest, and its own feature requests. Nothing here installs anything —
 * every step is a decision taken on a release's page.
 */
export function UpdateChamber() {
  const { link, q } = useLink();
  const [c, setC] = React.useState<Chamber | null>(null);
  const [posture, setPosture] = React.useState<SecurityPosture | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    api.updates.chamber(link).then(r => setC(r.chamber)).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service'));
    api.updates.security(link).then(r => setPosture(r.security.posture)).catch(() => setPosture(null));
  }, [link]);
  React.useEffect(load, [load]);

  // Live probation: poll while a release is being health-checked.
  const watching = c?.probation?.state === 'running';
  React.useEffect(() => {
    if (!watching) return;
    const t = setInterval(() => { api.updates.chamber(link).then(r => setC(r.chamber)).catch(() => undefined); }, 5000);
    return () => clearInterval(t);
  }, [watching, link]);

  const { title, nation } = useCenterTitle(c?.nation.name, c?.nation.home ?? true);

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="chamber" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="chamber" />
        {err ? <ErrorLine>{err}</ErrorLine> : !c ? <Loading /> : <Body c={c} q={q} link={link} title={title} nation={nation} posture={posture} reload={load} />}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Body({ c, q, link, title, nation, posture, reload }: { c: Chamber; q: string; link?: string; title: string; nation: string; posture: SecurityPosture | null; reload: () => void }) {
  const byId = new Map(c.releases.map(r => [r.id, r]));
  const current = c.releases.find(r => r.id === c.nation.installedReleaseId);
  const pending = c.releases.filter(r => r.newer && !r.blocked && !['installed', 'skipped', 'probation', 'fallen-back'].includes(r.install.state));
  const security = pending.filter(r => r.severity === 'security' || r.severity === 'critical');
  const path = c.upgradePath.map(id => byId.get(id)!).filter(Boolean);
  const nationLabel = nation || 'this installation';
  const custom = (parseVersion(c.installed)?.build ?? 0) > 0;
  const head = title.replace(/^Update Center( — )?/, '');

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <Eyebrow>Sovereign Update Center</Eyebrow>
          <h1 className="mt-4 text-[2.2rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3.3rem]">
            Update Center{head ? <>{' '}<span className="text-white/30">—</span>{' '}
              <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{head}</span></> : null}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] font-light leading-relaxed text-white/55">
            Global releases for every nation, and builds made for {nationLabel} from its own requests.
            Nothing installs itself: your administrators review, approve, schedule or download, and record each install.
            Every install is protected by a restore point and health-checked on probation; if it fails, the software returns to the last version that worked.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <VersionBadge version={c.installed} />
          {c.latest !== c.installed ? <VersionBadge version={c.latest} label="Latest for you" size="sm" /> : null}
        </div>
      </div>

      <Rule className="mt-10" strong />
      <dl className="grid grid-cols-2 gap-px lg:grid-cols-6" style={{ background: hair(0.1) }}>
        {[
          ['Running', c.installed],
          ['Last known good', c.nation.lkg?.version ?? '—'],
          ['Updates waiting', pending.length ? `${pending.length}${security.length ? ` · ${security.length} security` : ''}` : 'Up to date'],
          ['Delivery · ring', `${MODE_LABEL[c.nation.deliveryMode]} · ${c.nation.settings.ring === 'pilot' ? 'Pilot' : 'General'}`],
          ['Supported until', current ? fmtDate(current.supportUntil) : '—'],
          ['Open requests', String(c.requests.filter(x => x.stage !== 'delivered' && x.stage !== 'declined').length)],
        ].map(([k, v], i) => (
          <div key={k} className="min-w-0 bg-[#05070b] px-5 py-5">
            <dt className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">
              <span className="tabular-nums text-white/30">{String(i + 1).padStart(2, '0')}</span>{k}
            </dt>
            <dd className="mt-2 truncate font-mono text-[15px] font-light tabular-nums text-[#f3efe6]">{v}</dd>
          </div>
        ))}
      </dl>
      <Rule flip />

      {security.length ? (
        <div role="note" className="mt-8 flex flex-col gap-3 rounded-[3px] border px-5 py-4 sm:flex-row sm:items-center" style={{ borderColor: '#f1938f66', background: 'linear-gradient(90deg, rgba(241,147,143,0.10), rgba(241,147,143,0.02))' }}>
          <SeverityChip severity={security[0]!.severity} />
          <p className="flex-1 text-[14px] font-light text-[#f3efe6]/85">
            {security.length === 1 ? `Security release ${security[0]!.version} is waiting for your decision.` : `${security.length} security releases are waiting for your decision.`}{' '}
            <span className="text-white/50">Recommended, never forced — it installs only when you choose.</span>
          </p>
          <Link href={`/updates/${security[0]!.id}${q}`} className="whitespace-nowrap text-[13px] underline decoration-[#d9c398]/40 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>Review {security[0]!.version} →</Link>
        </div>
      ) : null}

      {c.lifecycle ? <LifecycleBanner w={c.lifecycle} q={q} /> : null}
      <AdvisoryBanners c={c} q={q} />
      <IncidentBanners incidents={c.incidents} link={link} q={q} onChange={reload} />
      {c.probation ? (
        <div className="mt-8">
          <ProbationPanel p={c.probation} release={c.releases.find(r => r.id === c.probation!.releaseId)} nation={c.nation} q={q} />
        </div>
      ) : null}

      <Section n="01" title="Recommended path" aside={path.length ? `${path.length} step${path.length > 1 ? 's' : ''} to ${c.latest}` : 'Nothing to do'}>
        {path.length ? (
          <ol className="flex flex-col gap-3 md:flex-row md:items-stretch">
            <li className="flex items-center gap-3 md:flex-col md:items-start md:justify-center"><VersionBadge version={c.installed} label="Now" size="sm" /></li>
            {path.map((r, i) => (
              <li key={r.id} className="flex min-w-0 flex-1 items-center gap-3">
                <span aria-hidden className="hidden h-px w-8 shrink-0 md:block" style={{ background: hair(0.5) }} />
                <Link href={`/updates/${r.id}${q}`} className="group min-w-0 flex-1 no-underline">
                  <Panel strong={i === path.length - 1} className="h-full px-4 py-3.5 transition-colors group-hover:border-[#d9c398]/60">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[15px] tabular-nums text-[#f4e4bd]">{r.version}</span>
                      <ChannelChip r={r} nationName={nation || undefined} />
                      {r.recommended ? <Chip tone="#9be7c4">Recommended</Chip> : null}
                    </p>
                    <p className="mt-1.5 truncate text-[13px] font-light text-white/60">{r.title}</p>
                    <p className="mt-2 flex items-center gap-2"><StateChip state={r.install.state} /><span className="text-[12px] text-[#d9c398]/70 transition-colors group-hover:text-[#f4e4bd]">Review →</span></p>
                  </Panel>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[14px] font-light text-white/55">You are on the newest version available to you. New global releases and builds made for you will appear here.</p>
        )}
        {custom && path.some(r => r.channel === 'global') ? (
          <p className="mt-4 text-[12.5px] font-light text-white/45">You run a nation build. A global release on its own does not carry your nation’s features; they return in your next nation build made on that version.</p>
        ) : null}
      </Section>

      <Section n="02" title="Release timeline" aside={`${c.releases.length} releases visible to ${nationLabel}`}>
        <ol className="relative">
          <span aria-hidden className="absolute bottom-3 left-[7px] top-3 w-px" style={{ background: `linear-gradient(${hair(0.45)}, ${hair(0.08)})` }} />
          {c.releases.map(r => <TimelineItem key={r.id} r={r} q={q} nation={nation} running={r.id === c.nation.installedReleaseId} />)}
        </ol>
      </Section>

      <Section n="03" title="Feature requests" aside={<Link href={`/updates/requests${q}`} className="underline decoration-[#d9c398]/35 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>Open requests →</Link>}>
        <div className="grid grid-cols-3 gap-px sm:grid-cols-6" style={{ background: hair(0.1) }}>
          {STAGES.map(s => (
            <div key={s} className="bg-[#05070b] px-4 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">{STAGE_LABEL[s]}</p>
              <p className="mt-1.5 font-mono text-[1.4rem] font-light tabular-nums text-[#f3efe6]">{c.requests.filter(x => x.stage === s).length}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 grid gap-2">
          {c.requests.slice(0, 3).map(x => (
            <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b py-2.5 text-[13.5px] font-light" style={{ borderColor: hair(0.08) }}>
              <span className="font-mono text-[11px] text-white/40">{x.id}</span>
              <span className="min-w-0 flex-1 text-[#f3efe6]/85">{x.title}</span>
              <Chip tone={x.stage === 'delivered' ? '#9be7c4' : x.stage === 'declined' ? '#8a8f99' : CHAMPAGNE}>{STAGE_LABEL[x.stage]}</Chip>
            </li>
          ))}
        </ul>
      </Section>

      <Section n="04" title="Security posture" aside={<span className="text-[#9be7c4]/80">Baseline protection included for every nation</span>}>
        {posture ? <PosturePanel p={posture} compact href={`/updates/security${q}`} /> : <div className="min-h-[220px]" />}
      </Section>

      <Section n="05" title="Security advisories — your exposure">
        <AdvisoriesPanel link={link} q={q} compact />
      </Section>

      <div id="lifecycle" className="scroll-mt-6">
        <Section n="06" title="Support lifecycle" aside="Active · security fixes only · end of life">
          <LifecyclePanel link={link} />
        </Section>
      </div>

      <Section n="07" title="Your distribution link and integrity">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Private link key</span>
          <CopyValue value={c.nation.channelKey} label="distribution link key" />
          <span className="text-[12px] font-light text-white/40">Downloads for {nationLabel} come only through this link. Treat it like a credential.</span>
        </div>
        <VerifyGuide publisherKey={c.publisherKey} />
      </Section>
    </>
  );
}

function TimelineItem({ r, q, nation, running }: { r: ChamberRelease; q: string; nation: string; running: boolean }) {
  const dim = !r.newer && !running;
  return (
    <li className={`relative pb-5 pl-8 last:pb-0 ${dim ? 'opacity-60' : ''}`}>
      <span aria-hidden className="absolute left-0 top-[18px] grid h-[15px] w-[15px] place-items-center rounded-full border"
        style={{ borderColor: running ? CHAMPAGNE_HI : r.newer ? hair(0.7) : hair(0.3), background: running ? CHAMPAGNE : '#04060a', boxShadow: running ? `0 0 14px ${CHAMPAGNE}88` : undefined }}>
        {r.newer && !running ? <span className="h-[5px] w-[5px] rounded-full" style={{ background: CHAMPAGNE }} /> : null}
      </span>
      <Link href={`/updates/${r.id}${q}`} className="group block no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]">
        <Panel strong={running} className="grid gap-3 px-5 py-4 transition-colors group-hover:border-[#d9c398]/55 md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="font-mono text-[17px] tabular-nums text-[#f4e4bd]">{r.version}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{fmtDate(r.releasedAt)}</p>
          </div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <ChannelChip r={r} nationName={nation || undefined} />
              <SeverityChip severity={r.severity} />
              {r.recommended && r.newer ? <Chip tone="#9be7c4">Recommended</Chip> : null}
              {r.breakingChanges.length ? <Chip tone="#f1b36b">Breaking changes</Chip> : null}
            </p>
            <p className="mt-2 text-[15px] font-light text-[#f3efe6]">{r.title}</p>
            <p className="mt-1 line-clamp-2 text-[13px] font-light text-white/50">{r.summary}</p>
          </div>
          <div className="flex items-center gap-3 md:flex-col md:items-end">
            {running && r.install.state === 'probation' ? <StateChip state="probation" /> : running ? <Chip tone="#9be7c4" solid>Running</Chip> : r.blocked && r.newer ? <Chip tone="#f1b36b" solid>{r.status === 'withdrawn' ? 'Withdrawn' : 'Halted'}</Chip> : r.superseded ? <Chip tone="#8a8f99">Superseded</Chip> : r.newer ? <StateChip state={r.install.state} /> : <Chip tone="#8a8f99">Older</Chip>}
            {r.newer && !r.compatible ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f1b36b]">Needs {r.minCompatibleVersion}+</span> : null}
            <span className="text-[12px] text-[#d9c398]/60 transition-colors group-hover:text-[#f4e4bd]">Review →</span>
          </div>
        </Panel>
      </Link>
    </li>
  );
}
