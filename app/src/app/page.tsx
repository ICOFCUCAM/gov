import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold leading-tight">CivicOS</h1>
        <p className="text-lg text-ink-soft max-w-2xl">
          Sovereign operational platform — citizen wallet, officer console,
          ministry control, and command center, in one coherent application.
        </p>
        <p className="text-base text-ink-muted max-w-2xl">
          Built per Companions 152–158. The four sentences govern: <strong>
            Humans govern. Institutions govern. Constitutions govern. AI assists.
          </strong>
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-xl font-semibold mb-1">Civic Wallet</h2>
          <p className="text-ink-muted mb-3">
            Citizen-facing surface — receipts, services, records, the Civic
            Assistant, contestation in two taps.
          </p>
          <Link href="/wallet">
            <Button>Open the wallet →</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-1">Officer Console</h2>
          <p className="text-ink-muted mb-3">
            Three-pane workspace with AI Copilot. Decision Class banner persists.
            The officer signs every binding decision.
          </p>
          <Link href="/console">
            <Button>Open the console →</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-1">Ministry Control</h2>
          <p className="text-ink-muted mb-3">
            Director General's daily control room: service outcomes, equity
            stratification, constitutional officer findings, civil society.
          </p>
          <Link href="/control">
            <Button>Open the control room →</Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-1">NCCC Wall</h2>
          <p className="text-ink-muted mb-3">
            National Command and Coordination Center operations wall. AI
            scenarios labeled. Authorities sign their own remits.
          </p>
          <Link href="/wall">
            <Button>Open the wall →</Button>
          </Link>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Phase 1 — Foundational public platform</h2>
        <p className="text-ink-muted max-w-2xl">
          Per Companion 159, the platform ships phase by phase. Phase 1 is live
          in the codebase: identity, permits, payments, documents, signatures,
          notifications, and municipal onboarding — all on a typed API.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login"><Button variant="secondary">Sign-in flow →</Button></Link>
          <Link href="/wallet/permits"><Button variant="secondary">Permits →</Button></Link>
          <Link href="/wallet/payments"><Button variant="secondary">Payments →</Button></Link>
          <Link href="/wallet/documents"><Button variant="secondary">Verify a document →</Button></Link>
          <Link href="/admin/onboarding"><Button variant="secondary">Municipal onboarding →</Button></Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Operational roles</h2>
        <p className="text-ink-muted max-w-2xl">
          Each role gets a purpose-built, uncluttered workspace. The officer
          queue is a real review→decide loop wired to the API; the auditor
          view is read-only and tamper-evident.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/console"><Button variant="secondary">Officer queue →</Button></Link>
          <Link href="/ops"><Button variant="secondary">Operations centre →</Button></Link>
          <Link href="/control"><Button variant="secondary">Ministry operations →</Button></Link>
          <Link href="/audit"><Button variant="secondary">Auditor oversight →</Button></Link>
          <Link href="/integrations"><Button variant="secondary">Interoperability →</Button></Link>
          <Link href="/platform"><Button variant="secondary">Platform operations →</Button></Link>
          <Link href="/developers"><Button variant="secondary">Developer guide →</Button></Link>
        </div>
      </section>

      <footer className="text-center text-sm text-ink-muted pt-8 border-t border-line">
        No tracking. No analytics. No third-party scripts.
        Sovereign-portable.
      </footer>
    </main>
  );
}
