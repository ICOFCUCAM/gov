import * as React from 'react';
import { cn } from '@/lib/utils';
import { ClassBanner } from './ClassBanner';
import type { DecisionClass } from '@/lib/types';

export interface CopilotPanelProps {
  decisionClass: DecisionClass;
  title?: string;
  children: React.ReactNode;
  onFlag?: () => void;
  className?: string;
}

const borderColor: Record<DecisionClass, string> = {
  A: 'border-class-a bg-[#f3f6fa]',
  B: 'border-class-b bg-[#f4faf6]',
  C: 'border-class-c bg-[#fbf6e6]',
  D: 'border-class-d bg-[#faf2f1]',
  E: 'border-class-e bg-[#f6f3fa]',
};

/**
 * Class-banded panel for AI-touching content.
 * Per Companion 153 and 138: the Class is non-removable and non-collapsible.
 * The "Flag this AI" affordance is co-equal to the panel content.
 */
export function CopilotPanel({
  decisionClass,
  title,
  children,
  onFlag,
  className,
}: CopilotPanelProps) {
  return (
    <section
      data-decision-class={decisionClass}
      className={cn(
        'border-2 rounded-md p-4',
        borderColor[decisionClass],
        className,
      )}
      aria-label={title ?? `AI Copilot panel (Class ${decisionClass})`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <ClassBanner decisionClass={decisionClass} />
        {onFlag ? (
          <button
            type="button"
            onClick={onFlag}
            className="text-sm underline underline-offset-2 text-ink-soft hover:text-ink"
            aria-label="Flag this AI behavior"
          >
            ⚐ Flag this AI
          </button>
        ) : null}
      </div>
      {title ? <h3 className="font-semibold text-lg mb-2">{title}</h3> : null}
      <div className="text-base leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
