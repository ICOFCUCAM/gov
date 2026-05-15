import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tight?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ tight = false, className, as: As = 'div', children, ...props }, ref) => {
    // `as` is provided for semantic flexibility; rendered as a div by default.
    const Tag = As as 'div';
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          'bg-surface border border-line rounded-md',
          tight ? 'p-4' : 'p-6',
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
