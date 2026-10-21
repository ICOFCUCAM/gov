'use client';

// The institution an institution page shows (plan I2): from ?institution=, else
// the signed-in official's own, else the first in the registry. Officials of
// one institution see their own; the API decides what may be read
// (canReadAdministration()), so a choice beyond reach answers with the reason.

import * as React from 'react';

export interface InstitutionOption { id: string; name: string; status: string }

export function useInstitution(): { list: InstitutionOption[]; id: string | null; setId: (id: string) => void; mine: string | null } {
  const [list, setList] = React.useState<InstitutionOption[]>([]);
  const [id, setIdState] = React.useState<string | null>(null);
  const [mine, setMine] = React.useState<string | null>(null);
  React.useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('institution');
    void Promise.all([
      fetch('/api/org/ministries', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { ministries: [] })).catch(() => ({ ministries: [] })),
      fetch('/api/auth/official', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([m, o]) => {
      const l = ((m.ministries ?? []) as InstitutionOption[]).filter(x => x.status !== 'merged').map(x => ({ id: x.id, name: x.name, status: x.status }));
      setList(l);
      const own = (o as { official?: { institution?: string } } | null)?.official?.institution ?? null;
      setMine(own);
      setIdState(wanted && l.some(x => x.id === wanted) ? wanted : own && l.some(x => x.id === own) ? own : l[0]?.id ?? null);
    });
  }, []);
  const setId = React.useCallback((next: string) => {
    setIdState(next);
    const u = new URL(window.location.href);
    u.searchParams.set('institution', next);
    window.history.replaceState(null, '', u.toString());
  }, []);
  return { list, id, setId, mine };
}

export function InstitutionPicker({ list, id, setId, mine }: { list: InstitutionOption[]; id: string | null; setId: (id: string) => void; mine: string | null }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-ink-soft">Institution</span>
      <select value={id ?? ''} onChange={e => setId(e.target.value)} className="min-h-tap max-w-full rounded-[3px] border border-line bg-surface px-2 py-1">
        {list.map(x => <option key={x.id} value={x.id}>{x.name}{x.id === mine ? ' (yours)' : ''}{x.status !== 'active' ? ` (${x.status})` : ''}</option>)}
      </select>
    </label>
  );
}

/** Read a JSON endpoint; an error answer becomes its message. */
export async function readJson<T>(url: string): Promise<{ data?: T; error?: string }> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { data: j as T } : { error: (j as { error?: string }).error ?? `Request failed (${r.status})` };
  } catch (e) { return { error: e instanceof Error ? e.message : 'Could not load' }; }
}
