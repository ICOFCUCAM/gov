// /control in production shows no generated figure as the institution's
// (CLAUDE.md, Signal rules; step I0.1; acceptance P6-10): the ministry
// operations model's figures (lib/data/store/ministries.ts, kind 'sample') and
// the reference model's readings fold under "Not connected" through the one
// rule (lib/twin/generated.ts); in demo and training they are shown, marked
// Sample. The structure (institutions, groups, systems, links, departments,
// modules) is never folded.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/control', useRouter: () => ({ push() {}, refresh() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));

import MinistryControlPage from './page';
import { InstallationModeProvider } from '@/lib/ops/mode-context';
import type { InstallationMode } from '@/lib/ops/mode';
import { createMinistry, ministryOperations } from '@/lib/data/store';
import type { Ministry } from '@/lib/api/types';
import { instantiateMinistry } from '@/lib/institution/blueprint';

afterEach(() => vi.unstubAllEnvs());

// An institution with its type's modules, so every kind of operations figure is on the page.
const made = createMinistry({ archetype: 'HEALTH', name: 'Control check', slug: 'control-check' });
if ('error' in made) throw new Error(made.error);
const m: Ministry = made;

async function render(mode: InstallationMode) {
  vi.stubEnv('CIVICOS_MODE', mode);
  const page = await MinistryControlPage({ searchParams: Promise.resolve({ ministry: m.slug }) });
  return renderToStaticMarkup(h(InstallationModeProvider, { mode, children: page }));
}

describe('/control and generated figures', () => {
  it('production: the operations figures fold under "Not connected"; structure and links stay', async () => {
    const html = await render('production');
    const ops = ministryOperations(m.id);
    if ('error' in ops) throw new Error(ops.error);
    expect(ops.modules.some(x => x.kpis.length && x.queues.length)).toBe(true);
    expect(html).toContain('Not connected');
    expect(html).toContain('<details');
    expect(html).not.toContain('>Sample<');
    // A module's generated KPI and queue figures are not rendered; its title is.
    for (const mod of ops.modules) {
      expect(html).toContain(mod.title);
      for (const k of mod.kpis) expect(html).not.toContain(`>target ${k.target}<`);
      for (const q of mod.queues) expect(html).not.toContain(`oldest ${q.oldestAgeHours}h`);
    }
    expect(html).not.toMatch(/NOMINAL|STRAINED|WATCH/);
    // Every group link of the institution stays reachable.
    for (const g of instantiateMinistry(m, 0).groups) expect(html).toContain(`/ministries/${m.id}/system/${g.key}"`);
  });

  it('demo and training: shown, marked Sample', async () => {
    for (const mode of ['demo', 'training'] as const) {
      const html = await render(mode);
      expect(html, mode).toContain('Sample');
      expect(html, mode).toMatch(/NOMINAL|STRAINED|WATCH/);
      expect(html, mode).toContain('oldest ');
    }
  });
});
