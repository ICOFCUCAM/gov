// A library contract's link to the procedure that carries it (owner's
// direction of 21 October 2026, health integration §2): one of `missing`,
// `draft`, `under_review` or `approved`. Computed on every read from the
// package register (lib/casework/packages.ts); never stored, never a status
// field, never set through an API. A form whose required procedure is
// `missing` cannot pass its go-live gate (lib/forms/publication.ts, gate
// "procedure-link").
//
//   approved      an approved version in the register carries the contract
//                 (its form names the contract's identity)
//   under_review  a draft version carries it and passes its structure check
//                 and its own tests: it waits for a second official
//   draft         a draft version carries it but is not ready; or the
//                 reference procedure the contract names is in the register
//                 and no version carries the contract yet (adopting it is a
//                 new version a second official approves)
//   missing       no version in the register carries it and the procedure it
//                 names (if any) is not in the register: no procedure exists
//
// A form answered by an exchange service and the public check (deviation
// `no-case`, e.g. a register verification) requires no procedure; it requires
// its exchange service, which the same gate checks against the service
// directory the caller passes.

import { checkPackage, listPackages, runPackageTests } from '@/lib/casework/packages';
import type { CasePackage } from '@/lib/casework/types';
import { identityOfForm, parseFormIdentity, sameForm } from './identity';

export type ProcedureLinkState = 'missing' | 'draft' | 'under_review' | 'approved';
export const LINK_LABEL: Record<ProcedureLinkState, string> = { missing: 'missing', draft: 'draft', under_review: 'under review', approved: 'approved' };

export interface ProcedureLinkView {
  state: ProcedureLinkState;
  /** Whether the form needs a procedure to go live (false for a form answered by an exchange service and the public check). */
  required: boolean;
  /** The version that carries the contract (the furthest along), where one does. */
  carriedBy?: { key: string; version: number; state: CasePackage['state'] };
  /** The reference procedure the contract names, where it does, and whether the register holds a version of it. */
  linked?: { key: string; inRegister: boolean };
  /** For a form answered by an exchange service: the service and whether it exists. */
  exchange?: { id: string | null; exists: boolean };
  /** In plain words. */
  detail: string;
}

/** What procedureLink() reads of a library form. */
export interface LinkSubject {
  /** Its identity (lib/forms/identity.ts). */
  identity?: string;
  /** The procedure it names; `carried` when that procedure carries it as shipped (the specification's forms attached to reference procedures). */
  procedure?: { key: string; carried?: boolean } | null;
  exchange?: string;
  deviations?: { id?: string }[];
}

const ready = (p: CasePackage): boolean => !checkPackage(p, p.actions.flatMap(a => a.effects ?? [])) && runPackageTests(p).ok;
const rank = (p: CasePackage): number => (p.state === 'approved' ? 3 : p.state === 'draft' ? (ready(p) ? 2 : 1) : 0);
const stateOf = (p: CasePackage): ProcedureLinkState => (p.state === 'approved' ? 'approved' : p.state === 'draft' ? (ready(p) ? 'under_review' : 'draft') : 'missing');

/** The link state of one library form, from the package register as it stands. */
export function procedureLink(f: LinkSubject, opts: { services?: string[]; packages?: CasePackage[] } = {}): ProcedureLinkView {
  const packages = opts.packages ?? listPackages();
  const noCase = (f.deviations ?? []).some(d => d.id === 'no-case');
  const want = f.identity ? parseFormIdentity(f.identity) : null;
  // Versions that carry the contract: their form names its identity; a specification form shipped attached is carried by its procedure.
  const carriers = packages.filter(p => (want && sameForm(identityOfForm(p.form), want)) || (f.procedure?.carried && p.key === f.procedure.key))
    .filter(p => p.state !== 'superseded').sort((a, b) => rank(b) - rank(a) || b.version - a.version);
  // An internal-administration (adm.*), local-government (lg.*, plan I7) or procurement template (proc.*, plan I5) is in the register once any institution has
  // adopted it as its own (adm.<template>.<institution>, lg.<template>.<local government>, proc.<template>.<institution>).
  // I9: the cross-institution workflow templates (xi.<template>.<institution>) are adopted the same way.
  const adopted = (k: string, p: CasePackage) => p.key === k || (/^(adm|lg|proc|xi)\./.test(k) && p.key.startsWith(`${k}.`));
  const linked = f.procedure ? { key: f.procedure.key, inRegister: packages.some(p => adopted(f.procedure!.key, p)) } : undefined;
  const exchange = noCase || (!f.procedure && f.exchange) ? { id: f.exchange ?? null, exists: !!f.exchange && (opts.services ?? []).includes(f.exchange) } : undefined;
  const top = carriers[0];
  if (top) {
    const state = stateOf(top);
    const detail = state === 'approved' ? `${top.key} version ${top.version} carries it, approved by a second official`
      : state === 'under_review' ? `${top.key} version ${top.version} carries it as a draft whose checks and tests pass: it waits for a second official's approval`
      : `${top.key} version ${top.version} carries it as a draft that is not ready for approval (its structure or tests do not pass yet)`;
    return { state, required: !noCase, carriedBy: { key: top.key, version: top.version, state: top.state }, ...(linked ? { linked } : {}), ...(exchange ? { exchange } : {}), detail };
  }
  if (linked?.inRegister) {
    return { state: 'draft', required: !noCase, linked, ...(exchange ? { exchange } : {}), detail: `The procedure it names (${linked.key}) is in the register, but no version of it carries this contract yet: the nation adopts it in a new version a second official approves` };
  }
  const why = noCase
    ? `No procedure is required: it is answered by ${exchange?.id ? `the exchange service ${exchange.id}${exchange.exists ? '' : ', which does not exist yet'}` : 'an exchange service that does not exist yet'} and the public check`
    : linked ? `The procedure it names (${linked.key}) is not in this installation's register, and no other procedure carries it` : 'No procedure in the register carries it, and none exists for it yet';
  return { state: 'missing', required: !noCase, ...(linked ? { linked } : {}), ...(exchange ? { exchange } : {}), detail: why };
}

/** The link state of a procedure version's own form: the version itself carries it. */
export function packageLink(p: CasePackage): ProcedureLinkView {
  const state = p.state === 'superseded' ? 'approved' : stateOf(p);
  return { state, required: true, carriedBy: { key: p.key, version: p.version, state: p.state }, detail: `This procedure version carries the form (${p.state})` };
}
