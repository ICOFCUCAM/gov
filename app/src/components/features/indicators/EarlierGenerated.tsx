'use client';

// A panel's earlier generated figures, kept reachable after the panel moved to
// record-computed indicators (plan step I3; preservation doctrine: a redesign
// keeps every data source the previous version had). Closed by default; opened,
// the figures follow the one rule for generated figures (SampleFold: marked
// Sample in demo and training, folded under "Not connected" in production).

import * as React from 'react';
import { SampleFold } from '@/components/ui/SampleFold';

export function EarlierGenerated({ what, source, children }: { what: string; source: string; children?: React.ReactNode }) {
  return (
    <details className="mt-2 rounded-[3px] border border-dashed border-line" data-generated="earlier">
      <summary className="focus-ring cursor-pointer px-2 py-1 text-[10px] text-ink-muted">{what}: the earlier generated figures (reference model, not the institution&apos;s records)</summary>
      <div className="p-2"><SampleFold what={what} source={source}>{children}</SampleFold></div>
    </details>
  );
}
