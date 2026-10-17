'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { ResilienceSettings, UpdateChamber } from '@/lib/api/types';
import { IncidentCard } from './resilience';
import { ChamberNav, ChamberTabs, Chip, CopyValue, ErrorLine, Loading, Panel, PoweredBy, fmtDateTime, useActor, useCenterTitle, useLink } from './ui';

/**
 * Chamber settings: how this nation's installs are protected — probation
 * length, fallback behaviour, the health source, rollout ring, security
 * definitions policy and estate size — plus the fallback incident record
 * and the break-glass runbook.
 */
export function ChamberSettings() {
  const { link, q } = useLink();
  const [c, setC] = React.useState<UpdateChamber | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.updates.chamber(link).then(r => setC(r.chamber)).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service'));
  }, [link]);
  React.useEffect(load, [load]);
  const { nation } = useCenterTitle(c?.nation.name, c?.nation.home ?? true);

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="settings" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="settings" />
        <Eyebrow>Update Center · settings</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          How {nation ? <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span> : 'this installation'} stays running
        </h1>
        <p className="mt-4 max-w-[66ch] text-[15px] font-light leading-relaxed text-white/55">
          Upgrades are always your decision. What may happen on its own is one thing only: if a new release fails its health checks, the software returns to the last version that worked. Data is never restored automatically.
        </p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !c ? <Loading label="Loading settings…" /> : <Body c={c} link={link} q={q} reload={load} />}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Body({ c, link, q, reload }: { c: UpdateChamber; link?: string; q: string; reload: () => void }) {
  const [actor, setActor] = useActor();
  const [form, setForm] = React.useState<ResilienceSettings>(c.nation.settings);
  const [estate, setEstate] = React.useState(c.nation.estate);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const set = <K extends keyof ResilienceSettings>(k: K, v: ResilienceSettings[K]) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null); setBusy(true);
    try {
      await api.updates.settings({ ...form, estate, by: actor, link });
      setOk('Settings saved — written to the audit chain.');
      reload();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  const choice = <V extends string>(name: string, value: V, current: V, label: string, hint: string, onPick: (v: V) => void) => (
    <label key={value} className="flex cursor-pointer items-start gap-3 rounded-[3px] border p-4 transition-colors" style={{ borderColor: current === value ? CHAMPAGNE : hair(0.14), background: current === value ? hair(0.06) : 'transparent' }}>
      <input type="radio" name={name} className="mt-1 h-4 w-4 accent-[#d9c398]" checked={current === value} onChange={() => onPick(value)} />
      <span><span className="block text-[14px] font-light text-[#f3efe6]">{label}</span><span className="mt-1 block text-[12.5px] font-light leading-relaxed text-white/50">{hint}</span></span>
    </label>
  );

  return (
    <>
      <form onSubmit={save} aria-label="Resilience settings" className="mt-12">
        <Section n="01" title="When a new release fails">
          <div className="grid gap-3 md:grid-cols-2">
            {choice('fallback', 'automatic', form.fallback, 'Switch back automatically (recommended)', 'The software returns to the last known good release at once — blue-green for hosted, the standby A/B slot for self-hosted. Data is untouched. Releases that are not backward compatible always ask first, whatever you choose here.', v => set('fallback', v))}
            {choice('fallback', 'ask', form.fallback, 'Ask before falling back', 'The release stays running in a degraded state and your administrators decide: fall back or keep it. Choose this only with staff on call during every probation window.', v => set('fallback', v))}
          </div>
        </Section>

        <Section n="02" title="Probation and health">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <Field label="Probation window (minutes)" hint="5 – 1440. Default 30.">
              <input type="number" min={5} max={1440} className={inputCls} value={form.probationMinutes} onChange={e => set('probationMinutes', Number(e.target.value))} />
            </Field>
            <Field label="Health reported by" hint="Your deployment agent posts to /api/releases/health during probation. A missing report counts as a failed one, but one alone never triggers a fallback.">
              <Select value={form.healthSource} onChange={e => set('healthSource', e.target.value as ResilienceSettings['healthSource'])}>
                <option value="agent">Our deployment agent</option>
                <option value="simulated">Simulated (prototype — no agent connected)</option>
              </Select>
            </Field>
          </div>
          <AgentCredential c={c} link={link} actor={actor} reload={reload} />
          <p className="mt-4 text-[12.5px] font-light text-white/45">Checks: readiness, liveness, error rate and latency against the pre-upgrade baseline, audit-chain integrity, and smoke tests of sign-in, the citizen wallet, payments and the registry. Fallback needs three failed or missing reports in a row, or two independent critical checks failing together.</p>
        </Section>

        <Section n="03" title="Rollout ring">
          <div className="grid gap-3 md:grid-cols-2">
            {choice('ring', 'general', form.ring, 'General availability', 'Global releases reach you after the pilot ring has run them cleanly.', v => set('ring', v))}
            {choice('ring', 'pilot', form.ring, 'Pilot ring', 'You see global releases first and help prove them. Each install is still your decision and still protected by probation.', v => set('ring', v))}
          </div>
        </Section>

        <Section n="04" title="Security definitions and estate">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Definitions policy" hint="Definitions are data (scanner rules, signatures), not software.">
              <Select value={form.definitionsPolicy} onChange={e => set('definitionsPolicy', e.target.value as ResilienceSettings['definitionsPolicy'])}>
                <option value="automatic">Apply automatically (default)</option>
                <option value="manual">Apply when we choose</option>
              </Select>
            </Field>
            <Field label="Servers"><input type="number" min={0} className={inputCls} value={estate.servers} onChange={e => setEstate(x => ({ ...x, servers: Number(e.target.value) }))} /></Field>
            <Field label="Officer endpoints"><input type="number" min={0} className={inputCls} value={estate.endpoints} onChange={e => setEstate(x => ({ ...x, endpoints: Number(e.target.value) }))} /></Field>
          </div>
        </Section>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:w-[280px]"><Field label="Changed by"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="Name, office" required /></Field></div>
          <button type="submit" className={goldBtn} style={goldStyle} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
        <div className="mt-3 min-h-[20px]" aria-live="polite">{err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12.5px] text-[#9be7c4]">{ok}</p> : null}</div>
      </form>

      <Section n="05" title="Fallback incidents" aside={`${c.incidents.length} recorded`}>
        <div className="grid gap-3">
          {c.incidents.map(i => <IncidentCard key={i.id} i={i} q={q} />)}
          {!c.incidents.length ? <p className="text-[13.5px] font-light text-white/50">No fallbacks so far.</p> : null}
        </div>
      </Section>

      <Section n="06" title="Break-glass restore">
        <BreakGlass c={c} link={link} reload={reload} />
      </Section>
    </>
  );
}

/** Issue or rotate the deployment agent's credential. Shown once; only its hash is kept. */
function AgentCredential({ c, link, actor, reload }: { c: UpdateChamber; link?: string; actor: string; reload: () => void }) {
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const meta = c.nation.agentCredential;
  async function issue() {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name under “Changed by” first.'); return; }
    if (meta && !window.confirm('Rotating revokes the current credential at once. The agent must be given the new one. Continue?')) return;
    setBusy(true);
    try { const r = await api.updates.issueAgentCredential(actor.trim(), link); setFresh(r.credential); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not issue'); }
    finally { setBusy(false); }
  }
  return (
    <Panel className="mt-5 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/75">Deployment agent credential</span>
        {meta ? <Chip tone="#9be7c4" solid>Active · cag_{meta.prefix}…</Chip> : <Chip tone="#f1b36b">Not issued</Chip>}
        <button type="button" className={`${ghostBtn} ml-auto py-2 text-[12.5px]`} disabled={busy} onClick={issue}>{busy ? 'Issuing…' : meta ? 'Rotate credential' : 'Issue credential'}</button>
      </div>
      <p className="mt-2 text-[12.5px] font-light leading-relaxed text-white/55">
        The agent sends it as <code className="font-mono text-[12px]">Authorization: Bearer cag_…</code> to <code className="font-mono text-[12px]">/api/releases/health</code>. Sessions and the distribution link are refused there. {meta ? `Issued ${fmtDateTime(meta.issuedAt)} by ${meta.issuedBy}${meta.rotations ? ` · rotated ${meta.rotations}×` : ''}.` : ''}
      </p>
      {fresh ? (
        <div role="alert" className="mt-3 rounded-[3px] border p-3" style={{ borderColor: '#f4d58d77', background: 'rgba(244,213,141,0.06)' }}>
          <p className="text-[12.5px] font-light text-[#f4d58d]">Copy it now — it is shown once and cannot be retrieved later.</p>
          <div className="mt-2 min-w-0"><CopyValue value={fresh} label="agent credential" /></div>
        </div>
      ) : null}
      <div className="mt-2 min-h-[16px]"><ErrorLine>{err}</ErrorLine></div>
    </Panel>
  );
}

function BreakGlass({ c, link, reload }: { c: UpdateChamber; link?: string; reload: () => void }) {
  const [by, setBy] = React.useState('');
  const [second, setSecond] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [armed, setArmed] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const running = c.releases.find(r => r.id === c.nation.installedReleaseId);
  const rp = running?.install.restorePoint;

  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null);
    try {
      const r = await api.updates.breakGlass({ by, secondBy: second, reason, link });
      setOk(`Software switched back to ${r.chamber.installed}. Incident ${r.incident.id} recorded.`);
      setArmed(false); reload();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Break-glass failed'); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="text-[13.5px] font-light leading-relaxed text-white/65">
        <p>For the worst case: the running release is broken after its probation ended, and the normal rollback is not enough. Two named people switch the software back to the version the restore point protects.</p>
        <ol className="mt-4 space-y-2">
          <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>1</span> · Confirm the failure is the release, not the infrastructure (hardware and site failures are disaster recovery, a separate capability).</li>
          <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>2</span> · Two officers with platform authority enter their names and the reason below. The system switches the software back; data is not touched.</li>
          <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>3</span> · If the data itself is damaged, restore the snapshot from the release’s page — a separate decision that loses everything written since the snapshot.</li>
          <li><span className="font-mono text-[11px]" style={{ color: CHAMPAGNE }}>4</span> · Offline: self-hosted nations can run <code className="font-mono text-[12px]">rollback.sh</code> from the install kit; air-gapped nations the restore kit in the offline bundle. Record it here afterwards.</li>
        </ol>
      </div>
      <Panel className="p-5" strong={armed}>
        {rp ? (
          <p className="text-[12.5px] font-light text-white/60">Running {c.installed}. Break-glass returns the software to <span className="font-mono text-[#f4e4bd]">{rp.version}</span> (restore point {rp.id}).</p>
        ) : <p className="text-[12.5px] font-light text-white/60">No restore point protects the running release; use your own backups and record a rollback.</p>}
        {!armed ? (
          <button type="button" className={`${ghostBtn} mt-4 w-full`} disabled={!rp} onClick={() => setArmed(true)}>Prepare break-glass</button>
        ) : (
          <form onSubmit={go} className="mt-4 grid gap-3" aria-label="Break-glass restore">
            <Field label="First officer"><input className={inputCls} value={by} onChange={e => setBy(e.target.value)} required /></Field>
            <Field label="Second officer (different person)"><input className={inputCls} value={second} onChange={e => setSecond(e.target.value)} required /></Field>
            <Field label="What failed"><textarea className={`${inputCls} min-h-[70px]`} value={reason} onChange={e => setReason(e.target.value)} required /></Field>
            <div className="flex gap-2"><button type="submit" className={goldBtn} style={goldStyle}>Switch back now</button><button type="button" className={ghostBtn} onClick={() => setArmed(false)}>Cancel</button></div>
          </form>
        )}
        <div className="mt-3 min-h-[20px]" aria-live="polite">{err ? <ErrorLine>{err}</ErrorLine> : ok ? <p className="text-[12.5px] text-[#9be7c4]">{ok}</p> : null}</div>
        <p className="mt-2 flex items-center gap-2"><Chip tone="#a5abb5">Audited with both names</Chip></p>
      </Panel>
    </div>
  );
}
