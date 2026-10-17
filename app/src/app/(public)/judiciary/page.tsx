// Public — Judicial Branch (Supreme & Constitutional Courts) homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Judicial Branch — Sovereign Courts' };

const THEME = {
  ink: '#1a1820', inkSoft: '#252330', primary: '#5a3768', accent: '#c9a24a',
  surface: '#faf8f5', surfaceMute: '#f1ecdd', line: '#e0d6c0',
  emergencyA: '#5a3768', emergencyB: '#3e2548',
};

export default function PublicJudiciaryPage({ searchParams }: { searchParams?: { preset?: string } }) {
  return (
    <PublicSite id="judiciary" theme={THEME} preset={searchParams?.preset}
      illustration={<HeroIllustration kind="gavel" primary={THEME.primary} accent={THEME.accent} aria="Gavel of the courts" />} />
  );
}
