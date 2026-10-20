'use client';

// Who is responsible (setup 3.5, docs/GOVERNMENT_OPERATING_MODEL.md §3.2):
// the nation names, for each register, the institution legally responsible
// for it. Saved into the nation profile (/api/sovereign, administrators,
// audited); procedures, the laws register and civil registration read it.
// Nothing is chosen for the nation: an unnamed register says so.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { AUTHORITIES, type AuthorityKey } from '@/lib/nation/deployment';
import type { Ministry } from '@/lib/api/types';

export function ResponsibleAuthorities() {
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [chosen, setChosen] = React.useState<Partial<Record<AuthorityKey, string>>>({});
  const [saved, setSaved] = React.useState<Partial<Record<AuthorityKey, string>>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    Promise.all([api.sovereign.get(), api.org.ministries()]).then(([s, m]) => {
      const a = s.sovereign.deployment?.authorities ?? {};
      setChosen(a); setSaved(a);
      setMinistries(m.ministries.filter(x => x.status === 'active'));
    }).catch(e => setMsg(e instanceof Error ? e.message : 'Could not load'));
  }, []);

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

  return (
    <Section title="Who is responsible" meta="the institution legally responsible for each register">
      <p className="mb-3 text-xs text-ink-muted">
        The platform never names an authority itself. Until one is named, the register says so and its procedures cannot start.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {AUTHORITIES.map(a => (
          <label key={a.key} className="block text-sm">
            <span className="font-medium">{a.label}</span>
            <span className="block text-xs text-ink-muted">{a.registers}</span>
            <select className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm" value={chosen[a.key] ?? ''}
              onChange={e => setChosen(c => ({ ...c, [a.key]: e.target.value || undefined }))}>
              <option value="">Not named yet</option>
              {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="primary" disabled={busy || !changed} onClick={save}>Save responsibilities</Button>
        {msg ? <span role="status" className="text-xs text-ink-muted">{msg}</span> : null}
      </div>
    </Section>
  );
}
