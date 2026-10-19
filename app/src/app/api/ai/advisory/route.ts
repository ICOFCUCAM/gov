// The AI advisory for a console panel (per-nation opt-in; register 2.1).
// The body is validated (lib/ai/advisory-input.ts: types, ranges, a label
// cap, control characters stripped), each figure carries its SignalKind and
// the prompt tells the model which figures are samples. Every call is
// audited: who asked, the model, SHA-256 of the prompt and of the answer,
// and whether the model or the rule-based fallback answered.
//
// The request is operational data leaving the platform, so it goes through
// the data-sovereignty gate (lib/data/sovereignty.ts, category
// 'ai-advisory': off unless a named official enabled it); when it is off the
// panel gets the rule-based advisory and nothing is sent. The model service
// is the nation's choice (SovereignProfile.aiAssistantModel: the default
// provider or its own sovereign / on-premises model; lib/ai/model.ts). Each
// official may ask CIVICOS_AI_RPM times a minute (default 10).
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSovereign, recordAudit } from '@/lib/data/store';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { parseAdvisoryInput, advisoryPrompt, severityOf, type AdvisoryInput } from '@/lib/ai/advisory-input';
import { resolveModel, complete } from '@/lib/ai/model';
import { transmit } from '@/lib/data/sovereignty';
import { resolveNation } from '@/lib/data/updates';
import { take } from '@/lib/exchange/rate-limit';

export interface AdvisoryRequest {
  label: string;
  /** The institution's registry id (optional; names the audit entry). */
  institution?: string;
  posture: string;
  escalationTier: number;
  readiness: number;
  incidents: number;
  budgetPressure: number;
  slaCompliance: number;
  constitutional: string;
  /** What kind of figure each one is (lib/twin/signal.ts); a figure without one is treated as a sample. */
  kinds?: Partial<Record<'readiness' | 'incidents' | 'budgetPressure' | 'slaCompliance', 'observed' | 'reported' | 'modelled' | 'sample' | 'unavailable'>>;
}

export interface AdvisoryResponse {
  headline: string;
  rationale: string;
  recommendations: string[];
  severity: 'routine' | 'advisory' | 'priority' | 'critical';
  confidence: number;
  /** Who answered: the model, or the rule-based fallback. Only 'model' may be shown as "AI advisory". */
  source: 'model' | 'rules';
}

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const perMinute = () => { const n = Number(process.env.CIVICOS_AI_RPM); return Number.isFinite(n) && n >= 1 ? n : 10; };

async function who(): Promise<{ label: string; key: string }> {
  const o = await currentOfficial().catch(() => null);
  return o ? { label: actorLabel(o), key: o.sub } : { label: 'console (no signed-in official)', key: 'anonymous' };
}

function rules(i: AdvisoryInput): AdvisoryResponse {
  const { label, escalationTier, readiness, incidents, budgetPressure } = i;
  return {
    headline: escalationTier >= 2
      ? `${label}: coordinated intervention advised — multiple systems degraded`
      : escalationTier === 1
      ? `${label}: targeted action advised — elevated indicators`
      : `${label}: operating within tolerance`,
    rationale: `Readiness ${readiness}% · ${incidents} active incidents · budget pressure ${budgetPressure}.`,
    recommendations: escalationTier >= 2
      ? ['Convene cabinet cell', 'Pre-position reserves', 'Cap exposure in affected sectors']
      : escalationTier === 1
      ? ['Tighten SLA monitoring', 'Reallocate to strained regions']
      : ['Sustain operating tempo', 'Monitor on standard cadence'],
    severity: severityOf(i),
    confidence: 72,
    source: 'rules',
  };
}

export async function POST(req: NextRequest) {
  // The AI assistant is a national opt-in chosen at setup. When a nation has
  // declined it, callers keep their deterministic rule-based advisories.
  if (getSovereign().aiAssistant === false) {
    return NextResponse.json({ error: 'AI assistant is not enabled for this nation' }, { status: 403 });
  }
  const actor = await who();
  const raw = await req.json().catch(() => null);
  const input = parseAdvisoryInput(raw);
  if ('error' in input) {
    recordAudit(actor.label, 'ai.advisory', 'Institution:?', 'denied', `invalid request: ${input.error}`);
    return NextResponse.json(input, { status: 422 });
  }
  const resource = `Institution:${input.institution ?? input.label}`;
  const rate = take(`ai-advisory:${actor.key}`, perMinute());
  if (!rate.allowed) {
    recordAudit(actor.label, 'ai.advisory', resource, 'denied', `rate limit of ${perMinute()} a minute`);
    return NextResponse.json({ error: `At most ${perMinute()} AI advisories a minute per official; try again shortly` }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds ?? 60) } });
  }
  const prompt = advisoryPrompt(input);
  const model = resolveModel(getSovereign().aiAssistantModel);
  const nationId = resolveNation(null)?.id ?? 'home';
  // The only way the request leaves: the sovereignty gate (off unless a named official enabled it).
  const gate = transmit(nationId, 'ai-advisory', `${resource} · ${model.label}`, { model: model.label, institution: input.label, posture: input.posture, escalationTier: input.escalationTier, figures: Object.fromEntries((['readiness', 'incidents', 'budgetPressure', 'slaCompliance'] as const).map(f => [f, { value: input[f], kind: input.kinds[f] }])), promptSha256: sha(prompt) });
  if (!gate.sent) {
    recordAudit(actor.label, 'ai.advisory', resource, 'fallback', `model=${model.label}; in=sha256:${sha(prompt)}; out=none; source=rules (AI advisory sharing is off under the data-sovereignty settings)`);
    return NextResponse.json({ ...rules(input), heldBack: true });
  }
  let text = '';
  try {
    text = await complete(model, prompt);
    const parsed = JSON.parse(text);
    const response: AdvisoryResponse = {
      headline: String(parsed.headline ?? '').slice(0, 300),
      rationale: String(parsed.rationale ?? '').slice(0, 600),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((r: unknown) => String(r).slice(0, 200)).slice(0, 3)
        : [],
      severity: severityOf(input),
      confidence: 88,
      source: 'model',
    };
    recordAudit(actor.label, 'ai.advisory', resource, 'ok', `model=${model.label}; in=sha256:${sha(prompt)}; out=sha256:${sha(text)}; source=model`);
    return NextResponse.json(response);
  } catch (e) {
    // Fallback if the model call or the JSON parse fails.
    const reason = e instanceof SyntaxError ? 'unreadable answer' : 'model unavailable';
    recordAudit(actor.label, 'ai.advisory', resource, 'fallback', `model=${model.label}; in=sha256:${sha(prompt)}; out=${text ? `sha256:${sha(text)}` : 'none'}; source=rules (${reason})`);
    return NextResponse.json(rules(input));
  }
}
