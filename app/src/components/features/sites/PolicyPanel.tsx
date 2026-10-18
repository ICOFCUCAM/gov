'use client';

// How the nation runs its register (its facility policy): who certifies a
// site's location, which institution is the national mapping agency, the
// ways of capturing a position it accepts, and for each kind of site how
// sensitive it is, which body decides that and under which law. An
// administrator proposes a change with a reason; a different administrator
// confirms it (two-person rule); the server's refusal is shown as it says it.
// API: /api/facilities/policy.

import * as React from 'react';
import { useOfficial, useSignIn } from '@/lib/official';
import {
  CERT_MODE_WORD, LEVEL_WORD, Msg, btn, callApi, input, label, when,
  type CaptureMethod, type FacilityPolicy, type Institution, type PolicyChange, type SensitivityAuthority, type SensitivityRule, type Vocabulary,
} from './shared';

const KM_PER_DEGREE = 111;

export function PolicyPanel({ vocab, institutions, onChanged }: { vocab: Vocabulary; institutions: Institution[]; onChanged: () => Promise<void> | void }) {
  const signedIn = useSignIn()?.official ?? null;
  const [official] = useOfficial();
  const [changes, setChanges] = React.useState<PolicyChange[]>([]);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const p = vocab.policy;
  const authorityLabel = (r: SensitivityRule) => (r.authority === 'other' ? r.body || 'Another body' : vocab.authorities.find(a => a.key === r.authority)?.label ?? r.authority) + (r.authority !== 'other' && r.body ? ` (${r.body})` : '');
  const instName = (id?: string) => (id ? institutions.find(m => m.id === id)?.name ?? id : '');
  // Only administrators of the whole government change the policy; the server decides, this only hides the form from others.
  const mayPropose = !signedIn || (signedIn.role === 'administrator' && !signedIn.institution);

  const load = React.useCallback(async () => {
    try { setChanges((await callApi<{ changes: PolicyChange[] }>('/api/facilities/policy')).changes); } catch { /* shown as empty */ }
  }, []);
  React.useEffect(() => { void load(); }, [load, p.version]);

  async function decide(c: PolicyChange, decision: 'confirm' | 'withdraw') {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await callApi(`/api/facilities/policy/${encodeURIComponent(c.id)}`, { decision, by: official });
      setMsg({ ok: true, text: decision === 'confirm' ? `Change ${c.id} confirmed: the policy is now in force.` : `Change ${c.id} withdrawn.` });
      await load(); await onChanged();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const pending = changes.filter(c => c.state === 'pending');
  const describe = (c: PolicyChange) => {
    const out: string[] = [];
    if (c.patch.certification) out.push(`certification: ${CERT_MODE_WORD[c.patch.certification].toLowerCase()}`);
    if ('mappingAgencyId' in c.patch) out.push(`mapping agency: ${instName(c.patch.mappingAgencyId) || 'none'}`);
    if (c.patch.methods) out.push(`ways accepted: ${c.patch.methods.map(m => vocab.methods.find(x => x.key === m)?.label ?? m).join(', ')}`);
    if (c.patch.sensitivity) out.push(`sensitivity set for ${Object.keys(c.patch.sensitivity).map(k => vocab.categories.find(x => x.key === k)?.label ?? k).join(', ') || 'no kind (all back to the suggestion)'}`);
    if (c.patch.generaliseDegrees) out.push(`restricted sites generalised to about ${Math.round(c.patch.generaliseDegrees * KM_PER_DEGREE)} km`);
    return out.join('; ');
  };

  return (
    <div className="space-y-4 text-[13px]">
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[max-content_1fr]">
        <dt className="text-ink-muted">Who certifies a location</dt><dd className="font-semibold text-ink">{CERT_MODE_WORD[p.certification]}</dd>
        <dt className="text-ink-muted">National mapping agency</dt><dd>{vocab.mappingAgency?.name ?? <span className="text-ink-muted">None named{p.certification === 'institution' ? '' : ' (needed)'}</span>}</dd>
        <dt className="text-ink-muted">Restricted sites shown to others</dt><dd>Generalised to a grid of about {Math.round(p.generaliseDegrees * KM_PER_DEGREE)} km</dd>
        <dt className="text-ink-muted">Policy version</dt><dd>{p.version}{p.decidedBy?.length ? ` · decided by ${p.decidedBy.join(' and ')}, ${when(p.decidedAt)}` : ' · the platform\'s starting policy'}</dd>
      </dl>

      <div>
        <h4 className="mb-1 font-semibold text-ink">Ways of capturing a position the nation accepts</h4>
        <ul className="grid gap-1 sm:grid-cols-2">
          {vocab.methods.map(m => {
            const on = p.methods.includes(m.key);
            return (
              <li key={m.key} className={on ? 'text-ink' : 'text-ink-muted'}>
                <span className="font-semibold">{on ? '✓' : '✗'} {m.label}</span>{on ? '' : ' (not accepted)'} — <span className="text-ink-soft">{m.how}</span> <span className="text-ink-muted">Typically within {m.typicalAccuracyM.toLocaleString()} m.</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-semibold text-ink">How sensitive each kind of site is</h4>
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Kind of site</th><th className="text-start font-semibold">Level</th><th className="text-start font-semibold">Decided by</th><th className="text-start font-semibold">Legal basis</th></tr></thead>
          <tbody>
            {vocab.categories.map(c => {
              const set = !!p.sensitivity[c.key];
              return (
                <tr key={c.key} className="border-b border-line-soft">
                  <td className="py-1"><span aria-hidden className="me-1.5">{c.glyph}</span>{c.label}</td>
                  <td className={c.rule.level === 'public' ? '' : c.rule.level === 'restricted' ? 'text-warn' : 'text-alert'}>{LEVEL_WORD[c.rule.level]}{set ? '' : <span className="text-ink-muted"> (platform suggestion)</span>}</td>
                  <td>{authorityLabel(c.rule)}</td>
                  <td className="text-ink-soft">{c.rule.legalBasis ?? <span className="text-ink-muted">Not cited yet</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Msg msg={msg} />

      <div>
        <h4 className="mb-1 font-semibold text-ink">Changes waiting for a second administrator</h4>
        {pending.length ? (
          <ul className="space-y-2">
            {pending.map(c => (
              <li key={c.id} className="rounded-[3px] border border-line-soft p-2">
                <p><span className="font-mono">{c.id}</span> · proposed by <strong>{c.proposedBy}</strong>, {when(c.proposedAt)} (against version {c.baseVersion})</p>
                <p className="text-ink-soft">{describe(c)}</p>
                <p className="text-ink-soft">Why: {c.reason}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button className={btn} disabled={busy} onClick={() => void decide(c, 'confirm')}>Confirm</button>
                  <button className={btn} disabled={busy} onClick={() => void decide(c, 'withdraw')}>Withdraw</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-ink-muted">None.</p>}
        {changes.some(c => c.state !== 'pending') ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-link">Earlier changes</summary>
            <ul className="mt-1 space-y-1">
              {changes.filter(c => c.state !== 'pending').map(c => (
                <li key={c.id} className="text-ink-soft"><span className="font-mono">{c.id}</span> {c.state} · proposed by {c.proposedBy}, {c.state} by {c.decidedBy} {when(c.decidedAt)} · {describe(c)} · {c.reason}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {mayPropose ? (
        editing ? <ProposeChange vocab={vocab} institutions={institutions} onCancel={() => setEditing(false)} onDone={async text => { setEditing(false); setMsg({ ok: true, text }); await load(); }} />
          : <button className={btn} onClick={() => setEditing(true)}>Propose a change to the policy</button>
      ) : <p className="text-ink-muted">Administrators of the whole government propose and confirm changes to this policy.</p>}
    </div>
  );
}

function ProposeChange({ vocab, institutions, onCancel, onDone }: { vocab: Vocabulary; institutions: Institution[]; onCancel: () => void; onDone: (text: string) => void }) {
  const [official] = useOfficial();
  const p = vocab.policy;
  const [mode, setMode] = React.useState(p.certification);
  const [agency, setAgency] = React.useState(p.mappingAgencyId ?? '');
  const [methods, setMethods] = React.useState<CaptureMethod[]>(p.methods);
  const [rules, setRules] = React.useState<Record<string, SensitivityRule>>(() => Object.fromEntries(vocab.categories.map(c => [c.key, { ...c.rule }])));
  const [touched, setTouched] = React.useState<Set<string>>(() => new Set(Object.keys(p.sensitivity)));
  const [km, setKm] = React.useState(String(Math.round(p.generaliseDegrees * KM_PER_DEGREE * 10) / 10));
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const setRule = (k: string, patch: Partial<SensitivityRule>) => { setRules({ ...rules, [k]: { ...rules[k]!, ...patch } }); setTouched(new Set([...touched, k])); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!official) { setErr('Sign in or name the acting official first.'); return; }
    const patch: Record<string, unknown> = {};
    if (mode !== p.certification) patch.certification = mode;
    if ((agency || undefined) !== p.mappingAgencyId) patch.mappingAgencyId = agency;
    if ([...methods].sort().join() !== [...p.methods].sort().join()) patch.methods = methods;
    const sens = Object.fromEntries([...touched].map(k => [k, rules[k]!]));
    if (JSON.stringify(sens) !== JSON.stringify(Object.fromEntries(Object.keys(sens).map(k => [k, p.sensitivity[k]]))) || Object.keys(sens).length !== Object.keys(p.sensitivity).length) patch.sensitivity = sens;
    const deg = Number(km) / KM_PER_DEGREE;
    if (Number.isFinite(deg) && Math.abs(deg - p.generaliseDegrees) > 1e-4) patch.generaliseDegrees = Math.round(deg * 10_000) / 10_000;
    setBusy(true); setErr('');
    try {
      const r = await callApi<{ change: PolicyChange }>('/api/facilities/policy', { patch, reason, by: official });
      onDone(`Change ${r.change.id} proposed. A different administrator confirms it before it applies.`);
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[3px] border border-line p-3">
      <h4 className="font-semibold text-ink">Propose a change</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>Who certifies a location
          <select className={`${input} mt-1`} value={mode} onChange={e => setMode(e.currentTarget.value as FacilityPolicy['certification'])}>
            {(Object.keys(CERT_MODE_WORD) as FacilityPolicy['certification'][]).map(k => <option key={k} value={k}>{CERT_MODE_WORD[k]}</option>)}
          </select>
        </label>
        <label className={label}>National mapping agency
          <select className={`${input} mt-1`} value={agency} onChange={e => setAgency(e.currentTarget.value)}>
            <option value="">None named</option>
            {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className={label}>Generalise restricted sites to a grid of (km, 1–50)
          <input className={`${input} mt-1`} value={km} onChange={e => setKm(e.currentTarget.value)} inputMode="decimal" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-ink">Ways of capturing a position accepted</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {vocab.methods.map(m => (
            <label key={m.key} className="flex items-start gap-2 text-ink">
              <input type="checkbox" className="mt-1" checked={methods.includes(m.key)} onChange={e => setMethods(e.currentTarget.checked ? [...methods, m.key] : methods.filter(x => x !== m.key))} />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-[13px] font-semibold text-ink">Sensitivity by kind of site</legend>
        <p className="mb-1 text-[12px] text-ink-muted">Restricted and confidential need the law or instrument they rest on. Confidential sites stay outside the civilian register.</p>
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Kind of site</th><th className="text-start font-semibold">Level</th><th className="text-start font-semibold">Decided by</th><th className="text-start font-semibold">Body&rsquo;s name</th><th className="text-start font-semibold">Legal basis</th></tr></thead>
          <tbody>
            {vocab.categories.map(c => {
              const r = rules[c.key]!;
              return (
                <tr key={c.key} className="border-b border-line-soft align-top">
                  <td className="py-1 pe-2">{c.glyph} {c.label}</td>
                  <td className="pe-2"><select aria-label={`Level for ${c.label}`} className={`${input} py-1`} value={r.level} onChange={e => setRule(c.key, { level: e.currentTarget.value as SensitivityRule['level'] })}>
                    {(['public', 'restricted', 'confidential'] as const).map(l => <option key={l} value={l}>{LEVEL_WORD[l]}</option>)}
                  </select></td>
                  <td className="pe-2"><select aria-label={`Who decides for ${c.label}`} className={`${input} py-1`} value={r.authority} onChange={e => setRule(c.key, { authority: e.currentTarget.value as SensitivityAuthority })}>
                    {vocab.authorities.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select></td>
                  <td className="pe-2"><input aria-label={`Body's name for ${c.label}`} className={`${input} py-1`} value={r.body ?? ''} onChange={e => setRule(c.key, { body: e.currentTarget.value })} placeholder={r.authority === 'other' ? 'Needed' : 'Optional'} /></td>
                  <td><input aria-label={`Legal basis for ${c.label}`} className={`${input} py-1`} value={r.legalBasis ?? ''} onChange={e => setRule(c.key, { legalBasis: e.currentTarget.value })} placeholder={r.level === 'public' ? 'Optional' : 'Needed'} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </fieldset>
      <label className={label}>Why the policy should change
        <textarea className={`${input} mt-1`} rows={2} value={reason} onChange={e => setReason(e.currentTarget.value)} required maxLength={400} />
      </label>
      {err ? <p role="alert" className="text-alert">{err}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className={`${btn} border-ink`} disabled={busy || !reason.trim()}>{busy ? 'Proposing…' : 'Propose the change'}</button>
        <button type="button" className={btn} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
