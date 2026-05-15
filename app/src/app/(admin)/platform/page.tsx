import { CommandShell } from '@/components/ui/CommandShell';
import { PlatformConsole } from './PlatformConsole';

export const dynamic = 'force-dynamic';

export default function PlatformPage() {
  return (
    <CommandShell active="plat">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">Platform operations</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        Releases, deployments, tenant lifecycle, backups, and signed
        configuration. Every change is gated, reversible, and audited —
        humans approve, the platform records.
      </p>
      <PlatformConsole />
    </CommandShell>
  );
}
