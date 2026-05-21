// apps/noc/core — National Operations Centre domain registry.

import type { NocArchetype } from '@/apps/noc/design-system/noc-ds';

export type NocGroupKey =
  | 'situation' | 'ministries' | 'incidents' | 'decisions'
  | 'briefing' | 'continuity' | 'fusion' | 'safeguards';

export interface NocGroup {
  key: NocGroupKey;
  label: string;
  purpose: string;
}

export type NocSurfaceId =
  | 'situation-room' | 'national-readiness' | 'cabinet-sync' | 'cross-domain-fabric'
  | 'ministry-posture' | 'ministry-contribution' | 'ministry-incidents'
  | 'incident-floor' | 'major-incidents' | 'regional-rollup'
  | 'coordination-decisions' | 'recommendations-published' | 'cabinet-routed'
  | 'public-briefing' | 'briefing-archive' | 'translations'
  | 'national-continuity' | 'cog-status' | 'continuity-exercises'
  | 'intel-fusion' | 'open-source-fusion' | 'cyber-posture'
  | 'noc-safeguards' | 'civilian-command-doctrine' | 'rationale-doctrine'
  | 'cabinet-non-substitution';

export interface NocDomain {
  surface: NocSurfaceId;
  group: NocGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: NocArchetype;
}

export const NOC_GROUPS: NocGroup[] = [
  { key: 'situation',  label: 'Situation Room',  purpose: 'Live national operational picture' },
  { key: 'ministries', label: 'Ministry Posture', purpose: 'Cross-ministry posture & contribution' },
  { key: 'incidents',  label: 'Incidents',       purpose: 'National incident floor' },
  { key: 'decisions',  label: 'Coordination',    purpose: 'NOC coordination decisions' },
  { key: 'briefing',   label: 'Public Briefing', purpose: 'Public briefings & translations' },
  { key: 'continuity', label: 'Continuity',      purpose: 'Continuity of government posture' },
  { key: 'fusion',     label: 'Intel Fusion',    purpose: 'Open-source intelligence fusion' },
  { key: 'safeguards', label: 'Safeguards',      purpose: 'Civilian-command safeguards' },
];

export const NOC_DOMAINS: NocDomain[] = [
  { surface: 'situation-room',            group: 'situation',  code: 'SR-RUN-01', label: 'Situation Room',           purpose: 'Live national operational picture',     archetype: 'situation' },
  { surface: 'national-readiness',        group: 'situation',  code: 'SR-RDY-02', label: 'National Readiness',       purpose: 'Aggregate readiness index',             archetype: 'situation' },
  { surface: 'cabinet-sync',              group: 'situation',  code: 'SR-CAB-03', label: 'Cabinet Sync',             purpose: 'Cabinet sync interval & cadence',       archetype: 'situation' },
  { surface: 'cross-domain-fabric',       group: 'situation',  code: 'SR-XDF-04', label: 'Cross-Domain Fabric',      purpose: 'Cross-domain signal fabric',            archetype: 'situation' },
  { surface: 'ministry-posture',          group: 'ministries', code: 'MP-PST-05', label: 'Ministry Posture',         purpose: 'Per-ministry posture index',            archetype: 'ministries' },
  { surface: 'ministry-contribution',     group: 'ministries', code: 'MP-CON-06', label: 'Ministry Contribution',    purpose: 'Contribution to national readiness',    archetype: 'ministries' },
  { surface: 'ministry-incidents',        group: 'ministries', code: 'MP-INC-07', label: 'Ministry Incidents',       purpose: 'Incidents in flight per ministry',      archetype: 'ministries' },
  { surface: 'incident-floor',            group: 'incidents',  code: 'IF-FLR-08', label: 'Incident Floor',           purpose: 'All active incidents',                  archetype: 'incidents' },
  { surface: 'major-incidents',           group: 'incidents',  code: 'IF-MAJ-09', label: 'Major Incidents',          purpose: 'Major & national incidents',            archetype: 'incidents' },
  { surface: 'regional-rollup',           group: 'incidents',  code: 'IF-REG-10', label: 'Regional Rollup',          purpose: 'Regional rollup',                       archetype: 'incidents' },
  { surface: 'coordination-decisions',    group: 'decisions',  code: 'CD-DEC-11', label: 'Coordination Decisions',   purpose: 'Active coordination decisions',         archetype: 'decisions' },
  { surface: 'recommendations-published', group: 'decisions',  code: 'CD-REC-12', label: 'Recommendations',          purpose: 'Published recommendations',             archetype: 'decisions' },
  { surface: 'cabinet-routed',            group: 'decisions',  code: 'CD-CAB-13', label: 'Cabinet-Routed',           purpose: 'Routed to Cabinet for decision',        archetype: 'decisions' },
  { surface: 'public-briefing',           group: 'briefing',   code: 'PB-BRF-14', label: 'Public Briefing',          purpose: 'Live public briefing',                  archetype: 'briefing' },
  { surface: 'briefing-archive',          group: 'briefing',   code: 'PB-ARC-15', label: 'Briefing Archive',         purpose: 'Historical briefings',                  archetype: 'briefing' },
  { surface: 'translations',              group: 'briefing',   code: 'PB-TRA-16', label: 'Translations',             purpose: 'Multi-language translation pipeline',   archetype: 'briefing' },
  { surface: 'national-continuity',       group: 'continuity', code: 'NC-NAT-17', label: 'National Continuity',      purpose: 'Continuity-of-government posture',      archetype: 'continuity' },
  { surface: 'cog-status',                group: 'continuity', code: 'NC-COG-18', label: 'CoG Status',               purpose: 'CoG status board',                      archetype: 'continuity' },
  { surface: 'continuity-exercises',      group: 'continuity', code: 'NC-EXR-19', label: 'Continuity Exercises',     purpose: 'Drills & exercises calendar',           archetype: 'continuity' },
  { surface: 'intel-fusion',              group: 'fusion',     code: 'IF-FUS-20', label: 'Intel Fusion',             purpose: 'Open-source intel fusion',              archetype: 'fusion' },
  { surface: 'open-source-fusion',        group: 'fusion',     code: 'IF-OSF-21', label: 'Open-Source Fusion',       purpose: 'Open-source fusion stream',             archetype: 'fusion' },
  { surface: 'cyber-posture',             group: 'fusion',     code: 'IF-CYB-22', label: 'Cyber Posture',            purpose: 'National cyber posture',                archetype: 'fusion' },
  { surface: 'noc-safeguards',            group: 'safeguards', code: 'SF-NOC-23', label: 'NOC Safeguards',           purpose: 'NOC_SAFEGUARDS contract',               archetype: 'safeguards' },
  { surface: 'civilian-command-doctrine', group: 'safeguards', code: 'SF-CIV-24', label: 'Civilian Command Doctrine',purpose: 'Civilian command doctrine',             archetype: 'safeguards' },
  { surface: 'rationale-doctrine',        group: 'safeguards', code: 'SF-RAT-25', label: 'Rationale Doctrine',       purpose: 'Every NOC decision is reasoned',         archetype: 'safeguards' },
  { surface: 'cabinet-non-substitution',  group: 'safeguards', code: 'SF-CAB-26', label: 'Cabinet Non-Substitution', purpose: 'NOC does not substitute for Cabinet',   archetype: 'safeguards' },
];

const BY_SURFACE = new Map(NOC_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: NocSurfaceId | string): NocDomain | undefined {
  return BY_SURFACE.get(surface as NocSurfaceId);
}

export const NOC_LEGACY_KEYS: Record<string, NocSurfaceId> = {
  situation: 'situation-room',
  ministries: 'ministry-posture',
  incidents: 'incident-floor',
  decisions: 'coordination-decisions',
  briefing: 'public-briefing',
  continuity: 'national-continuity',
  fusion: 'intel-fusion',
  safeguards: 'noc-safeguards',
};

export function resolveNocSurface(key: string | null | undefined): NocSurfaceId {
  if (!key) return 'situation-room';
  if (BY_SURFACE.has(key as NocSurfaceId)) return key as NocSurfaceId;
  return NOC_LEGACY_KEYS[key] ?? 'situation-room';
}

export function nocNav(): { key: string; label: string }[] {
  return NOC_GROUPS.map(g => ({ key: NOC_DOMAINS.find(d => d.group === g.key)!.surface, label: g.label }));
}
