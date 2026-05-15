import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Pill, Dot, type PillTone } from './Pill';
import type { Receipt as ReceiptT } from '@/lib/types';

export interface ReceiptCardProps {
  receipt: ReceiptT;
  /** href when the card is meant to be clickable */
  href?: string;
  className?: string;
}

export function ReceiptCard({ receipt, href, className }: ReceiptCardProps) {
  const Wrapper: React.ElementType = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'block border border-line rounded-md p-4 bg-surface no-underline text-ink',
        href && 'hover:bg-surface-2 transition-colors',
        className,
      )}
    >
      <div className="flex justify-between items-baseline gap-3">
        <div>
          <div className="font-semibold">{receipt.title}</div>
          <div className="text-sm text-ink-muted">{receipt.summary}</div>
        </div>
        <div className="font-mono text-xs text-ink-muted">{receipt.id}</div>
      </div>
      {(receipt.officerName || receipt.aiClass) ? (
        <div className="flex gap-2 mt-2 flex-wrap">
          {receipt.officerName ? (
            <Pill tone="ok">
              <Dot tone="ok" /> Signed by {receipt.officerName}
            </Pill>
          ) : null}
          {receipt.aiClass ? <Pill>AI: Class {receipt.aiClass}</Pill> : null}
        </div>
      ) : null}
    </Wrapper>
  );
}

export interface ReceiptHeaderProps {
  receipt: ReceiptT;
  className?: string;
}

export function ReceiptHeader({ receipt, className }: ReceiptHeaderProps) {
  return (
    <section
      className={cn('border border-line rounded-md p-4 bg-surface', className)}
      aria-label="Receipt summary"
    >
      <h2 className="text-2xl font-semibold mb-1">{receipt.title}</h2>
      {receipt.amount ? (
        <div className="font-serif text-3xl">{receipt.amount}</div>
      ) : null}
      <div className="text-ink-muted">{receipt.summary}</div>
      <div className="text-ink-muted text-sm mt-1">{new Date(receipt.date).toLocaleString()}</div>
    </section>
  );
}
