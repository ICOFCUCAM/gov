import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tight?: boolean;
  /** Hover elevation + cursor affordance for clickable cards. */
  interactive?: boolean;
  /** Layered sovereign glass surface (command / overlay contexts). */
  glass?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { tight = false, interactive = false, glass = false, className, as: As = 'div', children, ...props },
    ref,
  ) => {
    // `as` is provided for semantic flexibility; rendered as a div by default.
    const Tag = As as 'div';
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          'rounded-md transition-all duration-200 ease-sov',
          glass ? 'glass shadow-elev-2' : 'border border-line bg-surface shadow-elev-1',
          tight ? 'p-4' : 'p-6',
          interactive &&
            'cursor-pointer hover:-translate-y-0.5 hover:border-link/40 hover:shadow-elev-2 motion-reduce:hover:translate-y-0',
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  },
);
Card.displayName = 'Card';
