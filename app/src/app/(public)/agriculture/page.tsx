// Public — Ministry of Agriculture homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Agriculture & Food Security — Official Portal' };

const THEME = {
  ink: '#2a1d0e', inkSoft: '#3d2a14', primary: '#7a5a18', accent: '#d9b76a',
  surface: '#fbf8ef', surfaceMute: '#f3eccf', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicAgriculturePage({ searchParams }: { searchParams?: { preset?: string } }) {
  return (
    <PublicSite id="agriculture" theme={THEME} preset={searchParams?.preset}
      illustration={<HeroIllustration kind="wheat" primary={THEME.primary} accent={THEME.accent} aria="Wheat stalks" />} />
  );
}
