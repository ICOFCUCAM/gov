// Where the governance-output figures come from (lib/twin/signal.ts): the
// platform's directives register, which owns directives (architecture review
// D8). Reported figures carry no marker, so the source is written out.

import * as React from 'react';
import { SIGNAL_LABEL, type Signal } from '@/lib/twin/signal';
import { SignalTag } from '@/components/ui/SignalTag';
import { DIRECTIVE_STATS_SOURCE } from '@/lib/data/directive-stats';

export function DirectiveSourceNote({ source, className = '' }: { source: Pick<Signal, 'kind' | 'source' | 'asOf'> | null; className?: string }) {
  const kind = source?.kind ?? 'reported';
  return (
    <p className={`pt-1 text-[8.5px] text-ink-muted ${className}`}>
      <SignalTag kind={kind} source={source?.source} className="me-1" />
      {SIGNAL_LABEL[kind]} · {source?.source ?? DIRECTIVE_STATS_SOURCE}
      {source?.asOf ? ` · as of ${new Date(source.asOf).toLocaleString()}` : ''}
    </p>
  );
}
