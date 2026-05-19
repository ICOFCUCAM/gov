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
} from '@/lib/gov/institution-chain';
import {
  enrollments, enroll, advanceEnrollment,
  subscribe as enSub, version as enVer,
} from '@/lib/gov/enrollment-store';
import {
  thread as encThread, post as encPost,
  subscribe as encSub, version as encVer,
  type EncounterAuthor, type EncounterKind,
} from '@/lib/gov/encounter-store';

const TIER_C: Record<string, string> = {
  ACTOR: 'rgb(var(--c-link))', FACILITY: 'rgb(var(--c-ok))',
  MINISTRY: 'rgb(var(--c-warn))', NATIONAL: 'rgb(var(--c-alert))',
};

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
  const list = React.useMemo(() => channel(scope, now).slice(-7), [scope, now, v]);
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
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{selfTier} ↔ {toTier} · live</span>
      </div>
      <div className="max-h-[168px] space-y-1 overflow-y-auto px-3 py-2">
        {list.map(m => (
          <div key={m.id} className="text-[10px]">
            <span className="font-mono text-[8px] text-ink-muted">{new Date(m.at).toLocaleTimeString('en-GB', { hour12: false })}</span>{' '}
            <span style={{ color: TIER_C[m.fromTier] }}>{m.from}</span>
            <span className="text-ink-muted"> → {m.toTier.toLowerCase()}</span>
            {m.priority !== 'routine' ? <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: P_TONE[m.priority] }}>· {m.priority}</span> : null}
            <div className="text-ink-soft">{m.body}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <select value={prio} onChange={e => setPrio(e.target.value as Dispatch['priority'])}
          className="focus-ring rounded-[3px] border bg-surface px-1 py-1 text-[9px] uppercase tracking-wider text-ink-soft"
          style={{ borderColor: 'rgb(var(--c-line))' }}>
          <option value="routine">routine</option><option value="priority">priority</option><option value="urgent">urgent</option>
        </select>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }}
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
  const list = React.useMemo(() => encThread(scope, officialName, publicName, now).slice(-7), [scope, officialName, publicName, now, v]);
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
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{officialName} ↔ {publicName} · live</span>
      </div>
      <div className="max-h-[168px] space-y-1.5 overflow-y-auto px-3 py-2">
        {list.map(m => {
          const mine = m.author === selfAuthor;
          return (
            <div key={m.id} className={`text-[10px] ${mine ? 'pl-6 text-right' : 'pr-6'}`}>
              <span className="font-mono text-[8px] text-ink-muted">{new Date(m.at).toLocaleTimeString('en-GB', { hour12: false })}</span>{' '}
              <span style={{ color: m.author === 'OFFICIAL' ? accent : 'rgb(var(--c-link))' }}>{m.name}</span>
              <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: K_TONE[m.kind] }}>· {m.kind}</span>
              <div className="text-ink-soft">{m.body}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <select value={kind} onChange={e => setKind(e.target.value as EncounterKind)}
          className="focus-ring rounded-[3px] border bg-surface px-1 py-1 text-[9px] uppercase tracking-wider text-ink-soft"
          style={{ borderColor: 'rgb(var(--c-line))' }}>
          {kinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }}
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
  const scopes = React.useMemo(() => Object.keys(MINISTRY_CHAIN).map(k => `natl:${k.toLowerCase()}`), []);
  const feed = React.useMemo(() => digest(scopes, now, 10), [scopes, now, v]);
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#080d13' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>National coordination — live ministry roll-up</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{scopes.length} ministries · MINISTRY ↔ NATIONAL</span>
      </div>
      <div className="max-h-[200px] space-y-1 overflow-y-auto px-3 py-2">
        {feed.map(m => (
          <div key={m.id} className="text-[10px]">
            <span className="font-mono text-[8px] text-ink-muted">{new Date(m.at).toLocaleTimeString('en-GB', { hour12: false })}</span>{' '}
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
  const idx = Math.abs([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 9)) % fac.length;
  const [selFac, setSelFac] = React.useState<string | null>(null);
  const myFac = fac.find(f => f.id === selFac) ?? fac[idx] ?? fac[0]!;
  const integrity = integrityOf(ministryKey, epoch);
  const baseRoster = actorsOf(ministryKey, myFac.id, epoch);
  const enrolled = React.useMemo(() => enrollments(ministryKey, myFac.id, d.actorRole, now), [ministryKey, myFac.id, d.actorRole, now, ev]);
  const [nm, setNm] = React.useState('');
  const iTone = integrity.status === 'synchronised' ? 'ok' : integrity.status === 'lagging' ? 'warn' : 'alert';
  const stC = (s: string) => (s === 'active' || s === 'operational' ? 'ok' : s === 'verified' || s === 'strained' ? 'warn' : s === 'pending' ? 'info' : 'alert');

  return (
    <div className="grid gap-2 lg:grid-cols-3">
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
                className="focus-ring flex items-center gap-2 rounded-[3px] px-1.5 py-0.5 text-left transition-colors"
                style={{ background: on ? `color-mix(in srgb,${accent} 13%,transparent)` : 'transparent' }}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `rgb(var(--c-${stC(f.status)}))` }} />
                <span className="min-w-0 flex-1 truncate" style={{ color: on ? accent : 'rgb(var(--c-ink-soft))' }}>{f.id} · {f.name} <span className="text-ink-muted">· {f.region}</span></span>
                <span className="shrink-0 font-mono text-[8px] tabular-nums text-ink-muted">{f.staff} staff · sync {f.syncPct}%</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-t border-line-soft px-3 py-1.5 text-[9px] text-ink-muted">
          <span>Records: {d.recordNoun} held at facility → <span style={{ color: 'rgb(var(--c-warn))' }}>{d.ministry}</span> → National</span>
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
                    className="focus-ring shrink-0 rounded-[2px] border px-1 text-[7.5px] uppercase tracking-wider text-ink-muted" style={{ borderColor: 'rgb(var(--c-line))' }}>
                    {e.status === 'pending' ? 'verify' : 'activate'}
                  </button>
                ) : null}
              </div>
            ))}
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
      </div>
    </div>
  );
}
