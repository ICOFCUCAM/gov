// CivicOS Institutional Edition at run time (spec Part 5 D "Standalone
// deployment: one institution first"; Health I4 standalone-and-pilot): what
// the installation runs when the deployment profile records an edition, and
// what it answers for everything outside it.
//
//   - a procedure whose responsible institution is outside the edition opens
//     no case (lib/casework/engine.ts openCase());
//   - an exchange service owned by an institution outside the edition answers
//     "not connected" (lib/exchange/services.ts callService()): never a guess,
//     never a cached or assumed answer, and a form's check through it is
//     recorded as not performed (lib/forms/server.ts);
//   - a step that legally needs another institution's register pauses with
//     the same reason (professional registration with an education-register
//     qualification, lib/professions/register.ts).
//
// Without an edition every institution is connected, as before. The edition
// is recorded in setup or through the change process
// (lib/data/store/sovereign.ts proposeEdition()); none ships. The scope it
// names (institutions, modules, the registers they keep, the procedures they
// run) is read here from the systems that hold each, never stored twice.

import { AUTHORITIES, MODULES, editionOf, inEdition, provisionalOwner, type AuthorityKey, type InstitutionalEdition } from './deployment';
import { authorityFor, getSovereign } from '@/lib/data/store/sovereign';
import { listMinistries } from '@/lib/data/store/ministries';
import { REGISTER_OWNERS, legalOwnerOf } from '@/lib/data/register-owners';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';

/** The edition the installation runs as now, if one is recorded. */
export const currentEdition = (): InstitutionalEdition | undefined => editionOf(getSovereign().deployment);

const nameOf = (id: string | undefined) => (id ? listMinistries().find(m => m.id === id)?.name ?? id : undefined);
const slotLabel = (k: AuthorityKey) => AUTHORITIES.find(a => a.key === k)?.label ?? k;

/** Why work for this institution cannot be done here, or null (no edition, or the institution is part of it). */
export function editionRefusal(institution: string | undefined): string | null {
  const p = getSovereign().deployment;
  const e = editionOf(p);
  if (!e || inEdition(p, institution)) return null;
  return `Not connected: this installation runs as the Institutional Edition "${e.label}"; ${nameOf(institution) ?? 'the responsible institution'} is not part of it. Its work is done in its own installation, reached only through an approved exchange.`;
}

/**
 * Whether a register or service held for a slot is reachable here: null when
 * it is (no edition, or the slot's institution, or its provisional stand-in,
 * is part of the edition); otherwise the "not connected" reason.
 */
export function slotConnection(slot: AuthorityKey): string | null {
  const p = getSovereign().deployment;
  const e = editionOf(p);
  if (!e) return null;
  const owner = provisionalOwner(slot, authorityFor);
  if (owner.institution && inEdition(p, owner.institution)) return null;
  return `Not connected: ${slotLabel(slot)}${owner.institution ? ` (${nameOf(owner.institution)})` : ''} is not part of this installation's Institutional Edition "${e.label}". The check was not performed.`;
}

export interface EditionScope {
  edition: InstitutionalEdition | null;
  institutions: { id: string; name: string; slots: AuthorityKey[] }[];
  modules: { key: string; label: string; runs: boolean }[];
  /** Registers whose legal owner is an institution of the edition. */
  registers: { id: string; name: string; slot: AuthorityKey; institution: string }[];
  /** Procedures (any version) whose responsible institution is part of the edition. */
  procedures: { key: string; title: string; version: number; state: string; institution: string }[];
  /** Responsibilities the nation named for an institution outside the edition: not connected here. */
  notConnected: { slot: AuthorityKey; label: string; institution: string; name: string }[];
}

/** What the edition names, read from the deployment profile, the register owners and the procedures. */
export function editionScope(): EditionScope {
  const p = getSovereign().deployment;
  const e = editionOf(p) ?? null;
  const ids = e ? e.institutions : listMinistries().filter(m => m.status === 'active').map(m => m.id);
  const named = AUTHORITIES.map(a => ({ slot: a.key, institution: authorityFor(a.key) })).filter((x): x is { slot: AuthorityKey; institution: string } => !!x.institution);
  const institutions = ids.map(id => ({ id, name: nameOf(id) ?? id, slots: named.filter(n => n.institution === id).map(n => n.slot) }));
  const modules = MODULES.map(m => ({ key: m.key, label: m.label, runs: e ? e.modules.includes(m.key) && ids.includes(authorityFor(m.authority) ?? '') : true }));
  const registers = REGISTER_OWNERS.flatMap(r => {
    const legal = legalOwnerOf(r);
    if (legal.kind !== 'authority') return [];
    const inst = provisionalOwner(legal.key, authorityFor).institution;
    return inst && ids.includes(inst) ? [{ id: r.id, name: r.name, slot: legal.key, institution: inst }] : [];
  });
  const procedures = listPackages().flatMap(pk => {
    const inst = ownerInstitution(pk.owner, authorityFor);
    return inst && ids.includes(inst) ? [{ key: pk.key, title: pk.title, version: pk.version, state: pk.state, institution: inst }] : [];
  });
  const notConnected = e ? named.filter(n => !ids.includes(n.institution)).map(n => ({ slot: n.slot, label: slotLabel(n.slot), institution: n.institution, name: nameOf(n.institution) ?? n.institution })) : [];
  return { edition: e, institutions, modules, registers, procedures, notConnected };
}
