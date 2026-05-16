// Sovereign Audit Ledger — shared federation service.
//
// RULE 4: every institutional system carries a tamper-evident audit
// trail. This is a per-scope hash-chained ledger: each entry links to the
// previous via a deterministic digest, so any retro-edit breaks the chain
// and is detectable. Institution-scoped (one chain per app/instance).
// Pure runtime singleton; no React/DOM, no crypto deps.

export interface AuditEntry {
  seq: number;
  at: number;
  scope: string;        // institution/app scope
  actor: string;        // who (role-qualified)
  action: string;       // what
  subject: string;      // on what (item id / target)
  detail: string;
  prevHash: string;
  hash: string;
}

type Listener = () => void;
const chains = new Map<string, AuditEntry[]>();
const listeners = new Set<Listener>();
const emit = () => { for (const l of listeners) l(); };

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Small, fast, deterministic non-crypto digest (FNV-1a 32-bit, hex).
function digest(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function appendAudit(scope: string, actor: string, action: string, subject: string, detail = ''): AuditEntry {
  const chain = chains.get(scope) ?? [];
  const prev = chain[chain.length - 1];
  const prevHash = prev ? prev.hash : '00000000';
  const seq = chain.length + 1;
  const at = Date.now();
  const hash = digest(`${prevHash}|${seq}|${scope}|${actor}|${action}|${subject}|${detail}`);
  const entry: AuditEntry = { seq, at, scope, actor, action, subject, detail, prevHash, hash };
  chains.set(scope, [...chain, entry]);
  emit();
  return entry;
}

export function auditTrail(scope: string, limit = 50): AuditEntry[] {
  const chain = chains.get(scope) ?? [];
  return chain.slice(-limit).reverse();
}

export interface ChainVerification { scope: string; entries: number; intact: boolean; brokenAt: number | null }
export function verifyChain(scope: string): ChainVerification {
  const chain = chains.get(scope) ?? [];
  let prevHash = '00000000';
  for (const e of chain) {
    const expect = digest(`${prevHash}|${e.seq}|${e.scope}|${e.actor}|${e.action}|${e.subject}|${e.detail}`);
    if (e.prevHash !== prevHash || e.hash !== expect) {
      return { scope, entries: chain.length, intact: false, brokenAt: e.seq };
    }
    prevHash = e.hash;
  }
  return { scope, entries: chain.length, intact: true, brokenAt: null };
}

export function auditStats() {
  let entries = 0; let intact = true;
  for (const scope of chains.keys()) {
    const v = verifyChain(scope);
    entries += v.entries;
    if (!v.intact) intact = false;
  }
  return { scopes: chains.size, entries, intact };
}
