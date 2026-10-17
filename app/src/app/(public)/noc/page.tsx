// Public — National Operations Centre homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Operations Centre — Public Briefing Portal' };

const THEME = {
  ink: '#0a0f14', inkSoft: '#121821', primary: '#2e7e8d', accent: '#5bbfd0',
  surface: '#f4f6f8', surfaceMute: '#e6edf2', line: '#cdd9e0',
  emergencyA: '#c1252f', emergencyB: '#7a161c',
};

export default function PublicNocPage() {
  return (
    <PublicSiteShell {...siteProps('noc', {
      theme: THEME,
      illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="National operations centre" />,
    })} />
  );
}
