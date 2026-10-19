// CivicOS — Update Center release communication, server-side.
//
// What's new: each release's summary and changes in the nation's language
// when the publisher has a translation, otherwise in English marked
// "translation pending" (the labels come from the nation's dictionary via
// nationMessages() in lib/i18n). Each release lists its training and
// administrator-guide material.
//
// Alerts: each nation names the officials who should hear about updates,
// with their channels (email, SMS) and what they subscribe to — security,
// releases, incidents, end of life. alert() fans an event out to every
// subscribed official on every enabled channel and records the deliveries;
// no email or SMS provider is connected yet, so deliveries are queued
// (placeholder, docs/INTEGRATION_REGISTER.md §13). Changes to officials and
// subscriptions are audited; each alert is audited once.
//
// This module does not import the release store: callers pass what it needs
// (lib/data/updates.ts calls alert() on publish, incident and EOL notice).

import type { AlertCategory, AlertChannel, AlertDelivery, ChangeKind, DistributionRelease, Official, ReleaseResource, WhatsNew } from '@/lib/api/types';
import { recordAudit } from '@/lib/data/store/audit';

export const CATEGORIES: AlertCategory[] = ['security', 'releases', 'incidents', 'eol'];
export const CHANNELS: AlertChannel[] = ['email', 'sms'];
const DOCS = 'https://docs.civicos.example';

interface Translation { summary: string; changes: string[]; by: string; at: string }
interface CommsDb { translations: Record<string, Record<string, Translation>>; resources: Record<string, ReleaseResource[]>; officials: Record<string, Official[]>; outbox: AlertDelivery[]; seq: number }

function seed(): CommsDb {
  const on = (s: Partial<Record<AlertCategory, boolean>>) => ({ security: false, releases: false, incidents: false, eol: false, ...s });
  return {
    translations: {
      'DR-141': {
        sw: { summary: 'Sasisho la usalama: vipindi vya kuingia vinaimarishwa wakati mamlaka ya afisa yanapobadilika.', changes: ['Kitambulisho cha kipindi kinabadilishwa mamlaka yanapobadilika (CSA-2026-07).', 'Majina ya taasisi yanaonyeshwa kwa usalama (CSA-2026-05).'], by: 'Release engineering', at: new Date().toISOString() },
        fr: { summary: 'Mise à jour de sécurité : les sessions sont renforcées lorsque les droits d’un agent changent.', changes: ['L’identifiant de session est renouvelé lors d’un changement de droits (CSA-2026-07).', 'Les noms d’institutions sont affichés de façon sûre (CSA-2026-05).'], by: 'Release engineering', at: new Date().toISOString() },
      },
    },
    resources: {},
    officials: {
      home: [
        { id: 'OF-1', name: 'Chief Information Officer', role: 'Owns platform upgrades', email: 'cio@gov.example', channels: { email: true, sms: false }, subscriptions: on({ security: true, releases: true, incidents: true, eol: true }) },
        { id: 'OF-2', name: 'Chief Information Security Officer', role: 'Security and incidents', email: 'ciso@gov.example', sms: '+000 0000 0002', channels: { email: true, sms: true }, subscriptions: on({ security: true, incidents: true }) },
        { id: 'OF-3', name: 'Permanent Secretary, ICT', role: 'Budget and planning', email: 'ps.ict@gov.example', channels: { email: true, sms: false }, subscriptions: on({ eol: true, releases: true }) },
      ],
    },
    outbox: [],
    seq: 1,
  };
}
const g = globalThis as unknown as { __civicosComms?: CommsDb };
function cdb(): CommsDb { return (g.__civicosComms ??= seed()); }
export function resetComms(): void { g.__civicosComms = undefined; }

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ── What's new ───────────────────────────────────────────────────────
export function releaseResources(r: DistributionRelease): ReleaseResource[] {
  const v = r.version;
  const base: ReleaseResource[] = [
    { kind: 'admin-guide', title: `Administrator guide — ${v}`, url: `${DOCS}/admin/${encodeURIComponent(v)}`, language: 'en', placeholder: true },
    { kind: 'training', title: `What changed in ${v}: officer training (30 minutes)`, url: `${DOCS}/training/${encodeURIComponent(v)}`, language: 'en', placeholder: true },
  ];
  if (r.delivery.includes('self-hosted') || r.delivery.includes('air-gapped')) base.push({ kind: 'runbook', title: `Upgrade and rollback runbook — ${v}`, url: `${DOCS}/runbooks/${encodeURIComponent(v)}`, language: 'en', placeholder: true });
  return [...base, ...(cdb().resources[r.id] ?? [])];
}

export function whatsNew(r: DistributionRelease, locale: string): WhatsNew {
  const lang = (locale || 'en').toLowerCase();
  const t = lang === 'en' ? undefined : cdb().translations[r.id]?.[lang];
  const english = r.changes.map(c => ({ kind: c.kind as ChangeKind, text: c.text }));
  return {
    releaseId: r.id, version: r.version, locale: lang, translated: lang === 'en' || !!t, pending: lang !== 'en' && !t,
    summary: t?.summary ?? r.summary,
    changes: t ? english.map((c, i) => ({ kind: c.kind, text: t.changes[i] ?? c.text })) : english,
    resources: releaseResources(r),
  };
}

export function translationCoverage(releaseIds: string[], locales: string[]): Record<string, Record<string, boolean>> {
  return Object.fromEntries(releaseIds.map(id => [id, Object.fromEntries(locales.filter(l => l !== 'en').map(l => [l, !!cdb().translations[id]?.[l]]))]));
}

export function addTranslation(r: DistributionRelease, input: { locale?: string; summary?: string; changes?: string[]; by?: string }): { ok: true } | { error: string; status: number } {
  const locale = str(input.locale, 8).toLowerCase(), summary = str(input.summary, 1000), by = str(input.by, 120);
  if (!/^[a-z]{2,3}$/.test(locale) || locale === 'en') return { error: 'Give the language code (e.g. sw, fr, ar)', status: 422 };
  if (summary.length < 10) return { error: 'Translate the summary', status: 422 };
  if (!by) return { error: 'Name who provided the translation', status: 422 };
  const changes = (input.changes ?? []).map(c => str(c, 1000));
  (cdb().translations[r.id] ??= {})[locale] = { summary, changes, by, at: new Date().toISOString() };
  recordAudit(by, 'update.release.translation', `Release:${r.version}`, 'ok', `${locale} · ${changes.filter(Boolean).length}/${r.changes.length} changes`);
  return { ok: true };
}

export function addResource(r: DistributionRelease, input: { kind?: string; title?: string; url?: string; language?: string; by?: string }): ReleaseResource | { error: string; status: number } {
  const kind = input.kind as ReleaseResource['kind'];
  if (!['training', 'admin-guide', 'runbook', 'video'].includes(kind)) return { error: 'Kind must be training, admin-guide, runbook or video', status: 422 };
  const title = str(input.title, 200), url = str(input.url, 500), by = str(input.by, 120);
  if (title.length < 3 || !/^https:\/\//.test(url) || !by) return { error: 'Give a title, an https:// link and your name', status: 422 };
  const res: ReleaseResource = { kind, title, url, language: str(input.language, 8) || 'en' };
  (cdb().resources[r.id] ??= []).push(res);
  recordAudit(by, 'update.release.resource', `Release:${r.version}`, 'ok', `${kind} · ${title}`);
  return res;
}

// ── Officials and subscriptions ──────────────────────────────────────
export function listOfficials(nationId: string): Official[] { return structuredClone(cdb().officials[nationId] ?? []); }

export function saveOfficial(nationId: string, input: Partial<Official> & { by?: string }): Official | { error: string; status: number } {
  const by = str(input.by, 120);
  if (!by) return { error: 'Name who is making the change', status: 422 };
  const list = (cdb().officials[nationId] ??= []);
  const existing = input.id ? list.find(o => o.id === input.id) : undefined;
  if (input.id && !existing) return { error: 'Official not found', status: 404 };
  const name = str(input.name ?? existing?.name, 120), role = str(input.role ?? existing?.role, 160);
  const email = str(input.email ?? existing?.email, 200) || undefined, sms = str(input.sms ?? existing?.sms, 40) || undefined;
  if (name.length < 3) return { error: 'Give the official’s name or title', status: 422 };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email address does not look right', status: 422 };
  if (sms && !/^\+?[0-9 ()-]{6,}$/.test(sms)) return { error: 'That phone number does not look right', status: 422 };
  const channels = { email: !!(input.channels?.email ?? existing?.channels.email ?? !!email), sms: !!(input.channels?.sms ?? existing?.channels.sms ?? false) };
  if (channels.email && !email) return { error: 'Add an email address to alert by email', status: 422 };
  if (channels.sms && !sms) return { error: 'Add a phone number to alert by SMS', status: 422 };
  const subscriptions = Object.fromEntries(CATEGORIES.map(c => [c, !!(input.subscriptions?.[c] ?? existing?.subscriptions[c] ?? false)])) as Official['subscriptions'];
  const o: Official = { id: existing?.id ?? `OF-${Date.now().toString(36)}-${list.length + 1}`, name, role, email, sms, channels, subscriptions };
  if (existing) Object.assign(existing, o); else list.push(o);
  recordAudit(by, existing ? 'update.alerts.official.update' : 'update.alerts.official.add', `UpdateChamber:${nationId}/alerts`, 'ok',
    `${name} · ${CHANNELS.filter(c => channels[c]).join('+') || 'no channel'} · ${CATEGORIES.filter(c => subscriptions[c]).join(',') || 'nothing'}`);
  return structuredClone(o);
}

export function removeOfficial(nationId: string, id: string, by: string): { ok: true } | { error: string; status: number } {
  const list = cdb().officials[nationId] ?? [];
  const i = list.findIndex(o => o.id === id);
  if (i < 0) return { error: 'Official not found', status: 404 };
  if (!by.trim()) return { error: 'Name who is making the change', status: 422 };
  const [o] = list.splice(i, 1);
  recordAudit(by.trim(), 'update.alerts.official.remove', `UpdateChamber:${nationId}/alerts`, 'ok', o!.name);
  return { ok: true };
}

// ── Alerts ────────────────────────────────────────────────────────────
/** Fan an event out to the nation's subscribed officials. Returns the deliveries queued. */
export function alert(nationId: string, category: AlertCategory, subject: string, ref?: string, now = Date.now()): AlertDelivery[] {
  const db = cdb();
  const at = new Date(now).toISOString();
  const out: AlertDelivery[] = [];
  for (const o of db.officials[nationId] ?? []) {
    if (!o.subscriptions[category]) continue;
    for (const ch of CHANNELS) {
      const to = ch === 'email' ? o.email : o.sms;
      if (!o.channels[ch] || !to) continue;
      out.push({ id: `AL-${db.seq++}`, at, nationId, category, subject, ref, officialId: o.id, officialName: o.name, channel: ch, to, status: 'queued' });
    }
  }
  db.outbox.push(...out);
  recordAudit('system (alerts)', 'update.alert', `UpdateChamber:${nationId}/alerts`, 'ok', `${category} · ${subject} · ${out.length} deliveries queued`);
  return out;
}

export function outbox(nationId: string, limit = 30): AlertDelivery[] {
  return cdb().outbox.filter(d => d.nationId === nationId).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)).slice(0, limit);
}
