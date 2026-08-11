import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export interface AdvisoryRequest {
  label: string;
  posture: string;
  escalationTier: number;
  readiness: number;
  incidents: number;
  budgetPressure: number;
  slaCompliance: number;
  constitutional: string;
}

export interface AdvisoryResponse {
  headline: string;
  rationale: string;
  recommendations: string[];
  severity: 'routine' | 'advisory' | 'priority' | 'critical';
  confidence: number;
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const body: AdvisoryRequest = await req.json();

  const { label, posture, escalationTier, readiness, incidents, budgetPressure, slaCompliance, constitutional } = body;

  const severity: AdvisoryResponse['severity'] =
    escalationTier >= 3 || (readiness < 40 && incidents > 3) ? 'critical'
    : escalationTier >= 2 || readiness < 55 ? 'priority'
    : escalationTier >= 1 || budgetPressure >= 65 ? 'advisory'
    : 'routine';

  const prompt = `You are a sovereign government operational intelligence system. Analyse this institution's operational snapshot and return a concise advisory in JSON.

Institution: ${label}
Current posture: ${posture} (escalation tier ${escalationTier}/3)
Readiness: ${readiness}%
SLA compliance: ${slaCompliance}%
Budget pressure index: ${budgetPressure}/100
Active incidents: ${incidents}
Constitutional status: ${constitutional}

Respond with ONLY valid JSON matching this exact schema (no markdown, no preamble):
{
  "headline": "one sentence, direct operational assessment",
  "rationale": "two sentences max — what the numbers indicate and why it matters",
  "recommendations": ["action 1", "action 2", "action 3"]
}

Rules:
- Headline must be actionable, not a restatement of metrics
- Recommendations must be concrete and sequenced (most urgent first)
- No bureaucratic filler; every word must carry operational weight
- Severity context: ${severity}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    const text = block?.type === 'text' ? block.text : '';
    const parsed = JSON.parse(text);

    const response: AdvisoryResponse = {
      headline: String(parsed.headline ?? ''),
      rationale: String(parsed.rationale ?? ''),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String).slice(0, 3)
        : [],
      severity,
      confidence: 88,
    };

    return NextResponse.json(response);
  } catch {
    // Fallback if LLM call fails or JSON parse fails
    const fallback: AdvisoryResponse = {
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
      severity,
      confidence: 72,
    };
    return NextResponse.json(fallback);
  }
}
