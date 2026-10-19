'use client';

// The steps a site waits for and the record of one site, shared by the
// whole-government register and an institution's own Sites tab: publish (a
// different official from the one who proposed it), certify or reject the
// location at each stage the nation's policy asks for, confirm a move, and
// the site's detail — versions, certification stamps, identifiers — with
// move, status and withdraw. Every call goes to POST /api/facilities/{id};
// who may act is decided by the server, whose refusal is shown as it says it.

import * as React from 'react';
import { useOfficial } from '@/lib/official';
import { parseCoordinates } from './coords';
import {
  CERT_WORD, LEVEL_WORD, STAGE_WORD, STATE_WORD, STATUS_WORD, btn, callApi, input, label, nextStage, when,
  type CaptureMethod, type FacilityStatus, type Site, type Vocabulary,
} from './shared';

type Act = (site: Site, body: Record<string, unknown>, done: string) => Promise<boolean>;

/** Call an action on a site under the acting official's name; reports the server's words. */
export function useSiteAction(onDone: () => void | Promise<void>): { act: Act; busy: boolean; msg: { ok: boolean; text: string } | null; setMsg: (m: { ok: boolean; text: string } | null) => void } {
  const [official] = useOfficial();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const act: Act = async (site, body, done) => {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every step is recorded under a person.' }); return false; }
    setBusy(true); setMsg(null);
    try {
      await callApi(`/api/facilities/${encodeURIComponent(site.id)}`, { ...body, by: official });
      setMsg({ ok: true, text: `${site.name}: ${done}` });
      await onDone();
      return true;
    } catch (e) { setMsg({ ok: false, text: `${site.name}: ${(e as Error).message}` }); return false; }
    finally { setBusy(false); }
  };
  return { act, busy, msg, setMsg };
}

/** What waits for an official: sites to publish, locations to certify, moves to confirm. */
export function WaitingList({ sites, vocab, act, busy, ownerName }: { sites: Site[]; vocab: Vocabulary; act: Act; busy: boolean; ownerName: (id: string) => string }) {
  const toPublish = sites.filter(s => s.state === 'proposed');
  const toCertify = sites.filter(s => nextStage(s));
  const toMove = sites.filter(s => s.pendingVersion);
  const [rejecting, setRejecting] = React.useState<{ id: string; note: string } | null>(null);
  const glyph = (s: Site) => vocab.categories.find(c => c.key === s.category)?.glyph ?? '·';
  if (!toPublish.length && !toCertify.length && !toMove.length) return <p className="text-[13px] text-ink-muted">Nothing is waiting.</p>;
  const row = (k: string, s: Site, what: React.ReactNode, actions: React.ReactNode) => (
    <li key={`${s.id}-${k}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft py-2 text-[13px]">
      <span className="min-w-0">
        <span aria-hidden className="me-1.5">{glyph(s)}</span>
        <a href={`#site-${s.id}`} className="font-semibold text-link underline-offset-2 hover:underline">{s.name}</a>
        <span className="text-ink-muted"> · {ownerName(s.ownerId)} · {what}</span>
      </span>
      <span className="flex flex-wrap gap-1.5">{actions}</span>
    </li>
  );
  return (
    <ul className="space-y-0">
      {toPublish.map(s => row('publish', s, `proposed by ${s.proposedBy || 'an official'} ${when(s.proposedAt)}`,
        <button className={btn} disabled={busy} onClick={() => void act(s, { action: 'publish' }, 'published')}>Publish</button>))}
      {toCertify.map(s => {
        const stage = nextStage(s)!;
        return row('certify', s, `location to certify by ${STAGE_WORD[stage]}`, rejecting?.id === s.id ? (
          <form className="flex flex-wrap items-center gap-1.5" onSubmit={async e => { e.preventDefault(); if (await act(s, { action: 'certify', stage, decision: 'rejected', note: rejecting.note }, 'location rejected')) setRejecting(null); }}>
            <label className="sr-only" htmlFor={`rej-${s.id}`}>Why the location is rejected</label>
            <input id={`rej-${s.id}`} className={`${input} w-56 py-1.5`} value={rejecting.note} onChange={e => setRejecting({ id: s.id, note: e.currentTarget.value })} placeholder="Why the location is wrong" required />
            <button className={btn} disabled={busy || !rejecting.note.trim()}>Reject</button>
            <button type="button" className={btn} onClick={() => setRejecting(null)}>Cancel</button>
          </form>
        ) : (
          <>
            <button className={btn} disabled={busy} onClick={() => void act(s, { action: 'certify', stage, decision: 'certified' }, `location certified by ${STAGE_WORD[stage]}`)}>Certify</button>
            <button className={btn} disabled={busy} onClick={() => setRejecting({ id: s.id, note: '' })}>Reject…</button>
          </>
        ));
      })}
      {toMove.map(s => row('move', s, `move to ${s.pendingVersion!.location.lat}, ${s.pendingVersion!.location.lng} proposed by ${s.pendingVersion!.by}: ${s.pendingVersion!.reason ?? ''}`,
        <button className={btn} disabled={busy} onClick={() => void act(s, { action: 'confirm-move' }, 'move confirmed; the location is certified again')}>Confirm the move</button>))}
    </ul>
  );
}

/** One site's record: identifiers, stamps, versions, and move / status / withdraw. */
export function SiteDetail({ site, vocab, act, busy, ownerName, onClose }: { site: Site; vocab: Vocabulary; act: Act; busy: boolean; ownerName: (id: string) => string; onClose?: () => void }) {
  const cat = vocab.categories.find(c => c.key === site.category);
  const methods = vocab.policy.methods.filter(m => !['system-feed', 'open-data', 'survey-import'].includes(m));
  const [move, setMove] = React.useState({ pos: '', method: (methods.includes('typed') ? 'typed' : methods[0] ?? 'typed') as CaptureMethod, accuracy: '', reason: '' });
  const [withdrawReason, setWithdrawReason] = React.useState('');
  const parsed = move.pos.trim() ? parseCoordinates(move.pos) : null;
  const methodLabel = (k: CaptureMethod) => vocab.methods.find(m => m.key === k)?.label ?? k;
  return (
    <section id={`detail-${site.id}`} aria-label={`Site ${site.name}`} className="space-y-3 rounded-[3px] border border-line bg-surface p-4 text-[13px]">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-[16px] font-semibold text-ink"><span aria-hidden className="me-1.5">{cat?.glyph}</span>{site.name}{site.localName ? <span className="font-normal text-ink-soft"> · {site.localName}</span> : null}</h4>
          <p className="text-ink-soft">{cat?.label} · {ownerName(site.ownerId)}{site.operator ? ` · run by ${site.operator}` : ''} · {STATUS_WORD[site.status]} · {STATE_WORD[site.state]} · <span className="font-mono">{site.id}</span></p>
        </div>
        {onClose ? <button type="button" className={btn} onClick={onClose}>Close</button> : null}
      </header>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr]">
        <dt className="text-ink-muted">Position</dt>
        <dd className="font-mono">{site.location.lat}, {site.location.lng}{site.generalised ? <span className="ms-2 font-sans text-warn">position generalised (restricted site)</span> : null}</dd>
        <dt className="text-ink-muted">Where</dt><dd>{site.place.region ?? 'Outside the drawn boundary'}{site.place.district ? `, ${site.place.district}` : ''}</dd>
        <dt className="text-ink-muted">How captured</dt>
        <dd>{methodLabel(site.location.method)}{site.location.accuracyM ? ` · within ${site.location.accuracyM} m` : ''}{site.location.capturedBy ? ` · by ${site.location.capturedBy}` : ''}{site.location.capturedAt ? ` · ${when(site.location.capturedAt)}` : ''}{site.location.original ? ` · given as “${site.location.original}”` : ''}</dd>
        <dt className="text-ink-muted">Sensitivity</dt><dd>{LEVEL_WORD[site.sensitivity]}</dd>
        <dt className="text-ink-muted">National facility ID</dt>
        <dd>{site.ids.national ? <span className="font-mono">{site.ids.national}</span> : <span className="text-ink-muted">Given when the site is published</span>}</dd>
        <dt className="text-ink-muted">Identifiers</dt>
        <dd>{Object.keys(site.ids).some(k => k !== 'national') ? Object.entries(site.ids).filter(([k]) => k !== 'national').map(([k, v]) => <span key={k} className="me-3">{k}: <span className="font-mono">{v}</span></span>) : <span className="text-ink-muted">None recorded{site.generalised ? ' (hidden for restricted sites)' : ''}</span>}</dd>
        <dt className="text-ink-muted">Source</dt><dd>{site.source.kind === 'form' ? 'Recorded on the form' : site.source.kind === 'field' ? 'Captured in the field' : site.source.kind === 'import' ? `Loaded from a file${site.source.sha256 ? ` (fingerprint ${site.source.sha256.slice(0, 12)}…)` : ''}` : 'Connected system'}</dd>
        {site.note ? <><dt className="text-ink-muted">Note</dt><dd>{site.note}</dd></> : null}
        <dt className="text-ink-muted">Location certification</dt>
        <dd>
          {CERT_WORD[site.certification.state]}{site.state === 'proposed' ? ' (after publishing)' : ''} · asked of {site.certification.required.map(s => STAGE_WORD[s]).join(', then ')}
          {site.certification.stamps.length ? (
            <ul className="mt-1 space-y-0.5">
              {site.certification.stamps.map((st, i) => (
                <li key={i} className={st.decision === 'certified' ? 'text-ok' : 'text-alert'}>
                  {st.decision === 'certified' ? 'Certified' : 'Rejected'} for {STAGE_WORD[st.stage]} by {st.by}, {when(st.at)}{st.note ? `: ${st.note}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </dd>
      </dl>

      {site.versions.length ? (
        <div>
          <h5 className="mb-1 text-[13px] font-semibold text-ink">Versions</h5>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">#</th><th className="text-start font-semibold">What</th><th className="text-start font-semibold">Who</th><th className="text-start font-semibold">When</th><th className="text-start font-semibold">Position</th></tr></thead>
            <tbody>
              {site.versions.slice().reverse().map(v => (
                <tr key={v.n} className="border-b border-line-soft">
                  <td className="py-1 font-mono">{v.n}</td><td>{v.what}</td><td>{v.by}</td><td>{when(v.at)}</td><td className="font-mono">{v.location.lat}, {v.location.lng}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-ink-muted">Versions are shown to officials of the institution and the whole government.</p>}

      {site.state !== 'withdrawn' && !site.generalised ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <form className="space-y-2 rounded-[3px] border border-line-soft p-3" onSubmit={async e => {
            e.preventDefault();
            if (!parsed || 'error' in parsed) return;
            const acc = Number(move.accuracy);
            if (await act(site, { action: 'move', lng: parsed.lng, lat: parsed.lat, method: move.method, accuracyM: Number.isFinite(acc) && acc > 0 ? acc : undefined, reason: move.reason }, 'move proposed; a different official confirms it')) setMove({ ...move, pos: '', reason: '', accuracy: '' });
          }}>
            <h5 className="font-semibold text-ink">Move the site</h5>
            {site.pendingVersion ? <p className="text-warn">A move is already waiting to be confirmed.</p> : null}
            <label className={label}>New position (decimal or degrees, minutes, seconds)
              <input className={`${input} mt-1 font-mono`} value={move.pos} onChange={e => setMove({ ...move, pos: e.currentTarget.value })} placeholder="-1.28638, 36.81724" />
            </label>
            {parsed && 'error' in parsed ? <p className="text-alert">{parsed.error}</p> : parsed ? <p className="text-ink-muted">Read as {parsed.lat}, {parsed.lng}</p> : null}
            <label className={label}>How it was found
              <select className={`${input} mt-1`} value={move.method} onChange={e => setMove({ ...move, method: e.currentTarget.value as CaptureMethod })}>
                {methods.map(m => <option key={m} value={m}>{methodLabel(m)}</option>)}
              </select>
            </label>
            <label className={label}>Accuracy in metres (optional)
              <input className={`${input} mt-1`} value={move.accuracy} onChange={e => setMove({ ...move, accuracy: e.currentTarget.value })} inputMode="decimal" />
            </label>
            <label className={label}>Why it moves
              <input className={`${input} mt-1`} value={move.reason} onChange={e => setMove({ ...move, reason: e.currentTarget.value })} required maxLength={300} />
            </label>
            <button className={btn} disabled={busy || !parsed || 'error' in parsed || !move.reason.trim()}>Propose the move</button>
          </form>

          <div className="space-y-2 rounded-[3px] border border-line-soft p-3">
            <h5 className="font-semibold text-ink">Status</h5>
            <label className={label}>The site is now
              <select className={`${input} mt-1`} value={site.status} disabled={busy}
                onChange={e => { const v = e.currentTarget.value as FacilityStatus; void act(site, { action: 'status', status: v }, `status now ${STATUS_WORD[v].toLowerCase()}`); }}>
                {vocab.statuses.map(s => <option key={s} value={s}>{STATUS_WORD[s]}</option>)}
              </select>
            </label>
            <p className="text-[12px] text-ink-muted">Each change is kept as a new version.</p>
          </div>

          <form className="space-y-2 rounded-[3px] border border-line-soft p-3" onSubmit={async e => {
            e.preventDefault();
            if (!window.confirm(`Withdraw ${site.name} from the register? It stays in the record with all its versions.`)) return;
            if (await act(site, { action: 'withdraw', reason: withdrawReason }, 'withdrawn')) setWithdrawReason('');
          }}>
            <h5 className="font-semibold text-ink">Withdraw</h5>
            <p className="text-[12px] text-ink-muted">For a site recorded in error or that never existed. Nothing is deleted.</p>
            <label className={label}>Reason
              <input className={`${input} mt-1`} value={withdrawReason} onChange={e => setWithdrawReason(e.currentTarget.value)} maxLength={200} />
            </label>
            <button className={btn} disabled={busy}>Withdraw the site</button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
