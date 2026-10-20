import { Card } from '@/components/ui/Card';
import { Plain } from '@/components/ui/Plain';
import { SignInButton } from './SignInButton';
import { samplesAllowed } from '@/lib/ops/mode';
export const metadata = { title: 'Sign in' };


export default function LoginPage() {
  // A production installation has no demo citizen (lib/ops/mode.ts); citizens sign in through the
  // nation's identity provider once it is connected (docs/GOVERNMENT_OPERATING_MODEL.md §10.1).
  if (!samplesAllowed()) {
    return (
      <main className="max-w-md mx-auto px-6 py-12 space-y-6">
        <h1 className="text-3xl font-semibold">Sign in to Civic Wallet</h1>
        <Card tight>
          <h2 className="font-semibold">Online sign-in is not open yet</h2>
          <p className="text-sm text-ink-muted mt-1">
            Citizens will sign in here through the national identity service once it is connected.
            Until then, any government office can help you with your application in person.
          </p>
        </Card>
      </main>
    );
  }
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
          <SignInButton label="Continue with an agent" />
        </Card>

        <Card tight>
          <h2 className="font-semibold">Visit an office</h2>
          <p className="text-sm text-ink-muted mb-3">
            Any government office can verify you and activate your wallet.
          </p>
          <SignInButton label="Continue at an office" />
        </Card>

        <Card tight>
          <h2 className="font-semibold">Verify on this device</h2>
          <p className="text-sm text-ink-muted mb-3">
            Use your security token and biometric. Your biometric never leaves
            your device.
          </p>
          <SignInButton label="Verify and continue" primary />
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
