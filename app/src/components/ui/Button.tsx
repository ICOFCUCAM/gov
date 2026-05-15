import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  asChild?: boolean;
}

const base =
  'focus-ring inline-flex items-center justify-center gap-2 min-h-tap rounded-sm font-medium text-base transition-all duration-200 ease-sov disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.98] motion-reduce:active:scale-100';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink text-bg border border-ink hover:opacity-90 hover:shadow-elev-2 px-5 py-2',
  secondary:
    'bg-surface text-ink border border-line hover:bg-surface-2 hover:border-ink/50 px-5 py-2',
  ghost:
    'bg-transparent text-ink hover:bg-surface-2 hover:underline underline-offset-4 px-3 py-2',
  warn: 'bg-warn text-bg border border-warn hover:opacity-90 hover:shadow-elev-2 px-5 py-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, ...props }, ref) => (
    <button ref={ref} className={cn(base, variantClasses[variant], className)} {...props} />
  ),
);
Button.displayName = 'Button';
