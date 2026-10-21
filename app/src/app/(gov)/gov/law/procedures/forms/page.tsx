import { CommandShell } from '@/components/ui/CommandShell';
import { FormDesigner } from '@/components/features/forms/FormDesigner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Forms' };

/** The form designer and the form registry's publication gates (plan step I1). */
export default function FormsPage() {
  return (
    <CommandShell active="law">
      <FormDesigner />
    </CommandShell>
  );
}
