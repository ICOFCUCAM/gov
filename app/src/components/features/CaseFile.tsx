'use client';

// One case (lib/casework, design §6.5): its fields, documents, the actions
// its procedure allows from where it stands, decisions with their seals and
// the laws they cite, certificates, deadlines and the full history. The
// evidence is on the page beside every action (directions 15.7).

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { RefusalText } from '@/components/ui/RefusalText';
import { SwitchToSecondOfficial } from '@/components/ui/SwitchToSecondOfficial';
import { FieldInputs, type FieldSpecView, type FieldValues } from './casework/FieldInputs';
import { CaseControls } from './casework/CaseControls';
import { answerText } from './forms/answers';

interface Citation { instrument: string; eId: string; version: string; digest: string; title?: string; num?: string }
interface Answer {
  case: { id: string; ref: string; version: number; stage: string; owner: string; sensitivity: string; priority: string; fields: Record<string, unknown>; deadlines: { key: string; label: string; due: string; met?: string; lapsed?: string }[]; history: { seq: number; action: string; from: string; to: string; by: { name: string }; confirmedBy?: { name: string }; at: string; reason?: string; citations?: Citation[]; decision?: string }[]; pending?: { action: string; by: { id?: string; name: string }; reason?: string; at: string }; links: { kind: string; case: string }[]; legalHold?: { reason: string }; closedAt?: string; assignee?: { name: string };
    intake?: { channel: string; at: string; form: { version: string; declaration?: string; evidencePolicy?: string }; declaration?: { version: string; confirmedAt: string }; locale?: string; assisted?: { by: { name: string }; servicePoint?: string; identityEvidence: string }; paper?: { receivedOn?: string } };
    verifications?: { field: string; service: string; result: string; note?: string; at: string }[];
    fieldSources?: Record<string, { source: 'entered' | 'verified'; at: string; by?: string; channel?: string; service?: string }> };
  procedure: { title: string; version: number; stages: { key: string; label: string }[]; actions: { key: string; label: string; from: string[]; decision?: string; needs: { role: string; fourEyes?: boolean }; requires?: { reasons?: boolean; documents?: string[]; fields?: string[]; citations?: boolean } }[]; documents: { class: string; label: string; required: boolean }[]; fields: FieldSpecView[]; citations?: Citation[] } | null;
  documents: { id: string; class: string; title: string; versions: { n: number; sha256: string; at: string; by: string }[] }[];
  decisions: { id: string; sha256: string; seal: { keyId: string }; content: { decision: string; reasons: string; citations: Citation[]; officials: { role: string; name: string }[]; facts?: Record<string, unknown>; at: string } }[];
  certificates: { id: string; code: string; title: string; status: string }[];
  hearings?: { id: string; kind: string; at: string; room?: string; state: string; history: { state: string; at: string; by: string; reason?: string }[] }[];
}

async function call<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Request failed (${r.status})`);
  return j as T;
}

export function CaseFile({ id }: { id: string }) {
  const [a, setA] = React.useState<Answer | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // The fields a step carries (only those changed from the case are sent) and the provisions it cites.
  const [edits, setEdits] = React.useState<FieldValues>({});
  const [cited, setCited] = React.useState<Record<string, boolean>>({});
  const load = React.useCallback(() => { call<Answer>(`/api/cases/${encodeURIComponent(id)}`).then(setA).catch(e => setMsg((e as Error).message)); }, [id]);
  React.useEffect(load, [load]);
  if (!a) return <div className="p-4 text-sm">{msg ?? 'Loading the case…'}</div>;
  const { case: c, procedure: p } = a;
  const stageLabel = (k: string) => p?.stages.find(s => s.key === k)?.label ?? k;
  const actions = (p?.actions ?? []).filter(x => x.from.includes(c.stage));
  const values = { ...c.fields, ...edits };
  const changed = Object.fromEntries(Object.entries(edits).filter(([k, v]) => v !== c.fields[k]));
  const needed = new Set(actions.flatMap(x => x.requires?.fields ?? []));
  const lawChoices = p?.citations ?? [];
  const citeKey = (ci: Citation) => `${ci.instrument}#${ci.eId}`;
  const citations = lawChoices.filter(ci => cited[citeKey(ci)] !== false).map(ci => ({ instrument: ci.instrument, eId: ci.eId }));
  const missingFor = (x: (typeof actions)[number]) => (x.requires?.fields ?? []).filter(k => values[k] === undefined || values[k] === '').map(k => p?.fields.find(f => f.key === k)?.label ?? k);

  const run = async (body: unknown, done: string) => {
    setBusy(true); setMsg(null);
    try { await call(`/api/cases/${c.id}`, body); setMsg(done); setReason(''); setEdits({}); load(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const uploadDoc = async (cls: string, file: File) => {
    setBusy(true); setMsg(null);
    try {
      const data = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
      await call(`/api/cases/${c.id}/documents`, { class: cls, title: file.name, data });
      setMsg('Document attached.'); load();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{c.ref} · {p?.title ?? 'Case'}</h1>
      <p className="text-sm text-ink-muted">Stage: <strong>{stageLabel(c.stage)}</strong> · priority {c.priority} · {c.sensitivity !== 'normal' ? `${c.sensitivity} · ` : ''}procedure version {p?.version}{c.assignee ? ` · assigned to ${c.assignee.name}` : ''}{c.legalHold ? ` · held: ${c.legalHold.reason}` : ''}</p>
      {msg ? <p role="status" className="text-sm"><RefusalText text={msg} /></p> : null}

      {c.pending ? (
        <Section title="Waiting for a second official" meta="four-eyes">
          <p className="text-sm">{c.pending.by.name} proposed <strong>{p?.actions.find(x => x.key === c.pending!.action)?.label ?? c.pending.action}</strong>{c.pending.reason ? `: ${c.pending.reason}` : ''}. A different official confirms it.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => run({ op: 'act', action: c.pending!.action, expectedVersion: c.version }, 'Confirmed.')}>Confirm</Button>
            <Button variant="secondary" disabled={busy} onClick={() => { const r = window.prompt('Why is the proposal withdrawn?'); if (r) void run({ op: 'cancel', reason: r }, 'Withdrawn.'); }}>Withdraw</Button>
            {/* Demonstration and training installations: become the cast's other signatory of this institution. */}
            <SwitchToSecondOfficial institution={c.owner} proposedBy={c.pending.by.id} />
          </div>
        </Section>
      ) : actions.length && !c.closedAt ? (
        <Section title="Next steps" meta="what the procedure allows now">
          {p?.fields.length ? (
            <details className="mb-3" open={needed.size > 0}>
              <summary className="cursor-pointer text-sm font-medium">Case details for this step{needed.size ? ` (needed: ${[...needed].map(k => p.fields.find(f => f.key === k)?.label ?? k).join(', ')})` : ''}</summary>
              <div className="mt-2"><FieldInputs fields={p.fields} values={values} onChange={v => setEdits(Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== c.fields[k])))} disabled={busy} /></div>
            </details>
          ) : null}
          <label className="block text-sm">Reasons (needed for a decision)
            <textarea className="mt-1 h-20 w-full rounded border border-line bg-surface px-2 py-1 text-sm" value={reason} onChange={e => setReason(e.target.value)} />
          </label>
          {lawChoices.length ? (
            <fieldset className="mt-2 text-sm">
              <legend className="font-medium">Law cited</legend>
              {lawChoices.map(ci => (
                <label key={citeKey(ci)} className="me-4 inline-flex items-center gap-1">
                  <input type="checkbox" checked={cited[citeKey(ci)] !== false} onChange={e => setCited({ ...cited, [citeKey(ci)]: e.target.checked })} />
                  {ci.title ?? ci.instrument} {ci.num ?? ci.eId}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map(x => {
              const missing = missingFor(x);
              return (
                <Button key={x.key} variant={x.decision ? 'primary' : 'secondary'} disabled={busy} title={missing.length ? `Needed first: ${missing.join(', ')}` : undefined}
                  onClick={() => run({ op: 'act', action: x.key, reason: reason || undefined, expectedVersion: c.version, ...(Object.keys(changed).length ? { fields: changed } : {}), ...(citations.length && (x.decision || x.requires?.citations) ? { citations } : {}) }, x.needs.fourEyes ? 'Proposed; a second official confirms it.' : 'Done.')}>
                  {x.label}{x.needs.fourEyes ? ' (two officials)' : ''}
                </Button>
              );
            })}
          </div>
        </Section>
      ) : null}

      {!c.closedAt ? <CaseControls caseId={c.id} assignee={c.assignee} held={!!c.legalHold} busy={busy} run={run} /> : null}

      <Section title="Details" meta={`${Object.keys(c.fields).length} fields`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {(p?.fields ?? []).map(f => {
            const v = c.fields[f.key];
            const src = c.fieldSources?.[f.key];
            return (
              <div key={f.key} className="contents">
                <dt className="font-medium">{f.label}</dt>
                <dd>{v === undefined || v === '' ? '—' : typeof v === 'object' ? answerText(f as never, v) : String(v)}{src ? <span className="ms-2 text-xs text-ink-muted">{src.source === 'verified' ? `verified with ${src.service ?? 'a register'}` : `entered${src.channel ? ` (${src.channel})` : ''}${src.by ? ` by ${src.by}` : ''}`}</span> : null}</dd>
              </div>
            );
          })}
        </dl>
      </Section>

      {c.intake ? (
        <Section title="How it was received" meta={c.intake.channel}>
          <ul className="text-sm">
            <li>{c.intake.channel === 'assisted' ? 'Assisted at an office' : c.intake.channel === 'paper' ? 'From a paper form' : 'Self-service'} · {c.intake.at.slice(0, 16).replace('T', ' ')} · form {c.intake.form.version}{c.intake.form.evidencePolicy ? ` · evidence policy ${c.intake.form.evidencePolicy}` : ''}</li>
            {c.intake.declaration ? <li>Declaration version {c.intake.declaration.version} confirmed {c.intake.declaration.confirmedAt.slice(0, 16).replace('T', ' ')}</li> : null}
            {c.intake.assisted ? <li>Assisted by {c.intake.assisted.by.name}{c.intake.assisted.servicePoint ? ` at ${c.intake.assisted.servicePoint}` : ''} · identity evidence seen: {c.intake.assisted.identityEvidence}</li> : null}
            {c.intake.paper?.receivedOn ? <li>Paper form received on {c.intake.paper.receivedOn}</li> : null}
          </ul>
          {c.verifications?.length ? (
            <ul className="mt-2 text-sm">{c.verifications.map(v => <li key={`${v.field}-${v.service}-${v.at}`}>{v.field}: {v.result.replace('-', ' ')} with {v.service}{v.note ? ` · ${v.note}` : ''}</li>)}</ul>
          ) : null}
        </Section>
      ) : null}

      <Section title="Documents" meta={`${a.documents.length} attached`}>
        <ul className="text-sm">{a.documents.map(d => <li key={d.id}><a className="underline" href={`/api/cases/${c.id}/documents/${d.id}`}>{d.title}</a> · {d.class} · version {d.versions.length} · <span className="font-mono text-xs">{d.versions.at(-1)?.sha256.slice(0, 12)}</span></li>)}</ul>
        {!c.closedAt ? (
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {(p?.documents ?? []).map(d => (
              <label key={d.class} className="text-sm">{d.label}{d.required ? ' (required)' : ''}
                <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="mt-1 block text-sm" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void uploadDoc(d.class, f); }} />
              </label>
            ))}
          </div>
        ) : null}
      </Section>

      {a.hearings?.length ? (
        <Section title="Hearings" meta={`${a.hearings.length}`}>
          <ul className="space-y-1 text-sm">{a.hearings.map(h => <li key={h.id}>{h.at.replace('T', ' ')} · {h.kind}{h.room ? ` · ${h.room}` : ''} · {h.state}{h.history.at(-1)?.reason ? ` (${h.history.at(-1)!.reason})` : ''}</li>)}</ul>
        </Section>
      ) : null}

      {a.decisions.length ? (
        <Section title="Decisions" meta="sealed">
          {a.decisions.map(d => (
            <div key={d.id} className="mb-2 rounded border border-line p-2 text-sm">
              <div><strong>{d.content.decision}</strong> · {new Date(d.content.at).toLocaleString()} · {d.content.officials.map(o => `${o.role === 'decided' ? 'decided by' : 'confirmed by'} ${o.name}`).join(', ')}</div>
              <div className="mt-1">{d.content.reasons}</div>
              {d.content.citations.length ? <div className="mt-1 text-xs">Law: {d.content.citations.map(ci => `${ci.title ?? ci.instrument} ${ci.num ?? ci.eId} (version ${ci.version.slice(0, 8)})`).join('; ')}</div> : null}
              <div className="mt-1 font-mono text-xs">Record {d.sha256.slice(0, 16)} · seal key {d.seal.keyId}</div>
            </div>
          ))}
          {a.certificates.map(ce => <p key={ce.id} className="text-sm">{ce.title}: code <span className="font-mono">{ce.code}</span> ({ce.status}) · <a className="underline" href={`/verify/${ce.code}`}>public check</a></p>)}
        </Section>
      ) : null}

      <Section title="Deadlines" meta="legal">
        <ul className="text-sm">{c.deadlines.map(d => <li key={`${d.key}-${d.due}`}>{d.label}: {d.due}{d.met ? ' · met' : d.lapsed ? ' · passed' : ''}</li>)}</ul>
      </Section>

      <Section title="History" meta={`${c.history.length} steps`}>
        <ol className="space-y-1 text-sm">
          {c.history.map(h => (
            <li key={h.seq}>{new Date(h.at).toLocaleString()} · {h.action} {h.from ? `${stageLabel(h.from)} → ` : ''}{stageLabel(h.to)} · {h.by.name}{h.confirmedBy ? `, confirmed by ${h.confirmedBy.name}` : ''}{h.reason ? ` · ${h.reason}` : ''}</li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
