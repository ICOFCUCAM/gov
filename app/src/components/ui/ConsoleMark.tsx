'use client';

// The nation's mark in the console headers (CommandShell, Situation Room):
// its seal in its own colour, its name and motto, linking home to /command.
// Before setup the platform brand shows (CLAUDE.md, Branding). The seal keeps
// the nation's colour in crisis; crisis is shown by the frame around it, never
// by repainting the insignia. Colours: lib/theme/nation.ts (visible at 3:1,
// monogram at 4.5:1 on any nation colour).

import * as React from 'react';
import Link from 'next/link';
import { useNationBrand } from '@/components/features/cover/entry';
import { sealTile } from '@/lib/theme/nation';
import { TONE } from '@/lib/tone-palette';

export function ConsoleMark({ crisis = false, official = false }: { crisis?: boolean; official?: boolean }) {
  const brand = useNationBrand({ title: false });
  const tile = sealTile(brand.configured ? brand.accent : undefined);
  return (
    <Link href="/command" className="focus-ring flex min-w-0 items-center gap-2.5 no-underline">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] text-sm font-bold"
        style={{ backgroundColor: tile.fill, color: tile.ink, boxShadow: crisis ? `0 0 0 2px ${TONE.alert}` : 'inset 0 0 0 1px rgba(255,255,255,0.15)' }}>
        {brand.seal}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1.5 text-sm font-bold tracking-[0.12em] text-ink">
          <span className="max-w-[15rem] truncate">{brand.configured ? brand.name : 'CIVICOS'}</span>
          {official ? <span className="shrink-0 rounded-[3px] border border-line px-1 text-[8px] font-semibold tracking-[0.2em] text-ink-soft">OFFICIAL</span> : null}
        </span>
        <span className="block max-w-[15rem] truncate text-[9px] uppercase tracking-[0.16em] text-ink-muted">
          {brand.configured ? (brand.motto || brand.platform) : 'Sovereign Operating System'}
        </span>
      </span>
    </Link>
  );
}

/** "Powered by CivicOS" for the console's rail footer, once a nation wears its own identity. */
export function PoweredBy() {
  const brand = useNationBrand({ title: false });
  return brand.configured ? <div className="col-span-2 mt-1 text-[9px] uppercase tracking-[0.16em] text-ink-muted">Powered by CivicOS</div> : null;
}
