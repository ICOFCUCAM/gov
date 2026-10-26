// The API contract (/gov/exchange/contract; plan I9): every endpoint of this
// installation by family, generated from the route files with the OpenAPI
// document (scripts/build-openapi.mjs → src/lib/api/api-contract.json): its
// operation, how a caller authenticates, the permission rule, whether it reads
// a stated purpose, the refusal codes, idempotency, rate limits and audit.
// Read only; the full description is at /api/openapi.

import contract from '@/lib/api/api-contract.json';
import { Section } from '@/components/ui/DataSystem';

type Endpoint = { path: string; method: string; family: string; operation: string; authentication: string[]; permission: string; purpose: string; refusals: number[]; idempotency: string; rateLimit: string; audit: string };
const AUTH: Record<string, string> = {
  officialSession: 'Official\'s session', integrationKey: 'Integration key', integrationClient: 'Integration id and key', integrationToken: 'Access token',
  feedKey: 'Feed key', automation: 'Machine secret', agentCredential: 'Agent credential', metricsToken: 'Metrics token', public: 'Public',
};

export function ApiContract({ family }: { family?: string }) {
  const endpoints = contract.endpoints as Endpoint[];
  const families = contract.families as { family: string; means: string; endpoints: number; paths: number }[];
  const shown = family ? families.filter(f => f.family === family) : families;
  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        Every endpoint of this installation, grouped by family, as its route files declare it. The existence of an endpoint never means public
        access: each names how a caller authenticates and the permission rule that decides. Generated with the{' '}
        <a className="text-link underline underline-offset-2" href="/api/openapi">OpenAPI description</a>; never written by hand.
      </p>
      <nav aria-label="Endpoint families" className="flex flex-wrap gap-1 text-xs">
        <a className={`rounded border border-line px-2 py-0.5 ${!family ? 'font-semibold' : ''}`} href="/gov/exchange/contract">All ({endpoints.length})</a>
        {families.map(f => <a key={f.family} className={`rounded border border-line px-2 py-0.5 ${family === f.family ? 'font-semibold' : ''}`} href={`/gov/exchange/contract?family=${f.family}`}>{f.family} ({f.endpoints})</a>)}
      </nav>
      {shown.map(f => (
        <Section key={f.family} title={f.family} meta={`${f.endpoints} endpoints · ${f.paths} paths · ${f.means}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr><th scope="col">Endpoint</th><th scope="col">Authentication</th><th scope="col">Permission</th><th scope="col">Purpose</th><th scope="col">Refusals</th><th scope="col">Idempotency · rate · audit</th></tr></thead>
              <tbody>
                {endpoints.filter(e => e.family === f.family).map(e => (
                  <tr key={`${e.method} ${e.path}`} className="border-t border-line align-top">
                    <td className="font-mono">{e.method} {e.path}</td>
                    <td>{e.authentication.map(a => AUTH[a] ?? a).join(', ')}</td>
                    <td>{e.permission}</td>
                    <td>{e.purpose}</td>
                    <td className="tabular-nums">{e.refusals.join(' ') || '—'}</td>
                    <td>{e.idempotency} · {e.rateLimit} · {e.audit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </div>
  );
}
