'use client';

// Seal keys (/gov/configuration/seal-keys): the register of the state's seal
// keys (lib/keys/seal-register.ts, /api/seal-keys). Shows the key the key
// provider presents now and whether it may seal, every key with its validity,
// legal basis and approvals, proposals waiting for approval, compromise
// reports and reviews, keys that sealed before the register existed, and the
// country's rules for who approves. The legal process behind each approval is
// the nation's; the platform records it.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Cite { title?: string; instrument: string; num?: string; eId: string }
interface Key {
  id: string; purpose: string; keyId: string; fingerprint: string; status: string; historic?: boolean; sample?: boolean;
  validFrom?: string; validUntil?: string; coversFrom?: string; basis: Cite[]; resolution?: Cite; reason?: string;
  proposed: { by: string; at: string }; approvals: { by: string; at: string }[];
  compromise?: { reportedAt: string; by: string; compromisedFrom: string; reason: string; confirmed?: { by: string; at: string }; withdrawn?: { by: string }; review?: { dueBy?: string; at?: string; by?: string; outcome?: string; note?: string } };
  history: { at: string; by: string; step: string; note?: string }[];
}
interface Data {
  keys: Key[]; mode: string; since: string | null;
  rules: { authority: string; approvers: number; legislatureResolution: boolean; reviewWithinDays: number; adopted: boolean; citations?: Cite[]; changes?: { pending?: { values: { authority: string; approvers: number; legislatureResolution: boolean; reviewWithinDays: number }; by: string; at: string } } };
  authority: { slot: string; label: string; id?: string; name?: string };
  presented: { keyId: string; fingerprint: string; state: string; id?: string; seals: boolean; source: string; development: boolean } | null;
  historicCandidates: { keyId: string; publicKeyPem: string; count: number; first: string; last: string }[];
  waiting: { what: string; by: string; at: string; overdue?: boolean }[];
}

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const cites = (c: Cite[]) => c.map(x => `${x.title ?? x.instrument} ${x.num ?? x.eId}`).join('; ');
const day = (s?: string) => (s ? s.slice(0, 16).replace('T', ' ') : '');
const STATUS: Record<string, string> = { proposed: 'Waiting for approval', approved: 'Approved, not yet in use', active: 'In use', retired: 'Retired (verifies what it sealed)', revoked: 'Revoked', withdrawn: 'Withdrawn', unregistered: 'Not in the register', 'compromise-reported': 'Reported compromised' };

export function SealKeysRegister() {
  const [data, setData] = React.useState<Data | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ instrument: '', eId: '', reason: '', publicKeyPem: '', resInstrument: '', resEId: '' });
  const [rules, setRules] = React.useState({ authority: 'trustServices', approvers: '2', legislatureResolution: false, reviewWithinDays: '30', instrument: '', eId: '' });
  const [report, setReport] = React.useState<{ id: string; from: string; reason: string } | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/seal-keys', { cache: 'no-store' });
    if (r.ok) setData((await r.json()) as Data);
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/seal-keys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
      await load();
      setMsg(done);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  };
  const basis = () => (form.instrument ? [{ instrument: form.instrument.trim(), eId: form.eId.trim() }] : []);
  const resolution = () => (form.resInstrument ? { resolution: { instrument: form.resInstrument.trim(), eId: form.resEId.trim() } } : {});

  const p = data?.presented;
  const pending = data?.rules.changes?.pending;
  return (
    <div className="space-y-6">
      <p className="max-w-3xl rounded border border-line bg-surface p-3 text-sm">
        Which keys may seal the state&apos;s decisions and certificates is decided through the nation&apos;s own legal process. The nation&apos;s law
        names the authority that approves seal keys; at least two different officials there approve each key; the platform records each step
        and refuses to seal with a key that is not approved. Replacing a key never invalidates what earlier keys sealed.
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="The key in use now" meta={data ? (data.mode === 'production' ? 'production installation' : `${data.mode} installation`) : ''}>
        {p ? (
          <div className="text-sm">
            <p><strong>{p.keyId}</strong> <span className="text-xs text-ink-muted">· {p.source}{p.development ? ' (development key generated for this process)' : ''}</span></p>
            <p className="mt-1 break-all font-mono text-xs text-ink-muted">SHA-256 {p.fingerprint}</p>
            <p className={`mt-1 text-sm ${p.seals ? '' : 'font-semibold text-warn'}`}>
              {STATUS[p.state] ?? p.state}. {p.seals
                ? (p.state === 'unregistered' ? 'This demonstration or training installation trusts it automatically as a sample at its first seal.' : 'Decisions are sealed with it.')
                : 'No decision is sealed with it until it is approved below.'}
            </p>
            {p.state === 'unregistered' && data?.mode === 'production' ? (
              <p className="mt-1 text-xs text-ink-muted">Propose it below, citing the law; the seal keys authority approves it.</p>
            ) : null}
          </div>
        ) : <p className="text-sm text-ink-muted">The key provider does not answer.</p>}
      </Section>

      <Section title="Who approves seal keys" meta={data?.rules.adopted ? 'adopted by the nation' : 'platform defaults, not adopted'}>
        <p className="text-sm">
          {data ? <>The {data.authority.label}{data.authority.name ? <> (<strong>{data.authority.name}</strong>)</> : <span className="text-warn"> — not named yet (Who is responsible)</span>}: {data.rules.approvers} officials who can sign there approve each key{data.rules.legislatureResolution ? ', with an enacted instrument of the legislature' : ''}. A confirmed compromise is reviewed within {data.rules.reviewWithinDays} days.</> : null}
        </p>
        {data?.rules.citations?.length ? <p className="mt-1 text-xs text-ink-muted">Legal basis: {cites(data.rules.citations)}</p> : null}
        {pending ? (
          <div className="mt-2 rounded border border-line p-2 text-xs">
            <p><strong>Waiting for a second official:</strong> {pending.values.approvers} approvals by the {pending.values.authority} slot{pending.values.legislatureResolution ? ', legislature instrument required' : ''}, review within {pending.values.reviewWithinDays} d · proposed by {pending.by}</p>
            <div className="mt-1 flex gap-2">
              <Button variant="primary" disabled={busy} onClick={() => void post({ op: 'confirm-rules' }, 'Rules confirmed.')}>Confirm</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'withdraw-rules' }, 'Withdrawn.')}>Withdraw</Button>
            </div>
          </div>
        ) : null}
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">Propose the country&apos;s rules (administrators, citing the law that names the authority)</summary>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="text-xs">Authority (slot of Who is responsible)<input className={field} value={rules.authority} onChange={e => setRules({ ...rules, authority: e.target.value })} /></label>
            <label className="text-xs">Approvals for each key (at least 2)<input className={field} inputMode="numeric" value={rules.approvers} onChange={e => setRules({ ...rules, approvers: e.target.value })} /></label>
            <label className="text-xs">Review a compromise within (days)<input className={field} inputMode="numeric" value={rules.reviewWithinDays} onChange={e => setRules({ ...rules, reviewWithinDays: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-xs md:col-span-3"><input type="checkbox" checked={rules.legislatureResolution} onChange={e => setRules({ ...rules, legislatureResolution: e.target.checked })} /> Each key also needs an enacted instrument of the legislature (only where the nation&apos;s law demands it)</label>
            <label className="text-xs">Law (instrument)<input className={field} value={rules.instrument} onChange={e => setRules({ ...rules, instrument: e.target.value })} /></label>
            <label className="text-xs">Provision (eId)<input className={field} value={rules.eId} onChange={e => setRules({ ...rules, eId: e.target.value })} /></label>
          </div>
          <Button variant="secondary" className="mt-2" disabled={busy} onClick={() => void post({ op: 'propose-rules', authority: rules.authority, approvers: Number(rules.approvers), reviewWithinDays: Number(rules.reviewWithinDays), legislatureResolution: rules.legislatureResolution, legalBasis: rules.instrument ? [{ instrument: rules.instrument, eId: rules.eId }] : [] }, 'Proposed: a different official confirms it.')}>Propose rules</Button>
        </details>
      </Section>

      <Section title="Seal keys" meta={`${data?.keys.length ?? 0} recorded${data?.since ? ` · register since ${day(data.since)}` : ''}`}>
        {data?.keys.length ? (
          <ul className="space-y-2">
            {[...data.keys].reverse().map(k => (
              <li key={k.id} className="rounded border border-line p-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span><strong>{k.keyId}</strong> <span className="text-xs text-ink-muted">· {k.purpose}{k.historic ? ' · historic' : ''}{k.sample ? ' · Sample' : ''}</span></span>
                  <span className={`text-xs ${k.status === 'revoked' ? 'font-semibold text-warn' : 'text-ink-muted'}`}>{STATUS[k.status] ?? k.status}</span>
                </div>
                <p className="mt-1 break-all font-mono text-xs text-ink-muted">SHA-256 {k.fingerprint}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {k.validFrom ? `Valid from ${day(k.validFrom)}${k.validUntil ? ` until ${day(k.validUntil)}` : ''}` : k.coversFrom ? `Has sealed since ${day(k.coversFrom)}: approving it covers those seals` : 'No validity until approved'}
                  {k.basis.length ? ` · legal basis ${cites(k.basis)}` : ''}{k.resolution ? ` · legislature ${cites([k.resolution])}` : ''}
                </p>
                <p className="mt-1 text-xs text-ink-muted">Proposed by {k.proposed.by} {day(k.proposed.at)}{k.approvals.length ? ` · approved by ${k.approvals.map(a => a.by).join(', ')}` : ''}{k.reason ? ` · ${k.reason}` : ''}</p>
                {k.compromise && !k.compromise.withdrawn ? (
                  <div className="mt-2 rounded border border-line p-2 text-xs">
                    <p className="font-semibold text-warn">Reported compromised from {day(k.compromise.compromisedFrom)} by {k.compromise.by}: {k.compromise.reason}</p>
                    <p>{k.compromise.confirmed ? `Confirmed by ${k.compromise.confirmed.by} ${day(k.compromise.confirmed.at)}: seals made after that time are not trusted; earlier ones stay valid.` : 'The key seals nothing from now. A second official confirms the report.'}</p>
                    {k.compromise.confirmed ? <p>{k.compromise.review?.at ? `Reviewed by ${k.compromise.review.by}: ${k.compromise.review.outcome} · ${k.compromise.review.note}` : `Review by the seal keys authority due ${day(k.compromise.review?.dueBy)}.`}</p> : null}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {!k.compromise.confirmed ? <Button variant="primary" disabled={busy} onClick={() => void post({ op: 'confirm-compromise', id: k.id }, 'Revoked.')}>Confirm the compromise</Button> : null}
                      {!k.compromise.confirmed ? <Button variant="secondary" disabled={busy} onClick={() => { const reason = window.prompt('Why is the report withdrawn?'); if (reason) void post({ op: 'withdraw-compromise', id: k.id, reason }, 'Report withdrawn.'); }}>Withdraw the report</Button> : null}
                      {k.compromise.confirmed && !k.compromise.review?.at ? <Button variant="secondary" disabled={busy} onClick={() => { const note = window.prompt('Findings of the review (the compromise is upheld)'); if (note) void post({ op: 'review-compromise', id: k.id, outcome: 'upheld', note }, 'Review recorded.'); }}>Record the review</Button> : null}
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {k.status === 'proposed' ? <Button variant="primary" disabled={busy} onClick={() => void post({ op: 'approve', id: k.id, ...resolution() }, 'Approval recorded.')}>Approve ({k.approvals.length} of {data.rules.approvers})</Button> : null}
                  {k.status === 'proposed' ? <Button variant="secondary" disabled={busy} onClick={() => { const reason = window.prompt('Why is the proposal withdrawn?'); if (reason) void post({ op: 'withdraw', id: k.id, reason }, 'Withdrawn.'); }}>Withdraw</Button> : null}
                  {['approved', 'active', 'retired'].includes(k.status) && !k.compromise ? <Button variant="secondary" disabled={busy} onClick={() => setReport({ id: k.id, from: new Date().toISOString().slice(0, 16), reason: '' })}>Report compromised</Button> : null}
                </div>
                {report?.id === k.id ? (
                  <div className="mt-2 grid gap-2 rounded border border-line p-2 md:grid-cols-3">
                    <label className="text-xs">Not trusted from<input type="datetime-local" className={field} value={report.from} onChange={e => setReport({ ...report, from: e.target.value })} /></label>
                    <label className="text-xs md:col-span-2">What happened<input className={field} value={report.reason} onChange={e => setReport({ ...report, reason: e.target.value })} /></label>
                    <div className="flex gap-2 md:col-span-3">
                      <Button variant="primary" disabled={busy || !report.reason.trim()} onClick={() => void post({ op: 'report-compromise', id: k.id, compromisedFrom: new Date(report.from).toISOString(), reason: report.reason }, 'Reported: the key seals nothing from now; a second official confirms.').then(() => setReport(null))}>Report</Button>
                      <Button variant="secondary" disabled={busy} onClick={() => setReport(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
                <details className="mt-1 text-xs text-ink-muted">
                  <summary className="cursor-pointer">Every step ({k.history.length})</summary>
                  <ul className="mt-1 space-y-0.5">{k.history.map((h, i) => <li key={i}>{day(h.at)} · {h.step} · {h.by}{h.note ? ` · ${h.note}` : ''}</li>)}</ul>
                </details>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No key recorded yet.</p>}
      </Section>

      <Section title="Propose a key" meta="one official proposes, the authority approves">
        <p className="mb-2 text-xs text-ink-muted">Leave the public key empty to propose the key the key provider presents now. Cite the law under which keys are approved, recorded in the laws register.</p>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-xs">Law (instrument)<input className={field} value={form.instrument} onChange={e => setForm({ ...form, instrument: e.target.value })} /></label>
          <label className="text-xs">Provision (eId)<input className={field} value={form.eId} onChange={e => setForm({ ...form, eId: e.target.value })} /></label>
          <label className="text-xs md:col-span-2">Reason<input className={field} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
          <label className="text-xs md:col-span-2">Public key (PEM, optional)<textarea className={field} rows={3} value={form.publicKeyPem} onChange={e => setForm({ ...form, publicKeyPem: e.target.value })} /></label>
          {data?.rules.legislatureResolution ? (
            <>
              <label className="text-xs">Legislature&apos;s instrument<input className={field} value={form.resInstrument} onChange={e => setForm({ ...form, resInstrument: e.target.value })} /></label>
              <label className="text-xs">Provision (eId)<input className={field} value={form.resEId} onChange={e => setForm({ ...form, resEId: e.target.value })} /></label>
            </>
          ) : null}
        </div>
        <Button variant="secondary" className="mt-2" disabled={busy} onClick={() => void post({ op: 'propose', legalBasis: basis(), reason: form.reason, ...(form.publicKeyPem.trim() ? { publicKeyPem: form.publicKeyPem } : {}), ...resolution() }, 'Proposed: the seal keys authority approves it.')}>Propose</Button>
      </Section>

      {data?.historicCandidates.length ? (
        <Section title="Keys that sealed before the register" meta={`${data.historicCandidates.length}`}>
          <p className="mb-2 text-xs text-ink-muted">Their decisions verify as before and say the key is not in the register. Registering one records the period it sealed in, through the same approval.</p>
          <ul className="space-y-2">
            {data.historicCandidates.map(h => (
              <li key={h.keyId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line p-2 text-sm">
                <span><strong>{h.keyId}</strong> <span className="text-xs text-ink-muted">· {h.count} decision(s) from {day(h.first)} to {day(h.last)}</span></span>
                <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'propose', historic: true, publicKeyPem: h.publicKeyPem, legalBasis: basis(), reason: 'Historic key: sealed before the register existed' }, 'Proposed as a historic key.')}>Propose as historic (cites the law above)</Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <p className="text-xs text-ink-muted">Anyone can check certificates outside the platform against the published list of seal keys: <a className="underline" href="/api/trust/keys">/api/trust/keys</a>.</p>
    </div>
  );
}
