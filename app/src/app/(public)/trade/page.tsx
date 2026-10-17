// Public — Ministry of Trade homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Trade & Industry — Official Portal' };

const THEME = {
  ink: '#1a1c25', inkSoft: '#272a36', primary: '#b58a35', accent: '#e07a3a',
  surface: '#faf8f1', surfaceMute: '#f1ead4', line: '#dfd5b7',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicTradePage({ searchParams }: { searchParams?: { preset?: string } }) {
  return (
    <PublicSite id="trade" theme={THEME} preset={searchParams?.preset}
      illustration={<HeroIllustration kind="tower" primary={THEME.primary} accent={THEME.accent} aria="Industrial corridor" />} />
  );
}
