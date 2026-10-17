// Public — Ministry of Transport homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Transport & Mobility — Official Portal' };

const THEME = {
  ink: '#0a1622', inkSoft: '#13243a', primary: '#1f6bcc', accent: '#5fc4f0',
  surface: '#f4f8fc', surfaceMute: '#e3eef9', line: '#d4e0ee',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicTransportPage() {
  return (
    <PublicSiteShell {...siteProps('transport', {
      theme: THEME,
      illustration: <HeroIllustration kind="wheel" primary={THEME.primary} accent={THEME.accent} aria="Transport wheel" />,
    })} />
  );
}
