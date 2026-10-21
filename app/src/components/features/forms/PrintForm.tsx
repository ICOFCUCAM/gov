// The paper form, printed from the same definition as the screens (plan
// §3.1): every question the applicant answers with its label, hint and
// answer space, the evidence list with the provision and version that
// requires each piece, the notices, the declaration with signature and date,
// and an office-use box. Its footer names the procedure, its version and the
// form version, so a paper form transcribed later is recorded under the
// version it was filled in.

import * as React from 'react';
import { CONTACT_METHODS, DOCUMENT_ANSWERS, LOCATION_KINDS, type FieldView, type FormView } from '@/lib/forms/contract';
import { pagesOf } from './answers';

const Box = ({ lines = 1 }: { lines?: number }) => (
  <span className="mt-1 block border border-ink/70" style={{ minHeight: `${lines * 1.9}rem` }} aria-hidden="true" />
);
const Tick = ({ label }: { label: string }) => <span className="me-6 inline-flex items-center gap-2 py-0.5"><span className="inline-block h-4 w-4 border border-ink/80" aria-hidden="true" />{label}</span>;

function Answer({ f }: { f: FieldView }) {
  switch (f.type) {
    case 'longtext': return <Box lines={5} />;
    case 'boolean': return <div><Tick label="Yes" /><Tick label="No" /></div>;
    case 'choice': case 'enum': return f.choices?.length ? <div>{f.multiple ? <span className="block text-xs">Tick all that apply.</span> : <span className="block text-xs">Tick one.</span>}{f.choices.map(c => <Tick key={c.value} label={c.label} />)}</div> : <p className="text-xs">Choices: {f.choicesFrom} (ask the office for the list in force).</p>;
    case 'document': return <div>{DOCUMENT_ANSWERS.map(a => <Tick key={a.value} label={a.label} />)}</div>;
    case 'address': return <div className="grid gap-1 text-xs"><span>Building and street, or a landmark</span><Box /><span>Town, village or locality</span><Box /><span>Region · Postcode</span><Box /></div>;
    case 'point': return <div className="grid grid-cols-2 gap-3 text-xs"><span>Latitude<Box /></span><span>Longitude<Box /></span></div>;
    case 'location': return <div className="text-xs">{LOCATION_KINDS.filter(k => (f.locationKinds ?? LOCATION_KINDS.map(x => x.key)).includes(k.key)).map(k => <Tick key={k.key} label={k.label} />)}<Box lines={2} /></div>;
    case 'party': return <div className="grid gap-1 text-xs"><span>Full name, as written</span><Box /><span>Register reference (if any)</span><Box />{f.multiple ? <span>Add more on a separate sheet, numbered.</span> : null}</div>;
    case 'dateRange': return <div className="grid grid-cols-2 gap-3 text-xs"><span>From (YYYY-MM-DD)<Box /></span><span>To<Box /></span></div>;
    case 'quantity': return <div className="grid grid-cols-2 gap-3 text-xs"><span>Amount<Box /></span><span>Unit{f.units?.length ? ` (${f.units.join(', ')})` : ''}<Box /></span></div>;
    case 'contact': return <div className="text-xs">{CONTACT_METHODS.filter(m => (f.contactMethods ?? CONTACT_METHODS.map(x => x.key)).includes(m.key)).map(m => <Tick key={m.key} label={m.label} />)}<Box /></div>;
    case 'money': return <div className="text-xs">Amount<Box /></div>;
    case 'attestation': return <div className="text-sm">{f.attestation?.statements.map(s => <p key={s.key} className="flex gap-2 py-0.5"><span className="mt-0.5 inline-block h-4 w-4 shrink-0 border border-ink/80" aria-hidden="true" />{s.text}</p>)}<div className="mt-2 grid grid-cols-2 gap-3 text-xs"><span>Signature<Box lines={2} /></span><span>Date<Box /></span></div></div>;
    case 'group': return <div className="grid gap-2 border-s-2 border-ink/40 ps-3">{(f.items ?? []).map(i => <div key={i.key}><span className="text-xs font-semibold">{i.label}</span><Answer f={i} /></div>)}{f.multiple ? <span className="text-xs">Repeat for each, on a separate sheet if needed.</span> : null}</div>;
    case 'geometry': return <div className="text-xs">Attach a map or survey plan showing it.<Box lines={3} /></div>;
    default: return <Box />;
  }
}

export function PrintForm({ view }: { view: FormView }) {
  const fields = view.fields.filter(f => (f.audience ?? 'applicant') === 'applicant');
  const pages = pagesOf(fields);
  return (
    <article className="mx-auto max-w-[48rem] bg-surface p-6 text-ink print:p-0" dir={view.dir} lang={view.locale}>
      <header className="border-b-2 border-ink pb-3">
        <p className="text-xs uppercase tracking-wide">Application form</p>
        <h1 className="text-2xl font-bold">{view.procedure.title}</h1>
        {view.form?.intro ? <p className="mt-2 text-sm">{view.form.intro}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-3 border border-ink p-2 text-xs">
          <span>For office use · Reference<Box /></span>
          <span>Received on, by<Box /></span>
          <span>Identity evidence seen (kind only)<Box /></span>
          <span>Transcribed by<Box /></span>
        </div>
      </header>
      <ol className="mt-4 space-y-5">
        {pages.map((p, i) => (
          <li key={i} className="break-inside-avoid">
            <h2 className="border-b border-ink/50 text-base font-bold">{i + 1}. {p.title}</h2>
            <div className="mt-2 space-y-3">
              {p.fields.map(f => (
                <div key={f.key} className="break-inside-avoid">
                  <p className="text-sm font-semibold">{f.label}{f.required ? '' : ' (optional)'}</p>
                  {f.hint ? <p className="text-xs">{f.hint}</p> : null}
                  {f.ruleText.filter(r => r !== 'Required').length ? <p className="text-xs italic">{f.ruleText.filter(r => r !== 'Required').join(' · ')}</p> : null}
                  <Answer f={f} />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {view.documents.length ? (
        <section className="mt-6 break-inside-avoid">
          <h2 className="border-b border-ink/50 text-base font-bold">Evidence to provide</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {view.documents.map(d => (
              <li key={d.class}>
                <strong>{d.label}</strong>{d.required ? ' (required)' : ' (if it applies)'}
                {d.purpose ? <span className="block text-xs">{d.purpose}</span> : null}
                {d.formats?.length ? <span className="block text-xs">Accepted: {d.formats.join(', ')}</span> : null}
                {d.alternative ? <span className="block text-xs">Authorised alternative: {d.alternative}</span> : null}
                <span className="block text-xs">Required by: {d.requiredBy ? <bdi dir="ltr">{d.requiredBy}</bdi> : 'the procedure (the provision is cited when the nation approves it)'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {view.form?.declaration ? (
        <section className="mt-6 break-inside-avoid">
          <h2 className="border-b border-ink/50 text-base font-bold">Declaration</h2>
          <p className="mt-2 text-sm">{view.form.declaration.text}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs"><span>Signature<Box lines={2} /></span><span>Date<Box /></span></div>
        </section>
      ) : null}
      {view.form?.notices?.length ? (
        <section className="mt-6 break-inside-avoid text-xs">
          {view.form.notices.map(n => <p key={n.key} className="mt-1"><strong>{n.title}.</strong> {n.text}</p>)}
        </section>
      ) : null}
      <footer className="mt-6 border-t border-ink pt-2 text-[0.7rem]">
        <bdi dir="ltr">{view.procedure.key} · procedure version {view.procedure.version}{view.form ? ` · form ${view.form.version}` : ''}{view.form?.evidencePolicy ? ` · evidence policy ${view.form.evidencePolicy}` : ''}</bdi>
        {view.procedure.state !== 'approved' ? <span> · DRAFT: not yet approved, not for use</span> : null}
      </footer>
    </article>
  );
}
