import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading primitives — token-aware shimmer with light/dark parity.
 * Premium perceived-performance: structure appears instantly, content
 * resolves in. Reduced-motion + low-bandwidth degrade to a flat block.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('skeleton h-4 w-full', className)}
      {...props}
    />
  );
}

export function SkeletonStat() {
  return (
    <div className="space-y-2 rounded-md border border-line bg-surface p-4 shadow-elev-1">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-sm border border-line">
      <div className="border-b border-line bg-surface-2 p-3">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-line-soft">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Composite loading state for sovereign workspaces. */
export function WorkspaceSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <SkeletonRows rows={6} />
    </div>
  );
}
