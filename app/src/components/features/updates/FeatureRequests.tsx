'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { FeatureRequest, FeatureRequestPriority, UpdateChamber } from '@/lib/api/types';
import {
  ChamberNav, ChamberTabs, Chip, ErrorLine, Loading, Panel, PoweredBy, PRIORITY_LABEL, STAGES, STAGE_LABEL, fmtDate, useActor, useCenterTitle, useLink,
} from './ui';

const PRIORITY_TONE: Record<FeatureRequestPriority, string> = { low: '#a5abb5', normal: '#d9c398', high: '#f1b36b', urgent: '#f1938f' };

/**
 * A nation's special feature requests: submitted from its chamber, then
 * followed through the publisher's pipeline until a nation build delivers
 * them.
 */
export function FeatureRequests() {
  const { link, q } = useLink();
  const [c, setC] = React.useState<UpdateChamber | null>(null);
  const [institutions, setInstitutions] = React.useState<string[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    api.updates.chamber(link).then(r => setC(r.chamber)).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service'));
  }, [link]);
  React.useEffect(() => {
    load();
    api.org.ministries().then(m => setInstitutions(m.ministries.filter(x => x.status !== 'merged').map(x => x.name))).catch(() => setInstitutions([]));
  }, [load]);

  const { nation } = useCenterTitle(c?.nation.name, c?.nation.home ?? true);
  const who = nation || 'this installation';

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="requests" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="requests" />
        <Link href={`/updates${q}`} className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-white/45 no-underline transition-colors hover:text-[#f4e4bd]">← Update Center</Link>
        <div className="mt-6">
          <Eyebrow>Special feature requests</Eyebrow>
          <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
            Ask for what {nation ? <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span> : 'your government'} needs
          </h1>
          <p className="mt-4 max-w-[64ch] text-[15px] font-light leading-relaxed text-white/55">
            Requests go to the platform team, who review, scope and build them into a release made only for {who}. When it is ready it appears in your update chamber — and installs only when you choose.
          </p>
        </div>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !c ? <Loading label="Loading requests…" /> : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start"><RequestForm institutions={institutions} link={link} onDone={load} /></aside>
            <div className="min-w-0">
              <Section n="01" title="Pipeline" aside={`${c.requests.length} request${c.requests.length === 1 ? '' : 's'} from ${who}`}>
                <ul className="grid gap-4">
                  {c.requests.map(x => <RequestCard key={x.id} x={x} q={q} />)}
                  {!c.requests.length ? <li className="text-[14px] font-light text-white/50">No requests yet. Submit the first one.</li> : null}
                </ul>
              </Section>
            </div>
          </div>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function RequestForm({ institutions, link, onDone }: { institutions: string[]; link?: string; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<FeatureRequestPriority>('normal');
  const [institution, setInstitution] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null); setBusy(true);
    try {
      const r = await api.updates.submitRequest({ title, description, priority, institution, by: actor, link });
      setOk(`${r.request.id} submitted — it now sits at “Requested”.`);
      setTitle(''); setDescription('');
      onDone();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not submit'); }
    finally { setBusy(false); }
  }

  return (
    <Panel strong className="p-5 sm:p-6">
      <form onSubmit={submit} className="grid gap-4" aria-label="Submit a feature request">
        <Eyebrow>New request</Eyebrow>
        <Field label="Title"><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. Offline intake for field offices" /></Field>
        <Field label="What is needed, and why" hint="Describe the outcome, who uses it and any law or policy it must follow.">
          <textarea className={`${inputCls} min-h-[120px] resize-y`} value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value as FeatureRequestPriority)}>
              {(Object.keys(PRIORITY_LABEL) as FeatureRequestPriority[]).map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </Select>
          </Field>
          <Field label="Institution">
            <input className={inputCls} list="fr-institutions" value={institution} onChange={e => setInstitution(e.target.value)} required placeholder="Choose or type" />
            <datalist id="fr-institutions">{institutions.map(i => <option key={i} value={i} />)}</datalist>
          </Field>
        </div>
        <Field label="Submitted by"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} required placeholder="Name, office" autoComplete="name" /></Field>
        <button type="submit" className={goldBtn} style={goldStyle} disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
        <div className="min-h-[20px]" aria-live="polite">{err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12.5px] text-[#9be7c4]">{ok}</p> : null}</div>
      </form>
    </Panel>
  );
}

/** One request with its place on the six-stage pipeline. */
export function RequestCard({ x, q, nationLabel, actions }: { x: FeatureRequest; q?: string; nationLabel?: string; actions?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const at = STAGES.indexOf(x.stage);
  const declined = x.stage === 'declined';
  return (
    <Panel as="li" className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-white/40">{x.id}</span>
        <Chip tone={PRIORITY_TONE[x.priority]}>{PRIORITY_LABEL[x.priority]}</Chip>
        {nationLabel ? <Chip tone="#a9c7e8">{nationLabel}</Chip> : null}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{fmtDate(x.submittedAt)}</span>
      </div>
      <p className="mt-2.5 text-[16px] font-light text-[#f3efe6]">{x.title}</p>
      <p className="mt-1 text-[13px] font-light leading-relaxed text-white/50">{x.description}</p>
      <p className="mt-2 text-[12px] font-light text-white/40">{x.institution} · {x.submittedBy}{x.targetVersion ? ` · target ${x.targetVersion}` : ''}</p>

      {declined ? (
        <p className="mt-4"><Chip tone="#8a8f99" solid>Declined</Chip> <span className="ml-2 text-[12.5px] text-white/50">{x.history[x.history.length - 1]?.note}</span></p>
      ) : (
        <ol aria-label={`Stage: ${STAGE_LABEL[x.stage]}`} className="mt-4 grid grid-cols-6 gap-1">
          {STAGES.map((s, i) => (
            <li key={s} className="min-w-0">
              <span aria-hidden className="block h-[3px] rounded-full" style={{ background: i <= at ? (x.stage === 'delivered' ? '#9be7c4' : CHAMPAGNE) : hair(0.14) }} />
              <span className={`mt-1.5 block truncate font-mono text-[8.5px] uppercase tracking-[0.12em] ${i === at ? 'text-[#f4e4bd]' : 'text-white/30'}`} aria-current={i === at ? 'step' : undefined}>{STAGE_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {x.deliveredIn && q !== undefined ? (
          <Link href={`/updates/${x.deliveredIn}${q}`} className="text-[12.5px] underline decoration-[#d9c398]/40 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>Delivered in {x.targetVersion ?? 'your nation build'} →</Link>
        ) : null}
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 hover:text-[#f4e4bd]">{open ? 'Hide history' : 'History'}</button>
        {actions ? <div className="ml-auto flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {open ? (
        <ol className="mt-3 space-y-1.5 border-l pl-4" style={{ borderColor: hair(0.2) }}>
          {x.history.map((h, i) => (
            <li key={i} className="text-[12px] font-light text-white/55">
              <span className="font-mono text-[10.5px] text-white/35">{fmtDate(h.at)}</span> · {STAGE_LABEL[h.to]} · {h.by}{h.note ? ` — ${h.note}` : ''}
            </li>
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}
