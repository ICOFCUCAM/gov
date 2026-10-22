'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { BranchTile, useBranchRecords, billCounts, recordFigure, indicatorFigure, BILLS_SOURCE, HEARINGS_SOURCE, type BranchFigure } from '@/components/features/BranchRecords';
import { GeneratedText } from '@/components/ui/Generated';
import { constitutionFor } from '@/lib/gov/constitution';
import { judicialDocket, branchReadiness } from '@/lib/gov/branches';
import { useSeparation, separationWord, SeparationCheckList } from '@/components/features/SeparationChecks';
import type { StateForm, NationalConstitution } from '@/lib/api/types';
import { useRenderNow } from '@/lib/clock/render-now';

export function BranchesView() {
  const [now, setNow] = React.useState(useRenderNow());
  const [form, setForm] = React.useState<StateForm>('republic');
  const [nation, setNation] = React.useState<NationalConstitution | undefined>();
  React.useEffect(() => {
    api.sovereign.get().then(r => { if (r.sovereign?.stateForm) setForm(r.sovereign.stateForm); setNation(r.sovereign?.constitution); }).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const m = constitutionFor(form, nation);
  const docket = judicialDocket(ts);
  // Separation of powers as observed from the configuration (audit G), not generated.
  const separation = useSeparation();
  const sepOk = !!separation.data?.intact;
  const sepTone = !separation.data ? TONE.neutral : sepOk ? TONE.ok : TONE.warn;

  // Bills from the legislature's record and hearings from the courts' cause list; open court cases stay
  // with the courts (their files are closed to other institutions), so that figure is generated.
  const rec = useBranchRecords();
  const tele: BranchFigure[] = [
    { l: 'Constitutional form', v: m.label, t: 'ok', k: 'cf', kind: 'reported', src: 'National settings' },
    { l: 'Branches', v: String(m.branches.length), t: 'ok', k: 'br', kind: 'reported', src: 'National settings' },
    { l: 'Legislature', v: m.legislature.structure.toUpperCase(), t: 'ok', k: 'lg', kind: 'reported', src: 'National settings' },
    recordFigure('Bills in progress', 'bp', rec.bills ? billCounts(rec.bills).inProgress : null, BILLS_SOURCE),
    // The courts' own indicator of pending cases (plan step I3), computed from their records; the earlier docket model stays beside it, generated.
    indicatorFigure('Open cases', 'oc', rec.courtsBacklog),
    { l: 'Docket model', v: String(docket.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'dm', kind: 'sample' },
    recordFigure('Hearings listed · 7 days', 'hl', rec.hearings, HEARINGS_SOURCE),
    { l: 'Separation', v: separationWord(separation.data).toUpperCase(), t: !separation.data ? 'neutral' : sepOk ? 'ok' : 'warn', k: 'si', kind: 'reported', src: 'Checks on the separation of powers, read from the configuration' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Constitutional Architecture</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: TONE.link, color: TONE.link, backgroundColor: `color-mix(in srgb, ${TONE.link} 12%, transparent)` }}>{m.label}</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="state-form" className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">Constitutional form</label>
          <select id="state-form" value={form} onChange={e => setForm(e.target.value as StateForm)}
            className="focus-ring rounded-[3px] border bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-soft" style={{ borderColor: TONE.neutral }}>
            {(['republic', 'federation', 'monarchy', 'city-state', 'union', 'parliamentary'] as StateForm[]).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: sepTone, color: sepTone, backgroundColor: `color-mix(in srgb, ${sepTone} 12%, transparent)` }}>
            Separation of powers · {separationWord(separation.data)}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-ink-muted">
        The branches follow the form of government set in National settings. {m.selection}.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {tele.map(t => <BranchTile key={t.l} m={t} sparkKey={`cv:${t.k}`} ts={ts} size="sm" />)}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        {m.branches.map(b => {
          const r = branchReadiness(b.key, ts);
          return (
            // The branch's bodies and mandate come from the configuration; its readiness is generated.
            <Panel signal="reported" key={b.key} title={b.name} meta={<GeneratedText>readiness {r.total}% · {r.posture}</GeneratedText>} className="min-h-[200px]" bodyClass="!p-1.5">
              <p className="mb-1.5 text-[10px] text-ink-muted">{b.mandate}</p>
              <div className="space-y-1">
                {b.bodies.map(body => (
                  <div key={body.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                    <span className="block truncate text-[11px] text-ink">{body.name}</span>
                    <span className="block truncate text-[9px] text-ink-muted">{body.role}</span>
                  </div>
                ))}
              </div>
              <Link href={`/gov/branch/${b.key}`} className="focus-ring mt-1.5 inline-block text-[10px] text-link underline underline-offset-2">Enter {b.name} →</Link>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel signal="reported" title="Authority chain" meta={m.selection} bodyClass="!p-0">
          {m.authorityChain.map(a => (
            <div key={a.rank} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0">
              <span className="grid h-5 w-5 place-items-center rounded-[3px] bg-surface-2 text-[10px] font-bold text-ink-soft">{a.rank}</span>
              <span className="text-[12px] text-ink">{a.office}</span>
            </div>
          ))}
        </Panel>
        <Panel signal="reported" title="Checks on the separation of powers" meta="observed from the configuration" bodyClass="!p-1.5">
          <SeparationCheckList data={separation.data} failed={separation.failed} />
        </Panel>
      </div>

      <p className="text-[10px] text-ink-muted">
        {m.emergencyDoctrine}. The constitutional structure is read-only and advisory; only the constituted branches exercise authority through constitutional process. The same CivicOS core resolves any sovereign governance model from configuration.
      </p>
    </div>
  );
}
