// The shared workspace shell (docs/CONSTITUTIONAL_ARCHITECTURE.md §6, §6.6;
// plan phase 4; audit F): the same panels for every official, filled from
// the official's own office and institution. Read from the systems that hold
// each fact, never a copy, and within what lib/auth/roles.ts lets the
// official read: no other institution's restricted records, no personal data
// (the panels carry counts, titles and configuration). "My work" comes from
// GET /api/work, which applies the same rules to cases and queues.
//
//   My authority        office(s) held, institution, standing, role, independence, what it does not grant
//   Awaiting my action  changes waiting for a second official that this official may confirm
//   Institution status  the institution's queue and incidents (its own officials, or whole government where it reaches)
//   Legal changes       laws confirmed recently, the institution's scheduled terms, office changes
//   Oversight           separation-of-powers checks not held (configuration facts)
//   Exceptions          what blocks work: no one who can sign, unnamed responsibilities, second step missing

import { getMinistry, listMinistries, termsOf, scheduledTerms, standingLabel, queueFor, incidentsFor, waitingInstitutionTerms, authorityFor } from '@/lib/data/store';
import { roleOf, roleLabel, reaches, canReadInstitution, secondStepMissing, isIndependent, isJudicial, type Scope } from '@/lib/auth/roles';
import { hasOwnSigners } from '@/lib/auth/officials';
import { waitingAccountChanges } from '@/lib/auth/account-changes';
import { listInstruments } from '@/lib/law/register';
import { REQUIRED_AUTHORITIES } from '@/lib/nation/deployment';
import { officesHeldBy, waitingOffices, waitingHoldings, getOffice, officeKindLabel, listOffices } from '@/lib/nation/office-register';
import { separationFacts } from '@/lib/nation/separation-facts';
import { separationChecks } from '@/lib/gov/separation';

export interface WorkspaceOfficial extends Scope { sub: string; name: string; office?: string }
export interface Item { what: string; detail?: string; href: string; at?: string }

export interface Workspace {
  authority: {
    signedIn: boolean;
    name?: string;
    role?: string;
    office?: string;
    institution: { id: string; name: string; standing: string; branch?: string; independent: boolean; court: boolean } | null;
    offices: { id: string; title: string; kind: string; acting?: boolean; from: string; to?: string; powers: string[] }[];
    /** Delegations are not yet recorded on this installation (plan phase 6). */
    delegations: [];
    restrictions: string[];
  };
  awaiting: Item[];
  institutionStatus: { label: string; value: string; href: string }[];
  legalChanges: Item[];
  oversight: Item[];
  exceptions: Item[];
}

const days = (n: number, now: Date) => new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);

export function workspaceFor(o: WorkspaceOfficial | null, now = new Date()): Workspace {
  const role = o ? roleOf(o) : undefined;
  const inst = o?.institution ? getMinistry(o.institution) : undefined;
  const terms = inst ? termsOf(inst, now) : undefined;
  const accountId = o?.sub.startsWith('local:') ? o.sub.slice('local:'.length) : undefined;
  // What the rules let this official reach: their institution, or every institution whole government reaches.
  const mine = (id: string | undefined) => !!id && (!o || reaches(o, id));

  // ── My authority ─────────────────────────────────────────────────────────
  const offices = accountId ? officesHeldBy(accountId, now).map(h => ({ ...h, powers: getOffice(h.id, now)?.powers ?? [] })) : [];
  const restrictions: string[] = [];
  if (offices.length) restrictions.push('Holding an office grants no permission by itself: what you may do comes from your role and institution');
  if (role === 'administrator') restrictions.push('Administrators manage accounts and setup; deciding a case needs an official who can sign at the institution responsible');
  if (role === 'auditor') restrictions.push('Auditors read and change nothing; courts\' cases stay closed to them');
  if (o && !o.institution) {
    const n = o.bounds?.independent.length ?? 0;
    restrictions.push(n ? `Serving the whole government stops at ${n} independent institution${n === 1 ? '' : 's'}: their records are their own` : 'Serving the whole government: no institution is recorded as independent yet');
  }
  if (o && inst && isIndependent(o, inst.id)) restrictions.push(`${inst.name} is independent: the government does not instruct it, and its accounts are changed by its own administrators`);
  if (o && inst && isJudicial(o, inst.id)) restrictions.push('Court records are closed to every other institution');

  // ── Awaiting my action ───────────────────────────────────────────────────
  const awaiting: Item[] = [];
  const canConfirm = role === 'administrator' || role === 'signatory' || !o;
  if (canConfirm) {
    for (const w of waitingOffices()) {
      if ((w.institution ? mine(w.institution) : !o?.institution) && w.pending.byId !== o?.sub) {
        awaiting.push({ what: `Office: ${w.title} — a change waiting for a second official`, detail: `Proposed by ${w.pending.by}`, href: '/gov/configuration/offices', at: w.pending.at });
      }
    }
    for (const h of waitingHoldings()) {
      const office = getOffice(h.officeId, now);
      if ((office?.institution ? mine(office.institution) : !o?.institution) && h.proposedById !== o?.sub && h.accountId !== accountId) {
        awaiting.push({ what: `${h.holderName} as ${office?.title ?? h.officeId} — waiting for a second official`, detail: `Linked by ${h.proposedBy}`, href: '/gov/configuration/offices', at: h.proposedAt });
      }
    }
    for (const t of waitingInstitutionTerms()) {
      if (mine(t.id) && t.pending.byId !== o?.sub) awaiting.push({ what: `${t.name}: a change to its standing waiting for confirmation`, detail: `Proposed by ${t.pending.by}`, href: '/ministries', at: t.pending.at });
    }
    for (const c of waitingAccountChanges(now.getTime())) {
      if (o?.institution && c.confirmFrom.includes(o.institution) && !c.confirmations.some(x => x.institution === o.institution)) {
        awaiting.push({ what: c.summary, detail: `Waiting for ${inst?.name ?? o.institution} to confirm`, href: '/admin/officials', at: c.at });
      }
    }
  }
  awaiting.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));

  // ── Institution status ───────────────────────────────────────────────────
  const institutionStatus: Workspace['institutionStatus'] = [];
  if (inst && (!o || canReadInstitution(o, inst.id) === null)) {
    const q = queueFor(inst.id), inc = incidentsFor(inst.id);
    const open = 'error' in q ? [] : q.items.filter(i => i.state !== 'cleared');
    institutionStatus.push(
      { label: 'Status', value: inst.status === 'active' ? 'Active' : inst.status, href: `/gov/ministry/${encodeURIComponent(inst.id)}` },
      { label: 'Open in the queue', value: String(open.length), href: `/gov/ministry/${encodeURIComponent(inst.id)}` },
      { label: 'Past their deadline', value: 'error' in q ? '—' : String(open.filter(i => i.ageHours > q.slaHours).length), href: '/gov/work' },
      { label: 'Active incidents', value: 'error' in inc ? '—' : String(inc.incidents.filter(i => i.active).length), href: `/gov/ministry/${encodeURIComponent(inst.id)}` },
      { label: 'Officials who can sign', value: hasOwnSigners(inst.id) ? 'Yes' : 'None', href: '/admin/officials' },
    );
  } else if (!inst) {
    const active = listMinistries().filter(m => m.status === 'active');
    const independent = o?.bounds?.independent.length ?? 0;
    institutionStatus.push(
      { label: 'Institutions active', value: String(active.length), href: '/ministries' },
      { label: 'Recorded as independent', value: String(independent), href: '/ministries' },
      { label: 'Within your reach', value: String(active.filter(m => !o || reaches(o, m.id)).length), href: '/gov/work' },
    );
  }

  // ── Legal changes ────────────────────────────────────────────────────────
  const legalChanges: Item[] = [];
  const since = days(90, now);
  const versions = listInstruments({ state: 'confirmed' }).flatMap(i => i.versions.filter(v => v.state === 'confirmed' && (v.dates.inForce >= since || (v.confirmedAt ?? '') >= since))
    .map(v => ({ what: `${i.title}`, detail: `In force ${v.dates.inForce}${i.sample ? ' · sample' : ''}`, href: '/gov/law', at: v.confirmedAt ?? v.at })));
  legalChanges.push(...versions.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 6));
  if (inst && mine(inst.id)) {
    for (const s of scheduledTerms(inst, now)) legalChanges.push({ what: `${inst.name}: new constitutional terms`, detail: `${standingLabel(s.values.standing)} from ${s.values.effectiveFrom}`, href: '/ministries', at: s.confirmed?.at });
  }
  for (const off of listOffices(now)) {
    if (off.derived || off.status !== 'scheduled' || (off.institution ? !mine(off.institution) : !!o?.institution)) continue;
    legalChanges.push({ what: `Office: ${off.title}`, detail: `Applies from ${off.effectiveFrom}`, href: '/gov/configuration/offices' });
  }

  // ── Oversight ────────────────────────────────────────────────────────────
  const oversight: Item[] = [];
  try {
    const sep = separationChecks(separationFacts(now));
    for (const c of sep.checks.filter(x => !x.ok)) {
      // An institution's officials see the checks about the whole configuration, never another body's records.
      oversight.push({ what: c.label, detail: c.detail, href: c.href });
    }
    if (!oversight.length) oversight.push({ what: 'Separation of powers: every check held', detail: `${sep.checks.length} checks observed from the configuration`, href: '/command' });
  } catch { oversight.push({ what: 'Separation checks could not be read', href: '/gov/branches' }); }

  // ── Exceptions ───────────────────────────────────────────────────────────
  const exceptions: Item[] = [];
  const missingStep = o ? secondStepMissing(o) : null;
  if (missingStep) exceptions.push({ what: 'Changes are blocked until you use the second sign-in step', detail: missingStep, href: '/gov/me' });
  if (inst && !hasOwnSigners(inst.id)) exceptions.push({ what: `${inst.name} has no official who can sign`, detail: 'Decisions there wait until one is appointed', href: '/admin/officials' });
  const unnamed = REQUIRED_AUTHORITIES.filter(a => !authorityFor(a.key));
  if (unnamed.length && (!o || !o.institution || role === 'administrator')) {
    exceptions.push({ what: `${unnamed.length} responsibilit${unnamed.length === 1 ? 'y' : 'ies'} not named`, detail: `Cases and registers refuse work until named: ${unnamed.slice(0, 4).map(a => a.label).join(', ')}${unnamed.length > 4 ? ', …' : ''}`, href: '/gov/configuration/responsible' });
  }
  if (inst && terms && terms.standing !== 'executive-ministry' && !terms.basis?.length && !inst.basis?.length) {
    exceptions.push({ what: `${inst.name}: no establishing law cited`, detail: 'Its standing rests on no laws-register citation yet', href: '/ministries' });
  }

  return {
    authority: {
      signedIn: !!o,
      ...(o ? { name: o.name, role: roleLabel(role!), ...(o.office ? { office: o.office } : {}) } : {}),
      institution: inst && terms ? {
        id: inst.id, name: inst.name, standing: standingLabel(terms.standing), ...(terms.branch ? { branch: terms.branch } : {}),
        independent: !!o && isIndependent(o, inst.id), court: !!o && isJudicial(o, inst.id),
      } : null,
      offices: offices.map(x => ({ id: x.id, title: x.title, kind: officeKindLabel(x.kind), ...(x.acting ? { acting: true } : {}), from: x.from, ...(x.to ? { to: x.to } : {}), powers: x.powers })),
      delegations: [],
      restrictions,
    },
    awaiting, institutionStatus, legalChanges, oversight, exceptions,
  };
}
