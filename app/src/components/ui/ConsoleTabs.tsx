'use client';

// The top of every console page: the menu item it belongs to, one plain
// sentence on what it is for, and its tabs (lib/nav/console-nav.ts). Tabs are
// links, so each keeps its own address and the browser's back button works.

import * as React from 'react';
import Link from 'next/link';
import type { NavItem, NavTab } from '@/lib/nav/console-nav';

export function ConsoleTabs({ here, branches, pathname }: {
  here: { section: string; item: NavItem; tab?: NavTab } | null;
  branches: { label: string; href: string }[];
  pathname: string;
}) {
  if (!here) return null;
  const { item } = here;
  const tabs = item.key === 'branches' ? [...item.tabs, ...branches] : item.tabs;
  const current = tabs.find(t => t.href === pathname.replace(/\/$/, '')) ?? here.tab;
  return (
    <div className="mb-3 border-b border-line">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{here.section}</p>
      <p className="mt-0.5 text-[18px] font-semibold text-ink">{item.label}{current && current.label !== item.label ? <span className="text-ink-soft"> · {current.label}</span> : null}</p>
      <p className="mt-0.5 max-w-3xl text-[13px] text-ink-soft">{item.purpose}</p>
      {tabs.length > 1 ? (
        <nav aria-label={`${item.label} sections`} className="-mb-px mt-2 flex flex-wrap gap-x-1">
          {tabs.map(t => {
            const on = current?.href === t.href;
            return (
              <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined}
                className={`focus-ring border-b-2 px-2.5 py-1.5 text-[13px] no-underline ${on ? 'border-current font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
                title={'was' in t && t.was && t.was !== t.label ? `Formerly “${t.was}”` : undefined}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      ) : <div className="mt-2" />}
    </div>
  );
}
