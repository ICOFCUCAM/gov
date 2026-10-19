// A minimal ASN.1 DER reader and writer: just what RFC 3161 time-stamps
// (lib/audit/tsa.ts) need, with no dependency. Definite lengths only (DER);
// tags up to 30 (single byte), which covers every structure read here.

export interface Node {
  /** The identifier octet (class, constructed bit and tag number). */
  tag: number;
  /** The whole element: identifier, length and contents. */
  der: Buffer;
  /** The contents octets. */
  value: Buffer;
  /** Children, for constructed elements (SEQUENCE, SET, explicit context tags). */
  children: Node[];
}

export const TAG = {
  BOOLEAN: 0x01, INTEGER: 0x02, BIT_STRING: 0x03, OCTET_STRING: 0x04, NULL: 0x05, OID: 0x06,
  UTF8String: 0x0c, PrintableString: 0x13, IA5String: 0x16, UTCTime: 0x17, GeneralizedTime: 0x18,
  SEQUENCE: 0x30, SET: 0x31,
} as const;
/** Context-specific tag [n], constructed (explicit or a constructed implicit type) or primitive. */
export const ctx = (n: number, constructed = true): number => 0x80 | (constructed ? 0x20 : 0) | n;

// ── Reading ───────────────────────────────────────────────────────────

/** Read one element at `offset`; returns it and where the next one starts. */
export function readAt(buf: Buffer, offset = 0): { node: Node; next: number } {
  if (offset + 2 > buf.length) throw new Error('DER: truncated element');
  const tag = buf[offset]!;
  if ((tag & 0x1f) === 0x1f) throw new Error('DER: multi-byte tags are not supported');
  let len = buf[offset + 1]!;
  let p = offset + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new Error('DER: indefinite or oversized length');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[p + i]!;
    p += n;
  }
  const end = p + len;
  if (end > buf.length) throw new Error('DER: element runs past the end');
  const value = buf.subarray(p, end);
  const children: Node[] = [];
  if (tag & 0x20) {
    let q = 0;
    while (q < value.length) { const r = readAt(value, q); children.push(r.node); q = r.next; }
  }
  return { node: { tag, der: buf.subarray(offset, end), value, children }, next: end };
}

/** Read a buffer holding exactly one element. */
export function read(buf: Buffer): Node {
  const { node, next } = readAt(buf, 0);
  if (next !== buf.length) throw new Error('DER: trailing bytes after the element');
  return node;
}

export function expectTag(n: Node | undefined, tag: number, what: string): Node {
  if (!n || n.tag !== tag) throw new Error(`DER: expected ${what}`);
  return n;
}

export function decodeOid(value: Buffer): string {
  const out: number[] = [];
  let v = 0;
  for (const b of value) {
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) {
      if (out.length === 0) { const first = v < 80 ? Math.floor(v / 40) : 2; out.push(first, v - first * 40); } else out.push(v);
      v = 0;
    }
  }
  return out.join('.');
}

/** An INTEGER's contents as a non-negative bigint (two's complement sign ignored for serials and nonces). */
export const decodeUint = (value: Buffer): bigint => (value.length ? BigInt(`0x${value.toString('hex')}`) : 0n);

/** GeneralizedTime / UTCTime → ISO 8601 (UTC; fractions kept to milliseconds). */
export function decodeTime(n: Node): string {
  const s = n.value.toString('latin1');
  if (n.tag === TAG.UTCTime) {
    const m = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/.exec(s);
    if (!m) throw new Error('DER: bad UTCTime');
    const y = Number(m[1]) < 50 ? 2000 + Number(m[1]) : 1900 + Number(m[1]);
    return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0))).toISOString();
  }
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:[.,](\d+))?Z$/.exec(s);
  if (!m) throw new Error('DER: bad GeneralizedTime');
  const ms = m[7] ? Math.floor(Number(`0.${m[7]}`) * 1000) : 0;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), ms)).toISOString();
}

// ── Writing ───────────────────────────────────────────────────────────

function length(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) bytes.unshift(v & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

export const tlv = (tag: number, value: Buffer): Buffer => Buffer.concat([Buffer.from([tag]), length(value.length), value]);
export const seq = (...items: Buffer[]): Buffer => tlv(TAG.SEQUENCE, Buffer.concat(items));
/** A SET OF, with its elements in DER order (sorted by their encodings). */
export const set = (...items: Buffer[]): Buffer => tlv(TAG.SET, Buffer.concat([...items].sort(Buffer.compare)));
export const nul = (): Buffer => Buffer.from([TAG.NULL, 0]);
export const bool = (v: boolean): Buffer => Buffer.from([TAG.BOOLEAN, 1, v ? 0xff : 0]);
export const octets = (v: Buffer): Buffer => tlv(TAG.OCTET_STRING, v);
export const explicit = (n: number, inner: Buffer): Buffer => tlv(ctx(n), inner);

/** INTEGER from a number, bigint or unsigned big-endian bytes (minimal, positive). */
export function int(v: number | bigint | Buffer): Buffer {
  let b: Buffer;
  if (Buffer.isBuffer(v)) b = v;
  else {
    let hex = BigInt(v).toString(16);
    if (hex.length % 2) hex = `0${hex}`;
    b = Buffer.from(hex, 'hex');
  }
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  b = b.subarray(i);
  if (b.length === 0) b = Buffer.from([0]);
  if (b[0]! & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
  return tlv(TAG.INTEGER, b);
}

export function oid(dotted: string): Buffer {
  const parts = dotted.split('.').map(Number);
  const bytes: number[] = [];
  const push = (v: number) => {
    const chunk: number[] = [v & 0x7f];
    for (v = Math.floor(v / 128); v > 0; v = Math.floor(v / 128)) chunk.unshift((v & 0x7f) | 0x80);
    bytes.push(...chunk);
  };
  push(parts[0]! * 40 + parts[1]!);
  for (const p of parts.slice(2)) push(p);
  return tlv(TAG.OID, Buffer.from(bytes));
}

/** GeneralizedTime with whole seconds, UTC. */
export function generalizedTime(d: Date): Buffer {
  const s = d.toISOString().replace(/[-:T]/g, '').replace(/\.\d+Z$/, 'Z');
  return tlv(TAG.GeneralizedTime, Buffer.from(s, 'latin1'));
}
