import { CoverPlaza } from '@/components/features/cover/CoverPlaza';

export const metadata = { title: 'CivicOS — Sovereign Operating System' };

// Cover page. Everyone lands here first and chooses how they enter; the
// Sovereign Command Center itself lives at /command (moved intact). The live
// cover is Plaza; the earlier Stack cover stays at /cover/stack.
export default function CoverPage() {
  return <CoverPlaza />;
}
