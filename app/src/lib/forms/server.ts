// The server's side of the form contract (lib/forms/contract.ts): the
// approved lists resolved from the systems that hold them (the nation's
// regions, register lists, approved rules and tariffs in force, the lists
// approved with the procedure), the checks only the server can make (a
// register reference points to an existing record or an authorised pending
// application; a reference is not used by another open application; a
// position falls inside the nation, read like a registered site's; an
// identifier is checked with an exchange service only where a provision of
// law in force allows it; a signed declaration comes from an identified
// applicant) and a form as it renders, in the language asked for. The case
// engine calls these before it opens or moves a case; the browser gets the
// same lists and messages through the form view, so both say the same thing.
//
// A check the platform cannot make yet (a register that does not exist, a
// profile the nation has not configured, a contact-verification service) is
// recorded as not performed on the case: it never becomes a refusal or an
// adverse finding (spec Part 2 acceptance 8), and docs/FORMS_CONFORMANCE.md
// lists each.

import { nationCurrency, nationLanguages, nationLocale, regionList } from '@/lib/nation/registry';
import { listRules, ruleInForce } from '@/lib/law/rules';
import { cite } from '@/lib/law/register';
import { ORG_KINDS, registerTypes, getOrganisation } from '@/lib/organisations/register';
import { getPerson, current as personCurrent } from '@/lib/civil/register';
import { getTaxpayer } from '@/lib/tax/register';
import { getProfessional, professions } from '@/lib/professions/register';
import { productByReference } from '@/lib/health/products/register';
import { getMinistry, listMinistries, institutionBounds } from '@/lib/data/store';
import { locales } from '@/lib/i18n/config';
import { STANDARD_SOURCES } from './library/catalogue';
import COUNTRIES from '@/lib/geo/countries.json';
import {
  checkAnswers, choicesOf, defaultMessage, localiser, resolveForm, REFERENCE_REGISTERS, PROFILES,
  type CheckContext, type ContractDocument, type ContractField, type FieldError, type FormSpec, type FormView, type NamedRule, type PartyRef, type Point, type ValueSnapshot, type Location,
} from './contract';
import type { CasePackage, Verification } from '@/lib/casework/types';

const today = (on?: string) => on ?? new Date().toISOString().slice(0, 10);
const courts = () => { const judicial = new Set(institutionBounds().judicial); return listMinistries().filter(m => judicial.has(m.id)).map(m => ({ value: m.id, label: m.name })); };
const COUNTRY_LIST = (COUNTRIES as { iso3: string; iso2: string; name: string }[]).filter(c => /^[A-Z]{2}$/.test(c.iso2) && /^[A-Z]{3}$/.test(c.iso3));

function currencies(): { value: string; label: string }[] {
  try {
    const codes = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('currency') ?? [];
    const names = new Intl.DisplayNames(['en'], { type: 'currency' });
    return codes.map(c => ({ value: c, label: `${c} · ${names.of(c) ?? c}` }));
  } catch { return [{ value: nationCurrency(), label: nationCurrency() }]; }
}

/** The approved lists in force on a date, from the systems that hold them. */
export function valueSnapshot(on?: string): ValueSnapshot {
  const day = today(on);
  const rules = new Map<string, string>();
  for (const r of listRules()) if (r.state === 'approved' && r.effectiveFrom <= day && (!r.effectiveTo || r.effectiveTo >= day)) rules.set(r.key, r.title);
  const tariffs: ValueSnapshot['tariffs'] = {};
  for (const key of rules.keys()) {
    const r = ruleInForce(key, day);
    if (r?.kind === 'tariff' && r.lines?.length) tariffs[key] = r.lines.map(l => ({ value: l.code, label: l.description ? `${l.code} · ${l.description}` : l.code }));
  }
  const languageName = (code: string) => locales.find(l => l.code === code)?.name ?? code;
  const institutions = listMinistries().map(m => ({ value: m.id, label: m.name }));
  return {
    // The nation's regions, read at use (never a module-level copy).
    regions: [...regionList([])],
    registers: {
      'organisation-kinds': ORG_KINDS.map(k => ({ value: k, label: k.replace(/-/g, ' ') })),
      'organisation-registers': registerTypes().map(t => ({ value: t.key, label: t.title })),
      institutions,
      countries: COUNTRY_LIST.map(c => ({ value: c.iso2, label: `${c.name} (${c.iso2})` })),
      'countries-alpha3': COUNTRY_LIST.map(c => ({ value: c.iso3, label: `${c.name} (${c.iso3})` })),
      currencies: currencies(),
      languages: nationLanguages().map(l => ({ value: l, label: languageName(l) })),
    },
    rules: [...rules].map(([key, title]) => ({ key, title })),
    tariffs,
    // Configured lists another system already keeps, by the specification's name.
    configured: {
      approved_country_code_list: COUNTRY_LIST.map(c => ({ value: c.iso2, label: `${c.name} (${c.iso2})` })),
      approved_currency_code: currencies(),
      // The professions the regulators keep (lib/professions/register.ts).
      configured_profession: professions().map(p => ({ value: p.key, label: p.title })),
      // The courts: institutions the nation named for the judiciary or recorded with judicial standing.
      configured_court_reference: courts(),
      // The field series' standard values sources (Part 1 §1.3) and the ones another system keeps.
      ...STANDARD_SOURCES,
      'iso.3166-1.alpha2.current': COUNTRY_LIST.map(c => ({ value: c.iso2, label: `${c.name} (${c.iso2})` })),
      // The nation's regions, as a values source a canonical contract names (read at use).
      'civicos.nation.regions': regionList([]).map(r => ({ value: r, label: r })),
      'civicos.country.official_and_supported_languages': nationLanguages().map(l => ({ value: l, label: languageName(l) })),
    },
  };
}

/** The allowed values of each enum field (and enum question inside a group, as group.key), resolved now. */
export function optionsFor(fields: ContractField[], form?: FormSpec, on?: string): Record<string, string[]> {
  const s = valueSnapshot(on);
  const out: Record<string, string[]> = {};
  for (const f of fields) {
    if (f.type === 'enum') out[f.key] = choicesOf(f, s, form)?.choices.map(c => c.value) ?? [];
    for (const i of f.items ?? []) if (i.type === 'enum') out[`${f.key}.${i.key}`] = choicesOf(i, s, form)?.choices.map(c => c.value) ?? [];
  }
  return out;
}

/** A procedure's form as it renders, in a language (reviewed translations only; English otherwise). */
export function formView(pkg: { key: string; version: number; title: string; state: string; reference?: boolean; library?: boolean; fields: ContractField[]; documents: ContractDocument[]; form?: FormSpec }, locale?: string, on?: string): FormView {
  const lang = locale && nationLanguages().includes(locale) ? locale : nationLocale();
  const dir = locales.find(l => l.code === lang)?.dir === 'rtl' ? 'rtl' : 'ltr';
  return resolveForm(pkg, valueSnapshot(on), { locale: lang, currency: nationCurrency(), dir });
}

/** Whether a register holds a record with this reference (true, false, or null: the register is not on the platform, or is read later). Nothing about the record is returned. */
function existsNow(register: string | undefined, ref: string, active = false): boolean | null {
  switch (register) {
    case 'organisation': {
      const o = getOrganisation(ref);
      // Active: it holds at least one standing granted in a register.
      return !!o && (!active || o.standings.some(st => st.state === 'granted'));
    }
    case 'person': { const p = getPerson(ref); return !!p && (!active || personCurrent(p).status !== 'deceased'); }
    case 'taxpayer': { const t = getTaxpayer(ref); return !!t && (!active || t.state === 'active'); }
    case 'professional': return !!getProfessional(ref);
    case 'institution': return !!getMinistry(ref);
    // Active: authorised now. Only decided records answer (an application under assessment is not on the public register).
    case 'product': { const p = productByReference(ref); return !!p && (!active || p.state === 'authorised'); }
    default: return null;
  }
}

export interface ServerCheckInput {
  pkg: Pick<CasePackage, 'key' | 'fields' | 'documents' | 'form'>;
  input: Record<string, unknown> | undefined;
  mode: CheckContext['mode'];
  existing?: Record<string, unknown>;
  locale?: string;
  on?: string;
  /** An open application under this procedure with this reference (an authorised pending record). */
  pending?: (ref: string, procedure: string) => boolean;
  /** Another open application of this procedure already uses this answer. */
  taken?: (field: string, value: string) => boolean;
}

/**
 * The checks the server makes without waiting on anything: the contract's own
 * (the same functions and messages the browser uses) with the lists resolved
 * here, register references against the registers held in this process, and
 * references that must be unique among open applications.
 */
export function serverCheck(x: ServerCheckInput): { values: Record<string, unknown>; errors: FieldError[] } {
  const on = today(x.on);
  const fields = x.pkg.fields;
  const tr = localiser(x.pkg.form, x.locale ?? nationLocale());
  const r = checkAnswers(fields, x.input, {
    mode: x.mode, options: optionsFor(fields, x.pkg.form, on), currency: nationCurrency(), regions: [...regionList([])], documents: x.pkg.documents, today: on,
    ...(x.existing ? { existing: x.existing } : {}), text: tr,
  });
  const fail = (f: ContractField, rule: 'existingRecord' | 'unique', register?: string) => {
    const english = f.errors?.[rule] ?? defaultMessage(f, rule, { register });
    r.errors.push({ field: f.key, rule, message: tr(`field.${f.key}.error.${rule}`, english) });
  };
  for (const f of fields) {
    const v = r.values[f.key];
    if (v === undefined || v === '' || r.errors.some(e => e.field === f.key)) continue;
    for (const rule of f.rules ?? []) {
      if (rule.rule === 'unique' && typeof v === 'string' && x.taken?.(f.key, v)) { fail(f, 'unique'); break; }
      if (rule.rule !== 'existingRecord') continue;
      const refs = refsOf(f, v);
      for (const { register, ref } of refs) {
        const ok = existsNow(register, ref, rule.active);
        if (ok === true || ok === null) continue; // null: read in serviceCheck (or not on the platform)
        if (rule.pendingProcedure && x.pending?.(ref, rule.pendingProcedure)) continue;
        fail(f, 'existingRecord', REFERENCE_REGISTERS.find(q => q.key === register)?.label);
        break;
      }
    }
  }
  return r;
}

/** The register references an answer carries (a reference, a list of them, or parties with a reference). */
function refsOf(f: ContractField, v: unknown): { register: string; ref: string }[] {
  if (f.type === 'registryReference') return (Array.isArray(v) ? v : [v]).filter((s): s is string => typeof s === 'string' && !!s).map(ref => ({ register: f.register ?? '', ref }));
  if (f.type === 'party') return (Array.isArray(v) ? v : [v]).filter((p): p is PartyRef => !!p && typeof p === 'object' && !!(p as PartyRef).ref).map(p => ({ register: p.kind === 'person' ? 'person' : p.kind === 'institution' ? 'institution' : 'organisation', ref: p.ref! }));
  return [];
}

export interface ServiceCheckResult { values: Record<string, unknown>; errors: FieldError[]; verifications: Verification[] }

/**
 * The checks that wait on something else: a position read against the
 * nation's map (as a registered site's, lib/data/facilities.ts placePoint():
 * region and district derived, never typed); references into registers read
 * here (parcels, registered sites) or not on the platform yet; identifiers
 * checked with an exchange service where a provision in force allows it; a
 * signed declaration from an identified applicant; contact channels and the
 * country's configured checks. A check that cannot be made is recorded as not
 * performed, never a refusal.
 */
export async function serviceCheck(fields: ContractField[], values: Record<string, unknown>, caller: { procedure: string; institution: string; signer?: { identified: boolean; name: string } }, on?: string): Promise<ServiceCheckResult> {
  const out = { ...values };
  const errors: FieldError[] = [];
  const verifications: Verification[] = [];
  const at = new Date().toISOString();
  const notPerformed = (field: string, service: string, note: string) => verifications.push({ field, service, result: 'not-performed', note, at });
  const place = async (label: string, p: Point): Promise<Point | { error: string }> => {
    const { placePoint } = await import('@/lib/data/facilities');
    const r = await placePoint({ lng: p.lng, lat: p.lat, noun: 'place' });
    if (r.errors.length) return { error: `${label}: ${r.errors[0]}` };
    return { lng: p.lng, lat: p.lat, ...(r.place.region ? { region: r.place.region, regionCode: r.place.regionCode } : {}), ...(r.place.district ? { district: r.place.district, districtCode: r.place.districtCode } : {}) };
  };
  for (const f of fields) {
    const v = out[f.key];
    if (v === undefined || v === '' || v === null) continue;
    // Positions: inside the nation, region and district derived.
    if (f.type === 'point' && typeof v === 'object') {
      const p = await place(f.label, v as Point);
      if ('error' in p) { errors.push({ field: f.key, rule: 'type', message: p.error }); continue; }
      out[f.key] = p;
    }
    if (f.type === 'location' && typeof v === 'object' && (v as Location).kind === 'point' && (v as Location).point) {
      const p = await place(f.label, (v as Location).point!);
      if ('error' in p) { errors.push({ field: f.key, rule: 'type', message: p.error }); continue; }
      out[f.key] = { kind: 'point', point: p };
    }
    if (f.type === 'location' && typeof v === 'object' && (v as Location).kind === 'site') {
      const { getFacility } = await import('@/lib/data/facilities');
      if (!getFacility((v as Location).site!)) { errors.push({ field: f.key, rule: 'existingRecord', message: `${f.label}: there is no registered site with that id` }); continue; }
    }
    // References into registers read here, or not on the platform yet.
    for (const rule of f.rules ?? []) {
      if (rule.rule !== 'existingRecord') continue;
      for (const { register, ref } of refsOf(f, v)) {
        if (existsNow(register, ref, rule.active) !== null) continue;
        if (register === 'parcel') {
          const { getParcel } = await import('@/lib/data/parcels');
          if (!getParcel(ref)) errors.push({ field: f.key, rule: 'existingRecord', message: defaultMessage(f, 'existingRecord', { register: 'land parcel register' }) });
        } else if (register === 'site') {
          const { getFacility } = await import('@/lib/data/facilities');
          if (!getFacility(ref)) errors.push({ field: f.key, rule: 'existingRecord', message: defaultMessage(f, 'existingRecord', { register: 'national register of sites' }) });
        } else {
          notPerformed(f.key, `register:${register}`, `The ${REFERENCE_REGISTERS.find(q => q.key === register)?.label ?? register} is not on the platform yet: the reference was recorded as given, unchecked`);
        }
      }
    }
    // A signed declaration: confirmed by an identified applicant (signed in, or identified at an office).
    if (f.type === 'attestation' && (f.rules ?? []).some(r => r.rule === 'signature')) {
      if (!caller.signer?.identified) { errors.push({ field: f.key, rule: 'signature', message: defaultMessage(f, 'signature') }); continue; }
      verifications.push({ field: f.key, service: 'signature', result: 'verified', note: `Confirmed by ${caller.signer.name}, identified; a cryptographic signature of the declaration is not captured yet`, at });
    }
    for (const rule of f.rules ?? []) {
      if (rule.rule === 'verifiedChannel') notPerformed(f.key, 'contact-verification', 'No contact-verification service is connected: the channel was recorded as given');
      if (rule.rule === 'profile') notPerformed(f.key, `profile:${rule.profile}`, `${PROFILES[rule.profile] ?? rule.profile.replace(/_/g, ' ')} is not configured yet: checked by an official`);
    }
    // Identifiers checked with an exchange service, lawfully only.
    if (f.type === 'identifierReference' && typeof v === 'string') {
      for (const rule of f.rules ?? []) {
        if (rule.rule !== 'verifyWith') continue;
        await verifyWith(f, rule, v, out, caller, on, verifications, at);
      }
    }
  }
  return { values: out, errors, verifications };
}

async function verifyWith(f: ContractField, rule: Extract<NamedRule, { rule: 'verifyWith' }>, v: string, out: Record<string, unknown>, caller: { procedure: string; institution: string }, on: string | undefined, verifications: Verification[], at: string) {
  // Lawful only: the provision the rule names must be in force today in the laws register.
  if (!rule.basis) { verifications.push({ field: f.key, service: rule.service, result: 'not-performed', note: 'No provision of law is cited for this check yet', at }); return; }
  const basis = cite(rule.basis.instrument, rule.basis.eId, today(on));
  if ('error' in basis) { verifications.push({ field: f.key, service: rule.service, result: 'not-performed', note: `No provision in force allows it (${basis.error})`, at }); return; }
  const input = Object.fromEntries(Object.entries(rule.input).map(([k, from]) => [k, from === '$value' ? v : out[from]]));
  try {
    const { callService } = await import('@/lib/exchange/services');
    const res = await callService({ kind: 'module', id: caller.procedure, name: caller.procedure, institution: caller.institution }, rule.service, input, `${rule.purpose} (${basis.title ?? basis.instrument} ${basis.num ?? basis.eId})`);
    const d = res.data ?? {};
    const said = String(d.match ?? d.valid ?? d.registered ?? '');
    const result: Verification['result'] = res.status !== 200 ? 'not-performed' : said === 'yes' ? 'verified' : said === 'no' ? 'not-matched' : 'unknown';
    verifications.push({ field: f.key, service: rule.service, result, ...(res.status !== 200 ? { note: res.error ?? `The service answered ${res.status}` } : {}), at, receipt: res.receipt.id });
  } catch (e) {
    verifications.push({ field: f.key, service: rule.service, result: 'not-performed', note: `The service did not answer (${(e as Error).message.slice(0, 120)})`, at });
  }
}

/**
 * Whether answers carry a check that can refuse them and waits on another
 * system: a position read against the map, a registered site or parcel, a
 * signed declaration. openCase() refuses such answers unless submitForm()
 * checked them. (Checks that only record a result, such as a verification
 * with an exchange service, run in submitForm() and act().)
 */
export function needsServiceCheck(fields: ContractField[], values: Record<string, unknown>): boolean {
  return fields.some(f => {
    const v = values[f.key];
    if (v === undefined || v === '' || v === null) return false;
    if (f.type === 'point') return true;
    if (f.type === 'location' && typeof v === 'object' && ['point', 'site'].includes(String((v as Location).kind))) return true;
    if (f.type === 'attestation' && (f.rules ?? []).some(r => r.rule === 'signature')) return true;
    return (f.rules ?? []).some(r => r.rule === 'existingRecord') && refsOf(f, v).some(x => x.register === 'parcel' || x.register === 'site');
  });
}

/** Whether answers carry a check that only records its result (verification with a service, a configured check, a register not on the platform). */
export function recordsChecks(fields: ContractField[], values: Record<string, unknown>): boolean {
  return fields.some(f => {
    const v = values[f.key];
    if (v === undefined || v === '' || v === null) return false;
    return (f.rules ?? []).some(r => r.rule === 'verifyWith' || r.rule === 'profile' || r.rule === 'verifiedChannel' || (r.rule === 'existingRecord' && refsOf(f, v).some(x => !REFERENCE_REGISTERS.find(q => q.key === x.register)?.connected)));
  });
}
