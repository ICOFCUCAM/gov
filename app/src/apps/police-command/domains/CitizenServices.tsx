'use client';

// Police domain — Citizen Services. The public-facing police service desk:
// the live citizen request queue routed to police, and a two-sided
// citizen ↔ desk-officer encounter thread (the citizen is a first-class
// actor here, not a statistic).

import * as React from 'react';
import { citizenRequests } from '@/lib/gov/citizen-requests';
import { EncounterThread } from '@/apps/_shared/InstitutionChain';

const stageTone = (stage: string): string =>
  stage === 'resolved' ? 'rgb(var(--c-ok))'
    : stage === 'escalated' ? 'rgb(var(--c-alert))'
      : 'rgb(var(--c-warn))';

export function CitizenServices({ id, now, accent }: {
  id: string; now: number; accent: string;
}) {
  const ts = now / 4000;
  const st = citizenRequests(ts, 16);
  const mine = st.requests.filter(r => r.target === 'INTERIOR').slice(0, 8);
  const tiles = [
    { l: 'Open requests', v: `${st.open}` },
    { l: 'Resolved', v: `${st.resolved}` },
    { l: 'Escalated', v: `${st.escalated}` },
    { l: 'SLA met', v: `${st.slaMetPct}%` },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(t => (
          <div key={t.l} className="rounded-[3px] border border-line bg-surface p-2"
            style={{ borderColor: `color-mix(in srgb,${accent} 16%,rgb(var(--c-line)))` }}>
            <div className="text-[9px] uppercase tracking-[0.14em] text-ink-muted">{t.l}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{t.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[3px] border border-line bg-surface">
        <div className="border-b border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Citizen requests routed to police
        </div>
        {mine.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-ink-muted">No police-routed citizen requests in the active window.</p>
        ) : (
          <ul className="divide-y divide-line">
            {mine.map(r => (
              <li key={r.id} className="flex items-center gap-2 px-2 py-1 text-[11px]">
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">{r.id}</span>
                <span className="truncate text-ink">{r.category}</span>
                <span className="ml-auto shrink-0 rounded-[2px] px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: stageTone(r.stage) }}>
                  {r.stage}
                </span>
                <span className="shrink-0 text-[10px] text-ink-muted">{r.ageHrs}h / {r.slaHrs}h</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <EncounterThread
        scope={`${id}:citizen-services`}
        now={now}
        accent={accent}
        selfAuthor="OFFICIAL"
        officialName="Desk Officer"
        publicName="Citizen"
        title="Citizen ↔ police service encounter"
      />
    </div>
  );
}
