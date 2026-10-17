'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { locales } from '@/lib/i18n/config';
import { COUNTRIES, loadCountry } from '@/lib/geo/admin1';
import { applyNation } from '@/lib/nation/registry';
import { constitutionFor } from '@/lib/gov/constitution';
import { ACCENT } from '@/components/features/SituationRoom';
import { OnboardingFrame, Eyebrow, Field, inputCls, SealTile } from './Chrome';
import type { NationalConstitution, SovereignProfile, SovereignPreset, StateForm, Ministry, Archetype, ArchetypeKey, PlatformSetup } from '@/lib/api/types';

const STEPS = [
  { k: 'nation', t: 'Nation', s: 'Form of state and offices' },
  { k: 'identity', t: 'Identity', s: 'Insignia, colour, motto, language' },
  { k: 'institutions', t: 'Institutions', s: 'Ministries and agencies' },
  { k: 'review', t: 'Review & launch', s: 'Confirm and go live' },
] as const;

const STATE_FORMS: { k: StateForm; l: string }[] = [
  { k: 'republic', l: 'Presidential republic' },
  { k: 'parliamentary', l: 'Parliamentary republic' },
  { k: 'federation', l: 'Federation' },
  { k: 'monarchy', l: 'Monarchy' },
  { k: 'city-state', l: 'City-state' },
  { k: 'union', l: 'Supranational union' },
];

const SWATCHES = ['#1f6f8b', '#1f3a5f', '#2d6a4f', '#14532d', '#7a1f2b', '#5c3a8a', '#8a5a14', '#334155'];

type NewInst = { archetype: ArchetypeKey; name: string };
type LogLine = { m: string; s: 'run' | 'ok' | 'fail'; d?: string };

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'institution';

/**
 * First-run setup. A nation (or a ministry acting for it) loads its
 * constitutional profile, identity and institutions into the live registry.
 * Re-entering after completion edits the same configuration.
 */
export function SetupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const after = params.get('path') === 'institution' ? '/welcome?path=institution' : '/welcome';

  const [step, setStep] = React.useState(0);
  const [profile, setProfile] = React.useState<SovereignProfile | null>(null);
  const [presets, setPresets] = React.useState<SovereignPreset[]>([]);
  const [preset, setPreset] = React.useState<string | null>(null);
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [archetypes, setArchetypes] = React.useState<Archetype[]>([]);
  const [active, setActive] = React.useState<Record<string, boolean>>({});
  const [added, setAdded] = React.useState<NewInst[]>([]);
  const [draft, setDraft] = React.useState<NewInst>({ archetype: 'GENERIC', name: '' });
  const [existing, setExisting] = React.useState<PlatformSetup | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<LogLine[] | null>(null);
  const [done, setDone] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [provinces, setProvinces] = React.useState<string[]>([]);
  const [regionDraft, setRegionDraft] = React.useState('');
  const countries = React.useMemo(() => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)), []);
  const zones = React.useMemo<string[]>(() => {
    try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return []; }
  }, []);

  // The country's real admin-1 units (from the bundled geography) seed the region list.
  const iso3 = profile?.iso3;
  React.useEffect(() => {
    if (!iso3) { setProvinces([]); return; }
    let live = true;
    loadCountry(iso3).then(c => {
      if (!live || !c) return;
      const names = c.provinces.map(p => p.name).sort((a, b) => a.localeCompare(b));
      setProvinces(names);
      setProfile(p => (p && !(p.regions?.length) && names.length <= 16 ? { ...p, regions: names } : p));
    });
    return () => { live = false; };
  }, [iso3]);

  React.useEffect(() => {
    Promise.all([api.sovereign.get(), api.sovereign.presets(), api.org.ministries(), api.org.archetypes(), api.setup.get()])
      .then(([s, p, m, a, st]) => {
        setProfile(s.sovereign);
        setPresets(p.presets);
        const live = m.ministries.filter(x => x.status !== 'merged');
        setMinistries(live);
        setActive(Object.fromEntries(live.map(x => [x.id, x.status === 'active'])));
        setArchetypes(a.archetypes);
        setExisting(st.setup);
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Could not load the current configuration'));
  }, []);

  if (loadError) {
    return (
      <OnboardingFrame>
        <div className="py-20"><Eyebrow>Setup</Eyebrow><p className="mt-4 text-[15px] text-[#f1707a]">{loadError}</p></div>
      </OnboardingFrame>
    );
  }
  if (!profile) {
    return <OnboardingFrame><p className="py-20 font-mono text-[11px] uppercase tracking-[0.2em] text-[#65748b]">Loading configuration…</p></OnboardingFrame>;
  }

  const set = <K extends keyof SovereignProfile>(k: K, v: SovereignProfile[K]) => { setProfile(p => p && { ...p, [k]: v }); };
  const template = constitutionFor(profile.stateForm);
  const cons: NationalConstitution = profile.constitution ?? {};
  const setCons = (patch: Partial<NationalConstitution>) => set('constitution', { ...cons, ...patch });
  const chamberRows = [0, 1].map(i => cons.chambers?.[i] ?? { name: '', seats: 0 });
  const setChamber = (i: number, patch: Partial<{ name: string; seats: number }>) =>
    setCons({ chambers: chamberRows.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  // Only complete chambers are saved; blank rows fall back to the template.
  const cleanConstitution = (c?: NationalConstitution): NationalConstitution | undefined => {
    if (!c) return undefined;
    const chambers = (c.chambers ?? []).filter(x => x.name.trim() && x.seats > 0);
    return { ...c, chambers: chambers.length ? chambers : undefined };
  };
  const identity = resolveIdentity(profile);

  const nationErrors = [
    !profile.stateName.trim() && 'State name is required',
    !profile.executiveTitle.trim() && 'Executive title is required',
    !profile.legislatureName.trim() && 'Legislature name is required',
    !/^[A-Z]{3}$/.test(profile.currency) && 'Currency must be a three-letter ISO code',
  ].filter(Boolean) as string[];
  const activeCount = ministries.filter(m => active[m.id]).length + added.length;
  const instErrors = activeCount === 0 ? ['Keep at least one institution active'] : [];
  const errors = step === 0 ? nationErrors : step === 2 ? instErrors : [];
  const canLaunch = nationErrors.length === 0 && instErrors.length === 0;

  function applyPreset(p: SovereignPreset) {
    setPreset(p.key);
    setProfile(cur => ({ ...p.profile, seal: cur?.seal, iso3: cur?.iso3, regions: cur?.regions, aiAssistant: cur?.aiAssistant, constitution: cur?.constitution, paymentRail: cur?.paymentRail, timeZone: cur?.timeZone, emergency: cur?.emergency, foreignAffairs: cur?.foreignAffairs }));
  }

  function addInstitution() {
    if (!draft.name.trim()) return;
    setAdded(a => [...a, { ...draft, name: draft.name.trim() }]);
    setDraft({ archetype: draft.archetype, name: '' });
  }

  async function launch() {
    if (!profile) return;
    setRunning(true);
    try {
      if (await applyAll(profile)) {
        applyNation({ ...profile, constitution: cleanConstitution(profile.constitution), configured: true });
        setDone(true);
      }
    } finally { setRunning(false); }
  }

  async function applyAll(profile: SovereignProfile): Promise<boolean> {
    const lines: LogLine[] = [];
    const push = (l: LogLine) => { lines.push(l); setLog([...lines]); return lines.length - 1; };
    const settle = (i: number, s: LogLine['s'], d?: string) => { lines[i] = { ...lines[i]!, s, d }; setLog([...lines]); };
    async function run(m: string, fn: () => Promise<unknown>) {
      const i = push({ m, s: 'run' });
      try { await fn(); settle(i, 'ok'); return true; } catch (e) { settle(i, 'fail', e instanceof Error ? e.message : 'failed'); return false; }
    }

    const ok = await run(`Saving national profile · ${profile.stateName}`, () => api.sovereign.update({ ...profile, aiAssistant: !!profile.aiAssistant, constitution: cleanConstitution(profile.constitution) }).then(r => { applyNation(r.sovereign); return r; }));
    if (!ok) return false;
    for (const m of ministries) {
      const want = !!active[m.id], is = m.status === 'active';
      if (want && !is) await run(`Activating ${m.name}`, () => api.org.activate(m.id));
      if (!want && is) await run(`Standing down ${m.name}`, () => api.org.deactivate(m.id));
    }
    const taken = new Set(ministries.map(m => m.slug));
    for (const n of added) {
      let slug = slugify(n.name), i = 2;
      while (taken.has(slug)) slug = `${slugify(n.name)}-${i++}`;
      taken.add(slug);
      await run(`Chartering ${n.name}`, () => api.org.create({ archetype: n.archetype, name: n.name, slug }));
    }
    return run('Recording setup in the audit chain', () => api.setup.complete(profile.executiveTitle));
  }

  return (
    <OnboardingFrame right={<span className="hidden sm:inline">{existing ? 'SETUP · REVIEW' : 'FIRST-RUN SETUP'}</span>}>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:py-12">
        {/* Step rail */}
        <aside className="min-w-0">
          <Eyebrow>{existing ? 'Review configuration' : 'Set up your nation'}</Eyebrow>
          <ol className="mt-5 flex gap-2 overflow-x-auto lg:flex-col lg:gap-0">
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'next';
              return (
                <li key={s.k} className="shrink-0 lg:border-l lg:border-[#16202f]">
                  <button type="button" disabled={!!log || (i > step && !canLaunch && i === 3)}
                    onClick={() => !log && setStep(i)}
                    className="relative flex items-center gap-3 rounded-[6px] px-3 py-2 text-left disabled:cursor-default lg:-ml-px lg:rounded-none lg:border-l-2 lg:py-3 lg:pl-4"
                    style={{ borderColor: state === 'current' ? ACCENT : 'transparent', background: state === 'current' ? 'rgba(55,199,212,0.06)' : undefined }}>
                    <span className="font-mono text-[11px] tabular-nums" style={{ color: state === 'next' ? '#4a576b' : ACCENT }}>
                      {state === 'done' ? '✓' : `0${i + 1}`}
                    </span>
                    <span>
                      <span className={`block text-[14px] font-semibold ${state === 'next' ? 'text-[#7d8ba0]' : 'text-[#e2e9f3]'}`}>{s.t}</span>
                      <span className="hidden text-[12px] text-[#65748b] lg:block">{s.s}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {existing ? (
            <p className="mt-6 hidden text-[12px] leading-relaxed text-[#65748b] lg:block">
              Setup was completed {new Date(existing.completedAt).toLocaleDateString()} by {existing.by}. Changes here update the live configuration.
            </p>
          ) : null}
        </aside>

        {/* Step body */}
        <section className="min-w-0">
          {step === 0 && (
            <div>
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] sm:text-[2.3rem]">How is your state constituted?</h1>
              <p className="mt-2 max-w-[60ch] text-[14.5px] text-[#94a3b8]">Start from a constitutional template, then name your offices. Everything stays editable later.</p>

              <div className="mt-7 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {presets.map(p => {
                  const on = preset === p.key;
                  return (
                    <button key={p.key} type="button" onClick={() => applyPreset(p)}
                      className="rounded-[8px] border px-4 py-3 text-left transition-colors hover:border-[#2a3a52]"
                      style={{ borderColor: on ? ACCENT : '#16202f', background: on ? 'rgba(55,199,212,0.07)' : 'rgba(11,17,28,0.8)' }}>
                      <span className="block text-[13.5px] font-semibold text-[#e2e9f3]">{p.label}</span>
                      <span className="mt-0.5 block font-mono text-[10.5px] text-[#65748b]">{p.profile.executiveTitle} · {p.profile.legislatureName}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <Field label="Official name of the state">
                  <input className={inputCls} value={profile.stateName} onChange={e => set('stateName', e.currentTarget.value)} placeholder="Republic of …" />
                </Field>
                <Field label="Form of state">
                  <select className={inputCls} value={profile.stateForm} onChange={e => set('stateForm', e.currentTarget.value as StateForm)}>
                    {STATE_FORMS.map(f => <option key={f.k} value={f.k}>{f.l}</option>)}
                  </select>
                </Field>
                <Field label="Head of government — title">
                  <input className={inputCls} value={profile.executiveTitle} onChange={e => set('executiveTitle', e.currentTarget.value)} placeholder="President, Prime Minister …" />
                </Field>
                <Field label="Legislature">
                  <input className={inputCls} value={profile.legislatureName} onChange={e => set('legislatureName', e.currentTarget.value)} placeholder="National Assembly …" />
                </Field>
                <Field label="Domestic payment rail" hint="How citizens pay, e.g. Mobile Money, Instant Payments">
                  <input className={inputCls} value={profile.paymentRail ?? ''} placeholder="Mobile Money" onChange={e => set('paymentRail', e.currentTarget.value)} />
                </Field>
                <Field label="Currency" hint="ISO 4217, e.g. GHS, KES, NGN, EUR">
                  <input className={`${inputCls} font-mono uppercase`} maxLength={3} value={profile.currency} onChange={e => set('currency', e.currentTarget.value.toUpperCase())} />
                </Field>
                <Field label="Sub-national unit" hint="What you call your regions">
                  <input className={inputCls} value={profile.regionNoun} onChange={e => set('regionNoun', e.currentTarget.value)} placeholder="region, province, county …" />
                </Field>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Field label="Country" hint="Sets the national map and its real provinces.">
                  <select className={inputCls} value={profile.iso3 ?? ''} onChange={e => { const v = e.currentTarget.value; setProfile(p => p && { ...p, iso3: v || undefined, regions: [] }); }}>
                    <option value="">Choose a country…</option>
                    {countries.map(c => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
                  </select>
                </Field>
                <div>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Operational regions</span>
                  <div className="mt-2 flex min-h-[44px] flex-wrap gap-1.5 rounded-[6px] border border-[#1f2b3e] bg-[#070c15] p-2">
                    {(profile.regions ?? []).map(rg => (
                      <span key={rg} className="flex items-center gap-1.5 rounded-full border border-[#2a3a52] px-2.5 py-1 text-[12.5px]">
                        {rg}
                        <button type="button" aria-label={`Remove ${rg}`} className="text-[#7d8ba0] hover:text-white"
                          onClick={() => set('regions', (profile.regions ?? []).filter(x => x !== rg))}>×</button>
                      </span>
                    ))}
                    <input list="setup-provinces" value={regionDraft} placeholder={(profile.regions ?? []).length ? 'Add region…' : 'Add a region…'}
                      onChange={e => { const v = e.currentTarget.value; setRegionDraft(v); }}
                      onKeyDown={e => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const v = regionDraft.trim();
                        if (v && !(profile.regions ?? []).includes(v)) set('regions', [...(profile.regions ?? []), v]);
                        setRegionDraft('');
                      }}
                      className="min-w-[140px] flex-1 bg-transparent px-1 text-[13px] text-[#e2e9f3] placeholder:text-[#4a576b] focus:outline-none" />
                    <datalist id="setup-provinces">{provinces.map(n => <option key={n} value={n} />)}</datalist>
                  </div>
                  <span className="mt-1.5 block text-[12px] text-[#56647a]">
                    {provinces.length > 16
                      ? `${provinces.length} first-level units on the map. Add the regions your government reports by, or `
                      : 'Dashboards and engines report by these regions. Press Enter to add.'}
                    {provinces.length > 16 ? (
                      <button type="button" className="underline underline-offset-2 hover:text-white" onClick={() => set('regions', provinces)}>use all {provinces.length}</button>
                    ) : null}
                  </span>
                </div>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <Field label="Time zone of the capital">
                  <select className={inputCls} value={profile.timeZone ?? ''} onChange={e => set('timeZone', e.currentTarget.value || undefined)}>
                    <option value="">Choose a time zone…</option>
                    {zones.map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
                  </select>
                </Field>
                <Field label="Emergency number" hint="Fire, ambulance and rescue">
                  <input className={`${inputCls} font-mono`} value={profile.emergency?.general ?? ''} placeholder="e.g. 112" onChange={e => set('emergency', { ...profile.emergency, general: e.currentTarget.value })} />
                </Field>
                <Field label="Police number" hint="Leave blank if the same">
                  <input className={`${inputCls} font-mono`} value={profile.emergency?.police ?? ''} placeholder="e.g. 999" onChange={e => set('emergency', { ...profile.emergency, police: e.currentTarget.value })} />
                </Field>
              </div>

              <div className="mt-8 rounded-[10px] border border-[#16202f] bg-[#0b111c]/80 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Constitution</span>
                  <span className="text-[12px] text-[#56647a]">Blank fields use the {template.label.toLowerCase()} template shown in grey.</span>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Field label="Head of state — title">
                    <input className={inputCls} value={cons.headOfStateTitle ?? ''} placeholder={template.authorityChain[0]?.office} onChange={e => setCons({ headOfStateTitle: e.currentTarget.value })} />
                  </Field>
                  <Field label="Official residence of the executive">
                    <input className={inputCls} value={cons.executiveSeat ?? ''} placeholder="e.g. State House" onChange={e => setCons({ executiveSeat: e.currentTarget.value })} />
                  </Field>
                  <Field label="Apex court">
                    <input className={inputCls} value={cons.judicialApex ?? ''} placeholder={template.judicialApex} onChange={e => setCons({ judicialApex: e.currentTarget.value })} />
                  </Field>
                  {chamberRows.map((c, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                      <Field label={i === 0 ? 'Primary chamber' : 'Upper chamber (leave blank if none)'}>
                        <input className={inputCls} value={c.name} placeholder={template.legislature.chambers[i]?.name ?? '—'} onChange={e => setChamber(i, { name: e.currentTarget.value })} />
                      </Field>
                      <Field label="Seats">
                        <input className={`${inputCls} font-mono`} type="number" min={1} value={c.seats || ''} placeholder={String(template.legislature.chambers[i]?.seats ?? '')} onChange={e => setChamber(i, { seats: Number(e.currentTarget.value) || 0 })} />
                      </Field>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Field label="Source" hint="Cite the constitution and articles these facts come from.">
                      <input className={inputCls} value={cons.source ?? ''} placeholder="e.g. Constitution of 1995, arts. 77–78" onChange={e => setCons({ source: e.currentTarget.value })} />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Optional services</span>
                <label className="mt-3 flex cursor-pointer items-start gap-4 rounded-[8px] border border-[#16202f] bg-[#0b111c]/80 px-4 py-4 hover:border-[#2a3a52]">
                  <input type="checkbox" checked={!!profile.aiAssistant} onChange={e => set('aiAssistant', e.currentTarget.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#37c7d4]" />
                  <span>
                    <span className="block text-[14px] font-semibold text-[#e2e9f3]">AI assistant</span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#7d8ba0]">
                      Offer officers drafted advisories on operational dashboards. Off unless you switch it on;
                      decisions always remain with people, and it can be changed later.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-10 xl:grid-cols-[1fr_340px]">
              <div>
                <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] sm:text-[2.3rem]">Give the state its identity</h1>
                <p className="mt-2 max-w-[60ch] text-[14.5px] text-[#94a3b8]">The insignia, colour and motto appear across the National Shell, the Command Center and every official surface.</p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field label="Insignia monogram" hint="Up to 3 letters. Leave blank to derive from the name.">
                    <input className={`${inputCls} font-mono uppercase`} maxLength={3} value={profile.seal ?? ''} onChange={e => set('seal', e.currentTarget.value.toUpperCase())} placeholder={identity.seal} />
                  </Field>
                  <Field label="Official language">
                    <select className={inputCls} value={profile.locale} onChange={e => set('locale', e.currentTarget.value)}>
                      {locales.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Motto or formal style">
                      <input className={inputCls} value={profile.motto ?? ''} onChange={e => set('motto', e.currentTarget.value)} placeholder="Unity · Liberty · Service" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Sovereign colour</span>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {SWATCHES.map(c => (
                        <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => set('accent', c)}
                          className="h-9 w-9 rounded-full ring-offset-2 ring-offset-[#060a12] transition-transform hover:scale-110"
                          style={{ background: c, boxShadow: identity.accent.toLowerCase() === c ? `0 0 0 2px #060a12, 0 0 0 4px ${ACCENT}` : undefined }} />
                      ))}
                      <label className="flex items-center gap-2 rounded-full border border-[#1f2b3e] py-1 pl-1 pr-3 text-[12px] text-[#94a3b8]">
                        <input type="color" value={identity.accent} onChange={e => set('accent', e.currentTarget.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                        Custom
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-[10px] border border-[#1a2536] bg-[#0b111c]/90 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Preview</p>
                <div className="mt-5 flex items-center gap-4">
                  <SealTile seal={identity.seal} accent={identity.accent} />
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold">{identity.stateName || 'Your state'}</p>
                    <p className="truncate text-[12.5px] text-[#7d8ba0]">{identity.motto || 'Motto'}</p>
                  </div>
                </div>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Order of precedence</p>
                <ol className="mt-3 space-y-2">
                  {identity.protocol.map(o => (
                    <li key={o.rank} className="flex items-baseline gap-3 text-[13px]">
                      <span className="font-mono text-[11px]" style={{ color: ACCENT }}>{o.rank}</span>
                      <span className="text-[#c5d0df]">{o.office}</span>
                      <span className="ml-auto truncate text-right text-[#65748b]">{o.holder}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 text-[12px] text-[#56647a]">Writing direction: {identity.dir.toUpperCase()}</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] sm:text-[2.3rem]">Load your institutions</h1>
              <p className="mt-2 max-w-[62ch] text-[14.5px] text-[#94a3b8]">
                The canonical federation is already provisioned. Keep the ministries your government runs, stand down the rest, and charter any that are missing.
              </p>

              <ul className="mt-7 grid gap-2 sm:grid-cols-2">
                {ministries.map(m => {
                  const on = !!active[m.id];
                  return (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-[8px] border px-4 py-3 transition-colors"
                        style={{ borderColor: on ? '#1f3a48' : '#16202f', background: on ? 'rgba(55,199,212,0.05)' : 'rgba(11,17,28,0.6)' }}>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[14px] font-semibold ${on ? 'text-[#e2e9f3]' : 'text-[#7d8ba0]'}`}>{m.name}</span>
                          <span className="block font-mono text-[10.5px] text-[#56647a]">{m.archetype} · {m.departments.length} departments</span>
                        </span>
                        <input type="checkbox" className="peer sr-only" checked={on} onChange={() => setActive(a => ({ ...a, [m.id]: !on }))} />
                        <span aria-hidden className="relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#37c7d4]/60"
                          style={{ background: on ? ACCENT : '#1f2b3e' }}>
                          <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left]" style={{ left: on ? 18 : 2 }} />
                        </span>
                      </label>
                    </li>
                  );
                })}
                {added.map((n, i) => (
                  <li key={`new-${i}`}>
                    <div className="flex items-center gap-3 rounded-[8px] border border-dashed px-4 py-3" style={{ borderColor: ACCENT }}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">{n.name}</span>
                        <span className="block font-mono text-[10.5px]" style={{ color: ACCENT }}>NEW · {n.archetype}</span>
                      </span>
                      <button type="button" onClick={() => setAdded(a => a.filter((_, j) => j !== i))} className="text-[12px] text-[#7d8ba0] hover:text-white">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-[10px] border border-[#1a2536] bg-[#0b111c]/80 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Charter a new institution</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto]">
                  <select aria-label="Archetype" className={inputCls} value={draft.archetype} onChange={e => { const archetype = e.currentTarget.value as ArchetypeKey; setDraft(d => ({ ...d, archetype })); }}>
                    {archetypes.map(a => <option key={a.key} value={a.key}>{a.title}</option>)}
                  </select>
                  <input aria-label="Institution name" className={inputCls} value={draft.name} placeholder="e.g. Ministry of Digital Economy"
                    onChange={e => { const name = e.currentTarget.value; setDraft(x => ({ ...x, name })); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInstitution(); } }} />
                  <button type="button" onClick={addInstitution} disabled={!draft.name.trim()}
                    className="rounded-[6px] border border-[#2a3a52] px-4 py-2.5 text-[13px] font-semibold text-[#e2e9f3] hover:border-[#37c7d4] disabled:opacity-40">
                    Add
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-[#56647a]">{archetypes.find(a => a.key === draft.archetype)?.summary}</p>
              </div>

              <div className="mt-6 rounded-[10px] border border-[#1a2536] bg-[#0b111c]/80 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">Foreign relations (optional)</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Diplomatic partners" hint="One per line: Country — Capital">
                    <textarea rows={5} className={inputCls}
                      value={(profile.foreignAffairs?.partners ?? []).map(p => p.capital ? `${p.name} — ${p.capital}` : p.name).join('\n')}
                      placeholder={'Kenya — Nairobi\nTanzania — Dodoma'}
                      onChange={e => {
                        const partners = e.currentTarget.value.split('\n').map(l => l.split(/\s+[—-]\s+/)).map(([name, capital]) => ({ name: (name ?? '').trim(), capital: capital?.trim() || undefined }));
                        set('foreignAffairs', { ...profile.foreignAffairs, partners });
                      }} />
                  </Field>
                  <Field label="International memberships" hint="Comma-separated, e.g. United Nations, African Union">
                    <textarea rows={5} className={inputCls}
                      value={(profile.foreignAffairs?.memberships ?? []).join(', ')}
                      placeholder="United Nations, African Union, East African Community"
                      onChange={e => set('foreignAffairs', { ...profile.foreignAffairs, memberships: e.currentTarget.value.split(',').map(m => m.trimStart()) })} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] sm:text-[2.3rem]">
                {existing ? 'Apply changes' : `Launch ${profile.stateName || 'your state'}`}
              </h1>
              <p className="mt-2 max-w-[60ch] text-[14.5px] text-[#94a3b8]">
                Review what will go live. Each change is applied to the registry and recorded in the audit chain.
              </p>

              {!log ? (
                <div className="mt-7 grid gap-3 lg:grid-cols-3">
                  <Summary title="Nation" onEdit={() => setStep(0)} rows={[
                    ['State', profile.stateName], ['Form', STATE_FORMS.find(f => f.k === profile.stateForm)?.l ?? profile.stateForm],
                    ['Executive', profile.executiveTitle], ['Legislature', profile.legislatureName],
                    ['Currency', profile.currency], ['Regions', profile.regionNoun],
                    ['Country', countries.find(c => c.iso3 === profile.iso3)?.name ?? '—'],
                    ['Chambers', constitutionFor(profile.stateForm, cleanConstitution(profile.constitution)).legislature.chambers.map(c => `${c.name} (${c.seats})`).join(' · ')],
                    ['Regions', profile.regions?.length ? `${profile.regions.length} · ${profile.regions.slice(0, 3).join(', ')}${profile.regions.length > 3 ? '…' : ''}` : 'Reference set'],
                    ['AI assistant', profile.aiAssistant ? 'On' : 'Off'],
                  ]} />
                  <Summary title="Identity" onEdit={() => setStep(1)} rows={[
                    ['Insignia', identity.seal], ['Colour', identity.accent], ['Motto', identity.motto || '—'],
                    ['Language', locales.find(l => l.code === profile.locale)?.name ?? profile.locale],
                  ]} />
                  <Summary title="Institutions" onEdit={() => setStep(2)} rows={[
                    ['Active', String(ministries.filter(m => active[m.id]).length)],
                    ['Stood down', String(ministries.filter(m => !active[m.id]).length)],
                    ['New charters', String(added.length)],
                  ]} />
                </div>
              ) : (
                <ol aria-live="polite" className="mt-7 rounded-[10px] border border-[#1a2536] bg-[#070c15] p-5 font-mono text-[12.5px] leading-[2]">
                  {log.map((l, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="min-w-0 flex-1 truncate text-[#c5d0df]">{l.m}</span>
                      <span style={{ color: l.s === 'ok' ? '#34d39c' : l.s === 'fail' ? '#f1707a' : '#7d8ba0' }}>
                        {l.s === 'run' ? '…' : l.s === 'ok' ? 'ok' : 'failed'}
                      </span>
                    </li>
                  ))}
                  {log.filter(l => l.s === 'fail').map((l, i) => (
                    <li key={`e${i}`} className="mt-2 text-[11.5px] leading-relaxed text-[#f1707a]">{l.m}: {l.d}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#16202f] pt-6">
            {errors.length ? <p className="mr-auto text-[13px] text-[#e0b341]">{errors[0]}</p> : <span className="mr-auto" />}
            {done ? (
              <button type="button" onClick={() => router.push(after)}
                className="rounded-[6px] px-5 py-3 text-[14px] font-semibold text-[#03141a]" style={{ background: ACCENT }}>
                Continue to welcome →
              </button>
            ) : (
              <>
                {step > 0 && !log ? (
                  <button type="button" onClick={() => setStep(s => s - 1)} className="rounded-[6px] border border-[#1f2b3e] px-5 py-3 text-[14px] text-[#c5d0df] hover:border-[#2a3a52]">Back</button>
                ) : null}
                {step < 3 ? (
                  <button type="button" disabled={errors.length > 0} onClick={() => setStep(s => s + 1)}
                    className="rounded-[6px] px-5 py-3 text-[14px] font-semibold text-[#03141a] disabled:opacity-40" style={{ background: ACCENT }}>
                    Continue →
                  </button>
                ) : (
                  <button type="button" disabled={!canLaunch || running} onClick={launch}
                    className="rounded-[6px] px-5 py-3 text-[14px] font-semibold text-[#03141a] disabled:opacity-40" style={{ background: ACCENT }}>
                    {running ? 'Applying…' : log ? 'Retry' : existing ? 'Apply changes' : 'Launch'}
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </OnboardingFrame>
  );
}

function Summary({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <div className="rounded-[10px] border border-[#1a2536] bg-[#0b111c]/80 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">{title}</p>
        <button type="button" onClick={onEdit} className="text-[12px] hover:underline" style={{ color: ACCENT }}>Edit</button>
      </div>
      <dl className="mt-3 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-[13px]">
            <dt className="w-24 shrink-0 text-[#65748b]">{k}</dt>
            <dd className="min-w-0 truncate text-[#e2e9f3]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
