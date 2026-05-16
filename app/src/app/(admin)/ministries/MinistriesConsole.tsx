'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { TextField } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import { scoreInstitution, LIFECYCLE_LABEL } from '@/lib/institution/readiness';
import type { Archetype, ArchetypeKey, Ministry } from '@/lib/api/types';

export function MinistriesConsole() {
  const [archetypes, setArchetypes] = React.useState<Archetype[]>([]);
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [a, m] = await Promise.all([
      api.org.archetypes(),
      api.org.ministries(),
    ]);
    setArchetypes(a.archetypes);
    setMinistries(m.ministries);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function guard(fn: () => Promise<unknown>) {
    setErr(null);
    try { await fn(); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }

  const active = ministries.filter(m => m.status === 'active');
  const current = ministries.find(m => m.id === selected) ?? null;
  const deptCount = ministries.reduce((a, m) => a + (m.departments?.length ?? 0), 0);
  const moduleCount = ministries.reduce((a, m) => a + (m.modules?.filter(x => x.enabled).length ?? 0), 0);
  const reg = [
    { l: 'Institutions', v: String(ministries.length), c: 'rgb(var(--c-ink))' },
    { l: 'Active', v: String(active.length), c: 'rgb(var(--c-ok))' },
    { l: 'Archetypes', v: String(archetypes.length), c: 'rgb(var(--c-ink))' },
    { l: 'Departments', v: String(deptCount), c: 'rgb(var(--c-ink))' },
    { l: 'Modules enabled', v: String(moduleCount), c: 'rgb(var(--c-ok))' },
    { l: 'Registry', v: ministries.length ? 'COMPOSED' : 'EMPTY', c: ministries.length ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] sm:grid-cols-3 md:grid-cols-6">
        {reg.map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
          </div>
        ))}
      </div>

      <Plain>
        Ministries are <strong>data, not code</strong>. Instantiate one from a
        sovereign archetype blueprint, then rename, merge, deactivate, add or
        remove departments, and toggle modules — no platform rewrite. Every
        ministry inherits the shared core (identity, audit, RBAC, workflows,
        notifications, observability, interoperability).
      </Plain>

      {err ? <p className="text-sm text-alert" role="alert">{err}</p> : null}

      <Card tight>
        <h3 className="font-semibold">Create a ministry from an archetype</h3>
        <form
          onSubmit={e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void guard(() =>
              api.org.create({
                archetype: f.get('archetype') as ArchetypeKey,
                name: String(f.get('name')),
                slug: String(f.get('slug')),
              }),
            );
            (e.target as HTMLFormElement).reset();
          }}
        >
          <label className="mb-1 block font-medium">Archetype blueprint</label>
          <select
            name="archetype"
            required
            className="mb-3 min-h-tap w-full rounded-[3px] border border-line bg-surface p-3"
          >
            {archetypes.map(a => (
              <option key={a.key} value={a.key}>
                {a.title} — {a.summary}
              </option>
            ))}
          </select>
          <TextField label="Name (rename freely later)" name="name" required placeholder="Ministry of Health" />
          <TextField label="Slug" name="slug" required placeholder="health" />
          <Button type="submit">Provision ministry</Button>
        </form>
      </Card>

      {ministries.length === 0 ? (
        <EmptyState
          title="No ministries yet"
          hint="Pick an archetype above to compose your first institution."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {ministries.map(m => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                aria-current={m.id === selected ? 'true' : undefined}
                className={
                  'block w-full rounded-[3px] border p-3 text-left ' +
                  (m.id === selected
                    ? 'border-ink bg-surface'
                    : 'border-line bg-surface hover:bg-surface-2')
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="text-sm">{m.name}</strong>
                  <span className="font-mono text-xs text-ink-muted">{m.slug}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Pill tone={m.status === 'active' ? 'ok' : m.status === 'merged' ? 'warn' : 'alert'}>
                    {m.status}
                  </Pill>
                  <span className="text-xs text-ink-muted">{m.archetype}</span>
                  {(() => {
                    const r = scoreInstitution(m);
                    const ok = r.deployable;
                    return (
                      <span className="ml-auto rounded-[3px] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `color-mix(in srgb, ${ok ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))'} 18%, transparent)`, color: ok ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>
                        {r.total}% · {ok ? 'Deployable' : 'Incomplete'}
                      </span>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {!current ? (
              <EmptyState title="Select a ministry" hint="Pick one to configure it." />
            ) : (
              <>
                <Card tight>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-xl font-semibold">{current.name}</h2>
                    <Pill tone={current.status === 'active' ? 'ok' : 'warn'}>{current.status}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    Archetype {current.archetype} · slug {current.slug}
                  </p>
                  {(() => {
                    const r = scoreInstitution(current);
                    const c = r.deployable ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))';
                    return (
                      <div className="mt-3 rounded-[3px] border border-line p-2.5">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                            Institution readiness · {LIFECYCLE_LABEL[r.lifecycle]}
                          </span>
                          <span className="rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `color-mix(in srgb, ${c} 18%, transparent)`, color: c }}>
                            {r.total}% · {r.deployable ? 'Deployable' : 'Incomplete'}
                          </span>
                        </div>
                        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full" style={{ width: `${r.total}%`, backgroundColor: c }} />
                        </div>
                        <ul className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                          {r.dimensions.map(d => {
                            const dc = d.score >= 70 ? 'rgb(var(--c-ok))' : d.score >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
                            return (
                              <li key={d.key} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                                <span className="min-w-0">
                                  <span className="block truncate text-ink-soft">{d.label}</span>
                                  <span className="block truncate text-[9px] text-ink-muted">{d.detail}</span>
                                </span>
                                <span className="shrink-0 font-mono tabular-nums" style={{ color: dc }}>{d.score}</span>
                              </li>
                            );
                          })}
                        </ul>
                        {!r.deployable ? (
                          <p className="mt-1.5 text-[10px]" style={{ color: 'rgb(var(--c-warn))' }}>
                            Blocking: {r.blocking.join(' · ')}. Activation gate requires ≥70% with governance, operational and deployment provisioned.
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[10px] text-ink-muted">Validated for the national deployment directory.</p>
                        )}
                      </div>
                    );
                  })()}
                  <p className="mt-2">
                    <a
                      href={`/ministries/${current.id}/operations`}
                      className="text-sm text-link underline underline-offset-2"
                    >
                      Open operations console →
                    </a>
                  </p>
                  {current.status === 'active' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form
                        className="flex items-end gap-2"
                        onSubmit={e => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void guard(() => api.org.rename(current.id, String(f.get('n'))));
                        }}
                      >
                        <TextField label="Rename" name="n" className="mb-0" defaultValue={current.name} />
                        <Button type="submit" variant="secondary">Rename</Button>
                      </form>
                    </div>
                  ) : null}
                  {current.status === 'active' ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Merge into</label>
                        <select
                          id="mergeTarget"
                          className="min-h-tap rounded-[3px] border border-line bg-surface p-2"
                          defaultValue=""
                        >
                          <option value="" disabled>choose…</option>
                          {active.filter(x => x.id !== current.id).map(x => (
                            <option key={x.id} value={x.id}>{x.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const t = (document.getElementById('mergeTarget') as HTMLSelectElement)?.value;
                          if (t) void guard(() => api.org.merge(current.id, t));
                        }}
                      >
                        Merge
                      </Button>
                      <Button variant="warn" onClick={() => guard(() => api.org.deactivate(current.id))}>
                        Deactivate
                      </Button>
                    </div>
                  ) : null}
                </Card>

                <Card tight>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Departments</h3>
                  <ul className="mt-2 space-y-1">
                    {current.departments.map(d => (
                      <li key={d.id} className="flex items-center justify-between text-sm">
                        <span>{d.name}</span>
                        {current.status === 'active' ? (
                          <button
                            className="text-xs text-alert underline"
                            onClick={() => guard(() => api.org.removeDepartment(current.id, d.id))}
                          >
                            remove
                          </button>
                        ) : null}
                      </li>
                    ))}
                    {current.departments.length === 0 ? (
                      <li className="text-sm text-ink-muted">No departments.</li>
                    ) : null}
                  </ul>
                  {current.status === 'active' ? (
                    <form
                      className="mt-3 flex items-end gap-2"
                      onSubmit={e => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void guard(() => api.org.addDepartment(current.id, String(f.get('d'))));
                        (e.target as HTMLFormElement).reset();
                      }}
                    >
                      <TextField label="Add department" name="d" className="mb-0" />
                      <Button type="submit" variant="secondary">Add</Button>
                    </form>
                  ) : null}
                </Card>

                <Card tight>
                  <h3 className="font-semibold">Operational modules</h3>
                  <p className="mb-2 text-sm text-ink-muted">
                    Toggle sector modules on or off — policy-driven composition,
                    not code branches.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {current.modules.map(mod => (
                      <label
                        key={mod.moduleKey}
                        className="flex items-center justify-between gap-2 rounded-[3px] border border-line p-2 text-sm"
                      >
                        <span className="font-mono">{mod.moduleKey}</span>
                        <input
                          type="checkbox"
                          checked={mod.enabled}
                          disabled={current.status !== 'active'}
                          onChange={e =>
                            guard(() => api.org.setModule(current.id, mod.moduleKey, e.target.checked))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
