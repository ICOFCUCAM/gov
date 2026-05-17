'use client';

// Re-export of the shared sovereign ops kit (promoted to _shared/Ops for
// cross-ministry reuse). MoH subsystems keep importing from here.
export { OpsHeader, KpiStrip, BarPanel, AdvisoryPanel, StatTiles, type T3 } from '@/apps/_shared/Ops';
