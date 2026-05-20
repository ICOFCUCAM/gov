'use client';

// Education domains — Futurist Mesh surfaces. These define the leap
// the Ministry leverages: privacy-preserving learner companions,
// nationally federated AI tutor hubs, neural curriculum graph,
// civilizational projection, generational foresight and the public
// institution index.

import * as React from 'react';
import Link from 'next/link';
import { knowledgeDevelopmentBoard } from '@/lib/gov/knowledge-development';
import { educationPublicInstitutions, totalEducationPublicSites } from '@/lib/gov/education-public-institutions';
import { HallFrame, HallKpi, HallRule, HallBar, HallCallout, EDUCATION_DS } from '@/apps/ministry-education/design-system/education-ds';
import { seed, wave } from '@/lib/telemetry';

export function SovereignLearnerTwin({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const cohorts = ['Foundational 5-9', 'Formative 10-14', 'Secondary 15-18', 'Tertiary 19-24', 'Lifelong'];
  return (
    <HallFrame archetype="knowledge" code="FT-LRN-00" title="Sovereign Learner Twin"
      subtitle="privacy-preserving learner companion · §14.0">
      <HallKpi items={[
        { label: 'Learners enrolled (M)', value: (wave(`lt:e:${ts}`, ts, 6, 14)).toFixed(1), tone: 'info' },
        { label: 'Consent-rate', value: `${Math.round(wave(`lt:c:${ts}`, ts, 86, 99))}%`, tone: 'ok' },
        { label: 'Federated nodes', value: Math.round(wave(`lt:n:${ts}`, ts, 480, 2400)).toLocaleString() },
        { label: 'Cognitive profiling', value: 0, tone: 'ok' },
      ]} />
      <HallRule label="cohort engagement" />
      {cohorts.map((c, i) => {
        const k = `lt:${i}:${ts}`;
        const engagement = Math.round(wave(`${k}:e`, ts, 62, 96));
        return <HallBar key={c} label={c} pct={engagement} tone={engagement > 80 ? 'ok' : engagement > 60 ? 'warn' : 'alert'}
          tail={`${Math.round(wave(`${k}:s`, ts, 12, 96))}% sessions/wk`} />;
      })}
      <HallCallout kicker="constitutional doctrine" body="The Learner Twin runs federated on the citizen's device. The state cannot read individual learning traces; only consented aggregates are visible. Cognitive profiling is constitutionally void." />
    </HallFrame>
  );
}

export function AiTutorMesh({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const hubs = ['Capital Hub', 'Northern Hub', 'Eastern Hub', 'Western Hub', 'Coastal Hub', 'Highland Hub', 'Polar Hub'];
  return (
    <HallFrame archetype="knowledge" code="FT-AIT-00" title="AI Tutor Mesh"
      subtitle="federated AI tutor hubs">
      <HallKpi items={[
        { label: 'Hubs online', value: hubs.length },
        { label: 'Total sessions / week (M)', value: (wave(`tm:s:${ts}`, ts, 8, 42)).toFixed(1) },
        { label: 'Mean response (ms)', value: Math.round(wave(`tm:r:${ts}`, ts, 84, 320)), tone: 'ok' },
        { label: 'Model attestation', value: '✓ open', tone: 'ok' },
      ]} />
      <HallRule label="hub posture" />
      {hubs.map((h, i) => {
        const uptime = Math.round(wave(`tm:${i}`, ts, 96, 100) * 100) / 100;
        return <HallBar key={h} label={h} pct={Math.min(100, uptime)}
          tone={uptime > 99 ? 'ok' : uptime > 96 ? 'warn' : 'alert'}
          tail={`${uptime}% uptime`} />;
      })}
      <HallCallout kicker="open attestation" body="Every hub publishes its model card, training-data provenance, and pluralism review. Closed-source tutors are prohibited under §14.0." />
    </HallFrame>
  );
}

export function NeuralCurriculumGraph({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const subjects = ['Mathematics', 'Sciences', 'Languages', 'Civics & History', 'Vocational / TVET', 'Digital Literacy', 'Arts & Music', 'Constitutional Literacy'];
  return (
    <HallFrame archetype="curriculum" code="FT-NCG-00" title="Neural Curriculum Graph"
      subtitle="adaptive cross-subject curriculum">
      <HallKpi items={[
        { label: 'Subjects modelled', value: subjects.length },
        { label: 'Cross-subject edges', value: Math.round(wave(`ng:e:${ts}`, ts, 240, 1480)).toLocaleString() },
        { label: 'Pluralism review', value: '✓ open forum', tone: 'ok' },
        { label: 'Conformity scoring', value: '✗ forbidden', tone: 'ok' },
      ]} />
      <HallRule label="adaptive coverage" />
      {subjects.map((s, i) => {
        const c = Math.round(wave(`ng:${i}:${ts}`, ts, 72, 99));
        return <HallBar key={s} label={s} pct={c} tone={c > 88 ? 'ok' : c > 72 ? 'warn' : 'alert'}
          tail={`${Math.round(wave(`ng:a:${i}:${ts}`, ts, 12, 48))} cross-edges`} />;
      })}
      <HallCallout kicker="pluralism doctrine" body="Every curriculum node is reviewable in an Open Curriculum Forum. Multiple traditions can be honoured simultaneously; compulsory uniformity of thought is void." />
    </HallFrame>
  );
}

export function CivilizationalProjection({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="memory" code="FT-CVP-00" title="Civilizational Projection"
      subtitle="100y intergenerational projection">
      <HallKpi items={[
        { label: 'Knowledge resilience', value: `${board.forecast.civilizationalKnowledgeResilience}/100`, tone: 'ok' },
        { label: 'Generational continuity risk', value: `${board.forecast.generationalContinuityRisk}/100`, tone: 'warn' },
        { label: 'Horizons modelled', value: board.forecast.horizonYears.length, tone: 'info' },
        { label: 'Demographic shift (% delta)', value: `${board.forecast.demographicCapabilityShift > 0 ? '+' : ''}${board.forecast.demographicCapabilityShift}`, tone: 'info' },
      ]} />
      <HallRule label="multi-horizon trajectories" />
      <div className="grid grid-cols-1 gap-2 text-[11px] md:grid-cols-3">
        {['Literacy', 'Workforce readiness', 'Research capability'].map((label, i) => {
          const series = [board.forecast.literacyTrajectory, board.forecast.workforceReadinessTrajectory, board.forecast.researchCapabilityTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          return (
            <div key={label} className="border p-2" style={{ borderColor: EDUCATION_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: EDUCATION_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: EDUCATION_DS.gold }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, v / 3))}px`, background: EDUCATION_DS.gold }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <HallCallout kicker="intergenerational doctrine" body="The polity is a relay between generations. Decisions that exploit, deplete or politicise civilizational memory are constitutionally void." />
    </HallFrame>
  );
}

export function GenerationalForesight({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="cohorts" code="FT-GFR-00" title="Generational Foresight"
      subtitle="cohort-by-cohort capability projection">
      <HallKpi items={[
        { label: 'Cohorts tracked', value: board.cohorts.length },
        { label: 'High-inequality cohorts', value: board.cohorts.filter(c => c.inequalityIdx > 60).length, tone: 'alert' },
        { label: 'Workforce-ready', value: `${Math.round(board.cohorts.reduce((s, c) => s + c.workforceReadinessPct, 0) / Math.max(1, board.cohorts.length))}%`, tone: 'ok' },
        { label: 'Long-horizon resilience', value: `${board.forecast.civilizationalKnowledgeResilience}/100`, tone: 'info' },
      ]} />
      <HallRule label="capability readiness" />
      {board.cohorts.map(c => (
        <HallBar key={c.generation} label={c.generation} pct={c.capabilityReadiness}
          tone={c.capabilityReadiness > 75 ? 'ok' : c.capabilityReadiness > 55 ? 'warn' : 'alert'}
          tail={`${c.populationM.toFixed(1)} M · inequality ${c.inequalityIdx}`} />
      ))}
    </HallFrame>
  );
}

export function PublicInstitutionIndex({ id, now }: { id: string; now: number }) {
  void id; void now;
  const branches = educationPublicInstitutions();
  const total = totalEducationPublicSites();
  return (
    <HallFrame archetype="institutions" code="FT-PII-00" title="Public Institution Index"
      subtitle={`${branches.length} branches · ${total.toLocaleString()} independent public sites`}>
      <HallKpi items={[
        { label: 'Branches', value: branches.length },
        { label: 'Public sites', value: total.toLocaleString(), tone: 'info' },
        { label: 'Tertiary branches', value: branches.filter(b => b.tier === 'Tertiary').length },
        { label: 'Futurist branches', value: branches.filter(b => b.tier === 'Futurist' || b.tier === 'Research').length, tone: 'ok' },
      ]} />
      <HallRule label="branch register" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {branches.map(b => (
          <Link key={b.branch} href={b.href}
            className="rounded-[3px] border p-2 text-[11px] transition-colors hover:bg-white/3"
            style={{ borderColor: EDUCATION_DS.rule, fontFamily: 'ui-monospace, monospace' }}>
            <div className="flex items-center justify-between">
              <span style={{ color: EDUCATION_DS.gold }}>{b.glyph} {b.branch}</span>
              <span className="tabular-nums" style={{ color: EDUCATION_DS.cobalt }}>{b.publicSites.toLocaleString()} sites</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: EDUCATION_DS.mut }}>{b.tier}</div>
            <div className="mt-0.5 text-[10.5px]" style={{ color: EDUCATION_DS.parchmentInk }}>{b.description}</div>
          </Link>
        ))}
      </div>
      <HallCallout kicker="federated voice" body="Each branch operates its own public portal. The Ministry coordinates standards and protects pluralism without consolidating their voice." />
    </HallFrame>
  );
}

void seed;
