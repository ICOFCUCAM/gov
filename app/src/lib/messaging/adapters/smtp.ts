// The nation's mail relay (SMTP), through nodemailer (pinned, lib/messaging).
//
// TLS always: STARTTLS required on 587 (`requireTLS`: the relay must offer
// it, or nothing is sent), implicit TLS on 465; TLS 1.2 or later, the
// certificate checked against the relay's name (an internal CA may be
// given). The name is resolved once here and every address checked under the
// platform's rules (private addresses refused unless the nation allows its own
// network); the connection goes to the checked address with the name kept for
// TLS (SNI and the certificate check), so a changed DNS answer cannot move it.
// Through the nation's egress proxy (CIVICOS_EGRESS_PROXY) the connection is a
// CONNECT tunnel to that address (lib/net/pinned-fetch.ts openTunnel).
//
// The message's idempotency key becomes its Message-ID, so a relay or
// mailbox that sees a retried message can recognise it.

import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import nodemailer from 'nodemailer';
import { isPrivateAddress } from '@/lib/public-sites/url-safety';
import { egressProxy, bypassesProxy, openTunnel } from '@/lib/net/pinned-fetch';
import { scrub } from '../privacy';
import type { ProviderConfig, RenderedMessage, SendResult } from '../types';

export interface SmtpNet { resolve?: (host: string) => Promise<string[]> }

const dnsResolve = async (host: string) => (await lookup(host, { all: true })).map(a => a.address);

/** SMTP replies that will not change on a retry: the recipient or the message is refused. */
function permanent(e: { responseCode?: number; command?: string; code?: string }): boolean {
  if (e.code === 'EENVELOPE') return true;
  return typeof e.responseCode === 'number' && e.responseCode >= 500 && /^(RCPT|DATA)/i.test(e.command ?? '');
}

export async function sendSmtp(p: ProviderConfig, m: RenderedMessage, secret: string | undefined, o: { allowPrivate: boolean; net?: SmtpNet }): Promise<SendResult> {
  const host = p.host!;
  let address: string;
  try {
    const addrs = await (o.net?.resolve ?? dnsResolve)(host);
    if (!addrs.length) throw new Error('The relay\'s name does not resolve');
    if (!o.allowPrivate && addrs.some(isPrivateAddress)) throw new Error('The relay\'s address is on a private network (allowed only with CIVICOS_MESSAGING_PRIVATE=1)');
    address = addrs[0]!;
  } catch (e) {
    return { ok: false, permanent: false, error: scrub(`${p.name}: ${(e as Error).message}`) };
  }
  const domain = p.from.split('@')[1] ?? 'localhost';
  const proxy = egressProxy();
  const tunnel = proxy && !bypassesProxy(proxy, host) ? proxy : null;
  const transport = nodemailer.createTransport({
    host: address,
    port: p.port,
    secure: p.security === 'tls',
    requireTLS: p.security !== 'tls',
    ignoreTLS: false,
    servername: host,
    // EHLO with the sender's domain, not the server's internal host name.
    name: domain,
    auth: p.username ? { user: p.username, pass: secret ?? '' } : undefined,
    tls: { servername: host, minVersion: 'TLSv1.2', rejectUnauthorized: true, ...(p.caPem ? { ca: p.caPem } : {}) },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    disableFileAccess: true,
    disableUrlAccess: true,
    ...(tunnel ? {
      getSocket: (_opts: unknown, cb: (err: Error | null, socketOptions?: { connection: import('node:net').Socket }) => void) => {
        openTunnel(tunnel, address, p.port!).then(connection => cb(null, { connection }), err => cb(err as Error));
      },
    } : {}),
  } as Parameters<typeof nodemailer.createTransport>[0]);
  try {
    const info = await transport.sendMail({
      from: p.from,
      to: m.to,
      ...(p.replyTo ? { replyTo: p.replyTo } : {}),
      subject: m.subject,
      text: m.text,
      messageId: `<${createHash('sha256').update(m.key).digest('hex').slice(0, 32)}@${domain}>`,
      headers: m.headers,
    });
    const refused = (info.rejected ?? []).length > 0 && !(info.accepted ?? []).length;
    if (refused) return { ok: false, permanent: true, error: scrub(`${p.name}: the relay refused the recipient`) };
    return { ok: true, id: String(info.messageId ?? '').slice(0, 200) || undefined };
  } catch (e) {
    const err = e as Error & { responseCode?: number; command?: string; code?: string; response?: string };
    return { ok: false, permanent: permanent(err), error: scrub(`${p.name}: ${err.code ? `${err.code} ` : ''}${err.response ?? err.message}`) };
  } finally {
    transport.close();
  }
}
