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
// of the event outbox; the directory lists them too. Between two registered
// institutions a call answers only under an approved `exchange` relationship
// in force (plan I9, lib/federation/binding.ts).

import { logExchange, type ExchangeReceipt } from './log';
import { getPerson, current, fold } from '@/lib/civil/register';
import { statusOn } from '@/lib/immigration/register';
import { getOrganisation, publicOrganisation } from '@/lib/organisations/register';
import { getTaxpayer, findTaxpayers } from '@/lib/tax/register';
import { verifyAward } from '@/lib/education/register';
import { getProfessional, publicProfessional } from '@/lib/professions/register';
import { getDeclaration } from '@/lib/customs/register';
import { getProduct, publicProduct } from '@/lib/health/products/register';
import { importAuthorisationValid } from '@/lib/health/products/imports';
import { collectNotices, receiptDeliveries, SAFETY_NOTICE_SERVICE } from '@/lib/health/products/notices';
import type { AuthorityKey } from '@/lib/nation/deployment';
import { integrationPurposes } from '@/lib/data/store/federation';
import { purposeSlug } from './usage-policy';
import { samplesAllowed } from '@/lib/ops/mode';
import { slotConnection } from '@/lib/nation/edition';
import { verifyIdentity, VERIFY_MEANING } from '@/lib/identity/register';
import { documentStatus } from '@/lib/passports/register';
import { employerStanding } from '@/lib/labour/register';
import { authorityFor } from '@/lib/data/store';
import { exchangeBinding, bindingNote } from '@/lib/federation/binding';

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
  handle?: (input: Record<string, unknown>, caller: Caller, purpose?: string) => ServiceResult;
  /** Called with the call's receipt once it is logged (a service that records deliveries keeps the receipt with them). */
  receipted?: (data: Record<string, unknown>, caller: Caller, receipt: string) => void;
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
    // Customs learns only whether an import authorisation is valid (HLT-MED-013, deviation customs-apart; Health I4
    // procedure-import-and-controlled): never the importer, product, quantity or file. Customs keeps its own powers; this
    // service adds none. No caller ships approved: two officials approve each integration and purpose.
    id: 'product.import-authorisation', version: 1, kind: 'query', title: 'Is this medicines import authorisation valid?', owner: 'medicinesRegulation', scope: 'service:product.import-authorisation',
    returns: { valid: 'yes or no', validUntil: 'YYYY-MM-DD, where the decision set one' }, dataClass: 'public',
    legalBasis: 'The medicines law\'s provisions on import authorisations (named by the medicines authority when it approves the service for a caller)',
    handle: input => {
      const a = importAuthorisationValid(str(input.number), str(input.on) || undefined);
      return { status: 200, result: a.valid ? 'valid' : 'not valid', data: a.valid ? { valid: 'yes', ...(a.validUntil ? { validUntil: a.validUntil } : {}) } : { valid: 'no' } };
    },
  },
  {
    // HX-005 (Part 6 §9.2): recall notices and safety alerts from the medicines authority to authorised health institutions
    // (lib/health/products/notices.ts). Each notice carries only publicProductView() of the product, the kind, the recall
    // class, the case reference and its dates; it is queued for each integration two officials approved for this service
    // and a purpose, and collected here (each delivery recorded with its purpose and receipt). The holder's supply-chain
    // notice stays a document of the recall case (medicines.recall, supply-chain-notice); the notice says whether it is
    // recorded. No subscriber ships approved.
    id: SAFETY_NOTICE_SERVICE, version: 1, kind: 'query', title: 'Recall notices and safety alerts for medicines and medical devices (HX-005)', owner: 'medicinesRegulation', scope: `service:${SAFETY_NOTICE_SERVICE}`,
    returns: { notices: 'the notices issued since the last collection: notice number, kind (recall or safety_notice), the product as publicProductView() lets it out, recall class, the regulator\'s case reference, decided and published dates, whether the holder\'s supply-chain notice (the recall case\'s supply-chain-notice document) is recorded' }, dataClass: 'public',
    legalBasis: 'The medicines law\'s provisions on recalls and safety notices (named by the medicines authority when it approves the service for a subscriber)',
    handle: (_input, caller, purpose) => {
      // Only an approved integration has notices queued for it; a module inside the installation reads the public register instead.
      const notices = caller.kind === 'integration' && purpose ? collectNotices(caller.id, purpose) : [];
      return { status: 200, result: `${notices.length} notice(s)`, data: { notices } };
    },
    receipted: (data, caller, receipt) => {
      const list = Array.isArray(data.notices) ? (data.notices as { notice: string }[]).map(n => n.notice) : [];
      if (caller.kind === 'integration' && list.length) receiptDeliveries(caller.id, list, receipt);
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
    // Plan step I6 (field series Part 4 §3.3, specification Part 2 §C.1 "Identity verification response"): a narrow
    // verification result and its meaning, never the record. The caller states the purpose; an outside caller only one two
    // officials approved for it and this service. A failed lookup is never proof that a person does not exist or is ineligible.
    id: 'identity.verify', version: 1, kind: 'query', title: 'Is this identity credential valid, and do these facts match it?', owner: 'identity', scope: 'service:identity.verify',
    returns: { result: 'verified, not_verified, unable_to_verify or additional_review_required', meaning: 'what the result means (and what may not be concluded from it)', credentialState: 'the credential\'s status', validUntil: 'YYYY-MM-DD', source: 'the identity register, as at the time of the answer' }, dataClass: 'personal',
    legalBasis: 'The national identity law\'s provisions on verification (named by the identity authority when it approves the service for a caller; CFG-IDN-003)',
    handle: input => {
      // No identity authority named: the service cannot answer, and says so (never a negative answer).
      if (!authorityFor('identity')) return { status: 503, result: 'unable_to_verify (no identity authority named)', data: { result: 'unable_to_verify', meaning: VERIFY_MEANING.unable_to_verify } };
      const v = verifyIdentity({ number: str(input.number), givenNames: str(input.givenNames), familyName: str(input.familyName), birthDate: str(input.birthDate) });
      return { status: 200, result: v.result, data: { ...v, meaning: VERIFY_MEANING[v.result], source: `identity register, ${new Date().toISOString()}` } };
    },
  },
  {
    // Plan step I6 (field series Part 4 §5.2 and §9.2): whether a travel document the nation issued is valid; never the
    // holder, the application or the document's history. A lost or stolen report answers not valid with its class.
    id: 'travel-document.status', version: 1, kind: 'query', title: 'Is this travel document, issued by this nation, valid on this date?', owner: 'travelDocuments', scope: 'service:travel-document.status',
    returns: { status: 'valid, not-valid or unknown', reason: 'why not valid (expired, reported-lost, reported-stolen, cancelled, revoked, surrendered, superseded…)', validUntil: 'YYYY-MM-DD' }, dataClass: 'personal',
    legalBasis: 'The passport law\'s provisions on checking travel documents (named by the travel document authority when it approves the service for a caller)',
    handle: input => {
      const n = str(input.documentNumber);
      if (!n) return { status: 422, result: 'documentNumber needed', data: { status: 'unknown' } };
      const a = documentStatus(n, str(input.on) || undefined);
      return { status: 200, result: a.status, data: a };
    },
  },
  {
    // Plan step I6 (specification Part 2 §C.5): whether an employer is registered with the labour authority; never its workers,
    // inspections, complaints or injuries.
    id: 'employer.standing', version: 1, kind: 'query', title: 'Is this employer registered with the labour authority?', owner: 'labour', scope: 'service:employer.standing',
    returns: { registered: 'yes or no', state: 'registered, suspended or deregistered', employer: 'the labour register number' }, dataClass: 'public',
    legalBasis: 'The labour law\'s provisions on employer registration (named by the labour authority when it approves the service for a caller)',
    handle: input => {
      const n = str(input.employer) || str(input.organisation);
      if (!n) return { status: 422, result: 'employer or organisation needed', data: { registered: 'no' } };
      const a = employerStanding(n);
      return { status: 200, result: a.registered === 'yes' ? 'registered' : 'not registered', data: a };
    },
  },
  {
    id: 'civil.birth.registered', version: 1, kind: 'event', title: 'A birth was registered (registration number, month and region; no names)', owner: 'civilRegistration', scope: 'events:civil',
    returns: { registrationNumber: 'BR-…', month: 'YYYY-MM', region: 'region name' }, dataClass: 'restricted', eventType: 'org.civicos.civil.birth.register',
  },
];

export const serviceDirectory = () => SERVICES.map(({ handle: _h, receipted: _r, ...s }) => s);

/** Call a service: the provider's rule, only its fields, a signed receipt for every call. */
export async function callService(caller: Caller, serviceId: string, input: Record<string, unknown>, purpose: string): Promise<{ status: number; data?: Record<string, unknown>; error?: string; receipt: ExchangeReceipt }> {
  const s = SERVICES.find(x => x.id === serviceId);
  const log = (status: number, result: string) => logExchange({ channel: 'service', feedId: `${caller.kind}:${caller.id}`, method: 'POST', path: `service:${serviceId}`, body: JSON.stringify({ purpose, input }), signature: 'absent', status, result: `${result} · purpose: ${purpose.slice(0, 120)}` });
  if (!s || s.kind !== 'query' || !s.handle) { const { receipt } = await log(404, 'no such query service'); return { status: 404, error: 'No such service', receipt }; }
  if (!purpose?.trim()) { const { receipt } = await log(400, 'no purpose stated'); return { status: 400, error: 'State the purpose of the request', receipt }; }
  // An Institutional Edition answers only for its own institutions: a service owned by one that is not
  // part of it is not connected, and says so (spec Part 5 D: never claim a check that was not performed).
  const notConnected = slotConnection(s.owner);
  if (notConnected) { const { receipt } = await log(503, 'not connected (Institutional Edition)'); return { status: 503, error: notConnected, data: { connected: 'no' }, receipt }; }
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
  // I9: between institutions, only under an approved `exchange` relationship in force (lib/federation/binding.ts):
  // a suspended, ended or expired relationship stops this call at once; the receipt names the relationship and version.
  const bound = exchangeBinding(s.id, { slot: s.owner }, caller, purpose);
  if (bound.kind === 'refused') { const { receipt } = await log(bound.status, `no relationship in force (${bound.from} → ${bound.to})`); return { status: bound.status, error: bound.error, receipt }; }
  note += bindingNote(bound);
  const r = s.handle(input, caller, purposeSlug(purpose));
  // Only the fields the service defines.
  const data = Object.fromEntries(Object.entries(r.data).filter(([k]) => k in s.returns));
  const { receipt } = await log(r.status, r.result + note);
  s.receipted?.(data, caller, receipt.id);
  return { status: r.status, data, receipt };
}
