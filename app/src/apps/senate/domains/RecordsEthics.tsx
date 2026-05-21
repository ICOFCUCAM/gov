'use client';

// Senate domains — Records, Foresight, Portal, Ethics, Safeguards.

import * as React from 'react';
import { SENATE_SAFEGUARDS } from '@/lib/gov/senate-engine';
import { ChamberFrame, ChamberKpi, ChamberRule, ChamberBar, ChamberCallout, SENATE_DS } from '@/apps/senate/design-system/senate-ds';
import { seed, wave } from '@/lib/telemetry';

export function Hansard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="records" code="RC-HSD-18" title="Hansard"
      subtitle="full plenary transcripts">
      <ChamberKpi items={[
        { label: 'Publication SLA', value: '24h', tone: 'ok' },
        { label: 'Sessions transcribed', value: Math.round(wave(`hs:s:0`, ts, 480, 2400)).toLocaleString() },
        { label: 'Pages YTD', value: Math.round(wave(`hs:p:0`, ts, 24000, 120000)).toLocaleString() },
        { label: 'On-time', value: '100%', tone: 'ok' },
      ]} />
      <ChamberCallout kicker="open record" body="Every plenary debate transcribed within 24 hours. Hansard is the authoritative public record; tampering is a constitutional offence." />
    </ChamberFrame>
  );
}

export function RollCallRecords({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="records" code="RC-RCL-19" title="Roll-Call Records"
      subtitle="per-vote roll-call records">
      <ChamberKpi items={[
        { label: 'Roll-calls YTD', value: Math.round(wave(`rc:r:0`, ts, 80, 480)) },
        { label: 'Unanimous votes', value: Math.round(wave(`rc:u:0`, ts, 12, 60)), tone: 'ok' },
        { label: 'Two-thirds overrides', value: Math.round(wave(`rc:o:0`, ts, 1, 14)), tone: 'info' },
        { label: 'Sealed within 24h', value: '100%', tone: 'ok' },
      ]} />
      <ChamberCallout kicker="public voting" body="Every roll-call is public. Abstentions counted; absences flagged. Citizens can search any senator's voting history by topic." />
    </ChamberFrame>
  );
}

export function SessionsCalendar({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="records" code="RC-CAL-20" title="Sessions Calendar"
      subtitle="plenary & committee calendar">
      <ChamberKpi items={[
        { label: 'Plenary sessions / year', value: 128, tone: 'info' },
        { label: 'Committee sessions / year', value: 380, tone: 'info' },
        { label: 'Recess weeks', value: Math.round(wave(`sc:r:0`, ts, 8, 16)) },
        { label: 'Joint sittings', value: Math.round(wave(`sc:j:0`, ts, 2, 8)) },
      ]} />
      <ChamberCallout kicker="schedule discipline" body="Sessions calendar is published 3 months in advance. Last-minute special sessions require speaker's signed rationale published with the call." />
    </ChamberFrame>
  );
}

export function StrategicForesight({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const themes = ['Climate adaptation', 'Demographic transition', 'Sovereign tech', 'Constitutional resilience', 'Federation evolution'];
  return (
    <ChamberFrame archetype="foresight" code="FS-STR-21" title="Strategic Foresight"
      subtitle="25-year legislative trajectory">
      <ChamberKpi items={[
        { label: 'Foresight themes', value: themes.length, tone: 'info' },
        { label: 'Multi-year inquiries', value: Math.round(wave(`sf:i:0`, ts, 4, 12)) },
        { label: 'Generational reports', value: Math.round(wave(`sf:r:0`, ts, 2, 8)) },
        { label: 'Horizon planning (years)', value: '25', tone: 'info' },
      ]} />
      <ChamberRule label="active foresight" />
      {themes.map((t, i) => (
        <ChamberBar key={t} label={t} pct={Math.round(wave(`sf:p:${i}`, ts, 30, 96))}
          tone="info" tail={`${Math.round(wave(`sf:h:${i}`, ts, 12, 48))}-year horizon`} />
      ))}
    </ChamberFrame>
  );
}

export function LongHorizonReview({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="foresight" code="FS-LHR-22" title="Long-Horizon Review"
      subtitle="generational policy review">
      <ChamberKpi items={[
        { label: 'Generational reports', value: Math.round(wave(`lh:r:0`, ts, 3, 12)), tone: 'info' },
        { label: 'Inter-generational metric', value: '78/100', tone: 'ok' },
        { label: 'Policy coherence index', value: '84/100', tone: 'ok' },
        { label: 'Horizon (years)', value: '50', tone: 'info' },
      ]} />
      <ChamberCallout kicker="long horizon" body="The Senate's deliberative role is to review every policy through a 50-year lens. Bills that fail the long-horizon check are returned to the Assembly." />
    </ChamberFrame>
  );
}

export function CitizenPetitions({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="portal" code="PT-PET-23" title="Citizen Petitions"
      subtitle="active petitions docket">
      <ChamberKpi items={[
        { label: 'Active petitions', value: Math.round(wave(`pt:a:0`, ts, 40, 240)) },
        { label: 'Signature threshold', value: '10,000', tone: 'info' },
        { label: 'Petitions debated YTD', value: Math.round(wave(`pt:d:0`, ts, 8, 36)), tone: 'ok' },
        { label: 'Median time to debate', value: '78 d', tone: 'warn' },
      ]} />
      <ChamberCallout kicker="petition doctrine" body="10,000 signatures trigger a senate debate. The Senate must consider; it need not concur. Petitions sealed in the public registry indefinitely." />
    </ChamberFrame>
  );
}

export function WatchLive({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="portal" code="PT-LIV-24" title="Watch Live"
      subtitle="plenary & committee livestream coordination">
      <ChamberKpi items={[
        { label: 'Streaming sessions', value: Math.round(wave(`wl:s:0`, ts, 1, 6)) },
        { label: 'Viewers (peak)', value: Math.round(wave(`wl:v:0`, ts, 1200, 84000)).toLocaleString(), tone: 'info' },
        { label: 'Channels', value: 4, tone: 'info' },
        { label: 'Sign-language coverage', value: '100%', tone: 'ok' },
      ]} />
    </ChamberFrame>
  );
}

export function SenatorsDirectory({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <ChamberFrame archetype="portal" code="PT-DIR-25" title="Senators Directory"
      subtitle="public senator directory">
      <ChamberKpi items={[
        { label: 'Senators', value: 84 },
        { label: 'Contact methods / senator', value: 4, tone: 'info' },
        { label: 'Constituent surgeries / month', value: '320+', tone: 'ok' },
        { label: 'Languages supported', value: 8, tone: 'info' },
      ]} />
      <ChamberCallout kicker="constituent access" body="Every senator publishes contact methods, constituency office, and surgery hours. Anonymous gatekeeping is constitutionally void." />
    </ChamberFrame>
  );
}

export function CodeOfConduct({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="ethics" code="ET-COC-26" title="Code of Conduct"
      subtitle="conduct standards & enforcement">
      <ChamberKpi items={[
        { label: 'Code articles', value: 18, tone: 'info' },
        { label: 'Open complaints', value: Math.round(wave(`coc:c:0`, ts, 0, 6)), tone: 'warn' },
        { label: 'Findings YTD', value: Math.round(wave(`coc:f:0`, ts, 0, 8)), tone: 'mute' },
        { label: 'Expulsions YTD', value: 0, tone: 'ok' },
      ]} />
      <ChamberCallout kicker="binding code" body="Conduct violations are reviewed by an independent ethics commissioner. Senators may be censured or expelled by two-thirds vote." />
    </ChamberFrame>
  );
}

export function ConflictsOfInterest({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <ChamberFrame archetype="ethics" code="ET-COI-27" title="Conflicts of Interest"
      subtitle="per-senator disclosure register">
      <ChamberKpi items={[
        { label: 'Disclosures filed', value: 84, tone: 'ok' },
        { label: 'Recusals YTD', value: 64, tone: 'info' },
        { label: 'Updates this Q', value: 18, tone: 'info' },
        { label: 'Compliance', value: '100%', tone: 'ok' },
      ]} />
      <ChamberCallout kicker="disclosure doctrine" body="Every senator files an annual interests register. Recusals are recorded; undisclosed conflicts are an automatic ethics finding." />
    </ChamberFrame>
  );
}

export function MisconductTribunal({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="ethics" code="ET-MIS-28" title="Misconduct Tribunal"
      subtitle="senate misconduct tribunal">
      <ChamberKpi items={[
        { label: 'Cases active', value: Math.round(wave(`mt:c:0`, ts, 0, 4)), tone: 'warn' },
        { label: 'Closed this year', value: Math.round(wave(`mt:cy:0`, ts, 0, 6)) },
        { label: 'Civilian-panel reviews', value: '100%', tone: 'ok' },
        { label: 'Public publication', value: '✓', tone: 'ok' },
      ]} />
      <ChamberCallout kicker="independent review" body="Misconduct hearings reviewed by independent civilian panel before senate decision. Decisions published with full reasoning." />
    </ChamberFrame>
  );
}

export function SenateSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <ChamberFrame archetype="safeguards" code="SF-SEN-29" title="Senate Safeguards"
      subtitle="SENATE_SAFEGUARDS contract · §6.10">
      <ChamberKpi items={[
        { label: 'Two-thirds for override', value: SENATE_SAFEGUARDS.twoThirdsForOverride ? '✓' : '✗', tone: 'ok' },
        { label: 'Treaty concurrence', value: SENATE_SAFEGUARDS.treatyRatificationRequired ? '✓' : '✗', tone: 'ok' },
        { label: 'Hansard 24h', value: SENATE_SAFEGUARDS.openHansardWithin24h ? '✓' : '✗', tone: 'ok' },
        { label: 'Closed session rationale', value: SENATE_SAFEGUARDS.closedSessionRequiresPublishedRationale ? '✓' : '✗', tone: 'ok' },
      ]} />
      <ChamberRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: SENATE_DS.parchmentInk, fontFamily: 'ui-monospace, monospace' }}>
        {SENATE_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: SENATE_DS.coral }}>
            <span style={{ color: SENATE_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <ChamberCallout kicker="binding contract" body="Every Senate procedure attests against this contract. Override without two-thirds, gag orders on senators, and Hansard tampering are constitutionally void." />
    </ChamberFrame>
  );
}

export function OverrideDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <ChamberFrame archetype="safeguards" code="SF-OVR-30" title="Override Doctrine"
      subtitle="two-thirds override doctrine">
      <ChamberKpi items={[
        { label: 'Override threshold', value: '2/3', tone: 'info' },
        { label: 'Overrides YTD', value: 4, tone: 'mute' },
        { label: 'Sustained refusals', value: 12 },
        { label: 'Public reasoning required', value: '✓', tone: 'ok' },
      ]} />
      <ChamberCallout kicker="constitutional brake" body="The Senate may delay; it may amend; with two-thirds it may override. Every override carries published reasoning and the record of each senator's vote." />
    </ChamberFrame>
  );
}

export function SovereignAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <ChamberFrame archetype="safeguards" code="SF-AUD-31" title="Sovereign Audit"
      subtitle="cross-chamber audit interface">
      <ChamberKpi items={[
        { label: 'Audit findings reviewed', value: 28, tone: 'info' },
        { label: 'Treasury findings actioned', value: 18, tone: 'ok' },
        { label: 'Cross-chamber joint reviews', value: 6, tone: 'info' },
        { label: 'Audit vault integrity', value: '100%', tone: 'ok' },
      ]} />
      <ChamberCallout kicker="audit doctrine" body="Senate audit findings are co-published with the Assembly's. Joint audit reports cannot be sealed without unanimous chamber consent." />
    </ChamberFrame>
  );
}

void seed;
