import { Suspense } from 'react';
import { ContractCenter } from '@/components/features/updates/ContractCenter';

export const metadata = { title: 'Contract · Update Center' };

// Licence and contract: modules, seats, term, renewal, support tier and billing.
export default function ContractPage() {
  return <Suspense><ContractCenter /></Suspense>;
}
