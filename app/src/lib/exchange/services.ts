// Exchange that carries data (docs/GOVERNMENT_OPERATING_MODEL.md §10.3,
// directions §13): a directory of services each institution offers, with
// its owner, version, the data it returns, the scope a caller needs and the
// legal basis, and one way to call them, callService(), used both by modules
// inside the installation (so module boundaries hold) and by other systems
// through /api/exchange/services/<id> with their integration key. The
// provider applies its own rule and returns only the fields the service
// defines (never a record); every call, allowed or refused, gets a signed
// receipt in the exchange log with the declared purpose. Events (a
// registered birth) reach permitted subscribers through the signed webhooks
// of the event outbox; the directory lists them too.

import { logExchange, type ExchangeReceipt } from './log';
import { getPerson, current, fold } from '@/lib/civil/register';
import { statusOn } from '@/lib/immigration/register';
import type { AuthorityKey } from '@/lib/nation/deployment';

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
  const r = s.handle(input, caller);
  // Only the fields the service defines.
  const data = Object.fromEntries(Object.entries(r.data).filter(([k]) => k in s.returns));
  const { receipt } = await log(r.status, r.result);
  return { status: r.status, data, receipt };
}
