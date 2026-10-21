import { CommandShell } from '@/components/ui/CommandShell';
import { MedicinesRegister } from '@/components/features/MedicinesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Medicines and medical devices' };

export default function Page() {
  return (
    <CommandShell active="civil">
      <MedicinesRegister />
    </CommandShell>
  );
}
