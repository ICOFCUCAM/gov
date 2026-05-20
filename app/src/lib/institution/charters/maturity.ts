// lib/institution/charters/maturity.ts
//
// Pure maturity scorer. Given a charter's *declared* state, computes the
// institutional tier and the list of gaps that would have to close to
// reach the next tier. The companion test asserts that declared state
// matches actual filesystem state so charters cannot lie.

import type { MinistryCharter, MaturityReport, MaturityTier } from './types';

const TIER_ORDER: MaturityTier[] = ['stub', 'baseline', 'advanced', 'operational', 'reference'];

export function maturityFor(c: MinistryCharter): MaturityReport {
  const gaps: string[] = [];

  // Floor: at least baseline (4 surfaces dispatched)
  if (c.shippedDomains < 4) gaps.push(`Ship at least 4 domain surfaces (currently ${c.shippedDomains}).`);
  if (c.grammar === 'generic-sector') gaps.push('Adopt a distinct LayoutGrammar (not generic-sector).');

  // Advanced: ≥10 domains + emits cascade + at least 1 federation edge
  if (c.shippedDomains < 10) gaps.push(`Ship ≥10 domain surfaces (currently ${c.shippedDomains}).`);
  if (!c.federation.emitsCascade) gaps.push('Engine should emit a cross-ministry cascade (federation.emitsCascade=true).');
  if (c.federation.produces.length === 0) gaps.push('Declare cross-ministry produces[] (this ministry should emit events to others).');

  // Operational: own DS + shell + domain catalog
  if (!c.hasDesignSystem) gaps.push('Build apps/<ministry>/design-system/ — own typography & tokens.');
  if (!c.hasShell) gaps.push('Build apps/<ministry>/shell/ — own layout engine (not SectorInstitutionApp).');

  // Reference: ≥30 domains + workflows + safeguards
  if (c.shippedDomains < 30) gaps.push(`Ship ≥30 domain surfaces (currently ${c.shippedDomains}).`);
  if (c.workflows.length === 0) gaps.push('Declare at least 1 executable workflow (writes actions, not just reads telemetry).');
  if (c.safeguardsConstant === '' && c.mount.kind === 'agency') {
    gaps.push('Declare a constitutional safeguards constant (e.g. <MINISTRY>_SAFEGUARDS.prohibited).');
  }
  if (c.blueprint.length === 0) gaps.push('Cite at least one CivicOS blueprint section the ministry implements.');

  const tier = tierFor(c);
  const score = scoreFor(c);
  return { charter: c, tier, score, gaps };
}

function tierFor(c: MinistryCharter): MaturityTier {
  const hasFederation = c.federation.emitsCascade && c.federation.produces.length > 0;
  const reference =
    c.hasDesignSystem && c.hasShell &&
    c.shippedDomains >= 30 && c.workflows.length >= 1 &&
    hasFederation && c.blueprint.length > 0;
  if (reference) return 'reference';

  const operational =
    c.hasDesignSystem && c.hasShell &&
    c.shippedDomains >= 10 && hasFederation;
  if (operational) return 'operational';

  const advanced = c.shippedDomains >= 10 && hasFederation;
  if (advanced) return 'advanced';

  const baseline = c.shippedDomains >= 4 && c.grammar !== 'generic-sector';
  if (baseline) return 'baseline';

  return 'stub';
}

function scoreFor(c: MinistryCharter): number {
  let s = 0;
  s += Math.min(40, Math.round((c.shippedDomains / Math.max(1, c.expectedDomains)) * 40));
  s += c.hasDesignSystem ? 15 : 0;
  s += c.hasShell ? 15 : 0;
  s += c.federation.emitsCascade ? 10 : 0;
  s += c.federation.produces.length > 0 ? 5 : 0;
  s += Math.min(10, c.workflows.length * 5);
  s += c.safeguardsConstant ? 5 : 0;
  return Math.min(100, s);
}

export function compareTier(a: MaturityTier, b: MaturityTier): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}
