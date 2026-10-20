import { CommandShell } from '@/components/ui/CommandShell';
import { EducationRegister } from '@/components/features/EducationRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Education' };

export default function Page() {
  return (
    <CommandShell active="civil">
      <EducationRegister />
    </CommandShell>
  );
}
