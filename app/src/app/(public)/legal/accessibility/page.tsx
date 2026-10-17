// Public — accessibility statement shared by every public institution site.

import { PublicDocument, DocSection } from '@/apps/_shared/public/PublicDocument';
import { currentOffices } from '@/lib/nation/registry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Accessibility statement' };

export default function AccessibilityStatementPage() {
  const o = currentOffices();
  return (
    <PublicDocument kicker="Public websites" title="Accessibility statement" template
      intro={`The ${o.government} wants everyone to be able to use its websites, whatever their ability, device or connection.`}>
      <DocSection title="Standard">
        <p>The public websites aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA: text that can be enlarged (the A+ / A / A− controls on every site), keyboard access, sufficient contrast and descriptions for images and maps.</p>
      </DocSection>
      <DocSection title="Known limitations">
        <p>Some content is still in the platform&apos;s reference wording and is not yet available in every national language. Some maps and charts have text alternatives that summarise rather than list every value.</p>
      </DocSection>
      <DocSection title="Feedback">
        <p>If something on these websites does not work for you, tell the institution through its Contact section or through &quot;Talk to a human officer&quot; in the Civic Wallet. Each report is tracked and answered.</p>
      </DocSection>
      <DocSection title="Review">
        <p>The statement is reviewed whenever the websites change and at least once a year.</p>
      </DocSection>
    </PublicDocument>
  );
}
