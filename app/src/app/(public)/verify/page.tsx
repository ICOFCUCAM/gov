// Public — check a certificate by its code (lib/records/certificates.ts). A
// plain form: works without JavaScript; it opens /verify/<code>.

import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { VerifyForm } from './VerifyForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Check a certificate', robots: { index: false } };

export default async function VerifyPage() {
  const t = siteMessages(await visitorLocale());
  return (
    <PublicDocument kicker={t.verifyTitle} title={t.verifyTitle} intro={t.verifyIntro}>
      <VerifyForm label={t.verifyCode} button={t.verifyCheck} />
    </PublicDocument>
  );
}
