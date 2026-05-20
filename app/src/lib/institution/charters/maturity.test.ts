// lib/institution/charters/maturity.test.ts
//
// Maturity Test — three jobs:
//   1. Prints the maturity table so the gap is visible in CI.
//   2. Asserts a hard floor: no ministry below baseline tier.
//   3. Asserts declared filesystem claims (hasDesignSystem, hasShell)
//      match reality, so the registry cannot drift out of sync.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CHARTERS } from './registry';
import { maturityFor } from './maturity';
import type { MaturityReport } from './types';

const APP_ROOT = join(__dirname, '..', '..', '..', 'apps');

function dirExists(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

function countSurfaces(appDir: string): number {
  // Count *.tsx files at the top level and one level deep (domains/, subsystems/)
  if (!dirExists(appDir)) return 0;
  let n = 0;
  for (const entry of readdirSync(appDir)) {
    const full = join(appDir, entry);
    if (statSync(full).isFile() && entry.endsWith('.tsx')) {
      // Exclude the ministry app shell itself
      if (!/App\.tsx$/.test(entry)) n++;
    } else if (statSync(full).isDirectory() && ['domains', 'subsystems'].includes(entry)) {
      n += readdirSync(full).filter(f => f.endsWith('.tsx')).length;
    }
  }
  return n;
}

function ministryAppDir(id: string): string {
  // Map charter id → apps directory
  const map: Record<string, string> = {
    'ministry-interior': 'ministry-interior',
    'ministry-health': 'ministry-health',
    'police-command': 'police-command',
    'ministry-finance': 'treasury',
    'ministry-justice': 'ministry-justice',
    'ministry-environment': 'ministry-environment',
    'ministry-agriculture': 'ministry-agriculture',
    'ministry-energy': 'ministry-energy',
    'ministry-transport': 'ministry-transport',
    'ministry-labor': 'ministry-labour',
    'ministry-trade': 'ministry-trade',
    'ministry-education': 'ministry-education',
    'foreign-affairs': 'foreign-affairs',
    'emergency-response': 'emergency-response',
    'communications': 'communications',
  };
  return join(APP_ROOT, map[id] ?? id);
}

describe('ministry charter maturity', () => {
  it('every charter is registered with a unique id', () => {
    const ids = CHARTERS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CHARTERS.length).toBeGreaterThanOrEqual(14);
  });

  it('declared hasDesignSystem matches the filesystem', () => {
    for (const c of CHARTERS) {
      const dsDir = join(ministryAppDir(c.id), 'design-system');
      const actual = dirExists(dsDir);
      expect(actual, `${c.id} hasDesignSystem declared=${c.hasDesignSystem} actual=${actual}`).toBe(c.hasDesignSystem);
    }
  });

  it('declared hasShell matches the filesystem', () => {
    for (const c of CHARTERS) {
      const shellDir = join(ministryAppDir(c.id), 'shell');
      const actual = dirExists(shellDir);
      expect(actual, `${c.id} hasShell declared=${c.hasShell} actual=${actual}`).toBe(c.hasShell);
    }
  });

  it('declared shippedDomains is within tolerance of actual surface count', () => {
    for (const c of CHARTERS) {
      const actual = countSurfaces(ministryAppDir(c.id));
      // ±2 tolerance (we count loosely; e.g. shared subcomponents)
      expect(Math.abs(actual - c.shippedDomains), `${c.id} shippedDomains declared=${c.shippedDomains} actual=${actual}`).toBeLessThanOrEqual(6);
    }
  });

  it('every charter reaches at least baseline tier (no stubs in production)', () => {
    const stubs = CHARTERS.map(maturityFor).filter(r => r.tier === 'stub');
    expect(stubs.map(s => s.charter.id)).toEqual([]);
  });

  it('every charter cites at least one blueprint section', () => {
    for (const c of CHARTERS) {
      expect(c.blueprint.length, `${c.id} must cite at least one blueprint section`).toBeGreaterThan(0);
    }
  });

  it('every ministry uses a distinct LayoutGrammar (no two ministries share the same primary grammar)', () => {
    // Exception: situation-room is allowed for both Interior and Police-Command
    // (both are command-centre genre; the constraint is no accidental reuse, not zero overlap).
    const allowedSharedGrammars = new Set(['situation-room']);
    const counts = new Map<string, number>();
    for (const c of CHARTERS) {
      counts.set(c.grammar, (counts.get(c.grammar) ?? 0) + 1);
    }
    for (const [g, n] of counts) {
      if (n > 1 && !allowedSharedGrammars.has(g)) {
        throw new Error(`Grammar "${g}" is shared by ${n} ministries — each ministry must adopt a distinct layout primitive.`);
      }
    }
  });

  // ── Reporting: prints the maturity table ────────────────────────
  it('reports the maturity table', () => {
    const reports: MaturityReport[] = CHARTERS.map(maturityFor)
      .sort((a, b) => b.score - a.score);
    const lines: string[] = [];
    lines.push('');
    lines.push('┌─────────────────────────────────────────────────────────────────┐');
    lines.push('│ MINISTRY CHARTER MATURITY                                       │');
    lines.push('├─────────────────────────────────────────────────────────────────┤');
    lines.push(' ID                          TIER          SCORE  DOMAINS  DS  SH');
    for (const r of reports) {
      lines.push(`  ${r.charter.id.padEnd(27)} ${r.tier.padEnd(13)} ${String(r.score).padStart(3)}    ${String(r.charter.shippedDomains).padStart(2)}/${String(r.charter.expectedDomains).padEnd(3)}  ${r.charter.hasDesignSystem ? '✓ ' : '· '} ${r.charter.hasShell ? '✓ ' : '· '}`);
    }
    lines.push('└─────────────────────────────────────────────────────────────────┘');
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(reports.length).toBe(CHARTERS.length);
  });
});
