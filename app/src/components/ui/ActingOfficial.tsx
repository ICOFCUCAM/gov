'use client';

import * as React from 'react';

/**
 * Who is acting: the name every action on this page is recorded under
 * (lib/official.ts). Editable in place; actions wait until someone is named.
 */
export function ActingOfficial({ name, onChange, label = 'Acting official' }: { name: string; onChange: (v: string) => void; label?: string }) {
  const [draft, setDraft] = React.useState(name);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => { setDraft(name); }, [name]);
  if (name && !editing) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        {label}: <strong className="text-ink">{name}</strong>
        <button type="button" onClick={() => setEditing(true)} className="focus-ring rounded-[3px] px-1 text-link underline underline-offset-2">change</button>
      </span>
    );
  }
  return (
    <form className="inline-flex items-center gap-1.5 text-xs" onSubmit={e => { e.preventDefault(); const v = draft.trim(); if (v) { onChange(v); setEditing(false); } }}>
      <label className="text-ink-soft" htmlFor="acting-official">{label}</label>
      <input id="acting-official" value={draft} onChange={e => setDraft(e.currentTarget.value)} placeholder="Your name and office"
        className="focus-ring h-7 w-48 rounded-[3px] border border-line bg-surface px-2 text-ink" />
      <button type="submit" className="focus-ring h-7 rounded-[3px] border border-line px-2 text-ink hover:bg-surface-2">Set</button>
    </form>
  );
}
