import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Federation boundary law: institutional applications under src/apps/**
// must NOT import the sovereign PLATFORM shell or platform-only command
// surfaces. Apps may only consume shared services/contracts. This test
// statically enforces deployment/runtime isolation so an institution
// could be extracted as a standalone deployable root.

const APPS_DIR = join(process.cwd(), 'src', 'apps');
const FORBIDDEN = [
  '@/components/ui/CommandShell',
  '@/components/features/NationalShell',
  '@/components/features/CabinetIntelligence',
  '@/components/features/NationalCoordination',
  '@/components/features/SituationRoom',
  '@/components/features/OperationsLedger',
  '@/apps/AppHost', // the host is platform-side; apps must not depend on it
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

describe('federation boundary', () => {
  it('no institutional app imports the platform shell or platform-only surfaces', () => {
    const offenders: string[] = [];
    for (const file of walk(APPS_DIR)) {
      // AppHost itself is the platform-side federation host — exempt.
      if (file.endsWith(join('apps', 'AppHost.tsx'))) continue;
      const src = readFileSync(file, 'utf8');
      for (const f of FORBIDDEN) {
        if (src.includes(`from '${f}'`)) offenders.push(`${file.replace(process.cwd(), '')} → ${f}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every app file is a client/runtime module or pure (no server-only platform coupling)', () => {
    // sanity: apps tree exists and contains real institution apps
    const files = walk(APPS_DIR);
    expect(files.some(f => f.includes('ministry-health'))).toBe(true);
    expect(files.some(f => f.includes('judiciary'))).toBe(true);
    expect(files.some(f => f.includes('treasury'))).toBe(true);
    expect(files.length).toBeGreaterThan(12);
  });
});
