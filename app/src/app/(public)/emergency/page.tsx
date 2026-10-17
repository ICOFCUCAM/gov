// Public — Emergency Response homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Emergency Response — Official Portal' };

const THEME = {
  ink: '#1a0f0f', inkSoft: '#2a1a1a', primary: '#c1252f', accent: '#e08a2b',
  surface: '#fdf6f6', surfaceMute: '#fae4e4', line: '#f3cccc',
  emergencyA: '#c1252f', emergencyB: '#7a1518',
};

export default function PublicEmergencyPage() {
  return (
    <PublicSiteShell {...siteProps('emergency', {
      theme: THEME,
      illustration: <HeroIllustration kind="siren" primary={THEME.primary} accent={THEME.accent} aria="Emergency siren" />,
    })} />
  );
}
