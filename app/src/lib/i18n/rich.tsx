import * as React from 'react';

/**
 * Fill a dictionary template whose placeholders carry markup, e.g.
 * rich('You declined the request from {who}.', { who: <strong>{name}</strong> }),
 * so each language keeps its own word order around the formatted parts.
 */
export function rich(template: string, parts: Record<string, React.ReactNode>): React.ReactNode[] {
  return template.split(/(\{\w+\})/).map((piece, i) => {
    const key = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <React.Fragment key={i}>{key && key in parts ? parts[key] : piece}</React.Fragment>;
  });
}
