'use client';

// Who keeps each register (lib/data/register-owners.ts, GET /api/platform/owners):
// for every register, the institution legally responsible for it (from the
// deployment profile, as "Who is responsible" above sets it), where its one
// authoritative record is kept, the one way it is changed, and every other
// copy with its role (mirror, fallback, retired); and how the copies kept in
// the shared database stand (records waiting to be copied, the last error).
// Read only: responsibility is changed above, storage by the platform itself.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { AUTHORITIES } from '@/lib/nation/deployment';

type LegalOwner = { kind: 'authority'; key: string } | { kind: 'institution'; note: string } | { kind: 'installation' };
interface Copy { where: string; what: string; role: 'mirror' | 'fallback' | 'retired'; note: string }
interface Register { id: string; name: string; owner: { where: 'platform'; keys: string[] } | { where: 'substrate'; objects: string[] }; api: string; copies: Copy[]; storage?: string }
interface Legal { id: string; name: string; legal: LegalOwner; institution?: string; named: boolean }
interface Mirror { configured: boolean; pending: number; written: number; failed: number; lastWriteAt: string | null; lastError: string | null }
export interface OwnersAnswer { registers: Register[]; legal: Legal[]; substrateMirror: Mirror }

const WHERE: Record<string, string> = { platform: 'the platform', substrate: 'the shared database', 'civic-api': 'the separate records service' };
const ROLE: Record<Copy['role'], string> = { mirror: 'copy', fallback: 'used only when the platform cannot answer', retired: 'retired, never written' };

/** The legal owner in plain words: the named institution, or why there is none. */
export function legalText(l: Legal | undefined, ministryName: (id: string) => string): string {
  if (!l) return 'Not recorded';
  if (l.legal.kind === 'installation') return 'The installation\'s national administrators';
  if (l.legal.kind === 'institution') return `Each record's own institution${l.legal.note ? ` (${l.legal.note})` : ''}`;
  const key = l.legal.key;
  const label = AUTHORITIES.find(a => a.key === key)?.label ?? key;
  return l.institution ? `${ministryName(l.institution)} (${label})` : `No institution named yet for ${label}`;
}

export function RegisterOwners() {
  const [a, setA] = React.useState<OwnersAnswer | null>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/platform/owners', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setA(j as OwnersAnswer); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
    fetch('/api/org/ministries', { cache: 'no-store' })
      .then(r => r.json()).then((j: { ministries?: { id: string; name: string }[] }) => setNames(Object.fromEntries((j.ministries ?? []).map(m => [m.id, m.name]))))
      .catch(() => setNames({}));
  }, []);
  const ministryName = (id: string) => names[id] ?? id;
  const unnamed = a?.legal.filter(l => !l.named).length ?? 0;

  return (
    <div id="register-keepers" className="scroll-mt-24">
      <Section title="Who keeps each register" meta={a ? `${a.registers.length} registers${unnamed ? ` · ${unnamed} without a named institution` : ''}` : undefined}>
        <p className="mb-2 max-w-3xl text-xs text-ink-muted">
          Each register has one owner holding the authoritative record and one way to change it. Every other copy is a copy of it, never a second source.
          The legally responsible institution comes from the choices above.
        </p>
        {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
        {a ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="register-owners">
                <thead><tr><th scope="col">Register</th><th scope="col">Legally responsible</th><th scope="col">Authoritative record</th><th scope="col">Changed only through</th><th scope="col">Other copies</th></tr></thead>
                <tbody>
                  {a.registers.map(r => {
                    const l = a.legal.find(x => x.id === r.id);
                    return (
                      <tr key={r.id} className="border-t border-line align-top">
                        <td className="py-1 pe-2 font-medium">{r.name}</td>
                        <td className={`py-1 pe-2 ${l && !l.named ? 'text-warn' : ''}`}>{legalText(l, ministryName)}</td>
                        <td className="py-1 pe-2">{WHERE[r.owner.where] ?? r.owner.where}</td>
                        <td className="py-1 pe-2 font-mono text-xs">{r.api}</td>
                        <td className="py-1 text-xs">
                          {r.copies.length ? (
                            <ul>{r.copies.map((c, i) => <li key={i} title={c.note}>{WHERE[c.where] ?? c.where}: {ROLE[c.role]}</li>)}</ul>
                          ) : <span className="text-ink-muted">none</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p role="status" className="text-xs text-ink-muted" data-testid="mirror-status">
              Copies in the shared database: {a.substrateMirror.configured
                ? `${a.substrateMirror.written} written, ${a.substrateMirror.pending} waiting${a.substrateMirror.failed ? `, ${a.substrateMirror.failed} failed attempts` : ''}${a.substrateMirror.lastWriteAt ? `; last written ${new Date(a.substrateMirror.lastWriteAt).toLocaleString()}` : ''}${a.substrateMirror.lastError ? `; last error: ${a.substrateMirror.lastError}` : ''}.`
                : 'not connected on this installation (the platform\'s own records are the registers).'}
            </p>
          </>
        ) : !err ? <p className="text-sm text-ink-muted">Loading…</p> : null}
      </Section>
    </div>
  );
}
