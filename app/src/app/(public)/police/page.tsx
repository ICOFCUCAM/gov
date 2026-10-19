// Public — Police Command homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { siteRequest } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Police Command — Official Portal' };

const THEME = {
  ink: '#0b1a2c', inkSoft: '#13294b', primary: '#1e63b8', accent: '#3a82d0',
  surface: '#f4f6f9', surfaceMute: '#e8eef6', line: '#dde3ec',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default async function PublicPolicePage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PublicSite id="police" request={await siteRequest()} theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="shield" primary={THEME.primary} accent={THEME.accent} aria="Shield emblem of civil order" />} />
  );
}
