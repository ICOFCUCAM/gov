import { Suspense } from 'react';
import { AssuranceCenter } from '@/components/features/updates/Assurance';

export const metadata = { title: 'Assurance · Update Center' };

// Supply-chain proof: source-code escrow, deposits per release, source-code
// audits and build provenance.
export default function AssurancePage() {
  return <Suspense><AssuranceCenter /></Suspense>;
}
