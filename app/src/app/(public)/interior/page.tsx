// Public — Ministry of Interior homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Interior — Official Portal' };

const THEME = {
  ink: '#15192a', inkSoft: '#222842', primary: '#5a6da6', accent: '#8a9bbe',
  surface: '#f4f6fa', surfaceMute: '#e6e9f3', line: '#d6dbe7',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicInteriorPage({ searchParams }: { searchParams?: { preset?: string } }) {
  return (
    <PublicSite id="interior" theme={THEME} preset={searchParams?.preset}
      illustration={<HeroIllustration kind="shield" primary={THEME.primary} accent={THEME.accent} aria="Interior shield emblem" />} />
  );
}
