'use client';

// Agriculture domains — Response, Governance & Subsidy surfaces.

import * as React from 'react';
import { agricultureRuralBoard } from '@/lib/gov/agriculture-rural';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { SeasonalFrame, SeasonalKpi, SeasonalRule, CropRow, SeasonalCallout, AGRICULTURE_DS } from '@/apps/ministry-agriculture/design-system/agriculture-ds';
import { seed, wave } from '@/lib/telemetry';

export function PestEmergency({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <SeasonalFrame archetype="response" code="RS-PST-12" title="Pest Emergency"
      subtitle="outbreak response & containment"
      season={board.season}>
      <SeasonalKpi items={[
        { label: 'Active alerts', value: board.portal.pestAlerts.length, tone: board.portal.pestAlerts.length > 0 ? 'warn' : 'ok' },
        { label: 'Epidemic class', value: board.portal.pestAlerts.filter(p => p.outbreakStatus === 'epidemic').length, tone: 'alert' },
        { label: 'Affected area (ha)', value: board.portal.pestAlerts.reduce((s, p) => s + p.affectedAreaHa, 0).toLocaleString() },
        { label: 'Treatment teams', value: Math.round(wave(`pe:t:${board.epoch}`, ts, 6, 48)), tone: 'info' },
      ]} />
      <SeasonalRule label="active pest alerts" />
      {board.portal.pestAlerts.map(p => (
        <div key={p.id} className="grid grid-cols-[110px_160px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{p.id}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{p.pest}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{p.region}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{p.reportedHrsAgo}h ago</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: p.outbreakStatus === 'epidemic' ? AGRICULTURE_DS.chestnut : p.outbreakStatus === 'spreading' ? AGRICULTURE_DS.amber : p.outbreakStatus === 'localized' ? AGRICULTURE_DS.sky : AGRICULTURE_DS.harvest }}>● {p.outbreakStatus}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function DroughtResponse({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  const ts = now / 4000;
  void id;
  const droughts = board.portal.climateAdvisories.filter(a => a.kind === 'drought-watch' || a.kind === 'rainfall-deficit' || a.kind === 'heatwave');
  return (
    <SeasonalFrame archetype="response" code="RS-DRG-13" title="Drought Response"
      subtitle="drought relief & yield protection"
      season={board.season}>
      <SeasonalKpi items={[
        { label: 'Active advisories', value: droughts.length, tone: droughts.length > 0 ? 'warn' : 'ok' },
        { label: 'Severe severity', value: droughts.filter(a => a.severity === 'severe').length, tone: 'alert' },
        { label: 'Relief tankers deployed', value: Math.round(wave(`dr:t:${board.epoch}`, ts, 40, 480)), tone: 'info' },
        { label: 'Yield protected (Mt)', value: (wave(`dr:y:${board.epoch}`, ts, 0.1, 4.8)).toFixed(2), tone: 'ok' },
      ]} />
      <SeasonalRule label="drought advisories" />
      {droughts.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: AGRICULTURE_DS.mut }}>
          No active drought advisories. National posture: monitoring.
        </p>
      ) : droughts.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_160px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{a.id}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{a.kind}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{a.daysAhead}d ahead</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.severity === 'severe' ? AGRICULTURE_DS.chestnut : a.severity === 'warning' ? AGRICULTURE_DS.amber : AGRICULTURE_DS.harvest }}>● {a.severity}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function RuralZones({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="governance" code="GV-ZON-15" title="Rural Zones"
      subtitle="rural zone classification & stability"
      season={board.season}>
      <SeasonalKpi items={[
        { label: 'Zones tracked', value: board.rural.zones.length },
        { label: 'Distressed', value: board.rural.zones.filter(z => z.classification === 'distressed').length, tone: 'alert' },
        { label: 'Fragile', value: board.rural.zones.filter(z => z.classification === 'fragile').length, tone: 'warn' },
        { label: 'Continuity index', value: `${board.rural.ruralContinuityIdx}/100`, tone: 'ok' },
      ]} />
      <SeasonalRule label="zone posture" />
      {board.rural.zones.map(z => {
        const tone = z.classification === 'distressed' ? 'alert' : z.classification === 'fragile' ? 'alert' : z.classification === 'pressured' ? 'warn' : z.classification === 'thriving' ? 'ok' : 'info';
        return (
          <CropRow key={z.id} crop={`${z.region} · ${z.farmingHouseholdsK.toFixed(0)}k households`}
            idx={z.ruralStabilityIdx}
            tone={tone as 'ok' | 'warn' | 'alert' | 'info' | 'mute'}
            tail={`${z.cooperativesActive} co-ops`} />
        );
      })}
    </SeasonalFrame>
  );
}

export function CooperativeBoard({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <SeasonalFrame archetype="governance" code="GV-COP-16" title="Cooperative Board"
      subtitle="cooperatives & membership">
      <SeasonalKpi items={[
        { label: 'Cooperative members', value: `${board.rural.cooperativeMembershipMillions.toFixed(1)} M`, tone: 'ok' },
        { label: 'Cooperatives active', value: board.rural.zones.reduce((s, z) => s + z.cooperativesActive, 0), tone: 'info' },
        { label: 'New cooperatives (90d)', value: Math.round(wave(`co:n:${board.epoch}`, ts, 12, 240)) },
        { label: 'Cooperative grants (Bn)', value: (wave(`co:g:${board.epoch}`, ts, 0.4, 6.8)).toFixed(2) },
      ]} />
      <SeasonalCallout kicker="cooperative autonomy" body="Cooperatives are self-governing. The state may register and support them but cannot dissolve or restructure them without due process — denial of cooperative autonomy is constitutionally prohibited." />
    </SeasonalFrame>
  );
}

export function AgriculturalWorkforce({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="governance" code="GV-WRK-17" title="Agricultural Workforce"
      subtitle="demographics & extension training">
      <SeasonalKpi items={[
        { label: 'Workforce', value: `${board.rural.workforce.totalAgricultureWorkforceK.toFixed(0)} k`, tone: 'info' },
        { label: 'Women in agriculture', value: `${board.rural.workforce.womenInAgriculturePct}%`, tone: 'ok' },
        { label: 'Youth in agriculture', value: `${board.rural.workforce.youthInAgriculturePct}%`, tone: 'ok' },
        { label: 'Workforce shortages', value: `${board.rural.workforce.workforceShortagesIdx}/100`, tone: 'warn' },
      ]} />
      <SeasonalRule label="extension capacity" />
      <div className="text-[11px]" style={{ color: AGRICULTURE_DS.mut, fontFamily: 'ui-monospace, monospace' }}>
        Trained extension officers: <span style={{ color: AGRICULTURE_DS.wheat }}>{board.rural.workforce.trainedExtensionOfficersK.toFixed(1)}k</span>
        {' · '}Mean age: <span style={{ color: AGRICULTURE_DS.amber }}>{board.rural.workforce.meanAgeYears} yr</span>
      </div>
    </SeasonalFrame>
  );
}

export function LandRegistry({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="governance" code="GV-LND-18" title="Land Registry"
      subtitle="title issuance & cooperative trust">
      <SeasonalKpi items={[
        { label: 'Categories', value: board.rural.landRegistrations.length },
        { label: 'Pending', value: board.rural.landRegistrations.reduce((s, l) => s + l.pending, 0).toLocaleString(), tone: 'warn' },
        { label: 'Registered this Q', value: board.rural.landRegistrations.reduce((s, l) => s + l.registeredThisQ, 0).toLocaleString(), tone: 'ok' },
        { label: 'Disputes open', value: board.rural.landRegistrations.reduce((s, l) => s + l.disputesOpen, 0), tone: 'alert' },
      ]} />
      <SeasonalRule label="registration lanes" />
      {board.rural.landRegistrations.map(l => (
        <div key={l.category} className="grid grid-cols-[200px_1fr_80px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{l.category}</span>
          <div className="h-1.5 self-center" style={{ background: AGRICULTURE_DS.loamDeep }}>
            <div className="h-full" style={{ width: `${Math.min(100, l.registeredThisQ / 10)}%`, background: AGRICULTURE_DS.harvest }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{l.pending}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{l.registeredThisQ}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.chestnut }}>{l.disputesOpen}</span>
        </div>
      ))}
      <SeasonalCallout kicker="land-tenure rights" body="Forced land consolidation and unlawful titling are constitutionally void. Every dispute carries a customary-rights pathway alongside the formal court route." />
    </SeasonalFrame>
  );
}

export function SubsidyProgrammes({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="subsidy" code="SB-PRG-19" title="Subsidy Programmes"
      subtitle="programme catalogue & fulfilment">
      <SeasonalKpi items={[
        { label: 'Programmes', value: board.rural.subsidyProgrammes.length },
        { label: 'Beneficiaries (k)', value: board.rural.subsidyProgrammes.reduce((s, p) => s + p.beneficiariesK, 0).toFixed(0), tone: 'ok' },
        { label: 'Disbursed (Bn)', value: board.rural.subsidyProgrammes.reduce((s, p) => s + p.disbursedBn, 0).toFixed(1), tone: 'ok' },
        { label: 'Oversubscribed', value: board.rural.subsidyProgrammes.filter(p => p.status === 'oversubscribed').length, tone: 'warn' },
      ]} />
      <SeasonalRule label="programme docket" />
      {board.rural.subsidyProgrammes.map(p => (
        <div key={p.id} className="grid grid-cols-[110px_200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{p.id}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{p.programme}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{p.category}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{p.fulfilmentPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: p.status === 'oversubscribed' ? AGRICULTURE_DS.amber : p.status === 'closed' ? AGRICULTURE_DS.mut : p.status === 'review' ? AGRICULTURE_DS.sky : AGRICULTURE_DS.harvest }}>● {p.status}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

export function SubsidyApplications({ id, now }: { id: string; now: number }) {
  const board = agricultureRuralBoard(now);
  void id;
  return (
    <SeasonalFrame archetype="subsidy" code="SB-APP-20" title="Subsidy Applications"
      subtitle="application docket">
      <SeasonalKpi items={[
        { label: 'Active applications', value: board.portal.subsidyApplications.length },
        { label: 'Approved', value: board.portal.subsidyApplications.filter(s => s.status === 'approved').length, tone: 'ok' },
        { label: 'Disbursed', value: board.portal.subsidyApplications.filter(s => s.status === 'disbursed').length, tone: 'ok' },
        { label: 'Rejected', value: board.portal.subsidyApplications.filter(s => s.status === 'rejected').length, tone: 'warn' },
      ]} />
      <SeasonalRule label="application docket" />
      {board.portal.subsidyApplications.map(s => (
        <div key={s.id} className="grid grid-cols-[110px_180px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: AGRICULTURE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: AGRICULTURE_DS.wheat }}>{s.id}</span>
          <span style={{ color: AGRICULTURE_DS.ink }}>{s.category}</span>
          <span style={{ color: AGRICULTURE_DS.mut }}>{s.region}</span>
          <span className="text-right tabular-nums" style={{ color: AGRICULTURE_DS.mut }}>{s.daysOpen}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: s.status === 'disbursed' ? AGRICULTURE_DS.harvest : s.status === 'approved' ? AGRICULTURE_DS.sky : s.status === 'rejected' ? AGRICULTURE_DS.chestnut : AGRICULTURE_DS.amber }}>● {s.status}</span>
        </div>
      ))}
    </SeasonalFrame>
  );
}

void seed; void agricultureOps;
