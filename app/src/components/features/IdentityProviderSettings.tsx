'use client';

// Signing officials in through the government's own identity provider
// (OpenID Connect; lib/auth/oidc.ts): administrators set the provider up
// (its issuer address, the client id and secret it issued for this
// platform), choose which claim names an official, may map the provider's
// groups to roles, and decide whether its multi-factor sign-in counts as the
// second step. Officials the platform cannot match wait here until an
// administrator links them to an account or makes one with a role. Every
// change is audited; the secret is never shown again. Server:
// /api/auth/officials/identity-provider.

import * as React from 'react';
import { useSignIn } from '@/lib/official';
import { ROLES, roleOf, type OfficialRole } from '@/lib/auth/roles';

interface Rule { group: string; role: OfficialRole; institution?: string }
interface Provider {
  name: string; issuer: string; clientId: string; hasSecret: boolean; tokenAuth: string; scopes: string; matchClaim: string;
  groups?: { claim: string; rules: Rule[] }; mfa: { accept: boolean; amr: string[]; acr: string[] }; internalNetwork: boolean; extraHosts: string[];
  enabled: boolean; metadata: { authorization_endpoint: string; end_session_endpoint?: string }; updatedAt: string; updatedBy: string; version: number;
}
interface Request { id: string; claim: string; value: string; name: string; email?: string; groups: string[]; firstAt: string; lastAt: string; attempts: number; status: string; decidedBy?: string; accountId?: string; reason?: string }
interface Account { id: string; name: string; office: string; email: string; identity?: { claim: string; value: string } }
interface Institution { id: string; name: string; status: string }

const input = 'focus-ring w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const list = (s: string) => s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);

export function IdentityProviderSettings() {
  const s = useSignIn();
  const admin = !!s?.official && roleOf(s.official) === 'administrator';
  const [data, setData] = React.useState<{ provider: Provider | null; redirectUri: string | null; why?: string; requests: Request[] } | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [f, setF] = React.useState({ name: '', issuer: '', clientId: '', clientSecret: '', tokenAuth: 'client_secret_basic', scopes: 'openid profile email', matchClaim: 'sub',
    groupsClaim: 'groups', rules: [] as Rule[], mfaAccept: false, amr: 'mfa hwk otp', acr: '', internalNetwork: false, extraHosts: '' });
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pick, setPick] = React.useState<Record<string, { accountId: string; role: OfficialRole; institution: string; office: string; name: string; email: string }>>({});

  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/officials/identity-provider', { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json() as NonNullable<typeof data>;
    setData(d);
    const p = d.provider;
    if (p) setF(x => ({ ...x, name: p.name, issuer: p.issuer, clientId: p.clientId, clientSecret: '', tokenAuth: p.tokenAuth, scopes: p.scopes, matchClaim: p.matchClaim,
      groupsClaim: p.groups?.claim ?? 'groups', rules: p.groups?.rules ?? [], mfaAccept: p.mfa.accept, amr: p.mfa.amr.join(' '), acr: p.mfa.acr.join(' '), internalNetwork: p.internalNetwork, extraHosts: p.extraHosts.join(' ') }));
    const a = await fetch('/api/auth/officials', { cache: 'no-store' });
    if (a.ok) setAccounts(((await a.json()) as { accounts: Account[] }).accounts);
  }, []);
  React.useEffect(() => { if (admin) void load(); }, [admin, load]);
  React.useEffect(() => {
    if (!admin) return;
    void fetch('/api/org/ministries', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { ministries: [] }))
      .then((d: { ministries: Institution[] }) => setInstitutions(d.ministries.filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name))));
  }, [admin]);

  async function call(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/auth/officials/identity-provider', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: done }); await load(); return true;
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; }
    finally { setBusy(false); }
  }

  if (!admin || !data) return null;
  const p = data.provider;
  const pending = data.requests.filter(r => r.status === 'pending');
  const decided = data.requests.filter(r => r.status !== 'pending').slice(0, 10);
  const place = (id?: string) => (id ? institutions.find(m => m.id === id)?.name ?? id : 'Whole government');
  const pickFor = (r: Request) => pick[r.id] ?? { accountId: '', role: 'officer' as OfficialRole, institution: '', office: '', name: r.name, email: r.email ?? '' };
  const setPickFor = (r: Request, v: Partial<ReturnType<typeof pickFor>>) => setPick(x => ({ ...x, [r.id]: { ...pickFor(r), ...v } }));

  return (
    <section id="identity-provider" className="mx-auto mt-6 max-w-[1100px] space-y-4 rounded-[3px] border border-line bg-surface p-4 text-[14px] text-ink">
      <header>
        <h2 className="text-[19px] font-semibold">Sign in with the government&rsquo;s identity provider</h2>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Officials can sign in with their government account (single sign-on). The platform still decides what each may do: a sign-in never creates an account or gives a role by itself.
          Email and password sign-in stays available.
        </p>
      </header>
      {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}

      {p ? (
        <p className="text-[13px] text-ink-soft">
          <strong className="text-ink">{p.name}</strong> · {p.enabled ? <span className="text-ok">on</span> : <span className="text-warn">off</span>} · version {p.version}, changed {when(p.updatedAt)} by {p.updatedBy}
          {p.metadata.end_session_endpoint ? ' · signing out ends the provider session too' : ''}{' '}
          <button type="button" className={btn} disabled={busy} onClick={() => call({ action: p.enabled ? 'disable' : 'enable' }, p.enabled ? 'Turned off' : 'Turned on')}>{p.enabled ? 'Turn off' : 'Turn on'}</button>
        </p>
      ) : <p className="text-ink-soft">Not set up.</p>}
      <p className="text-[13px]">Register this address at the provider as the redirect address:{' '}
        {data.redirectUri ? <code className="break-all rounded-[3px] bg-bg px-1.5 py-0.5 font-mono">{data.redirectUri}</code> : <span className="text-warn">{data.why}</span>}
      </p>

      <form className="grid gap-3 sm:grid-cols-2" onSubmit={async e => {
        e.preventDefault();
        await call({ action: 'save', name: f.name, issuer: f.issuer, clientId: f.clientId, ...(f.clientSecret ? { clientSecret: f.clientSecret } : {}), tokenAuth: f.tokenAuth, scopes: f.scopes, matchClaim: f.matchClaim,
          groups: f.rules.length ? { claim: f.groupsClaim, rules: f.rules.map(r => ({ ...r, institution: r.institution || undefined })) } : null,
          mfa: { accept: f.mfaAccept, amr: list(f.amr), acr: list(f.acr) }, internalNetwork: f.internalNetwork, extraHosts: list(f.extraHosts) }, 'Saved: the provider\'s settings were read and checked');
        setF(x => ({ ...x, clientSecret: '' }));
      }}>
        <label className="text-[12px] text-ink-soft">Name on the sign-in button<input className={`${input} mt-1`} required maxLength={60} placeholder="e.g. Government ID" value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">Issuer address<input className={`${input} mt-1`} required placeholder="https://id.gov.example" value={f.issuer} onChange={e => setF({ ...f, issuer: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">Client id<input className={`${input} mt-1`} required value={f.clientId} onChange={e => setF({ ...f, clientId: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">Client secret{p?.hasSecret ? ' (kept; type a new one to replace it)' : ''}
          <input className={`${input} mt-1`} type="password" autoComplete="off" disabled={f.tokenAuth === 'none'} value={f.clientSecret} onChange={e => setF({ ...f, clientSecret: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">How the platform proves itself to the provider
          <select className={`${input} mt-1`} value={f.tokenAuth} onChange={e => setF({ ...f, tokenAuth: e.currentTarget.value })}>
            <option value="client_secret_basic">Client secret (header)</option>
            <option value="client_secret_post">Client secret (form)</option>
            <option value="none">No secret (public client)</option>
          </select></label>
        <label className="text-[12px] text-ink-soft">Officials are matched by
          <input className={`${input} mt-1`} required list="match-claims" value={f.matchClaim} onChange={e => setF({ ...f, matchClaim: e.currentTarget.value })} />
          <datalist id="match-claims"><option value="sub" /><option value="employee_id" /><option value="email" /></datalist>
          <span className="mt-1 block text-ink-muted">The provider&rsquo;s permanent id (sub), an employee number, or a verified email.</span></label>
        <label className="text-[12px] text-ink-soft">Scopes<input className={`${input} mt-1`} value={f.scopes} onChange={e => setF({ ...f, scopes: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">Further hosts the provider uses (optional)<input className={`${input} mt-1`} placeholder="keys.id.gov.example" value={f.extraHosts} onChange={e => setF({ ...f, extraHosts: e.currentTarget.value })} /></label>
        <label className="flex items-start gap-2 text-[13px] sm:col-span-2"><input type="checkbox" checked={f.internalNetwork} onChange={e => setF({ ...f, internalNetwork: e.currentTarget.checked })} />
          The provider is on the government&rsquo;s own network (allows its private address; nothing else).</label>
        <fieldset className="space-y-2 rounded-[3px] border border-line p-3 sm:col-span-2">
          <legend className="px-1 text-[13px] font-semibold">Second sign-in step</legend>
          <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={f.mfaAccept} onChange={e => setF({ ...f, mfaAccept: e.currentTarget.checked })} />
            Count the provider&rsquo;s own multi-factor sign-in as the second step here</label>
          {f.mfaAccept ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[12px] text-ink-soft">Methods that count (amr)<input className={`${input} mt-1`} value={f.amr} onChange={e => setF({ ...f, amr: e.currentTarget.value })} /></label>
              <label className="text-[12px] text-ink-soft">Or assurance levels that count (acr)<input className={`${input} mt-1`} value={f.acr} onChange={e => setF({ ...f, acr: e.currentTarget.value })} /></label>
            </div>
          ) : null}
        </fieldset>
        <fieldset className="space-y-2 rounded-[3px] border border-line p-3 sm:col-span-2">
          <legend className="px-1 text-[13px] font-semibold">Roles from the provider&rsquo;s groups (optional)</legend>
          <p className="text-[12px] text-ink-muted">Without rules, roles are set only here by administrators. With rules, the first group that matches sets the official&rsquo;s role at sign-in (recorded in the audit chain).</p>
          <label className="text-[12px] text-ink-soft">Groups claim<input className={`${input} mt-1 max-w-xs`} value={f.groupsClaim} onChange={e => setF({ ...f, groupsClaim: e.currentTarget.value })} /></label>
          {f.rules.map((r, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="text-[12px] text-ink-soft">Group<input className={`${input} mt-1 w-48`} required value={r.group} onChange={e => { const rules = [...f.rules]; rules[i] = { ...r, group: e.currentTarget.value }; setF({ ...f, rules }); }} /></label>
              <label className="text-[12px] text-ink-soft">Role<select className={`${input} mt-1 w-44`} value={r.role} onChange={e => { const rules = [...f.rules]; rules[i] = { ...r, role: e.currentTarget.value as OfficialRole }; setF({ ...f, rules }); }}>
                {ROLES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
              <label className="text-[12px] text-ink-soft">For<select className={`${input} mt-1 w-56`} value={r.institution ?? ''} onChange={e => { const rules = [...f.rules]; rules[i] = { ...r, institution: e.currentTarget.value || undefined }; setF({ ...f, rules }); }}>
                <option value="">Whole government</option>{institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <button type="button" className={btn} onClick={() => setF({ ...f, rules: f.rules.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          ))}
          <button type="button" className={btn} onClick={() => setF({ ...f, rules: [...f.rules, { group: '', role: 'officer' }] })}>Add a group rule</button>
        </fieldset>
        <div className="sm:col-span-2"><button className={btn} disabled={busy}>{busy ? 'Checking the provider…' : p ? 'Save changes' : 'Set up'}</button></div>
      </form>

      <div className="space-y-2">
        <h3 className="text-[16px] font-semibold">Waiting for an administrator ({pending.length})</h3>
        {pending.length === 0 ? <p className="text-ink-soft">Nobody is waiting.</p> : pending.map(r => {
          const v = pickFor(r);
          return (
            <div key={r.id} className="space-y-2 rounded-[3px] border border-line p-3">
              <p><strong>{r.name}</strong> <span className="text-[13px] text-ink-muted">· {r.claim} {r.value}{r.email ? ` · ${r.email}` : ''}{r.groups.length ? ` · groups ${r.groups.join(', ')}` : ''} · {r.attempts} attempt{r.attempts === 1 ? '' : 's'}, last {when(r.lastAt)}</span></p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-[12px] text-ink-soft">Link to an existing account<select className={`${input} mt-1 w-64`} value={v.accountId} onChange={e => setPickFor(r, { accountId: e.currentTarget.value })}>
                  <option value="">Choose…</option>{accounts.filter(a => !a.identity).map(a => <option key={a.id} value={a.id}>{a.name} · {a.office}</option>)}</select></label>
                <button type="button" className={btn} disabled={busy || !v.accountId} onClick={() => call({ action: 'decide', requestId: r.id, decision: 'link', accountId: v.accountId }, `${r.name} linked`)}>Link</button>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-[12px] text-ink-soft">Or make an account: name<input className={`${input} mt-1 w-44`} value={v.name} onChange={e => setPickFor(r, { name: e.currentTarget.value })} /></label>
                <label className="text-[12px] text-ink-soft">Office<input className={`${input} mt-1 w-44`} value={v.office} onChange={e => setPickFor(r, { office: e.currentTarget.value })} /></label>
                <label className="text-[12px] text-ink-soft">Email<input className={`${input} mt-1 w-52`} type="email" value={v.email} onChange={e => setPickFor(r, { email: e.currentTarget.value })} /></label>
                <label className="text-[12px] text-ink-soft">Role<select className={`${input} mt-1 w-40`} value={v.role} onChange={e => setPickFor(r, { role: e.currentTarget.value as OfficialRole })}>
                  {ROLES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
                <label className="text-[12px] text-ink-soft">For<select className={`${input} mt-1 w-52`} value={v.institution} onChange={e => setPickFor(r, { institution: e.currentTarget.value })}>
                  <option value="">Whole government</option>{institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
                <button type="button" className={btn} disabled={busy} onClick={() => call({ action: 'decide', requestId: r.id, decision: 'create', account: { name: v.name, office: v.office, email: v.email, role: v.role, institution: v.institution } }, `Account made for ${v.name} (${place(v.institution || undefined)})`)}>Make account</button>
                <button type="button" className={btn} disabled={busy} onClick={() => { const reason = window.prompt('Why is this refused? (recorded)') ?? ''; void call({ action: 'decide', requestId: r.id, decision: 'refuse', reason }, `${r.name} refused`); }}>Refuse</button>
              </div>
            </div>
          );
        })}
        {decided.length ? (
          <details className="text-[13px] text-ink-soft"><summary className="cursor-pointer">Recently decided</summary>
            <ul className="mt-1 space-y-1">{decided.map(r => <li key={r.id}>{r.name} · {r.status} by {r.decidedBy}{r.reason ? ` · ${r.reason}` : ''}</li>)}</ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
