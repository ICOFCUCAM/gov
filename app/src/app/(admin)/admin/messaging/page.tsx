import { CommandShell } from '@/components/ui/CommandShell';
import { MessagingAdmin } from '@/components/features/MessagingAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email and text messages' };

// The providers that send the platform's email and SMS (lib/messaging) and
// where messages stand. Administrators only (behind sign-in).
export default function MessagingPage() {
  return (
    <CommandShell active="intg">
      <MessagingAdmin />
    </CommandShell>
  );
}
