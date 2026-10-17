// Public — Ministry of Foreign Affairs homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Foreign Affairs — Official Portal' };

const THEME = {
  ink: '#0e1428', inkSoft: '#1a2240', primary: '#c9a24a', accent: '#3a6dac',
  surface: '#fbf9f1', surfaceMute: '#f1ebd2', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicForeignAffairsPage() {
  return (
    <PublicSiteShell {...siteProps('foreign-affairs', {
      theme: THEME,
      illustration: <HeroIllustration kind="globe" primary={THEME.primary} accent={THEME.accent} aria="World globe" />,
    })} />
  );
}
