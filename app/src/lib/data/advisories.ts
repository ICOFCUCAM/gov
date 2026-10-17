// CivicOS — Update Center security advisories, server-side.
//
// An advisory feed modelled on CSAF 2.0 with VEX statements: each advisory
// has an id, CVSS-style score, affected version range and fixed-in version.
// Every nation sees its own status — affected, not affected, fixed, or
// under investigation — computed from the version it runs, or stated by the
// publisher as a VEX justification for that nation. The publisher commits
// to patch times by severity (PATCH_COMMITMENTS); the console tracks each
// commitment as met, open or breached. Advisories export as CSAF-style JSON.
// Advisory data is a placeholder feed (docs/INTEGRATION_REGISTER.md §12).

import type { AdvisoryExposure, AdvisoryNationStatus, AdvisorySeverity, DistributionRelease, PatchCommitment, SecurityAdvisory, SubscribedNation } from '@/lib/api/types';
import { recordAudit } from './store';
import { compareVersions, gte } from '@/lib/updates/semver';

/** Publisher patch-time commitments: from disclosure to a released fix. */
export const PATCH_COMMITMENTS: Record<AdvisorySeverity, number> = { critical: 72, high: 14 * 24, medium: 30 * 24, low: 90 * 24 };
export const VEX_JUSTIFICATIONS = ['component_not_present', 'vulnerable_code_not_present', 'vulnerable_code_not_in_execute_path', 'vulnerable_code_cannot_be_controlled_by_adversary', 'inline_mitigations_already_exist'] as const;

interface AdvDb { advisories: SecurityAdvisory[]; vex: Record<string, { status: AdvisoryNationStatus; justification: string; by: string; at: string }> }
const DAY = 86_400_000;

function seed(): AdvDb {
  const now = Date.now();
  const at = (d: number) => new Date(now + d * DAY).toISOString();
  return {
    advisories: [
      { id: 'CSA-2026-10', title: 'Verbose error on webhook registration', summary: 'Webhook registration errors echoed internal configuration keys.', severity: 'low', cvss: 3.1, cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:N/A:N', cwe: 'CWE-209', affectedFrom: '1.2.0', affectedBefore: '1.3.0', fixedIn: '1.3.0', status: 'final', publishedAt: at(-200), updatedAt: at(-150) },
      { id: 'CSA-2026-03', title: 'Authorisation bypass in the permit decision API', summary: 'An officer could decide a permit outside their institution through a crafted request.', severity: 'critical', cvss: 9.1, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:N', cwe: 'CWE-639', affectedFrom: '1.3.0', affectedBefore: '1.4.0', fixedIn: '1.4.0', status: 'final', publishedAt: at(-42), updatedAt: at(-40) },
      { id: 'CSA-2026-05', title: 'Stored cross-site scripting in institution names', summary: 'Institution names were rendered without escaping in one directory view.', severity: 'high', cvss: 7.4, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:R/S:C/C:H/I:H/A:N', cwe: 'CWE-79', affectedFrom: '1.4.0', affectedBefore: '1.4.1', fixedIn: '1.4.1', status: 'final', publishedAt: at(-30), updatedAt: at(-5) },
      { id: 'CSA-2026-07', title: 'Session fixation on privilege change', summary: 'Session identifiers were not rotated when an officer’s privileges changed.', severity: 'high', cvss: 8.1, cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H', cwe: 'CWE-384', affectedFrom: '1.3.0', affectedBefore: '1.4.1', fixedIn: '1.4.1', status: 'final', publishedAt: at(-12), updatedAt: at(-5) },
      { id: 'CSA-2026-09', title: 'Audit export may include internal hostnames', summary: 'The audit export can contain internal service hostnames. Under investigation; no exploitation known.', severity: 'medium', cvss: 5.3, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N', cwe: 'CWE-200', affectedFrom: '1.4.0', status: 'interim', publishedAt: at(-20), updatedAt: at(-3) },
    ],
    vex: {},
  };
}
const g = globalThis as unknown as { __civicosAdvisories?: AdvDb };
function adb(): AdvDb { return (g.__civicosAdvisories ??= seed()); }
export function resetAdvisories(): void { g.__civicosAdvisories = seed(); }

export function listAdvisories(): SecurityAdvisory[] {
  return [...adb().advisories].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export function getAdvisory(id: string): SecurityAdvisory | undefined { return adb().advisories.find(a => a.id === id); }

const inRange = (v: string, a: SecurityAdvisory) => gte(v, a.affectedFrom) && (!a.affectedBefore || compareVersions(v, a.affectedBefore) < 0);

/** This nation's status for one advisory: a publisher VEX statement, else computed from the installed version. */
export function statusFor(n: SubscribedNation, a: SecurityAdvisory): { status: AdvisoryNationStatus; justification?: string } {
  const vex = adb().vex[`${a.id}:${n.id}`];
  if (vex) return { status: vex.status, justification: vex.justification };
  const v = n.installedVersion;
  if (a.fixedIn && gte(v, a.fixedIn) && gte(v, a.affectedFrom)) return { status: 'fixed' };
  if (inRange(v, a)) return { status: a.status === 'interim' ? 'under-investigation' : 'affected' };
  return { status: 'not-affected', justification: 'Installed version is outside the affected range' };
}

/** Everything that applies to a nation, with the fix release it can see. */
export function exposure(n: SubscribedNation, visible: DistributionRelease[]): AdvisoryExposure[] {
  const order: Record<AdvisoryNationStatus, number> = { affected: 0, 'under-investigation': 1, fixed: 2, 'not-affected': 3 };
  return listAdvisories().map(a => {
    const s = statusFor(n, a);
    // The earliest active release the nation can see that contains the fix.
    const fix = a.fixedIn ? visible.filter(r => r.status === 'active' && gte(r.version, a.fixedIn!)).sort((x, y) => compareVersions(x.version, y.version))[0] : undefined;
    return { advisory: a, ...s, fixReleaseId: fix?.id };
  }).sort((x, y) => order[x.status] - order[y.status] || y.advisory.cvss - x.advisory.cvss);
}

/** Publisher: record a VEX statement for one nation (e.g. not affected, with justification). */
export function setVex(advisoryId: string, nationId: string, input: { status?: string; justification?: string; by?: string }): { ok: true } | { error: string; status: number } {
  const a = getAdvisory(advisoryId);
  if (!a) return { error: 'Advisory not found', status: 404 };
  const by = (input.by ?? '').trim() || 'Product security';
  if (!['affected', 'not-affected', 'fixed', 'under-investigation'].includes(input.status ?? '')) return { error: 'Status must be affected, not-affected, fixed or under-investigation', status: 422 };
  const justification = (input.justification ?? '').trim();
  if (input.status === 'not-affected' && !(VEX_JUSTIFICATIONS as readonly string[]).includes(justification)) {
    return { error: `A not-affected statement needs a VEX justification: ${VEX_JUSTIFICATIONS.join(', ')}`, status: 422 };
  }
  adb().vex[`${advisoryId}:${nationId}`] = { status: input.status as AdvisoryNationStatus, justification, by, at: new Date().toISOString() };
  recordAudit(by, 'update.advisory.vex', `Advisory:${advisoryId}@${nationId}`, 'ok', `${input.status}${justification ? ` · ${justification}` : ''}`);
  return { ok: true };
}

/** Patch-time commitments: due date from disclosure, met when a fix shipped in time. */
export function commitments(releases: DistributionRelease[], now = Date.now()): PatchCommitment[] {
  return listAdvisories().map(a => {
    const hours = PATCH_COMMITMENTS[a.severity];
    const due = Date.parse(a.publishedAt) + hours * 3600_000;
    const fix = a.fixedIn ? releases.filter(r => r.channel === 'global' && gte(r.version, a.fixedIn!)).sort((x, y) => x.releasedAt.localeCompare(y.releasedAt))[0] : undefined;
    const fixedAt = fix ? Date.parse(fix.releasedAt) : undefined;
    const state: PatchCommitment['state'] = fixedAt !== undefined ? (fixedAt <= due ? 'met' : 'breached') : now > due ? 'breached' : 'open';
    return {
      advisoryId: a.id, severity: a.severity, committedHours: hours, dueAt: new Date(due).toISOString(),
      fixedAt: fixedAt !== undefined ? new Date(fixedAt).toISOString() : undefined, state,
      hoursLeft: state === 'open' ? Math.round((due - now) / 3600_000) : undefined,
    };
  });
}

/** CSAF 2.0-style document for one advisory; with a nation, its VEX product status. */
export function csaf(a: SecurityAdvisory, nation?: SubscribedNation): Record<string, unknown> {
  const pid = (v: string) => `CivicOS-${v}`;
  const s = nation ? statusFor(nation, a) : undefined;
  const vexKey = s ? ({ affected: 'known_affected', 'not-affected': 'known_not_affected', fixed: 'fixed', 'under-investigation': 'under_investigation' } as const)[s.status] : undefined;
  return {
    document: {
      category: 'csaf_security_advisory',
      csaf_version: '2.0',
      title: a.title,
      publisher: { category: 'vendor', name: 'CivicOS release engineering', namespace: 'https://civicos.example' },
      tracking: { id: a.id, status: a.status, version: a.status === 'final' ? '2' : '1', initial_release_date: a.publishedAt, current_release_date: a.updatedAt, revision_history: [{ date: a.publishedAt, number: '1', summary: 'Initial disclosure' }, ...(a.status === 'final' ? [{ date: a.updatedAt, number: '2', summary: `Fixed in ${a.fixedIn}` }] : [])] },
      notes: [{ category: 'summary', text: a.summary }, { category: 'legal_disclaimer', text: 'Placeholder advisory feed for this environment.' }],
    },
    product_tree: {
      branches: [{ category: 'vendor', name: 'CivicOS', branches: [{ category: 'product_name', name: 'CivicOS platform', branches: [
        { category: 'product_version_range', name: `>=${a.affectedFrom}${a.affectedBefore ? ` <${a.affectedBefore}` : ''}`, product: { product_id: pid(`affected-${a.affectedFrom}`), name: `CivicOS ${a.affectedFrom}${a.affectedBefore ? `–${a.affectedBefore}` : '+'}` } },
        ...(a.fixedIn ? [{ category: 'product_version', name: a.fixedIn, product: { product_id: pid(a.fixedIn), name: `CivicOS ${a.fixedIn}` } }] : []),
        ...(nation ? [{ category: 'product_version', name: nation.installedVersion, product: { product_id: pid(`nation-${nation.id}`), name: `CivicOS ${nation.installedVersion} (${nation.name || 'this installation'})` } }] : []),
      ] }] }],
    },
    vulnerabilities: [{
      ids: [{ system_name: 'CivicOS Security Advisory', text: a.id }],
      ...(a.cwe ? { cwe: { id: a.cwe, name: a.cwe } } : {}),
      scores: [{ products: [pid(`affected-${a.affectedFrom}`)], cvss_v3: { version: '3.1', baseScore: a.cvss, baseSeverity: a.severity.toUpperCase(), vectorString: a.cvssVector } }],
      product_status: {
        known_affected: [pid(`affected-${a.affectedFrom}`)],
        ...(a.fixedIn ? { fixed: [pid(a.fixedIn)] } : { under_investigation: [pid(`affected-${a.affectedFrom}`)] }),
        ...(nation && vexKey ? { [vexKey]: [pid(`nation-${nation.id}`)] } : {}),
      },
      ...(nation && s?.status === 'not-affected' && s.justification ? { flags: [{ label: s.justification, product_ids: [pid(`nation-${nation.id}`)] }] } : {}),
      remediations: a.fixedIn ? [{ category: 'vendor_fix', details: `Install ${a.fixedIn} or later from the Update Center.`, product_ids: [pid(`affected-${a.affectedFrom}`)] }] : [{ category: 'none_available', details: 'Under investigation; mitigations will be published.' }],
    }],
  };
}
