// /api/messaging — the nation's email and SMS delivery (lib/messaging):
// the providers its administrator connected, the platform's public address
// for links, and where messages stand (counts and statuses; addresses masked,
// never message text). Administrators only (ADMIN_ONLY in lib/auth/roles.ts;
// reads checked here too). The nation is the installed one: callers never
// name one.
//
// POST actions: save-provider, remove-provider, settings, test (send one
// message now to an address the administrator gives; the address is neither
// kept nor audited),
// retry or discard a dead letter. Every change is audited without secrets or
// addresses.
import { NextRequest, NextResponse } from 'next/server';
import { refusal, withOfficial } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { INSTALLED_NATION, counts, deadLetterAction, messagesWhere, view, type MessageView } from '@/lib/messaging/outbox';
import { PROVIDER_KINDS, connection, getSettings, listProviders, privateNetworkAllowed, publicBase, removeProvider, saveProvider, saveSettings, secretsSealed, type ProviderInput } from '@/lib/messaging/providers';
import { sendTest } from '@/lib/messaging/deliver';
import type { MessageChannel, MessagingSettings, ProviderView } from '@/lib/messaging/types';

export const dynamic = 'force-dynamic';

export interface MessagingStatus {
  nationId: string;
  channels: Record<MessageChannel, 'connected' | 'not connected'>;
  providers: ProviderView[];
  kinds: typeof PROVIDER_KINDS;
  settings: MessagingSettings;
  /** The address links in messages start with (the setting, else CIVICOS_PUBLIC_URL), or null: messages with links wait. */
  publicBase: string | null;
  secretsSealed: boolean;
  privateNetwork: boolean;
  counts: ReturnType<typeof counts>;
  recent: MessageView[];
  dead: MessageView[];
}

function status(): MessagingStatus {
  const n = INSTALLED_NATION;
  const mine = messagesWhere(m => m.nationId === n);
  return {
    nationId: n,
    channels: { email: connection(n, 'email'), sms: connection(n, 'sms') },
    providers: listProviders(n),
    kinds: PROVIDER_KINDS,
    settings: getSettings(n),
    publicBase: publicBase(n),
    secretsSealed: secretsSealed(),
    privateNetwork: privateNetworkAllowed(),
    counts: counts(n),
    recent: mine.slice(-50).reverse().map(view),
    dead: mine.filter(m => m.status === 'dead').slice(-50).reverse().map(view),
  };
}

export async function GET() {
  const no = await refusal(adminOnly);
  if (no) return no;
  return NextResponse.json(status());
}

export async function POST(req: NextRequest) {
  const no = await refusal(adminOnly);
  if (no) return no;
  let raw: Record<string, unknown>;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const b = await withOfficial(raw as { action?: string; by?: string; provider?: ProviderInput; id?: string; to?: string; publicUrl?: string | null });
  const by = String(b.by ?? '').trim();
  const n = INSTALLED_NATION;
  const out = b.action === 'save-provider' ? saveProvider(n, b.provider ?? {}, by)
    : b.action === 'remove-provider' ? removeProvider(n, String(b.id ?? ''), by)
    : b.action === 'settings' ? saveSettings(n, { publicUrl: b.publicUrl }, by)
    : b.action === 'test' ? await sendTest(n, String(b.id ?? ''), String(b.to ?? ''), by)
    : b.action === 'retry' || b.action === 'discard' ? deadLetterAction(n, String(b.id ?? ''), b.action, by)
    : { error: 'action must be save-provider, remove-provider, settings, test, retry or discard', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, result: out, status: status() });
}
