import * as React from 'react';
import { cn } from '@/lib/utils';

interface BaseProps {
  label: string;
  name: string;
  help?: string;
  required?: boolean;
  className?: string;
}

export function TextField({
  label,
  name,
  help,
  required,
  className,
  ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('mb-4', className)}>
      <label htmlFor={name} className="block font-medium mb-1">
        {label}
        {required ? <span className="text-alert"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        className="w-full min-h-tap p-3 border border-line rounded-sm bg-surface"
        {...rest}
      />
      {help ? <p className="text-sm text-ink-muted mt-1">{help}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  name,
  help,
  required,
  className,
  children,
  ...rest
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('mb-4', className)}>
      <label htmlFor={name} className="block font-medium mb-1">
        {label}
        {required ? <span className="text-alert"> *</span> : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="w-full min-h-tap p-3 border border-line rounded-sm bg-surface"
        {...rest}
      >
        {children}
      </select>
      {help ? <p className="text-sm text-ink-muted mt-1">{help}</p> : null}
    </div>
  );
}

export function CheckRow({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-2 p-3 border border-line rounded-sm hover:bg-surface-2 cursor-pointer min-h-tap">
      <input type="checkbox" name={name} className="mt-1" {...rest} />
      <span>{label}</span>
    </label>
  );
}
