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
  | 'trustServices';

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
];
/** The slots every installation fills (the registers the platform runs). */
export const REQUIRED_AUTHORITIES = AUTHORITIES.filter(a => !a.optional);
/**
 * Slots whose named institution stands outside whole-government reach in
 * lib/auth/roles.ts whatever its recorded standing (the judiciary and data
 * protection as before; the legislature, head of state and a constitutional
 * court by their nature). Other bodies are independent only when their
 * recorded standing says so (lib/data/store/institutions.ts).
 */
export const INDEPENDENT_SLOTS: AuthorityKey[] = ['judiciary', 'dataProtection', 'legislature', 'headOfState', 'constitutionalCourt'];
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
  if (x.signature !== undefined) {
    const s = x.signature as { framework?: unknown; trustList?: unknown } | null;
    if (!s || (s.framework !== 'platform' && s.framework !== 'national')) return { error: 'Signature framework must be platform or national' };
    out.signature = { framework: s.framework, ...(typeof s.trustList === 'string' && s.trustList ? { trustList: s.trustList.slice(0, 500) } : {}) };
  }
  return out;
}

/** The institution legally responsible for a register in this profile, if the nation named one. */
export const authorityIn = (p: DeploymentProfile | undefined, key: AuthorityKey): string | undefined => p?.authorities?.[key];

/** Whether a module runs (enabled, default on for CivicOS's own modules once its authority is named). */
export function moduleRuns(p: DeploymentProfile | undefined, key: ModuleKey): boolean {
  const m = p?.modules?.[key];
  if (m) return m.enabled;
  const auth = MODULES.find(x => x.key === key)!.authority;
  return !!authorityIn(p, auth);
}

/** The working calendar legal deadlines count in. */
export const calendarOf = (p: DeploymentProfile | undefined) => p?.calendar ?? DEFAULT_CALENDAR;
