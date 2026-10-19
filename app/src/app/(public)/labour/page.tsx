// Public — Ministry of Labour homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { siteRequest } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Labour & Social Protection — Official Portal' };

const THEME = {
  ink: '#11192b', inkSoft: '#1d2540', primary: '#3a6dac', accent: '#5fa8ff',
  surface: '#f4f6fa', surfaceMute: '#e3ebf7', line: '#d6dce9',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default async function PublicLabourPage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PublicSite id="labour" request={await siteRequest()} theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="wave" primary={THEME.primary} accent={THEME.accent} aria="Workforce flow" />} />
  );
}
