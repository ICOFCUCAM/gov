// Public — Ministry of Justice homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Justice — Official Portal' };

const THEME = {
  ink: '#1b1a26', inkSoft: '#2b2a40', primary: '#7a1f2b', accent: '#b48a3d',
  surface: '#faf7f0', surfaceMute: '#f0ead8', line: '#e0d6c0',
  emergencyA: '#c1252f', emergencyB: '#7a1f2b',
};

export default function PublicJusticePage({ searchParams }: { searchParams?: { preset?: string } }) {
  return (
    <PublicSite id="justice" theme={THEME} preset={searchParams?.preset}
      illustration={<HeroIllustration kind="scales" primary={THEME.primary} accent={THEME.accent} aria="Scales of justice" />} />
  );
}
