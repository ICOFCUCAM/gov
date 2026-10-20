// A button whose action does not exist on the platform yet. It keeps its place
// and its look (the preservation doctrine: never remove an action), but is
// disabled and says why in plain words, on hover and to screen readers, instead
// of doing nothing when pressed. When the action is built, replace this with a
// real button or a link to the screen that does it.

import * as React from 'react';

export const NOT_YET = 'Not available yet';

export function NotYetButton({ reason, className = '', style, children }: {
  /** Why it is not available, in plain words (what is missing). */
  reason: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <>
      <button type="button" disabled aria-describedby={id} title={`${NOT_YET}: ${reason}`}
        className={`${className} cursor-not-allowed opacity-60`} style={style}>
        {children}
      </button>
      <span id={id} className="sr-only">{NOT_YET}: {reason}</span>
    </>
  );
}
