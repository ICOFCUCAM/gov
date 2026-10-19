// Public — Presidency / Cabinet Office homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { siteRequest } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';
import { getSovereign, getSetup } from '@/lib/data/store';
import { nationOffices } from '@/lib/nation/offices';

export const dynamic = 'force-dynamic';

const offices = () => nationOffices(getSovereign(), !!getSetup());
export function generateMetadata() {
  return { title: `${offices().executiveOffice} & Cabinet — Official Portal` };
}

const THEME = {
  ink: '#0a1326', inkSoft: '#142042', primary: '#1f3a7a', accent: '#c9a24a',
  surface: '#f7f5ee', surfaceMute: '#ede6d2', line: '#dcd2b6',
  emergencyA: '#1f3a7a', emergencyB: '#0a1326',
};

export default async function PublicPresidencyPage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PublicSite id="presidency" request={await siteRequest()} theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Executive mansion" />} />
  );
}
