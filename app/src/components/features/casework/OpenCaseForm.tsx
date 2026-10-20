'use client';

// Open a case (POST /api/cases → lib/casework/engine.ts openCase()): choose
// one of the procedures the nation has approved, fill in its fields, name who
// the case is about, and the case starts at the procedure's first stage with
// its deadlines. Who may open it is the engine's rule (the responsible
// institution's officials); a refusal is shown as it comes. Nothing here
// decides anything: the case's steps happen on its own page.

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { RefusalText } from '@/components/ui/RefusalText';
import { FieldInputs, filled, type FieldSpecView, type FieldValues } from './FieldInputs';

interface Pkg { key: string; version: number; title: string; state: string; activeFrom?: string; ownerInstitution: string | null; fields: FieldSpecView[]; stages: { key: string; label: string }[]; sensitivity: string }
interface Ministry { id: string; name: string }

const PARTY_KINDS = [
  { key: 'person', label: 'A person' },
  { key: 'organisation', label: 'An organisation' },
  { key: 'unregistered', label: 'Not registered yet' },
] as const;

/** The approved version of each procedure in force today (the one openCase() will use). */
function inForce(all: Pkg[], today: string): Pkg[] {
  const best = new Map<string, Pkg>();
  for (const p of all) {
    if (p.state !== 'approved' || (p.activeFrom && p.activeFrom > today)) continue;
    const cur = best.get(p.key);
    if (!cur || p.version > cur.version) best.set(p.key, p);
  }
  return [...best.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function OpenCaseForm() {
  const router = useRouter();
  const [pkgs, setPkgs] = React.useState<Pkg[] | null>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [key, setKey] = React.useState('');
  const [values, setValues] = React.useState<FieldValues>({});
  const [kind, setKind] = React.useState<string>('person');
  const [subject, setSubject] = React.useState('');
  const [priority, setPriority] = React.useState('routine');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  // One key per form: a double click or a retried request opens one case.
  const idem = React.useRef(`open-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  React.useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      fetch('/api/case-packages', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/org/ministries', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ ministries: [] })),
    ]).then(([p, m]) => {
      setPkgs(inForce((p.packages ?? []) as Pkg[], today));
      setNames(Object.fromEntries(((m.ministries ?? []) as Ministry[]).map(x => [x.id, x.name])));
    }).catch(e => setErr((e as Error).message));
  }, []);

  const pkg = pkgs?.find(p => p.key === key);
  const missing = pkg?.fields.filter(f => f.required && (values[f.key] === undefined || values[f.key] === '')) ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/cases', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          procedure: pkg.key, fields: filled(values), priority, idempotencyKey: idem.current,
          subject: subject.trim() ? [{ kind, name: subject.trim().slice(0, 300) }] : [],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
      router.push(`/gov/cases/${j.case.id}`);
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  };

  return (
    <Section title="Open a case" meta={pkgs ? `${pkgs.length} approved procedures` : 'loading'}>
      {pkgs && !pkgs.length ? (
        <p className="text-sm text-ink-muted">
          No procedure is approved yet. Procedures are drafted, tested and approved by two officials under{' '}
          <a className="underline" href="/gov/law/procedures">Procedures</a>; a demonstration installation can load the sample set from{' '}
          <a className="underline" href="/admin/onboarding#track-demo">Onboarding</a>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">Procedure
            <select className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm" value={key} disabled={busy}
              onChange={e => { setKey(e.target.value); setValues({}); idem.current = `open-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }}>
              <option value="">Choose a procedure…</option>
              {(pkgs ?? []).map(p => <option key={p.key} value={p.key}>{p.title} · {p.ownerInstitution ? names[p.ownerInstitution] ?? p.ownerInstitution : 'no institution named'}</option>)}
            </select>
          </label>
          {pkg ? (
            <>
              <p className="text-xs text-ink-muted">
                Version {pkg.version} · starts at {pkg.stages[0]?.label ?? 'its first stage'} · {pkg.sensitivity !== 'normal' ? `${pkg.sensitivity} · ` : ''}
                kept by {pkg.ownerInstitution ? names[pkg.ownerInstitution] ?? pkg.ownerInstitution : <RefusalText text="no institution: name one under Who is responsible" />}
              </p>
              <div className="grid gap-3 md:grid-cols-[auto_1fr_auto]">
                <label className="block text-sm">The case is about
                  <select className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm" value={kind} disabled={busy} onChange={e => setKind(e.target.value)}>
                    {PARTY_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Name
                  <input className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm" maxLength={300} value={subject} disabled={busy} onChange={e => setSubject(e.target.value)} />
                </label>
                <label className="block text-sm">Priority
                  <select className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm" value={priority} disabled={busy} onChange={e => setPriority(e.target.value)}>
                    <option value="routine">Routine</option><option value="priority">Priority</option><option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>
              {pkg.fields.length ? <FieldInputs fields={pkg.fields} values={values} onChange={setValues} disabled={busy} /> : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Opening…' : 'Open the case'}</Button>
                {missing.length ? <span className="text-xs text-ink-muted">Needed before the steps that use them: {missing.map(f => f.label).join(', ')}</span> : null}
              </div>
            </>
          ) : null}
          {err ? <p role="alert" className="text-sm text-alert"><RefusalText text={err} /></p> : null}
        </form>
      )}
    </Section>
  );
}
