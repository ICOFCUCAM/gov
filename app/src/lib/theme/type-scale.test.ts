// Type and spacing come from the scales (plan step I10; lib/theme/tokens.ts
// TYPE_SCALE, SPACE_SCALE): the shared console components and the newest
// institutional screens set text sizes only through the scale's classes and
// spacing only on the 4px scale. Older screens move to the scales file by
// file, as the colours did (docs/CONSOLE_DESIGN.md rollout step 9); each file
// joins CHECKED when it does. Anything kept off the scale is listed in
// EXCEPTIONS with its reason.
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TYPE_SCALE, SPACE_SCALE } from './tokens';

const SRC = path.resolve(__dirname, '../..');

/** Shared console components, and the screens of plan steps I2–I13 (their pages and the components they mount). */
export const CHECKED = [
  // Shared console components (components/ui).
  'components/ui/Button.tsx', 'components/ui/Field.tsx', 'components/ui/EmptyState.tsx', 'components/ui/Pill.tsx',
  'components/ui/StatusBadge.tsx', 'components/ui/RefusalText.tsx', 'components/ui/Skeleton.tsx', 'components/ui/SignalTag.tsx',
  'components/ui/ConsoleTabs.tsx', 'components/ui/DataSystem.tsx', 'components/ui/SkipLink.tsx', 'components/ui/States.tsx',
  'components/ui/OfflineBanner.tsx', 'components/ui/SimulationNotice.tsx', 'components/ui/CommandShell.tsx', 'components/ui/Card.tsx',
  'components/ui/SampleFold.tsx', 'components/ui/Generated.tsx',
  // The component-state gallery.
  'components/features/StateGallery.tsx', 'app/(gov)/gov/help/states/page.tsx',
  // I5: budget and treasury, procurement, the Cabinet office.
  'components/features/economy/BudgetTreasury.tsx', 'components/features/economy/ProcurementDesk.tsx',
  'components/features/economy/CabinetOffice.tsx', 'components/features/economy/ServicesPanel.tsx',
  'app/(gov)/gov/treasury/budget/page.tsx', 'app/(gov)/gov/treasury/procurement/page.tsx', 'app/(gov)/gov/cabinet-office/page.tsx',
  // I6: human services.
  'components/features/HumanServicesRegister.tsx', 'app/(gov)/gov/identity/page.tsx', 'app/(gov)/gov/passports/page.tsx',
  'app/(gov)/gov/labour/page.tsx', 'app/(gov)/gov/social-protection/page.tsx',
  // I7: territory and infrastructure.
  'components/features/TerritoryDesk.tsx', 'app/(gov)/gov/land/page.tsx', 'app/(gov)/gov/building/page.tsx',
  'app/(gov)/gov/local-government/page.tsx', 'app/(gov)/gov/transport/page.tsx',
  // I9: federation and portability.
  'components/features/exchange/FederationEvents.tsx', 'components/features/exchange/CrossInstitutionWorkflows.tsx',
  'components/features/exchange/DeclaredStates.tsx', 'components/features/exchange/ApiContract.tsx', 'components/features/exchange/FeedExchange.tsx',
  'app/(gov)/gov/exchange/federation/page.tsx', 'app/(gov)/gov/exchange/workflows/page.tsx', 'app/(gov)/gov/exchange/states/page.tsx',
  'app/(gov)/gov/exchange/contract/page.tsx',
  // I12: security governance and resilience.
  'components/features/SecurityResilienceDesk.tsx', 'app/(gov)/gov/security/resilience/page.tsx',
  // I13: the digital front door and records.
  'components/features/frontdoor/ServiceCatalogueDesk.tsx', 'components/features/frontdoor/ServiceManagementDesk.tsx',
  'components/features/frontdoor/RecordsManagementDesk.tsx', 'app/(gov)/gov/services/page.tsx', 'app/(gov)/gov/services/management/page.tsx',
  'app/(gov)/gov/records/page.tsx',
];

/** Kept off the scale, by file and class, with the reason. */
export const EXCEPTIONS: Record<string, { classes: string[]; why: string }> = {
  'components/ui/CommandShell.tsx': {
    classes: ['text-[7px]', 'text-[8px]', 'text-[9px]'],
    why: 'The command bar\'s telemetry captions and markers, the incident counter on its 14px badge and the rail footer: a dense strip of figures fitted to the 56px header (fitTelemetry). Raised to 11px on phones (globals.css); they move to the scale with the header\'s redesign.',
  },
};

const ARBITRARY_TEXT = /(?<![\w-])!?text-\[(\d+(?:\.\d+)?)(px|rem|em)\]/g;
const OFF_SCALE_STEP = /(?<![\w-])!?text-([4-9]xl)\b/g;
const SPACING = /(?<![\w-])!?-?(?:p|px|py|pt|pb|ps|pe|pl|pr|m|mx|my|mt|mb|ms|me|ml|mr|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|bottom|left|right|start|end)-\[([^\]]+)\]/g;
const STYLE_FONT = /fontSize:\s*['"]?\d/g;

describe('type and spacing scales in console code (plan I10)', () => {
  it('lists only files that exist', () => {
    expect(CHECKED.filter(f => !fs.existsSync(path.join(SRC, f)))).toEqual([]);
    expect(Object.keys(EXCEPTIONS).filter(f => !CHECKED.includes(f))).toEqual([]);
    for (const e of Object.values(EXCEPTIONS)) expect(e.why.length).toBeGreaterThan(60);
  });

  it('set text sizes only through the type scale', () => {
    const scale = new Set(Object.values(TYPE_SCALE));
    const off: string[] = [];
    for (const f of CHECKED) {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      const allowed = new Set(EXCEPTIONS[f]?.classes ?? []);
      for (const m of src.matchAll(ARBITRARY_TEXT)) {
        const cls = `text-[${m[1]}${m[2]}]`;
        if (allowed.has(cls)) continue;
        const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
        off.push(`${f}: ${cls}${scale.has(px as never) ? ' (on the scale: use its class)' : ' (not on the scale)'}`);
      }
      for (const m of src.matchAll(OFF_SCALE_STEP)) off.push(`${f}: text-${m[1]} (above the scale)`);
      for (const m of src.matchAll(STYLE_FONT)) off.push(`${f}: inline ${m[0]}`);
    }
    expect(off).toEqual([]);
  });

  it('space only on the 4px scale', () => {
    const scale = new Set<number>(SPACE_SCALE);
    const off: string[] = [];
    for (const f of CHECKED) {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      for (const m of src.matchAll(SPACING)) {
        const v = /^(-?\d+(?:\.\d+)?)px$/.exec(m[1]!);
        if (v && scale.has(Math.abs(Number(v[1])))) continue;
        off.push(`${f}: ${m[0]}`);
      }
    }
    expect(off).toEqual([]);
  });

  it('keep exceptions honest: each listed class is still used (remove it once the file moves to the scale)', () => {
    for (const [f, e] of Object.entries(EXCEPTIONS)) {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      for (const c of e.classes) expect(src.includes(c), `${f} ${c}`).toBe(true);
    }
  });
});
