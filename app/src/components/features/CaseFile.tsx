'use client';

// One case (lib/casework, design §6.5): its fields, documents, the actions
// its procedure allows from where it stands, decisions with their seals and
// the laws they cite, certificates, deadlines and the full history. The
// evidence is on the page beside every action (directions 15.7).

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { RefusalText } from '@/components/ui/RefusalText';

interface Citation { instrument: string; eId: string; version: string; digest: string; title?: string; num?: string }
interface Answer {
  case: { id: string; ref: string; version: number; stage: string; owner: string; sensitivity: string; priority: string; fields: Record<string, unknown>; deadlines: { key: string; label: string; due: string; met?: string; lapsed?: string }[]; history: { seq: number; action: string; from: string; to: string; by: { name: string }; confirmedBy?: { name: string }; at: string; reason?: string; citations?: Citation[]; decision?: string }[]; pending?: { action: string; by: { name: string }; reason?: string; at: string }; links: { kind: string; case: string }[]; legalHold?: { reason: string }; closedAt?: string; assignee?: { name: string } };
  procedure: { title: string; version: number; stages: { key: string; label: string }[]; actions: { key: string; label: string; from: string[]; decision?: string; needs: { role: string; fourEyes?: boolean }; requires?: { reasons?: boolean; documents?: string[] } }[]; documents: { class: string; label: string; required: boolean }[]; fields: { key: string; label: string; personal?: boolean }[] } | null;
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
  const load = React.useCallback(() => { call<Answer>(`/api/cases/${encodeURIComponent(id)}`).then(setA).catch(e => setMsg((e as Error).message)); }, [id]);
  React.useEffect(load, [load]);
  if (!a) return <div className="p-4 text-sm">{msg ?? 'Loading the case…'}</div>;
  const { case: c, procedure: p } = a;
  const stageLabel = (k: string) => p?.stages.find(s => s.key === k)?.label ?? k;
  const actions = (p?.actions ?? []).filter(x => x.from.includes(c.stage));

  const run = async (body: unknown, done: string) => {
    setBusy(true); setMsg(null);
    try { await call(`/api/cases/${c.id}`, body); setMsg(done); setReason(''); load(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
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
          </div>
        </Section>
      ) : actions.length && !c.closedAt ? (
        <Section title="Next steps" meta="what the procedure allows now">
          <label className="block text-sm">Reasons (needed for a decision)
            <textarea className="mt-1 h-20 w-full rounded border border-line bg-surface px-2 py-1 text-sm" value={reason} onChange={e => setReason(e.target.value)} />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map(x => <Button key={x.key} variant={x.decision ? 'primary' : 'secondary'} disabled={busy} onClick={() => run({ op: 'act', action: x.key, reason: reason || undefined, expectedVersion: c.version }, x.needs.fourEyes ? 'Proposed; a second official confirms it.' : 'Done.')}>{x.label}{x.needs.fourEyes ? ' (two officials)' : ''}</Button>)}
          </div>
        </Section>
      ) : null}

      <Section title="Details" meta={`${Object.keys(c.fields).length} fields`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {(p?.fields ?? []).map(f => <div key={f.key} className="contents"><dt className="font-medium">{f.label}</dt><dd>{c.fields[f.key] === undefined || c.fields[f.key] === '' ? '—' : String(c.fields[f.key])}</dd></div>)}
        </dl>
      </Section>

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
