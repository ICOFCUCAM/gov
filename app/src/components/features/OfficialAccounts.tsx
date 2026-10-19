'use client';

// Official accounts: who can sign in on this installation with a platform
// account, what each may do (role) and for which institution. Administrators
// create accounts, change roles and disable them; every change is in the audit
// chain. Passwords are never shown or stored in clear.

import * as React from 'react';
import Link from 'next/link';
import { useSignIn, officialLabel, officialScope } from '@/lib/official';
import { ROLES, roleOf, type OfficialRole } from '@/lib/auth/roles';

interface Account { resetPendingUntil?: string; id: string; email: string; name: string; office: string; createdAt: string; createdBy: string; disabled?: boolean; lastSignIn?: string; role?: OfficialRole; institution?: string; twoStepSince?: string; twoStepRequired?: boolean }
interface Institution { id: string; name: string; status: string }

const input = 'focus-ring w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const day = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');

export function OfficialAccounts() {
  const s = useSignIn();
  const [list, setList] = React.useState<Account[] | null>(null);
  const blank = { name: '', office: '', email: '', password: '', role: 'officer' as OfficialRole, institution: '' };
  const [f, setF] = React.useState(blank);
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/officials', { cache: 'no-store' });
    if (r.ok) setList(((await r.json()) as { accounts: Account[] }).accounts);
  }, []);
  React.useEffect(() => { if (s?.official) void load(); }, [s?.official, load]);
  React.useEffect(() => {
    void fetch('/api/org/ministries', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { ministries: [] }))
      .then((d: { ministries: Institution[] }) => setInstitutions(d.ministries.filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name))));
  }, []);
  const admin = !!s?.official && roleOf(s.official) === 'administrator';
  const [policy, setPolicy] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (s?.official?.method !== 'local') return;
    void fetch('/api/auth/two-step', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then((d: { policy?: string } | null) => setPolicy(d?.policy ?? null));
  }, [s?.official?.method]);
  const placeName = (id?: string) => (id ? institutions.find(m => m.id === id)?.name ?? id : 'Whole government');

  // A one-time reset code to hand over in person: shown here once, never stored in clear.
  const [issued, setIssued] = React.useState<{ name: string; code: string; expiresAt: string } | null>(null);
  async function resetCode(a: Account) {
    if (!window.confirm(`Issue a password reset code for ${a.name}? Give it to them in person; it works once, for 24 hours.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/auth/officials/${a.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ issueReset: true }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      setIssued({ name: a.name, ...(d as { code: string; expiresAt: string }) });
      await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  async function call(url: string, body: unknown, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: done }); await load(); return true;
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 text-[14px] text-ink">
      <header>
        <h2 className="text-[22px] font-semibold tracking-tight">Official accounts</h2>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Who can sign in on this installation with a platform account, what each official may do and for which institution. Signed-in officials&rsquo; actions are recorded under their verified names.
          {s?.methods.substrate ? ' This installation is also connected to the substrate, where officers sign in with their substrate accounts.' : ''}
        </p>
      </header>
      {!s ? null : !s.official ? (
        <p className="rounded-[3px] border border-line bg-surface p-3"><Link href="/sign-in?from=/admin/officials" className="text-link underline">Sign in</Link> as an official to manage accounts.</p>
      ) : (
        <>
          <p className="text-[13px] text-ink-soft">Signed in as <strong className="text-ink">{officialLabel(s.official)}</strong> ({officialScope(s.official)}).{admin ? '' : ' Only an administrator can add officials or change what they may do.'}</p>
          <dl className="grid gap-x-4 gap-y-1 rounded-[3px] border border-line bg-surface p-3 text-[13px] sm:grid-cols-[auto_1fr]">
            {ROLES.map(r => <React.Fragment key={r.id}><dt className="font-semibold">{r.label}</dt><dd className="text-ink-soft">{r.means}</dd></React.Fragment>)}
            <dt className="font-semibold">Institution</dt><dd className="text-ink-soft">An official with an institution acts only for it: its workspace, and directives it issues. &ldquo;Whole government&rdquo; acts for every institution.</dd>
          </dl>
          {admin && policy ? (
            <label className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface p-3 text-[13px]">
              <span className="font-semibold">Second sign-in step</span>
              <span className="text-ink-soft">(a code from an authenticator app after the password) is required for</span>
              <select className={`${input} w-auto`} value={policy} disabled={busy}
                onChange={async e => {
                  const v = e.currentTarget.value;
                  if (await call('/api/auth/two-step', { action: 'policy', policy: v }, v === 'none' ? 'Second step is now optional' : `Second step now required for ${v === 'all' ? 'every official' : 'officials who can sign and administrators'}`)) setPolicy(v);
                }}>
                <option value="none">nobody (each official chooses)</option>
                <option value="signers">officials who can sign, and administrators</option>
                <option value="all">every official</option>
              </select>
            </label>
          ) : null}
          {admin ? (
          <form className="grid gap-2 rounded-[3px] border border-line bg-surface p-3 md:grid-cols-5"
            onSubmit={async e => { e.preventDefault(); if (await call('/api/auth/officials', f, `Account created for ${f.name}`)) setF(blank); }}>
            <h2 className="text-[15px] font-semibold md:col-span-5">Add an official</h2>
            <label className="text-[12px] text-ink-soft">Full name<input className={`${input} mt-1`} required value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft">Office<input className={`${input} mt-1`} required value={f.office} onChange={e => setF({ ...f, office: e.currentTarget.value })} placeholder="e.g. Director of Budget" /></label>
            <label className="text-[12px] text-ink-soft">Email<input type="email" className={`${input} mt-1`} required value={f.email} onChange={e => setF({ ...f, email: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft md:col-span-2">First password<input type="password" autoComplete="new-password" minLength={12} className={`${input} mt-1`} required value={f.password} onChange={e => setF({ ...f, password: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft md:col-span-2">May do<select className={`${input} mt-1`} value={f.role} onChange={e => setF({ ...f, role: e.currentTarget.value as OfficialRole })}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
            <label className="text-[12px] text-ink-soft md:col-span-2">For<select className={`${input} mt-1`} value={f.institution} onChange={e => setF({ ...f, institution: e.currentTarget.value })}>
              <option value="">Whole government</option>
              {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <div className="flex items-end"><button className={btn} disabled={busy}>Create account</button></div>
            <p className="text-[12px] text-ink-muted md:col-span-5">Give the first password to the official in person; at least 12 characters.</p>
          </form>
          ) : null}
          {admin && s.methods.substrate ? <SubstrateOfficers institutions={institutions} placeName={placeName} call={call} busy={busy} /> : null}
          {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}
          {issued ? (
            <div role="status" className="space-y-2 rounded-[3px] border border-warn bg-surface p-3">
              <p><strong>Reset code for {issued.name}.</strong> Give it to them in person (not by email). It works once, until {new Date(issued.expiresAt).toISOString().slice(0, 16).replace('T', ' ')} UTC, at the sign-in page under &ldquo;Forgot your password?&rdquo;. It is not shown again.</p>
              <code className="block font-mono text-[18px] tracking-wider">{issued.code}</code>
              <button type="button" className={btn} onClick={() => setIssued(null)}>Done</button>
            </div>
          ) : null}
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-line text-start text-ink-muted"><th className="py-1.5 text-start font-semibold">Official</th><th className="text-start font-semibold">May do</th><th className="text-start font-semibold">For</th><th className="text-start font-semibold">Email</th><th className="text-start font-semibold">Created</th><th className="text-start font-semibold">Last sign-in</th><th className="text-start font-semibold">Second step</th><th className="text-start font-semibold">Status</th><th /></tr></thead>
            <tbody>
              {(list ?? []).map(a => (
                <tr key={a.id} className="border-b border-line-soft">
                  <td className="py-1.5"><strong>{a.name}</strong><div className="text-ink-muted">{a.office}</div></td>
                  {admin && s.official?.sub !== `local:${a.id}` ? (
                    <>
                      <td><select aria-label={`What ${a.name} may do`} className={input} disabled={busy} value={roleOf(a)}
                        onChange={e => call(`/api/auth/officials/${a.id}`, { role: e.currentTarget.value }, `${a.name} now: ${ROLES.find(r => r.id === e.currentTarget.value)?.label}`)}>
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></td>
                      <td><select aria-label={`Institution ${a.name} acts for`} className={input} disabled={busy} value={a.institution ?? ''}
                        onChange={e => call(`/api/auth/officials/${a.id}`, { institution: e.currentTarget.value || null }, `${a.name} now acts for ${placeName(e.currentTarget.value || undefined)}`)}>
                        <option value="">Whole government</option>
                        {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
                    </>
                  ) : (
                    <>
                      <td>{ROLES.find(r => r.id === roleOf(a))?.label}</td>
                      <td>{placeName(a.institution)}</td>
                    </>
                  )}
                  <td>{a.email}</td>
                  <td>{day(a.createdAt)}<div className="text-ink-muted">by {a.createdBy}</div></td>
                  <td>{day(a.lastSignIn)}</td>
                  <td>
                    {a.twoStepSince ? <span className="text-ok">On</span> : a.twoStepRequired ? <span className="text-warn">Required, not set up</span> : <span className="text-ink-muted">Off</span>}
                    {admin && a.twoStepSince && s.official?.sub !== `local:${a.id}` ? (
                      <button type="button" className="ms-2 text-[12px] text-link underline" disabled={busy}
                        onClick={() => window.confirm(`Reset ${a.name}'s second step? Do this only when their phone is lost; they set it up again at their next sign-in.`) && call(`/api/auth/officials/${a.id}`, { resetTwoStep: true }, `${a.name}'s second step was reset`)}>Reset</button>
                    ) : null}
                  </td>
                  <td>{a.disabled ? <span className="text-alert">Disabled</span> : <span className="text-ok">Active</span>}{a.resetPendingUntil ? <div className="text-[12px] text-warn">Reset code waiting</div> : null}</td>
                  <td className="text-end">
                    {admin && s.official?.sub !== `local:${a.id}` && !a.disabled ? (
                      <button className={`${btn} me-2`} disabled={busy} onClick={() => resetCode(a)}>Reset password</button>
                    ) : null}
                    {s.official?.sub === `local:${a.id}` ? <span className="text-ink-muted">you</span> : admin ? (
                      <button className={btn} disabled={busy} onClick={() => call(`/api/auth/officials/${a.id}`, { disabled: !a.disabled }, `${a.disabled ? 'Enabled' : 'Disabled'}: ${a.name}`)}>{a.disabled ? 'Enable' : 'Disable'}</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

interface Assignment { officerId: string; role: OfficialRole; institution?: string; by: string; at: string }

/**
 * What officials who sign in through the substrate may do here (review H-3):
 * without an assignment an officer acts only for the institution the officer
 * register names (as Officer), or reads only when it names none the platform
 * knows; signing rights and whole-government scope need an assignment.
 */
function SubstrateOfficers({ institutions, placeName, call, busy }: {
  institutions: Institution[]; placeName: (id?: string) => string; busy: boolean;
  call: (url: string, body: unknown, done: string) => Promise<boolean>;
}) {
  const [list, setList] = React.useState<Assignment[]>([]);
  const blank = { officerId: '', name: '', role: 'officer' as OfficialRole, institution: '' };
  const [f, setF] = React.useState(blank);
  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/officials/substrate', { cache: 'no-store' });
    if (r.ok) setList(((await r.json()) as { assignments: Assignment[] }).assignments);
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const save = async (body: unknown, done: string) => { const ok = await call('/api/auth/officials/substrate', body, done); await load(); return ok; };
  return (
    <section className="space-y-2 rounded-[3px] border border-line bg-surface p-3" aria-labelledby="substrate-officers">
      <h2 id="substrate-officers" className="text-[15px] font-semibold">Officers who sign in through the substrate</h2>
      <p className="text-[12px] text-ink-muted">Without an entry here an officer acts only for the institution their register entry names, as Officer, or reads only when it names none this platform knows. Give signing rights or the whole government here. The installation&rsquo;s second-step rule applies to them too (their substrate sign-in must use a second factor).</p>
      <form className="grid gap-2 md:grid-cols-5" onSubmit={async e => { e.preventDefault(); if (await save(f, `${f.name || f.officerId} now: ${ROLES.find(r => r.id === f.role)?.label}, ${placeName(f.institution || undefined)}`)) setF(blank); }}>
        <label className="text-[12px] text-ink-soft">Officer id (register)<input className={`${input} mt-1 font-mono`} required value={f.officerId} onChange={e => setF({ ...f, officerId: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">Name<input className={`${input} mt-1`} value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">May do<select className={`${input} mt-1`} value={f.role} onChange={e => setF({ ...f, role: e.currentTarget.value as OfficialRole })}>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
        <label className="text-[12px] text-ink-soft">For<select className={`${input} mt-1`} value={f.institution} onChange={e => setF({ ...f, institution: e.currentTarget.value })}>
          <option value="">Whole government</option>
          {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <div className="flex items-end"><button className={btn} disabled={busy}>Save</button></div>
      </form>
      {list.length ? (
        <ul className="divide-y divide-line-soft text-[13px]">
          {list.map(a => (
            <li key={a.officerId} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="font-mono">{a.officerId}</span>
              <span>{ROLES.find(r => r.id === a.role)?.label} · {placeName(a.institution)}</span>
              <span className="text-ink-muted">by {a.by}, {day(a.at)}</span>
              <button type="button" className="ms-auto text-[12px] text-link underline" disabled={busy}
                onClick={() => save({ officerId: a.officerId, role: null }, `Assignment removed: ${a.officerId}`)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
