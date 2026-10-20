'use client';

// What this installation is (lib/ops/mode.ts, directions 10.2): a training or
// demonstration installation says so on every page, public sites included,
// so no visitor takes its sample records or simulated figures for a nation's
// own; a production build started without CIVICOS_MODE says that it needs
// setting. Embeddable widgets (/embed) sit inside a ministry's own website and
// do not show it. No focusable content, so a page's skip link stays its first
// Tab stop. No bold text: a public site's design loads only the weights it
// uses, and a bold word here would fetch another font file on every page.

import { usePathname } from 'next/navigation';
import type { InstallationMode } from '@/lib/ops/mode';

export function InstallationBanner({ mode, unset }: { mode: InstallationMode; unset: boolean }) {
  const pathname = usePathname() ?? '';
  if (/^\/embed(\/|$)/.test(pathname)) return null;
  if (unset) {
    return (
      <aside aria-label="Installation mode not set" data-installation-banner="unset"
        className="border-b-2 border-alert bg-surface px-4 py-2 text-[13px] text-ink">
        <span className="text-alert underline underline-offset-2">Installation mode not set.</span>{' '}
        This server runs as a production installation, with no sample records. An administrator sets CIVICOS_MODE to production, training or demo.
      </aside>
    );
  }
  if (mode === 'production') return null;
  const training = mode === 'training';
  return (
    <aside aria-label={training ? 'Training installation' : 'Demonstration installation'} data-installation-banner={mode}
      className="border-b-2 border-warn bg-surface px-4 py-2 text-[13px] text-ink">
      <span className="underline underline-offset-2">{training ? 'Training installation:' : 'Demonstration installation:'}</span>{' '}
      nothing here is a real government record. Names, cases and figures are samples or simulations.
    </aside>
  );
}
