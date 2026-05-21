import { CommandShell } from '@/components/ui/CommandShell';
import { OfficerDirectory } from '@/components/features/OfficerDirectory';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Officer directory' };

export default function DirectoryPage() {
  return (
    <CommandShell active="directory">
      <OfficerDirectory />
    </CommandShell>
  );
}
