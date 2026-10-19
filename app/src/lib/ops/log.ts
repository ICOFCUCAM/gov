// Structured logging (architecture review R12, finding O2).
//
// On the server every entry is one JSON line on stdout — time, level,
// event, service, request id when known, and fields — for the nation's own
// collector (Loki, Elasticsearch, OpenSearch, Fluent Bit…); nothing is sent
// anywhere by the platform itself. In the browser entries go to the
// console. Personal data and secrets never enter a log: fields whose names
// look like a password, secret, token, key, address, phone, e-mail or
// identity number are replaced by "[redacted]", long strings are cut.
// The last warnings and errors are kept in memory for /api/health.

export type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE = /pass(word)?|secret|token|api.?key|authori[sz]ation|cookie|session|totp|e.?mail|phone|address|national.?id|nin\b|ssn|dob|birth/i;
const MAX_STRING = 500;

export interface LogEntry { ts: string; level: Level; event: string; service: string; requestId?: string; [field: string]: unknown }

const recent: LogEntry[] = [];
const RECENT_MAX = 200;
const isServer = typeof window === 'undefined';

function threshold(): number {
  const v = (typeof process !== 'undefined' ? process.env.CIVICOS_LOG_LEVEL : undefined) as Level | undefined;
  return ORDER[v && v in ORDER ? v : (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'warn' : 'info')];
}

/** Fields safe to log: sensitive names redacted, long strings cut, errors flattened, depth limited. */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (value instanceof Error) return { name: value.name, message: redact(value.message) };
  if (depth > 3) return '[…]';
  if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) out[k] = SENSITIVE.test(k) ? '[redacted]' : redact(v, depth + 1);
    return out;
  }
  return String(value);
}

/** Write one entry. `event` is a stable dotted name ("state.restore", "substrate.rpc_failed"). */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): LogEntry | null {
  if (ORDER[level] < threshold()) return null;
  const { requestId, ...rest } = fields;
  const entry: LogEntry = {
    ts: new Date().toISOString(), level, event, service: 'civicos-app',
    ...(typeof requestId === 'string' ? { requestId } : {}),
    ...(redact(rest) as Record<string, unknown>),
  };
  if (ORDER[level] >= ORDER.warn) { recent.push(entry); if (recent.length > RECENT_MAX) recent.shift(); }
  if (isServer) {
    const line = JSON.stringify(entry);
    if (ORDER[level] >= ORDER.warn) process.stderr.write(`${line}\n`); else process.stdout.write(`${line}\n`);
  } else {
    // eslint-disable-next-line no-console
    (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(`[civicos] ${event}`, rest);
  }
  return entry;
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => log('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => log('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => log('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => log('error', event, fields),
  /** A logger that adds the same fields (a request id, a route) to every entry. */
  with(base: Record<string, unknown>) {
    return {
      debug: (e: string, f?: Record<string, unknown>) => log('debug', e, { ...base, ...f }),
      info: (e: string, f?: Record<string, unknown>) => log('info', e, { ...base, ...f }),
      warn: (e: string, f?: Record<string, unknown>) => log('warn', e, { ...base, ...f }),
      error: (e: string, f?: Record<string, unknown>) => log('error', e, { ...base, ...f }),
    };
  },
};

/** The request id a request carries (set by the middleware), or a new one. */
export function requestIdOf(headers: { get(name: string): string | null }): string {
  const v = headers.get('x-request-id');
  return v && /^[A-Za-z0-9._-]{8,80}$/.test(v) ? v : (globalThis.crypto?.randomUUID?.() ?? `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`);
}

/** The latest warnings and errors (newest last), for health reports. */
export function recentProblems(limit = 20): LogEntry[] { return recent.slice(-limit); }
