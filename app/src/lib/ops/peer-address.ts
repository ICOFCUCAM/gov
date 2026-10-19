// The address each connection really came from, as the last X-Forwarded-For
// hop (go-live review L-1). Next.js 15 gives route handlers and the
// middleware no socket address, and keeps a caller's own X-Forwarded-For
// when one is sent, so without this the first hop is whatever the caller
// wrote. Started once from src/instrumentation.ts (Node only): every request
// the server receives gets its connection's address appended, as a proxy
// would, before Next.js reads it. clientAddress() (lib/ops/rate-limit-core.ts)
// then counts CIVICOS_TRUSTED_PROXIES hops from the right.
//
// Not started on Vercel (VERCEL is set): its edge replaces the header with the
// caller's address, and the function's own connection is the platform's
// internal one. CIVICOS_PEER_ADDRESS=off turns it off on another platform that
// does the same.

import type { IncomingMessage } from 'node:http';

/** Append the connection's address to the request's X-Forwarded-For (kept as one header). */
export function stampPeer(req: Pick<IncomingMessage, 'headers' | 'socket'>): void {
  const peer = req.socket?.remoteAddress;
  if (!peer) return;
  const addr = peer.startsWith('::ffff:') ? peer.slice(7) : peer;
  const given = req.headers['x-forwarded-for'];
  const list = (Array.isArray(given) ? given.join(',') : given ?? '').trim();
  req.headers['x-forwarded-for'] = list ? `${list}, ${addr}` : addr;
}

const STAMPED = Symbol.for('civicos.peerStamped');

/** Patch the Node HTTP(S) servers once so every request is stamped before any listener sees it. */
export async function startPeerAddress(env: Record<string, string | undefined> = process.env): Promise<boolean> {
  if (env.VERCEL || (env.CIVICOS_PEER_ADDRESS ?? '').toLowerCase() === 'off') return false;
  const http = await import('node:http');
  const https = await import('node:https');
  for (const proto of [http.Server.prototype, https.Server.prototype] as unknown as Record<string | symbol, unknown>[]) {
    if (proto[STAMPED]) continue;
    const emit = proto.emit as (this: unknown, event: string | symbol, ...args: unknown[]) => boolean;
    proto.emit = function (this: unknown, event: string | symbol, ...args: unknown[]): boolean {
      if (event === 'request' && args[0]) stampPeer(args[0] as IncomingMessage);
      return emit.call(this, event, ...args);
    };
    proto[STAMPED] = true;
  }
  return true;
}
