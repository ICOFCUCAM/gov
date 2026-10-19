'use client';

// Text size controls in every public site's official banner (A+ / A / A−).
// They scale the whole site (CSS zoom on the site's root, marked
// data-site-root) so layouts set in pixels grow with the text, and remember
// the choice in this browser only. Browser zoom keeps working as well.

import * as React from 'react';

const STEPS = [0.9, 1, 1.15, 1.3, 1.5];
const KEY = 'civicos.site.textScale';

const read = (): number => {
  try { const v = Number(window.localStorage.getItem(KEY)); return STEPS.includes(v) ? v : 1; } catch { return 1; }
};

export function FontSizeControls({ up, normal, down }: { up: string; normal: string; down: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [scale, setScale] = React.useState(1);

  const apply = React.useCallback((v: number) => {
    const root = ref.current?.closest<HTMLElement>('[data-site-root]');
    if (root) root.style.zoom = v === 1 ? '' : String(v);
    setScale(v);
    try { window.localStorage.setItem(KEY, String(v)); } catch { /* private mode: not remembered */ }
  }, []);
  React.useEffect(() => { const v = read(); if (v !== 1) apply(v); }, [apply]);

  const i = STEPS.indexOf(scale);
  const btn = 'grid h-6 min-w-6 place-items-center rounded px-1 hover:bg-white/10 hover:text-white disabled:opacity-40';
  return (
    <span ref={ref} className="flex gap-1">
      <button type="button" className={btn} aria-label={up} disabled={i === STEPS.length - 1} onClick={() => apply(STEPS[i + 1]!)}>A+</button>
      <button type="button" className={btn} aria-label={normal} aria-pressed={scale === 1} onClick={() => apply(1)}>A</button>
      <button type="button" className={btn} aria-label={down} disabled={i === 0} onClick={() => apply(STEPS[i - 1]!)}>A-</button>
    </span>
  );
}
