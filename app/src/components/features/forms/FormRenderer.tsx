'use client';

// One form definition, three channels (plan §3.1; spec Part 1 §11, Part 6):
//
//   self-service  the applicant, one thing per page: a start page that says
//                 what is needed (the evidence and the law that requires it),
//                 a page per section, check your answers with a way back to
//                 each, the declaration, then a receipt. Answers are saved on
//                 the device as they go (save and come back; offline-safe).
//   assisted      an official at an office fills the same questions with the
//                 applicant on one page, records which identity evidence they
//                 saw (never its number) and where, checks the answers with
//                 the applicant and gives the receipt.
//   paper         an official transcribes a paper form; the case records that
//                 it came on paper. The printed form is <PrintForm>.
//
// The browser checks answers with the same functions and messages the server
// uses (lib/forms/contract.ts checkAnswers()); the server decides, and its
// refusal names the answers it concerns, shown the same way. Errors are
// summarised at the top with links to each question, and said beside it.

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { checkAnswers, optionsOf, shown, type Channel, type FieldError, type FieldView, type FormView } from '@/lib/forms/contract';
import { FormField } from './FormField';
import { FormState } from './FormState';
import { answerText, pagesOf } from './answers';
import type { Receipt } from '@/lib/forms/receipt';

export interface Submission {
  fields: Record<string, unknown>;
  declaration?: { version: string };
  assisted?: { identityEvidence: string; servicePoint?: string };
  paper?: { receivedOn?: string };
  locale: string;
  idempotencyKey: string;
}
export type SubmitResult = { ok: true; receipt: Receipt } | { ok: false; error: string; fieldErrors?: FieldError[] };

export interface FormRendererProps {
  view: FormView;
  channel: Channel;
  /** Sends the answers (none in a preview). */
  submit?: (s: Submission) => Promise<SubmitResult>;
  /** A designer's preview: nothing is sent or saved. */
  preview?: boolean;
  /** A demonstration installation: shown marked Sample. */
  sample?: boolean;
  /** Initial answers (a preview's example, or a test). */
  initial?: Record<string, unknown>;
}

const storeKey = (v: FormView, c: Channel) => `civicos.form.${v.procedure.key}.${c}`;
interface Saved { answers: Record<string, unknown>; formVersion: string; procedureVersion: number; savedAt: string; idem: string; step?: number }
function load(v: FormView, c: Channel): Saved | null {
  try { const s = window.localStorage.getItem(storeKey(v, c)); return s ? (JSON.parse(s) as Saved) : null; } catch { return null; }
}
function save(v: FormView, c: Channel, s: Saved) { try { window.localStorage.setItem(storeKey(v, c), JSON.stringify(s)); } catch { /* private mode: answers stay in the page */ } }
function clear(v: FormView, c: Channel) { try { window.localStorage.removeItem(storeKey(v, c)); } catch { /* nothing saved */ } }
const newKey = () => `form-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const formVersion = (v: FormView) => v.form?.version ?? `procedure-${v.procedure.version}`;

export function FormRenderer({ view, channel, submit, preview, sample, initial }: FormRendererProps) {
  const applicantFields = React.useMemo(() => view.fields.filter(f => (f.audience ?? 'applicant') === 'applicant'), [view]);
  const pages = React.useMemo(() => pagesOf(applicantFields), [applicantFields]);
  const [answers, setAnswers] = React.useState<Record<string, unknown>>(initial ?? {});
  const [step, setStep] = React.useState<number>(channel === 'self-service' ? -1 : 0); // self-service: -1 start, 0..n-1 pages, n check; others: 0 the form, 1 check
  const [errors, setErrors] = React.useState<FieldError[]>([]);
  const [declared, setDeclared] = React.useState(false);
  const [evidenceSeen, setEvidenceSeen] = React.useState('');
  const [servicePoint, setServicePoint] = React.useState('');
  const [receivedOn, setReceivedOn] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<Receipt | null>(null);
  const [online, setOnline] = React.useState(true);
  const [stale, setStale] = React.useState(false);
  const [resumed, setResumed] = React.useState<string | null>(null);
  const idem = React.useRef(newKey());
  const summary = React.useRef<HTMLDivElement>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);

  // Save and come back: answers on this device (never in a preview), resumed on return; a changed form is said so.
  React.useEffect(() => {
    if (preview || initial) return;
    const s = load(view, channel);
    if (!s) return;
    setAnswers(s.answers); idem.current = s.idem || idem.current;
    setResumed(s.savedAt);
    if (s.formVersion !== formVersion(view) || s.procedureVersion !== view.procedure.version) setStale(true);
  }, [view, channel, preview, initial]);
  React.useEffect(() => {
    if (preview || receipt) return;
    if (Object.keys(answers).length) save(view, channel, { answers, formVersion: formVersion(view), procedureVersion: view.procedure.version, savedAt: new Date().toISOString(), idem: idem.current, step });
  }, [answers, view, channel, preview, receipt, step]);
  React.useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener('online', up); window.addEventListener('offline', up);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', up); };
  }, []);
  React.useEffect(() => { if (errors.length || refusal) summary.current?.focus(); }, [errors, refusal]);
  React.useEffect(() => { if (channel === 'self-service' && step >= 0) heading.current?.focus(); }, [step, channel]);

  const today = new Date().toISOString().slice(0, 10);
  const check = (fields: FieldView[]) => {
    const asked = fields.filter(f => shown(f, answers));
    const given = Object.fromEntries(Object.entries(answers).filter(([k, v]) => asked.some(f => f.key === k) && v !== '' && v !== undefined));
    return checkAnswers(asked, given, { mode: 'submit', options: optionsOf(view), currency: view.currency, regions: view.regions, documents: view.documents, today, existing: answers }).errors.filter(e => asked.some(f => f.key === e.field));
  };
  const set = (k: string, v: unknown) => { setAnswers(a => ({ ...a, [k]: v })); setErrors(es => es.filter(e => e.field !== k)); };
  const errorOf = (k: string) => errors.find(e => e.field === k)?.message;
  const officerFields = channel === 'assisted' || channel === 'paper';

  const allChecks = (): FieldError[] => {
    const es = check(applicantFields);
    if (view.form?.declaration && !declared) es.push({ field: 'declaration', rule: 'required', message: 'Confirm the declaration' });
    if (channel === 'assisted' && !evidenceSeen) es.push({ field: 'identityEvidence', rule: 'required', message: 'Record the identity evidence you saw' });
    return es;
  };

  const send = async () => {
    const es = allChecks();
    setErrors(es); setRefusal(null);
    if (es.length) { if (channel === 'self-service') { const i = pages.findIndex(p => p.fields.some(f => es.some(e => e.field === f.key))); if (i >= 0) setStep(i); } else setStep(0); return; }
    if (preview || !submit) { setRefusal('Preview: nothing is sent.'); return; }
    if (!online) { setRefusal('You are offline. Your answers are saved on this device: send them when you are connected.'); return; }
    setBusy(true);
    const fields = Object.fromEntries(Object.entries(answers).filter(([k, v]) => v !== '' && v !== undefined && applicantFields.some(f => f.key === k && shown(f, answers))));
    const r = await submit({
      fields, locale: view.locale, idempotencyKey: idem.current,
      ...(view.form?.declaration ? { declaration: { version: view.form.declaration.version } } : {}),
      ...(channel === 'assisted' ? { assisted: { identityEvidence: evidenceSeen, ...(servicePoint.trim() ? { servicePoint: servicePoint.trim() } : {}) } } : {}),
      ...(channel === 'paper' ? { paper: { ...(receivedOn ? { receivedOn } : {}) } } : {}),
    }).catch((e): SubmitResult => ({ ok: false, error: `Not sent: ${(e as Error).message}. Your answers are saved on this device; try again.` }));
    setBusy(false);
    if (r.ok) { setReceipt(r.receipt); clear(view, channel); return; }
    setRefusal(r.error);
    if (r.fieldErrors?.length) {
      setErrors(r.fieldErrors);
      if (channel === 'self-service') { const i = pages.findIndex(p => p.fields.some(f => r.fieldErrors!.some(e => e.field === f.key))); setStep(i >= 0 ? i : pages.length); }
      else setStep(0);
    }
  };

  if (receipt) return <ReceiptView receipt={receipt} view={view} channel={channel} onAnother={() => { setReceipt(null); setAnswers({}); setStep(channel === 'self-service' ? -1 : 0); idem.current = newKey(); setDeclared(false); setEvidenceSeen(''); }} />;

  const states = (
    <div className="space-y-2">
      {sample ? <FormState kind="sample" /> : null}
      {view.procedure.state !== 'approved' ? <FormState kind="waiting" detail={view.procedure.library ? 'This form waits in the form library: its service is built in a later step, and it is used only once the responsible institution approves the procedure it belongs to.' : undefined} /> : null}
      {!online ? <FormState kind="offline" /> : null}
      {stale ? <FormState kind="stale" action={<button type="button" className="text-sm text-link underline focus-ring" onClick={() => setStale(false)}>I will check my answers</button>} /> : null}
      {resumed && !stale && channel === 'self-service' && step === -1 ? <p role="status" className="text-sm text-ink-soft">Your answers saved on this device on {resumed.slice(0, 16).replace('T', ' ')} are back. <button type="button" className="text-link underline focus-ring" onClick={() => { clear(view, channel); setAnswers({}); setResumed(null); idem.current = newKey(); }}>Start again instead</button></p> : null}
    </div>
  );

  const errorSummary = (errors.length || refusal) ? (
    <div ref={summary} tabIndex={-1} role="alert" aria-labelledby="form-errors-title" className="rounded-sm border-s-4 border-alert bg-surface-2 px-4 py-3 focus-ring">
      <h2 id="form-errors-title" className="text-base font-bold text-ink">There is a problem</h2>
      {refusal && !errors.length ? <p className="mt-1 text-sm">{refusal}</p> : null}
      {errors.length ? (
        <ul className="mt-1 list-disc space-y-1 ps-5 text-sm">
          {errors.map(e => <li key={`${e.field}-${e.rule}`}><a className="font-semibold text-link underline" href={`#${e.field === 'declaration' ? 'form-declaration' : e.field === 'identityEvidence' ? 'form-identity' : `field-${e.field}`}`}>{e.message}</a></li>)}
        </ul>
      ) : null}
    </div>
  ) : null;

  const fieldList = (fs: FieldView[]) => (
    <div className="space-y-6">
      {fs.filter(f => shown(f, answers)).map(f => {
        const d = f.type === 'document' ? view.documents.find(x => x.class === f.evidence) : undefined;
        return <FormField key={f.key} f={f} value={answers[f.key]} error={errorOf(f.key)} currency={view.currency} regions={view.regions} onChange={v => set(f.key, v)} disabled={busy}
          evidence={d ? { purpose: d.purpose, formats: d.formats, alternative: d.alternative, requiredBy: d.requiredBy } : undefined} />;
      })}
    </div>
  );

  const declarationBlock = view.form?.declaration ? (
    <fieldset id="form-declaration" className={`rounded-sm border border-line p-4 ${errorOf('declaration') ? 'border-s-4 border-s-alert' : ''}`}>
      <legend className="px-1 text-base font-bold">Declaration</legend>
      {errorOf('declaration') ? <p className="text-sm font-semibold text-alert"><span className="sr-only">Error: </span>{errorOf('declaration')}</p> : null}
      <label className="flex min-h-tap items-start gap-3 text-base"><input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={declared} onChange={e => setDeclared(e.target.checked)} /> <span>{view.form.declaration.text}</span></label>
      <p className="mt-1 text-xs text-ink-muted">Wording version <bdi dir="ltr">{view.form.declaration.version}</bdi></p>
    </fieldset>
  ) : null;

  const checkPage = (
    <section aria-labelledby="form-check-title" className="space-y-4">
      <h2 id="form-check-title" ref={channel === 'self-service' ? heading : undefined} tabIndex={-1} className="text-xl font-bold focus-ring">Check your answers before sending</h2>
      {pages.map((p, i) => (
        <div key={i} className="rounded-sm border border-line">
          <h3 className="border-b border-line bg-surface-2 px-3 py-2 text-sm font-semibold">{p.title}</h3>
          <dl className="divide-y divide-line">
            {p.fields.filter(f => shown(f, answers)).map(f => (
              <div key={f.key} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:gap-4">
                <dt className="text-sm font-semibold">{f.label}</dt>
                <dd className="text-sm">{answerText(f, answers[f.key])}</dd>
                <dd><button type="button" className="min-h-tap text-sm text-link underline focus-ring" onClick={() => setStep(channel === 'self-service' ? i : 0)}>Change<span className="sr-only"> {f.label.toLowerCase()}</span></button></dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      {officerFields ? <p className="text-sm text-ink-soft">{channel === 'assisted' ? `Identity evidence seen: ${view.form?.identityEvidence?.find(e => e.key === evidenceSeen)?.label ?? (evidenceSeen || 'not recorded')}${servicePoint ? ` · at ${servicePoint}` : ''}` : `Paper form${receivedOn ? ` received on ${receivedOn}` : ''}`}</p> : null}
      {declarationBlock}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={send} disabled={busy || !online}>{busy ? 'Sending…' : channel === 'self-service' ? 'Send the application' : 'Record the application'}</Button>
        <Button type="button" variant="secondary" onClick={() => setStep(channel === 'self-service' ? pages.length - 1 : 0)}>Back</Button>
      </div>
    </section>
  );

  // ── Assisted and paper: one page, the official's record, then the check ──
  if (channel !== 'self-service') {
    return (
      <div className="space-y-5" dir={view.dir} lang={view.locale} data-channel={channel}>
        {states}
        {errorSummary}
        {step === 0 ? (
          <form noValidate onSubmit={e => { e.preventDefault(); const es = allChecks().filter(x => x.field !== 'declaration'); setErrors(es); setRefusal(null); if (!es.length) setStep(1); }} className="space-y-6">
            <fieldset id="form-identity" className="rounded-sm border border-line bg-surface-2 p-4">
              <legend className="px-1 text-base font-bold">{channel === 'assisted' ? 'Recorded by the official' : 'Paper form'}</legend>
              {channel === 'assisted' ? (
                <>
                  <p className="text-sm text-ink-soft">Which identity document did you see? Record the kind only, never its number.</p>
                  {errorOf('identityEvidence') ? <p className="text-sm font-semibold text-alert"><span className="sr-only">Error: </span>{errorOf('identityEvidence')}</p> : null}
                  {(view.form?.identityEvidence ?? []).map(e => (
                    <label key={e.key} className="flex min-h-tap items-center gap-3 text-base"><input type="radio" className="h-6 w-6" name="identity-evidence" checked={evidenceSeen === e.key} onChange={() => { setEvidenceSeen(e.key); setErrors(es => es.filter(x => x.field !== 'identityEvidence')); }} /> {e.label}</label>
                  ))}
                  {!view.form?.identityEvidence?.length ? <label className="block text-sm">Identity evidence seen<input className="mt-1 block w-full min-h-tap rounded-sm border-2 border-ink/60 bg-surface px-3 text-base focus-ring" value={evidenceSeen} onChange={e => setEvidenceSeen(e.target.value)} /></label> : null}
                  <label htmlFor="form-service-point" className="mt-3 block text-sm">Office or service point (optional)<input id="form-service-point" className="mt-1 block w-full max-w-md min-h-tap rounded-sm border-2 border-ink/60 bg-surface px-3 text-base focus-ring" value={servicePoint} onChange={e => setServicePoint(e.target.value)} /></label>
                </>
              ) : (
                <label htmlFor="form-received" className="block text-sm">Date the paper form was received<input id="form-received" type="date" dir="ltr" className="mt-1 block max-w-xs min-h-tap rounded-sm border-2 border-ink/60 bg-surface px-3 text-base focus-ring" value={receivedOn} onChange={e => setReceivedOn(e.target.value)} /></label>
              )}
            </fieldset>
            {pages.map((p, i) => (
              <section key={i} aria-labelledby={`form-section-${i}`} className="space-y-4">
                <h2 id={`form-section-${i}`} className="border-b border-line pb-1 text-lg font-bold">{p.title}</h2>
                {fieldList(p.fields)}
              </section>
            ))}
            <Button type="submit">Check the answers with the applicant</Button>
          </form>
        ) : checkPage}
      </div>
    );
  }

  // ── Self-service: start page, one section per page, check answers ──
  if (step === -1) {
    return (
      <div className="space-y-5" dir={view.dir} lang={view.locale} data-channel={channel}>
        {states}
        <h2 className="text-2xl font-bold" ref={heading} tabIndex={-1}>{view.procedure.title}</h2>
        {view.form?.intro ? <p className="text-base">{view.form.intro}</p> : null}
        {view.documents.length ? (
          <section aria-labelledby="form-need" className="rounded-sm border border-line p-4">
            <h3 id="form-need" className="text-base font-bold">What you will need</h3>
            <ul className="mt-2 list-disc space-y-2 ps-5 text-sm">
              {view.documents.map(d => (
                <li key={d.class}><strong>{d.label}</strong>{d.required ? '' : ' (if it applies)'}{d.purpose ? <>. {d.purpose}</> : null}
                  {d.requiredBy ? <span className="block text-ink-soft">Required by <bdi dir="ltr">{d.requiredBy}</bdi></span> : null}
                  {d.alternative ? <span className="block text-ink-soft">If you do not have it: {d.alternative}</span> : null}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {view.form?.notices?.length ? <details className="rounded-sm border border-line p-4 text-sm"><summary className="min-h-tap cursor-pointer font-semibold">How your information is used, and your rights</summary>{view.form.notices.map(n => <p key={n.key} className="mt-2"><strong>{n.title}.</strong> {n.text}</p>)}</details> : null}
        <p className="text-sm text-ink-soft">{pages.length} {pages.length === 1 ? 'page' : 'pages'} of questions. Your answers are saved on this device as you go.</p>
        <Button type="button" onClick={() => setStep(0)} disabled={!pages.length}>{resumed ? 'Continue' : 'Start now'}</Button>
        {!pages.length ? <FormState kind="empty" /> : null}
      </div>
    );
  }
  if (step >= pages.length) return <div className="space-y-5" dir={view.dir} lang={view.locale} data-channel={channel}>{states}{errorSummary}{checkPage}</div>;
  const page = pages[step]!;
  return (
    <div className="space-y-5" dir={view.dir} lang={view.locale} data-channel={channel}>
      {states}
      <button type="button" className="min-h-tap text-sm text-link underline focus-ring" onClick={() => { setErrors([]); setStep(step - 1); }}>Back</button>
      {errorSummary}
      <form noValidate onSubmit={e => { e.preventDefault(); const es = check(page.fields); setErrors(es); setRefusal(null); if (!es.length) setStep(step + 1); }} className="space-y-6">
        <p className="text-sm text-ink-soft">Page {step + 1} of {pages.length}</p>
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold focus-ring">{page.title}</h2>
        {fieldList(page.fields)}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit">Continue</Button>
          {!preview ? <span className="text-sm text-ink-soft">Saved on this device</span> : null}
        </div>
      </form>
    </div>
  );
}

function ReceiptView({ receipt, view, channel, onAnother }: { receipt: Receipt; view: FormView; channel: Channel; onAnother: () => void }) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  return (
    <section aria-labelledby="form-receipt" className="space-y-4" dir={view.dir} lang={view.locale} data-channel={channel} data-receipt={receipt.ref}>
      <div className="rounded-sm border-2 border-ok bg-surface px-5 py-4">
        <h2 id="form-receipt" ref={ref} tabIndex={-1} className="text-2xl font-bold focus-ring">Application received</h2>
        <p className="mt-2 text-base">Your reference is</p>
        <p className="font-mono text-2xl font-bold"><bdi dir="ltr">{receipt.ref}</bdi></p>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Received</dt><dd>{receipt.receivedAt.slice(0, 16).replace('T', ' ')} UTC</dd>
        <dt className="font-semibold">Application</dt><dd>{receipt.procedure} (version {receipt.procedureVersion}{receipt.form ? `, form ${receipt.form}` : ''})</dd>
        {receipt.declaration ? <><dt className="font-semibold">Declaration</dt><dd><bdi dir="ltr">{receipt.declaration}</bdi></dd></> : null}
        {receipt.assistedBy ? <><dt className="font-semibold">Taken by</dt><dd>{receipt.assistedBy}{receipt.servicePoint ? `, ${receipt.servicePoint}` : ''}</dd></> : null}
      </dl>
      {receipt.stillToProvide.length ? <div className="rounded-sm border-s-4 border-warn bg-surface-2 px-4 py-3 text-sm"><p className="font-semibold">Still to provide</p><ul className="list-disc ps-5">{receipt.stillToProvide.map(s => <li key={s}>{s}</li>)}</ul><p className="mt-1">Bring or send it with your reference.</p></div> : null}
      {view.form?.notices?.find(n => n.key === 'next') ? <p className="text-sm">{view.form.notices.find(n => n.key === 'next')!.text}</p> : null}
      <div className="flex flex-wrap gap-3 print:hidden">
        <Button type="button" variant="secondary" onClick={() => window.print()}>Print this receipt</Button>
        <Button type="button" variant="ghost" onClick={onAnother}>{channel === 'self-service' ? 'Start another application' : 'Take another application'}</Button>
      </div>
    </section>
  );
}
