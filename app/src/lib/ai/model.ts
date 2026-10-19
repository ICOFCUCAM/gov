// The model service behind the AI assistant (review R11): the nation picks it
// in setup (SovereignProfile.aiAssistantModel): the default provider's public
// service, or its own sovereign or on-premises model through the same
// Anthropic Messages API (`api: 'anthropic'` with an endpoint) or an
// OpenAI-compatible chat completions API (`api: 'openai'`, which most
// self-hosted model servers offer). The key comes from CIVICOS_AI_API_KEY
// (ANTHROPIC_API_KEY also works for the default provider) and never from the
// nation profile. Callers send only through the data-sovereignty gate
// (lib/data/sovereignty.ts, category 'ai-advisory').

import Anthropic from '@anthropic-ai/sdk';
import type { AiAssistantModel } from '@/lib/api/types';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const TIMEOUT_MS = 20_000;

export interface ResolvedModel { api: 'anthropic' | 'openai'; endpoint?: string; model: string; label: string }

export function resolveModel(m: AiAssistantModel | undefined): ResolvedModel {
  const api = m?.api ?? 'anthropic';
  const model = m?.model || (api === 'anthropic' ? DEFAULT_MODEL : '');
  const endpoint = m?.endpoint || undefined;
  return { api, endpoint, model, label: `${api}:${model || '(unset)'}${endpoint ? `@${new URL(endpoint).host}` : ''}` };
}

/** Send one prompt and return the model's text. Throws when the service fails or is not configured. */
export async function complete(m: ResolvedModel, prompt: string, maxTokens = 300, fetchImpl: typeof fetch = fetch): Promise<string> {
  const apiKey = process.env.CIVICOS_AI_API_KEY || undefined;
  if (m.api === 'anthropic') {
    const client = new Anthropic({ ...(apiKey ? { apiKey } : {}), ...(m.endpoint ? { baseURL: m.endpoint } : {}), timeout: TIMEOUT_MS, maxRetries: 0 });
    const message = await client.messages.create({ model: m.model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
    const block = message.content[0];
    return block?.type === 'text' ? block.text : '';
  }
  if (!m.endpoint || !m.model) throw new Error('The OpenAI-compatible model service needs an address and a model name (setup 1.6)');
  const res = await fetchImpl(`${m.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model: m.model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'error',
  });
  if (!res.ok) throw new Error(`The model service answered ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? '';
}
