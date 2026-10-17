// Public — Ministry of Foreign Affairs homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Foreign Affairs — Official Portal' };

const THEME = {
  ink: '#0e1428', inkSoft: '#1a2240', primary: '#c9a24a', accent: '#3a6dac',
  surface: '#fbf9f1', surfaceMute: '#f1ebd2', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicForeignAffairsPage({ searchParams }: { searchParams?: { preset?: string } }) {
  return (
    <PublicSite id="foreign-affairs" theme={THEME} preset={searchParams?.preset}
      illustration={<HeroIllustration kind="globe" primary={THEME.primary} accent={THEME.accent} aria="World globe" />} />
  );
}
