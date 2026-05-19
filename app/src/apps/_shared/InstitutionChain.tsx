'use client';

// Shared bureaucratic-chain UI: the actor→facility→ministry→national
// lineage and a live inter-tier dispatch channel. Used by every ministry
// surface so public actors visibly serve the state THROUGH institutions,
// not as standalone dashboards.

import * as React from 'react';
import {
  chainDef, MINISTRY_CHAIN, type Facility, type RecordLineage, type ChainIntegrity,
} from '@/lib/gov/institution-chain';
import {
  channel, send, digest, subscribe, version,
  type Dispatch, type DispatchTier,
} from '@/lib/gov/dispatch-store';
import {
  facilities as facilitiesOf, actors as actorsOf, chainIntegrity as integrityOf,
  recordLineage,
} from '@/lib/gov/institution-chain';
import {
  enrollments, enroll, advanceEnrollment, enrollmentTally,
  subscribe as enSub, version as enVer,
} from '@/lib/gov/enrollment-store';
import {
  thread as encThread, post as encPost, encounterDigest,
  subscribe as encSub, version as encVer,
  type EncounterAuthor, type EncounterKind,
} from '@/lib/gov/encounter-store';
import {
  records as recordsOf, fileRecord, advanceRecord, returnRecord, nationalRecords, STAGE_ORDER,
  subscribe as recSub, version as recVer,
} from '@/lib/gov/records-store';
import {
  inbox as refInbox, raiseReferral, advanceReferral, referralDigest, REFERRAL_FLOW,
  subscribe as refSub, version as refVer,
} from '@/lib/gov/referral-store';
import { pickIndex } from '@/lib/pick-index';

const TIER_C: Record<string, string> = {
  ACTOR: 'rgb(var(--c-link))', FACILITY: 'rgb(var(--c-ok))',
  MINISTRY: 'rgb(var(--c-warn))', NATIONAL: 'rgb(var(--c-alert))',
};

// HH:MM for same-day messages, DD/MM HH:MM otherwise — so expanded
// multi-day threads aren't ambiguous.
export function clockLabel(at: number, now: number): string {
  const d = new Date(at);
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const sameDay = new Date(now).toDateString() === d.toDateString();
  return sameDay ? hm : `${d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} ${hm}`;
}

// Derive the actor→facility→ministry→national bundle for a surface so
// every actor-facing app shows the same strip without repeating the
// facility-pick + lineage + integrity wiring. Pure (no hooks).
export function actorChain(ministryKey: string, key: string, now: number, recordPrefix = 'REC') {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const facs = facilitiesOf(ministryKey, epoch);
  const facility = facs[pickIndex(key, facs.length, 7)] ?? facs[0]!;
  const d = chainDef(ministryKey);
  const actorName = actorsOf(ministryKey, facility.id, epoch)[0]?.name ?? `${d.actorRole}`;
  const lineage = recordLineage(`${recordPrefix}-${key}`, actorName, facility, ministryKey, epoch);
  const integrity = integrityOf(ministryKey, epoch);
  return { facility, actorName, lineage, integrity };
}

export function InstitutionChainStrip({
  accent, ministryKey, facility, actorName, lineage, integrity,
}: {
  accent: string; ministryKey: string; facility: Facility;
  actorName: string; lineage: RecordLineage; integrity: ChainIntegrity;
}) {
  const d = chainDef(ministryKey);
  const iTone = integrity.status === 'synchronised' ? 'ok' : integrity.status === 'lagging' ? 'warn' : 'alert';
  return (
    <div className="rounded-[4px] border px-3 py-2.5 text-[10px]"
      style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: `linear-gradient(100deg,#0a0f18,color-mix(in srgb,${accent} 6%,#0a0f18))` }}>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted">Institutional chain</span>
        <span className="text-ink-soft">{actorName} · <span style={{ color: accent }}>{d.actorRole}</span></span>
        <span className="text-ink-muted">enrolled at</span>
        <span className="font-medium text-ink">{facility.name} ({facility.id})</span>
        <span className="text-ink-muted">· {facility.region}</span>
        <span className="ml-auto rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider"
          style={{ background: `color-mix(in srgb,rgb(var(--c-${iTone})) 18%,transparent)`, color: `rgb(var(--c-${iTone}))` }}>
          UPLINK {integrity.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {lineage.stages.map((s, i) => (
          <React.Fragment key={i}>
            <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5"
              style={{ background: s.done ? `color-mix(in srgb,${TIER_C[s.tier]} 14%,transparent)` : 'rgba(255,255,255,0.03)', color: s.done ? TIER_C[s.tier] : 'rgb(var(--c-ink-muted))' }}>
              <span>{s.done ? '▣' : '▢'}</span>{s.label}
            </span>
            {i < lineage.stages.length - 1 ? <span className="text-ink-muted">→</span> : null}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[9px] text-ink-muted">
        <span>{d.ministry} · {integrity.facilities} facilities</span>
        <span>mean sync <span style={{ color: `rgb(var(--c-${iTone}))` }}>{integrity.meanSyncPct}%</span></span>
        <span>uplink {integrity.uplinkLatencyMin}m · national lag {integrity.nationalLagMin}m</span>
        {integrity.unsynced ? <span style={{ color: 'rgb(var(--c-alert))' }}>{integrity.unsynced} facility unsynced</span> : <span style={{ color: 'rgb(var(--c-ok))' }}>all facilities synced</span>}
      </div>
    </div>
  );
}

// Drop-in actor→facility strip: resolves the chain bundle and renders it,
// so apps don't repeat the actorChain()+InstitutionChainStrip IIFE.
export function ActorChainStrip({ ministryKey, idKey, now, accent, recordPrefix = 'REC' }: {
  ministryKey: string; idKey: string; now: number; accent: string; recordPrefix?: string;
}) {
  const ch = actorChain(ministryKey, idKey, now, recordPrefix);
  return (
    <InstitutionChainStrip accent={accent} ministryKey={ministryKey} facility={ch.facility}
      actorName={ch.actorName} lineage={ch.lineage} integrity={ch.integrity} />
  );
}

const P_TONE: Record<string, string> = { routine: 'rgb(var(--c-ink-muted))', priority: 'rgb(var(--c-warn))', urgent: 'rgb(var(--c-alert))' };

export function DispatchChannel({
  scope, now, accent, selfTier, selfName, toTier, title,
}: {
  scope: string; now: number; accent: string;
  selfTier: DispatchTier; selfName: string; toTier: DispatchTier; title: string;
}) {
  const v = React.useSyncExternalStore(subscribe, version, () => 0);
  const [draft, setDraft] = React.useState('');
  const [prio, setPrio] = React.useState<Dispatch['priority']>('routine');
  const full = React.useMemo(() => channel(scope, now), [scope, now, v]);
  const [showAll, setShowAll] = React.useState(false);
  const list = showAll ? full : full.slice(-7);
  const liveCount = full.reduce((n, m) => n + (m.seeded ? 0 : 1), 0);
  const submit = () => {
    const b = draft.trim();
    if (!b) return;
    send(scope, { fromTier: selfTier, from: selfName, toTier, body: b, priority: prio }, now);
    setDraft('');
  };
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#0a0f18' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{title}</span>
        <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-wider text-ink-muted">
          {selfTier} ↔ {toTier}
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} />
          {liveCount ? <span style={{ color: accent }}>{liveCount} sent</span> : 'live'}
        </span>
      </div>
      <div className="max-h-[168px] space-y-1 overflow-y-auto px-3 py-2" aria-live="polite" aria-relevant="additions">
        {full.length > 7 ? (
          <button type="button" onClick={() => setShowAll(s => !s)}
            className="focus-ring w-full text-center text-[8px] uppercase tracking-wider text-ink-muted hover:text-ink-soft">
            {showAll ? 'show recent only' : `show full thread (${full.length})`}
          </button>
        ) : null}
        {list.map(m => (
          <div key={m.id} className="text-[10px]">
            <span className="font-mono text-[8px] text-ink-muted">{clockLabel(m.at, now)}</span>{' '}
            <span style={{ color: TIER_C[m.fromTier] }}>{m.from}</span>
            <span className="text-ink-muted"> → {m.toTier.toLowerCase()}</span>
            {m.priority !== 'routine' ? <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: P_TONE[m.priority] }}>· {m.priority}</span> : null}
            <div className="text-ink-soft">{m.body}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <select value={prio} onChange={e => setPrio(e.target.value as Dispatch['priority'])}
          aria-label="Dispatch priority"
          className="focus-ring rounded-[3px] border bg-surface px-1 py-1 text-[9px] uppercase tracking-wider text-ink-soft"
          style={{ borderColor: 'rgb(var(--c-line))' }}>
          <option value="routine">routine</option><option value="priority">priority</option><option value="urgent">urgent</option>
        </select>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          aria-label={`Dispatch message to ${toTier.toLowerCase()}`}
          placeholder={`Dispatch to ${toTier.toLowerCase()}…`}
          className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink"
          style={{ borderColor: 'rgb(var(--c-line))' }} />
        <button type="button" onClick={submit}
          className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{ borderColor: accent, color: accent }}>Send</button>
      </div>
    </div>
  );
}

const K_TONE: Record<string, string> = {
  note: 'rgb(var(--c-ink-muted))', question: 'rgb(var(--c-link))',
  instruction: 'rgb(var(--c-warn))', result: 'rgb(var(--c-ok))',
};

// Live two-way service encounter between a PUBLIC actor and the OFFICIAL
// serving them THROUGH a facility (clinician↔patient, officer↔citizen).
// The operator posts as `selfAuthor`; turns persist across navigation.
export function EncounterThread({
  scope, now, accent, selfAuthor, officialName, publicName, title,
}: {
  scope: string; now: number; accent: string;
  selfAuthor: EncounterAuthor; officialName: string; publicName: string; title: string;
}) {
  const v = React.useSyncExternalStore(encSub, encVer, () => 0);
  const [draft, setDraft] = React.useState('');
  const [kind, setKind] = React.useState<EncounterKind>(selfAuthor === 'OFFICIAL' ? 'instruction' : 'question');
  const full = React.useMemo(() => encThread(scope, officialName, publicName, now), [scope, officialName, publicName, now, v]);
  const [showAll, setShowAll] = React.useState(false);
  const list = showAll ? full : full.slice(-7);
  const liveCount = full.reduce((n, m) => n + (m.seeded ? 0 : 1), 0);
  const submit = () => {
    const b = draft.trim();
    if (!b) return;
    encPost(scope, { author: selfAuthor, name: selfAuthor === 'OFFICIAL' ? officialName : publicName, kind, body: b }, now);
    setDraft('');
  };
  const kinds: EncounterKind[] = selfAuthor === 'OFFICIAL' ? ['instruction', 'result', 'note'] : ['question', 'note'];
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#0a0f18' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{title}</span>
        <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-wider text-ink-muted">
          {officialName} ↔ {publicName}
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} />
          {liveCount ? <span style={{ color: accent }}>{liveCount} sent</span> : 'live'}
        </span>
      </div>
      <div className="max-h-[168px] space-y-1.5 overflow-y-auto px-3 py-2" aria-live="polite" aria-relevant="additions">
        {full.length > 7 ? (
          <button type="button" onClick={() => setShowAll(s => !s)}
            className="focus-ring w-full text-center text-[8px] uppercase tracking-wider text-ink-muted hover:text-ink-soft">
            {showAll ? 'show recent only' : `show full thread (${full.length})`}
          </button>
        ) : null}
        {list.map(m => {
          const mine = m.author === selfAuthor;
          return (
            <div key={m.id} className={`text-[10px] ${mine ? 'pl-6 text-right' : 'pr-6'}`}>
              <span className="font-mono text-[8px] text-ink-muted">{clockLabel(m.at, now)}</span>{' '}
              <span style={{ color: m.author === 'OFFICIAL' ? accent : 'rgb(var(--c-link))' }}>{m.name}</span>
              <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: K_TONE[m.kind] }}>· {m.kind}</span>
              <div className="text-ink-soft">{m.body}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <select value={kind} onChange={e => setKind(e.target.value as EncounterKind)}
          aria-label="Message kind"
          className="focus-ring rounded-[3px] border bg-surface px-1 py-1 text-[9px] uppercase tracking-wider text-ink-soft"
          style={{ borderColor: 'rgb(var(--c-line))' }}>
          {kinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          aria-label={selfAuthor === 'OFFICIAL' ? `Reply to ${publicName}` : `Message ${officialName}`}
          placeholder={selfAuthor === 'OFFICIAL' ? `Reply to ${publicName}…` : `Message ${officialName}…`}
          className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink"
          style={{ borderColor: 'rgb(var(--c-line))' }} />
        <button type="button" onClick={submit}
          className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{ borderColor: accent, color: accent }}>Send</button>
      </div>
    </div>
  );
}

// The national tier reading every ministry's roll-up at once — the apex of
// the chain, live. Drop into any national/cabinet surface.
export function NationalDispatchDigest({ accent = '#37c7d4', now }: { accent?: string; now: number }) {
  const v = React.useSyncExternalStore(subscribe, version, () => 0);
  const epoch = Math.max(0, Math.floor(now / 4000));
  const scopes = React.useMemo(() => Object.keys(MINISTRY_CHAIN).map(k => `natl:${k.toLowerCase()}`), []);
  // Heavy aggregation recomputes per epoch (≈4s), not per 1s tick; the
  // store data is epoch-stable so epoch-bucketed time is the honest dep.
  const feed = React.useMemo(() => digest(scopes, epoch * 4000, 10), [scopes, epoch, v]);
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>National coordination — live ministry roll-up</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{scopes.length} ministries · MINISTRY ↔ NATIONAL</span>
      </div>
      <div className="max-h-[200px] space-y-1 overflow-y-auto px-3 py-2">
        {feed.map(m => (
          <div key={m.id} className="text-[10px]">
            <span className="font-mono text-[8px] text-ink-muted">{clockLabel(m.at, now)}</span>{' '}
            <span style={{ color: TIER_C[m.fromTier] }}>{m.from}</span>
            <span className="text-ink-muted"> → {m.toTier.toLowerCase()}</span>
            {m.priority !== 'routine' ? <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: P_TONE[m.priority] }}>· {m.priority}</span> : null}
            <div className="text-ink-soft">{m.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The national records ledger — every record that has rolled to a ministry
// or synced nationally, across all ministries. Primes each ministry's lead
// facility register so the apex view is deterministic and never empty.
export function NationalRecordsLedger({ accent = '#37c7d4', now }: { accent?: string; now: number }) {
  const rv = React.useSyncExternalStore(recSub, recVer, () => 0);
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ledger = React.useMemo(() => {
    for (const k of Object.keys(MINISTRY_CHAIN)) {
      const fac = facilitiesOf(k, epoch);
      const d = chainDef(k);
      for (const f of fac.slice(0, 2)) recordsOf(k, f.id, d.recordNoun, epoch * 4000);
    }
    return nationalRecords(12);
  }, [epoch, rv]);
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>National records ledger — rolled & synced</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{ledger.filter(l => l.rec.stage === 'synced').length}/{ledger.length} synced · facility → ministry → national</span>
      </div>
      <div className="max-h-[200px] space-y-0.5 overflow-y-auto px-3 py-2">
        {ledger.map(({ rec, ministryKey }) => {
          const rt = rec.stage === 'synced' ? 'ok' : 'warn';
          return (
            <div key={rec.id} className="flex items-center gap-2 text-[9.5px]">
              <span className="shrink-0 font-mono text-[8px] text-ink-muted">{rec.ref}</span>
              <span className="shrink-0 text-[8px] text-ink-muted">{chainDef(ministryKey).ministry}</span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{rec.subject}</span>
              <span className="shrink-0 text-[7.5px] uppercase tracking-wider" style={{ color: `rgb(var(--c-${rt}))` }}>{rec.stage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The national view of public service load — recent citizen↔official turns
// across every ministry's lead service desks. Primes deterministically.
export function NationalEncounterDigest({ accent = '#37c7d4', now }: { accent?: string; now: number }) {
  const v = React.useSyncExternalStore(encSub, encVer, () => 0);
  const epoch = Math.max(0, Math.floor(now / 4000));
  const feed = React.useMemo(() => {
    const scopes: string[] = [];
    for (const k of Object.keys(MINISTRY_CHAIN)) {
      const fac = facilitiesOf(k, epoch);
      for (const f of fac.slice(0, 2)) scopes.push(`enc:${k.toLowerCase()}:${f.id}`);
    }
    return encounterDigest(scopes, 'Service desk', 'Citizen', epoch * 4000, 10);
  }, [epoch, v]);
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>National service load — citizen ↔ official, live</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">across ministry service desks</span>
      </div>
      <div className="max-h-[200px] space-y-1 overflow-y-auto px-3 py-2">
        {feed.map(({ msg: m }) => (
          <div key={m.id} className="text-[10px]">
            <span className="font-mono text-[8px] text-ink-muted">{clockLabel(m.at, now)}</span>{' '}
            <span style={{ color: m.author === 'OFFICIAL' ? accent : 'rgb(var(--c-link))' }}>{m.name}</span>
            <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: K_TONE[m.kind] }}>· {m.kind}</span>
            <div className="text-ink-soft">{m.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The national view of inter-ministry casework — every referral in flight
// across all ministry inboxes.
export function NationalReferralBoard({ accent = '#37c7d4', now }: { accent?: string; now: number }) {
  const v = React.useSyncExternalStore(refSub, refVer, () => 0);
  const epoch = Math.max(0, Math.floor(now / 4000));
  const keys = React.useMemo(() => Object.keys(MINISTRY_CHAIN), []);
  const feed = React.useMemo(() => referralDigest(keys, epoch * 4000, 12), [keys, epoch, v]);
  const stC = (s: string) => (s === 'closed' ? 'ok' : s === 'actioned' ? 'warn' : s === 'accepted' ? 'info' : 'alert');
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>Inter-ministry referrals — live casework</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{feed.filter(r => r.status !== 'closed').length} open · cross-ministry</span>
      </div>
      <div className="max-h-[200px] space-y-0.5 overflow-y-auto px-3 py-2">
        {feed.map(r => (
          <div key={r.id} className="flex items-center gap-2 text-[9.5px]">
            <span className="font-mono text-[8px] text-ink-muted">{clockLabel(r.at, now)}</span>
            <span className="shrink-0 text-[8px] text-ink-muted">{chainDef(r.fromKey).ministry} → {chainDef(r.toKey).ministry}</span>
            <span className="min-w-0 flex-1 truncate text-ink-soft">{r.subject}{r.recordRef ? <span className="ml-1 font-mono text-[7.5px] text-ink-muted">[{r.recordRef}]</span> : null}</span>
            <span className="shrink-0 text-[7.5px] uppercase tracking-wider" style={{ color: `rgb(var(--c-${stC(r.status)}))` }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// One-glance executive summary of every live bureaucratic flow.
export function NationalBureaucracyPulse({ accent = '#37c7d4', now }: { accent?: string; now: number }) {
  const dv = React.useSyncExternalStore(subscribe, version, () => 0);
  const ev = React.useSyncExternalStore(encSub, encVer, () => 0);
  const rev = React.useSyncExternalStore(refSub, refVer, () => 0);
  const nv = React.useSyncExternalStore(enSub, enVer, () => 0);
  const epoch = Math.max(0, Math.floor(now / 4000));
  const stats = React.useMemo(() => {
    const keys = Object.keys(MINISTRY_CHAIN);
    const dispScopes = keys.map(k => `natl:${k.toLowerCase()}`);
    const encScopes: string[] = [];
    const enrKeys: { ministryKey: string; facilityId: string; role: string }[] = [];
    for (const k of keys) for (const f of facilitiesOf(k, epoch).slice(0, 2)) {
      encScopes.push(`enc:${k.toLowerCase()}:${f.id}`);
      enrKeys.push({ ministryKey: k, facilityId: f.id, role: chainDef(k).actorRole });
    }
    const et = epoch * 4000;
    const disp = digest(dispScopes, et, 999).length;
    const recs = nationalRecords(999);
    const enc = encounterDigest(encScopes, 'Service desk', 'Citizen', et, 999).length;
    const refsAll = referralDigest(keys, et, 999);
    const enr = enrollmentTally(enrKeys, et);
    return {
      disp,
      recsSynced: recs.filter(r => r.rec.stage === 'synced').length,
      recsTotal: recs.length,
      enc,
      refOpen: refsAll.filter(r => r.status !== 'closed').length,
      refTotal: refsAll.length,
      enrPending: enr.pending,
      enrTotal: enr.total,
    };
  }, [epoch, dv, ev, rev, nv]);
  const cell = (l: string, v: string) => (
    <div className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
      <span className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">{l}</span>
      <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: accent }}>{v}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
      {cell('Dispatch roll-up', `${stats.disp}`)}
      {cell('Records → national', `${stats.recsSynced}/${stats.recsTotal} synced`)}
      {cell('Public service turns', `${stats.enc}`)}
      {cell('Referrals open', `${stats.refOpen}/${stats.refTotal}`)}
      {cell('Enrolments pending', `${stats.enrPending}/${stats.enrTotal}`)}
    </div>
  );
}

// One drop-in section giving any ministry surface its bureaucratic spine:
// facility network + chain integrity, an enrolment desk (actors register
// INTO a facility, session-persistent), and a facility↔ministry dispatch.
export function MinistryChainSection({
  ministryKey, id, now, accent = '#37c7d4',
}: {
  ministryKey: string; id: string; now: number; accent?: string;
}) {
  const ev = React.useSyncExternalStore(enSub, enVer, () => 0);
  const epoch = Math.max(0, Math.floor(now / 4000));
  const d = chainDef(ministryKey);
  const fac = facilitiesOf(ministryKey, epoch);
  const idx = pickIndex(id, fac.length);
  const [selFac, setSelFac] = React.useState<string | null>(null);
  const myFac = fac.find(f => f.id === selFac) ?? fac[idx] ?? fac[0]!;
  const integrity = integrityOf(ministryKey, epoch);
  const baseRoster = actorsOf(ministryKey, myFac.id, epoch);
  const enrolled = React.useMemo(() => enrollments(ministryKey, myFac.id, d.actorRole, now), [ministryKey, myFac.id, d.actorRole, now, ev]);
  const rv = React.useSyncExternalStore(recSub, recVer, () => 0);
  const filed = React.useMemo(() => recordsOf(ministryKey, myFac.id, d.recordNoun, now), [ministryKey, myFac.id, d.recordNoun, now, rv]);
  const [nm, setNm] = React.useState('');
  const [subj, setSubj] = React.useState('');
  const [byA, setByA] = React.useState('');
  const roster = React.useMemo(
    () => [...new Set([...baseRoster.map(a => a.name), ...enrolled.filter(e => e.status !== 'pending').map(e => e.name)])],
    [baseRoster, enrolled],
  );
  const filingActor = byA || roster[0] || d.actorRole;
  const refV = React.useSyncExternalStore(refSub, refVer, () => 0);
  const myInbox = React.useMemo(() => refInbox(ministryKey, now), [ministryKey, now, refV]);
  const peers = React.useMemo(() => Object.keys(MINISTRY_CHAIN).filter(k => k !== ministryKey), [ministryKey]);
  const [refTo, setRefTo] = React.useState('');
  const [refSubj, setRefSubj] = React.useState('');
  const refTarget = refTo || peers[0] || 'FINANCE';
  const refStC = (s: string) => (s === 'closed' ? 'ok' : s === 'actioned' ? 'warn' : s === 'accepted' ? 'info' : 'alert');
  const iTone = integrity.status === 'synchronised' ? 'ok' : integrity.status === 'lagging' ? 'warn' : 'alert';
  const stC = (s: string) => (s === 'active' || s === 'operational' ? 'ok' : s === 'verified' || s === 'strained' ? 'warn' : s === 'pending' ? 'info' : 'alert');
  // Collapse preference persists per ministry across navigation (SSR-safe).
  const prefKey = `civicos.chain.collapsed.${ministryKey}`;
  const [expanded, setExpanded] = React.useState(true);
  React.useEffect(() => {
    try { if (window.localStorage.getItem(prefKey) === '1') setExpanded(false); } catch { /* no continuity */ }
  }, [prefKey]);
  const toggleExpanded = () => setExpanded(e => {
    const next = !e;
    try { window.localStorage.setItem(prefKey, next ? '0' : '1'); } catch { /* no continuity */ }
    return next;
  });

  return (
    <div className="space-y-2">
      <button type="button" onClick={toggleExpanded} aria-expanded={expanded} aria-controls={`chain-${ministryKey}`}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} the ${d.ministry} institutional chain`}
        className="focus-ring flex w-full items-center justify-between rounded-[4px] border px-3 py-1.5"
        style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
          {d.ministry} · institutional chain
        </span>
        <span className="flex items-center gap-2 text-[8px] uppercase tracking-wider text-ink-muted">
          <span>{integrity.facilities} facilities · chain {integrity.status}</span>
          <span aria-hidden>{expanded ? '▾' : '▸'}</span>
        </span>
      </button>
      {expanded ? (
    <div id={`chain-${ministryKey}`} className="grid gap-2 lg:grid-cols-3">
      <div className="rounded-[4px] border lg:col-span-2" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
        <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{d.ministry} · facility network</span>
          <span className="rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider"
            style={{ background: `color-mix(in srgb,rgb(var(--c-${iTone})) 18%,transparent)`, color: `rgb(var(--c-${iTone}))` }}>
            CHAIN {integrity.status}
          </span>
        </div>
        <div className="grid gap-x-4 gap-y-1 px-3 py-2 text-[10px] sm:grid-cols-2">
          {fac.map(f => {
            const on = f.id === myFac.id;
            return (
              <button key={f.id} type="button" onClick={() => setSelFac(f.id)}
                aria-pressed={on} aria-label={`Select facility ${f.id} · ${f.name} (${f.region})`}
                className="focus-ring flex items-center gap-2 rounded-[3px] px-1.5 py-0.5 text-left transition-colors"
                style={{ background: on ? `color-mix(in srgb,${accent} 13%,transparent)` : 'transparent' }}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `rgb(var(--c-${stC(f.status)}))` }} />
                <span className="min-w-0 flex-1 truncate" style={{ color: on ? accent : 'rgb(var(--c-ink-soft))' }}>{f.id} · {f.name} <span className="text-ink-muted">· {f.region}</span></span>
                <span className="shrink-0 font-mono text-[8px] tabular-nums text-ink-muted">{f.staff} staff · sync {f.syncPct}%</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft px-3 py-1.5 text-[9px]">
          <span className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{myFac.name}</span>
          <span className="text-ink-muted">{myFac.region} · {myFac.tier}</span>
          <span className="text-ink-soft">load <span style={{ color: myFac.load >= 85 ? 'rgb(var(--c-alert))' : myFac.load >= 65 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{myFac.load}%</span></span>
          <span className="text-ink-soft">capacity {myFac.capacity.toLocaleString()}</span>
          <span className="text-ink-soft">staff {myFac.staff}</span>
          <span className="text-ink-soft">sync <span style={{ color: `rgb(var(--c-${iTone}))` }}>{myFac.syncPct}%</span></span>
          <span className="rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider" style={{ background: `color-mix(in srgb,rgb(var(--c-${stC(myFac.status)})) 18%,transparent)`, color: `rgb(var(--c-${stC(myFac.status)}))` }}>{myFac.status}</span>
          <span className="font-mono text-[8px] text-ink-muted">head {myFac.headId}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-t border-line-soft px-3 py-1.5 text-[9px] text-ink-muted">
          <span>Records: {d.recordNoun} held at facility → <span style={{ color: 'rgb(var(--c-warn))' }}>{d.ministry}</span> → National</span>
          <span>{myFac.id} register: <span style={{ color: 'rgb(var(--c-info))' }}>{filed.filter(r => r.stage !== 'synced').length} in transit</span> · <span style={{ color: 'rgb(var(--c-ok))' }}>{filed.filter(r => r.stage === 'synced').length} synced</span></span>
          <span>mean sync <span style={{ color: `rgb(var(--c-${iTone}))` }}>{integrity.meanSyncPct}%</span></span>
          <span>roll-up {integrity.uplinkLatencyMin}m · national lag {integrity.nationalLagMin}m</span>
        </div>
        {/* Enrolment desk — actors register INTO the facility */}
        <div className="border-t px-3 py-2" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-ink-muted">Enrolment desk · {myFac.id}</span>
            <span className="text-[8px] text-ink-muted">{baseRoster.length + enrolled.length} {d.actorRole.toLowerCase()}s on register</span>
          </div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <input value={nm} onChange={e => setNm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && nm.trim()) { enroll(ministryKey, myFac.id, nm, d.actorRole, 'Facility registrar', now); setNm(''); } }}
              aria-label={`Enrol ${d.actorRole.toLowerCase()} at ${myFac.id}`}
              placeholder={`Enrol ${d.actorRole.toLowerCase()} at ${myFac.id}…`}
              className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink" style={{ borderColor: 'rgb(var(--c-line))' }} />
            <button type="button" onClick={() => { if (nm.trim()) { enroll(ministryKey, myFac.id, nm, d.actorRole, 'Facility registrar', now); setNm(''); } }}
              className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: accent, color: accent }}>Enrol</button>
          </div>
          <div className="max-h-[120px] space-y-0.5 overflow-y-auto">
            {enrolled.slice(-6).reverse().map(e => (
              <div key={e.id} className="flex items-center gap-2 text-[9.5px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `rgb(var(--c-${stC(e.status)}))` }} />
                <span className="min-w-0 flex-1 truncate text-ink-soft">{e.name}</span>
                <span className="shrink-0 text-[7.5px] uppercase tracking-wider" style={{ color: `rgb(var(--c-${stC(e.status)}))` }}>{e.status}</span>
                {e.status !== 'active' ? (
                  <button type="button" onClick={() => advanceEnrollment(ministryKey, myFac.id, e.id, now)}
                    aria-label={`${e.status === 'pending' ? 'Verify' : 'Activate'} enrolment for ${e.name}`}
                    className="focus-ring shrink-0 rounded-[2px] border px-1 text-[7.5px] uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgb(var(--c-line))' }}>
                    {e.status === 'pending' ? 'verify' : 'activate'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        {/* Records desk — actor files at the facility, then walks it up */}
        <div className="border-t px-3 py-2" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-ink-muted">Records desk · {myFac.id}</span>
            <span className="text-[8px] text-ink-muted">{filed.length} {d.recordNoun}s · captured → held → committed → rolled → synced</span>
          </div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <select value={filingActor} onChange={e => setByA(e.target.value)}
              aria-label="Filing actor"
              className="focus-ring max-w-[110px] shrink-0 rounded-[3px] border bg-surface px-1 py-1 text-[9px] text-ink-soft" style={{ borderColor: 'rgb(var(--c-line))' }}>
              {roster.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input value={subj} onChange={e => setSubj(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && subj.trim()) { fileRecord(ministryKey, myFac.id, subj, filingActor, d.recordNoun, now); setSubj(''); } }}
              aria-label={`File a ${d.recordNoun} at ${myFac.id}`}
              placeholder={`File a ${d.recordNoun} at ${myFac.id}…`}
              className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink" style={{ borderColor: 'rgb(var(--c-line))' }} />
            <button type="button" onClick={() => { if (subj.trim()) { fileRecord(ministryKey, myFac.id, subj, filingActor, d.recordNoun, now); setSubj(''); } }}
              className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: accent, color: accent }}>File</button>
          </div>
          <div className="max-h-[132px] space-y-0.5 overflow-y-auto">
            {filed.slice(-6).reverse().map(r => {
              const at = STAGE_ORDER.indexOf(r.stage);
              const rt = r.stage === 'synced' ? 'ok' : r.stage === 'rolled' ? 'warn' : 'info';
              return (
                <div key={r.id} className="flex items-center gap-2 text-[9.5px]">
                  <span className="shrink-0 font-mono text-[8px] text-ink-muted">{r.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{r.subject} <span className="text-ink-muted">· {r.byActor}</span>{r.returns ? <span className="ml-1 text-[7.5px]" style={{ color: 'rgb(var(--c-alert))' }}>↩{r.returns}</span> : null}</span>
                  <span className="shrink-0 font-mono text-[7.5px] text-ink-muted">{at + 1}/5</span>
                  <span className="shrink-0 text-[7.5px] uppercase tracking-wider" style={{ color: `rgb(var(--c-${rt}))` }}>{r.stage}</span>
                  {r.stage !== 'synced' && at > 0 ? (
                    <button type="button" onClick={() => returnRecord(ministryKey, myFac.id, r.id, now)} title="Return for correction"
                      aria-label={`Return ${r.ref} for correction`}
                      className="focus-ring shrink-0 rounded-[2px] border px-1 text-[7.5px] uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgb(var(--c-line))' }}>
                      ↩
                    </button>
                  ) : null}
                  {r.stage !== 'synced' ? (
                    <button type="button" onClick={() => advanceRecord(ministryKey, myFac.id, r.id, now)}
                      aria-label={`Advance ${r.ref} to ${STAGE_ORDER[at + 1]}`}
                      className="focus-ring shrink-0 rounded-[2px] border px-1 text-[7.5px] uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgb(var(--c-line))' }}>
                      → {STAGE_ORDER[at + 1]}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {/* Cross-ministry referrals — bureaucracy spans ministries */}
        <div className="border-t px-3 py-2" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-ink-muted">Cross-ministry referrals</span>
            <span className="text-[8px] text-ink-muted">{myInbox.length} addressed to {d.ministry} · raised → accepted → actioned → closed</span>
          </div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[8px] uppercase tracking-wider text-ink-muted">to</span>
            <select value={refTarget} onChange={e => setRefTo(e.target.value)}
              aria-label="Refer to ministry"
              className="focus-ring max-w-[110px] shrink-0 rounded-[3px] border bg-surface px-1 py-1 text-[9px] text-ink-soft" style={{ borderColor: 'rgb(var(--c-line))' }}>
              {peers.map(k => <option key={k} value={k}>{chainDef(k).ministry}</option>)}
            </select>
            <input value={refSubj} onChange={e => setRefSubj(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && refSubj.trim()) { raiseReferral(ministryKey, refTarget, refSubj, `${d.ministry} liaison`, now, filed[filed.length - 1]?.ref); setRefSubj(''); } }}
              aria-label="Referral subject"
              placeholder="Refer a matter to another ministry…"
              className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink" style={{ borderColor: 'rgb(var(--c-line))' }} />
            <button type="button" onClick={() => { if (refSubj.trim()) { raiseReferral(ministryKey, refTarget, refSubj, `${d.ministry} liaison`, now, filed[filed.length - 1]?.ref); setRefSubj(''); } }}
              className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: accent, color: accent }}>Refer</button>
          </div>
          <div className="max-h-[120px] space-y-0.5 overflow-y-auto">
            {myInbox.slice(-6).reverse().map(r => {
              const fi = REFERRAL_FLOW.indexOf(r.status);
              return (
                <div key={r.id} className="flex items-center gap-2 text-[9.5px]">
                  <span className="shrink-0 text-[8px] text-ink-muted">{chainDef(r.fromKey).ministry} →</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{r.subject}{r.recordRef ? <span className="ml-1 font-mono text-[7.5px] text-ink-muted">[{r.recordRef}]</span> : null}</span>
                  <span className="shrink-0 text-[7.5px] uppercase tracking-wider" style={{ color: `rgb(var(--c-${refStC(r.status)}))` }}>{r.status}</span>
                  {r.status !== 'closed' ? (
                    <button type="button" onClick={() => advanceReferral(ministryKey, r.id, now)}
                      aria-label={`Advance referral to ${REFERRAL_FLOW[fi + 1]}`}
                      className="focus-ring shrink-0 rounded-[2px] border px-1 text-[7.5px] uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgb(var(--c-line))' }}>
                      → {REFERRAL_FLOW[fi + 1]}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <DispatchChannel scope={`${ministryKey.toLowerCase()}:${myFac.id}`} now={now} accent={accent}
          selfTier="FACILITY" selfName={`${myFac.id} desk`} toTier="MINISTRY"
          title={`Ministry uplink · ${myFac.id}`} />
        <DispatchChannel scope={`natl:${ministryKey.toLowerCase()}`} now={now} accent={accent}
          selfTier="MINISTRY" selfName={`${d.ministry} coordination`} toTier="NATIONAL"
          title="National coordination" />
        <EncounterThread scope={`enc:${ministryKey.toLowerCase()}:${myFac.id}`} now={now} accent={accent}
          selfAuthor="OFFICIAL" officialName={`${d.actorRole} · ${myFac.id}`} publicName="Citizen"
          title={`Citizen service desk · ${myFac.id}`} />
      </div>
    </div>
      ) : null}
    </div>
  );
}
