#!/usr/bin/env node
// A stand-in OpenID Connect provider for tests and local trials (never for
// production): discovery, JWKS, an authorization endpoint that signs the
// configured person in at once, a token endpoint that checks the code, the
// PKCE verifier and the client's secret, and an end-session endpoint. Used
// in-process by lib/auth/oidc.test.ts and as a process for an end-to-end
// sign-in against `next start`:
//
//   node scripts/oidc-stub-provider.mjs --port 3790 --client civicos --secret s3cret \
//        --sub emp-1001 --email ada@gov.example --name "Ada Obi" --groups ict-admins --amr pwd,mfa
//
// Knobs (in-process: the `tweak` object) make it misbehave on purpose: sign
// with a key it does not publish, name another issuer or audience, issue an
// expired token, or answer with another nonce.

import http from 'node:http';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';

const b64u = b => Buffer.from(b).toString('base64url');

function jwt(header, payload, privateKey) {
  const input = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const sig = sign('sha256', Buffer.from(input), privateKey);
  return `${input}.${b64u(sig)}`;
}

/**
 * Start the stub on 127.0.0.1. Returns { issuer, close, person, tweak, codes }.
 * `person` is who signs in next; `tweak` changes what the next token says.
 */
export async function startStubProvider(o = {}) {
  const good = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rogue = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = 'stub-1';
  const client = { id: o.clientId ?? 'civicos', secret: o.clientSecret ?? 's3cret' };
  const person = { sub: 'emp-1001', email: 'ada@gov.example', email_verified: true, name: 'Ada Obi', groups: [], amr: ['pwd'], ...(o.person ?? {}) };
  const tweak = {};
  const codes = new Map();
  let issuer = '';
  const logouts = [];

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, issuer);
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/.well-known/openid-configuration') {
      return json(200, {
        issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`,
        end_session_endpoint: `${issuer}/logout`, response_types_supported: ['code'], subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'], code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      });
    }
    if (url.pathname === '/jwks') {
      const jwk = good.publicKey.export({ format: 'jwk' });
      return json(200, { keys: [{ ...jwk, kid, use: 'sig', alg: 'RS256' }] });
    }
    if (url.pathname === '/authorize') {
      const q = url.searchParams;
      if (q.get('client_id') !== client.id || q.get('response_type') !== 'code' || q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) {
        return json(400, { error: 'invalid_request' });
      }
      const code = b64u(randomBytes(24));
      codes.set(code, { nonce: q.get('nonce'), challenge: q.get('code_challenge'), redirectUri: q.get('redirect_uri'), person: { ...person } });
      const back = new URL(q.get('redirect_uri'));
      back.searchParams.set('code', code);
      back.searchParams.set('state', q.get('state') ?? '');
      res.writeHead(302, { location: back.href });
      return res.end();
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const f = new URLSearchParams(body);
      let id = f.get('client_id'), secret = f.get('client_secret');
      const basic = /^Basic (.+)$/.exec(req.headers.authorization ?? '');
      if (basic) [id, secret] = Buffer.from(basic[1], 'base64').toString().split(':').map(decodeURIComponent);
      if (id !== client.id || secret !== client.secret) return json(401, { error: 'invalid_client' });
      const c = codes.get(f.get('code'));
      codes.delete(f.get('code'));
      if (!c || f.get('grant_type') !== 'authorization_code' || f.get('redirect_uri') !== c.redirectUri) return json(400, { error: 'invalid_grant' });
      if (b64u(createHash('sha256').update(f.get('code_verifier') ?? '').digest()) !== c.challenge) return json(400, { error: 'invalid_grant', error_description: 'PKCE' });
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: tweak.iss ?? issuer, aud: tweak.aud ?? client.id, sub: c.person.sub, iat: tweak.iat ?? now, exp: tweak.exp ?? now + 300,
        nonce: tweak.nonce ?? c.nonce, email: c.person.email, email_verified: c.person.email_verified, name: c.person.name,
        groups: c.person.groups, amr: c.person.amr, ...(c.person.acr ? { acr: c.person.acr } : {}), ...(c.person.extra ?? {}),
      };
      const token = jwt({ alg: 'RS256', typ: 'JWT', kid }, claims, tweak.rogueKey ? rogue.privateKey : good.privateKey);
      return json(200, { access_token: b64u(randomBytes(16)), token_type: 'Bearer', expires_in: 300, id_token: token });
    }
    if (url.pathname === '/logout') {
      logouts.push(Object.fromEntries(url.searchParams));
      const to = url.searchParams.get('post_logout_redirect_uri');
      if (to) { res.writeHead(302, { location: to }); return res.end(); }
      return json(200, { ok: true });
    }
    json(404, { error: 'not_found' });
  });
  await new Promise(r => server.listen(o.port ?? 0, '127.0.0.1', r));
  issuer = `http://127.0.0.1:${server.address().port}`;
  return { issuer, client, person, tweak, codes, logouts, close: () => new Promise(r => server.close(r)) };
}

// Run as a process: flags as in the header.
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const s = await startStubProvider({
    port: Number(arg('port', '3790')), clientId: arg('client', 'civicos'), clientSecret: arg('secret', 's3cret'),
    person: { sub: arg('sub', 'emp-1001'), email: arg('email', 'ada@gov.example'), name: arg('name', 'Ada Obi'),
      groups: arg('groups', '').split(',').filter(Boolean), amr: arg('amr', 'pwd').split(',').filter(Boolean) },
  });
  console.log(`stub OIDC provider ${s.issuer} (client ${s.client.id}); pid ${process.pid}`);
}
