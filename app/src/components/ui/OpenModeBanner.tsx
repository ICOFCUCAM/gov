'use client';

// Go-live review L-2: a production server left open on purpose
// (CIVICOS_AUTH=open or CIVICOS_ALLOW_OPEN=1, lib/auth/mode.ts) says so on
// every console page. The root layout renders it only then; the public
// institution websites, the cover and the embeddable widgets are for citizens
// and do not show it. No focusable content, so a page's skip link stays its
// first Tab stop.

import { usePathname } from 'next/navigation';
import { PUBLIC_SITES } from '@/lib/auth/public-paths';

const NOT_CONSOLE = (p: string) => p === '/' || /^\/cover(\/|$)/.test(p) || PUBLIC_SITES.test(p);

export function OpenModeBanner() {
  const pathname = usePathname() ?? '';
  if (NOT_CONSOLE(pathname)) return null;
  return (
    <aside aria-label="Sign-in is off" data-open-mode-banner=""
      className="border-b-2 border-alert bg-surface px-4 py-2 text-[13px] text-ink">
      <strong className="text-alert">Sign-in is off on this server.</strong>{' '}
      Anyone who can reach it can read and change everything. It was started with CIVICOS_AUTH=open for a demonstration; remove that setting for any real use.
    </aside>
  );
}
