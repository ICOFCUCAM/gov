import { describe, it, expect } from 'vitest';
import { civicBoard } from './civic-legitimacy';
import { territorialBoard } from './territorial-continuity';
import { civilizationalBoard } from './civilizational-identity';
import { knowledgeBoard } from './knowledge-continuity';
import { geopoliticalBoard } from './geopolitical-continuity';
import { existentialBoard } from './existential-continuity';
import { SAFEGUARD_REGISTRY } from './sovereign-safeguards';

// Cross-engine ethical boundary lock. For every continuity engine that
// declares a safeguard set, the serialized board (excluding its own
// prohibition list) must contain NONE of the structural prohibition slugs
// declared by ANY safeguard set across the entire platform. This makes
// the ethical boundary platform-wide, not per-engine.

const BOARDS = {
  civic: civicBoard,
  ecological: territorialBoard,
  'civic-identity': civilizationalBoard,
  knowledge: knowledgeBoard,
  geopolitical: geopoliticalBoard,
  existential: existentialBoard,
};

describe('cross-engine safeguard sweep', () => {
  it('no engine board leaks any structural prohibition slug from any set', () => {
    const allSlugs = SAFEGUARD_REGISTRY.flatMap(s => s.prohibited as string[]);
    for (const [, fn] of Object.entries(BOARDS)) {
      const { prohibited: _p, prohibitedActionsBlocked: _pa, ...rest } = fn(4000 * 160) as
        { prohibited?: readonly string[]; prohibitedActionsBlocked?: readonly string[] } & Record<string, unknown>;
      void _p; void _pa;
      const json = JSON.stringify(rest);
      for (const slug of allSlugs) {
        if (json.includes(slug)) {
          throw new Error(`Leak: engine board contains prohibited slug "${slug}"`);
        }
      }
    }
  });
});
