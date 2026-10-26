import * as React from 'react';

/**
 * Skip link to the page's one `<main id="main">` (WCAG 2.4.1, go-live review
 * M-10). Render it as the first focusable element of a shell; it stays out of
 * sight until it has keyboard focus. Colours come from the ground it sits on
 * (`ink` on `surface`); a shell on another ground passes `style`.
 */
export function SkipLink({ href = '#main', children = 'Skip to main content', style }: {
  href?: string; children?: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <a href={href} style={style}
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-compact focus:font-medium focus:text-surface focus:outline-none focus:ring-2 focus:ring-link">
      {children}
    </a>
  );
}
