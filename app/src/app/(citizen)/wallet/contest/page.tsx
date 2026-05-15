import Link from 'next/link';
import { Plain } from '@/components/ui/Plain';
import { Button } from '@/components/ui/Button';

export default function ContestInfoPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <p>
        <Link href="/wallet" className="text-link underline underline-offset-2">← Back to wallet</Link>
      </p>
      <h1 className="text-3xl font-semibold">Your right to question any decision</h1>
      <Plain>
        Every decision the state makes about you can be questioned, contested,
        or appealed. You will not be punished for questioning. Your benefits
        continue while we review.
      </Plain>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">How to do it</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Open the receipt of the decision in your wallet.</li>
          <li>
            Tap <strong>“Question this decision”</strong>.
          </li>
          <li>Choose what you want to do — question, contest, or complain.</li>
          <li>Say why, in your own words or by picking a reason.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Other ways to question a decision</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dial <strong>*civic#</strong> on any phone (no data needed).</li>
          <li>Walk into any government office.</li>
          <li>Ask any authorised agent in your community.</li>
          <li>Call <strong>199</strong>.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">If you're not satisfied</h2>
        <p>
          You can escalate to the <strong>Algorithmic Ombudsman</strong>, the{' '}
          <strong>Inspector General</strong>, or the courts. You can also ask a
          civil society partner for help. The platform never decides what you
          can or cannot escalate.
        </p>
      </section>

      <p>
        <Link href="/wallet/receipt/R-3F9A2">
          <Button>See a sample receipt with the contest flow →</Button>
        </Link>
      </p>
    </main>
  );
}
