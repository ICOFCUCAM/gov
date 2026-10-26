// The federation event envelope (plan I9; specification Part 5 F "Event
// contract" and "Reliable delivery"): what one institution tells another that
// something happened, without giving it the record.
//
//   {
//     "event_id": "fev-…", "event_type": "permit.issued", "schema_version": "1.0",
//     "source_institution_id": "<institution id in the register>",
//     "aggregate_reference": "Permit:P-77", "occurred_at": "…", "published_at": "…",
//     "legal_context": { "instrument_reference": "<law id>", "version_reference": "<version id>",
//                        "relationship_reference": "rel-… v1" },
//     "payload_reference": "<service id or record reference to ask for under authority>",
//     "correlation_id": "…",
//     "integrity": { "alg": "ed25519", "key_id": "ed25519:…", "signature": "<base64>" }
//   }
//
// Every field is an identifier, a reference or a time: no field carries a
// name or free text (the pattern below refuses spaces), so a broadly
// distributed event never carries personal data; a receiver that needs more
// asks the owning institution's exchange service under its own authority.
// The signature is over the canonical JSON of every field but `integrity`
// (keys sorted, no spaces), by the source institution's own key through key
// custody (lib/federation/keys.ts; a development key is refused in
// production). The legal context cites the laws register: a version that is
// not recorded there is refused at publication.

import { randomUUID } from 'node:crypto';
import { verifyBytes, keyIdOfPem } from '@/lib/crypto/signing-key';
import { getMinistry } from '@/lib/data/store/ministries';
import { signAsInstitution } from './keys';

export const ENVELOPE_SCHEMA_VERSIONS = ['1.0'] as const;
export type SchemaVersion = typeof ENVELOPE_SCHEMA_VERSIONS[number];

/** The event types and what each means (specification Part 5 F). Others are refused until added here with a schema version. */
export const EVENT_CATALOGUE: { type: string; means: string; versions: SchemaVersion[] }[] = [
  { type: 'credential.status.changed', means: 'A credential (licence, registration, qualification) changed status', versions: ['1.0'] },
  { type: 'permit.issued', means: 'A permit or licence was issued', versions: ['1.0'] },
  { type: 'permit.revoked', means: 'A permit or licence was revoked', versions: ['1.0'] },
  { type: 'case.status.changed', means: 'A case moved to another stage', versions: ['1.0'] },
  { type: 'court.order.issued', means: 'A court issued an order', versions: ['1.0'] },
  { type: 'payment.reconciled', means: 'A payment was reconciled', versions: ['1.0'] },
  { type: 'facility.status.changed', means: 'A registered site changed status', versions: ['1.0'] },
  { type: 'legal.instrument.effective', means: 'A law or a version of it came into force', versions: ['1.0'] },
  { type: 'referral.status.changed', means: 'A referral between institutions changed status (exchange.referral.update)', versions: ['1.0'] },
];
export const isEventType = (t: unknown): t is string => typeof t === 'string' && EVENT_CATALOGUE.some(e => e.type === t);

export interface LegalContext { instrument_reference: string; version_reference: string; relationship_reference?: string }
export interface EnvelopeBody {
  event_id: string;
  event_type: string;
  schema_version: SchemaVersion;
  source_institution_id: string;
  aggregate_reference: string;
  occurred_at: string;
  published_at: string;
  legal_context: LegalContext;
  payload_reference?: string;
  correlation_id?: string;
}
export interface EventEnvelope extends EnvelopeBody {
  integrity: { alg: 'ed25519'; key_id: string; signature: string };
}

/** A reference: no spaces, no free text. */
export const REFERENCE = /^[A-Za-z0-9/][A-Za-z0-9._:/@#-]{0,159}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const BODY_KEYS = ['event_id', 'event_type', 'schema_version', 'source_institution_id', 'aggregate_reference', 'occurred_at', 'published_at', 'legal_context', 'payload_reference', 'correlation_id'];
const LEGAL_KEYS = ['instrument_reference', 'version_reference', 'relationship_reference'];

/** Canonical JSON: keys sorted at every depth, no whitespace. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
/** The bytes an envelope's signature covers: every field but `integrity`. */
export const signedBytes = (e: EnvelopeBody | EventEnvelope): string => { const { integrity: _i, ...body } = e as EventEnvelope; void _i; return canonical(body); };

/** Structural check of an envelope as received or built: the problems, in plain words (empty when it is well formed). */
export function envelopeProblems(x: unknown): string[] {
  const p: string[] = [];
  if (!x || typeof x !== 'object' || Array.isArray(x)) return ['An envelope is a JSON object'];
  const e = x as Record<string, unknown>;
  for (const k of Object.keys(e)) if (k !== 'integrity' && !BODY_KEYS.includes(k)) p.push(`Unknown field ${k.slice(0, 40)} (an envelope carries references only)`);
  for (const k of ['event_id', 'source_institution_id', 'aggregate_reference']) if (typeof e[k] !== 'string' || !REFERENCE.test(e[k] as string)) p.push(`${k} is a reference (letters, digits and . _ : / @ # -, no spaces)`);
  for (const k of ['payload_reference', 'correlation_id']) if (e[k] !== undefined && (typeof e[k] !== 'string' || !REFERENCE.test(e[k] as string))) p.push(`${k} is a reference`);
  if (!isEventType(e.event_type)) p.push(`event_type is one of ${EVENT_CATALOGUE.map(c => c.type).join(', ')}`);
  else if (!EVENT_CATALOGUE.find(c => c.type === e.event_type)!.versions.includes(e.schema_version as SchemaVersion)) p.push(`schema_version ${String(e.schema_version).slice(0, 10)} is not supported for ${e.event_type} (supported: ${EVENT_CATALOGUE.find(c => c.type === e.event_type)!.versions.join(', ')})`);
  for (const k of ['occurred_at', 'published_at']) if (typeof e[k] !== 'string' || !ISO.test(e[k] as string)) p.push(`${k} is an ISO 8601 UTC time`);
  const l = e.legal_context as Record<string, unknown> | undefined;
  if (!l || typeof l !== 'object' || Array.isArray(l)) p.push('legal_context names the law and its version');
  else {
    for (const k of Object.keys(l)) if (!LEGAL_KEYS.includes(k)) p.push(`Unknown legal_context field ${k.slice(0, 40)}`);
    for (const k of ['instrument_reference', 'version_reference']) if (typeof l[k] !== 'string' || !REFERENCE.test(l[k] as string)) p.push(`legal_context.${k} is a reference`);
    if (l.relationship_reference !== undefined && (typeof l.relationship_reference !== 'string' || !/^[A-Za-z0-9._:@# -]{1,80}$/.test(l.relationship_reference))) p.push('legal_context.relationship_reference is a relationship id and version');
  }
  const i = e.integrity as Record<string, unknown> | undefined;
  if (!i || typeof i !== 'object' || i.alg !== 'ed25519' || typeof i.key_id !== 'string' || typeof i.signature !== 'string') p.push('integrity is { alg: "ed25519", key_id, signature }');
  return p;
}

/** Check the envelope's signature against a public key (and that the key is the one it names). */
export function envelopeSignatureValid(e: EventEnvelope, publicKeyPem: string): boolean {
  if (keyIdOfPem(publicKeyPem) !== e.integrity?.key_id) return false;
  return verifyBytes(publicKeyPem, signedBytes(e), e.integrity.signature);
}

export interface EnvelopeInput {
  type: string; source: string; aggregate: string; occurredAt?: string;
  legal: LegalContext; payloadReference?: string; correlationId?: string; schemaVersion?: SchemaVersion;
}

/** Build and sign an envelope as the source institution (its own key through key custody). */
export async function buildEnvelope(input: EnvelopeInput, now = new Date()): Promise<{ envelope: EventEnvelope; keySource: string; production: boolean } | { error: string }> {
  if (!getMinistry(input.source)) return { error: `${input.source} is not a registered institution` };
  const body: EnvelopeBody = {
    event_id: `fev-${randomUUID()}`, event_type: input.type, schema_version: input.schemaVersion ?? '1.0', source_institution_id: input.source,
    aggregate_reference: input.aggregate, occurred_at: input.occurredAt ?? now.toISOString(), published_at: now.toISOString(), legal_context: { ...input.legal },
    ...(input.payloadReference ? { payload_reference: input.payloadReference } : {}), ...(input.correlationId ? { correlation_id: input.correlationId } : {}),
  };
  const problems = envelopeProblems({ ...body, integrity: { alg: 'ed25519', key_id: 'x', signature: 'x' } });
  if (problems.length) return { error: problems.join('; ') };
  let sig;
  try { sig = await signAsInstitution(input.source, signedBytes(body)); } catch (e) { return { error: (e as Error).message }; }
  return { envelope: { ...body, integrity: { alg: 'ed25519', key_id: sig.keyId, signature: sig.signature } }, keySource: sig.source, production: sig.production };
}
