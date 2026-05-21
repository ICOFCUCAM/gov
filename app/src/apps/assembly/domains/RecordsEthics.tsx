'use client';

// Assembly domains — Records, Committees, Portal, Ethics, Safeguards.

import * as React from 'react';
import { ASSEMBLY_SAFEGUARDS } from '@/lib/gov/assembly-engine';
import { FloorFrame, FloorKpi, FloorRule, FloorBar, FloorCallout, ASSEMBLY_DS } from '@/apps/assembly/design-system/assembly-ds';
import { seed, wave } from '@/lib/telemetry';

export function Hansard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="records" code="RC-HSD-17" title="Hansard"
      subtitle="full plenary transcripts">
      <FloorKpi items={[
        { label: 'Publication SLA', value: '24h', tone: 'ok' },
        { label: 'Sessions transcribed', value: Math.round(wave(`hs:s:0`, ts, 1200, 6400)).toLocaleString() },
        { label: 'Pages YTD', value: Math.round(wave(`hs:p:0`, ts, 48000, 240000)).toLocaleString() },
        { label: 'On-time', value: '100%', tone: 'ok' },
      ]} />
      <FloorCallout kicker="public record" body="Every plenary transcribed within 24 hours. Hansard is the authoritative public record; tampering is a constitutional offence." />
    </FloorFrame>
  );
}

export function RollCallRecords({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="records" code="RC-RCL-18" title="Roll-Call Records"
      subtitle="per-vote roll-call records">
      <FloorKpi items={[
        { label: 'Roll-calls YTD', value: Math.round(wave(`rc:r:0`, ts, 240, 1200)) },
        { label: 'Public votes', value: '100%', tone: 'ok' },
        { label: 'Secret ballots on policy', value: 0, tone: 'ok' },
        { label: 'Sealed within 24h', value: '100%', tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function SessionsCalendar({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <FloorFrame archetype="records" code="RC-CAL-19" title="Sessions Calendar"
      subtitle="plenary & committee calendar">
      <FloorKpi items={[
        { label: 'Plenary sessions / year', value: 240, tone: 'info' },
        { label: 'Committee sessions / year', value: 1400, tone: 'info' },
        { label: 'Recess weeks', value: 8, tone: 'mute' },
        { label: 'Joint sittings', value: 6, tone: 'info' },
      ]} />
    </FloorFrame>
  );
}

export function StandingCommittees({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const committees = ['Finance & Public Accounts', 'Constitutional Affairs', 'Defence & Security', 'Health & Social Care', 'Education & Knowledge', 'Industry & Trade', 'Foreign Affairs', 'Transport & Infrastructure', 'Environment & Climate', 'Justice & Human Rights', 'Public Service', 'Audit & Accountability', 'Cybersecurity', 'Petitions'];
  return (
    <FloorFrame archetype="committees" code="CM-STD-20" title="Standing Committees"
      subtitle="permanent assembly committees">
      <FloorKpi items={[
        { label: 'Standing committees', value: committees.length },
        { label: 'Sessions this Q', value: Math.round(wave(`sc:s:0`, ts, 280, 720)) },
        { label: 'Reports tabled YTD', value: Math.round(wave(`sc:r:0`, ts, 48, 184)), tone: 'ok' },
        { label: 'Joint inquiries', value: Math.round(wave(`sc:j:0`, ts, 2, 8)) },
      ]} />
      <FloorRule label="committee register" />
      {committees.slice(0, 7).map((c, i) => (
        <FloorBar key={c} label={c} pct={Math.round(wave(`sc:p:${i}`, ts, 38, 96))}
          tone={i === 0 ? 'info' : 'ok'}
          tail={`${Math.round(wave(`sc:i:${i}`, ts, 1, 8))} inquiries`} />
      ))}
    </FloorFrame>
  );
}

export function SelectCommittees({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="committees" code="CM-SEL-21" title="Select Committees"
      subtitle="time-bound select committees">
      <FloorKpi items={[
        { label: 'Active select cmtes', value: Math.round(wave(`slc:a:0`, ts, 4, 14)), tone: 'info' },
        { label: 'Mandate (avg months)', value: 12, tone: 'info' },
        { label: 'Tabled reports YTD', value: Math.round(wave(`slc:r:0`, ts, 4, 18)) },
        { label: 'Public sessions', value: '92%', tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function Inquiries({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="committees" code="CM-INQ-22" title="Committee Inquiries"
      subtitle="active investigative inquiries">
      <FloorKpi items={[
        { label: 'Active inquiries', value: Math.round(wave(`ai:n:0`, ts, 14, 48)), tone: 'info' },
        { label: 'Witnesses heard', value: Math.round(wave(`ai:w:0`, ts, 120, 840)) },
        { label: 'Subpoenas (year)', value: Math.round(wave(`ai:s:0`, ts, 2, 12)), tone: 'warn' },
        { label: 'Reports tabled YTD', value: Math.round(wave(`ai:r:0`, ts, 8, 38)), tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function WatchLive({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="portal" code="PT-LIV-23" title="Watch Live"
      subtitle="plenary & committee livestream">
      <FloorKpi items={[
        { label: 'Streaming sessions', value: Math.round(wave(`wl:s:0`, ts, 2, 14)) },
        { label: 'Peak viewers', value: Math.round(wave(`wl:v:0`, ts, 18000, 480000)).toLocaleString(), tone: 'info' },
        { label: 'Channels', value: 8, tone: 'info' },
        { label: 'Sign-language coverage', value: '100%', tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function MembersDirectory({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <FloorFrame archetype="portal" code="PT-DIR-24" title="Members Directory"
      subtitle="public member directory">
      <FloorKpi items={[
        { label: 'Members', value: 420 },
        { label: 'Contact methods / member', value: 5, tone: 'info' },
        { label: 'Constituency surgeries / month', value: '1,800+', tone: 'ok' },
        { label: 'Languages supported', value: 8, tone: 'info' },
      ]} />
      <FloorCallout kicker="constituency access" body="Every member publishes contact methods, constituency office, and surgery hours. Members are accessible to every citizen in their constituency." />
    </FloorFrame>
  );
}

export function YouthParliament({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="portal" code="PT-YTH-25" title="Youth Parliament"
      subtitle="annual youth sitting">
      <FloorKpi items={[
        { label: 'Youth members', value: 420, tone: 'info' },
        { label: 'Age range', value: '16-25', tone: 'info' },
        { label: 'Resolutions tabled', value: Math.round(wave(`yp:r:0`, ts, 14, 38)), tone: 'ok' },
        { label: 'Adopted by Assembly', value: Math.round(wave(`yp:a:0`, ts, 4, 18)) },
      ]} />
      <FloorCallout kicker="generational voice" body="The Youth Parliament sits annually. Resolutions are tabled to the Assembly with a 6-month consideration window." />
    </FloorFrame>
  );
}

export function CodeOfConduct({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="ethics" code="ET-COC-26" title="Code of Conduct"
      subtitle="conduct standards & enforcement">
      <FloorKpi items={[
        { label: 'Code articles', value: 22, tone: 'info' },
        { label: 'Open complaints', value: Math.round(wave(`coc:c:0`, ts, 0, 8)), tone: 'warn' },
        { label: 'Findings YTD', value: Math.round(wave(`coc:f:0`, ts, 0, 12)) },
        { label: 'Expulsions YTD', value: 0, tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function ConflictsOfInterest({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <FloorFrame archetype="ethics" code="ET-COI-27" title="Conflicts of Interest"
      subtitle="per-member disclosure">
      <FloorKpi items={[
        { label: 'Disclosures filed', value: 420, tone: 'ok' },
        { label: 'Recusals YTD', value: 248, tone: 'info' },
        { label: 'Updates this Q', value: 64, tone: 'info' },
        { label: 'Compliance', value: '100%', tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function MisconductTribunal({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="ethics" code="ET-MIS-28" title="Misconduct Tribunal"
      subtitle="assembly misconduct tribunal">
      <FloorKpi items={[
        { label: 'Cases active', value: Math.round(wave(`mt:c:0`, ts, 0, 6)), tone: 'warn' },
        { label: 'Closed this year', value: Math.round(wave(`mt:cy:0`, ts, 0, 8)) },
        { label: 'Civilian-panel reviews', value: '100%', tone: 'ok' },
        { label: 'Public publication', value: '✓', tone: 'ok' },
      ]} />
    </FloorFrame>
  );
}

export function AssemblySafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <FloorFrame archetype="safeguards" code="SF-ASM-29" title="Assembly Safeguards"
      subtitle="ASSEMBLY_SAFEGUARDS contract · §7.10">
      <FloorKpi items={[
        { label: 'Public voting default', value: ASSEMBLY_SAFEGUARDS.publicVotingByDefault ? '✓' : '✗', tone: 'ok' },
        { label: 'Budget requires vote', value: ASSEMBLY_SAFEGUARDS.budgetAppropriationRequiresAssembly ? '✓' : '✗', tone: 'ok' },
        { label: 'Question Time weekly', value: ASSEMBLY_SAFEGUARDS.questionTimeWeekly ? '✓' : '✗', tone: 'ok' },
        { label: 'Petition threshold (5k)', value: ASSEMBLY_SAFEGUARDS.petitionsTrigger5000 ? '✓' : '✗', tone: 'ok' },
      ]} />
      <FloorRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: ASSEMBLY_DS.parchment, fontFamily: 'ui-monospace, monospace' }}>
        {ASSEMBLY_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: ASSEMBLY_DS.coral }}>
            <span style={{ color: ASSEMBLY_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <FloorCallout kicker="binding contract" body="Every Assembly procedure attests against this contract. Secret ballots on policy, budget without vote, and ministerial non-appearance are constitutionally void." />
    </FloorFrame>
  );
}

export function PublicVotingDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <FloorFrame archetype="safeguards" code="SF-PVO-30" title="Public Voting Doctrine"
      subtitle="public voting as default">
      <FloorKpi items={[
        { label: 'Public roll-calls', value: '100%', tone: 'ok' },
        { label: 'Secret ballots permitted', value: 'Internal officer elections only', tone: 'info' },
        { label: 'Citizen-searchable votes', value: '✓', tone: 'ok' },
        { label: 'Vote-tampering incidents', value: 0, tone: 'ok' },
      ]} />
      <FloorCallout kicker="transparency doctrine" body="The Assembly votes in public. Citizens can search any member's voting history by topic and constituency. Secret ballots on policy are constitutionally void." />
    </FloorFrame>
  );
}

export function SovereignAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <FloorFrame archetype="safeguards" code="SF-AUD-31" title="Sovereign Audit"
      subtitle="cross-chamber audit interface">
      <FloorKpi items={[
        { label: 'Audit findings tabled', value: 96, tone: 'info' },
        { label: 'Treasury findings actioned', value: 68, tone: 'ok' },
        { label: 'Joint reviews (Senate)', value: 12, tone: 'info' },
        { label: 'Audit vault integrity', value: '100%', tone: 'ok' },
      ]} />
      <FloorCallout kicker="audit doctrine" body="Audit findings are tabled to the Assembly first. The Assembly may concur with the Senate on joint audit reports; sealing requires unanimous consent." />
    </FloorFrame>
  );
}

void seed;
