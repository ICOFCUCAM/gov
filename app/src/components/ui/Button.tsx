import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  asChild?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 min-h-tap rounded-sm font-medium text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none active:translate-y-px';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-surface border border-ink hover:bg-[#2a2f38] px-5 py-2',
  secondary: 'bg-surface text-ink border border-ink hover:bg-surface-2 px-5 py-2',
  ghost: 'bg-transparent text-ink underline underline-offset-4 hover:bg-surface-2 px-3 py-2',
  warn: 'bg-warn text-ink border border-warn hover:brightness-95 px-5 py-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, ...props }, ref) => (
    <button ref={ref} className={cn(base, variantClasses[variant], className)} {...props} />
  ),
);
Button.displayName = 'Button';
