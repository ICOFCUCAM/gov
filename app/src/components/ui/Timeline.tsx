import type { PermitTimelineEntry } from '@/lib/api/types';
import { PermitStatusBadge } from './StatusBadge';

export function Timeline({ entries }: { entries: PermitTimelineEntry[] }) {
  return (
    <ol className="relative border-s border-line ms-2 ps-5 space-y-4">
      {entries.map((e, i) => (
        <li key={i} className="relative">
          <span
            className="absolute -start-[27px] top-1 h-3 w-3 rounded-full bg-ink"
            aria-hidden
          />
          <div className="flex items-center gap-2 flex-wrap">
            <PermitStatusBadge status={e.status} />
            <span className="text-sm text-ink-muted">
              {new Date(e.at).toLocaleString()}
            </span>
          </div>
          {e.officerName ? (
            <div className="text-sm mt-1">
              Officer <strong>{e.officerName}</strong>
            </div>
          ) : null}
          {e.note ? <p className="text-sm mt-1">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
