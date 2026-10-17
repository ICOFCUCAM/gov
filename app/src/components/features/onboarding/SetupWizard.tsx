'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { locales } from '@/lib/i18n/config';
import { COUNTRIES, loadCountry } from '@/lib/geo/admin1';
import { applyNation } from '@/lib/nation/registry';
import { constitutionFor } from '@/lib/gov/constitution';
import { OnboardingFrame, Eyebrow, Field, inputCls, SealTile, Section, Select, Rule, Corners, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI, GOLD, INK } from './Chrome';
import type { NationalConstitution, SovereignProfile, SovereignPreset, StateForm, Ministry, Archetype, ArchetypeKey, PlatformSetup } from '@/lib/api/types';

const STEPS = [
  { k: 'nation', t: 'Nation', s: 'Form of state and offices' },
  { k: 'identity', t: 'Identity', s: 'Insignia, colour, motto, language' },
  { k: 'institutions', t: 'Institutions', s: 'Ministries and agencies' },
  { k: 'review', t: 'Review & launch', s: 'Confirm and go live' },
] as const;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

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
  // null = not chosen yet: follows the saved chambers, else the template.
  const [singleChamber, setSingleChamber] = React.useState<boolean | null>(null);
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
        <div className="py-20"><Eyebrow>Setup</Eyebrow><p className="mt-4 text-[15px] font-light text-[#f1938f]">{loadError}</p></div>
      </OnboardingFrame>
    );
  }
  if (!profile) {
    return (
      <OnboardingFrame>
        <div className="grid flex-1 place-items-center py-20">
          <p className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#d9c398]/70">
            <span aria-hidden className="h-px w-10 animate-pulse bg-[#d9c398]/60" />Loading configuration…<span aria-hidden className="h-px w-10 animate-pulse bg-[#d9c398]/60" />
          </p>
        </div>
      </OnboardingFrame>
    );
  }

  const set = <K extends keyof SovereignProfile>(k: K, v: SovereignProfile[K]) => { setProfile(p => p && { ...p, [k]: v }); };
  const template = constitutionFor(profile.stateForm);
  const cons: NationalConstitution = profile.constitution ?? {};
  const setCons = (patch: Partial<NationalConstitution>) => set('constitution', { ...cons, ...patch });
  const chamberRows = [0, 1].map(i => cons.chambers?.[i] ?? { name: '', seats: 0 });
  const setChamber = (i: number, patch: Partial<{ name: string; seats: number }>) =>
    setCons({ chambers: chamberRows.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const complete = (c: { name: string; seats: number }) => !!c.name.trim() && c.seats > 0;
  const blank = (c: { name: string; seats: number }) => !c.name.trim() && !(c.seats > 0);
  const single = singleChamber ?? (chamberRows.filter(complete).length === 1 && blank(chamberRows[1]!)
    ? true : template.legislature.chambers.length === 1);
  const chooseSingle = (v: boolean) => {
    setSingleChamber(v);
    if (v) setCons({ chambers: [chamberRows[0]!, { name: '', seats: 0 }] });
  };
  // Only complete chambers are saved; with none declared the template's chambers apply.
  const cleanConstitution = (c?: NationalConstitution): NationalConstitution | undefined => {
    if (!c) return undefined;
    const chambers = (c.chambers ?? []).slice(0, single ? 1 : 2).filter(complete);
    return { ...c, chambers: chambers.length ? chambers : undefined };
  };
  const chamberErrors = [
    chamberRows.some(c => !complete(c) && !blank(c)) && 'Give each chamber both a name and a seat count',
    singleChamber === true && !complete(chamberRows[0]!) && 'Name the single chamber and its seats',
    !single && complete(chamberRows[0]!) !== complete(chamberRows[1]!) && 'Name both chambers, or tick "No upper chamber"',
  ].filter(Boolean) as string[];
  // Constitutional facts that will come from the form-of-state template rather than the nation.
  const inherited = [
    !cleanConstitution(cons)?.chambers && 'chambers',
    !cons.judicialApex?.trim() && 'apex court',
    !cons.headOfStateTitle?.trim() && 'head of state',
  ].filter(Boolean) as string[];
  const identity = resolveIdentity(profile);

  const nationErrors = [
    !profile.stateName.trim() && 'State name is required',
    !profile.executiveTitle.trim() && 'Executive title is required',
    !profile.legislatureName.trim() && 'Legislature name is required',
    !/^[A-Z]{3}$/.test(profile.currency) && 'Currency must be a three-letter ISO code',
    ...chamberErrors,
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

  const stepLocked = (i: number) => !!log || (i > step && !canLaunch && i === 3);
  const regionsList = profile.regions ?? [];
  // Which level the regions are: the map's first-level administrative units, or the nation's own groupings.
  const regionLevel: 'admin' | 'groups' = provinces.length > 0 && regionsList.length === provinces.length
    && regionsList.every(r => provinces.includes(r)) ? 'admin' : 'groups';

  return (
    <OnboardingFrame right={<span className="hidden sm:inline">{existing ? 'SETUP · REVIEW' : 'FIRST-RUN SETUP'}</span>}>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-16 lg:py-14">
        {/* Step rail — a vertical timeline of the instrument's articles */}
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <Eyebrow>{existing ? 'Review configuration' : 'Set up your nation'}</Eyebrow>
          <p className="mt-2 hidden text-[13px] font-light leading-relaxed text-white/45 lg:block">
            A constitutional instrument in four articles.
          </p>

          {/* Phone: four stations on a horizontal line */}
          <ol className="relative mt-5 grid grid-cols-4 lg:hidden">
            <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[15px] h-px" style={{ background: hair(0.2) }} />
            <span aria-hidden className="absolute left-[12.5%] top-[15px] h-px transition-[width] duration-500" style={{ width: `${(step / 3) * 75}%`, background: GOLD }} />
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'next';
              return (
                <li key={s.k} className="relative min-w-0">
                  <button type="button" disabled={stepLocked(i)} onClick={() => !log && setStep(i)} aria-current={state === 'current' ? 'step' : undefined}
                    className="flex w-full flex-col items-center gap-2 rounded-[2px] px-1 text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd] disabled:cursor-default">
                    <Station i={i} state={state} />
                    <span className={`block w-full truncate text-[11.5px] ${state === 'next' ? 'text-white/40' : state === 'current' ? 'text-[#f4e4bd]' : 'text-white/75'}`}>{s.t}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Desktop: vertical timeline with gold progress */}
          <ol className="relative mt-9 hidden lg:block">
            <span aria-hidden className="absolute bottom-[34px] left-[15px] top-[18px] w-px" style={{ background: hair(0.18) }} />
            <span aria-hidden className="absolute left-[15px] top-[18px] w-px transition-[height] duration-500" style={{ height: `calc((100% - 52px) * ${step / 3})`, background: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)`, boxShadow: `0 0 8px ${hair(0.5)}` }} />
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'next';
              return (
                <li key={s.k} className="relative">
                  <button type="button" disabled={stepLocked(i)} onClick={() => !log && setStep(i)} aria-current={state === 'current' ? 'step' : undefined}
                    className="group flex w-full items-start gap-4 rounded-[2px] py-3.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd] disabled:cursor-default">
                    <Station i={i} state={state} />
                    <span className="min-w-0 pt-0.5">
                      <span className="block font-mono text-[9.5px] uppercase tracking-[0.28em]" style={{ color: state === 'next' ? 'rgba(255,255,255,0.28)' : hair(0.75) }}>Article {ROMAN[i]}</span>
                      <span className={`mt-1 block text-[16px] font-light tracking-[-0.005em] transition-colors ${state === 'next' ? 'text-white/45 group-enabled:group-hover:text-white/75' : state === 'current' ? 'text-[#f4e4bd]' : 'text-[#f3efe6]'}`}>{s.t}</span>
                      <span className="mt-0.5 block text-[12px] font-light text-white/40">{s.s}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {existing ? (
            <p className="mt-8 hidden border-l pl-4 text-[12px] font-light leading-relaxed text-white/45 lg:block" style={{ borderColor: hair(0.35) }}>
              Setup was completed {new Date(existing.completedAt).toLocaleDateString()} by {existing.by}. Changes here update the live configuration.
            </p>
          ) : null}
        </aside>

        {/* Step body */}
        <section className="min-w-0">
          {step === 0 && (
            <div>
              <StepHead i={0} lead="Start from a constitutional template, then name your offices. Everything stays editable later.">
                How is your state <Gilt>constituted?</Gilt>
              </StepHead>

              <Section n="1.1" title="Constitutional template">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
                  {presets.map((p, i) => {
                    const on = preset === p.key;
                    return (
                      <button key={p.key} type="button" onClick={() => applyPreset(p)} aria-pressed={on}
                        className="group relative flex min-h-[104px] min-w-0 flex-col justify-between overflow-hidden rounded-[3px] border px-3.5 pb-3.5 pt-3 sm:px-4 text-left transition-[border-color,background-color] duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]"
                        style={{
                          borderColor: on ? hair(0.75) : hair(0.14),
                          background: on ? `linear-gradient(160deg, ${hair(0.13)}, ${hair(0.03)} 60%)` : 'linear-gradient(160deg, rgba(255,248,230,0.03), rgba(255,248,230,0.005))',
                          boxShadow: on ? `0 18px 40px -24px ${hair(0.7)}, inset 0 1px 0 rgba(255,240,210,0.12)` : 'inset 0 1px 0 rgba(255,240,210,0.04)',
                        }}>
                        {on ? <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${CHAMPAGNE_HI}, transparent)` }} /> : null}
                        <span className="flex items-center justify-between font-mono text-[9.5px] tracking-[0.24em]" style={{ color: on ? CHAMPAGNE_HI : hair(0.5) }}>
                          <span className="truncate">{String.fromCharCode(65 + i)} · TEMPLATE</span>
                          <span aria-hidden className={`grid h-4 w-4 place-items-center rounded-full border text-[9px] transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`}
                            style={{ borderColor: CHAMPAGNE, background: on ? GOLD : undefined, color: '#17120a' }}>✓</span>
                        </span>
                        <span>
                          <span className={`block text-[14px] font-light leading-snug sm:text-[15px] ${on ? 'text-[#f4e4bd]' : 'text-[#f3efe6] group-hover:text-white'}`}>{p.label}</span>
                          <span className="mt-1 block truncate font-mono text-[10px] text-white/40">{p.profile.executiveTitle} · {p.profile.legislatureName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section n="1.2" title="Offices of state">
                <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                  <Field label="Official name of the state">
                    <input className={inputCls} value={profile.stateName} onChange={e => set('stateName', e.currentTarget.value)} placeholder="Republic of …" />
                  </Field>
                  <Field label="Form of state">
                    <Select value={profile.stateForm} onChange={e => set('stateForm', e.currentTarget.value as StateForm)}>
                      {STATE_FORMS.map(f => <option key={f.k} value={f.k}>{f.l}</option>)}
                    </Select>
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
                    <input className={`${inputCls} font-mono uppercase tracking-[0.2em]`} maxLength={3} value={profile.currency} onChange={e => set('currency', e.currentTarget.value.toUpperCase())} />
                  </Field>
                  <Field label="Sub-national unit" hint="What you call your regions">
                    <input className={inputCls} value={profile.regionNoun} onChange={e => set('regionNoun', e.currentTarget.value)} placeholder="region, province, county …" />
                  </Field>
                </div>
              </Section>

              <Section n="1.3" title="Territory">
                <div className="grid gap-x-6 gap-y-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <Field label="Country" hint="Sets the national map and its real provinces.">
                    <Select value={profile.iso3 ?? ''} onChange={e => { const v = e.currentTarget.value; setProfile(p => p && { ...p, iso3: v || undefined, regions: [] }); }}>
                      <option value="">Choose a country…</option>
                      {countries.map(c => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="block font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/65">Operational regions</span>
                      <div role="radiogroup" aria-label="Region level" className="flex rounded-full border p-0.5" style={{ borderColor: hair(0.2) }}>
                        {([['admin', 'Administrative units'], ['groups', 'Reporting groups']] as const).map(([k, l]) => (
                          <button key={k} type="button" role="radio" aria-checked={regionLevel === k} disabled={k === 'admin' && !provinces.length}
                            onClick={() => {
                              if (k === 'admin') set('regions', provinces);
                              else if (regionLevel === 'admin') set('regions', []);
                            }}
                            className="rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] transition-colors disabled:opacity-35"
                            style={regionLevel === k ? { background: hair(0.16), color: CHAMPAGNE_HI } : { color: 'rgba(255,255,255,0.45)' }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex min-h-[46px] flex-wrap gap-1.5 rounded-[2px] border border-[#d9c398]/[0.13] border-b-[#d9c398]/[0.4] bg-[#07090d] bg-[linear-gradient(180deg,rgba(255,248,230,0.015),rgba(255,248,230,0.04))] p-2 shadow-[inset_0_1px_8px_rgba(0,0,0,0.45)] transition-colors focus-within:border-[#d9c398]/70 focus-within:border-b-[#f4e4bd]">
                      {regionsList.map(rg => (
                        <span key={rg} className="flex items-center gap-1.5 rounded-full border py-[3px] pl-3 pr-1.5 text-[12.5px] font-light text-[#f3efe6]"
                          style={{ borderColor: hair(0.35), background: hair(0.06) }}>
                          {rg}
                          <button type="button" aria-label={`Remove ${rg}`} className="grid h-4 w-4 place-items-center rounded-full text-[12px] leading-none text-[#d9c398]/70 hover:bg-[#d9c398]/15 hover:text-[#f4e4bd]"
                            onClick={() => set('regions', regionsList.filter(x => x !== rg))}>×</button>
                        </span>
                      ))}
                      <input list="setup-provinces" value={regionDraft} placeholder={regionsList.length ? 'Add region…' : 'Add a region…'}
                        onChange={e => { const v = e.currentTarget.value; setRegionDraft(v); }}
                        onKeyDown={e => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          const v = regionDraft.trim();
                          if (v && !regionsList.includes(v)) set('regions', [...regionsList, v]);
                          setRegionDraft('');
                        }}
                        className="min-w-[140px] flex-1 bg-transparent px-1.5 text-[13.5px] font-light text-[#f3efe6] placeholder:text-white/25 focus:outline-none" />
                      <datalist id="setup-provinces">{provinces.map((n, i) => <option key={`${n}-${i}`} value={n} />)}</datalist>
                    </div>
                    <span className="mt-1.5 block text-[11.5px] leading-snug text-white/40">
                      {regionLevel === 'admin'
                        ? `The ${provinces.length} first-level administrative units on the map — the level local government operates at. Map data can predate recent boundary changes; add or rename units to match current law.`
                        : 'Groupings for national summaries (e.g. Central, Eastern, Northern, Western in Uganda). If no government sits at this level, facilities, permits and incidents are better reported by administrative units. '}
                    </span>
                    {regionLevel === 'groups' ? <span className="mt-1 block text-[11.5px] leading-snug text-white/40">
                      {provinces.length > 16
                        ? `${provinces.length} first-level units on the map. Add the regions your government reports by, or `
                        : 'Dashboards and engines report by these regions. Press Enter to add.'}
                      {provinces.length > 16 ? (
                        <button type="button" className="text-[#d9c398] underline decoration-[#d9c398]/40 underline-offset-2 hover:text-[#f4e4bd]" onClick={() => set('regions', provinces)}>use all {provinces.length}</button>
                      ) : null}
                    </span> : null}
                  </div>
                </div>
              </Section>

              <Section n="1.4" title="Time and emergency">
                <div className="grid gap-x-6 gap-y-6 sm:grid-cols-3">
                  <Field label="Time zone of the capital">
                    <Select value={profile.timeZone ?? ''} onChange={e => set('timeZone', e.currentTarget.value || undefined)}>
                      <option value="">Choose a time zone…</option>
                      {zones.map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
                    </Select>
                  </Field>
                  <Field label="Emergency number" hint="Fire, ambulance and rescue">
                    <input className={`${inputCls} font-mono tracking-[0.12em]`} value={profile.emergency?.general ?? ''} placeholder="e.g. 112" onChange={e => set('emergency', { ...profile.emergency, general: e.currentTarget.value })} />
                  </Field>
                  <Field label="Police number" hint="Leave blank if the same">
                    <input className={`${inputCls} font-mono tracking-[0.12em]`} value={profile.emergency?.police ?? ''} placeholder="e.g. 999" onChange={e => set('emergency', { ...profile.emergency, police: e.currentTarget.value })} />
                  </Field>
                </div>
              </Section>

              <Section n="1.5" title="Constitution" aside={<>Blank fields use the {template.label.toLowerCase()} template shown in grey.</>}>
                <Panel>
                  <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                    <Field label="Head of state — title">
                      <input className={inputCls} value={cons.headOfStateTitle ?? ''} placeholder={template.authorityChain[0]?.office} onChange={e => setCons({ headOfStateTitle: e.currentTarget.value })} />
                    </Field>
                    <Field label="Official residence of the executive">
                      <input className={inputCls} value={cons.executiveSeat ?? ''} placeholder="e.g. State House" onChange={e => setCons({ executiveSeat: e.currentTarget.value })} />
                    </Field>
                    <Field label="Apex court">
                      <input className={inputCls} value={cons.judicialApex ?? ''} placeholder={template.judicialApex} onChange={e => setCons({ judicialApex: e.currentTarget.value })} />
                    </Field>
                    {chamberRows.map((c, i) => (single && i === 1 ? (
                      <div key={i} className="flex flex-col justify-end">
                        <span className="block font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/65">Upper chamber</span>
                        <p className="mt-2 flex min-h-[46px] items-center rounded-[2px] border px-4 text-[13.5px] font-light text-white/45" style={{ borderColor: hair(0.1) }}>
                          None · single-chamber legislature
                        </p>
                      </div>
                    ) : (
                      <div key={i} className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                        <Field label={i === 0 ? (single ? 'Legislature — single chamber' : 'Primary chamber') : 'Upper chamber'}>
                          <input className={inputCls} value={c.name} placeholder={template.legislature.chambers[i]?.name ?? (i === 0 ? profile.legislatureName : '—')} onChange={e => setChamber(i, { name: e.currentTarget.value })} />
                        </Field>
                        <Field label="Seats">
                          <input className={`${inputCls} font-mono`} type="number" min={1} value={c.seats || ''} placeholder={String(template.legislature.chambers[i]?.seats ?? '')} onChange={e => setChamber(i, { seats: Number(e.currentTarget.value) || 0 })} />
                        </Field>
                      </div>
                    )))}
                    <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
                      <input type="checkbox" checked={single} onChange={e => chooseSingle(e.currentTarget.checked)}
                        className="mt-[3px] h-4 w-4 shrink-0 accent-[#d9c398]" />
                      <span className="text-[13px] font-light leading-snug text-[#f3efe6]">
                        No upper chamber
                        <span className="block text-[11.5px] text-white/40">The legislature has one chamber (e.g. the Parliament of Uganda). Leaving both chamber rows blank uses the template&apos;s chambers shown in grey.</span>
                      </span>
                    </label>
                    <div className="sm:col-span-2">
                      <Field label="Source" hint="Cite the constitution and articles these facts come from.">
                        <input className={inputCls} value={cons.source ?? ''} placeholder="e.g. Constitution of 1995, arts. 77–78" onChange={e => setCons({ source: e.currentTarget.value })} />
                      </Field>
                    </div>
                  </div>
                </Panel>
              </Section>

              <Section n="1.6" title="Optional services">
                <label className="group flex cursor-pointer items-start gap-4 rounded-[3px] border px-5 py-4 transition-colors hover:border-[#d9c398]/35 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-[#f4e4bd]"
                  style={{ borderColor: profile.aiAssistant ? hair(0.5) : hair(0.14), background: 'linear-gradient(160deg, rgba(255,248,230,0.03), rgba(255,248,230,0.005))' }}>
                  <input type="checkbox" checked={!!profile.aiAssistant} onChange={e => set('aiAssistant', e.currentTarget.checked)}
                    className="peer sr-only" />
                  <span aria-hidden className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[2px] border text-[11px] leading-none transition-colors"
                    style={{ borderColor: profile.aiAssistant ? CHAMPAGNE : hair(0.4), background: profile.aiAssistant ? GOLD : 'transparent', color: '#17120a' }}>
                    {profile.aiAssistant ? '✓' : ''}
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-light text-[#f3efe6]">AI assistant</span>
                    <span className="mt-1 block text-[12.5px] font-light leading-relaxed text-white/45">
                      Offer officers drafted advisories on operational dashboards. Off unless you switch it on;
                      decisions always remain with people, and it can be changed later.
                    </span>
                  </span>
                </label>
              </Section>
            </div>
          )}

          {step === 1 && (
            <div>
              <StepHead i={1} lead="The insignia, colour and motto appear across the National Shell, the Command Center and every official surface.">
                Give the state its <Gilt>identity</Gilt>
              </StepHead>
              <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0">
                  <Section n="2.1" title="Insignia and language">
                    <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                      <Field label="Insignia monogram" hint="Up to 3 letters. Leave blank to derive from the name.">
                        <input className={`${inputCls} font-mono uppercase tracking-[0.3em]`} maxLength={3} value={profile.seal ?? ''} onChange={e => set('seal', e.currentTarget.value.toUpperCase())} placeholder={identity.seal} />
                      </Field>
                      <Field label="Official language">
                        <Select value={profile.locale} onChange={e => set('locale', e.currentTarget.value)}>
                          {locales.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                        </Select>
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Motto or formal style">
                          <input className={inputCls} value={profile.motto ?? ''} onChange={e => set('motto', e.currentTarget.value)} placeholder="Unity · Liberty · Service" />
                        </Field>
                      </div>
                    </div>
                  </Section>
                  <Section n="2.2" title="Sovereign colour" aside={<span className="font-mono tracking-[0.14em]">{identity.accent.toUpperCase()}</span>}>
                    <div className="flex flex-wrap items-center gap-3.5">
                      {SWATCHES.map(c => {
                        const on = identity.accent.toLowerCase() === c;
                        return (
                          <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={on} onClick={() => set('accent', c)}
                            className="relative h-10 w-10 rounded-full transition-transform duration-300 hover:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd] focus-visible:ring-offset-4 focus-visible:ring-offset-[#04060a]"
                            style={{
                              background: `radial-gradient(circle at 35% 30%, ${c}, ${c} 45%, #000 140%)`,
                              boxShadow: on ? `0 0 0 3px ${INK}, 0 0 0 4px ${CHAMPAGNE}, 0 0 18px ${hair(0.45)}` : `0 0 0 1px ${hair(0.22)}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                            }}>
                            {on ? <span aria-hidden className="absolute inset-0 grid place-items-center text-[12px] text-[#f4e4bd]">✓</span> : null}
                          </button>
                        );
                      })}
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-full border py-1 pl-1 pr-4 text-[12px] font-light text-white/65 transition-colors hover:border-[#d9c398]/60 hover:text-[#f4e4bd]" style={{ borderColor: hair(0.3) }}>
                        <input type="color" value={identity.accent} onChange={e => set('accent', e.currentTarget.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                        Custom
                      </label>
                    </div>
                  </Section>
                </div>

                {/* Live preview */}
                <div className="min-w-0">
                  <Panel className="xl:sticky xl:top-8">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-[#d9c398]/75">Preview</p>
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/30">Live</p>
                    </div>
                    <div className="mt-6 flex flex-col items-center text-center">
                      <SealTile seal={identity.seal} accent={identity.accent} size={168} inscription={identity.stateName || 'Your state'} />
                      <p className="mt-6 max-w-full truncate text-[20px] font-extralight tracking-[-0.01em] text-[#f3efe6]">{identity.stateName || 'Your state'}</p>
                      <p className="mt-1.5 max-w-full truncate font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: identity.motto ? CHAMPAGNE : 'rgba(255,255,255,0.3)' }}>{identity.motto || 'Motto'}</p>
                    </div>
                    <p className="mt-8 font-mono text-[9.5px] uppercase tracking-[0.3em] text-[#d9c398]/75">Order of precedence</p>
                    <Rule className="mt-2" />
                    <ol className="mt-3">
                      {identity.protocol.map(o => (
                        <li key={o.rank} className="flex items-baseline gap-3 border-b py-2.5 text-[13px] last:border-b-0" style={{ borderColor: hair(0.08) }}>
                          <span className="w-6 shrink-0 font-mono text-[10.5px] tracking-[0.1em]" style={{ color: CHAMPAGNE }}>{ROMAN[o.rank - 1] ?? o.rank}</span>
                          <span className="shrink-0 font-light text-[#f3efe6]/90">{o.office}</span>
                          <span aria-hidden className="min-w-[12px] flex-1 translate-y-[-3px] border-b border-dotted" style={{ borderColor: hair(0.25) }} />
                          <span className="min-w-0 truncate text-right font-light text-white/50">{o.holder}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/35">Writing direction: {identity.dir.toUpperCase()}</p>
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <StepHead i={2} lead="The canonical federation is already provisioned. Keep the ministries your government runs, stand down the rest, and charter any that are missing.">
                Load your <Gilt>institutions</Gilt>
              </StepHead>

              <Section n="3.1" title="Ministries and agencies" aside={<span className="font-mono tracking-[0.12em]">{activeCount} ACTIVE</span>}>
                <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {ministries.map((m, idx) => {
                    const on = !!active[m.id];
                    return (
                      <li key={m.id}>
                        <label className="group relative flex cursor-pointer items-center gap-3.5 overflow-hidden rounded-[3px] border px-4 py-3.5 transition-[border-color,background-color] duration-300 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-[#f4e4bd]"
                          style={{
                            borderColor: on ? hair(0.42) : hair(0.1),
                            background: on ? `linear-gradient(160deg, ${hair(0.08)}, ${hair(0.015)} 70%)` : 'rgba(255,248,230,0.012)',
                          }}>
                          {on ? <span aria-hidden className="absolute inset-y-0 left-0 w-px" style={{ background: `linear-gradient(180deg, transparent, ${CHAMPAGNE_HI}, transparent)` }} /> : null}
                          <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums" style={{ color: on ? CHAMPAGNE : 'rgba(255,255,255,0.25)' }}>{String(idx + 1).padStart(2, '0')}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[14px] font-light ${on ? 'text-[#f3efe6]' : 'text-white/45'}`}>{m.name}</span>
                            <span className="mt-0.5 block truncate font-mono text-[9.5px] tracking-[0.08em] text-white/35">{m.archetype} · {m.departments.length} departments</span>
                          </span>
                          <input type="checkbox" className="peer sr-only" checked={on} onChange={() => setActive(a => ({ ...a, [m.id]: !on }))} />
                          <span aria-hidden className="relative h-[18px] w-[34px] shrink-0 rounded-full border transition-colors duration-300"
                            style={{ background: on ? GOLD : 'rgba(0,0,0,0.4)', borderColor: on ? CHAMPAGNE : hair(0.25) }}>
                            <span className="absolute top-[2px] h-3 w-3 rounded-full transition-[left,background-color] duration-300"
                              style={{ left: on ? 18 : 2, background: on ? '#17120a' : hair(0.5) }} />
                          </span>
                        </label>
                      </li>
                    );
                  })}
                  {added.map((n, i) => (
                    <li key={`new-${i}`}>
                      <div className="flex items-center gap-3.5 rounded-[3px] border border-dashed px-4 py-3.5" style={{ borderColor: hair(0.6), background: hair(0.05) }}>
                        <span className="w-5 shrink-0 font-mono text-[10px]" style={{ color: CHAMPAGNE_HI }}>+</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-light text-[#f4e4bd]">{n.name}</span>
                          <span className="mt-0.5 block font-mono text-[9.5px] tracking-[0.12em]" style={{ color: CHAMPAGNE }}>NEW · {n.archetype}</span>
                        </span>
                        <button type="button" onClick={() => setAdded(a => a.filter((_, j) => j !== i))} className="text-[12px] text-white/45 underline-offset-4 hover:text-[#f4e4bd] hover:underline">Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section n="3.2" title="Charter a new institution">
                <Panel>
                  <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
                    <Select aria-label="Archetype" value={draft.archetype} onChange={e => { const archetype = e.currentTarget.value as ArchetypeKey; setDraft(d => ({ ...d, archetype })); }}>
                      {archetypes.map(a => <option key={a.key} value={a.key}>{a.title}</option>)}
                    </Select>
                    <input aria-label="Institution name" className={inputCls} value={draft.name} placeholder="e.g. Ministry of Digital Economy"
                      onChange={e => { const name = e.currentTarget.value; setDraft(x => ({ ...x, name })); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInstitution(); } }} />
                    <button type="button" onClick={addInstitution} disabled={!draft.name.trim()} className={`${ghostBtn} py-2.5`}>
                      Add <span aria-hidden style={{ color: CHAMPAGNE }}>+</span>
                    </button>
                  </div>
                  <p className="mt-3 text-[12px] font-light leading-relaxed text-white/45">{archetypes.find(a => a.key === draft.archetype)?.summary}</p>
                </Panel>
              </Section>

              <Section n="3.3" title="Foreign relations (optional)">
                <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                  <Field label="Diplomatic partners" hint="One per line: Country — Capital">
                    <textarea rows={5} className={`${inputCls} resize-y leading-relaxed`}
                      value={(profile.foreignAffairs?.partners ?? []).map(p => p.capital ? `${p.name} — ${p.capital}` : p.name).join('\n')}
                      placeholder={'Kenya — Nairobi\nTanzania — Dodoma'}
                      onChange={e => {
                        const partners = e.currentTarget.value.split('\n').map(l => l.split(/\s+[—-]\s+/)).map(([name, capital]) => ({ name: (name ?? '').trim(), capital: capital?.trim() || undefined }));
                        set('foreignAffairs', { ...profile.foreignAffairs, partners });
                      }} />
                  </Field>
                  <Field label="International memberships" hint="Comma-separated, e.g. United Nations, African Union">
                    <textarea rows={5} className={`${inputCls} resize-y leading-relaxed`}
                      value={(profile.foreignAffairs?.memberships ?? []).join(', ')}
                      placeholder="United Nations, African Union, East African Community"
                      onChange={e => set('foreignAffairs', { ...profile.foreignAffairs, memberships: e.currentTarget.value.split(',').map(m => m.trimStart()) })} />
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepHead i={3} lead="Review what will go live. Each change is applied to the registry and recorded in the audit chain.">
                {existing ? <>Apply <Gilt>changes</Gilt></> : <>Launch <Gilt>{profile.stateName || 'your state'}</Gilt></>}
              </StepHead>

              {!log ? (
                <Instrument>
                  <div className="flex flex-col items-center text-center">
                    <SealTile seal={identity.seal} accent={identity.accent} size={128} inscription={identity.stateName || 'Your state'} />
                    <p className="mt-6 font-mono text-[9.5px] uppercase tracking-[0.42em]" style={{ color: CHAMPAGNE }}>Instrument of constitution</p>
                    <p className="mt-3 max-w-full text-[1.6rem] font-extralight leading-tight tracking-[-0.02em] text-[#f3efe6] sm:text-[2rem]">{profile.stateName || 'Your state'}</p>
                    {identity.motto ? <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">{identity.motto}</p> : null}
                  </div>
                  <Rule className="mt-8" strong />
                  {inherited.length ? (
                    <div role="note" className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[2px] border border-[#f1c27d]/30 bg-[#f1c27d]/[0.05] px-4 py-3 text-[12.5px] font-light leading-snug text-[#f1c27d]">
                      <span aria-hidden className="grid h-4 w-4 shrink-0 translate-y-[2px] place-items-center rounded-full border border-[#f1c27d]/60 font-mono text-[9px]">!</span>
                      <span className="min-w-0 flex-1">
                        Not yet declared, so taken from the {template.label.toLowerCase()} template: {inherited.join(', ')}.
                        {inherited.includes('chambers') ? ` This would launch with ${template.legislature.chambers.map(c => c.name).join(' and ')}.` : ''}
                      </span>
                      <button type="button" onClick={() => setStep(0)} className="font-mono text-[10px] uppercase tracking-[0.2em] underline underline-offset-4 hover:text-[#f4e4bd]">Declare in Article I</button>
                    </div>
                  ) : null}
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-px md:grid-cols-2" style={{ background: hair(0.1) }}>
                    <Summary n="I" title="Nation" wide onEdit={() => setStep(0)} rows={[
                      ['State', profile.stateName], ['Form', STATE_FORMS.find(f => f.k === profile.stateForm)?.l ?? profile.stateForm],
                      ['Executive', profile.executiveTitle], ['Legislature', profile.legislatureName],
                      ['Currency', profile.currency], ['Regional unit', profile.regionNoun],
                      ['Country', countries.find(c => c.iso3 === profile.iso3)?.name ?? '—'],
                      ['Chambers', constitutionFor(profile.stateForm, cleanConstitution(profile.constitution)).legislature.chambers.map(c => `${c.name} (${c.seats})`).join(' · ') + (inherited.includes('chambers') ? ' — template' : '')],
                      ['Regions', profile.regions?.length ? `${profile.regions.length} · ${profile.regions.slice(0, 3).join(', ')}${profile.regions.length > 3 ? '…' : ''}` : 'Reference set'],
                      ['AI assistant', profile.aiAssistant ? 'On' : 'Off'],
                    ]} />
                    <Summary n="II" title="Identity" onEdit={() => setStep(1)} rows={[
                      ['Insignia', identity.seal], ['Colour', identity.accent], ['Motto', identity.motto || '—'],
                      ['Language', locales.find(l => l.code === profile.locale)?.name ?? profile.locale],
                    ]} />
                    <Summary n="III" title="Institutions" onEdit={() => setStep(2)} rows={[
                      ['Active', String(ministries.filter(m => active[m.id]).length)],
                      ['Stood down', String(ministries.filter(m => !active[m.id]).length)],
                      ['New charters', String(added.length)],
                    ]} />
                  </div>
                  <div className="mt-10 grid gap-8 sm:grid-cols-2">
                    <Signature label={`For the office of the ${profile.executiveTitle || 'executive'}`} />
                    <Signature label="Recorded in the audit chain on launch" />
                  </div>
                </Instrument>
              ) : (
                <Instrument>
                  <div className="flex items-baseline justify-between gap-3 font-mono text-[9.5px] uppercase tracking-[0.3em]">
                    <span style={{ color: CHAMPAGNE }}>Ledger of launch</span>
                    <span className="text-white/35">Status</span>
                  </div>
                  <Rule className="mt-2" strong />
                  <ol aria-live="polite" className="mt-2 text-[13px]">
                    {log.map((l, i) => (
                      <li key={i} className="flex items-baseline gap-3 border-b py-3 last:border-b-0" style={{ borderColor: hair(0.08) }}>
                        <span className="w-6 shrink-0 font-mono text-[10px] tabular-nums text-white/30">{String(i + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 font-light text-[#f3efe6]/90 sm:truncate">{l.m}</span>
                        <span aria-hidden className="min-w-[12px] flex-1 translate-y-[-3px] border-b border-dotted" style={{ borderColor: hair(0.2) }} />
                        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em]"
                          style={{ color: l.s === 'ok' ? CHAMPAGNE_HI : l.s === 'fail' ? '#f1938f' : 'rgba(255,255,255,0.45)' }}>
                          {l.s === 'ok' ? (
                            <><span aria-hidden className="grid h-4 w-4 place-items-center rounded-full text-[9px] text-[#17120a]" style={{ background: GOLD }}>✓</span>ok</>
                          ) : l.s === 'fail' ? 'failed' : <span className="animate-pulse">…</span>}
                        </span>
                      </li>
                    ))}
                    {log.filter(l => l.s === 'fail').map((l, i) => (
                      <li key={`e${i}`} className="mt-3 border-l pl-3 text-[12px] font-light leading-relaxed text-[#f1938f]" style={{ borderColor: '#f1938f88' }}>{l.m}: {l.d}</li>
                    ))}
                  </ol>
                  {done ? (
                    <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.36em]" style={{ color: CHAMPAGNE }}>— Sealed and recorded —</p>
                  ) : null}
                </Instrument>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="relative mt-14 flex flex-wrap items-center gap-3 pt-7">
            <Rule className="absolute inset-x-0 top-0" flip />
            {errors.length ? (
              <p role="status" className="mr-auto flex items-center gap-2 text-[13px] font-light text-[#f1c27d]">
                <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[#f1c27d]/60 font-mono text-[9px]">!</span>{errors[0]}
              </p>
            ) : <span className="mr-auto hidden font-mono text-[9.5px] uppercase tracking-[0.3em] text-white/30 sm:inline">Article {ROMAN[step]} of IV</span>}
            {done ? (
              <button type="button" onClick={() => router.push(after)} className={goldBtn} style={goldStyle}>
                Continue to welcome <span aria-hidden>→</span>
              </button>
            ) : (
              <>
                {step > 0 && !log ? (
                  <button type="button" onClick={() => setStep(s => s - 1)} className={ghostBtn}><span aria-hidden>←</span> Back</button>
                ) : null}
                {step < 3 ? (
                  <button type="button" disabled={errors.length > 0} onClick={() => setStep(s => s + 1)} className={goldBtn} style={goldStyle}>
                    Continue <span aria-hidden>→</span>
                  </button>
                ) : (
                  <button type="button" disabled={!canLaunch || running} onClick={launch} className={goldBtn} style={goldStyle}>
                    {running ? 'Applying…' : log ? 'Retry' : existing ? 'Apply changes' : 'Launch'}{running ? null : <span aria-hidden>→</span>}
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

/** Gilded words in a heading. */
function Gilt({ children }: { children: React.ReactNode }) {
  return <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{children}</span>;
}

/** Article heading: measured caption, light display title and lead. */
function StepHead({ i, lead, children }: { i: number; lead: string; children: React.ReactNode }) {
  return (
    <header className="relative mb-12">
      <div className="relative flex items-center gap-4">
        <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.34em]" style={{ color: CHAMPAGNE }}>Article {ROMAN[i]}</span>
        <span className="h-px w-8" style={{ background: hair(0.5) }} />
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{STEPS[i]!.t}</span>
      </div>
      <h1 className="relative mt-5 max-w-[22ch] text-[2.15rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3.1rem]">{children}</h1>
      <p className="relative mt-4 max-w-[60ch] text-[15px] font-light leading-relaxed text-white/55">{lead}</p>
    </header>
  );
}

/** Station on the step rail: roman numeral, gold when passed. */
function Station({ i, state }: { i: number; state: 'done' | 'current' | 'next' }) {
  return (
    <span className="relative grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full border font-mono text-[10px] tracking-[0.04em] transition-all duration-300"
      style={{
        borderColor: state === 'next' ? hair(0.22) : CHAMPAGNE,
        background: state === 'done' ? GOLD : INK,
        color: state === 'done' ? '#17120a' : state === 'current' ? CHAMPAGNE_HI : 'rgba(255,255,255,0.35)',
        boxShadow: state === 'current' ? `0 0 0 4px ${INK}, 0 0 0 5px ${hair(0.3)}, 0 0 22px ${hair(0.35)}` : `0 0 0 4px ${INK}`,
      }}>
      {state === 'done' ? '✓' : ROMAN[i]}
    </span>
  );
}

/** Drafted panel on dark glass with registration marks. */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[3px] border p-5 sm:p-6 ${className}`}
      style={{ borderColor: hair(0.16), background: 'linear-gradient(180deg, rgba(20,22,28,0.55), rgba(8,10,14,0.7))', boxShadow: 'inset 0 1px 0 rgba(255,240,210,0.05), 0 30px 60px -40px rgba(0,0,0,0.9)' }}>
      <Corners />
      {children}
    </div>
  );
}

/** The official instrument: a double-ruled certificate frame. */
function Instrument({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-[4px] border p-1.5 sm:p-2"
      style={{ borderColor: hair(0.32), background: 'linear-gradient(180deg, rgba(20,22,28,0.7), rgba(8,10,14,0.85))', boxShadow: '0 40px 90px -40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,240,210,0.06)' }}>
      <div className="relative rounded-[2px] border px-4 py-8 sm:px-10 sm:py-10" style={{ borderColor: hair(0.16) }}>
        <Corners size={14} />
        {children}
      </div>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="h-8 border-b" style={{ borderColor: hair(0.4) }} />
      <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">{label}</p>
    </div>
  );
}

function Summary({ n, title, rows, onEdit, wide = false }: { n: string; title: string; rows: [string, string][]; onEdit: () => void; wide?: boolean }) {
  return (
    <div className={`min-w-0 bg-[#0a0c11] px-4 py-6 sm:px-6 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.3em]" style={{ color: CHAMPAGNE }}>Schedule {n} · {title}</p>
        <button type="button" onClick={onEdit} aria-label={`Edit ${title}`}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 underline-offset-4 hover:text-[#f4e4bd] hover:underline focus:outline-none focus-visible:text-[#f4e4bd] focus-visible:underline">Edit</button>
      </div>
      <dl className={`mt-4 ${wide ? 'md:grid md:grid-cols-2 md:gap-x-10' : ''}`}>
        {rows.map(([k, v], i) => (
          <div key={`${k}-${i}`} className={`flex items-baseline gap-3 border-b py-[7px] text-[13px] ${wide ? '' : 'last:border-b-0'}`} style={{ borderColor: hair(0.07) }}>
            <dt className="w-[84px] shrink-0 sm:w-[92px] text-[10.5px] uppercase tracking-[0.12em] text-white/40">{k}</dt>
            <dd className="min-w-0 truncate font-light text-[#f3efe6]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

