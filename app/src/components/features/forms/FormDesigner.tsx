'use client';

// The form designer (spec Part 6 §4; plan §3.1): an official edits a
// procedure's form inside the contract (lib/forms/contract.ts) as part of a
// draft of the procedure: questions and their types, personal-data classes,
// approved lists, named rules and their plain-language error text, building
// blocks, the evidence with the provision that requires it, the declaration,
// translations (each kept with the English it was made from, so a change
// marks it out of date) and the day counts the nation's law gives. Every
// change is checked against the contract as it is made, and previewed in all
// three channels. Saving changes a draft in place, or writes the next version
// of an approved procedure; a different official who can sign approves it
// under Procedures (draft → tested → approved). The form library (the
// specification's sixteen forms, the field series' contracts and the
// catalogue contracts CivicOS wrote in batches) is shown with what its loader
// reported, every deviation and its publication gates (a contract draft).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { RefusalText } from '@/components/ui/RefusalText';
import {
  fieldProblem, formProblem, formStrings, resolveForm, translationStatus, DATA_CLASSES, CONFIDENTIALITY, FIELD_TYPES, TYPE_LABEL, PATTERNS, PROFILES, RULE_LABEL,
  VALUE_REGISTERS, REFERENCE_REGISTERS, citationText,
  type ContractDocument, type ContractField, type FormSpec, type NamedRule, type ValueSnapshot, type ValuesSource, type Channel,
} from '@/lib/forms/contract';
import { FormRenderer } from './FormRenderer';
import { PrintForm } from './PrintForm';
import { PublicationPanel } from './PublicationPanel';
import { LibraryDetails, type LibraryInfo } from './LibraryDetails';

interface Deadline { key: string; label: string; from: string; days?: number; sampleDays?: number; calendar: string }
interface Pkg { key: string; version: number; title: string; state: string; owner: string; ownerInstitution: string | null; reference?: boolean; fields: ContractField[]; documents: ContractDocument[]; form?: FormSpec; deadlines: Deadline[]; appeal?: { days?: number; sampleDays?: number; body: string; suspensive: boolean }; sensitivity: string; author: string; editors?: { by: string; what: string }[]; testResult: { ok: boolean; failures: string[] }; publicationStatus?: string; [k: string]: unknown }
interface LibraryRow { key: string; specId: string; title: string; owner: string; attachesTo: string | null; awaits: string | null; fields: number; notes: { field?: string; kind: string; note: string }[]; deviations: { field?: string; what: string; why: string }[]; status?: string; source?: string }
interface Contract { snapshot: ValueSnapshot; currency: string; languages: string[]; blocks: { key: string; label: string; description: string; example: { fields: ContractField[]; documents?: ContractDocument[] } }[]; services: { id: string; title: string }[] }

const input = 'mt-1 block w-full min-h-tap rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink focus-ring';
const RULES: NamedRule['rule'][] = ['length', 'pattern', 'range', 'requiredWhen', 'notAfter', 'notBefore', 'mustBeTrue', 'minItems', 'maxItems', 'existingRecord', 'unique', 'signature', 'verifiedChannel', 'profile', 'verifyWith'];
const blankRule = (r: NamedRule['rule'], f: ContractField, keys: string[]): NamedRule => {
  switch (r) {
    case 'length': return { rule: 'length', max: 200 };
    case 'pattern': return { rule: 'pattern', pattern: 'digits' };
    case 'range': return { rule: 'range', min: 0 };
    case 'requiredWhen': return { rule: 'requiredWhen', field: keys.find(k => k !== f.key) ?? '', notEquals: '' };
    case 'notAfter': case 'notBefore': return { rule: r, than: 'today' };
    case 'minItems': return { rule: 'minItems', min: 1 };
    case 'maxItems': return { rule: 'maxItems', max: 10 };
    case 'existingRecord': return { rule: 'existingRecord' };
    case 'profile': return { rule: 'profile', profile: 'evidence-policy' };
    case 'verifyWith': return { rule: 'verifyWith', service: 'person.verify', input: { registration: '$value' }, purpose: 'Confirm the applicant\'s identity' };
    default: return { rule: r } as NamedRule;
  }
};
const listText = (vs: { value: string; label: string }[]) => vs.map(v => `${v.value} | ${v.label}`).join('\n');
const parseList = (t: string) => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [v, ...rest] = l.split('|'); const value = v!.trim(); return { value, label: rest.join('|').trim() || value }; });

export function FormDesigner() {
  const [pkgs, setPkgs] = React.useState<Pkg[] | null>(null);
  const [library, setLibrary] = React.useState<LibraryRow[]>([]);
  const [contract, setContract] = React.useState<Contract | null>(null);
  const [selected, setSelected] = React.useState<string>('');
  const [libSel, setLibSel] = React.useState<string>('');
  const [work, setWork] = React.useState<Pkg | null>(null);
  const [fieldKey, setFieldKey] = React.useState<string>('');
  const [preview, setPreview] = React.useState<Channel | 'print'>('self-service');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [lang, setLang] = React.useState('');
  const [libView, setLibView] = React.useState<{ form: unknown } | null>(null);
  // Hundreds of forms: one filter over procedures and the library (title, key, specification id).
  const [q, setQ] = React.useState('');
  const match = (...xs: (string | null | undefined)[]) => !q.trim() || xs.some(x => (x ?? '').toLowerCase().includes(q.trim().toLowerCase()));

  const load = React.useCallback(() => {
    Promise.all([
      fetch('/api/case-packages', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/case-packages?library=1', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/case-packages?contract=1', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([p, l, c]) => { setPkgs((p.packages ?? []) as Pkg[]); setLibrary((l.forms ?? []) as LibraryRow[]); setContract(c as Contract); })
      .catch(e => setErr((e as Error).message));
  }, []);
  React.useEffect(load, [load]);

  // The latest version of each procedure.
  const latest = React.useMemo(() => {
    const m = new Map<string, Pkg>();
    for (const p of pkgs ?? []) { const c = m.get(p.key); if (!c || p.version > c.version) m.set(p.key, p); }
    return [...m.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [pkgs]);
  React.useEffect(() => {
    const p = latest.find(x => `${x.key}@${x.version}` === selected);
    setWork(p ? structuredClone(p) : null); setFieldKey(p?.fields[0]?.key ?? ''); setMsg(null); setErr(null);
  }, [selected, latest]);
  React.useEffect(() => {
    if (!libSel) { setLibView(null); return; }
    fetch(`/api/case-packages?form=${encodeURIComponent(libSel)}`, { cache: 'no-store' }).then(r => r.json()).then(j => setLibView(j)).catch(() => setLibView(null));
  }, [libSel]);

  const keys = work?.fields.map(f => f.key) ?? [];
  const classes = work?.documents.map(d => d.class) ?? [];
  const problems = work ? [...work.fields.map(f => fieldProblem(f, keys, classes)).filter((x): x is string => !!x), ...[formProblem(work.form, work.fields, work.documents, work.sensitivity)].filter((x): x is string => !!x)] : [];
  const unset = work ? [...work.deadlines.filter(d => d.days === undefined).map(d => d.label), ...(work.appeal && work.appeal.days === undefined ? ['appeal'] : [])] : [];
  const view = work && contract ? resolveForm({ ...work, fields: work.fields, documents: work.documents, form: work.form }, contract.snapshot, { locale: lang || contract.languages[0] || 'en', currency: contract.currency }) : null;
  const field = work?.fields.find(f => f.key === fieldKey);
  const setField = (patch: Partial<ContractField>) => setWork(w => w && ({ ...w, fields: w.fields.map(f => (f.key === fieldKey ? { ...f, ...patch } : f)) }));
  const setForm = (patch: Partial<FormSpec>) => setWork(w => w && ({ ...w, form: { version: '1.0', ...(w.form ?? {}), ...patch } }));

  const saveDraft = async () => {
    if (!work) return;
    setMsg(null); setErr(null);
    const changes = { fields: work.fields, documents: work.documents, ...(work.form ? { form: work.form } : {}), deadlines: work.deadlines, ...(work.appeal ? { appeal: work.appeal } : {}) };
    const body = work.state === 'draft'
      ? { op: 'edit', key: work.key, version: work.version, changes }
      : { op: 'draft', package: { ...work, ...changes, version: Math.max(...(pkgs ?? []).filter(p => p.key === work.key).map(p => p.version)) + 1, reference: false } };
    const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? `Not saved (${r.status})`); return; }
    setMsg(`${work.title}: ${work.state === 'draft' ? `draft version ${work.version} changed` : `draft version ${j.package.version} written`}. A different official who can sign approves it under Procedures, once its tests pass and every day count is set.`);
    setSelected(`${j.package.key}@${j.package.version}`);
    load();
  };

  return (
    <div className="space-y-5 p-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Forms</h1>
        <p className="max-w-3xl text-sm text-ink-muted">Each procedure&apos;s form is part of the procedure: it is changed in a draft, checked against the form contract as you go, previewed as the applicant, the office and the paper form see it, and approved with the procedure by a different official. Nothing a law decides is typed here: lists come from approved sources, fees from approved rules, day counts from the nation&apos;s law.</p>
      </header>
      {err ? <p role="alert" className="text-sm text-alert"><RefusalText text={err} /></p> : null}
      {msg ? <p role="status" className="text-sm text-ok">{msg}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Procedures and library forms" className="space-y-4">
          <label className="block text-sm">Find a form
            <input type="search" className="mt-1 block w-full min-h-tap rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink focus-ring" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          <Section title="Procedures" meta={pkgs ? `${latest.length}` : 'loading'}>
            {pkgs && !latest.length ? <p className="text-sm text-ink-muted">No procedures yet: add the reference procedures under <Link className="underline" href="/gov/law/procedures">Procedures</Link>.</p> : null}
            <ul className="space-y-1">
              {latest.filter(p => match(p.title, p.key, p.form?.spec?.id)).map(p => (
                <li key={p.key}>
                  <button type="button" aria-current={selected === `${p.key}@${p.version}` ? 'true' : undefined}
                    className={`w-full rounded-sm border px-2 py-1.5 text-start text-sm focus-ring ${selected === `${p.key}@${p.version}` ? 'border-ink bg-surface-2' : 'border-line'}`}
                    onClick={() => { setSelected(`${p.key}@${p.version}`); setLibSel(''); }}>
                    <span className="block font-medium">{p.title}</span>
                    <span className="block text-xs text-ink-muted">version {p.version} · {p.state}{p.form ? ` · form ${p.form.version}` : ' · no form yet'}{p.publicationStatus ? ` · ${p.publicationStatus.replace(/_/g, ' ')}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Form library" meta={`${library.length}: specification, field series, catalogue contracts`}>
            <ul className="space-y-1">
              {library.filter(l => match(l.title, l.key, l.specId, l.owner)).map(l => (
                <li key={l.key}>
                  <button type="button" aria-current={libSel === l.key ? 'true' : undefined} className={`w-full rounded-sm border px-2 py-1.5 text-start text-sm focus-ring ${libSel === l.key ? 'border-ink bg-surface-2' : 'border-line'}`} onClick={() => { setLibSel(l.key); setSelected(''); }}>
                    <span className="block font-medium">{l.title}</span>
                    <span className="block text-xs text-ink-muted"><bdi dir="ltr">{l.specId}</bdi> · {(l.status ?? 'contract_draft').replace(/_/g, ' ')}{l.source ? ` · ${l.source}` : ''} · {l.attachesTo ? <>belongs to <bdi dir="ltr">{l.attachesTo}</bdi></> : 'waits for its procedure'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </nav>

        <div className="min-w-0 space-y-5">
          {libSel && libView ? <LibraryPanel data={libView as LibraryData} /> : null}
          {!work && !libSel ? <p className="text-sm text-ink-muted">Choose a procedure to edit its form, or a library form to see it.</p> : null}
          {work && contract && view ? (
            <>
              <Section title={`${work.title} · version ${work.version} (${work.state})`} meta={work.state === 'draft' ? 'changes are made in this draft' : 'saving writes the next version as a draft'}>
                <div role="status" className={`rounded-sm border-s-4 px-3 py-2 text-sm ${problems.length ? 'border-alert bg-surface-2' : 'border-ok bg-surface-2'}`}>
                  {problems.length ? <><strong>Does not fit the form contract yet:</strong><ul className="list-disc ps-5">{problems.map(p => <li key={p}>{p}</li>)}</ul></> : <strong>Fits the form contract.</strong>}
                  {unset.length ? <p className="mt-1"><strong>Day counts to set before approval:</strong> {unset.join(', ')}</p> : null}
                  {!work.testResult.ok ? <p className="mt-1">Its own tests fail: {work.testResult.failures.join('; ')}</p> : null}
                </div>
              </Section>

              <PublicationPanel key={`${work.key}@${work.version}`} pkgKey={work.key} version={work.version} />

              <div className="grid gap-4 xl:grid-cols-[16rem_1fr]">
                <Section title="Questions" meta={`${work.fields.length}`}>
                  <ol className="space-y-1">
                    {work.fields.map((f, i) => (
                      <li key={f.key}>
                        <button type="button" aria-current={fieldKey === f.key ? 'true' : undefined} className={`w-full rounded-sm border px-2 py-1 text-start text-sm focus-ring ${fieldKey === f.key ? 'border-ink bg-surface-2' : 'border-line'}`} onClick={() => setFieldKey(f.key)}>
                          <span className="block">{i + 1}. {f.label}</span>
                          <span className="block text-xs text-ink-muted">{TYPE_LABEL[f.type as keyof typeof TYPE_LABEL] ?? f.type} · {f.personalDataClass ?? (f.personal ? 'personal' : 'administrative')}{f.audience === 'officer' ? ' · official' : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <AddField keys={keys} contract={contract} onAdd={(fs, docs) => setWork(w => w && ({ ...w, fields: [...w.fields, ...fs], documents: [...w.documents, ...(docs ?? []).filter(d => !w.documents.some(x => x.class === d.class))] }))} />
                </Section>
                {field ? <FieldEditor key={field.key} f={field} keys={keys} classes={classes} contract={contract} lists={Object.keys(work.form?.lists ?? {})} onChange={setField}
                  onRemove={() => { setWork(w => w && ({ ...w, fields: w.fields.filter(x => x.key !== field.key) })); setFieldKey(''); }} /> : <p className="text-sm text-ink-muted">Choose a question.</p>}
              </div>

              <FormMetaEditor work={work} setForm={setForm} setDocs={docs => setWork(w => w && ({ ...w, documents: docs }))} />
              <DaysEditor work={work} onChange={(deadlines, appeal) => setWork(w => w && ({ ...w, deadlines, ...(appeal ? { appeal } : {}) }))} />
              <TranslationsEditor work={work} languages={contract.languages} lang={lang} setLang={setLang} setForm={setForm} />

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={saveDraft} disabled={problems.length > 0}>{work.state === 'draft' ? 'Save the draft' : 'Save as the next version (draft)'}</Button>
                <Link className="inline-flex min-h-tap items-center text-sm underline" href={`/gov/law/procedures/forms/${encodeURIComponent(work.key)}`}>Open the form</Link>
                <Link className="inline-flex min-h-tap items-center text-sm underline" href={`/gov/law/procedures/forms/${encodeURIComponent(work.key)}/print?version=${work.version}`}>Printable form</Link>
              </div>

              <Section title="Preview" meta="as each channel shows it; nothing is sent">
                <div role="tablist" aria-label="Channel" className="flex flex-wrap gap-2">
                  {(['self-service', 'assisted', 'paper', 'print'] as const).map(c => (
                    <button key={c} role="tab" type="button" aria-selected={preview === c} className={`min-h-tap rounded-sm border px-3 text-sm focus-ring ${preview === c ? 'border-ink bg-surface-2 font-semibold' : 'border-line'}`} onClick={() => setPreview(c)}>
                      {c === 'self-service' ? 'Self-service' : c === 'assisted' ? 'Assisted at an office' : c === 'paper' ? 'From a paper form' : 'Printed form'}
                    </button>
                  ))}
                </div>
                <div role="tabpanel" className="rounded-sm border border-line bg-bg p-4">
                  {preview === 'print' ? <PrintForm view={view} /> : <FormRenderer key={`${preview}-${work.key}`} view={view} channel={preview} preview />}
                </div>
              </Section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type LibraryData = { form: Parameters<typeof PrintForm>[0]['view']; library?: LibraryInfo };

function LibraryPanel({ data }: { data: LibraryData }) {
  const [c, setC] = React.useState<Channel | 'print'>('self-service');
  return (
    <>
      {data.library ? <LibraryDetails title={data.form.procedure.title} library={data.library} /> : null}
      <p className="text-sm"><Link className="underline" href={`/gov/law/procedures/forms/${encodeURIComponent(data.form.procedure.key)}`}>Open the form on its own page</Link></p>
      <PublicationPanel key={data.form.procedure.key} pkgKey={data.form.procedure.key} version={data.form.procedure.version} />
      <div role="tablist" aria-label="Channel" className="flex flex-wrap gap-2">
        {(['self-service', 'assisted', 'paper', 'print'] as const).map(x => <button key={x} role="tab" type="button" aria-selected={c === x} className={`min-h-tap rounded-sm border px-3 text-sm focus-ring ${c === x ? 'border-ink bg-surface-2 font-semibold' : 'border-line'}`} onClick={() => setC(x)}>{x === 'print' ? 'Printed form' : x === 'paper' ? 'From a paper form' : x === 'assisted' ? 'Assisted at an office' : 'Self-service'}</button>)}
      </div>
      <div role="tabpanel" className="rounded-sm border border-line bg-bg p-4">{c === 'print' ? <PrintForm view={data.form} /> : <FormRenderer key={c} view={data.form} channel={c} preview />}</div>
    </>
  );
}

function AddField({ keys, contract, onAdd }: { keys: string[]; contract: Contract; onAdd: (f: ContractField[], d?: ContractDocument[]) => void }) {
  const [what, setWhat] = React.useState('text');
  const [key, setKey] = React.useState('');
  const ok = /^[a-z][A-Za-z0-9]{0,40}$/.test(key) && !keys.includes(key);
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <label className="block text-sm">Add a question or a building block
        <select className={input} value={what} onChange={e => setWhat(e.target.value)}>
          <optgroup label="Question types">{FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</optgroup>
          <optgroup label="Building blocks">{contract.blocks.map(b => <option key={b.key} value={`block:${b.key}`}>{b.label}</option>)}</optgroup>
        </select>
      </label>
      <label className="block text-sm">Key (camelCase, used by the procedure)<input className={`${input} font-mono`} dir="ltr" value={key} onChange={e => setKey(e.target.value)} /></label>
      <Button type="button" variant="secondary" disabled={!ok} onClick={() => {
        if (what.startsWith('block:')) {
          const b = contract.blocks.find(x => x.key === what.slice(6))!;
          const rename = (k: string) => (k === 'example' ? key : k);
          onAdd(b.example.fields.map(f => ({ ...structuredClone(f), key: rename(f.key), ...(f.showWhen ? { showWhen: { ...f.showWhen, field: rename(f.showWhen.field) } } : {}), ...(f.rules ? { rules: f.rules.map(r => (r.rule === 'requiredWhen' ? { ...r, field: rename(r.field) } : r)) } : {}) })), b.example.documents);
        } else onAdd([{ key, label: 'New question', type: what, personalDataClass: 'administrative', ...(what === 'enum' ? { valuesSource: { kind: 'list', values: [{ value: 'yes', label: 'Yes' }] } } : {}), ...(what === 'choice' ? { options: ['option'] } : {}) } as ContractField]);
        setKey('');
      }}>Add</Button>
    </div>
  );
}

function FieldEditor({ f, keys, classes, contract, lists, onChange, onRemove }: { f: ContractField; keys: string[]; classes: string[]; contract: Contract; lists: string[]; onChange: (p: Partial<ContractField>) => void; onRemove: () => void }) {
  const problem = fieldProblem(f, keys, classes);
  const rules = f.rules ?? [];
  const setRule = (i: number, r: NamedRule) => onChange({ rules: rules.map((x, j) => (j === i ? r : x)) });
  const src = f.valuesSource;
  return (
    <Section title={`Question: ${f.label}`} meta={<bdi dir="ltr">{f.key}</bdi>}>
      {problem ? <p role="alert" className="text-sm text-alert">{problem}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">Label, in plain words<input className={input} value={f.label} onChange={e => onChange({ label: e.target.value })} /></label>
        <label className="block text-sm md:col-span-2">Hint (what to write, an example)<input className={input} value={f.hint ?? ''} onChange={e => onChange({ hint: e.target.value || undefined })} /></label>
        <label className="block text-sm">Type<select className={input} value={f.type} onChange={e => onChange({ type: e.target.value })}>{FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></label>
        <label className="block text-sm">Section (questions with the same section share a page)<input className={input} value={f.section ?? ''} onChange={e => onChange({ section: e.target.value || undefined })} /></label>
        <label className="block text-sm">Personal-data class<select className={input} value={f.personalDataClass ?? (f.personal ? 'personal' : 'administrative')} onChange={e => onChange({ personalDataClass: e.target.value as ContractField['personalDataClass'], personal: undefined })}>{DATA_CLASSES.map(c => <option key={c.key} value={c.key}>{c.label}: {c.meaning}</option>)}</select></label>
        <label className="block text-sm">Secrecy the law attaches<select className={input} value={f.confidentiality ?? ''} onChange={e => onChange({ confidentiality: (e.target.value || undefined) as ContractField['confidentiality'] })}><option value="">None</option>{CONFIDENTIALITY.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
        <label className="flex min-h-tap items-center gap-2 text-sm"><input type="checkbox" checked={!!f.required} onChange={e => onChange({ required: e.target.checked || undefined })} /> Required on the applicant&apos;s form</label>
        <label className="block text-sm">Answered by<select className={input} value={f.audience ?? 'applicant'} onChange={e => onChange({ audience: e.target.value === 'officer' ? 'officer' : undefined })}><option value="applicant">The applicant (on the form)</option><option value="officer">An official (at a step)</option></select></label>
        {['enum', 'registryReference', 'identifierReference', 'party', 'document', 'group'].includes(f.type) ? <label className="flex min-h-tap items-center gap-2 text-sm"><input type="checkbox" checked={!!f.multiple} onChange={e => onChange({ multiple: e.target.checked || undefined })} /> Several answers</label> : null}
        {f.type === 'registryReference' ? <label className="block text-sm">Register<select className={input} value={f.register ?? ''} onChange={e => onChange({ register: e.target.value })}><option value="">Choose</option>{REFERENCE_REGISTERS.map(r => <option key={r.key} value={r.key}>{r.label}{r.connected ? '' : ' (not on the platform yet)'}</option>)}</select></label> : null}
        {f.type === 'identifierReference' ? <label className="block text-sm">Identifier, in words<input className={input} value={f.identifier?.scheme ?? ''} onChange={e => onChange({ identifier: { scheme: e.target.value } })} /></label> : null}
        {f.type === 'document' ? <label className="block text-sm">Evidence it asks for<select className={input} value={f.evidence ?? ''} onChange={e => onChange({ evidence: e.target.value })}><option value="">Choose</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></label> : null}
        {f.type === 'quantity' ? <label className="block text-sm">Units (comma separated)<input className={input} value={(f.units ?? []).join(', ')} onChange={e => onChange({ units: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label> : null}
        {f.type === 'choice' ? <label className="block text-sm md:col-span-2">Options (one per line)<textarea className={`${input} min-h-[5rem]`} value={(f.options ?? []).join('\n')} onChange={e => onChange({ options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} /></label> : null}
      </div>
      {f.type === 'enum' ? (
        <fieldset className="mt-3 rounded-sm border border-line p-3">
          <legend className="px-1 text-sm font-semibold">Where the list comes from (an approved source only)</legend>
          <select aria-label="Kind of list" className={input} value={src?.kind ?? 'list'} onChange={e => {
            const k = e.target.value as ValuesSource['kind'];
            onChange({ valuesSource: k === 'list' ? { kind: 'list', values: [{ value: 'yes', label: 'Yes' }] } : k === 'regions' ? { kind: 'regions' } : k === 'register' ? { kind: 'register', register: VALUE_REGISTERS[0]!.key } : k === 'rules' ? { kind: 'rules', prefix: 'tax.' } : k === 'tariff' ? { kind: 'tariff', rule: 'customs.tariff' } : { kind: 'configured', list: lists[0] ?? 'configured_list' } });
          }}>
            <option value="list">A list approved with this procedure</option><option value="configured">A list the nation configures (named)</option><option value="regions">The nation&apos;s regions</option><option value="register">A register list</option><option value="rules">Approved rules in force</option><option value="tariff">An approved tariff</option>
          </select>
          {src?.kind === 'list' ? <label className="mt-2 block text-sm">Values, one per line: value | label<textarea className={`${input} min-h-[6rem] font-mono`} dir="ltr" defaultValue={listText(src.values)} onBlur={e => onChange({ valuesSource: { kind: 'list', values: parseList(e.target.value) } })} /></label> : null}
          {src?.kind === 'register' ? <select aria-label="Register list" className={`${input} mt-2`} value={src.register} onChange={e => onChange({ valuesSource: { kind: 'register', register: e.target.value } })}>{VALUE_REGISTERS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select> : null}
          {src?.kind === 'rules' ? <label className="mt-2 block text-sm">Rule key prefix (ends with a dot)<input className={`${input} font-mono`} dir="ltr" value={src.prefix} onChange={e => onChange({ valuesSource: { kind: 'rules', prefix: e.target.value } })} /></label> : null}
          {src?.kind === 'tariff' ? <label className="mt-2 block text-sm">Tariff rule<input className={`${input} font-mono`} dir="ltr" value={src.rule} onChange={e => onChange({ valuesSource: { kind: 'tariff', rule: e.target.value } })} /></label> : null}
          {src?.kind === 'configured' ? <label className="mt-2 block text-sm">List name (its values are set under Form details)<input className={`${input} font-mono`} dir="ltr" list="designer-lists" value={src.list} onChange={e => onChange({ valuesSource: { kind: 'configured', list: e.target.value } })} /><datalist id="designer-lists">{lists.map(l => <option key={l} value={l} />)}</datalist></label> : null}
        </fieldset>
      ) : null}
      <fieldset className="mt-3 rounded-sm border border-line p-3">
        <legend className="px-1 text-sm font-semibold">Rules (named rules only) and their error text</legend>
        <ul className="space-y-3">
          {rules.map((r, i) => (
            <li key={i} className="rounded-sm border border-line p-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{RULE_LABEL[r.rule]}</strong><button type="button" className="text-sm text-link underline focus-ring" onClick={() => onChange({ rules: rules.filter((_, j) => j !== i) })}>Remove</button></div>
              <RuleParams r={r} keys={keys.filter(k => k !== f.key)} services={contract.services} onChange={x => setRule(i, x)} />
              <label className="mt-1 block text-xs">Error text (plain words; empty uses the standard text)<input className={input} value={f.errors?.[r.rule] ?? ''} onChange={e => onChange({ errors: { ...(f.errors ?? {}), [r.rule]: e.target.value || undefined } })} /></label>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-sm">Add a rule<select id={`add-rule-${f.key}`} className={input} defaultValue="length">{RULES.map(r => <option key={r} value={r}>{RULE_LABEL[r]}</option>)}</select></label>
          <Button type="button" variant="secondary" onClick={() => { const sel = document.getElementById(`add-rule-${f.key}`) as HTMLSelectElement | null; const r = (sel?.value ?? 'length') as NamedRule['rule']; onChange({ rules: [...rules, blankRule(r, f, keys)] }); }}>Add rule</Button>
        </div>
        {f.required ? <label className="mt-2 block text-xs">Error text when it is not answered<input className={input} value={f.errors?.required ?? ''} onChange={e => onChange({ errors: { ...(f.errors ?? {}), required: e.target.value || undefined } })} /></label> : null}
      </fieldset>
      <Button type="button" variant="ghost" className="mt-2" onClick={onRemove}>Remove this question</Button>
    </Section>
  );
}

function RuleParams({ r, keys, services, onChange }: { r: NamedRule; keys: string[]; services: { id: string; title: string }[]; onChange: (r: NamedRule) => void }) {
  const num = (v: string) => (v === '' ? undefined : Number(v));
  switch (r.rule) {
    case 'length': case 'range': return <div className="mt-1 flex gap-2"><label className="text-xs">Minimum<input className={input} dir="ltr" value={r.min ?? ''} onChange={e => onChange({ ...r, min: num(e.target.value) })} /></label><label className="text-xs">Maximum<input className={input} dir="ltr" value={r.max ?? ''} onChange={e => onChange({ ...r, max: num(e.target.value) })} /></label></div>;
    case 'minItems': return <label className="mt-1 block text-xs">At least<input className={input} dir="ltr" value={r.min} onChange={e => onChange({ ...r, min: Number(e.target.value) || 1 })} /></label>;
    case 'maxItems': return <label className="mt-1 block text-xs">At most<input className={input} dir="ltr" value={r.max} onChange={e => onChange({ ...r, max: Number(e.target.value) || 1 })} /></label>;
    case 'pattern': return <select aria-label="Pattern" className={input} value={r.pattern} onChange={e => onChange({ ...r, pattern: e.target.value })}>{Object.entries(PATTERNS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select>;
    case 'requiredWhen': return <div className="mt-1 grid gap-2 sm:grid-cols-3"><label className="text-xs">When<select className={input} value={r.field} onChange={e => onChange({ ...r, field: e.target.value })}>{keys.map(k => <option key={k} value={k}>{k}</option>)}</select></label><label className="text-xs">is<input className={input} value={r.equals ?? ''} onChange={e => onChange({ rule: 'requiredWhen', field: r.field, ...(e.target.value ? { equals: e.target.value } : {}) })} /></label><label className="text-xs">or is not<input className={input} value={r.notEquals ?? ''} onChange={e => onChange({ rule: 'requiredWhen', field: r.field, ...(e.target.value ? { notEquals: e.target.value } : {}) })} /></label></div>;
    case 'notAfter': case 'notBefore': return <select aria-label="Compared with" className={input} value={r.than} onChange={e => onChange({ ...r, than: e.target.value })}><option value="today">Today</option>{keys.map(k => <option key={k} value={k}>{k}</option>)}</select>;
    case 'existingRecord': return <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={!!r.active} onChange={e => onChange({ ...r, active: e.target.checked || undefined })} /> Must be active</label>;
    case 'profile': return <select aria-label="Configured check" className={input} value={r.profile} onChange={e => onChange({ ...r, profile: e.target.value })}>{Object.entries(PROFILES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}{PROFILES[r.profile] ? null : <option value={r.profile}>{r.profile}</option>}</select>;
    case 'verifyWith': return (
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Exchange service<select className={input} value={r.service} onChange={e => onChange({ ...r, service: e.target.value })}>{services.map(s => <option key={s.id} value={s.id}>{s.id}: {s.title}</option>)}</select></label>
        <label className="text-xs">Purpose<input className={input} value={r.purpose} onChange={e => onChange({ ...r, purpose: e.target.value })} /></label>
        <label className="text-xs">Law that allows it: instrument<input className={input} dir="ltr" value={r.basis?.instrument ?? ''} onChange={e => onChange({ ...r, basis: { instrument: e.target.value, eId: r.basis?.eId ?? '' } })} /></label>
        <label className="text-xs">provision (eId)<input className={input} dir="ltr" value={r.basis?.eId ?? ''} onChange={e => onChange({ ...r, basis: { instrument: r.basis?.instrument ?? '', eId: e.target.value } })} /></label>
      </div>
    );
    default: return null;
  }
}

function FormMetaEditor({ work, setForm, setDocs }: { work: Pkg; setForm: (p: Partial<FormSpec>) => void; setDocs: (d: ContractDocument[]) => void }) {
  const f = work.form;
  return (
    <Section title="Form details and evidence" meta={f ? `form ${f.version}` : 'no form yet: give it a version to start one'}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">Form version<input className={`${input} font-mono`} dir="ltr" value={f?.version ?? ''} onChange={e => setForm({ version: e.target.value })} /></label>
        <label className="block text-sm">Evidence policy (version name)<input className={input} value={f?.evidencePolicy ?? ''} onChange={e => setForm({ evidencePolicy: e.target.value || undefined })} /></label>
        <label className="block text-sm md:col-span-2">Introduction: who should use the form, what happens next<textarea className={`${input} min-h-[4rem]`} value={f?.intro ?? ''} onChange={e => setForm({ intro: e.target.value || undefined })} /></label>
        <label className="block text-sm md:col-span-2">Declaration the applicant confirms (empty: none)<textarea className={`${input} min-h-[3rem]`} value={f?.declaration?.text ?? ''} onChange={e => setForm({ declaration: e.target.value ? { text: e.target.value, version: f?.declaration?.version ?? '1' } : undefined })} /></label>
        {f?.declaration ? <label className="block text-sm">Declaration wording version<input className={`${input} font-mono`} dir="ltr" value={f.declaration.version} onChange={e => setForm({ declaration: { text: f.declaration!.text, version: e.target.value } })} /></label> : null}
      </div>
      {Object.entries(f?.lists ?? {}).length ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold">Lists the nation configures, approved with this version</p>
          {Object.entries(f!.lists!).map(([name, l]) => (
            <label key={name} className="block text-sm"><bdi dir="ltr">{name}</bdi>{l.proposed ? ' (proposed by CivicOS: check against the law; saving here makes them the nation\'s)' : ''}
              <textarea className={`${input} min-h-[5rem] font-mono`} dir="ltr" defaultValue={listText(l.values)} onBlur={e => setForm({ lists: { ...f!.lists, [name]: { values: parseList(e.target.value) } } })} />
            </label>
          ))}
        </div>
      ) : null}
      <div className="mt-3 space-y-3">
        <p className="text-sm font-semibold">Evidence</p>
        {work.documents.map((d, i) => {
          const set = (p: Partial<ContractDocument>) => setDocs(work.documents.map((x, j) => (j === i ? { ...x, ...p } : x)));
          const c = d.citation as (ContractDocument['citation'] & { instrument?: string; eId?: string }) | undefined;
          return (
            <fieldset key={d.class} className="rounded-sm border border-line p-3">
              <legend className="px-1 text-sm font-semibold"><bdi dir="ltr">{d.class}</bdi></legend>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="block text-sm">Label<input className={input} value={d.label} onChange={e => set({ label: e.target.value })} /></label>
                <label className="flex min-h-tap items-center gap-2 text-sm"><input type="checkbox" checked={d.required} onChange={e => set({ required: e.target.checked })} /> Required</label>
                <label className="block text-sm">Why it is needed<input className={input} value={d.purpose ?? ''} onChange={e => set({ purpose: e.target.value || undefined })} /></label>
                <label className="block text-sm">Accepted formats (comma separated)<input className={input} value={(d.formats ?? []).join(', ')} onChange={e => set({ formats: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
                <label className="block text-sm md:col-span-2">Authorised alternative (where the law allows one)<input className={input} value={d.alternative ?? ''} onChange={e => set({ alternative: e.target.value || undefined })} /></label>
                <label className="block text-sm">Required by: instrument (from the laws register)<input className={`${input} font-mono`} dir="ltr" value={c?.instrument ?? ''} onChange={e => set({ citation: (e.target.value ? { instrument: e.target.value, eId: c?.eId ?? '' } : undefined) as ContractDocument['citation'] })} /></label>
                <label className="block text-sm">provision (eId)<input className={`${input} font-mono`} dir="ltr" value={c?.eId ?? ''} onChange={e => set({ citation: ({ instrument: c?.instrument ?? '', eId: e.target.value }) as ContractDocument['citation'] })} /></label>
                {c?.version ? <p className="text-xs text-ink-muted md:col-span-2">Cited: <bdi dir="ltr">{citationText(c)}</bdi></p> : <p className="text-xs text-ink-muted md:col-span-2">Cited from the laws register when saved (the version in force today).</p>}
              </div>
            </fieldset>
          );
        })}
      </div>
    </Section>
  );
}

function DaysEditor({ work, onChange }: { work: Pkg; onChange: (d: Deadline[], a?: Pkg['appeal']) => void }) {
  if (!work.deadlines.length && !work.appeal) return null;
  return (
    <Section title="Day counts the nation's law gives" meta="set before approval; never typed by the platform">
      <div className="grid gap-3 md:grid-cols-2">
        {work.deadlines.map((d, i) => (
          <label key={d.key} className="block text-sm">{d.label} ({d.calendar} days, from {d.from})
            <input className={`${input} max-w-[8rem]`} dir="ltr" inputMode="numeric" value={d.days ?? ''} placeholder={d.sampleDays ? `sample ${d.sampleDays}` : ''} onChange={e => onChange(work.deadlines.map((x, j) => (j === i ? { ...x, days: e.target.value === '' ? undefined : Number(e.target.value) } : x)), work.appeal)} />
          </label>
        ))}
        {work.appeal ? (
          <label className="block text-sm">Appeal to {work.appeal.body} (calendar days)
            <input className={`${input} max-w-[8rem]`} dir="ltr" inputMode="numeric" value={work.appeal.days ?? ''} placeholder={work.appeal.sampleDays ? `sample ${work.appeal.sampleDays}` : ''} onChange={e => onChange(work.deadlines, { ...work.appeal!, days: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </label>
        ) : null}
      </div>
    </Section>
  );
}

function TranslationsEditor({ work, languages, lang, setLang, setForm }: { work: Pkg; languages: string[]; lang: string; setLang: (l: string) => void; setForm: (p: Partial<FormSpec>) => void }) {
  const others = languages.filter(l => l !== 'en');
  if (!others.length || !work.form) return <Section title="Translations" meta="the nation has one official language"><p className="text-sm text-ink-muted">When the nation adds official languages in setup, each string of the form is translated here and reviewed with the procedure.</p></Section>;
  const l = lang && lang !== 'en' ? lang : others[0]!;
  const st = translationStatus(work.fields, work.documents, work.form, l);
  const entries = work.form.translations?.[l] ?? {};
  return (
    <Section title="Translations" meta={`${st.translated} of ${st.total} up to date · ${st.stale.length} out of date · ${st.missing.length} missing`}>
      <label className="block text-sm">Language<select className={`${input} max-w-xs`} value={l} onChange={e => setLang(e.target.value)}>{others.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      <p className="text-xs text-ink-muted">Each translation is kept with the English it was made from: when the English changes, the translation is out of date and the English shows until it is translated again. Translations are approved with the procedure.</p>
      <ul className="mt-2 max-h-96 space-y-2 overflow-auto">
        {formStrings(work.fields, work.documents, work.form).map(s => {
          const e = entries[s.path];
          const stale = e && e.source !== s.text;
          return (
            <li key={s.path} className="grid gap-1 md:grid-cols-2">
              <span className="text-sm">{s.text}{stale ? <span className="ms-2 text-xs font-semibold text-warn">out of date</span> : null}</span>
              <input aria-label={`Translation of: ${s.text}`} className={input} lang={l} value={e?.target ?? ''} onChange={ev => setForm({ translations: { ...(work.form!.translations ?? {}), [l]: { ...entries, [s.path]: { source: s.text, target: ev.target.value } } } })} />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
