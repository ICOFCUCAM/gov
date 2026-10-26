// Federation events emitted from the decisions that cause them (plan I9;
// specification Part 5 F "Event contract"; integration register 24.3, 24.17).
//
// When a case decision is sealed (lib/casework/engine.ts
// registerDecisionListener()), the deciding institution publishes an envelope
// of references only (lib/federation/envelope.ts), signed with its own key,
// for each event type an approved exchange relationship in force lets another
// institution receive from it, and for no other:
//
//   case.status.changed   every sealed decision: the case moved to another stage
//   permit.issued         a decision exercising the power to issue under an approved authority mapping
//   permit.revoked        a decision exercising the power to revoke under an approved authority mapping
//
// The envelope names the case (`Case:<ref>`) as its aggregate and the sealed
// decision (`Decision:<id>`) as what to ask for under authority; its legal
// context is the law version the decision cites (from the laws register) and
// the relationship that covers the type. Nothing about a person and no free
// text goes in. A decision that cites no confirmed law version emits nothing
// and says so in the audit chain; a sample case's envelope is marked sample
// and never reaches another installation's feed. The decision itself never
// waits on or depends on an envelope.

import { registerDecisionListener } from '@/lib/casework/engine';
import { relationshipGrants } from '@/lib/data/store/relationships';
import { recordAudit } from '@/lib/data/store/audit';
import { publishEvent, legalKnown } from './events';
import type { SignedDecision } from '@/lib/records/decisions';
import type { Case } from '@/lib/casework/types';

/** The event types a sealed decision causes. */
export function eventTypesOf(d: SignedDecision): string[] {
  const out = ['case.status.changed'];
  const a = d.content.authority as { basis?: string; power?: string } | undefined;
  if (a?.basis === 'mapping' && a.power === 'issue') out.push('permit.issued');
  if (a?.basis === 'mapping' && a.power === 'revoke') out.push('permit.revoked');
  return out;
}

/** Publish the envelopes a decision causes, where a relationship in force covers each type. */
export async function emitFromDecision(d: SignedDecision, c: Case, now = new Date()): Promise<{ type: string; event?: string; skipped?: string }[]> {
  const source = c.owner;
  const grants = relationshipGrants(now).filter(g => g.type === 'exchange' && g.to === source);
  const out: { type: string; event?: string; skipped?: string }[] = [];
  for (const type of eventTypesOf(d)) {
    const g = grants.find(x => x.recordTypes.includes(`event:${type}`));
    if (!g) continue;
    const cit = (d.content.citations ?? []).find(x => x.instrument && x.version && legalKnown({ instrument_reference: x.instrument, version_reference: x.version }));
    const decider = d.content.officials.find(o => o.role === 'decided')?.name ?? 'system (decision events)';
    if (!cit) {
      out.push({ type, skipped: 'The decision cites no confirmed law version: an envelope carries the legal context, so none is published' });
      recordAudit(decider, 'federation.event.emit', `Decision:${d.id}`, 'denied', `${type} for ${source}: the decision cites no confirmed law version; nothing published`);
      continue;
    }
    const r = await publishEvent({
      type, source, aggregate: `Case:${c.ref}`, occurredAt: d.content.at ?? now.toISOString(),
      legal: { instrument_reference: cit.instrument, version_reference: cit.version!, relationship_reference: `${g.id} v${g.version}` },
      payloadReference: `Decision:${d.id}`, correlationId: c.id,
    }, { by: decider, institution: source }, { ...(c.source === 'sample' ? { sample: true } : {}) }, now);
    if ('error' in r) {
      out.push({ type, skipped: r.error });
      recordAudit(decider, 'federation.event.emit', `Decision:${d.id}`, 'failed', `${type} for ${source}: ${r.error.slice(0, 300)}`);
    } else out.push({ type, event: r.envelope.event_id });
  }
  return out;
}

registerDecisionListener('federation-events', async (d, c, now) => { await emitFromDecision(d, c, now); });
