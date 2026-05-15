import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';

export default function LoginPage() {
  return (
    <main className="max-w-md mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Sign in to Civic Wallet</h1>
        <p className="text-ink-muted mt-2">
          We need to confirm this is really you. Choose how you want to verify.
          No social login. No password to steal.
        </p>
      </div>

      <div className="space-y-3">
        <Card tight>
          <h2 className="font-semibold">Visit an agent</h2>
          <p className="text-sm text-ink-muted mb-3">
            An authorised agent in your community verifies you in person.
            Recommended if you have no smartphone.
          </p>
          <Link href="/wallet">
            <Button variant="secondary">Continue with an agent</Button>
          </Link>
        </Card>

        <Card tight>
          <h2 className="font-semibold">Visit an office</h2>
          <p className="text-sm text-ink-muted mb-3">
            Any government office can verify you and activate your wallet.
          </p>
          <Link href="/wallet">
            <Button variant="secondary">Continue at an office</Button>
          </Link>
        </Card>

        <Card tight>
          <h2 className="font-semibold">Verify on this device</h2>
          <p className="text-sm text-ink-muted mb-3">
            Use your security token and biometric. Your biometric never leaves
            your device.
          </p>
          <Link href="/wallet">
            <Button>Verify and continue</Button>
          </Link>
        </Card>
      </div>

      <Plain>
        We never share your data without your consent. You can see who has
        looked at your records, always. You can leave any time and take your
        data. We never sell your data.
      </Plain>

      <p className="text-sm text-ink-muted text-center">
        Prototype — any option signs you in as the demo citizen.
      </p>
    </main>
  );
}
