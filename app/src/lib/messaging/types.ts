// The platform's outbound messages (email and SMS) and the providers a nation
// connects to send them. See lib/messaging/outbox.ts for the rules.

export type MessageChannel = 'email' | 'sms';
/** Where a message comes from: Update Center alerts, a public site's email updates, an administrator's test. */
export type MessageStream = 'alerts' | 'site-updates' | 'test';
/**
 * queued: waiting for its first attempt (or for a provider to be connected);
 * sending: claimed by a delivery run; retrying: an attempt failed and another
 * is due at `nextAttemptAt`; sent: the provider accepted it; dead: given up,
 * with the reason; cancelled: withdrawn before it was sent (an unsubscribe).
 */
export type MessageStatus = 'queued' | 'sending' | 'retrying' | 'sent' | 'dead' | 'cancelled';

export interface OutboundMessage {
  id: string;
  /** Idempotency key: enqueuing the same key again returns this message; sent with it to the provider. */
  key: string;
  /** The nation whose providers send it (the installed nation for its own sites). */
  nationId: string;
  channel: MessageChannel;
  stream: MessageStream;
  /** e.g. alert.security, site.confirm, site.update, test. */
  kind: string;
  /** The address or number; emptied once the message is sent, cancelled or its dead letter is cleared. */
  to: string;
  /** What screens show instead of the address. */
  toMasked: string;
  subject: string;
  /** Plain text; `{link}` and `{unsubscribe}` are replaced by absolute addresses when sent. Emptied with `to`. */
  text: string;
  /** A platform path the text links to (made absolute with the nation's public address when sent). */
  link?: string;
  /** A platform path for one-click unsubscribe (List-Unsubscribe / List-Unsubscribe-Post, RFC 8058). */
  unsubscribe?: string;
  locale: string;
  /** What the message is about, so it can be withdrawn (an unsubscribed subscriber, a removed official). */
  ref?: { kind: 'site-subscriber' | 'official'; id: string; siteId?: string };
  status: MessageStatus;
  attempts: number;
  nextAttemptAt: string;
  /** While `sending`: when the claim lapses (a run that died); the message is then retried. */
  leaseUntil?: string;
  /** The last failure, with addresses and numbers removed. */
  lastError?: string;
  providerId?: string;
  providerMessageId?: string;
  createdAt: string;
  sentAt?: string;
  finishedAt?: string;
  /** After this time the message is no longer worth sending (a confirmation link that has expired). */
  expiresAt?: string;
}

export type ProviderKind = 'smtp' | 'http-email' | 'http-sms';

export interface ProviderConfig {
  id: string;
  nationId: string;
  kind: ProviderKind;
  channel: MessageChannel;
  name: string;
  enabled: boolean;
  /** Lower first; the next enabled provider of the channel is tried when one fails. */
  priority: number;
  /** Sender: an email address, or the SMS sender name or number. */
  from: string;
  replyTo?: string;
  // SMTP
  host?: string;
  port?: number;
  /** STARTTLS (587) or implicit TLS (465); a connection without TLS is never made. */
  security?: 'starttls' | 'tls';
  username?: string;
  /** An internal certificate authority the relay's certificate is issued by (PEM). */
  caPem?: string;
  // HTTPS API (email or SMS gateway)
  url?: string;
  method?: 'POST' | 'PUT';
  contentType?: 'json' | 'form';
  /** Header templates, e.g. { Authorization: 'Bearer {{secret}}' }. */
  headers?: Record<string, string>;
  /** Body template with {{to}}, {{from}}, {{subject}}, {{text}}, {{key}}, {{secret}}, {{username}}, {{basic}}, {{unsubscribe}}. */
  bodyTemplate?: string;
  /** Password or API key, sealed (lib/crypto/envelope.ts); never returned by the API. */
  secret?: string;
  /** Messages per minute this provider accepts from the platform. */
  perMinute: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  lastResult?: { at: string; ok: boolean; detail: string };
}

/** A provider as the API shows it: never the secret. */
export type ProviderView = Omit<ProviderConfig, 'secret'> & { hasSecret: boolean };

export interface MessagingSettings {
  /** The address people reach the platform at, for links in messages (e.g. https://www.gov.example). */
  publicUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** A message ready for a provider. */
export interface RenderedMessage {
  key: string;
  channel: MessageChannel;
  to: string;
  subject: string;
  text: string;
  headers: Record<string, string>;
}

/** What a provider answered. `permanent` failures are not retried (a refused recipient). */
export type SendResult = { ok: true; id?: string } | { ok: false; permanent: boolean; error: string };
