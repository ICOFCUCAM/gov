import { CommandShell } from '@/components/ui/CommandShell';
import { SignatureAudit } from '@/components/features/SignatureAudit';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Signature Audit' };

export default function SignaturesPage() {
  return (
    <CommandShell active="signatures">
      <SignatureAudit />
    </CommandShell>
  );
}
