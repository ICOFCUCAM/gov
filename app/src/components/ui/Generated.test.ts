// Generated figures on console screens (lib/twin/generated.ts, components/ui/Generated.tsx):
// marked Sample in demo and training, "Not connected" in production, by one
// mechanism shared with the executive posture and the agency apps' fold
// (institutional baseline audit, part B; acceptance P6-10).
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/gov', useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() }));

import { generatedPolicy, isGenerated, shownValue } from '@/lib/twin/generated';
import { executivePosture } from '@/lib/gov/executive-posture';
import { InstallationModeProvider } from '@/lib/ops/mode-context';
import type { InstallationMode } from '@/lib/ops/mode';
import { GeneratedFold, GeneratedReveal, GeneratedStrip, GeneratedText, useTile } from './Generated';
import { Panel, KpiCell } from '@/components/features/SituationRoom';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { EXAMPLE_ASSIGNEES } from '@/lib/gov/runtime-workflow';
import { WATCH_FINDING_ACTIONS } from '@/lib/records/watch-actions';
import { WATCH_ACTIONS } from '@/lib/records/access-watch';
import type { NationalCoordination, NationalSnapshot } from '@/lib/api/types';

const inMode = (mode: InstallationMode, el: React.ReactElement) => renderToStaticMarkup(h(InstallationModeProvider, { mode, children: el }));
const child = h('span', null, 'GENERATED-FIGURE-42');

describe('the rule for a generated figure', () => {
  it('production: not shown, marked not connected, with the reason', () => {
    const p = generatedPolicy(false);
    expect(p.show).toBe(false);
    expect(p.kind).toBe('unavailable');
    expect(p.src).toMatch(/not shown on a production installation/);
    expect(shownValue(p, '86/100')).toBe('—');
  });
  it('demo and training: shown, marked Sample (or Simulation), with its source', () => {
    expect(generatedPolicy(true)).toMatchObject({ show: true, kind: 'sample' });
    expect(generatedPolicy(true, 'simulated', 'Scenario engine')).toEqual({ show: true, kind: 'simulated', src: 'Scenario engine' });
    expect(shownValue(generatedPolicy(true), '86/100')).toBe('86/100');
  });
  it('only sample and simulated figures are generated; records, observations and statements never fold', () => {
    expect(['sample', 'simulated'].every(k => isGenerated(k as never))).toBe(true);
    expect(['record', 'observed', 'reported', 'modelled', 'unavailable', undefined].some(k => isGenerated(k as never))).toBe(false);
  });
  it('is the same rule the executive posture applies (one mechanism)', () => {
    const nat = (samples: boolean) => ({ samples, crossMinistryIncidents: [], totals: { queuesBreaching: 0 } }) as unknown as NationalSnapshot;
    const coord = { posture: { level: 'ok', label: 'STABLE', nationalRisk: 10, coordinatingMinistries: 0, cascadeRisks: 0, basis: 'records' } } as unknown as NationalCoordination;
    expect(executivePosture(nat(false), coord).generated).toEqual(generatedPolicy(false));
    expect(executivePosture(nat(true), coord).generated).toEqual(generatedPolicy(true));
  });
});

describe('the fold on console screens', () => {
  it('production: a block of generated figures folds under "Not connected" and is not rendered until opened', () => {
    const html = inMode('production', h(GeneratedFold, { what: 'Headline figures' }, child));
    expect(html).toContain('<details');
    expect(html).toContain('Not connected');
    expect(html).not.toContain('GENERATED-FIGURE-42');
  });
  it('demo and training: shown; a marked block carries the Sample marker once', () => {
    for (const mode of ['demo', 'training'] as const) {
      const html = inMode(mode, h(GeneratedStrip, { what: 'Headline figures' }, child));
      expect(html).toContain('GENERATED-FIGURE-42');
      expect(html).toContain('Sample');
      expect(html).not.toContain('<details');
    }
  });
  it('fails closed outside the provider: a component that does not know the mode treats it as production', () => {
    expect(renderToStaticMarkup(h(GeneratedFold, null, child))).not.toContain('GENERATED-FIGURE-42');
  });
  it('opened on purpose in production, the figures show marked Simulation, never as the nation\'s', () => {
    const html = inMode('production', h(GeneratedReveal, null, h(GeneratedText, null, '7 briefs')));
    expect(html).toContain('7 briefs');
    expect(html).toContain('Simulation');
  });
  it('one value in running text: the value and Sample in demo, only "Not connected" in production', () => {
    expect(inMode('demo', h(GeneratedText, null, '7 briefs'))).toMatch(/7 briefs.*Sample/);
    const prod = inMode('production', h(GeneratedText, null, '7 briefs'));
    expect(prod).not.toContain('7 briefs');
    expect(prod).toContain('Not connected');
  });
  it('a headline tile: generated is "Not connected" in production; a record is shown in every mode', () => {
    function T({ kind }: { kind: 'sample' | 'record' }) { const t = useTile('1,234', kind, 'src'); return h('div', null, t.value, t.marker); }
    expect(inMode('production', h(T, { kind: 'sample' }))).not.toContain('1,234');
    expect(inMode('production', h(T, { kind: 'record' }))).toContain('1,234');
    expect(inMode('demo', h(T, { kind: 'sample' }))).toMatch(/1,234.*Sample/);
  });
});

describe('the console panel (Panel signal=)', () => {
  const panel = (signal: 'sample' | 'simulated' | 'record' | undefined) => h(Panel, { title: 'Treasury flow', meta: 'META-7', signal, children: child });
  it('production: a Sample or Simulation panel keeps its title and folds its figures', () => {
    for (const signal of ['sample', 'simulated'] as const) {
      const html = inMode('production', panel(signal));
      expect(html).toContain('Treasury flow');
      expect(html).toContain('Not connected');
      expect(html).not.toContain('GENERATED-FIGURE-42');
      expect(html).not.toContain('META-7');
    }
  });
  it('demo: the panel shows its figures under its marker', () => {
    const html = inMode('demo', panel('sample'));
    expect(html).toContain('GENERATED-FIGURE-42');
    expect(html).toContain('Sample');
  });
  it('a panel of records is never folded', () => {
    expect(inMode('production', panel('record'))).toContain('GENERATED-FIGURE-42');
    expect(inMode('production', panel(undefined))).toContain('GENERATED-FIGURE-42');
  });
  it('a generated KPI cell reads "Not connected" in production and its value, marked, in demo', () => {
    const d = { l: 'National Stability Index', v: '58', t: 'warn', d: 1, traj: '↗', spark: [1, 2, 3], crit: false, anom: false, state: 'ELEV', base: 2, band: 3, pulse: false } as never;
    const prod = inMode('production', h(KpiCell, { d }));
    expect(prod).toContain('National Stability Index');
    expect(prod).toContain('Not connected');
    expect(prod).not.toContain('>58<');
    expect(inMode('demo', h(KpiCell, { d }))).toContain('Sample');
  });
});

describe('example work items (RuntimeQueue)', () => {
  const q = h(RuntimeQueue, { scope: 'test:generated', kind: 'case', title: 'Directives in progress', n: 4 });
  it('production: folded, not rendered, with the way to the real case queue kept in the fold', () => {
    const html = inMode('production', q);
    expect(html).toContain('<details');
    expect(html).toContain('Not connected');
    expect(html).not.toMatch(/CA-10\d\d/);
  });
  it('demo: shown under a Sample marker, naming no person and linking to the real cases', () => {
    const html = inMode('demo', q);
    expect(html).toContain('Sample');
    expect(html).toMatch(/CA-10\d\d/);
    expect(html).toContain('/gov/work/cases/open');
  });
  it('an example assignee is a placeholder, never a typed person\'s name', () => {
    expect(EXAMPLE_ASSIGNEES.every(a => a.startsWith('Example officer'))).toBe(true);
  });
});

describe('the oversight screen counts the access watches\' findings from the audit chain', () => {
  it('its list of watch actions is the watch\'s own', () => {
    expect(WATCH_FINDING_ACTIONS).toEqual(WATCH_ACTIONS);
  });
});

// A static guard over the console files fixed in step I0.1 (lane 4): every panel says where its
// figures come from, every local headline tile goes through the shared rule, and the typed
// figures and names removed do not come back. It reads source text, so it stays cheap and
// tolerant of layout changes.
describe('console files keep every generated figure marked or folded', () => {
  const root = path.join(__dirname, '..', '..');
  const FILES = [
    'components/features/SubsystemConsole.tsx', 'components/features/CabinetIntelligence.tsx',
    'components/features/SituationRoom.tsx', 'components/features/NationalCoordination.tsx',
    'components/features/DomainCommand.tsx', 'components/features/BranchWorkspace.tsx',
    'components/features/BranchesView.tsx', 'components/features/RegionalOverview.tsx',
    'components/features/ExecutiveBriefingChamber.tsx', 'components/features/NationalFabricView.tsx',
    'components/features/NationalSimulation.tsx', 'components/features/NationalShell.tsx',
    'components/features/RuntimeQueue.tsx', 'apps/_shared/InstitutionChain.tsx',
    'app/(ops)/ops/OpsCenter.tsx', 'app/(auditor)/audit/AuditView.tsx', 'app/(nccc)/wall/page.tsx',
    'app/(admin)/ministries/MinistriesConsole.tsx',
  ];
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

  it('every <Panel> states where its figures come from (signal=), or says it holds no figures', () => {
    const missing: string[] = [];
    for (const f of FILES) {
      const lines = read(f).split('\n');
      lines.forEach((l, i) => {
        if (!/<Panel\b/.test(l)) return;
        // The opening tag may run over a few lines.
        const tag = lines.slice(i, i + 4).join(' ').split('>')[0]!;
        if (/\bsignal=/.test(tag) || /no figures/i.test(lines[i - 1] ?? '')) return;
        missing.push(`${f}:${i + 1}`);
      });
    }
    expect(missing).toEqual([]);
  });

  it('no panel in these files is tagged Modelled: their inputs are generated (Sample or Simulation)', () => {
    const modelled = FILES.filter(f => /<Panel[^>]*signal="modelled"|signal = 'modelled'/.test(read(f)));
    expect(modelled).toEqual([]);
  });

  it('every local headline tile goes through the shared rule (useTile), so a production installation folds it', () => {
    const tiles: string[] = [];
    for (const f of FILES) {
      const src = read(f);
      for (const m of src.matchAll(/\nfunction (Stat|Tile|TeleTile|RegionTile|AuditTile|BranchTile)\(/g)) {
        const body = src.slice(m.index!, src.indexOf('\n}\n', m.index!));
        if (!body.includes('useTile(')) tiles.push(`${f} · ${m[1]}`);
      }
    }
    expect(tiles).toEqual([]);
    expect(read('components/features/BranchRecords.tsx')).toContain('useTile(');
  });

  it('the panel wrappers fold generated panels in production', () => {
    expect(read('components/features/SituationRoom.tsx')).toMatch(/isGenerated\(signal\) && !gen\.show/);
    // The regional maps stay drawn in production, with no generated figure (values=[] and kind unavailable).
    for (const fn of ['TerritoryHeat', 'NationalMap']) {
      const src = read('components/features/SituationRoom.tsx');
      const body = src.slice(src.indexOf(`export function ${fn}(`), src.indexOf('\n}\n', src.indexOf(`export function ${fn}(`)));
      expect(body, fn).toMatch(/if \(!gen\.show\)[\s\S]*values=\{\[\]\} kind="unavailable"/);
    }
    expect(read('app/(ops)/ops/OpsCenter.tsx')).toMatch(/isGenerated\(signal\) && !gen\.show/);
    expect(read('components/features/NationalShell.tsx')).toMatch(/isGenerated\(signal \?\? undefined\) && !gen\.show/);
  });

  it('a file that draws generated figures uses the shared mechanism', () => {
    const offenders = FILES.filter(f => {
      const src = read(f);
      const generates = /\b(seed|wave|waveSeries)\(/.test(src);
      const usesMechanism = /@\/components\/ui\/Generated'|<Panel\b|from '\.\/Generated'/.test(src);
      return generates && !usesMechanism;
    });
    expect(offenders).toEqual([]);
  });

  it('typed figures and names removed in this step do not return', () => {
    const typed = [/of 47\b/, /\+3 new today/, /1 amber \(water pressure\)/, /K\. Adamu/, /L\. Mensah/, /W\. Tanaka/, /'3 sev1 · 2 sev2 · 1 sev3'/, /'80% healthy'/, /'12% of total'/];
    const found = FILES.flatMap(f => typed.filter(r => r.test(read(f))).map(r => `${f}: ${r}`));
    expect(found).toEqual([]);
  });
});
