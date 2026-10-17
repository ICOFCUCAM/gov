// Public — Senate (Upper House) homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { siteProps } from '@/apps/_shared/public/site-props';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';
import { getSovereign, getSetup } from '@/lib/data/store';
import { nationOffices } from '@/lib/nation/offices';

export const dynamic = 'force-dynamic';
// The upper chamber's name follows the nation's constitution (reference wording until setup).
const upper = () => nationOffices(getSovereign(), !!getSetup()).upperChamber ?? 'Senate';
export function generateMetadata() {
  return { title: `${upper()} — Upper House of the Legislature` };
}

const THEME = {
  ink: '#1a1326', inkSoft: '#2a2042', primary: '#7a4d8a', accent: '#c9a24a',
  surface: '#faf6f5', surfaceMute: '#f0e6e9', line: '#dccfd5',
  emergencyA: '#7a4d8a', emergencyB: '#5a3768',
};

export default function PublicSenatePage() {
  return (
    <PublicSiteShell {...siteProps('senate', {
      theme: THEME,
      illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Senate chamber" />,
    })} />
  );
}
