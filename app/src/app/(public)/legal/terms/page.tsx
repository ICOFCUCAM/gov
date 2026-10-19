// Public — terms of use shared by every public institution site.

import { PublicDocument, DocSection } from '@/apps/_shared/public/PublicDocument';
import { currentOffices } from '@/lib/nation/registry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Terms of use' };

export default function TermsOfUsePage() {
  const o = currentOffices();
  return (
    <PublicDocument kicker="Public websites" title="Terms of use" template
      intro={`The terms that apply when you use the public websites of the ${o.government}.`}>
      <DocSection title="Official information">
        <p>These are official websites. Content marked as a sample is reference material shown until the institution publishes its own, and is not an official statement.</p>
      </DocSection>
      <DocSection title="Reuse">
        <p>Unless a page says otherwise, public information on these websites may be reused with attribution. Open data is published with its own licence in the Public Observatory.</p>
      </DocSection>
      <DocSection title="Online services">
        <p>Applications, payments and appeals are governed by the law that sets up each service. Every action gives you a signed receipt; decisions can be contested from it.</p>
      </DocSection>
      <DocSection title="Links and availability">
        <p>Links to other institutions&apos; websites are provided for convenience. The websites are run to published service levels; planned maintenance is announced in advance.</p>
      </DocSection>
      <DocSection title="Governing law">
        <p>These terms are governed by the law of {o.stateName}.</p>
      </DocSection>
    </PublicDocument>
  );
}
