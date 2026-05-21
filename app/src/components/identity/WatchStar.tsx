'use client';

import * as React from 'react';
import { useIdentity } from './useIdentity';
import {
  isWatched, toggleWatch, subscribeWatch, type WatchKind,
} from '@/lib/watchlist';

/** Click-to-toggle star for any substrate record. Renders nothing
 *  for anon sessions (the watchlist is keyed per identity). */
export function WatchStar({
  kind, ref: itemRef, label, className = '',
}: { kind: WatchKind; ref: string; label: string; className?: string }) {
  const { actor } = useIdentity();
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => subscribeWatch(() => force()), []);
  if (!actor) return null;
  const watched = isWatched(actor.id, kind, itemRef);
  return (
    <button
      type="button"
      aria-pressed={watched}
      title={watched ? 'Unstar' : 'Add to watchlist'}
      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWatch(actor.id, { kind, ref: itemRef, label }); }}
      className={`focus-ring inline-flex items-center justify-center rounded-[3px] border px-1 text-[11px] ${className}`}
      style={{
        borderColor: watched ? '#e0b341' : 'rgb(var(--c-line))',
        color: watched ? '#e0b341' : 'rgb(var(--c-ink-muted))',
      }}
    >
      {watched ? '★' : '☆'}
    </button>
  );
}
