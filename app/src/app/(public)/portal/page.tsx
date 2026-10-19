// Public — Citizen Super-Portal homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { siteRequest } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Citizen Super-Portal — Every Ministry, One Wallet' };

const THEME = {
  ink: '#0d1820', inkSoft: '#283645', primary: '#0e7676', accent: '#b8460e',
  surface: '#f7f4ee', surfaceMute: '#f0ebe0', line: '#e0d6c4',
  emergencyA: '#b8460e', emergencyB: '#7a2e08',
};

export default async function PublicPortalPage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PublicSite id="portal" request={await siteRequest()} theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Citizen wallet" />} />
  );
}
