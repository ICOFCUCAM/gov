import { CommandShell } from '@/components/ui/CommandShell';
import { CommandHeading } from '@/components/ui/Telemetry';
import { InteropConsole } from './InteropConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Interoperability' };


export default function IntegrationsPage() {
  return (
    <CommandShell active="intg">
      <div className="space-y-2">
        <CommandHeading title="Interoperability" sub="Controlled federation · scoped integrations · signed webhooks — nothing connects implicitly." />
        <p className="text-[13px] text-ink-soft">
          Building against this platform? Every endpoint is described in{' '}
          <a href="/api/openapi" className="text-link underline underline-offset-2">OpenAPI 3.1 (JSON)</a>, generated from the route files.
        </p>
        <InteropConsole />
      </div>
    </CommandShell>
  );
}
