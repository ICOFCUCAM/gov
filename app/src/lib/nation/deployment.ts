// The nation's deployment profile (docs/GOVERNMENT_OPERATING_MODEL.md §3.2,
// directions §14): who is legally responsible for each register, which
// modules run here and whether CivicOS or an external system holds their
// records, the identity provider for citizens, the signature framework, the
// working calendar legal deadlines count in. Part of the nation profile
// (SovereignProfile.deployment), set during first-run setup through
// /api/sovereign; once setup is complete, who is responsible changes only
// through /api/sovereign/authorities (two officials, citing the law,
// lib/data/store/sovereign.ts); the software never names an authority itself.
// Pure: no store imports, so the store and the client both use it.

export type AuthorityKey =
  | 'lawRegister' | 'civilRegistration' | 'identity' | 'businessRegister' | 'higherEducationAccreditation'
  | 'immigration' | 'police' | 'judiciary' | 'statistics' | 'dataProtection'
  | 'tax' | 'customs' | 'education' | 'healthRegulation' | 'professionalRegulation'
  // Constitutional bodies (docs/CONSTITUTIONAL_ARCHITECTURE.md §2.3–2.6): empty slots,
  // named only when the nation has such a body. Nothing is assumed.
  | 'legislature' | 'supremeAudit' | 'electoral' | 'centralBank' | 'ombudsman'
  | 'anticorruption' | 'humanRights' | 'headOfState' | 'constitutionalCourt'
  // The body the nation's law names to approve the state's seal keys (lib/keys/seal-register.ts): empty until named.
  | 'trustServices'
  // Health bodies the nation's law may set apart from the health regulator (owner's direction 2026-10-21,
  // docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md §3): empty until named. Until then a
  // form that names one is owned provisionally (provisionalOwner()), never as proof of legal competence.
  | 'medicinesRegulation' | 'controlledSubstances' | 'publicHealth'
  // Territory and infrastructure (plan step I7): empty until the nation names each body. Who holds a power over a permit
  // type still comes from the permit authority registry (lib/permits/authority.ts); these name who keeps each register.
  | 'landRegistry' | 'buildingControl' | 'housing' | 'vehicleRegistration' | 'roadAuthority' | 'transportRegulator'
  // The economic group (plan step I5): public finance (budget, appropriations, commitments, payments and cash, kept by
  // the finance authority the nation names, whether a ministry of finance, a treasury or a budget office), the cabinet
  // office (Cabinet submissions, decisions and actions; executive correspondence and petitions) and the body that
  // reviews procurement complaints independently of the procuring institution. Empty until named; nothing is assumed.
  | 'finance' | 'cabinetOffice' | 'procurementReview'
  // Human services (plan step I6, specification Part 2): bodies a nation may keep apart, each named by the nation;
  // empty until named, no case opens under a slot nobody is named for, and no stand-in acts for them.
  | 'travelDocuments' | 'citizenship' | 'labour' | 'socialProtection'
  // I12: security governance and resilience (catalogue Part 11). The national cybersecurity authority, the body that
  // designates critical infrastructure under the nation's law, the security authority that declares the installation's
  // accreditation and decides clearances, and the national security body that issues security directives. Empty until
  // named; no case opens under a slot nobody is named for. Nothing about intelligence is a slot (legal review first).
  | 'cyberAuthority' | 'criticalInfrastructure' | 'securityAccreditation' | 'nationalSecurity'
  // I13: the digital front door and records (plan step I13): the archive the nation's law names to receive records
  // transferred for permanent preservation (lib/recordkeeping). Empty until named; nothing is transferred until then.
  | 'archives';

export type ModuleKey = 'law' | 'civil' | 'organisations' | 'accreditation' | 'licensing' | 'immigration' | 'police' | 'courts' | 'tax' | 'customs' | 'education' | 'health' | 'professions';

export interface DeploymentProfile {
  jurisdiction?: { legalSystem?: 'civil' | 'common' | 'mixed' | 'religious' | 'customary' | 'other' };
  /** Working days (0 Sunday … 6 Saturday) and public holidays, for deadlines counted in working days. */
  calendar?: { workingDays: number[]; holidays: { date: string; name: string }[] };
  /** The institution (id from the ministry registry, /api/org) legally responsible for each register. */
  authorities?: Partial<Record<AuthorityKey, string>>;
  /** Which modules run, and whether CivicOS or an external system holds their records. */
  modules?: Partial<Record<ModuleKey, { enabled: boolean; source: 'civicos' | 'external'; system?: string }>>;
  /** Citizens' sign-in through the nation's identity provider (OpenID Connect); assisted registration at offices. */
  identity?: { citizens?: { issuer: string; clientId: string; assurance?: string }; assisted: boolean };
  /** Decisions and certificates: signed by the platform (institution seals) or by the nation's qualified service. */
  signature?: { framework: 'platform' | 'national'; trustList?: string };
  /**
   * CivicOS Institutional Edition (spec Part 5 D; Health I4 standalone-and-pilot): this installation runs as
   * the institutions named here standing alone. Every other institution is not connected: its modules do not
   * run, its procedures open no case, and an exchange call to a service it owns answers "not connected"
   * (never a guess). Recorded during setup, afterwards only through the change process (citing the law, a
   * different official confirms; lib/data/store/sovereign.ts proposeEdition()). Never shipped set.
   */
  edition?: InstitutionalEdition;
}

/** One institution (or a few, e.g. the health institutions) installed standing alone. */
export interface InstitutionalEdition {
  kind: 'institutional';
  /** Its name as the installation shows it (e.g. "Health regulation"); the nation chooses it. */
  label: string;
  /** The institutions it runs as (ids from the ministry registry). */
  institutions: string[];
  /** The modules it runs (their registers and procedures); every other module is off. */
  modules: ModuleKey[];
}

/**
 * Who may be named for each register or power. `optional`: a constitutional
 * body not every nation has (a legislature, an audit office, a central
 * bank…); its slot stays empty unless the nation names one, and setup does
 * not count it as missing.
 */
export const AUTHORITIES: { key: AuthorityKey; label: string; registers: string; optional?: true }[] = [
  { key: 'lawRegister', label: 'Laws register', registers: 'Laws, regulations and their versions; the legal rules procedures cite' },
  { key: 'civilRegistration', label: 'Civil registration', registers: 'Births, deaths, marriages and the people they record' },
  { key: 'identity', label: 'National identity', registers: 'National identity credentials' },
  { key: 'businessRegister', label: 'Business register', registers: 'Companies, organisations and who may act for them' },
  { key: 'higherEducationAccreditation', label: 'Higher education accreditation', registers: 'Accredited universities and colleges' },
  { key: 'immigration', label: 'Immigration', registers: 'Visas, residence permits, border crossings, protection claims' },
  { key: 'police', label: 'Police', registers: 'Incidents, investigations and evidence' },
  { key: 'judiciary', label: 'Judiciary', registers: 'Court cases, hearings and judgments' },
  { key: 'statistics', label: 'Official statistics', registers: 'National indicators and estimates' },
  { key: 'dataProtection', label: 'Data protection', registers: 'Oversight of access to personal records (the access log)' },
  { key: 'tax', label: 'Tax administration', registers: 'Taxpayers, tax accounts, returns, assessments and objections' },
  { key: 'customs', label: 'Customs', registers: 'Customs declarations, duty assessments, inspections and release' },
  { key: 'education', label: 'Education', registers: 'Registered schools and education providers, qualifications awarded' },
  { key: 'healthRegulation', label: 'Health facility regulation', registers: 'Licensed health facilities and pharmacies' },
  { key: 'professionalRegulation', label: 'Professional regulation', registers: 'Licensed professionals (each profession may have its own council)' },
  { key: 'legislature', label: 'Legislature', registers: 'Bills, votes and the official record of the chamber or chambers, kept by their clerk', optional: true },
  { key: 'headOfState', label: 'Head of state', registers: 'Formal acts of the head of state: assent, appointments, proclamations', optional: true },
  { key: 'constitutionalCourt', label: 'Constitutional court', registers: 'Constitutional cases and rulings (when separate from the other courts)', optional: true },
  { key: 'supremeAudit', label: 'Public audit office', registers: 'Audits of public accounts: plans, findings and reports', optional: true },
  { key: 'electoral', label: 'Electoral body', registers: 'Voter registers, candidates, polling and results', optional: true },
  { key: 'centralBank', label: 'Central bank', registers: 'Monetary policy decisions and supervisory records', optional: true },
  { key: 'ombudsman', label: 'Ombudsman', registers: 'Complaints about public bodies and their findings', optional: true },
  { key: 'anticorruption', label: 'Anti-corruption body', registers: 'Corruption complaints, investigations and referrals', optional: true },
  { key: 'humanRights', label: 'Human rights body', registers: 'Human rights complaints, inquiries and reports', optional: true },
  { key: 'trustServices', label: 'Seal keys authority', registers: 'The state\'s seal keys: which keys may seal decisions and certificates, their validity and revocation', optional: true },
  { key: 'medicinesRegulation', label: 'Medicines and medical devices regulation', registers: 'Authorised medicines and medical devices, manufacturing sites, imports, safety reports and recalls', optional: true },
  { key: 'controlledSubstances', label: 'Controlled substances authority', registers: 'Authorisations to handle controlled medicines (only where the nation\'s law names a body apart from the medicines regulator)', optional: true },
  { key: 'publicHealth', label: 'Public health authority', registers: 'Public-health programmes and the aggregate returns they receive (never an individual case)', optional: true },
  // Plan step I7: territory and infrastructure.
  { key: 'landRegistry', label: 'Land registry (registered interests)', registers: 'Registered interests in land: transfers, mortgages, easements, leases, caveats and restrictions, their discharge, corrections and disputes (the parcels themselves are kept by the cadastre authority the parcel policy names)', optional: true },
  { key: 'buildingControl', label: 'Planning and building control', registers: 'Planning applications and decisions, building permits with their approved design versions, inspections, stop-work orders and occupancy certificates', optional: true },
  { key: 'housing', label: 'Housing authority', registers: 'Housing programmes with their approved eligibility and priority rules, housing applications, assessments and allocations', optional: true },
  { key: 'vehicleRegistration', label: 'Vehicle and driver licensing', registers: 'Registered vehicles and their keepers; driving licences, their categories, restrictions and validity', optional: true },
  { key: 'roadAuthority', label: 'Road authority', registers: 'Permits for works in public roads, with the place, the period and the traffic arrangements they allow', optional: true },
  { key: 'transportRegulator', label: 'Transport regulator', registers: 'Licensed transport operators (organisations of the organisations register), their fleets, routes and conditions', optional: true },
  // Plan step I5: optional like the health slots, empty until the nation names each; a procedure that names one opens no case until then.
  { key: 'finance', label: 'Public finance (budget and treasury)', registers: 'Budget calls, ceilings and bids; appropriations and their releases and revisions; commitments; payment orders and payee accounts; cash forecasts', optional: true },
  { key: 'cabinetOffice', label: 'Cabinet office', registers: 'Cabinet submissions, decisions with their votes, the action register; executive correspondence and petitions', optional: true },
  { key: 'procurementReview', label: 'Procurement review body', registers: 'Procurement complaints and their review decisions, kept apart from the procuring institution', optional: true },
  // Human services (plan step I6): optional, so an installation set up before them stays complete; until the nation names one,
  // its procedures open no case and its register stays empty (the nation may name the same institution as for immigration).
  { key: 'travelDocuments', label: 'Passports and travel documents', registers: 'Passports and other travel documents: applications, issuance, custody, status and production reconciliation', optional: true },
  { key: 'citizenship', label: 'Citizenship determination', registers: 'Citizenship and nationality applications and determinations (only where the nation\'s law names a competent authority)', optional: true },
  { key: 'labour', label: 'Labour and employment', registers: 'Employers and workplaces, employment registrations, vacancies and jobseekers, inspections and corrective orders, labour complaints, occupational injury notifications, mediation', optional: true },
  { key: 'socialProtection', label: 'Social protection and benefits', registers: 'Claimants and households, benefit claims and their calculations, entitlements, payment instructions, overpayments and appeals', optional: true },
  // I12: security governance and resilience. Optional: an installation set up before them stays complete.
  { key: 'cyberAuthority', label: 'National cybersecurity authority', registers: 'National cyber incidents (metadata), vulnerability coordination with restricted recipients, supplier security assessments, security exceptions, cyber exercises', optional: true },
  { key: 'criticalInfrastructure', label: 'Critical infrastructure designation', registers: 'Designated critical infrastructure under the nation\'s law and criteria, essential-service dependencies, risk assessments, resilience plans and continuity exercises (restricted)', optional: true },
  { key: 'securityAccreditation', label: 'Security accreditation and clearances', registers: 'Security clearance decisions (metadata: level, scope, validity; never vetting content)', optional: true },
  { key: 'nationalSecurity', label: 'National security directives', registers: 'National security directives: instrument, authority, recipients and validity (restricted to the issuer and recipients)', optional: true },
  // I13: records management (plan step I13): optional; until named, records whose schedule ends in transfer stay with their institution.
  { key: 'archives', label: 'National archives', registers: 'Records transferred for permanent preservation from every institution, with each transfer\'s manifest and the archive\'s receipt', optional: true },
];
/** Health bodies a nation may set apart from the health regulator: optional, provisionally stood in for until named (PROVISIONAL_FALLBACK). */
export const HEALTH_SLOTS: AuthorityKey[] = ['medicinesRegulation', 'controlledSubstances', 'publicHealth'];
/** The slots every installation fills (the registers the platform runs). */
export const REQUIRED_AUTHORITIES = AUTHORITIES.filter(a => !a.optional);
/**
 * Slots whose named institution stands outside whole-government reach in
 * lib/auth/roles.ts whatever its recorded standing (the judiciary and data
 * protection as before; the legislature, head of state and a constitutional
 * court by their nature; since plan step I8 the oversight bodies, the public
 * audit office, the ombudsman, the human rights institution and the
 * anti-corruption commission, whose records are their own: lib/oversight;
 * since plan step I5 the procurement review body, whose complaint cases the
 * procuring institution never edits or reads: lib/procurement).
 * Other bodies are independent only when their recorded standing says so
 * (lib/data/store/institutions.ts). The public audit office's power to read
 * another independent body's case still needs its recorded standing
 * (institutionBounds().audit).
 */
export const INDEPENDENT_SLOTS: AuthorityKey[] = ['judiciary', 'dataProtection', 'legislature', 'headOfState', 'constitutionalCourt', 'supremeAudit', 'ombudsman', 'humanRights', 'anticorruption',
  // Plan step I5 (field series Part 3 §3.5 Department G): an executive-wide account never inherits access to independent procurement review cases.
  'procurementReview'];
/** Slots whose named institution is a court: its cases are closed to every other institution. */
export const JUDICIAL_SLOTS: AuthorityKey[] = ['judiciary', 'constitutionalCourt'];
export const isAuthorityKey = (v: unknown): v is AuthorityKey => AUTHORITIES.some(a => a.key === v);

export const MODULES: { key: ModuleKey; label: string; authority: AuthorityKey }[] = [
  { key: 'law', label: 'Laws register', authority: 'lawRegister' },
  { key: 'civil', label: 'Civil registration', authority: 'civilRegistration' },
  { key: 'organisations', label: 'Organisations register', authority: 'businessRegister' },
  { key: 'accreditation', label: 'Accreditation', authority: 'higherEducationAccreditation' },
  { key: 'licensing', label: 'Licensing', authority: 'businessRegister' },
  { key: 'immigration', label: 'Immigration', authority: 'immigration' },
  { key: 'police', label: 'Police', authority: 'police' },
  { key: 'courts', label: 'Courts', authority: 'judiciary' },
  { key: 'tax', label: 'Tax', authority: 'tax' },
  { key: 'customs', label: 'Customs', authority: 'customs' },
  { key: 'education', label: 'Education', authority: 'education' },
  { key: 'health', label: 'Health facility licensing', authority: 'healthRegulation' },
  { key: 'professions', label: 'Professional registers', authority: 'professionalRegulation' },
];
export const isModuleKey = (v: unknown): v is ModuleKey => MODULES.some(m => m.key === v);

/** Monday to Friday, no holidays: the calendar until the nation sets its own. */
export const DEFAULT_CALENDAR = { workingDays: [1, 2, 3, 4, 5], holidays: [] as { date: string; name: string }[] };

const LEGAL_SYSTEMS = ['civil', 'common', 'mixed', 'religious', 'customary', 'other'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check a deployment profile (as sent to /api/sovereign) against the
 * institutions that exist. Returns the cleaned profile, or the first reason it
 * cannot be used.
 */
export function checkDeployment(d: unknown, institutions: string[]): DeploymentProfile | { error: string } {
  if (d === null || typeof d !== 'object' || Array.isArray(d)) return { error: 'The deployment profile must be an object' };
  const x = d as Record<string, unknown>;
  const out: DeploymentProfile = {};
  if (x.jurisdiction !== undefined) {
    const ls = (x.jurisdiction as { legalSystem?: unknown } | null)?.legalSystem;
    if (ls !== undefined && !LEGAL_SYSTEMS.includes(ls as string)) return { error: `Legal system must be one of ${LEGAL_SYSTEMS.join(', ')}` };
    out.jurisdiction = ls === undefined ? {} : { legalSystem: ls as NonNullable<DeploymentProfile['jurisdiction']>['legalSystem'] };
  }
  if (x.calendar !== undefined) {
    const c = x.calendar as { workingDays?: unknown; holidays?: unknown } | null;
    const wd = c?.workingDays;
    if (!Array.isArray(wd) || !wd.length || wd.some(n => !Number.isInteger(n) || (n as number) < 0 || (n as number) > 6) || new Set(wd).size !== wd.length) {
      return { error: 'Working days must be a list of different days, 0 (Sunday) to 6 (Saturday)' };
    }
    const hol = c?.holidays ?? [];
    if (!Array.isArray(hol) || hol.length > 400 || hol.some(h => !h || typeof h !== 'object' || !ISO_DATE.test(String((h as { date?: unknown }).date)) || typeof (h as { name?: unknown }).name !== 'string')) {
      return { error: 'Holidays must be a list of { date: YYYY-MM-DD, name }' };
    }
    out.calendar = { workingDays: [...(wd as number[])].sort(), holidays: (hol as { date: string; name: string }[]).map(h => ({ date: h.date, name: h.name.slice(0, 120) })) };
  }
  if (x.authorities !== undefined) {
    const a = x.authorities as Record<string, unknown> | null;
    if (!a || typeof a !== 'object' || Array.isArray(a)) return { error: 'Authorities must name an institution for each register' };
    const auth: Partial<Record<AuthorityKey, string>> = {};
    for (const [k, v] of Object.entries(a)) {
      if (!isAuthorityKey(k)) return { error: `Unknown register: ${k}` };
      if (v === '' || v === null) continue;
      if (typeof v !== 'string' || !institutions.includes(v)) return { error: `No institution ${String(v)} for ${k}` };
      auth[k] = v;
    }
    out.authorities = auth;
  }
  if (x.modules !== undefined) {
    const m = x.modules as Record<string, unknown> | null;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return { error: 'Modules must be an object' };
    const mods: DeploymentProfile['modules'] = {};
    for (const [k, v] of Object.entries(m)) {
      if (!isModuleKey(k)) return { error: `Unknown module: ${k}` };
      const e = v as { enabled?: unknown; source?: unknown; system?: unknown } | null;
      if (!e || typeof e.enabled !== 'boolean' || (e.source !== 'civicos' && e.source !== 'external')) return { error: `Module ${k} needs enabled (true or false) and source (civicos or external)` };
      if (e.source === 'external' && (typeof e.system !== 'string' || !/^[a-z0-9-]{2,40}$/.test(e.system))) return { error: `Module ${k} holds its records in an external system: name it (lowercase letters, digits, -)` };
      mods[k] = { enabled: e.enabled, source: e.source, ...(e.source === 'external' ? { system: e.system as string } : {}) };
    }
    out.modules = mods;
  }
  if (x.identity !== undefined) {
    const i = x.identity as { citizens?: unknown; assisted?: unknown } | null;
    if (!i || typeof i.assisted !== 'boolean') return { error: 'Identity needs assisted (true or false)' };
    const c = i.citizens as { issuer?: unknown; clientId?: unknown; assurance?: unknown } | undefined;
    if (c !== undefined) {
      let u: URL | null = null;
      try { u = new URL(String(c.issuer)); } catch { u = null; }
      if (!u || u.protocol !== 'https:' || u.username || u.password) return { error: 'The citizens\' identity provider must be an https address' };
      if (typeof c.clientId !== 'string' || !c.clientId.trim() || c.clientId.length > 200) return { error: 'The citizens\' identity provider needs a client id' };
      out.identity = { assisted: i.assisted, citizens: { issuer: u.origin + u.pathname.replace(/\/+$/, ''), clientId: c.clientId.trim(), ...(typeof c.assurance === 'string' && c.assurance ? { assurance: c.assurance.slice(0, 100) } : {}) } };
    } else out.identity = { assisted: i.assisted };
  }
  if (x.edition !== undefined) {
    // null takes the edition away (setup only: afterwards through the change process).
    if (x.edition === null) out.edition = undefined;
    else {
      const e = checkEdition(x.edition, institutions);
      if ('error' in e) return e;
      out.edition = e;
    }
  }
  if (x.signature !== undefined) {
    const s = x.signature as { framework?: unknown; trustList?: unknown } | null;
    if (!s || (s.framework !== 'platform' && s.framework !== 'national')) return { error: 'Signature framework must be platform or national' };
    out.signature = { framework: s.framework, ...(typeof s.trustList === 'string' && s.trustList ? { trustList: s.trustList.slice(0, 500) } : {}) };
  }
  return out;
}

/** Check an Institutional Edition against the institutions that exist: named, at least one institution, known modules. */
export function checkEdition(v: unknown, institutions: string[]): InstitutionalEdition | { error: string } {
  const e = v as { kind?: unknown; label?: unknown; institutions?: unknown; modules?: unknown } | null;
  if (!e || typeof e !== 'object' || Array.isArray(e)) return { error: 'The Institutional Edition must be an object { label, institutions, modules }' };
  if (e.kind !== undefined && e.kind !== 'institutional') return { error: 'The edition kind is institutional' };
  const label = typeof e.label === 'string' ? e.label.trim().slice(0, 80) : '';
  if (!label) return { error: 'Name the Institutional Edition (e.g. the institution or sector it runs as)' };
  const ids = Array.isArray(e.institutions) ? [...new Set(e.institutions.filter((x): x is string => typeof x === 'string'))] : [];
  if (!ids.length) return { error: 'An Institutional Edition runs as at least one institution' };
  const unknown = ids.find(id => !institutions.includes(id));
  if (unknown) return { error: `No institution ${unknown}` };
  const mods = Array.isArray(e.modules) ? [...new Set(e.modules)] : [];
  if (!mods.length) return { error: 'An Institutional Edition names the modules it runs' };
  const bad = mods.find(m => !isModuleKey(m));
  if (bad !== undefined) return { error: `Unknown module: ${String(bad)}` };
  return { kind: 'institutional', label, institutions: ids.sort(), modules: (mods as ModuleKey[]).sort() };
}

/** The Institutional Edition this profile records, if any (none ships). */
export const editionOf = (p: DeploymentProfile | undefined): InstitutionalEdition | undefined => (p?.edition?.kind === 'institutional' ? p.edition : undefined);

/** Whether an institution is part of this installation: every one without an edition; with one, only those it names. */
export function inEdition(p: DeploymentProfile | undefined, institution: string | undefined): boolean {
  const e = editionOf(p);
  return !e || (!!institution && e.institutions.includes(institution));
}

/** The institution legally responsible for a register in this profile, if the nation named one. */
export const authorityIn = (p: DeploymentProfile | undefined, key: AuthorityKey): string | undefined => p?.authorities?.[key];

/** Whether a module runs (enabled, default on for CivicOS's own modules once its authority is named). */
export function moduleRuns(p: DeploymentProfile | undefined, key: ModuleKey): boolean {
  // An Institutional Edition runs only the modules it names, and only for institutions it runs as.
  const e = editionOf(p);
  if (e && (!e.modules.includes(key) || !inEdition(p, authorityIn(p, MODULES.find(x => x.key === key)!.authority)))) return false;
  const m = p?.modules?.[key];
  if (m) return m.enabled;
  const auth = MODULES.find(x => x.key === key)!.authority;
  return !!authorityIn(p, auth);
}

/**
 * Where a slot the nation has not named is stood in for, until it names one
 * (owner's direction 2026-10-21 §3): the medicines regulator by the health
 * regulator, a controlled-substances authority by the medicines regulator
 * (and so on), a public-health authority by the health regulator. A stand-in
 * is provisional: it is shown as such, fails the competent-authority gate in
 * production and is never taken as proof that the body is legally competent.
 */
export const PROVISIONAL_FALLBACK: Partial<Record<AuthorityKey, AuthorityKey>> = {
  medicinesRegulation: 'healthRegulation',
  controlledSubstances: 'medicinesRegulation',
  publicHealth: 'healthRegulation',
};

const WHAT: Partial<Record<AuthorityKey, string>> = {
  medicinesRegulation: 'the medicines authority', controlledSubstances: 'the controlled-substances authority', publicHealth: 'the public-health authority',
};

/** Who owns what a slot names: the institution named for it, or, where it is empty, a recorded provisional stand-in. */
export interface OwnerResolution {
  /** The slot the form or procedure names. */
  slot: AuthorityKey;
  /** The slot whose institution acts (the slot itself, or the stand-in). */
  actingSlot: AuthorityKey;
  institution?: string;
  /** Set when the slot is empty and a stand-in acts: what the nation has not named, in plain words. */
  provisional?: string;
}

/**
 * The owner of a slot under a profile: the institution named for it, else
 * the first named slot down its fallback chain, marked provisional ("the
 * nation has not named the medicines authority"). Pure; callers pass the
 * profile's authorities (authorityFor() in the store).
 */
export function provisionalOwner(slot: AuthorityKey, authorityFor: (k: AuthorityKey) => string | undefined): OwnerResolution {
  const named = authorityFor(slot);
  if (named || !PROVISIONAL_FALLBACK[slot]) return { slot, actingSlot: slot, ...(named ? { institution: named } : {}) };
  const missing = WHAT[slot] ?? AUTHORITIES.find(a => a.key === slot)?.label ?? slot;
  let k: AuthorityKey | undefined = PROVISIONAL_FALLBACK[slot];
  const seen = new Set<AuthorityKey>([slot]);
  while (k && !seen.has(k)) {
    seen.add(k);
    const id = authorityFor(k);
    if (id) return { slot, actingSlot: k, institution: id, provisional: `provisional: the nation has not named ${missing}; ${AUTHORITIES.find(a => a.key === k)?.label ?? k} stands in, which is not proof that it is legally competent` };
    k = PROVISIONAL_FALLBACK[k];
  }
  return { slot, actingSlot: slot, provisional: `provisional: the nation has not named ${missing}, and no institution stands in` };
}

/** The working calendar legal deadlines count in. */
export const calendarOf = (p: DeploymentProfile | undefined) => p?.calendar ?? DEFAULT_CALENDAR;
