'use client';

// Requests between institutions (/gov/exchange/workflows; plan I9,
// lib/federation/procedures.ts): the cross-institution workflow templates,
// the catalogue forms each carries, and how far each institution has adopted
// them as its own procedures. None is an order: a case records whether what
// was asked is a request (the institution may decline with reasons) or an
// instruction under an approved instruct relationship. Cases themselves are
// worked in the receiving institution's queue.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Pill } from '@/components/ui/Pill';

type Template = { key: string; title: string; forms: string[]; stages: string[]; decisions: string[] };
type Adoption = { institution: string; name: string; procedures: { template: string; key: string; state: 'none' | 'draft' | 'approved' }[] };

export function CrossInstitutionWorkflows() {
  const [d, setD] = React.useState<{ templates: Template[]; adoption: Adoption[] } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    fetch('/api/exchange/workflows', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setD(j); setErr(null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  React.useEffect(load, [load]);
  const adopt = async (institution: string) => {
    const r = await fetch('/api/exchange/workflows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'adopt', institution }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Drafted ${j.result?.drafted?.length ?? 0} procedure(s); a different official approves each under Laws › Procedures.` : j.error ?? 'Refused');
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        When one institution needs something of another (information, its view, a handover, a task, a decision, an agreement, access to a shared
        service, an exception), the request becomes a case of the institution that receives it, worked by its own officials under its own
        approved procedure. Nothing here is an order: a case records whether the request is binding, which it is only under an approved
        instruct relationship (<a className="text-link underline underline-offset-2" href="/gov/configuration/relationships">Relationships</a>).
        An agreement, an accepted handover or an access approval grants no power by itself.
      </p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {d ? (
        <>
          <Section title="Procedures" meta={`${d.templates.length} templates, adopted by each institution as its own`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr><th scope="col">Procedure</th><th scope="col">Catalogue forms</th><th scope="col">Stages</th><th scope="col">Decisions (two officials)</th></tr></thead>
                <tbody>
                  {d.templates.map(t => (
                    <tr key={t.key} className="border-t border-line align-top">
                      <td>{t.title}<div className="font-mono text-xs text-ink-muted">{t.key}</div></td>
                      <td className="font-mono text-xs">{t.forms.join(', ')}</td>
                      <td className="text-xs">{t.stages.join(' → ')}</td>
                      <td className="text-xs">{t.decisions.join('; ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="Adoption by institution" meta="drafted by one official, approved by another">
            {d.adoption.length ? (
              <ul className="space-y-1 text-sm">
                {d.adoption.map(a => {
                  const approved = a.procedures.filter(p => p.state === 'approved').length, drafted = a.procedures.filter(p => p.state === 'draft').length;
                  return (
                    <li key={a.institution} className="flex flex-wrap items-center gap-2">
                      <span>{a.name}</span>
                      <Pill tone={approved === a.procedures.length ? 'ok' : drafted || approved ? 'warn' : 'neutral'}>{approved} approved · {drafted} drafts</Pill>
                      {approved + drafted < a.procedures.length ? <button type="button" className="rounded border border-line px-2 text-xs" onClick={() => void adopt(a.institution)}>Draft its procedures</button> : null}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-ink-muted">No active institution yet.</p>}
          </Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Loading…</p> : null}
    </div>
  );
}
