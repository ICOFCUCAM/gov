import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// The map engine and the screens rebuilt on it draw the installed nation's own
// regions: no reference region names, no fixed slot positions, no regionName()
// slots, no random placement (docs/MAP_SYSTEM_PLAN.md). The legacy ministry
// app maps are still to move (plan phase 5) and are not checked here yet.
const SRC = path.join(__dirname, '..', '..');
const ENGINE = ['lib/map', 'components/map'];
const READ = (p: string) => fs.readFileSync(path.join(SRC, p), 'utf8');
const files = (dir: string): string[] => fs.readdirSync(path.join(SRC, dir), { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : []));

const REFERENCE_NAMES = /['"](Capital District|Northern( Province| Region)?|Eastern( Region)?|Western( Region)?|Coastal( Region)?|Highland( Region)?|Central( Region)?)['"]/;
const SLOT_POSITION = /\bc[xy]\s*:\s*\d{2,}/;

describe('maps follow the installed nation', () => {
  it('the map engine has no reference regions, fixed positions, slots or random placement', () => {
    for (const f of ENGINE.flatMap(files)) {
      const s = READ(f);
      expect(s, f).not.toMatch(REFERENCE_NAMES);
      expect(s, f).not.toMatch(SLOT_POSITION);
      expect(s, f).not.toMatch(/regionName\(/);
      expect(s, f).not.toMatch(/\bseed\(/);
    }
  });

  it('the Situation now map, territory panels and security threat map use the engine', () => {
    const sr = READ('components/features/SituationRoom.tsx');
    expect(sr).not.toMatch(/const provinces = \(\)/);
    expect(sr).toMatch(/export function NationalMap[\s\S]*<NationMap /);
    expect(sr).toMatch(/export function TerritoryHeat[\s\S]*<NationMap /);
    const no = READ('components/features/NationalOverview.tsx');
    expect(no).toMatch(/function ThreatMap[\s\S]*<NationMap /);
    const dc = READ('components/features/DomainCommand.tsx');
    expect(dc).toMatch(/<WorldContext /);
  });

  it('no map draws a foreign country in an invented colour', () => {
    expect(READ('components/map/WorldContext.tsx')).not.toMatch(/riskOf|seed\(/);
  });
});
