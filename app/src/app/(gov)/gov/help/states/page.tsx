import { CommandShell } from '@/components/ui/CommandShell';
import { StateGallery } from '@/components/features/StateGallery';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Screen states' };

// Plan step I10: every shared console component in every state (loading,
// empty, refused, out of date …) on every ground, with keyboard focus. A tab
// of Help (lib/nav/console-nav.ts); checked by component-states.test.ts and
// the console accessibility audit.
export default function ScreenStatesPage() {
  return (
    <CommandShell active="help">
      <StateGallery />
    </CommandShell>
  );
}
