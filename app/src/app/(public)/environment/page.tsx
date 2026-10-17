// Public — Ministry of Environment homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Environment — Official Portal' };

const THEME = {
  ink: '#0e2a1e', inkSoft: '#173a2a', primary: '#1f8a5a', accent: '#6fcf6a',
  surface: '#f4f9f5', surfaceMute: '#e3f0e7', line: '#cfe3d5',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicEnvironmentPage() {
  return (
    <PublicSiteShell {...siteProps('environment', {
      theme: THEME,
      illustration: <HeroIllustration kind="leaf" primary={THEME.primary} accent={THEME.accent} aria="Leaf of biosphere" />,
    })} />
  );
}
