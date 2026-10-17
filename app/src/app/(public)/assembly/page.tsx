// Public — National Assembly (Lower House) homepage.

import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';
import { getSovereign, getSetup } from '@/lib/data/store';
import { nationOffices } from '@/lib/nation/offices';

export const dynamic = 'force-dynamic';
// Chamber names follow the nation's constitution (reference wording until setup).
const chamber = () => {
  const o = nationOffices(getSovereign(), !!getSetup());
  return { name: o.primaryChamber, house: o.upperChamber ? 'Lower House' : 'The Legislature', short: o.primaryChamber === 'National Assembly' ? 'Assembly' : o.primaryChamber };
};
export function generateMetadata() {
  const c = chamber();
  return { title: `${c.name} — ${c.house === 'Lower House' ? 'Lower House of the Legislature' : 'The Legislature'}` };
}

const THEME = {
  ink: '#0e1e26', inkSoft: '#163040', primary: '#0f6e6a', accent: '#1f9d63',
  surface: '#f4f9f7', surfaceMute: '#e3f0eb', line: '#cfe3da',
  emergencyA: '#0f6e6a', emergencyB: '#0a4f4c',
};

export default function PublicAssemblyPage({ searchParams }: { searchParams?: { preset?: string; preview?: string } }) {
  return (
    <PublicSite id="assembly" theme={THEME} preset={searchParams?.preset} preview={searchParams?.preview}
      illustration={<HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Assembly chamber" />} />
  );
}
