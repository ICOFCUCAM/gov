'use client';

// Who is responsible (setup 3.5, docs/GOVERNMENT_OPERATING_MODEL.md §3.2):
// the nation names, for each register, the institution legally responsible
// for it. During first-run setup it is saved into the nation profile
// (/api/sovereign, administrators, audited). Once setup is complete it
// changes only through the change process (/api/sovereign/authorities; plan
// phase 2): an administrator serving the whole government proposes it citing
// the law, a different official confirms it, every version is kept.
// Procedures, the laws register and civil registration read it. Nothing is
// chosen for the nation: an unnamed register says so, and the constitutional
// bodies (legislature, audit office, central bank…) are named only when the
// nation has them.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { AUTHORITIES, HEALTH_SLOTS, PROVISIONAL_FALLBACK, type AuthorityKey } from '@/lib/nation/deployment';
import type { Ministry } from '@/lib/api/types';

type AuthorityMap = Partial<Record<AuthorityKey, string>>;
interface Version { values: { authorities: AuthorityMap }; basis: { title?: string; instrument: string; num?: string; eId: string }[]; by: string; at: string; expiresAt?: string; confirmed?: { by: string; at: string }; outcome?: string }
interface Changes { pending?: Version; history?: Version[] }

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function ResponsibleAuthorities() {
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [chosen, setChosen] = React.useState<AuthorityMap>({});
  const [saved, setSaved] = React.useState<AuthorityMap>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  // After setup: the change process.
  const [setupComplete, setSetupComplete] = React.useState(false);
  const [changes, setChanges] = React.useState<Changes>({});
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });

  const loadChanges = React.useCallback(async () => {
    const r = await fetch('/api/sovereign/authorities', { cache: 'no-store' });
    if (r.ok) { const d = (await r.json()) as { changes: Changes; setupComplete: boolean; authorities: AuthorityMap }; setChanges(d.changes); setSetupComplete(d.setupComplete); setSaved(d.authorities); return d.authorities; }
    return null;
  }, []);

  React.useEffect(() => {
    Promise.all([api.sovereign.get(), api.org.ministries()]).then(([s, m]) => {
      const a = s.sovereign.deployment?.authorities ?? {};
      setChosen(a); setSaved(a);
      setMinistries(m.ministries.filter(x => x.status === 'active'));
    }).catch(e => setMsg(e instanceof Error ? e.message : 'Could not load'));
    void loadChanges();
  }, [loadChanges]);

  const changed = AUTHORITIES.some(a => (chosen[a.key] ?? '') !== (saved[a.key] ?? ''));
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const authorities = Object.fromEntries(AUTHORITIES.map(a => [a.key, chosen[a.key] ?? '']));
      const r = await api.sovereign.update({ deployment: { authorities } });
      const a = r.sovereign.deployment?.authorities ?? {};
      setChosen(a); setSaved(a); setMsg('Saved.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  };

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/sovereign/authorities', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
      const a = await loadChanges();
      if (a) setChosen(a);
      setMsg(done);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  };
  const propose = () => {
    const authorities = Object.fromEntries(AUTHORITIES.filter(a => (chosen[a.key] ?? '') !== (saved[a.key] ?? '')).map(a => [a.key, chosen[a.key] ?? '']));
    void post({ op: 'propose', authorities, legalBasis: law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [] }, 'Proposed: a different official confirms it before it takes effect.');
  };

  const nameOf = (id?: string) => (id ? ministries.find(m => m.id === id)?.name ?? id : 'not named');
  const diff = (v: Version) => AUTHORITIES.filter(a => (v.values.authorities[a.key] ?? '') !== (saved[a.key] ?? '')).map(a => `${a.label}: ${nameOf(saved[a.key])} → ${nameOf(v.values.authorities[a.key])}`);
  const cites = (v: Version) => v.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ');

  const select = (a: (typeof AUTHORITIES)[number]) => (
    <label key={a.key} className="block text-sm">
      <span className="font-medium">{a.label}</span>
      <span className="block text-xs text-ink-muted">{a.registers}</span>
      <select className={field} value={chosen[a.key] ?? ''}
        onChange={e => setChosen(c => ({ ...c, [a.key]: e.target.value || undefined }))}>
        <option value="">{a.optional ? 'None (the nation has no such body, or not named yet)' : 'Not named yet'}</option>
        {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </label>
  );

  return (
    <div id="who-is-responsible" className="scroll-mt-24">
    <Section title="Who is responsible" meta="the institution legally responsible for each register">
      <p className="mb-3 text-xs text-ink-muted">
        The platform never names an authority itself. Until one is named, the register says so and its procedures cannot start.
        {setupComplete ? ' Setup is complete, so a change here is proposed citing the law and takes effect only when a different official confirms it.' : ' During setup, choices are saved directly.'}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {AUTHORITIES.filter(a => !a.optional).map(select)}
      </div>
      <h3 className="mt-4 text-sm font-semibold">Constitutional bodies</h3>
      <p className="mb-2 text-xs text-ink-muted">
        Only those your nation has. The body named for the legislature, the head of state, a constitutional court, the judiciary or data protection is independent:
        officials serving the whole government do not reach its records, cases or accounts. Others are independent when their standing says so (Ministries &amp; agencies).
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {AUTHORITIES.filter(a => a.optional && !HEALTH_SLOTS.includes(a.key)).map(select)}
      </div>
      <h3 className="mt-4 text-sm font-semibold">Health bodies apart from the health regulator</h3>
      <p className="mb-2 text-xs text-ink-muted">
        Only where your nation&apos;s law sets them apart. Until one is named, the forms that name it are owned provisionally by the body below it
        ({HEALTH_SLOTS.map(k => `${AUTHORITIES.find(a => a.key === k)!.label} → ${AUTHORITIES.find(a => a.key === PROVISIONAL_FALLBACK[k])!.label}`).join('; ')}).
        A provisional owner is shown as such, is not proof of legal competence and does not pass the competent-authority check in production.
        Where the health regulator is the competent body in law, name it here as well.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {AUTHORITIES.filter(a => HEALTH_SLOTS.includes(a.key)).map(select)}
      </div>
      {setupComplete ? (
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision (e.g. sec_3)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
          <div className="flex items-end"><Button variant="primary" disabled={busy || !changed || !!changes.pending} onClick={propose}>Propose a change</Button></div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" disabled={busy || !changed} onClick={save}>Save responsibilities</Button>
        </div>
      )}
      {changes.pending ? (
        <div className="mt-3 rounded border border-line p-2 text-sm">
          <p><strong>Waiting for a second official:</strong> {diff(changes.pending).join('; ') || 'no change'}</p>
          <p className="text-xs text-ink-muted">Proposed by {changes.pending.by} · basis {cites(changes.pending)} · lapses {changes.pending.expiresAt?.slice(0, 16).replace('T', ' ')} UTC</p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void post({ op: 'confirm' }, 'Confirmed: the change is in force.')}>Confirm</Button>
            <Button disabled={busy} onClick={() => void post({ op: 'withdraw' }, 'Withdrawn.')}>Withdraw</Button>
          </div>
        </div>
      ) : null}
      {msg ? <p role="status" className="mt-2 text-xs text-ink-muted">{msg}</p> : null}
      {changes.history?.length ? (
        <details className="mt-3 text-xs text-ink-muted">
          <summary className="cursor-pointer">Earlier changes ({changes.history.length})</summary>
          <ul className="mt-1 space-y-1">
            {[...changes.history].reverse().map((h, i) => (
              <li key={i}>{h.outcome} · proposed by {h.by}{h.confirmed ? `, confirmed by ${h.confirmed.by}` : ''} · {h.at.slice(0, 10)} · basis {cites(h)}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Section>
    </div>
  );
}
