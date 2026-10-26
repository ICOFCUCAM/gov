import * as React from 'react';
import { cn } from '@/lib/utils';

interface BaseProps {
  label: string;
  name: string;
  help?: string;
  required?: boolean;
  className?: string;
  /** The field's validation message, shown beside it and read with it (plan I10; specification Part 6 §H). */
  error?: string;
}

/** The ids a field is described by: its help and its error (each beside the field). */
const describedBy = (name: string, help?: string, error?: string) =>
  [help ? `${name}-help` : '', error ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined;

function FieldNotes({ name, help, error }: { name: string; help?: string; error?: string }) {
  return (
    <>
      {help ? <p id={`${name}-help`} className="text-sm text-ink-muted mt-1">{help}</p> : null}
      {error ? <p id={`${name}-error`} data-state="validation" className="text-sm font-medium text-alert mt-1"><span aria-hidden>! </span>Error: {error}</p> : null}
    </>
  );
}

export function TextField({
  label,
  name,
  help,
  required,
  className,
  error,
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
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        className={cn('w-full min-h-tap p-3 border rounded-sm bg-surface disabled:cursor-not-allowed disabled:bg-surface-2', error ? 'border-alert border-2' : 'border-line')}
        {...rest}
      />
      <FieldNotes name={name} help={help} error={error} />
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
  error,
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
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, help, error)}
        className={cn('w-full min-h-tap p-3 border rounded-sm bg-surface disabled:cursor-not-allowed disabled:bg-surface-2', error ? 'border-alert border-2' : 'border-line')}
        {...rest}
      >
        {children}
      </select>
      <FieldNotes name={name} help={help} error={error} />
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
