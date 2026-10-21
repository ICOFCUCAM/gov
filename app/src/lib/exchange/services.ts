// Exchange that carries data (docs/GOVERNMENT_OPERATING_MODEL.md §10.3,
// directions §13): a directory of services each institution offers, with
// its owner, version, the data it returns, the scope a caller needs and the
// legal basis, and one way to call them, callService(), used both by modules
// inside the installation (so module boundaries hold) and by other systems
// through /api/exchange/services/<id> with their integration key. The
// provider applies its own rule and returns only the fields the service
// defines (never a record); every call, allowed or refused, gets a signed
// receipt in the exchange log with the declared purpose; an outside caller
// may declare only a purpose approved for it and that service. Events (a
// registered birth) reach permitted subscribers through the signed webhooks
// of the event outbox; the directory lists them too.

import { logExchange, type ExchangeReceipt } from './log';
import { getPerson, current, fold } from '@/lib/civil/register';
import { statusOn } from '@/lib/immigration/register';
import { getOrganisation, publicOrganisation } from '@/lib/organisations/register';
import { getTaxpayer, findTaxpayers } from '@/lib/tax/register';
import { verifyAward } from '@/lib/education/register';
import { getProfessional, publicProfessional } from '@/lib/professions/register';
import { getDeclaration } from '@/lib/customs/register';
import { getProduct, publicProduct } from '@/lib/health/products/register';
import type { AuthorityKey } from '@/lib/nation/deployment';
import { integrationPurposes } from '@/lib/data/store/federation';
import { purposeSlug } from './usage-policy';
import { samplesAllowed } from '@/lib/ops/mode';

export interface Caller { kind: 'module' | 'integration'; id: string; name: string; institution?: string }
export interface ServiceResult { status: number; result: string; data: Record<string, unknown> }
export interface ServiceDef {
  id: string;
  version: number;
  kind: 'query' | 'event';
  title: string;
  owner: AuthorityKey;
  /** The integration scope a caller from outside needs. */
  scope: string;
  /** What it returns, by field (the only fields it ever returns). */
  returns: Record<string, string>;
  dataClass: 'public' | 'personal' | 'restricted';
  legalBasis?: string;
  handle?: (input: Record<string, unknown>, caller: Caller) => ServiceResult;
  /** For events: the CloudEvents type subscribers receive. */
  eventType?: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const SERVICES: ServiceDef[] = [
  {
    id: 'person.verify', version: 1, kind: 'query', title: 'Does this birth registration match these facts?', owner: 'civilRegistration', scope: 'service:person.verify',
    returns: { match: 'yes, no or unknown (not enough to compare)', status: 'alive, deceased or unknown' }, dataClass: 'personal',
    handle: input => {
      const p = getPerson(str(input.registration));
      if (!p || !str(input.registration).startsWith('BR-')) return { status: 200, result: 'no such registration', data: { match: 'no', status: 'unknown' } };
      const v = current(p);
      const given = str(input.given), family = str(input.family), birthDate = str(input.birthDate);
      if (!family && !birthDate) return { status: 200, result: 'nothing to compare', data: { match: 'unknown', status: 'unknown' } };
      const same = (!family || fold(family) === fold(v.names.family)) && (!given || fold(given) === fold(v.names.given)) && (!birthDate || birthDate === v.birth?.date);
      return { status: 200, result: same ? 'match' : 'no match', data: { match: same ? 'yes' : 'no', status: same ? v.status : 'unknown' } };
    },
  },
  {
    id: 'organisation.standing', version: 1, kind: 'query', title: 'Is this organisation registered, licensed or accredited in this register?', owner: 'businessRegister', scope: 'service:organisation.standing',
    returns: { standing: 'granted, suspended, revoked, expired, struck-off, applied, refused or none', validUntil: 'YYYY-MM-DD', name: 'the registered name' }, dataClass: 'public',
    handle: input => {
      const o = getOrganisation(str(input.number));
      if (!o) return { status: 200, result: 'no such organisation', data: { standing: 'none' } };
      const s = publicOrganisation(o).standings.find(x => x.register === str(input.register));
      return { status: 200, result: s ? s.state : 'not in that register', data: { name: publicOrganisation(o).name, standing: s?.state ?? 'none', ...(s?.validUntil ? { validUntil: s.validUntil } : {}) } };
    },
  },
  {
    id: 'taxpayer.status', version: 1, kind: 'query', title: 'Is this person or organisation registered with the tax authority, and for which taxes?', owner: 'tax', scope: 'service:taxpayer.status',
    returns: { registered: 'yes or no', active: 'yes or no', taxTypes: 'the tax types registered for' }, dataClass: 'personal',
    legalBasis: 'The tax law\'s provisions on disclosure (named by the tax authority when it approves the service for a caller)',
    handle: input => {
      // Never returns, assessments, balances or anything else under tax secrecy.
      const t = str(input.tin) ? getTaxpayer(str(input.tin)) : findTaxpayers({ party: str(input.party) })[0];
      return t ? { status: 200, result: t.state, data: { registered: 'yes', active: t.state === 'active' ? 'yes' : 'no', taxTypes: t.taxTypes } } : { status: 200, result: 'not registered', data: { registered: 'no', active: 'no' } };
    },
  },
  {
    id: 'qualification.verify', version: 1, kind: 'query', title: 'Is this qualification, presented by this holder, valid, and what is it?', owner: 'education', scope: 'service:qualification.verify',
    returns: { valid: 'yes or no', title: 'the qualification', level: 'its level', awardedOn: 'YYYY-MM-DD', awardingBody: 'the awarding body', accreditedUnder: 'the register that made the body competent' }, dataClass: 'personal',
    legalBasis: 'The education law\'s provisions on verifying qualifications (named by the education authority when it approves the service for a caller)',
    handle: input => {
      // The caller must know both the number and the holder's name; a wrong name answers like an unknown number. Never the holder's reference or other awards.
      const number = str(input.number), holderName = str(input.holderName);
      if (!number || !holderName) return { status: 422, result: 'number and holderName needed', data: { valid: 'no' } };
      const v = verifyAward(number, holderName);
      if (!v.valid) return { status: 200, result: 'not valid', data: { valid: 'no' } };
      const { valid: _valid, ...rest } = v;
      return { status: 200, result: 'valid', data: { valid: 'yes', ...rest } };
    },
  },
  {
    id: 'professional.standing', version: 1, kind: 'query', title: 'Is this person registered in a regulated profession, and in what standing?', owner: 'professionalRegulation', scope: 'service:professional.standing',
    returns: { registered: 'yes or no', profession: 'the profession', state: 'registered, suspended, revoked or lapsed', validUntil: 'YYYY-MM-DD', conditions: 'conditions on practice' }, dataClass: 'public',
    legalBasis: 'The public register of the profession (the regulator names the law when it approves the service for a caller)',
    handle: input => {
      const e = getProfessional(str(input.number));
      if (!e) return { status: 200, result: 'not registered', data: { registered: 'no' } };
      const p = publicProfessional(e);
      // An approved caller with a legal basis (the authorised bulk path): the conditions on practice too, never the person reference or qualifications.
      return { status: 200, result: p.state, data: { registered: p.state === 'registered' ? 'yes' : 'no', profession: p.professionTitle, state: p.state, ...(e.validUntil ? { validUntil: e.validUntil } : {}), conditions: [...e.conditions] } };
    },
  },
  {
    id: 'customs.release', version: 1, kind: 'query', title: 'Have the goods on this declaration been released by customs?', owner: 'customs', scope: 'service:customs.release',
    returns: { released: 'yes or no', state: 'lodged, assessed, released, release-refused or withdrawn', releasedOn: 'YYYY-MM-DD' }, dataClass: 'restricted',
    legalBasis: 'The customs law\'s provisions on cooperation with other agencies (named by the customs authority when it approves the service for a caller)',
    handle: input => {
      // Never the declarant, the goods, their values or the duty (commercial confidentiality).
      const d = getDeclaration(str(input.number));
      if (!d) return { status: 200, result: 'unknown', data: { released: 'no' } };
      return { status: 200, result: d.state, data: { released: d.state === 'released' ? 'yes' : 'no', state: d.state, ...(d.state === 'released' && d.release ? { releasedOn: d.release.at.slice(0, 10) } : {}) } };
    },
  },
  {
    // The product check (HLT-MED-024; Health I4 exchange-product-status): only what publicProductView() lets out under the nation's
    // approved public information classification (shipped empty), and only decided records; never the dossier, the assessment, the
    // grounds, persons or an unpublished enforcement record. No caller ships approved: two officials approve each integration and purpose.
    id: 'product.status', version: 1, kind: 'query', title: 'What is the authorised status of this medicine or medical device?', owner: 'medicinesRegulation', scope: 'service:product.status',
    returns: { productId: 'the register number (PRD-…)', kind: 'medicine or device', fields: 'the attributes the nation\'s approved public information classification lists, each approved by a decision', notices: 'published notices (kind, date, wording)', source: 'the regulator\'s record and version, and the classification version' }, dataClass: 'public',
    legalBasis: 'The medicines law\'s provisions on the public register (named by the medicines authority when it approves the service for a caller)',
    handle: input => {
      const p = getProduct(str(input.number));
      // An application under assessment, a refusal or an unknown number answer the same: not authorised, nothing else.
      if (!p || !p.history.some(s => s.decision) || p.state === 'refused') return { status: 200, result: 'not on the register', data: {} };
      const { sample: _s, ...view } = publicProduct(p);
      return { status: 200, result: 'on the register', data: view as unknown as Record<string, unknown> };
    },
  },
  {
    id: 'immigration.status', version: 1, kind: 'query', title: 'Does this travel document hold a valid visa or residence permit on this date?', owner: 'immigration', scope: 'service:immigration.status',
    returns: { valid: 'yes or no', kind: 'visa or residence-permit', category: 'the category granted', validUntil: 'YYYY-MM-DD', conditions: 'conditions attached (e.g. no work)' }, dataClass: 'personal',
    legalBasis: 'The immigration law\'s provisions on checking status (named by the immigration authority when it approves the service for a caller)',
    handle: input => {
      const nationality = str(input.nationality), documentNumber = str(input.documentNumber);
      if (!/^[A-Za-z]{3}$/.test(nationality) || !documentNumber) return { status: 422, result: 'nationality (3 letters) and documentNumber needed', data: { valid: 'no' } };
      const kind = input.kind === 'visa' || input.kind === 'residence-permit' ? input.kind : undefined;
      const a = statusOn({ nationality, documentNumber, ...(kind ? { kind } : {}), ...(str(input.on) ? { on: str(input.on) } : {}) });
      // The answer never names the holder or the file: what is valid, until when, under which conditions.
      return { status: 200, result: a.valid ? 'valid' : 'not valid', data: a.valid ? { valid: 'yes', kind: a.kind, category: a.category, validUntil: a.validUntil, conditions: a.conditions } : { valid: 'no' } };
    },
  },
  {
    id: 'civil.birth.registered', version: 1, kind: 'event', title: 'A birth was registered (registration number, month and region; no names)', owner: 'civilRegistration', scope: 'events:civil',
    returns: { registrationNumber: 'BR-…', month: 'YYYY-MM', region: 'region name' }, dataClass: 'restricted', eventType: 'org.civicos.civil.birth.register',
  },
];

export const serviceDirectory = () => SERVICES.map(({ handle: _h, ...s }) => s);

/** Call a service: the provider's rule, only its fields, a signed receipt for every call. */
export async function callService(caller: Caller, serviceId: string, input: Record<string, unknown>, purpose: string): Promise<{ status: number; data?: Record<string, unknown>; error?: string; receipt: ExchangeReceipt }> {
  const s = SERVICES.find(x => x.id === serviceId);
  const log = (status: number, result: string) => logExchange({ channel: 'service', feedId: `${caller.kind}:${caller.id}`, method: 'POST', path: `service:${serviceId}`, body: JSON.stringify({ purpose, input }), signature: 'absent', status, result: `${result} · purpose: ${purpose.slice(0, 120)}` });
  if (!s || s.kind !== 'query' || !s.handle) { const { receipt } = await log(404, 'no such query service'); return { status: 404, error: 'No such service', receipt }; }
  if (!purpose?.trim()) { const { receipt } = await log(400, 'no purpose stated'); return { status: 400, error: 'State the purpose of the request', receipt }; }
  // Purposes approved for this caller and service. Outside callers
  // (integrations) may state only a purpose two officials approved for them
  // and this service (lib/data/store/federation.ts). An integration approved
  // before purposes were recorded has none approved yet: refused in a
  // production installation until two officials approve its purposes;
  // allowed in demo and training, with the receipt noting "purposes not yet
  // approved". Modules inside the installation (kind 'module') keep a stated
  // purpose only: their purposes are fixed in code and reviewed with it.
  let note = '';
  if (caller.kind === 'integration') {
    const allowed = integrationPurposes(caller.id, serviceId);
    const stated = purposeSlug(purpose);
    if (allowed.kind === 'unknown') { const { receipt } = await log(403, 'caller is not an approved integration'); return { status: 403, error: 'This caller is not an approved integration', receipt }; }
    if (allowed.kind === 'legacy') {
      if (!samplesAllowed()) { const { receipt } = await log(403, 'purposes not yet approved'); return { status: 403, error: `No purposes are approved yet for this integration and ${serviceId}: two officials approve them first`, receipt }; }
      note = ' · purposes not yet approved';
    } else if (!allowed.purposes.includes(stated)) {
      const named = allowed.purposes.length ? allowed.purposes.join(', ') : 'none';
      const { receipt } = await log(403, `purpose not approved (approved: ${named})`);
      return { status: 403, error: `Purpose '${stated}' is not approved for this caller and ${serviceId} (approved: ${named})`, receipt };
    }
  }
  const r = s.handle(input, caller);
  // Only the fields the service defines.
  const data = Object.fromEntries(Object.entries(r.data).filter(([k]) => k in s.returns));
  const { receipt } = await log(r.status, r.result + note);
  return { status: r.status, data, receipt };
}
