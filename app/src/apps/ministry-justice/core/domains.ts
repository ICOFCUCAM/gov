// apps/ministry-justice/core — Justice domain catalog.
//
// Single source of truth for the Ministry of Justice operating system:
// sovereign domain taxonomy with per-domain identity (numeral, accent,
// archetype) and migration-safe route key. Pure data — no React.
// The blueprint sections this ministry implements live in
// `lib/institution/charters/registry.ts`.

import type { JusticeArchetype } from '@/apps/ministry-justice/design-system/justice-ds';

export type JusticeGroupKey =
  | 'chamber'             // constitutional review
  | 'bench'               // judicial operations
  | 'docket'              // case management
  | 'records'             // archives & evidence
  | 'forensic'            // labs
  | 'rights'              // rights protection
  | 'corrections'         // detention & rehabilitation
  | 'portal'              // citizen-facing
  | 'continuity';         // foresight & cascade

export interface JusticeGroup {
  key: JusticeGroupKey;
  label: string;
  purpose: string;
}

export const JUSTICE_GROUPS: JusticeGroup[] = [
  { key: 'chamber', label: 'Constitutional Chamber', purpose: 'Constitutional review · separation of powers · emergency-powers oversight' },
  { key: 'bench', label: 'Judicial Bench', purpose: 'Court tier roster · scheduling · judicial conduct' },
  { key: 'docket', label: 'Case Docket', purpose: 'Filing intake · pipeline · notices · case lifecycle' },
  { key: 'records', label: 'Legal Records', purpose: 'Sovereign archives · chain-of-custody · evidence vault' },
  { key: 'forensic', label: 'Forensic Coordination', purpose: 'Laboratories · evidence corpus · authentication' },
  { key: 'rights', label: 'Rights & Oversight', purpose: 'Bill of rights monitoring · administrative legality · petitions' },
  { key: 'corrections', label: 'Corrections', purpose: 'Detention · rehabilitation · probation' },
  { key: 'portal', label: 'Public Justice Portal', purpose: 'Petitioner access · counsel registration · public docket' },
  { key: 'continuity', label: 'Judicial Continuity', purpose: 'Cross-ministry cascade · 20-year forecast · crisis chronology' },
];

export type SurfaceId =
  // chamber
  | 'constitutional-review'      // §  I — articles register + posture
  | 'separation-of-powers'       // §  II — branch independence
  | 'emergency-powers'           // §  III — Art V emergency invocations
  | 'sovereignty-defence'        // §  IV — sovereignty-protection
  // bench
  | 'judicial-operations'        // ⚖  I — court tier roster
  | 'supreme-court-bench'        // ⚖  II — supreme court live matters
  | 'appellate-routing'          // ⚖  III — appellate routing map
  | 'judicial-statistics'        // ⚖  IV — caseload throughput
  | 'judicial-conduct'           // ⚖  V — discipline & recusals
  // docket
  | 'civil-docket'               // ¶  I — civil case docket
  | 'criminal-docket'            // ¶  II — criminal case docket
  | 'family-docket'              // ¶  III — family case docket
  | 'commercial-docket'          // ¶  IV — commercial case docket
  | 'administrative-docket'      // ¶  V — administrative review docket
  | 'case-scheduling'            // ¶  VI — auto-scheduling + deadlines
  // records & forensic
  | 'legal-records'              // ✠  I — sovereign archives
  | 'evidence-vault'             // ✠  II — cryptographic evidence integrity
  | 'forensic-evidence'          // ⚗  I — forensic labs
  | 'authentication-queue'       // ⚗  II — evidence authentication queue
  | 'judicial-signatures'        // ✠  III — HSM-backed signature registry
  // rights
  | 'rights-administrative'      // ☩  I — bill of rights monitoring
  | 'rights-petitions'           // ☩  II — constitutional rights petitions
  | 'public-docket-redacted'     // ☩  III — public docket with redaction
  | 'legal-aid'                  // ☩  IV — legal aid intake
  // corrections
  | 'corrections-administration' // ◇  I — facility administration
  | 'probation-registry'         // ◇  II — probation register
  // portal
  | 'justice-portal'             // ◊  I — petitioner & counsel portal
  | 'attorney-registry'          // ◊  II — attorney admissions & discipline
  // continuity
  | 'justice-foresight'          // ⏳ I — 20-year trajectory + cascade
  | 'continuity-cascade';        // ⏳ II — cross-ministry cascade map

export interface JusticeDomain {
  surface: SurfaceId;
  group: JusticeGroupKey;
  numeral: string;
  label: string;
  purpose: string;
  archetype: JusticeArchetype;
  accent?: string;
}

export const JUSTICE_DOMAINS: JusticeDomain[] = [
  // chamber
  { surface: 'constitutional-review', group: 'chamber', numeral: '§ I', label: 'Constitutional Review Chamber', purpose: 'Article register & sovereign posture', archetype: 'chamber' },
  { surface: 'separation-of-powers', group: 'chamber', numeral: '§ II', label: 'Separation of Powers', purpose: 'Branch-independence index & breaches', archetype: 'chamber' },
  { surface: 'emergency-powers', group: 'chamber', numeral: '§ III', label: 'Emergency Powers Watch', purpose: 'Article V invocations & sunset clauses', archetype: 'chamber' },
  { surface: 'sovereignty-defence', group: 'chamber', numeral: '§ IV', label: 'Sovereignty Defence', purpose: 'Constitutional integrity & threats', archetype: 'chamber' },
  // bench
  { surface: 'judicial-operations', group: 'bench', numeral: '⚖ I', label: 'Judicial Operations Roster', purpose: 'National bench roster & backlog', archetype: 'bench' },
  { surface: 'supreme-court-bench', group: 'bench', numeral: '⚖ II', label: 'Supreme Court Bench', purpose: 'Active matters before the apex bench', archetype: 'bench' },
  { surface: 'appellate-routing', group: 'bench', numeral: '⚖ III', label: 'Appellate Routing Map', purpose: 'Case routing between court tiers', archetype: 'bench' },
  { surface: 'judicial-statistics', group: 'bench', numeral: '⚖ IV', label: 'Judicial Statistics', purpose: 'Caseload throughput & disposition rates', archetype: 'bench' },
  { surface: 'judicial-conduct', group: 'bench', numeral: '⚖ V', label: 'Judicial Conduct Office', purpose: 'Discipline · recusals · complaints', archetype: 'bench' },
  // docket
  { surface: 'civil-docket', group: 'docket', numeral: '¶ I', label: 'Civil Docket', purpose: 'Civil case filing pipeline', archetype: 'docket' },
  { surface: 'criminal-docket', group: 'docket', numeral: '¶ II', label: 'Criminal Docket', purpose: 'Criminal case filing pipeline', archetype: 'docket' },
  { surface: 'family-docket', group: 'docket', numeral: '¶ III', label: 'Family Docket', purpose: 'Family case filing pipeline', archetype: 'docket' },
  { surface: 'commercial-docket', group: 'docket', numeral: '¶ IV', label: 'Commercial Docket', purpose: 'Commercial dispute pipeline', archetype: 'docket' },
  { surface: 'administrative-docket', group: 'docket', numeral: '¶ V', label: 'Administrative Review Docket', purpose: 'Administrative-legality review pipeline', archetype: 'docket' },
  { surface: 'case-scheduling', group: 'docket', numeral: '¶ VI', label: 'Case Scheduling Chamber', purpose: 'Auto-scheduling & procedural deadlines', archetype: 'docket' },
  // records & forensic
  { surface: 'legal-records', group: 'records', numeral: '✠ I', label: 'Legal Records Continuity', purpose: 'Sovereign archival vaults & memory', archetype: 'fascicle' },
  { surface: 'evidence-vault', group: 'records', numeral: '✠ II', label: 'Evidence Vault', purpose: 'Cryptographic evidence integrity', archetype: 'fascicle' },
  { surface: 'judicial-signatures', group: 'records', numeral: '✠ III', label: 'Judicial Signatures', purpose: 'HSM-backed signature registry', archetype: 'fascicle' },
  { surface: 'forensic-evidence', group: 'forensic', numeral: '⚗ I', label: 'Forensic Evidence Coordination', purpose: 'National forensic laboratory network', archetype: 'forensic' },
  { surface: 'authentication-queue', group: 'forensic', numeral: '⚗ II', label: 'Authentication Queue', purpose: 'Evidence authentication backlog', archetype: 'forensic' },
  // rights
  { surface: 'rights-administrative', group: 'rights', numeral: '☩ I', label: 'Rights & Administrative Review', purpose: 'Bill of rights monitoring & administrative legality', archetype: 'rights' },
  { surface: 'rights-petitions', group: 'rights', numeral: '☩ II', label: 'Constitutional Petitions', purpose: 'Rights petitions docket', archetype: 'rights' },
  { surface: 'public-docket-redacted', group: 'rights', numeral: '☩ III', label: 'Public Docket', purpose: 'Public docket with privacy redaction', archetype: 'rights' },
  { surface: 'legal-aid', group: 'rights', numeral: '☩ IV', label: 'Legal Aid Intake', purpose: 'Legal aid managed services', archetype: 'rights' },
  // corrections
  { surface: 'corrections-administration', group: 'corrections', numeral: '◇ I', label: 'Corrections Administration', purpose: 'Detention facility administration', archetype: 'corrections' },
  { surface: 'probation-registry', group: 'corrections', numeral: '◇ II', label: 'Probation Registry', purpose: 'Probation conditions & compliance', archetype: 'corrections' },
  // portal
  { surface: 'justice-portal', group: 'portal', numeral: '◊ I', label: 'Petitioner & Counsel Portal', purpose: 'Filing counters · complaints · advisories', archetype: 'portal' },
  { surface: 'attorney-registry', group: 'portal', numeral: '◊ II', label: 'Attorney Registry', purpose: 'Bar admissions & discipline', archetype: 'portal' },
  // continuity
  { surface: 'justice-foresight', group: 'continuity', numeral: '⏳ I', label: 'Judicial Continuity Foresight', purpose: '20-year constitutional trajectory', archetype: 'continuity' },
  { surface: 'continuity-cascade', group: 'continuity', numeral: '⏳ II', label: 'Cross-Ministry Cascade', purpose: 'Constitutional events propagating across branches', archetype: 'continuity' },
];

export function domainBySurface(surface: SurfaceId): JusticeDomain | undefined {
  return JUSTICE_DOMAINS.find(d => d.surface === surface);
}

export function domainsForGroup(group: JusticeGroupKey): JusticeDomain[] {
  return JUSTICE_DOMAINS.filter(d => d.group === group);
}
