import { Suspense } from 'react';
import { ChamberSettings } from '@/components/features/updates/ChamberSettings';

export const metadata = { title: 'Settings · Update Center' };

// How this nation's installs are protected: probation, fallback (automatic
// software switch-back or ask first), health source, rollout ring,
// definitions policy, incidents and break-glass.
export default function ChamberSettingsPage() {
  return <Suspense><ChamberSettings /></Suspense>;
}
