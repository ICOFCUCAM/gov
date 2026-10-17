import { CoverGate } from '@/components/features/CoverGate';

export const metadata = { title: 'CivicOS — Sovereign Operating System' };

// Cover page. Everyone lands here first and chooses how they enter; the
// Sovereign Command Center itself lives at /command (moved intact).
export default function CoverPage() {
  return <CoverGate />;
}
