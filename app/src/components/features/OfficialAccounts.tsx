'use client';

// Official accounts: who can sign in on this installation with a platform
// account, what each may do (role) and for which institution. Administrators
// create accounts, change roles and disable them; every change is in the audit
// chain. Passwords are never shown or stored in clear.

import * as React from 'react';
import Link from 'next/link';
import { useSignIn, officialLabel, officialScope } from '@/lib/official';
import { ROLES, roleOf, twoStepCovers, type OfficialRole, type TwoStepPolicy } from '@/lib/auth/roles';
import { AccountChanges } from './AccountChanges';

interface Account { resetPendingUntil?: string; id: string; email: string; name: string; office: string; createdAt: string; createdBy: string; disabled?: boolean; lastSignIn?: string; role?: OfficialRole; institution?: string; twoStepSince?: string; twoStepRequired?: boolean;
  passkeys?: { id: string }[]; identity?: { claim: string; value: string }; noPassword?: boolean }
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
    if (r.ok) {
      const d = (await r.json()) as { accounts: Account[]; full?: boolean; twoStep?: PolicyState };
      setList(d.accounts); setFull(d.full !== false); setPolicy(d.twoStep ?? null);
    }
  }, []);
  // Only administrators get the full list (email, sign-ins, second step); others see a directory (review L-3).
  const [full, setFull] = React.useState(false);
  React.useEffect(() => { if (s?.official) void load(); }, [s?.official, load]);
  React.useEffect(() => {
    void fetch('/api/org/ministries', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { ministries: [] }))
      .then((d: { ministries: Institution[] }) => setInstitutions(d.ministries.filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name))));
  }, []);
  const admin = !!s?.official && roleOf(s.official) === 'administrator';
  // The installation's two-step policy: sent with the full account list (administrators only).
  const [policy, setPolicy] = React.useState<PolicyState | null>(null);
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
      // An independent institution's account: the code goes to the official there who confirms (202).
      const pending = (d as { pending?: { summary: string } }).pending;
      if (pending) { setMsg({ ok: true, text: waitingText(pending) }); setChangesTick(t => t + 1); }
      else setIssued({ name: a.name, ...(d as { code: string; expiresAt: string }) });
      await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  // Account changes waiting for an independent institution to confirm (lib/auth/account-changes.ts).
  const [changesTick, setChangesTick] = React.useState(0);
  const waitingText = (p: { summary: string }) => `${p.summary}: this institution is independent, so the change waits for an official who can sign there to confirm it (below).`;

  async function call(url: string, body: unknown, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      // 202: an independent institution's account; the change waits for an official who can sign there.
      const pending = (d as { pending?: { summary: string } }).pending;
      setMsg({ ok: true, text: pending ? waitingText(pending) : done }); if (pending) setChangesTick(t => t + 1);
      await load(); return true;
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
            <dt className="font-semibold">Institution</dt><dd className="text-ink-soft">An official with an institution acts only for it: its workspace, and directives it issues. &ldquo;Whole government&rdquo; acts for every institution except independent ones (the legislature, courts, the head of state&rsquo;s office, independent bodies), whose accounts are managed by their own administrators or confirmed by them.</dd>
          </dl>
          {admin && policy && list ? (
            <TwoStepPolicyPanel state={policy} accounts={list} me={s.official} busy={busy}
              change={(v, done) => call('/api/auth/two-step', { action: 'policy', policy: v }, done)} />
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
          <AccountChanges me={s.official} placeName={placeName} refresh={changesTick} onDone={() => void load()} />
          {issued ? (
            <div role="status" className="space-y-2 rounded-[3px] border border-warn bg-surface p-3">
              <p><strong>Reset code for {issued.name}.</strong> Give it to them in person (not by email). It works once, until {new Date(issued.expiresAt).toISOString().slice(0, 16).replace('T', ' ')} UTC, at the sign-in page under &ldquo;Forgot your password?&rdquo;. It is not shown again.</p>
              <code className="block font-mono text-[18px] tracking-wider">{issued.code}</code>
              <button type="button" className={btn} onClick={() => setIssued(null)}>Done</button>
            </div>
          ) : null}
          {!full ? (
            <table className="w-full text-[13px]">
              <caption className="pb-2 text-start text-ink-soft">Officials with a platform account. Only an administrator sees their email, sign-ins and second step.</caption>
              <thead><tr className="border-b border-line text-start text-ink-muted"><th className="py-1.5 text-start font-semibold">Official</th><th className="text-start font-semibold">For</th></tr></thead>
              <tbody>
                {(list ?? []).map(a => (
                  <tr key={a.id} className="border-b border-line-soft">
                    <td className="py-1.5"><strong>{a.name}</strong><div className="text-ink-muted">{a.office}</div></td>
                    <td>{placeName(a.institution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
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
                    {a.twoStepSince || a.passkeys?.length ? <span className="text-ok">On</span> : a.twoStepRequired ? <span className="text-warn">Required, not set up</span> : <span className="text-ink-muted">Off</span>}
                    {a.passkeys?.length ? <div className="text-[12px] text-ink-muted">{a.passkeys.length} passkey{a.passkeys.length === 1 ? '' : 's'}</div> : null}
                    {a.identity ? <div className="text-[12px] text-ink-muted">Government sign-in ({a.identity.claim}){a.noPassword ? ', no platform password' : ''}</div> : null}
                    {admin && (a.twoStepSince || a.passkeys?.length) && s.official?.sub !== `local:${a.id}` ? (
                      <button type="button" className="ms-2 text-[12px] text-link underline" disabled={busy}
                        onClick={() => window.confirm(`Reset ${a.name}'s second step? Do this only when their phone or passkeys are lost: their authenticator app and passkeys are removed, and they set them up again at their next sign-in.`) && call(`/api/auth/officials/${a.id}`, { resetTwoStep: true }, `${a.name}'s second step was reset`)}>Reset</button>
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
          )}
        </>
      )}
    </div>
  );
}

interface PolicyState { policy: TwoStepPolicy; set: { by: string; at: string } | null }

const POLICY_CHOICES: { id: TwoStepPolicy; label: string; means: string }[] = [
  { id: 'none', label: 'Nobody', means: 'Each official chooses whether to use it. This is how an installation starts.' },
  { id: 'signers', label: 'Officials who can sign, and administrators', means: 'Required for the roles Can sign and Administrator; optional for officers and auditors.' },
  { id: 'all', label: 'Every official', means: 'Required for every official, whatever their role.' },
];
const policyLabel = (p: TwoStepPolicy) => POLICY_CHOICES.find(c => c.id === p)?.label ?? p;

/**
 * Who must use the second sign-in step (an authenticator code or a passkey
 * after the password). Read from the account list, changed through
 * POST /api/auth/two-step { action: 'policy' } (setTwoStepPolicy(), audited).
 * One administrator changes it; the panel says so.
 */
function TwoStepPolicyPanel({ state, accounts, me, busy, change }: {
  state: PolicyState; accounts: Account[]; busy: boolean;
  me: { sub: string; method?: string };
  change: (policy: TwoStepPolicy, done: string) => Promise<boolean>;
}) {
  const [choice, setChoice] = React.useState<TwoStepPolicy>(state.policy);
  React.useEffect(() => setChoice(state.policy), [state.policy]);
  const canChange = me.method === 'local';
  const active = accounts.filter(a => !a.disabled);
  const on = (a: Account) => !!a.twoStepSince || !!a.passkeys?.length;
  const setUp = active.filter(on);
  const covered = (p: TwoStepPolicy) => active.filter(a => twoStepCovers(p, roleOf(a)));
  const missingNow = covered(state.policy).filter(a => !on(a));
  const missingIfChosen = covered(choice).filter(a => !on(a));
  const self = accounts.find(a => me.sub === `local:${a.id}`);
  const selfBlocked = !!self && twoStepCovers(choice, roleOf(self)) && !on(self);

  async function save() {
    if (choice === state.policy) return;
    const warn = choice === 'none'
      ? 'Make the second step optional for every official? Officials who have set it up keep it; the others can then make changes without it.'
      : `Require the second step for ${policyLabel(choice).toLowerCase()}? ${missingIfChosen.length} active official${missingIfChosen.length === 1 ? ' has' : 's have'} not set it up and will make no changes until they do.`;
    if (!window.confirm(`${warn}\n\nThis takes effect at once, on your decision alone, and is recorded in the audit chain.`)) return;
    await change(choice, choice === 'none' ? 'Second step is now optional' : `Second step now required for ${policyLabel(choice).toLowerCase()}`);
  }

  return (
    <section className="space-y-3 rounded-[3px] border border-line bg-surface p-3 text-[13px]" aria-labelledby="two-step-policy">
      <div>
        <h2 id="two-step-policy" className="text-[15px] font-semibold">Second sign-in step</h2>
        <p className="mt-1 max-w-3xl text-ink-soft">
          After the password, a code from an authenticator app or a passkey. An official the rule covers makes no changes until they have set it up under <Link href="/gov/me" className="text-link underline">My account</Link> and signed in with it.
        </p>
      </div>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Required now for</dt>
        <dd>{policyLabel(state.policy)}</dd>
        <dt className="font-semibold">Last set</dt>
        <dd className="text-ink-soft">{state.set ? <>by {state.set.by}, {day(state.set.at)}</> : 'Never set: the starting rule (nobody required) applies'}</dd>
        <dt className="font-semibold">Set up</dt>
        <dd className="text-ink-soft">{setUp.length} of {active.length} active platform account{active.length === 1 ? '' : 's'}</dd>
        <dt className="font-semibold">Required, not set up</dt>
        <dd className={missingNow.length ? 'text-warn' : 'text-ink-soft'}>{missingNow.length ? missingNow.map(a => a.name).join(', ') : 'Nobody'}</dd>
      </dl>
      <fieldset className="space-y-1.5" disabled={busy || !canChange}>
        <legend className="mb-1 font-semibold">Required for</legend>
        {POLICY_CHOICES.map(c => (
          <label key={c.id} className="flex items-start gap-2">
            <input type="radio" name="two-step-policy" className="focus-ring mt-1" value={c.id} checked={choice === c.id} onChange={() => setChoice(c.id)} />
            <span><span className="font-semibold">{c.label}</span>{c.id === state.policy ? <span className="text-ink-muted"> (current)</span> : null}<span className="block text-ink-soft">{c.means}</span></span>
          </label>
        ))}
      </fieldset>
      {choice !== state.policy && choice !== 'none' ? (
        <p className="text-ink-soft">
          {missingIfChosen.length ? <>Not set up yet and would be blocked from making changes: <span className="text-warn">{missingIfChosen.map(a => a.name).join(', ')}</span>.</> : 'Every official this covers has already set it up.'}
          {selfBlocked ? <strong className="block text-warn">This includes you: set up your own second step under My account first, or you will make no further changes until you have.</strong> : null}
        </p>
      ) : null}
      {canChange ? (
        <button type="button" className={btn} disabled={busy || choice === state.policy} onClick={() => void save()}>Save the rule</button>
      ) : (
        <p className="text-ink-soft">Only an administrator signed in with a platform account can change this rule here.</p>
      )}
      <p className="text-[12px] text-ink-muted">
        Who decides: <strong className="text-ink-soft">one administrator.</strong> A change takes effect at once and is recorded in the audit chain; no second official confirms it, including turning the requirement off. Officers who sign in through the substrate are covered by the same rule; their second step is checked by the substrate&rsquo;s sign-in and is not counted above.
      </p>
    </section>
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
