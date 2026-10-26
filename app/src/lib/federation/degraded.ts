// Declared degraded states (plan I9; specification Part 5 B "a disconnected
// or partially connected installation with explicitly degraded
// capabilities", D "What must remain functional offline", E "Unavailable
// services must produce explicit pending, failed or unavailable states", L
// test 13; acceptance P5-13).
//
// One list, computed from the facts each time, never stored: every exchange
// service and every dependency the kernel can run without, each with its
// state now and what the platform does while it is not available. The
// behaviour is the code's own, named here with the file that enforces it:
// a check that cannot be made is answered "not connected" or "unable to
// verify" and a case step that needs it is held (never refused, never
// treated as passed); no message is said to be sent while no provider is;
// nothing is signed with a development key in production; no payment is
// marked paid without a provider. This page claims nothing it cannot read.

import { SERVICES } from '@/lib/exchange/services';
import { slotConnection } from '@/lib/nation/edition';
import { authorityFor, getSovereign } from '@/lib/data/store';
import { keyCustodyStatus } from '@/lib/keys/custody';
import { connection } from '@/lib/messaging/providers';
import { INSTALLED_NATION } from '@/lib/messaging/outbox';
import { installationMode, samplesAllowed } from '@/lib/ops/mode';
import { relationshipGrants } from '@/lib/data/store/relationships';
import { AUTHORITIES, type AuthorityKey } from '@/lib/nation/deployment';

const slotLabel = (k: AuthorityKey) => AUTHORITIES.find(a => a.key === k)?.label ?? k;

export type DeclaredState = 'available' | 'degraded' | 'unavailable' | 'not-configured';
export interface DeclaredCapability {
  key: string;
  label: string;
  kind: 'exchange-service' | 'dependency';
  state: DeclaredState;
  /** Why it is in that state, read from the facts. */
  why: string;
  /** What the platform does while it is not available (the same text whatever the state, so it is declared in advance). */
  whileUnavailable: string;
  /** What keeps working regardless. */
  continues: string;
  /** The file that enforces the behaviour. */
  enforcedIn: string;
}

const HELD = 'A case step that needs this check is held with the reason, never refused and never treated as passed; the answer says "not connected" or "unable to verify", never a negative result';

/** Every capability's declared state now. */
export function declaredStates(now = new Date()): DeclaredCapability[] {
  const out: DeclaredCapability[] = [];
  const grants = relationshipGrants(now).filter(g => g.type === 'exchange');
  for (const s of SERVICES.filter(x => x.kind === 'query')) {
    const owner = authorityFor(s.owner);
    const notConnected = slotConnection(s.owner);
    const bound = owner ? grants.filter(g => g.to === owner && g.recordTypes.includes(s.id)).length : 0;
    const state: DeclaredState = notConnected ? 'unavailable' : !owner ? 'not-configured' : 'available';
    out.push({
      key: `service:${s.id}`, label: s.title, kind: 'exchange-service', state,
      why: notConnected ? notConnected : !owner ? `No institution is named for ${slotLabel(s.owner)}: the service cannot answer` : `${slotLabel(s.owner)} is named; ${bound} approved exchange relationship(s) in force let other institutions call it`,
      whileUnavailable: HELD,
      continues: 'The institution\'s own cases, registers, documents and audit; calls between two institutions answer only under an approved exchange relationship in force',
      enforcedIn: 'app/src/lib/exchange/services.ts callService(); app/src/lib/federation/binding.ts',
    });
  }
  const keys = keyCustodyStatus();
  const devInProd = keys.developmentInProduction ?? [];
  out.push({
    key: 'dependency:key-custody', label: 'Key custody (signing and sealing keys)', kind: 'dependency',
    state: !keys.ready ? 'unavailable' : devInProd.length ? 'degraded' : 'available',
    why: !keys.ready ? `The key provider (${keys.provider}) is not ready${keys.error ? `: ${keys.error}` : ''}` : devInProd.length ? `No production key for ${devInProd.join(', ')}: those uses are refused` : `Provider ${keys.provider}; every signing purpose has a key`,
    whileUnavailable: 'Nothing is signed or sealed with a development key in a production installation: the use is refused with the reason (receipts, decisions, tokens, federation envelopes)',
    continues: 'Reading records and preparing cases; audit entries are written and their heads signed once a key is available',
    enforcedIn: 'app/src/lib/keys/custody.ts developmentKeyRefusal(); app/src/lib/federation/keys.ts institutionKeyRefusal()',
  });
  for (const channel of ['email', 'sms'] as const) {
    const c = connection(INSTALLED_NATION, channel);
    out.push({
      key: `dependency:messaging-${channel}`, label: `Messages by ${channel === 'email' ? 'email' : 'text message'}`, kind: 'dependency',
      state: c === 'connected' ? 'available' : 'not-configured',
      why: c === 'connected' ? 'An enabled provider can send' : 'No provider is enabled for this channel',
      whileUnavailable: 'Messages stay queued and the outbox says "not connected"; nothing is said to be sent',
      continues: 'Notices are recorded on the case; in-app notifications',
      enforcedIn: 'app/src/lib/messaging/deliver.ts; app/src/lib/messaging/outbox.ts',
    });
  }
  out.push({
    key: 'dependency:payments', label: 'Payment provider', kind: 'dependency', state: samplesAllowed() ? 'degraded' : 'not-configured',
    why: samplesAllowed() ? `A ${installationMode()} installation records simulated payments, marked as samples` : 'No payment provider is connected to this installation',
    whileUnavailable: 'A bill is never marked paid here: payments are recorded from the provider or bank; a step that waits for payment stays waiting',
    continues: 'Bills are issued with their domain reference; receipts are reconciled once each when they arrive',
    enforcedIn: 'app/src/lib/data/store/payments.ts payBill()',
  });
  const ai = getSovereign().aiAssistant;
  out.push({
    key: 'dependency:ai-assistant', label: 'AI assistant (optional)', kind: 'dependency', state: ai ? 'available' : 'not-configured',
    why: ai ? 'The nation chose the assistant in setup' : 'Off: the nation has not chosen it',
    whileUnavailable: 'Panels use their rule-based advisories and say "Advisory"; AI never makes a legally material decision in any state',
    continues: 'Every procedure, decision and record',
    enforcedIn: 'app/src/app/api/ai/advisory/route.ts; app/src/lib/nation/registry.ts aiLabel()',
  });
  return out;
}
