// The AI advisory for a console panel (per-nation opt-in; register 2.1).
// The body is validated (lib/ai/advisory-input.ts: types, ranges, a label
// cap, control characters stripped), each figure carries its SignalKind and
// the prompt tells the model which figures are samples. Every call is
// audited: who asked, the model, SHA-256 of the prompt and of the answer,
// and whether the model or the rule-based fallback answered.
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSovereign, recordAudit } from '@/lib/data/store';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { parseAdvisoryInput, advisoryPrompt, severityOf, type AdvisoryInput } from '@/lib/ai/advisory-input';

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

const MODEL = 'claude-haiku-4-5-20251001';
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

async function actor(): Promise<string> {
  const o = await currentOfficial().catch(() => null);
  return o ? actorLabel(o) : 'console (no signed-in official)';
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
  const raw = await req.json().catch(() => null);
  const input = parseAdvisoryInput(raw);
  if ('error' in input) {
    recordAudit(await actor(), 'ai.advisory', 'Institution:?', 'denied', `invalid request: ${input.error}`);
    return NextResponse.json(input, { status: 422 });
  }
  const resource = `Institution:${input.institution ?? input.label}`;
  const prompt = advisoryPrompt(input);
  const who = await actor();
  let text = '';
  try {
    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    text = block?.type === 'text' ? block.text : '';
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
    recordAudit(who, 'ai.advisory', resource, 'ok', `model=${MODEL}; in=sha256:${sha(prompt)}; out=sha256:${sha(text)}; source=model`);
    return NextResponse.json(response);
  } catch (e) {
    // Fallback if the model call or the JSON parse fails.
    const reason = e instanceof SyntaxError ? 'unreadable answer' : 'model unavailable';
    recordAudit(who, 'ai.advisory', resource, 'fallback', `model=${MODEL}; in=sha256:${sha(prompt)}; out=${text ? `sha256:${sha(text)}` : 'none'}; source=rules (${reason})`);
    return NextResponse.json(rules(input));
  }
}
