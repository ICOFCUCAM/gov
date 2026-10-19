'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { hair, CHAMPAGNE } from '@/components/features/onboarding/Chrome';
import type { AdvisoryExposure, AdvisoryNationStatus, AdvisorySeverity, PatchCommitment } from '@/lib/api/types';
import { Chip, ErrorLine, Panel, fmtDate } from './ui';

export const SEV_TONE: Record<AdvisorySeverity, string> = { critical: '#f1938f', high: '#f1b36b', medium: '#f4d58d', low: '#a5abb5' };
export const NSTATUS_TONE: Record<AdvisoryNationStatus, string> = { affected: '#f1938f', 'under-investigation': '#f4d58d', fixed: '#9be7c4', 'not-affected': '#a9c7e8' };
export const NSTATUS_TEXT: Record<AdvisoryNationStatus, string> = { affected: 'Affected', 'under-investigation': 'Under investigation', fixed: 'Fixed', 'not-affected': 'Not affected' };
const hrs = (h: number) => (h < 72 ? `${h} h` : `${Math.round(h / 24)} days`);

/** The nation's exposure to published security advisories. `compact` shows only what needs action. */
export function AdvisoriesPanel({ link, q, compact = false }: { link?: string; q: string; compact?: boolean }) {
  const [data, setData] = React.useState<{ exposure: AdvisoryExposure[]; commitments: PatchCommitment[]; policy: Record<AdvisorySeverity, number> } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.advisories(link).then(setData).catch(e => setErr(e instanceof Error ? e.message : 'Could not load advisories')); }, [link]);
  if (!data) return <div className="min-h-[140px]"><ErrorLine>{err}</ErrorLine></div>;
  const open = data.exposure.filter(e => e.status === 'affected' || e.status === 'under-investigation');
  const shown = compact ? open : data.exposure;
  const linkQ = link ? `?link=${encodeURIComponent(link)}` : '';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['affected', 'under-investigation', 'fixed', 'not-affected'] as AdvisoryNationStatus[]).map(s => (
          <Chip key={s} tone={NSTATUS_TONE[s]} solid={s === 'affected' && open.some(e => e.status === 'affected')}>{data.exposure.filter(e => e.status === s).length} {NSTATUS_TEXT[s].toLowerCase()}</Chip>
        ))}
        <span className="ml-auto text-[11.5px] font-light text-night-muted">Patch commitments: {(['critical', 'high', 'medium', 'low'] as AdvisorySeverity[]).map(s => `${s} ${hrs(data.policy[s])}`).join(' · ')}</span>
      </div>
      {shown.map(e => {
        const c = data.commitments.find(x => x.advisoryId === e.advisory.id);
        return (
          <Panel key={e.advisory.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[11px] text-night-muted">{e.advisory.id}</span>
              <Chip tone={SEV_TONE[e.advisory.severity]} solid={e.advisory.severity === 'critical'}>{e.advisory.severity} · CVSS {e.advisory.cvss.toFixed(1)}</Chip>
              <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{e.advisory.title}</span>
              <Chip tone={NSTATUS_TONE[e.status]} solid={e.status === 'affected'}>{NSTATUS_TEXT[e.status]}</Chip>
            </div>
            {!compact ? <p className="mt-1.5 text-[12.5px] font-light text-night-muted">{e.advisory.summary}</p> : null}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-night-muted">
              <span>Affects ≥{e.advisory.affectedFrom}{e.advisory.affectedBefore ? ` <${e.advisory.affectedBefore}` : ''}</span>
              <span>{e.advisory.fixedIn ? `Fixed in ${e.advisory.fixedIn}` : 'No fix yet'}</span>
              <span>Published {fmtDate(e.advisory.publishedAt)}</span>
              {e.advisory.cwe ? <span>{e.advisory.cwe}</span> : null}
              {c ? <span style={{ color: c.state === 'breached' ? '#f1938f' : c.state === 'met' ? '#9be7c4' : '#f4d58d' }}>Publisher commitment {c.state}{c.hoursLeft !== undefined ? ` · ${hrs(c.hoursLeft)} left` : ''}</span> : null}
            </p>
            {e.justification && e.status === 'not-affected' ? <p className="mt-1 text-[11.5px] text-night-muted">VEX: {e.justification}</p> : null}
            <p className="mt-2 flex flex-wrap gap-4 text-[12px]">
              {e.status === 'affected' && e.fixReleaseId ? <Link href={`/updates/${e.fixReleaseId}${q}`} className="underline underline-offset-4" style={{ color: CHAMPAGNE }}>Review the fix →</Link> : null}
              <a href={`/api/releases/advisories/${e.advisory.id}/csaf${linkQ}`} download className="underline decoration-white/20 underline-offset-4 text-night-muted hover:text-[#f4e4bd]">CSAF JSON ↓</a>
            </p>
          </Panel>
        );
      })}
      {!shown.length ? <p className="text-[13px] font-light text-[#9be7c4]">Not affected by any open advisory.</p> : null}
      {compact && open.length ? <p className="text-[11.5px] text-night-muted" style={{ borderColor: hair(0.1) }}>All advisories, with CSAF exports, are on the Security page.</p> : null}
    </div>
  );
}
