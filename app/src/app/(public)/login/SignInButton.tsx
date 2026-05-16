'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

/** Establishes a demo sovereign session cookie, then routes onward.
 *  The cookie is what middleware checks when CIVICOS_AUTH=enforce. */
export function SignInButton({ label, primary }: { label: string; primary?: boolean }) {
  const router = useRouter();
  const onClick = () => {
    document.cookie = `civicos_session=demo; path=/; max-age=${60 * 60 * 8}; samesite=lax`;
    const from = new URLSearchParams(window.location.search).get('from');
    router.push(from && from.startsWith('/') ? from : '/wallet');
  };
  return (
    <Button variant={primary ? 'primary' : 'secondary'} onClick={onClick}>
      {label}
    </Button>
  );
}
