// The case engine's decision guard for transitions (plan phase 6): checked
// when a decision is proposed and again when it is made, beside the permit
// authority guard (lib/permits/decisions.ts). A caretaker restriction the
// nation adopted, or a court's ruling in force that a cited provision is
// invalid or suspended, refuses the decision (./restrictions.ts).
import { registerDecisionGuard, type DecisionGuard, type DecisionAuthority } from '@/lib/casework/engine';
import { caretakerRefusal, judicialRefusal } from './restrictions';

const guard: DecisionGuard = (c, a, pkg, now, citations) => {
  const caretaker = caretakerRefusal({ institution: c.owner, procedure: pkg.key, ...(a.decision ? { decision: a.decision } : {}) }, now);
  if (caretaker) return { error: caretaker };
  const ruling = judicialRefusal(citations ?? [], now);
  if (ruling) return { error: ruling };
  const none: { authority?: DecisionAuthority } = {};
  return none;
};
registerDecisionGuard('transitions', guard);
