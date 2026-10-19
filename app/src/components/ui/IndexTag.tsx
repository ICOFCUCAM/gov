// The on-screen marker for an engine index (lib/twin/engine-indexes.ts): a
// modelled index says "Modelled" with what it combines; a derived one says
// "Modelled" once the twin answers it from observed inputs and "Sample" until
// then. Never shown as observed. Engine-indexes.test.ts checks that every
// screen showing an index carries this marker.

import * as React from 'react';
import { SignalTag } from './SignalTag';
import { engineIndex, indexSignal, type EngineIndexKey } from '@/lib/twin/engine-indexes';
import { readTwin } from '@/lib/twin/read';

export function IndexTag({ index, entityId, className = '' }: { index: EngineIndexKey; entityId?: string; className?: string }) {
  const e = engineIndex(index);
  const derived = e && 'derived' in e.treatment ? readTwin(e.treatment.derived, 0, entityId ? { entityId } : {}).kind : undefined;
  const s = indexSignal(index, derived);
  return <SignalTag kind={s.kind} source={s.source} className={className} />;
}
