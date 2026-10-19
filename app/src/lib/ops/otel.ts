// OpenTelemetry traces to the nation's own collector (review R12, finding O2).
//
// Off by default: nothing is traced and nothing leaves the server unless
// CIVICOS_OTEL_ENDPOINT names the nation's collector (an OpenTelemetry
// Collector, Jaeger, Tempo… run by the nation; infra/docker observability
// profile, Helm `otel`). Traces never go to the publisher or a vendor: this
// is the only exporter, it sends only to that address, and it is not one of
// the operational-data categories of lib/data/sovereignty.ts (those go to the
// publisher, through transmit()).
//
// Started from src/instrumentation.ts. Once a provider is registered Next.js
// adds a span for every request and API route handler (it honours an
// incoming W3C `traceparent` from the ingress); lib/ops/trace.ts adds
// outbound fetches, persistence saves and audit appends. Log lines written
// inside a span carry its trace and span id, and route handlers tag their
// span with the x-request-id (lib/ops/log.ts).
//
// Spans are exported as OTLP/HTTP JSON by a small exporter below (no gRPC or
// protobuf dependency). Before export, attributes whose names look sensitive
// are redacted and query strings are cut from URLs: span data follows the
// logging rule (no personal data, no secrets).
//
//   CIVICOS_OTEL_ENDPOINT        collector base address, e.g. http://otel-collector:4318
//                                (/v1/traces is added unless the path already ends with it)
//   CIVICOS_OTEL_HEADERS         optional `name=value,name2=value2` (the collector's own auth)
//   CIVICOS_OTEL_SERVICE_NAME    default `civicos-app`
//   CIVICOS_OTEL_SAMPLE_RATIO    0..1, default 1 (parent-based)

import http from 'node:http';
import https from 'node:https';
import { context, propagation, trace, type Attributes, type AttributeValue } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { ExportResultCode, W3CTraceContextPropagator, suppressTracing, type ExportResult } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BasicTracerProvider, BatchSpanProcessor, SimpleSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler,
  type ReadableSpan, type SpanExporter, type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { activeTraceIds, tagRequestId } from './trace';

const SENSITIVE = /pass(word)?|secret|token|api.?key|authori[sz]ation|cookie|session|totp|e.?mail|phone|address|national.?id|nin\b|ssn|dob|birth/i;
const URL_ATTRS = /^(http\.(url|target)|url\.(full|query)|next\.rsc|http\.route)$/;
// Network addresses are infrastructure, not personal data, but `address` matches the pattern above.
const ALLOWED = /^(server|client|network\.peer|net\.peer)\.address$|^server\.port$|^net\.peer\.name$/;

/** An attribute value fit to leave the server: sensitive names redacted, URLs without query, long strings cut. */
export function cleanAttribute(key: string, value: AttributeValue | undefined): AttributeValue | undefined {
  if (value === undefined) return undefined;
  if (!ALLOWED.test(key) && SENSITIVE.test(key)) return '[redacted]';
  if (typeof value === 'string') {
    const v = URL_ATTRS.test(key) || /^https?:\/\//.test(value) ? value.replace(/\?.*$/, '') : value;
    return v.length > 500 ? `${v.slice(0, 500)}…` : v;
  }
  return value;
}

/** The collector's traces address from CIVICOS_OTEL_ENDPOINT (null when unset or not http(s)). */
export function tracesUrl(raw: string | undefined): URL | null {
  const v = raw?.trim();
  if (!v) return null;
  let u: URL;
  try { u = new URL(v); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (!u.pathname.endsWith('/v1/traces')) u.pathname = `${u.pathname.replace(/\/$/, '')}/v1/traces`;
  return u;
}

export function parseHeaders(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (raw ?? '').split(',')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// ── OTLP/JSON encoding ────────────────────────────────────────────────
type AnyValue = { stringValue: string } | { boolValue: boolean } | { intValue: string } | { doubleValue: number } | { arrayValue: { values: AnyValue[] } };
const anyValue = (v: AttributeValue): AnyValue => {
  if (Array.isArray(v)) return { arrayValue: { values: (v as unknown[]).filter(x => x != null).map(x => anyValue(x as AttributeValue)) } };
  if (typeof v === 'boolean') return { boolValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
};
const kv = (attrs: Attributes) => Object.entries(attrs).flatMap(([key, v]) => {
  const c = cleanAttribute(key, v);
  return c === undefined ? [] : [{ key, value: anyValue(c) }];
});
const nanos = (t: [number, number]) => (BigInt(t[0]) * 1_000_000_000n + BigInt(t[1])).toString();

/** One OTLP `ExportTraceServiceRequest` (JSON mapping: hex ids, nanosecond strings). */
export function toOtlpJson(spans: ReadableSpan[]): { resourceSpans: unknown[] } {
  const byResource = new Map<unknown, { resource: ReadableSpan['resource']; scopes: Map<string, { scope: ReadableSpan['instrumentationScope']; spans: ReadableSpan[] }> }>();
  for (const s of spans) {
    let r = byResource.get(s.resource);
    if (!r) byResource.set(s.resource, r = { resource: s.resource, scopes: new Map() });
    const key = `${s.instrumentationScope.name}@${s.instrumentationScope.version ?? ''}`;
    let sc = r.scopes.get(key);
    if (!sc) r.scopes.set(key, sc = { scope: s.instrumentationScope, spans: [] });
    sc.spans.push(s);
  }
  return {
    resourceSpans: [...byResource.values()].map(r => ({
      resource: { attributes: kv(r.resource.attributes as Attributes) },
      scopeSpans: [...r.scopes.values()].map(sc => ({
        scope: { name: sc.scope.name, ...(sc.scope.version ? { version: sc.scope.version } : {}) },
        spans: sc.spans.map(s => {
          const c = s.spanContext();
          return {
            traceId: c.traceId, spanId: c.spanId,
            ...(s.parentSpanContext?.spanId ? { parentSpanId: s.parentSpanContext.spanId } : {}),
            name: s.name,
            kind: s.kind + 1, // API INTERNAL=0 … OTLP SPAN_KIND_INTERNAL=1 …
            startTimeUnixNano: nanos(s.startTime), endTimeUnixNano: nanos(s.endTime),
            attributes: kv(s.attributes),
            events: s.events.map(e => ({ timeUnixNano: nanos(e.time), name: e.name, attributes: kv(e.attributes ?? {}) })),
            status: { code: s.status.code, ...(s.status.message ? { message: s.status.message } : {}) },
          };
        }),
      })),
    })),
  };
}

/** POST the spans to the collector, with tracing suppressed for the export itself. */
export class OtlpJsonExporter implements SpanExporter {
  private stopped = false;
  constructor(private readonly url: URL, private readonly headers: Record<string, string> = {}, private readonly timeoutMs = 10_000) {}

  export(spans: ReadableSpan[], done: (r: ExportResult) => void): void {
    if (this.stopped || spans.length === 0) { done({ code: ExportResultCode.SUCCESS }); return; }
    const body = JSON.stringify(toOtlpJson(spans));
    context.with(suppressTracing(context.active()), () => {
      const mod = this.url.protocol === 'https:' ? https : http;
      const req = mod.request(this.url, { method: 'POST', timeout: this.timeoutMs, headers: { ...this.headers, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, res => {
        res.resume();
        const ok = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300;
        done(ok ? { code: ExportResultCode.SUCCESS } : { code: ExportResultCode.FAILED, error: new Error(`collector answered ${res.statusCode}`) });
      });
      req.on('timeout', () => req.destroy(new Error('collector timed out')));
      req.on('error', error => done({ code: ExportResultCode.FAILED, error }));
      req.end(body);
    });
  }

  async shutdown(): Promise<void> { this.stopped = true; }
  async forceFlush(): Promise<void> { /* nothing buffered here; the batch processor flushes */ }
}

export interface TracingStatus { enabled: boolean; endpoint?: string; serviceName?: string; error?: string }
interface Installed { provider: BasicTracerProvider; status: TracingStatus }
const g = globalThis as unknown as { __otelInstalled?: Installed; __otelTraceIds?: () => { traceId: string; spanId: string } | null; __otelTagRequest?: (id: string) => void };

/** Register a provider with these processors (tests pass an in-memory exporter through a simple processor). */
export function installTracing(processors: SpanProcessor[], opts: { serviceName?: string; ratio?: number; status?: TracingStatus } = {}): BasicTracerProvider {
  const ratio = opts.ratio ?? 1;
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({ 'service.name': opts.serviceName ?? 'civicos-app', 'service.namespace': 'civicos' }),
    sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(Math.min(1, Math.max(0, ratio))) }),
    spanProcessors: processors,
  });
  const cm = new AsyncLocalStorageContextManager();
  cm.enable();
  context.setGlobalContextManager(cm);
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  trace.setGlobalTracerProvider(provider);
  g.__otelTraceIds = activeTraceIds;
  g.__otelTagRequest = tagRequestId;
  g.__otelInstalled = { provider, status: opts.status ?? { enabled: true, serviceName: opts.serviceName ?? 'civicos-app' } };
  return provider;
}

/** Undo installTracing (tests). */
export async function uninstallTracing(): Promise<void> {
  const i = g.__otelInstalled;
  g.__otelInstalled = undefined;
  g.__otelTraceIds = undefined;
  g.__otelTagRequest = undefined;
  trace.disable();
  context.disable();
  propagation.disable();
  await i?.provider.shutdown().catch(() => undefined);
}

/** Start from the environment (src/instrumentation.ts). Does nothing without CIVICOS_OTEL_ENDPOINT. */
export function startTracingFromEnv(env: NodeJS.ProcessEnv = process.env): TracingStatus {
  if (g.__otelInstalled) return g.__otelInstalled.status;
  const raw = env.CIVICOS_OTEL_ENDPOINT;
  if (!raw?.trim()) return { enabled: false };
  const url = tracesUrl(raw);
  if (!url) return { enabled: false, error: 'CIVICOS_OTEL_ENDPOINT is not an http(s) address without credentials; tracing stays off' };
  const serviceName = env.CIVICOS_OTEL_SERVICE_NAME?.trim() || 'civicos-app';
  const ratio = env.CIVICOS_OTEL_SAMPLE_RATIO !== undefined ? Number(env.CIVICOS_OTEL_SAMPLE_RATIO) : 1;
  const status: TracingStatus = { enabled: true, endpoint: `${url.origin}${url.pathname}`, serviceName };
  installTracing([new BatchSpanProcessor(new OtlpJsonExporter(url, parseHeaders(env.CIVICOS_OTEL_HEADERS)))], { serviceName, ratio: Number.isFinite(ratio) ? ratio : 1, status });
  return status;
}

export function tracingStatus(): TracingStatus { return g.__otelInstalled?.status ?? { enabled: false }; }

export { SimpleSpanProcessor };
