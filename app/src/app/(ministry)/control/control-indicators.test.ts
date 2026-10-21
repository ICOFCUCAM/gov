// /control's service status strip computed from the records (plan step I3):
// the institution's indicators under the indicator register's definitions
// lead the strip, each with its marker, period and coverage; "Not connected"
// while no approved procedure keeps its cases (never a zero); sample cases
// never count in production. The earlier generated strip stays below it.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/control', useRouter: () => ({ push() {}, refresh() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));

import MinistryControlPage from './page';
import { InstallationModeProvider } from '@/lib/ops/mode-context';
import type { InstallationMode } from '@/lib/ops/mode';
import { createMinistry, setSovereign } from '@/lib/data/store';
import { openCase, resetCases, registeredEffects } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { samplePackage } from '@/lib/casework/testkit';
import { resetIndicators } from '@/lib/indicators/register';

afterEach(() => vi.unstubAllEnvs());

const made = createMinistry({ archetype: 'HEALTH', name: 'Indicator check', slug: 'indicator-check' });
if ('error' in made) throw new Error(made.error);
const m = made;

async function render(mode: InstallationMode) {
  vi.stubEnv('CIVICOS_MODE', mode);
  const page = await MinistryControlPage({ searchParams: Promise.resolve({ ministry: m.slug }) });
  return renderToStaticMarkup(h(InstallationModeProvider, { mode, children: page }));
}
const tile = (html: string, id: string) => html.match(new RegExp(`data-indicator="${id.replace('.', '\\.')}" data-kind="([a-z]+)">(.*?)</a></div>`))?.slice(1) ?? [];

describe('/control service status from the records', () => {
  beforeEach(() => { resetCases(); resetPackages(); resetIndicators(); setSovereign({ deployment: { authorities: { businessRegister: m.id } } }, 'test'); });

  it('is Not connected, never zero, while no approved procedure keeps the institution\'s cases', async () => {
    const html = await render('production');
    const [kind, body] = tile(html, 'casework.backlog');
    expect(kind).toBe('unavailable');
    expect(body).toContain('Not connected');
    expect(body).not.toMatch(/>0</);
    // the earlier generated strip is kept, folded
    expect(html).toContain('data-generated="earlier"');
  });

  it('counts the institution\'s real cases, leaves sample cases out in production and marks them Sample in demo', async () => {
    const d = draftPackage(samplePackage({ owner: 'businessRegister' }), 'Author', 'author', registeredEffects());
    if ('error' in d) throw new Error(d.error);
    approvePackage(d.key, d.version, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    const clerk = { name: 'Clerk', scope: null };
    openCase({ procedure: 'test.licence', fields: { name: 'Real' } }, clerk);
    openCase({ procedure: 'test.licence', fields: { name: 'Sample' }, source: 'sample' }, clerk);
    const prod = tile(await render('production'), 'casework.backlog');
    expect(prod[0]).toBe('record');
    expect(prod[1]).toMatch(/>1</);
    expect(prod[1]).toContain('Draft');
    const demo = tile(await render('demo'), 'casework.backlog');
    expect(demo[0]).toBe('sample');
    expect(demo[1]).toMatch(/>2</);
    expect(demo[1]).toContain('Sample');
  });
});
