'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';
import { useIdentity } from '@/components/identity/useIdentity';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);

interface PreviewRow {
  email: string; name: string; charter_id: string; role: string; title: string | null;
  valid: boolean;
}

interface ResultRow {
  email: string; name: string; charter_id: string; role: string;
  officer_id: string | null; status: 'created' | 'failed'; error: string | null;
}

/** Client-side preview parse (the server re-parses authoritatively). */
function parsePreview(text: string): { rows: PreviewRow[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], error: 'empty CSV' };
  const header = lines[0]!.split(',').map(c => c.trim().toLowerCase());
  for (const k of ['email', 'name', 'charter_id', 'role']) {
    if (!header.includes(k)) return { rows: [], error: `missing header column: ${k}` };
  }
  const idx = (k: string) => header.indexOf(k);
  const rows = lines.slice(1).map(line => {
    const c = line.split(',').map(s => s.trim());
    const row: PreviewRow = {
      email: c[idx('email')] ?? '',
      name: c[idx('name')] ?? '',
      charter_id: c[idx('charter_id')] ?? '',
      role: c[idx('role')] ?? '',
      title: idx('title') >= 0 ? (c[idx('title')] ?? null) : null,
      valid: false,
    };
    row.valid = !!(row.email && row.name && row.charter_id && row.role);
    return row;
  });
  return { rows, error: null };
}

/**
 * BulkOfficerOnboarding — paste/drop a CSV of officers, preview it,
 * submit to /api/admin/officers/bulk under the signed-in platform-tier
 * session. The route verifies the session's platform-tier role
 * server-side and runs civicos_admin_bulk_create_officers via the
 * service-role client; the per-row {status,error} envelope comes back
 * for display.
 */
export function BulkOfficerOnboarding() {
  const { actor, session, ready } = useIdentity();
  const [raw, setRaw] = React.useState('email,name,charter_id,role,title\n');
  const [results, setResults] = React.useState<ResultRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const preview = React.useMemo(() => parsePreview(raw), [raw]);
  const validCount = preview.rows.filter(r => r.valid).length;

  const isPlatform = !!actor && actor.kind === 'officer' && PLATFORM_ROLES.has(actor.role ?? '');

  function onFile(file: File) {
    const r = new FileReader();
    r.onload = () => setRaw(String(r.result ?? ''));
    r.readAsText(file);
  }

  async function submit() {
    setError(null);
    setResults(null);
    const token = session?.access_token;
    if (!token) { setError('no active session'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/officers/bulk', {
        method: 'POST',
        headers: { 'content-type': 'text/csv', authorization: `Bearer ${token}` },
        body: raw,
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? `request failed (${res.status})`); return; }
      setResults(json.results as ResultRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p className="text-[11px] text-ink-muted">Resolving identity…</p>;

  if (!isPlatform) {
    return (
      <Panel title="Bulk Officer Onboarding" meta="platform-tier only" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          This surface requires a platform-tier role (platform-admin,
          noc-officer, cabinet-officer, or auditor). You are signed in as{' '}
          <span className="font-mono">{actor ? `${actor.role ?? actor.kind}` : 'anonymous'}</span>.
        </p>
      </Panel>
    );
  }

  const created = results?.filter(r => r.status === 'created').length ?? 0;
  const failed = (results?.length ?? 0) - created;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Bulk Officer Onboarding" badge="platform-tier · service-role write" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            load .csv
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.currentTarget.files?.[0]; if (f) onFile(f); }} />
          <button type="button" onClick={() => void submit()}
            disabled={busy || validCount === 0 || !!preview.error}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            {busy ? 'onboarding…' : `onboard ${validCount}`}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-ink-muted">
        CSV header: <code className="font-mono">email,name,charter_id,role,title</code> (title optional).
        Existing emails are upserted (re-activated, role/charter updated). Each row
        succeeds or fails independently — one bad row won&apos;t block the rest.
      </p>

      <div onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className="rounded-[3px] border border-dashed border-line bg-bg p-2">
        <textarea value={raw} onChange={e => setRaw(e.currentTarget.value)} rows={8} spellCheck={false}
          className="block w-full rounded-[3px] border border-line bg-surface px-2 py-1 font-mono text-[10px]" />
      </div>

      {preview.error ? (
        <p className="font-mono text-[10px]" style={{ color: TONE.alert }}>{preview.error}</p>
      ) : (
        <Panel title="Preview" meta={`${validCount}/${preview.rows.length} valid`} bodyClass="!p-0">
          {preview.rows.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-ink-muted">Add rows below the header.</p>
          ) : (
            <div className="max-h-[220px] overflow-y-auto">
              {preview.rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-1 text-[10px] last:border-0">
                  <span className="w-4 shrink-0 text-center" style={{ color: r.valid ? TONE.ok : TONE.alert }}>
                    {r.valid ? '✓' : '✗'}
                  </span>
                  <span className="w-48 shrink-0 truncate font-mono text-ink">{r.email || '(no email)'}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                  <span className="w-24 shrink-0 truncate font-mono text-link">{r.charter_id}</span>
                  <span className="w-24 shrink-0 truncate text-right text-ink-muted">{r.role}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {error ? (
        <Panel title="Error" meta="onboarding failed" bodyClass="!p-3">
          <p className="font-mono text-[10px]" style={{ color: TONE.alert }}>{error}</p>
        </Panel>
      ) : null}

      {results ? (
        <Panel title="Results" meta={`${created} created · ${failed} failed`} bodyClass="!p-0">
          <div className="max-h-[320px] overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="border-b border-line-soft px-3 py-1.5 text-[10px] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-center" style={{ color: r.status === 'created' ? TONE.ok : TONE.alert }}>
                    {r.status === 'created' ? '✓' : '✗'}
                  </span>
                  <span className="w-48 shrink-0 truncate font-mono text-ink">{r.email}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                  <span className="w-24 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: r.status === 'created' ? TONE.ok : TONE.alert }}>
                    {r.status}
                  </span>
                </div>
                {r.error ? <p className="mt-0.5 pl-6 font-mono text-[9px]" style={{ color: TONE.alert }}>{r.error}</p> : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
