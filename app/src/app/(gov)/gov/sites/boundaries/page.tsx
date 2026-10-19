import { CommandShell } from '@/components/ui/CommandShell';
import { BoundariesPanel } from '@/components/features/sites/BoundariesPanel';
import { DistrictPackPanel } from '@/components/features/sites/DistrictPackPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Boundaries' };

export default function BoundariesPage() {
  return (
    <CommandShell active="twin">
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <header>
          <h1 className="text-[22px] font-semibold text-ink">Boundaries</h1>
          <p className="text-[14px] text-ink-soft">The nation&rsquo;s own regions and districts as its mapping authority publishes them. Every map draws the version in force and names its source.</p>
        </header>
        <DistrictPackPanel />
        <BoundariesPanel />
      </div>
    </CommandShell>
  );
}
