// Public — Citizen Super-Portal homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Citizen Super-Portal — Every Ministry, One Wallet' };

const THEME = {
  ink: '#0d1820', inkSoft: '#283645', primary: '#0e7676', accent: '#b8460e',
  surface: '#f7f4ee', surfaceMute: '#f0ebe0', line: '#e0d6c4',
  emergencyA: '#b8460e', emergencyB: '#7a2e08',
};

export default function PublicPortalPage() {
  return (
    <PublicSiteShell {...siteProps('portal', {
      theme: THEME,
      illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Citizen wallet" />,
    })} />
  );
}
