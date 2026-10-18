'use client';

import * as React from 'react';

/**
 * Tables on phones: each body cell is labelled with its column's heading
 * (data-label) and the table is marked data-stack, so under 640px the CSS in
 * globals.css shows every row as a card ("Status: Late") instead of a strip
 * to scroll sideways. Applies to every console and admin table with a header
 * row; public sites (data-site-root) keep their own designs, and a table can
 * opt out with data-table="keep". Labels follow the table as it re-renders.
 */
export function StackTables() {
  React.useEffect(() => {
    let frame = 0;
    const label = () => {
      frame = 0;
      for (const table of document.querySelectorAll<HTMLTableElement>('main table')) {
        if (table.closest('[data-site-root]') || table.dataset.table === 'keep') continue;
        const headRow = table.tHead?.rows[0];
        if (!headRow) continue;
        // Column headings, spread over the columns each heading spans.
        const heads: string[] = [];
        for (const th of headRow.cells) for (let i = 0; i < Math.max(1, th.colSpan); i++) heads.push((th.textContent ?? '').replace(/[↕▲▼]/g, '').trim());
        if (!heads.some(Boolean)) continue;
        table.dataset.stack = '';
        for (const body of table.tBodies) for (const row of body.rows) {
          let col = 0;
          for (const cell of row.cells) {
            const h = heads[col] ?? '';
            if (h && cell.dataset.label !== h) cell.dataset.label = h;
            col += Math.max(1, cell.colSpan);
          }
        }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(label); };
    schedule();
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
