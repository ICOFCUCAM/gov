// CivicOS — local Audit Vault (client-side stub).
// Production deployments anchor to the sovereign Audit Vault (Companion 06).
// This client-side helper persists contestations and signatures locally
// for the prototype only.

'use client';

type Entry = { type: string; payload: unknown; ts: string };

const KEY = 'civicos:audit';

function read(): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: Entry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* swallow — prototype only */
  }
}

export function appendAuditEntry(type: string, payload: unknown): Entry {
  const entry: Entry = { type, payload, ts: new Date().toISOString() };
  const entries = read();
  entries.push(entry);
  write(entries);
  return entry;
}

export function readAuditEntries(): Entry[] {
  return read();
}

export function clearAuditEntries(): void {
  write([]);
}
