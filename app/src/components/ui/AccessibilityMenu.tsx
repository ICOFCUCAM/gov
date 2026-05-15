'use client';

import * as React from 'react';

type Scale = 'sm' | 'md' | 'lg' | 'xl';
const SCALES: Scale[] = ['sm', 'md', 'lg', 'xl'];

/**
 * Accessibility controls available on every operational surface:
 * text size + high contrast. Persisted locally, applied via data attributes
 * read by globals.css. No tracking; pure preference.
 */
export function AccessibilityMenu() {
  const [open, setOpen] = React.useState(false);
  const [scale, setScale] = React.useState<Scale>('md');
  const [contrast, setContrast] = React.useState(false);

  const [lowBw, setLowBw] = React.useState(false);

  React.useEffect(() => {
    const s = (localStorage.getItem('civic:textScale') as Scale) || 'md';
    const c = localStorage.getItem('civic:contrast') === '1';
    const b = localStorage.getItem('civic:lowbw') === '1';
    setScale(s);
    setContrast(c);
    setLowBw(b);
    document.documentElement.dataset.textScale = s;
    document.documentElement.dataset.contrast = c ? '1' : '0';
    document.documentElement.dataset.bw = b ? '1' : '0';
  }, []);

  function apply(next: { scale?: Scale; contrast?: boolean; lowBw?: boolean }) {
    if (next.scale) {
      setScale(next.scale);
      localStorage.setItem('civic:textScale', next.scale);
      document.documentElement.dataset.textScale = next.scale;
    }
    if (typeof next.contrast === 'boolean') {
      setContrast(next.contrast);
      localStorage.setItem('civic:contrast', next.contrast ? '1' : '0');
      document.documentElement.dataset.contrast = next.contrast ? '1' : '0';
    }
    if (typeof next.lowBw === 'boolean') {
      setLowBw(next.lowBw);
      localStorage.setItem('civic:lowbw', next.lowBw ? '1' : '0');
      document.documentElement.dataset.bw = next.lowBw ? '1' : '0';
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(o => !o)}
        className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
      >
        Accessibility
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-line bg-surface p-4 shadow-xl"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Text size</legend>
            <div className="flex gap-2">
              {SCALES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => apply({ scale: s })}
                  aria-pressed={scale === s}
                  className={
                    'min-h-tap flex-1 rounded-sm border px-2 py-1 text-sm ' +
                    (scale === s
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line hover:bg-surface-2')
                  }
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 flex min-h-tap items-center gap-2">
            <input
              type="checkbox"
              checked={contrast}
              onChange={e => apply({ contrast: e.target.checked })}
            />
            <span className="text-sm">High contrast</span>
          </label>
          <label className="mt-2 flex min-h-tap items-center gap-2">
            <input
              type="checkbox"
              checked={lowBw}
              onChange={e => apply({ lowBw: e.target.checked })}
            />
            <span className="text-sm">Low-bandwidth mode</span>
          </label>
          <p className="mt-3 text-xs text-ink-muted">
            Saved on this device. Low-bandwidth strips shadows and heavy
            visuals. Voice, USSD, and walk-in remain available for every
            service.
          </p>
        </div>
      ) : null}
    </div>
  );
}
