// Public — privacy notice shared by every public institution site.

import { PublicDocument, DocSection } from '@/apps/_shared/public/PublicDocument';
import { currentOffices } from '@/lib/nation/registry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Privacy notice' };

export default function PrivacyNoticePage() {
  const o = currentOffices();
  return (
    <PublicDocument kicker="Public websites" title="Privacy notice" template
      intro={`How the ${o.government} handles personal data when you use its public websites and online services.`}>
      <DocSection title="Who is responsible">
        <p>The {o.government} is the controller for these websites. Each institution is responsible for the services it runs; the office that handles your request is named on every receipt.</p>
      </DocSection>
      <DocSection title="What we collect">
        <p>Reading the public websites needs no account and no personal data. The servers keep short technical logs (time, page and network address) to keep the service secure; they are not used to profile anyone.</p>
        <p>When you use an online service — an application, a payment, an appeal — we collect only what that service needs, and you see it in your Civic Wallet with a receipt for every action.</p>
      </DocSection>
      <DocSection title="No tracking, data kept in the country">
        <p>The public websites load no third-party advertising or tracking scripts. Data is stored and processed in facilities under national jurisdiction; operational data leaves only when a named official has enabled it, and that choice is recorded in the audit chain.</p>
      </DocSection>
      <DocSection title="Your rights">
        <p>You can see what the state holds about you in your Civic Wallet, export it, ask for corrections, and contest any decision from its receipt. Where national law allows, you can ask for data to be erased.</p>
        <p>If you are not satisfied with an answer, you can complain to the national data protection authority.</p>
      </DocSection>
    </PublicDocument>
  );
}
