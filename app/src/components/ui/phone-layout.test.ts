import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Phones (register 15.7): every console shell opens its menu from a header
// button, the official's menu (with sign out) stays reachable in that drawer,
// and the smallest console text is raised to 11px on narrow screens.
const src = (p: string) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
const SHELLS = ['components/ui/CommandShell.tsx', 'components/features/SituationRoom.tsx', 'components/features/CabinetIntelligence.tsx'];

describe('the console on a phone', () => {
  it.each(SHELLS)('%s opens its menu as a drawer with the official\'s menu in it', f => {
    const s = src(f);
    expect(s).toMatch(/aria-expanded=\{navOpen\}/);
    expect(s).toMatch(/\$\{navOpen \? 'flex' : 'hidden'\} fixed inset-y-0/);
    expect(s).toMatch(/sm:hidden[^\n]*\n?[^\n]*<ExecutiveMenu/);
  });

  it('signs the official out on the server, not just by leaving the page', () => {
    const s = src('components/ui/ExecutiveMenu.tsx');
    expect(s).toContain("fetch('/api/auth/official', { method: 'DELETE' })");
    expect(s).not.toMatch(/l: 'Sign out', href:/);
  });

  it('raises the smallest console text on narrow screens', () => {
    expect(src('app/globals.css')).toMatch(/@media \(max-width: 639px\) \{\s*\.sov :is\([^)]*\.text-\\\[8px\\\][^)]*\) \{ font-size: 11px !important; \}/);
  });
});

describe('tables on a phone', () => {
  it('label every console table cell with its heading and stack rows under 640px, leaving public sites alone', () => {
    const s = src('components/ui/StackTables.tsx');
    expect(s).toContain("table.closest('[data-site-root]')");
    expect(s).toContain('cell.dataset.label = h');
    expect(src('app/layout.tsx')).toContain('<StackTables />');
    const css = src('app/globals.css');
    expect(css).toMatch(/table\[data-stack\] > tbody > tr > td\[data-label\]::before[^{]*\{\s*content: attr\(data-label\)/);
  });
});
