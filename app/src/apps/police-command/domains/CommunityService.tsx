'use client';

// Police domains — Community Service Tier.
// VictimSupport, DomesticIncidentResponse, YouthSafeguarding.

import * as React from 'react';
import { PoliceKpiStrip, PoliceRosterRow, PoliceCalloutNote, PoliceRule } from '@/apps/police-command/design-system/police-ds';
import { seed, wave } from '@/lib/telemetry';

export function VictimSupport({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const services = [
    { code: 'TRA', label: 'Trauma counselling referrals' },
    { code: 'INT', label: 'Interpreter & accessibility services' },
    { code: 'LGL', label: 'Legal-aid liaison' },
    { code: 'SAF', label: 'Safety planning & escort' },
    { code: 'HSE', label: 'Emergency housing referral' },
    { code: 'COM', label: 'Compensation-claim assistance' },
  ];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active victims supported', value: Math.round(wave(`vs:a:${id}`, ts, 480, 12000)).toLocaleString() },
        { label: 'Referrals (30d)', value: Math.round(wave(`vs:r:${id}`, ts, 240, 4800)).toLocaleString() },
        { label: 'Median first contact', value: `${Math.round(wave(`vs:f:${id}`, ts, 4, 38))}h`, tone: 'warn' },
        { label: 'Satisfaction (CSAT)', value: `${Math.round(wave(`vs:c:${id}`, ts, 78, 96))}%`, tone: 'ok' },
      ]} />
      <PoliceRule label="support pathway" />
      {services.map((s, i) => {
        const k = `vs:${id}:${i}`;
        const cases = Math.round(wave(`${k}:cs`, ts, 40, 2400));
        return (
          <PoliceRosterRow key={s.code} accent={accent}
            id={s.code} label={s.label}
            status={cases > 1000 ? 'high demand' : 'engaged'}
            tail={`${cases.toLocaleString()} / 30d`}
            tone={cases > 1000 ? 'warn' : undefined} />
        );
      })}
      <PoliceCalloutNote kicker="trauma-informed" body="All victim contact follows the trauma-informed-care protocol; identity is protected; the victim chooses the pace of any investigation step." />
    </div>
  );
}

export function DomesticIncidentResponse({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const incidents = Array.from({ length: 7 }, (_, i) => {
    const k = `di:${id}:${i}:${Math.floor(ts / 4)}`;
    const stages = ['called', 'on-scene', 'safety-plan', 'protective-order', 'follow-up', 'safeguarded'];
    return {
      id: `DI-${(50000 + Math.floor(seed(`${k}:c`) * 40000))}`,
      household: ['Adamu household', 'Petrov household', 'Mehta household', 'Oduya household', 'Tanaka household', 'Brennan household', 'Jiménez household'][i]!,
      risk: seed(`${k}:r`) > 0.7 ? 'high' : seed(`${k}:r`) > 0.35 ? 'moderate' : 'standard',
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      ageHrs: Math.round(wave(`${k}:a`, ts, 1, 240)),
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active incidents', value: incidents.length },
        { label: 'High-risk households', value: incidents.filter(i => i.risk === 'high').length, tone: 'alert' },
        { label: 'Protective orders (30d)', value: Math.round(wave(`di:po:${id}`, ts, 24, 240)) },
        { label: 'Repeat callouts', value: `${Math.round(wave(`di:rc:${id}`, ts, 14, 32))}%`, tone: 'warn' },
      ]} />
      <PoliceRule label="domestic incident register" />
      {incidents.map(i => (
        <PoliceRosterRow key={i.id} accent={accent}
          id={i.id} label={`${i.household} · ${i.risk} risk`}
          status={i.stage}
          tail={`${i.ageHrs}h ago`}
          tone={i.risk === 'high' ? 'alert' : i.risk === 'moderate' ? 'warn' : undefined} />
      ))}
      <PoliceCalloutNote kicker="safety doctrine" body="Domestic violence response is a sovereign priority. Officers must offer immediate safety planning and a protective-order pathway; refusal to do so triggers an Internal Affairs review." />
    </div>
  );
}

export function YouthSafeguarding({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const buckets = [
    { code: 'CAR', label: 'Children at risk (care orders)' },
    { code: 'TRU', label: 'Truancy / school disengagement' },
    { code: 'GNG', label: 'Gang-prevention liaison' },
    { code: 'EXP', label: 'Online exploitation reports' },
    { code: 'RUN', label: 'Runaway youth (recovered)' },
    { code: 'DIV', label: 'Diversion-from-charge programs' },
  ];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active safeguarding cases', value: Math.round(wave(`ys:a:${id}`, ts, 480, 8400)).toLocaleString() },
        { label: 'Diversion completions (YTD)', value: Math.round(wave(`ys:d:${id}`, ts, 240, 4800)).toLocaleString(), tone: 'ok' },
        { label: 'Online exploitation reports', value: Math.round(wave(`ys:o:${id}`, ts, 12, 240)), tone: 'alert' },
        { label: 'School liaison officers', value: Math.round(wave(`ys:s:${id}`, ts, 60, 240)) },
      ]} />
      <PoliceRule label="safeguarding lanes" />
      {buckets.map((b, i) => {
        const k = `ys:${id}:${i}`;
        const n = Math.round(wave(`${k}:n`, ts, 24, 1800));
        return (
          <PoliceRosterRow key={b.code} accent={accent}
            id={b.code} label={b.label}
            status={n > 800 ? 'high volume' : 'engaged'}
            tail={`${n.toLocaleString()} cases`}
            tone={n > 800 ? 'warn' : undefined} />
        );
      })}
      <PoliceCalloutNote kicker="child-first principle" body="Investigative steps involving minors require child-protection officer co-attendance and parental/guardian notification (except where notification endangers the child)." />
    </div>
  );
}
