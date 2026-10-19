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
        <p className="text-sm text-ink-muted">
          GIS clients read the national twin&rsquo;s map services (OGC API &ndash; Features at <code>/api/twin/ogc</code>,
          SensorThings at <code>/api/twin/sta/v1.1</code>, vector tiles at <code>/api/twin/tiles</code>) with an
          integration key holding the scope <code>ogc:read</code>, approved by an administrator under Connected systems.
          Send it as a header, never in the address: in QGIS an &ldquo;API Header&rdquo; authentication configuration
          (<code>Authorization</code> = <code>Bearer civ_&hellip;</code>); in GDAL the <code>GDAL_HTTP_HEADERS</code> setting;
          in ArcGIS Pro a custom request header on the OGC API server connection. Restricted sites reach a key as they
          reach the public: generalised.
        </p>
        <Card tight>
          <pre tabIndex={0} aria-label="Example GIS request" className="overflow-x-auto text-sm"><code>{`GDAL_HTTP_HEADERS="Authorization: Bearer civ_<key>" \\
  ogrinfo OAPIF:https://<installation>/api/twin/ogc facilities`}</code></pre>
        </Card>
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

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">7. Case systems</h2>
        <Plain>
          A ministry&rsquo;s own case system can keep its cases in the platform&rsquo;s queue. An official connects the
          system under My work › Load cases and receives its key (<code>ccf_…</code>) once.
        </Plain>
        <p className="text-sm text-ink-muted">
          <code>POST /api/org/ministries/&#123;id&#125;/queue/feed</code> with <code>Authorization: Bearer ccf_…</code> and
          {' '}<code>{'{ "cases": [{ "reference", "subject", "received", "region"?, "priority"?, "assignee"?, "note"?, "state"? }] }'}</code>:
          new references are added under the same checks as a loaded file; references the same system sent before are
          updated (<code>state</code>: open, assigned, escalated or closed); every case is answered as added, updated,
          unchanged or refused with its reason. Re-sending a case is safe. <code>GET …/queue/feed?since=&lt;date-time&gt;</code>
          returns what officials did to the system&rsquo;s cases since then. Up to 5,000 cases or 2 MB per call; every call is
          audited. The full description is at <code>/api/openapi</code>.
        </p>
      </section>
    </main>
  );
}
