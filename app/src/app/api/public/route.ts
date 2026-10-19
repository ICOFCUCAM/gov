// /api/public — discovery index for the CivicOS open-data API. Lists the
// available machine-readable endpoints so a consumer can find them without
// scraping. Static, long-cached. No auth.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  return NextResponse.json(
    {
      document: 'civicos.public_open_data_index',
      version: 1,
      generated_at: new Date().toISOString(),
      endpoints: [
        {
          path: '/api/public/accountability',
          description: 'Per-charter service SLA, appeals pipeline, and decision-time trend (aggregate).',
          params: { days: '1–365 (default 90)', charter: 'optional charter_id filter', weeks: 'optional trend length, 1–104 (default days/7)', directive_days: 'governance-output window, 1–1825 (default 365)', only: "'directives' for the governance output alone" },
          url: `${base}/api/public/accountability`,
        },
        {
          path: '/api/public/charters',
          description: 'Directory of institutions from the platform register (charter_id, label, kind, domain, activation); activated ones by default.',
          params: { activated: "'any' for every charter, 'false' for idle ones", kind: 'optional kind filter', charter: 'optional charter_id filter', q: 'optional text in id, label or domain' },
          url: `${base}/api/public/charters`,
        },
        {
          path: '/api/public/telemetry',
          description: 'Catalog of active telemetry streams (metadata only; no sample values).',
          url: `${base}/api/public/telemetry`,
        },
        {
          path: '/api/public/directives',
          description: 'Public directives (signed / effective / rescinded / published).',
          params: { issuer: 'optional charter_id filter' },
          url: `${base}/api/public/directives`,
        },
      ],
      notes: 'All endpoints are aggregate/metadata only — no citizen identifiers or row-level records. Chain integrity is verifiable via civicos_verify_audit_chain.',
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
