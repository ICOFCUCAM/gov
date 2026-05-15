import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DecisionClass } from '@/lib/types';
import { decisionClassLabel } from '@/lib/types';

export interface ClassBannerProps {
  decisionClass: DecisionClass;
  className?: string;
}

const colorBg: Record<DecisionClass, string> = {
  A: 'bg-class-a text-white',
  B: 'bg-class-b text-white',
  C: 'bg-class-c text-ink',
  D: 'bg-class-d text-white',
  E: 'bg-class-e text-white',
};

export function ClassBanner({ decisionClass, className }: ClassBannerProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-xs px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        colorBg[decisionClass],
        className,
      )}
      role="status"
      aria-label={decisionClassLabel[decisionClass]}
    >
      {decisionClassLabel[decisionClass]}
    </span>
  );
}
