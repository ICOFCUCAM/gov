// The wording of messages, in the nation's languages where the dictionaries
// have it (lib/i18n): a public site's emails in the language the visitor
// chose (siteMessages(locale), the shared site wording), Update Center alerts
// in the nation's language (nationMessages().releaseNotes). A dictionary
// without these texts gives the whole message in English, never half of one.
// `{link}` and `{unsubscribe}` stay in the text until the message is sent
// (lib/messaging/deliver.ts makes them absolute with the public address).

import { siteMessages, nationMessages, nationLocale } from '@/lib/nation/registry';
import { getMessages, t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import type { AlertCategory } from '@/lib/api/types';

type SiteEmail = NonNullable<ReturnType<typeof siteMessages>['emails']>;
type AlertEmail = NonNullable<ReturnType<typeof nationMessages>['releaseNotes']['alertEmail']>;

function siteEmail(locale: string): { texts: SiteEmail; locale: string } {
  const own = siteMessages(locale).emails;
  return own ? { texts: own, locale } : { texts: getMessages('en' as Locale).site.emails!, locale: 'en' };
}

/** The confirmation email for a public site's updates. */
export function siteConfirmation(siteName: string, days: number, locale: string): { subject: string; text: string; locale: string } {
  const { texts: e, locale: used } = siteEmail(locale);
  return {
    subject: t(e.confirmSubject, { name: siteName }),
    text: `${t(e.confirmBody, { name: siteName, days })}\n\n{link}\n`,
    locale: used,
  };
}

/** An update to a site's subscribers: the announcement, then how to stop them. */
export function siteUpdate(subject: string, body: string, locale: string): { subject: string; text: string; locale: string } {
  const { texts: e, locale: used } = siteEmail(locale);
  return { subject, text: `${body}\n\n—\n${t(e.unsubscribeLine, { link: '{link}' })}\n`, locale: used };
}

/** An Update Center alert to a named official, in the nation's language. */
export function alertMessage(category: AlertCategory, subject: string, channel: 'email' | 'sms'): { subject: string; text: string; locale: string } {
  const own = nationMessages().releaseNotes.alertEmail;
  const e: AlertEmail = own ?? getMessages('en' as Locale).releaseNotes.alertEmail!;
  const locale = own ? nationLocale() : 'en';
  const cat = e.categories[category];
  if (channel === 'sms') return { subject: '', text: `${t(e.smsPrefix, { category: cat })}: ${subject}`.slice(0, 300), locale };
  return {
    subject: t(e.subject, { category: cat, subject }),
    text: `${t(e.body, { category: cat, subject })}\n\n${t(e.open, { link: '{link}' })}\n\n—\n${t(e.footer, { category: cat })}\n`,
    locale,
  };
}
