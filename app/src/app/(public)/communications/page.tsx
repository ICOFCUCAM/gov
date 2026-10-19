// Public — Communications & Digital Infrastructure homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { siteRequest } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Communications & Digital Infrastructure — Official Portal' };

const THEME = {
  ink: '#0a1424', inkSoft: '#15233f', primary: '#3a82d0', accent: '#5fc4f0',
  surface: '#f4f8fc', surfaceMute: '#e3eef9', line: '#d4e0ee',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default async function PublicCommunicationsPage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PublicSite id="communications" request={await siteRequest()} theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="satellite" primary={THEME.primary} accent={THEME.accent} aria="Satellite network" />} />
  );
}
