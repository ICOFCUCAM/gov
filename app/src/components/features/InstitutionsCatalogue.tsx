'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  listInstitutionsRows, listFacilitiesRows, type FacilityRowLite,
} from '@/lib/db/repos/institutions';
import { substrateAvailable } from '@/lib/db/client';
import type { InstitutionRow, InstitutionKind } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { getPref, getBoolPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const KINDS: (InstitutionKind | 'all')[] = ['all', 'ministry', 'branch', 'agency', 'platform', 'officer', 'citizen'];

/**
 * InstitutionsCatalogue — the federation registry, browseable.
 *
 * Left: institutions filtered by kind, sorted by charter_id.
 * Right: facilities for the selected charter, grouped by region.
 *
 * Both tables are publicly readable per the v1 RLS, so this surface
 * works for anonymous viewers too — it's the system's "phone book".
 */
export function InstitutionsCatalogue() {
  const { ready } = useIdentity();
  const [items, setItems] = React.useState<InstitutionRow[]>([]);
  const [facilities, setFacilities] = React.useState<FacilityRowLite[]>([]);
  const [kindFilter, setKindFilter] = React.useState<InstitutionKind | 'all'>(
    () => getPref<InstitutionKind | 'all'>('registry.kind',
      ['all','ministry','branch','agency','platform','officer','citizen'] as const, 'all'));
  const [activatedOnly, setActivatedOnly] = React.useState(() => getBoolPref('registry.activatedOnly', false));
  React.useEffect(() => { setPref('registry.kind', kindFilter); setPref('registry.activatedOnly', activatedOnly); }, [kindFilter, activatedOnly]);
  const [active, setActive] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const opts: Parameters<typeof listInstitutionsRows>[0] = {};
    if (kindFilter !== 'all') opts.kind = kindFilter;
    if (activatedOnly) opts.activated = true;
    const rows = await listInstitutionsRows(opts);
    setItems(rows);
    if (!active && rows.length > 0) setActive(rows[0]!.charter_id);
  }, [available, kindFilter, activatedOnly, active]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  React.useEffect(() => {
    if (!active) { setFacilities([]); return; }
    void listFacilitiesRows({ charter: active, limit: 100 }).then(setFacilities);
  }, [active]);

  if (!available) {
    return <SubstrateNotConfigured title="Institutions Catalogue" />;
  }

  const activeRow = items.find(i => i.charter_id === active) ?? null;

  // Group facilities by region for the per-charter pane.
  const byRegion = new Map<string, FacilityRowLite[]>();
  for (const f of facilities) {
    const k = f.region ?? '—';
    if (!byRegion.has(k)) byRegion.set(k, []);
    byRegion.get(k)!.push(f);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Institutions Catalogue</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            federation registry
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
            <input type="checkbox" checked={activatedOnly} onChange={e => setActivatedOnly(e.currentTarget.checked)} />
            activated only
          </label>
        </div>
      </div>

      <FilterChips label="kind:" options={KINDS} value={kindFilter} onChange={setKindFilter} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
        <Panel title="Institutions" meta={`${items.length}`} bodyClass="!p-0">
          {items.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No institutions match the filter.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {items.map(i => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setActive(i.charter_id)}
                  className="block w-full border-b border-line-soft px-3 py-1.5 text-left last:border-0 hover:bg-surface-2"
                  style={{ backgroundColor: i.charter_id === active ? 'rgba(55,199,212,0.04)' : undefined }}
                >
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="w-16 shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
                      {i.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-link">{i.charter_id}</span>
                    <span
                      className="w-12 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                      style={{ color: i.activated ? TONE.ok : TONE.warn }}
                    >
                      {i.activated ? 'live' : 'idle'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-ink">{i.label}</div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-3">
          {activeRow ? (
            <Panel title={activeRow.label} meta={activeRow.domain} bodyClass="!p-3 text-[11px] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Charter" value={activeRow.charter_id} mono />
                <Field label="Kind" value={activeRow.kind} />
                <Field label="Archetype / branch" value={activeRow.archetype_or_branch} mono />
                <Field label="Domain" value={activeRow.domain} mono />
                <Field label="Grammar" value={activeRow.grammar ?? '—'} />
                <Field
                  label="Activation"
                  value={activeRow.activated
                    ? `live since ${activeRow.activated_at?.slice(0,10) ?? '?'}`
                    : 'idle'}
                />
              </div>
              {activeRow.safeguards_constant ? (
                <div className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px] text-ink-muted">
                  safeguards: {activeRow.safeguards_constant}
                </div>
              ) : null}
              <a href={`/gov/charter/${encodeURIComponent(activeRow.charter_id)}`}
                className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
                open charter detail →
              </a>
            </Panel>
          ) : (
            <Panel title="Selected institution" meta="" bodyClass="!p-3">
              <p className="text-[11px] text-ink-muted">Select an institution.</p>
            </Panel>
          )}

          <Panel title="Facilities" meta={`${facilities.length}${active ? ' · ' + active : ''}`} bodyClass="!p-0">
            {facilities.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-ink-muted">
                {active ? 'No facilities registered for this charter.' : 'Select an institution.'}
              </p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {Array.from(byRegion.entries()).map(([region, fs]) => (
                  <div key={region} className="border-b border-line-soft last:border-0">
                    <div className="bg-surface px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
                      {region}
                    </div>
                    {fs.map(f => (
                      <div key={f.id} className="flex items-center gap-2 border-t border-line-soft px-3 py-1 text-[10px] first:border-0">
                        <span className="w-20 shrink-0 truncate font-mono text-ink-soft">{f.code}</span>
                        <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
                        <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{f.kind ?? '—'}</span>
                        <span
                          className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                          style={{ color: f.operational_status === 'operational' ? TONE.ok : TONE.warn }}
                        >
                          {f.operational_status}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
