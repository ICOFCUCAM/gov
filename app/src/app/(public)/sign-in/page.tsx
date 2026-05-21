import { SignInForm } from './SignInForm';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <main className="max-w-md mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="text-ink-muted mt-2">
          Use your civic email and password to access the platform. Citizens
          and officers share the same sign-in surface; your identity is
          resolved from the substrate.
        </p>
      </div>
      <SignInForm />
    </main>
  );
}
