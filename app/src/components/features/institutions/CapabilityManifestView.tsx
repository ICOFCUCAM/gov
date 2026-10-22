'use client';

// What an institution actually has (plan I2; lib/institution/capabilities.ts):
// computed from the records each time, never from its archetype's template.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Pill, type PillTone } from '@/components/ui/Pill';
import { useInstitution, InstitutionPicker, readJson } from './InstitutionPicker';
import type { CapabilityManifest } from '@/lib/institution/capabilities';

const TONE: Record<string, PillTone> = { 'in force': 'ok', draft: 'warn', 'not adopted': 'neutral' };
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-ink-muted">{children}</p>;

export function CapabilityManifestView() {
  const inst = useInstitution();
  const [m, setM] = React.useState<CapabilityManifest | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!inst.id) return;
    void readJson<{ manifest: CapabilityManifest }>(`/api/org/ministries/${inst.id}/capabilities`).then(r => { setErr(r.error ?? null); setM(r.data?.manifest ?? null); });
  }, [inst.id]);
  return (
    <div className="space-y-5">
      <InstitutionPicker {...inst} />
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {m ? (
        <>
          <p className="text-sm text-ink-muted">{m.institution.name} · {m.institution.standing}{m.institution.independent ? ' · independent' : ''} · computed {m.computedAt.slice(0, 16).replace('T', ' ')}. {m.note}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Responsible for" meta={String(m.responsibilities.length)}>
              {m.responsibilities.length ? <ul className="text-sm">{m.responsibilities.map(r => <li key={r.key}>{r.label}</li>)}</ul> : <Empty>The nation has not named it for a register or power (Who is responsible).</Empty>}
            </Section>
            <Section title="Registers it keeps" meta={String(m.registers.length)}>
              {m.registers.length ? <ul className="text-sm">{m.registers.map(r => <li key={r.id}>{r.name} <span className="text-xs text-ink-muted">· {r.through}</span></li>)}</ul> : <Empty>None: registers follow who is responsible.</Empty>}
            </Section>
            <Section title="Procedures in force" meta={`${m.procedures.inForce.length} in force · ${m.procedures.drafts.length} draft`}>
              {m.procedures.inForce.length ? <ul className="text-sm">{m.procedures.inForce.map(p => <li key={p.key}>{p.title} <span className="text-xs text-ink-muted">· {p.key} v{p.version}{p.activeFrom ? ` from ${p.activeFrom}` : ''}</span></li>)}</ul> : <Empty>None approved yet.</Empty>}
              {m.procedures.drafts.length ? <p className="mt-2 text-xs text-ink-muted">Drafts waiting for a second official: {m.procedures.drafts.map(p => p.key).join(', ')}</p> : null}
            </Section>
            <Section title="Powers under approved mappings" meta={String(m.mappings.length)}>
              {m.mappings.length ? <ul className="text-sm">{m.mappings.map(x => <li key={x.permitType}>{x.title} <span className="text-xs text-ink-muted">· {x.powers.join(', ')} · version {x.version}</span></li>)}</ul> : <Empty>No approved permit authority mapping gives it a power.</Empty>}
            </Section>
            <Section title="Exchange services it answers" meta={String(m.exchange.length)}>
              {m.exchange.length ? <ul className="text-sm">{m.exchange.map(x => <li key={x.id}>{x.title} <span className="text-xs text-ink-muted">· {x.id}</span></li>)}</ul> : <Empty>None.</Empty>}
            </Section>
            <Section title="Departments and modules" meta={`${m.departments.length} departments · ${m.modules.length} modules`}>
              {m.departments.length ? <ul className="text-sm">{m.departments.map(d => <li key={d.id}>{d.name}<span className="text-xs text-ink-muted">{d.office ? ` · ${d.office}` : ' · no accountable office'}{d.functions.length ? ` · ${d.functions.join(', ')}` : ''} · {d.staff} staff</span></li>)}</ul> : <Empty>No department in operation.</Empty>}
              {m.modules.length ? <p className="mt-2 text-xs text-ink-muted">Modules enabled: {m.modules.join(', ')}</p> : null}
            </Section>
          </div>
          <Section title="Internal administration" meta={`${m.records.positions} positions · ${m.records.payrollApproved} payroll batches approved · ${m.records.accessInForce} privileged access in force · ${m.records.policies} policies`}>
            <ul className="grid gap-1 text-sm md:grid-cols-2">
              {m.administration.map(a => (
                <li key={a.function} className="rounded-[3px] border border-line-soft px-2 py-1">
                  <span className="font-medium">{a.label}</span>
                  <span className="block text-xs text-ink-muted">{a.departments.length ? a.departments.join(', ') : 'No department performs it'}</span>
                  {a.procedures.map(p => <span key={p.key} className="me-1 mt-1 inline-block"><Pill tone={TONE[p.state] ?? 'neutral'}>{p.key.split('.')[1]}: {p.state}</Pill></span>)}
                </li>
              ))}
            </ul>
          </Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Reading what it has…</p> : null}
    </div>
  );
}
