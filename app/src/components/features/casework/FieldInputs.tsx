'use client';

// Inputs for a procedure's fields (lib/casework/types.ts FieldSpec), one per
// type, giving the values the case engine checks (checkFields()): text and
// long text as strings, dates as YYYY-MM-DD, numbers as numbers, yes/no as
// booleans, a choice from its options. Personal fields say so. Used to open a
// case and to supply the fields a step needs.

import * as React from 'react';

export interface FieldSpecView { key: string; label: string; type: string; required?: boolean; options?: string[]; personal?: boolean; max?: number }
export type FieldValues = Record<string, unknown>;

const input = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function FieldInput({ f, value, onChange, disabled }: { f: FieldSpecView; value: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const id = `field-${f.key}`;
  const label = (
    <span>
      {f.label}{f.required ? ' (required)' : ''}{f.personal ? <span className="ms-1 text-xs text-ink-muted">· personal data</span> : null}
    </span>
  );
  if (f.type === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input id={id} type="checkbox" checked={value === true} disabled={disabled} onChange={e => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }
  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      {f.type === 'longtext' ? (
        <textarea id={id} className={`${input} h-20`} maxLength={f.max ?? 20_000} value={String(value ?? '')} disabled={disabled} onChange={e => onChange(e.target.value)} />
      ) : f.type === 'choice' ? (
        <select id={id} className={input} value={String(value ?? '')} disabled={disabled} onChange={e => onChange(e.target.value)}>
          <option value="">—</option>
          {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.type === 'number' ? (
        <input id={id} type="number" className={input} value={value === undefined || value === '' ? '' : String(value)} disabled={disabled}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      ) : (
        <input id={id} type={f.type === 'date' ? 'date' : 'text'} className={input} maxLength={f.max ?? 500} value={String(value ?? '')} disabled={disabled}
          placeholder={f.type === 'person' ? 'Name or national number' : f.type === 'organisation' ? 'Name or registration number' : f.type === 'place' ? 'Address or place' : undefined}
          onChange={e => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function FieldInputs({ fields, values, onChange, disabled }: { fields: FieldSpecView[]; values: FieldValues; onChange: (v: FieldValues) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map(f => <FieldInput key={f.key} f={f} value={values[f.key]} disabled={disabled} onChange={v => onChange({ ...values, [f.key]: v })} />)}
    </div>
  );
}

/** Only the values filled in (the engine treats '' as cleared). */
export const filled = (values: FieldValues): FieldValues => Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== ''));
