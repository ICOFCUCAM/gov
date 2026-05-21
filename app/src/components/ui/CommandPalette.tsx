'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
}

export type CommandSearchFn = (query: string) => Promise<CommandItem[]>;

/**
 * Sovereign command palette — Cmd/Ctrl-K. Global quick-switcher across
 * surfaces, ministries and incident jumps. Keyboard-first, restrained.
 * Accepts an optional async searchFn — when set, queries are fanned out
 * and dynamic hits (e.g. substrate records by ref) appear inline.
 */
export function CommandPalette({
  items, accent = '#37c7d4', searchFn,
}: { items: CommandItem[]; accent?: string; searchFn?: CommandSearchFn }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const [dyn, setDyn] = React.useState<CommandItem[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Dynamic substrate hits — debounced fan-out when the operator has
  // typed at least 2 chars and a searchFn is configured.
  React.useEffect(() => {
    if (!searchFn || q.trim().length < 2) { setDyn([]); return; }
    const handle = setTimeout(async () => {
      try { setDyn(await searchFn(q.trim())); } catch { setDyn([]); }
    }, 200);
    return () => clearTimeout(handle);
  }, [q, searchFn]);

  const filtered = React.useMemo(() => {
    const n = q.trim().toLowerCase();
    const staticMatched = n
      ? items.filter(i => `${i.label} ${i.hint ?? ''} ${i.group}`.toLowerCase().includes(n))
      : items;
    // Dynamic hits land first when the operator has actually typed a query.
    const combined = n ? [...dyn, ...staticMatched] : staticMatched;
    return combined.slice(0, 60);
  }, [q, items, dyn]);

  React.useEffect(() => {
    if (sel >= filtered.length) setSel(0);
  }, [filtered, sel]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, it) => {
    (acc[it.group] ??= []).push(it);
    return acc;
  }, {});
  let idx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Command palette"
    >
      <div
        className="sov w-full max-w-xl overflow-hidden rounded-[3px] border border-line bg-surface shadow-elev-3"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
            else if (e.key === 'Enter' && filtered[sel]) { go(filtered[sel]!.href); }
          }}
          placeholder="Jump to ministry, surface, incident…"
          className="w-full border-b border-line bg-bg px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        <div className="max-h-[52vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-ink-muted">No matches.</p>
          ) : (
            Object.entries(groups).map(([g, list]) => (
              <div key={g}>
                <div className="px-4 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{g}</div>
                {list.map(it => {
                  idx++;
                  const active = idx === sel;
                  const myIdx = idx;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onMouseEnter={() => setSel(myIdx)}
                      onClick={() => go(it.href)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm no-underline transition-colors"
                      style={{ backgroundColor: active ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'transparent', color: active ? accent : 'rgb(var(--c-ink))' }}
                    >
                      <span className="truncate">{it.label}</span>
                      {it.hint ? <span className="shrink-0 text-[10px] text-ink-muted">{it.hint}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-1.5 text-[10px] text-ink-muted">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
