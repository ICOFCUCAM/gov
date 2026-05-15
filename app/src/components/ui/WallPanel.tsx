import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Dark-themed panel for the NCCC wall (Companion 154).
 */
export function WallPanel({
  title,
  children,
  className,
  span,
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  title?: string;
  span?: 'full' | 'half' | 'auto';
}) {
  const spanClass = span === 'full' ? 'lg:col-span-4' : span === 'half' ? 'lg:col-span-2' : '';
  return (
    <section
      className={cn(
        'bg-wall-panel border border-wall-line rounded-md p-4 text-wall-ink',
        spanClass,
        className,
      )}
      {...rest}
    >
      {title ? <h3 className="font-semibold text-lg mb-3 text-wall-ink">{title}</h3> : null}
      {children}
    </section>
  );
}
