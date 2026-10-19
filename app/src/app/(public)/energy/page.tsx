// Public — Ministry of Energy homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { siteRequest } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Energy — Official Portal' };

const THEME = {
  ink: '#1b1408', inkSoft: '#2a1f0e', primary: '#c97a1f', accent: '#e0a13a',
  surface: '#fbf6ee', surfaceMute: '#f3ead7', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default async function PublicEnergyPage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PublicSite id="energy" request={await siteRequest()} theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="bolt" primary={THEME.primary} accent={THEME.accent} aria="Lightning bolt of the grid" />} />
  );
}
