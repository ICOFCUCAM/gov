import { Suspense } from 'react';
import { UpdateChamber } from '@/components/features/updates/UpdateChamber';

export const metadata = { title: 'Update Center' };

// The nation's update chamber: global releases plus builds made for this
// nation. Nothing installs itself; administrators decide every step.
export default function UpdatesPage() {
  return <Suspense><UpdateChamber /></Suspense>;
}
