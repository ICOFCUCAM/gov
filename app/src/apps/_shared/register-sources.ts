// Which real registers and stores an institution's application reads (the
// wiring audit, part 1 §7). Each ministry app ran on generators only; this
// names, per app, the platform's own records that now exist for it, the API
// that answers for them and the console screen that works them. Every read
// goes through the existing route, which applies the read rule (tax, customs,
// immigration, education and civil records only for their authority;
// professions only for the registers an institution keeps; cases by
// caseReadRefusal) and writes the access log where the rule asks. Nothing
// here reads around them. Pure: no fetch, no browser.

export interface AppIdentity {
  id: string;
  domain: string;
  kind: 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer';
  archetypeOrBranch: string;
  instanceId?: string;
}

export interface RecordFigure {
  label: string;
  value: number;
}

/** One register or store the app shows from its records. */
export interface RecordSource {
  key: string;
  /** Plain name of the register. */
  label: string;
  /** GET route that answers for it (applies the read rule and the access log). */
  url: string;
  /** Console screen where the records are worked. */
  screen: string;
  /** Who keeps it, in words (shown when the read is refused). */
  keeper: string;
  /** Figures from the route's answer. */
  read: (body: unknown) => RecordFigure[];
  /** The store also holds example records in demo and training installations (marked Sample there). */
  mayHoldSamples?: boolean;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const sum = (o: unknown): number => (o && typeof o === 'object' ? Object.values(o as Record<string, unknown>).reduce<number>((a, v) => a + (typeof v === 'object' ? sum(v) : num(v)), 0) : 0);
const len = (v: unknown): number => (Array.isArray(v) ? v.length : 0);
const get = (o: unknown, k: string): unknown => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined);

const casesOf = (label: string, query: string): RecordSource => ({
  key: `cases:${query}`, label, mayHoldSamples: true, url: `/api/cases?${query}&open=true&limit=1000`, screen: '/gov/work/cases/open',
  keeper: 'the institution responsible for each case',
  read: b => {
    const cs = (get(b, 'cases') as { pending?: unknown; deadlines?: { due: string; met?: string; lapsed?: string }[] }[] | undefined) ?? [];
    const now = Date.now();
    return [
      { label: 'Open cases', value: cs.length },
      { label: 'Waiting for a second official', value: cs.filter(c => c.pending).length },
      { label: 'Past a deadline', value: cs.filter(c => (c.deadlines ?? []).some(d => !d.met && (d.lapsed || Date.parse(d.due) < now))).length },
    ];
  },
});

const facilitiesOf = (ministryId: string): RecordSource => ({
  key: 'facilities', label: 'Registered sites', url: `/api/facilities?ministry=${encodeURIComponent(ministryId)}&sites=none`, screen: '/gov/sites',
  keeper: 'the institution that owns each site',
  read: b => {
    const c = get(b, 'ministryCounts');
    return [
      { label: 'Published sites', value: num(get(c, 'published')) },
      { label: 'Awaiting location certification', value: num(get(c, 'awaiting')) },
    ];
  },
});

const incidentsOf = (ministryId: string): RecordSource => ({
  key: 'incidents', label: 'Recorded incidents', mayHoldSamples: true, url: `/api/org/ministries/${encodeURIComponent(ministryId)}/incidents`, screen: '/gov/coordination',
  keeper: 'the institution itself',
  read: b => {
    const list = (get(b, 'incidents') as { active?: boolean; place?: unknown }[] | undefined) ?? [];
    const active = list.filter(i => i.active);
    return [
      { label: 'Active incidents', value: active.length },
      { label: 'With a recorded place', value: active.filter(i => i.place).length },
    ];
  },
});

const organisationsKeptBy = (ministryId: string): RecordSource => ({
  key: 'organisations', label: 'Organisations in registers this institution keeps', url: '/api/organisations?limit=1000', screen: '/gov/organisations',
  keeper: 'the authority named for each register type (Who is responsible)',
  read: b => {
    const kept = new Set(((get(b, 'types') as { key: string; keeper?: string | null }[] | undefined) ?? []).filter(t => t.keeper === ministryId).map(t => t.key));
    const orgs = (get(b, 'organisations') as { standings?: { register: string; state: string }[] }[] | undefined) ?? [];
    const inKept = orgs.filter(o => (o.standings ?? []).some(s => kept.has(s.register)));
    return [
      { label: 'Register types kept', value: kept.size },
      { label: 'Organisations with a standing in them', value: inKept.length },
    ];
  },
});

const SOURCES = {
  civil: { key: 'civil', label: 'Civil register', url: '/api/civil', screen: '/gov/civil', keeper: 'the civil registration authority',
    read: (b: unknown) => { const s = get(b, 'size'); return [{ label: 'Persons', value: num(get(s, 'persons')) }, { label: 'Births', value: num(get(s, 'births')) }, { label: 'Deaths', value: num(get(s, 'deaths')) }, { label: 'Marriages', value: num(get(s, 'marriages')) }]; } },
  tax: { key: 'tax', label: 'Tax register', url: '/api/tax', screen: '/gov/tax', keeper: 'the tax authority',
    read: (b: unknown) => { const c = get(b, 'counts'); return [{ label: 'Taxpayers', value: sum(get(c, 'taxpayers')) }, { label: 'Returns', value: sum(get(c, 'returns')) }, { label: 'Assessments', value: sum(get(c, 'assessments')) }]; } },
  payments: { key: 'payments', label: 'Bills and receipts', url: '/api/payments', screen: '/gov/treasury', keeper: 'the institution that issued each bill', mayHoldSamples: true,
    read: (b: unknown) => [{ label: 'Bills', value: len(get(b, 'bills')) }, { label: 'Receipts', value: len(get(b, 'receipts')) }] },
  customs: { key: 'customs', label: 'Customs declarations', url: '/api/customs', screen: '/gov/customs', keeper: 'the customs authority',
    read: (b: unknown) => { const c = get(b, 'counts'); return [{ label: 'Declarations', value: sum(c) }, { label: 'Released', value: num(get(c, 'released')) }, { label: 'Waiting (lodged or assessed)', value: num(get(c, 'lodged')) + num(get(c, 'assessed')) }]; } },
  immigration: { key: 'immigration', label: 'Visas and residence permits', url: '/api/immigration', screen: '/gov/immigration', keeper: 'the immigration authority',
    read: (b: unknown) => { const c = (get(b, 'counts') as { kind: string; state: string; count: number }[] | undefined) ?? []; const t = (f: (x: { kind: string; state: string }) => boolean) => c.filter(f).reduce((a, x) => a + num(x.count), 0); return [{ label: 'Grants', value: t(() => true) }, { label: 'Visas', value: t(x => x.kind === 'visa') }, { label: 'Residence permits', value: t(x => x.kind !== 'visa') }]; } },
  education: { key: 'education', label: 'Qualifications and inspections', url: '/api/education', screen: '/gov/education', keeper: 'the education authority',
    read: (b: unknown) => { const c = get(b, 'counts'); return [{ label: 'Qualifications awarded', value: num(get(c, 'awards')) }, { label: 'Revoked', value: num(get(c, 'revoked')) }, { label: 'Inspections', value: num(get(c, 'inspections')) }, { label: 'School returns', value: num(get(c, 'returns')) }]; } },
  professions: { key: 'professions', label: 'Professions registers kept here', url: '/api/professions', screen: '/gov/health-regulation', keeper: 'each profession\'s regulator',
    read: (b: unknown) => { const c = get(b, 'counts') as Record<string, Record<string, number>> | undefined ?? {}; return [{ label: 'Professions kept', value: len(get(b, 'professions')) }, { label: 'Professionals registered', value: Object.values(c).reduce((a, x) => a + num(x.registered), 0) }, { label: 'Suspended', value: Object.values(c).reduce((a, x) => a + num(x.suspended), 0) }]; } },
  healthReturns: { key: 'health-returns', label: 'Facility returns (health)', url: '/api/health-regulation', screen: '/gov/health-regulation', keeper: 'the health regulator',
    read: (b: unknown) => [{ label: 'Capacity returns recorded', value: num(get(get(b, 'counts'), 'returns')) }] },
  courts: { key: 'courts', label: 'Court hearings (public cause list)', url: '/api/courts/cause-list?days=7', screen: '/courts/cause-list', keeper: 'the judiciary',
    read: (b: unknown) => [{ label: 'Hearings in the next 7 days', value: len(get(b, 'hearings')) }] },
  permits: { key: 'permits', label: 'Permits', url: '/api/permits', screen: '/console', keeper: 'the institutions that hold a power over each permit type', mayHoldSamples: true,
    read: (b: unknown) => { const p = (get(b, 'permits') as { status?: string }[] | undefined) ?? []; return [{ label: 'Permits', value: p.length }, { label: 'Waiting for a decision', value: p.filter(x => ['submitted', 'in-review', 'needs-info'].includes(String(x.status))).length }]; } },
} satisfies Record<string, RecordSource>;

/** The registers an institution's application reads, most specific first. */
export function recordSourcesFor(app: AppIdentity): RecordSource[] {
  const out: RecordSource[] = [];
  const arch = app.archetypeOrBranch;
  const mid = app.kind === 'ministry' ? app.instanceId : undefined;

  if (app.kind === 'ministry') {
    if (arch === 'HEALTH') out.push(SOURCES.healthReturns, SOURCES.professions);
    if (arch === 'EDUCATION') out.push(SOURCES.education);
    if (arch === 'FINANCE') out.push(SOURCES.tax, SOURCES.customs, SOURCES.payments);
    if (arch === 'INTERIOR') out.push(SOURCES.civil, SOURCES.immigration, SOURCES.permits);
    if (arch === 'JUSTICE') out.push(SOURCES.courts);
    if (arch === 'TRADE' || arch === 'LABOR') out.push(SOURCES.permits);
    if (mid) out.push(casesOf('Cases of this institution', `owner=${encodeURIComponent(mid)}`), organisationsKeptBy(mid), facilitiesOf(mid), incidentsOf(mid));
    return out;
  }
  if (app.id === 'immigration') return [SOURCES.immigration, casesOf('Immigration cases', 'procedure=immigration.visa'), casesOf('Residence permit cases', 'procedure=immigration.residence-permit')];
  if (app.id === 'customs') return [SOURCES.customs, casesOf('Customs declaration cases', 'procedure=customs.declaration')];
  if (app.id === 'police-command') return [casesOf('Police reports (intake and referral)', 'procedure=police.incident')];
  if (app.kind === 'branch' && arch === 'judiciary') return [SOURCES.courts, casesOf('Court cases', 'procedure=court.case')];
  if (app.id === 'officer-console') return [SOURCES.permits, casesOf('Cases you may read', 'open=true')];
  if (app.id === 'citizen-wallet') return [SOURCES.permits, SOURCES.payments];
  return out;
}

/** How a refused or failed read is said on screen. */
export function readOutcome(status: number, error: string | undefined, source: Pick<RecordSource, 'keeper'>): { kind: 'refused' | 'sign-in' | 'not-connected'; text: string } {
  if (status === 401) return { kind: 'sign-in', text: 'Sign in as an official to see these records.' };
  if (status === 403) return { kind: 'refused', text: error ? `Not readable with your account: ${error}` : `Only ${source.keeper} may read these records.` };
  return { kind: 'not-connected', text: `Not connected${error ? `: ${error}` : ''}.` };
}
