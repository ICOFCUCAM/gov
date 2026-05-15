import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Plain-language callout — emphasizes what the citizen most needs to read.
 * Per Companion 22 (plain language) and Companion 153 ("plain" pattern).
 */
export function Plain({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('plain', className)}>{children}</div>;
}
