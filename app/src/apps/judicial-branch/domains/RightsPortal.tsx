'use client';

// Judicial branch — Rights, Portal, Safeguards.

import * as React from 'react';
import { JUDICIAL_BRANCH_SAFEGUARDS } from '@/lib/gov/judicial-branch-engine';
import { CourtFrame, CourtKpi, CourtRule, CourtCallout, JUDICIAL_DS } from '@/apps/judicial-branch/design-system/judicial-ds';
import { seed, wave } from '@/lib/telemetry';

export function RightsFramework({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="rights" code="RT-FRM-23" title="Rights Framework"
      subtitle="constitutional rights framework">
      <CourtKpi items={[
        { label: 'Rights enumerated', value: 64, tone: 'info' },
        { label: 'Fair-trial guarantees', value: '12 articles', tone: 'ok' },
        { label: 'Equal protection', value: 'Universal', tone: 'ok' },
        { label: 'Citizen-friendly guide', value: '✓', tone: 'ok' },
      ]} />
      <CourtCallout kicker="rights doctrine" body="Constitutional rights are enumerated, justiciable and self-executing. Every citizen has the right to know, the right to counsel, and the right to an open hearing." />
    </CourtFrame>
  );
}

export function CounselNetwork({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="rights" code="RT-CNS-24" title="Counsel Network"
      subtitle="counsel directory">
      <CourtKpi items={[
        { label: 'Active counsel', value: Math.round(wave(`cn:c:0`, ts, 8400, 24000)).toLocaleString(), tone: 'info' },
        { label: 'Bar accreditation', value: '100%', tone: 'ok' },
        { label: 'Plain-language search', value: '✓', tone: 'ok' },
        { label: 'Translation services', value: '8 languages', tone: 'info' },
      ]} />
    </CourtFrame>
  );
}

export function LegalAidBench({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="rights" code="RT-LGL-25" title="Legal Aid Bench"
      subtitle="pro-bono legal aid network">
      <CourtKpi items={[
        { label: 'Pro-bono advocates', value: '14,800', tone: 'ok' },
        { label: 'Cases this month', value: Math.round(wave(`la:c:0`, ts, 2400, 14000)).toLocaleString(), tone: 'info' },
        { label: 'Eligibility', value: 'Income-tested', tone: 'info' },
        { label: 'Denial of counsel', value: 0, tone: 'ok' },
      ]} />
      <CourtCallout kicker="counsel doctrine" body="Every citizen has a constitutional right to counsel. Denial of counsel is constitutionally void." />
    </CourtFrame>
  );
}

export function WatchLive({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="portal" code="PT-LIV-26" title="Watch Live"
      subtitle="public hearing livestream">
      <CourtKpi items={[
        { label: 'Live sessions', value: Math.round(wave(`wl:s:0`, ts, 1, 8)) },
        { label: 'Constitutional hearings', value: Math.round(wave(`wl:c:0`, ts, 0, 4)), tone: 'info' },
        { label: 'Languages supported', value: 8, tone: 'info' },
        { label: 'Public viewing', value: '✓ free', tone: 'ok' },
      ]} />
    </CourtFrame>
  );
}

export function CaseSearch({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="portal" code="PT-SRC-27" title="Case Search"
      subtitle="full-text case search">
      <CourtKpi items={[
        { label: 'Decisions indexed', value: '420,000+', tone: 'info' },
        { label: 'Search latency', value: '<300 ms', tone: 'ok' },
        { label: 'Citizen-friendly UX', value: '✓', tone: 'ok' },
        { label: 'API tier', value: 'Public + audited', tone: 'info' },
      ]} />
      {void ts}
    </CourtFrame>
  );
}

export function CourtLocator({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="portal" code="PT-LCT-28" title="Court Locator"
      subtitle="national court locator">
      <CourtKpi items={[
        { label: 'Constitutional Court', value: 1, tone: 'info' },
        { label: 'Supreme Court benches', value: 6 },
        { label: 'Appeals Court', value: 24 },
        { label: 'Trial Court branches', value: 380, tone: 'info' },
      ]} />
      <CourtCallout kicker="access doctrine" body="92% of citizens live within 50 km of a court. Travel-assistance and translation are guaranteed where needed." />
    </CourtFrame>
  );
}

export function CivicEducation({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="portal" code="PT-CIV-29" title="Civic Education"
      subtitle="rights & justice civic education">
      <CourtKpi items={[
        { label: 'Schools enrolled', value: '8,400+', tone: 'ok' },
        { label: 'Citizen events / year', value: 240, tone: 'info' },
        { label: 'Print + digital library', value: '✓', tone: 'ok' },
        { label: 'Languages', value: 8, tone: 'info' },
      ]} />
    </CourtFrame>
  );
}

export function JudicialSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="safeguards" code="SF-JUD-30" title="Judicial Safeguards"
      subtitle="JUDICIAL_BRANCH_SAFEGUARDS contract · §8.9">
      <CourtKpi items={[
        { label: 'Judicial independence', value: JUDICIAL_BRANCH_SAFEGUARDS.judicialIndependence ? '✓' : '✗', tone: 'ok' },
        { label: 'Open reasoning', value: JUDICIAL_BRANCH_SAFEGUARDS.openReasoningInEveryDecision ? '✓' : '✗', tone: 'ok' },
        { label: 'Right to counsel', value: JUDICIAL_BRANCH_SAFEGUARDS.rightToCounselGuaranteed ? '✓' : '✗', tone: 'ok' },
        { label: 'Prohibition of political influence', value: JUDICIAL_BRANCH_SAFEGUARDS.prohibitionOfPoliticalInfluence ? '✓' : '✗', tone: 'ok' },
      ]} />
      <CourtRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: JUDICIAL_DS.parchmentInk, fontFamily: 'ui-monospace, monospace' }}>
        {JUDICIAL_BRANCH_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: JUDICIAL_DS.coral }}>
            <span style={{ color: JUDICIAL_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <CourtCallout kicker="binding contract" body="Every judicial procedure attests against this contract. Sealed rulings without rationale, denial of counsel and political pressure on justices are constitutionally void." />
    </CourtFrame>
  );
}

export function IndependenceAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="safeguards" code="SF-IND-31" title="Independence Audit"
      subtitle="judicial-independence audit">
      <CourtKpi items={[
        { label: 'Political-pressure incidents', value: 0, tone: 'ok' },
        { label: 'Independence index', value: '98/100', tone: 'ok' },
        { label: 'Civilian-panel oversight', value: '✓', tone: 'ok' },
        { label: 'Public transparency', value: 'Full', tone: 'ok' },
      ]} />
    </CourtFrame>
  );
}

export function ApexAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="safeguards" code="SF-APX-32" title="Apex Audit"
      subtitle="cross-branch apex audit">
      <CourtKpi items={[
        { label: 'Audit findings reviewed', value: 28, tone: 'info' },
        { label: 'Inter-branch reviews', value: 6, tone: 'info' },
        { label: 'Branch overrides upheld', value: 4, tone: 'ok' },
        { label: 'Audit vault integrity', value: '100%', tone: 'ok' },
      ]} />
    </CourtFrame>
  );
}

void seed;
