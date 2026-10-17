// Public — National Operations Centre homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Operations Centre — Public Briefing Portal' };

const THEME = {
  ink: '#0a0f14', inkSoft: '#121821', primary: '#2e7e8d', accent: '#5bbfd0',
  surface: '#f4f6f8', surfaceMute: '#e6edf2', line: '#cdd9e0',
  emergencyA: '#c1252f', emergencyB: '#7a161c',
};

export default function PublicNocPage({ searchParams }: { searchParams?: { preset?: string; preview?: string } }) {
  return (
    <PublicSite id="noc" theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="National operations centre" />} />
  );
}
