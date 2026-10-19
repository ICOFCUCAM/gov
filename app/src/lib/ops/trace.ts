// Spans around the platform's own work (review R12, finding O2).
//
// Thin helpers over the OpenTelemetry API: they are no-ops until
// lib/ops/otel.ts registers a tracer provider, which it does only when the
// nation names its own collector (CIVICOS_OTEL_ENDPOINT). Next.js adds the
// spans for every request and API route handler itself once a provider is
// registered; the helpers here add outbound fetches, persistence saves and
// audit appends. Safe in every runtime (the API package has no Node
// dependency), so the edge-safe store can call it.
//
// Span attributes follow the logging rule: no personal data and no secrets
// (lib/ops/otel.ts redacts sensitive names and query strings on export too).

import { trace, SpanKind, SpanStatusCode, type Attributes, type Span } from '@opentelemetry/api';

export const TRACER_NAME = 'civicos-app';
export { SpanKind };

const tracer = () => trace.getTracer(TRACER_NAME);

function fail(span: Span, e: unknown): void {
  span.recordException(e instanceof Error ? { name: e.name, message: e.message } : { message: String(e) });
  span.setStatus({ code: SpanStatusCode.ERROR, message: e instanceof Error ? e.message.slice(0, 200) : 'error' });
}

/** Run `fn` inside a span named `name` (ended when the promise settles; errors recorded and rethrown). */
export function withSpan<T>(name: string, attributes: Attributes, fn: (span: Span) => Promise<T>, kind: SpanKind = SpanKind.INTERNAL): Promise<T> {
  return tracer().startActiveSpan(name, { kind, attributes }, async span => {
    try {
      return await fn(span);
    } catch (e) {
      fail(span, e);
      throw e;
    } finally {
      span.end();
    }
  });
}

/** The same for synchronous work. */
export function withSpanSync<T>(name: string, attributes: Attributes, fn: (span: Span) => T, kind: SpanKind = SpanKind.INTERNAL): T {
  return tracer().startActiveSpan(name, { kind, attributes }, span => {
    try {
      return fn(span);
    } catch (e) {
      fail(span, e);
      throw e;
    } finally {
      span.end();
    }
  });
}

/** Trace and span id of the active span, when one is recording (joined to log lines). */
export function activeTraceIds(): { traceId: string; spanId: string } | null {
  const s = trace.getActiveSpan();
  if (!s) return null;
  const c = s.spanContext();
  return c.traceId && !/^0+$/.test(c.traceId) ? { traceId: c.traceId, spanId: c.spanId } : null;
}

/** Tag the active span with the request id the middleware set (x-request-id), so a trace and its log lines join. */
export function tagRequestId(requestId: string): void {
  trace.getActiveSpan()?.setAttribute('civicos.request_id', requestId);
}
