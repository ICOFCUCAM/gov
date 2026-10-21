// How the laws relate (/gov/law/relations): the relations recorded in the
// laws register (lib/law/register.ts relate()) as rows read both ways, so a
// law shows what it amends, repeals or implements and also what amends,
// repeals or implements it. Pure; no store access (usable on screens).

import type { RelationKind } from './register';

export const RELATION_LABEL: Record<RelationKind, { forward: string; inverse: string }> = {
  amends: { forward: 'amends', inverse: 'is amended by' },
  repeals: { forward: 'repeals', inverse: 'is repealed by' },
  replaces: { forward: 'replaces', inverse: 'is replaced by' },
  implements: { forward: 'implements', inverse: 'is implemented by' },
  cites: { forward: 'cites', inverse: 'is cited by' },
  'depends-on': { forward: 'depends on', inverse: 'is depended on by' },
};

export interface RelatedInstrument { id: string; title: string; relations: { kind: RelationKind; target: string; at?: string; by: string }[] }
export interface RelationRow { from: string; fromTitle: string; kind: RelationKind; to: string; toTitle: string; at?: string; by: string }

/** Every recorded relation, from the instrument that states it, oldest record first per instrument. */
export function relationRows(list: RelatedInstrument[]): RelationRow[] {
  const title = new Map(list.map(i => [i.id, i.title]));
  return list.flatMap(i => (i.relations ?? []).map(r => ({ from: i.id, fromTitle: i.title, kind: r.kind, to: r.target, toTitle: title.get(r.target) ?? r.target, ...(r.at ? { at: r.at } : {}), by: r.by })));
}

/** One instrument's relations read both ways: what it does to others, and what others do to it. */
export function relationsOf(id: string, rows: RelationRow[]): { phrase: string; other: string; otherTitle: string; at?: string; by: string }[] {
  const out: { phrase: string; other: string; otherTitle: string; at?: string; by: string }[] = [];
  for (const r of rows) {
    if (r.from === id) out.push({ phrase: RELATION_LABEL[r.kind].forward, other: r.to, otherTitle: r.toTitle, ...(r.at ? { at: r.at } : {}), by: r.by });
    else if (r.to === id) out.push({ phrase: RELATION_LABEL[r.kind].inverse, other: r.from, otherTitle: r.fromTitle, ...(r.at ? { at: r.at } : {}), by: r.by });
  }
  return out;
}
