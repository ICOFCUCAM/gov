import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Plain } from '@/components/ui/Plain';
export const metadata = { title: 'Developer Guide' };


export default function DevelopersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <p><Link href="/" className="text-link underline underline-offset-2">← Home</Link></p>
        <h1 className="mt-2 text-3xl font-semibold">Developer & integration guide</h1>
        <p className="mt-2 text-ink-muted">
          How trusted systems integrate with CivicOS. Disciplined by design —
          this is not an open data firehose.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">1. Get registered</h2>
        <p>
          A ministry or municipality operator registers your system in the{' '}
          <Link href="/integrations" className="text-link underline underline-offset-2">
            interoperability console
          </Link>{' '}
          with the minimum scopes you need. You receive an API key{' '}
          <strong>once</strong>. Your client stays <strong>PENDING</strong>{' '}
          until an operator approves it — institutional coordination, human-governed.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">2. Authenticate</h2>
        <Card tight>
          <pre tabIndex={0} aria-label="Example request" className="overflow-x-auto text-sm"><code>{`curl https://<installation>/api/permits \\
  -H "cookie: civicos_official=<signed session>"`}</code></pre>
        </Card>
        <p className="text-sm text-ink-muted">
          Today the API answers signed-in sessions: officials sign in at /sign-in and the server sets a
          signed session. Scoped credentials for outside systems (issued under Connected systems) and
          single sign-on with the nation&rsquo;s own identity provider are planned (integration register 15.4, 16.9).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">3. Contract & versioning</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Every endpoint is described in OpenAPI 3.1 at <code>/api/openapi</code>, generated from the code — the single source of truth.</li>
          <li>Map data from the national data register is served as OGC API – Features at <code>/api/twin/ogc</code> (GeoJSON).</li>
          <li>Endpoints are not versioned yet; version prefixes, deprecation notices and rate limits are planned.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">4. Events (webhooks)</h2>
        <p>
          Subscribe to topics (e.g. <code>civicos.permit.decided</code>).
          Deliveries are HMAC-SHA256 signed over{' '}
          <code>{'`${timestamp}.${body}`'}</code>. Verify the signature and
          reject timestamps older than 300 seconds (replay protection).
          Delivery is at-least-once via the transactional outbox — make your
          consumer idempotent on the event id.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">5. Federation</h2>
        <Plain>
          Cross-tenant access is <strong>default deny</strong>. A grant must be
          explicitly proposed and approved by the receiving tenant, scoped, and
          unexpired. If the policy store is unreachable, access checks fail
          closed.
        </Plain>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">6. Sandbox</h2>
        <p className="text-sm text-ink-muted">
          Every sovereign deployment runs a sandbox tenant with synthetic data
          and the same contract. Test against the sandbox before requesting
          production approval. No production citizen data is ever used for
          integration testing.
        </p>
      </section>
    </main>
  );
}
