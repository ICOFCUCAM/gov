import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { installTracing, uninstallTracing, startTracingFromEnv, tracesUrl, parseHeaders, cleanAttribute, toOtlpJson, OtlpJsonExporter, tracingStatus } from './otel';
import { withSpan, withSpanSync } from './trace';
import { logger, requestIdOf } from './log';
import { safeFetchText } from '@/lib/net/safe-fetch';
import { maybeSignHead, resetAuditHeads } from '@/lib/audit/sign';
import { flush, type StateAdapter } from '@/lib/data/persist';

let mem: InMemorySpanExporter;
beforeEach(() => { mem = new InMemorySpanExporter(); installTracing([new SimpleSpanProcessor(mem)]); });
afterEach(async () => { vi.restoreAllMocks(); delete process.env.CIVICOS_LOG_LEVEL; await uninstallTracing(); });

describe('tracing (off by default)', () => {
  it('stays off without CIVICOS_OTEL_ENDPOINT, and refuses an address that is not http(s)', async () => {
    await uninstallTracing();
    expect(startTracingFromEnv({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
    expect(tracingStatus().enabled).toBe(false);
    expect(startTracingFromEnv({ CIVICOS_OTEL_ENDPOINT: 'ftp://x' } as unknown as NodeJS.ProcessEnv).enabled).toBe(false);
    expect(startTracingFromEnv({ CIVICOS_OTEL_ENDPOINT: 'https://u:p@collector' } as unknown as NodeJS.ProcessEnv).enabled).toBe(false);
  });

  it('builds the traces address and the collector headers', () => {
    expect(tracesUrl('http://otel-collector:4318')!.href).toBe('http://otel-collector:4318/v1/traces');
    expect(tracesUrl('https://c.gov.example/otlp/v1/traces')!.href).toBe('https://c.gov.example/otlp/v1/traces');
    expect(parseHeaders('Authorization=Bearer%20x, x-tenant=gov')).toEqual({ authorization: 'Bearer x', 'x-tenant': 'gov' });
  });
});

describe('spans', () => {
  it('records nested spans with errors, and joins log lines to the active span', async () => {
    process.env.CIVICOS_LOG_LEVEL = 'info';
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await withSpan('outer', { a: 1 }, async () => {
      withSpanSync('inner', {}, () => logger.info('inside', { n: 1 }));
      requestIdOf({ get: () => 'req-abcdef123' });
    });
    await expect(withSpan('fails', {}, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    const spans = mem.getFinishedSpans();
    const outer = spans.find(s => s.name === 'outer')!;
    const inner = spans.find(s => s.name === 'inner')!;
    expect(inner.parentSpanContext?.spanId).toBe(outer.spanContext().spanId);
    expect(outer.attributes['civicos.request_id']).toBe('req-abcdef123');
    expect(spans.find(s => s.name === 'fails')!.status.code).toBe(2);
    const line = JSON.parse(String(out.mock.calls[0]![0]));
    expect(line.traceId).toBe(inner.spanContext().traceId);
    expect(line.spanId).toBe(inner.spanContext().spanId);
  });

  it('traces outbound fetches with the host and method only', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { headers: { 'content-type': 'text/plain' } })) as unknown as typeof fetch;
    await safeFetchText('https://feed.example.gov/data.csv?token=secret', { allow: () => true, resolve: async () => ['203.0.113.9'], fetch: fetchImpl });
    const s = mem.getFinishedSpans().find(x => x.name === 'outbound.fetch')!;
    expect(s.kind).toBe(2); // CLIENT
    expect(s.attributes['server.address']).toBe('feed.example.gov');
    expect(JSON.stringify(s.attributes)).not.toContain('secret');
  });

  it('traces audit appends and persistence saves', async () => {
    resetAuditHeads();
    maybeSignHead({ seq: 1, hash: 'h1', action: 'test.thing' });
    const saved: string[] = [];
    const adapter: StateAdapter = { name: 'file', loadAll: async () => ({}), save: async key => { saved.push(key); } };
    (globalThis as Record<string, unknown>).__civicosTraceProbe = { x: Date.now() };
    await flush(adapter);
    delete (globalThis as Record<string, unknown>).__civicosTraceProbe;
    const names = mem.getFinishedSpans().map(s => s.name);
    expect(names).toContain('audit.append');
    expect(names).toContain('state.save');
    const save = mem.getFinishedSpans().find(s => s.name === 'state.save' && s.attributes['civicos.store'] === '__civicosTraceProbe');
    expect(save).toBeTruthy();
  });
});

describe('export to the nation\'s collector', () => {
  it('redacts sensitive attributes and query strings', () => {
    expect(cleanAttribute('http.target', '/api/cron/x?token=abc')).toBe('/api/cron/x');
    expect(cleanAttribute('user.email', 'a@b.c')).toBe('[redacted]');
    expect(cleanAttribute('server.address', 'feed.example.gov')).toBe('feed.example.gov');
    expect(cleanAttribute('next.route', '/api/x')).toBe('/api/x');
  });

  it('encodes OTLP/JSON with hex ids, nanosecond times and OTLP span kinds', async () => {
    await withSpan('encoded', { count: 3, ratio: 0.5, ok: true, authorization: 'Bearer x' }, async () => undefined);
    const body = toOtlpJson(mem.getFinishedSpans()) as { resourceSpans: Array<{ resource: { attributes: Array<{ key: string }> }; scopeSpans: Array<{ spans: Array<Record<string, unknown>> }> }> };
    const span = body.resourceSpans[0]!.scopeSpans[0]!.spans[0]!;
    expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(span.kind).toBe(1);
    expect(String(span.startTimeUnixNano)).toMatch(/^\d{19}$/);
    expect(span.attributes).toEqual(expect.arrayContaining([{ key: 'count', value: { intValue: '3' } }, { key: 'ratio', value: { doubleValue: 0.5 } }, { key: 'ok', value: { boolValue: true } }, { key: 'authorization', value: { stringValue: '[redacted]' } }]));
    expect(body.resourceSpans[0]!.resource.attributes.map(a => a.key)).toContain('service.name');
  });

  it('posts the spans to the collector address only', async () => {
    const got: Array<{ url?: string; headers: http.IncomingHttpHeaders; body: string }> = [];
    const server = http.createServer((req, res) => {
      let b = '';
      req.on('data', c => { b += c; });
      req.on('end', () => { got.push({ url: req.url, headers: req.headers, body: b }); res.end('{}'); });
    });
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    await withSpan('to-export', {}, async () => undefined);
    const exporter = new OtlpJsonExporter(tracesUrl(`http://127.0.0.1:${port}`)!, { 'x-collector-key': 'k' });
    const result = await new Promise<{ code: number }>(r => exporter.export(mem.getFinishedSpans(), r));
    server.close();
    expect(result.code).toBe(0);
    expect(got[0]!.url).toBe('/v1/traces');
    expect(got[0]!.headers['content-type']).toBe('application/json');
    expect(got[0]!.headers['x-collector-key']).toBe('k');
    expect(JSON.parse(got[0]!.body).resourceSpans[0].scopeSpans[0].spans[0].name).toBe('to-export');
  });
});
