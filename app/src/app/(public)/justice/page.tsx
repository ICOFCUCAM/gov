// Public — Ministry of Justice homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Justice — Official Portal' };

const THEME = {
  ink: '#1b1a26', inkSoft: '#2b2a40', primary: '#7a1f2b', accent: '#b48a3d',
  surface: '#faf7f0', surfaceMute: '#f0ead8', line: '#e0d6c0',
  emergencyA: '#c1252f', emergencyB: '#7a1f2b',
};

export default function PublicJusticePage() {
  return (
    <PublicSiteShell {...siteProps('justice', {
      theme: THEME,
      illustration: <HeroIllustration kind="scales" primary={THEME.primary} accent={THEME.accent} aria="Scales of justice" />,
    })} />
  );
}
