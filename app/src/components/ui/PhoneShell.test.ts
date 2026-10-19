// The citizen wallet has one <main> per page (accessibility lane, go-live
// review L-8 follow-up): PhoneShell holds it, with the skip link to it, and
// no page wraps the shell in a second <main>.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/wallet', useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() }));
import { PhoneShell } from './PhoneShell';
import WalletHomePage from '@/app/(citizen)/wallet/page';

const mains = (html: string) => html.match(/<main\b/g)?.length ?? 0;

describe('PhoneShell', () => {
  it('renders one <main id="main"> and a skip link to it first', () => {
    const html = renderToStaticMarkup(createElement(PhoneShell, { header: 'Wallet' } as never, 'Hello'));
    expect(mains(html)).toBe(1);
    expect(html).toMatch(/<main id="main" tabindex="-1"/i);
    expect(html.indexOf('href="#main"')).toBeLessThan(html.indexOf('<main'));
  });

  it('the wallet home page has exactly one <main>', () => {
    expect(mains(renderToStaticMarkup(createElement(WalletHomePage)))).toBe(1);
  });

  it('no wallet page wraps PhoneShell in another <main>', () => {
    const root = path.join(__dirname, '..', '..', 'app', '(citizen)');
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.tsx')) { const s = fs.readFileSync(p, 'utf8'); if (s.includes('PhoneShell') && /<main\b/.test(s)) offenders.push(path.relative(root, p)); }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
