import { CommandShell } from '@/components/ui/CommandShell';
import { EventWebhooks } from '@/components/features/EventWebhooks';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Federation Webhooks' };

export default function WebhooksPage() {
  return (
    <CommandShell active="webhooks">
      <EventWebhooks />
    </CommandShell>
  );
}
