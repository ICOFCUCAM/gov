import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TabBarProps {
  activeTab?: string;
}

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    href: '/wallet',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9z" />
      </svg>
    ),
  },
  {
    href: '/wallet/services',
    label: 'Services',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/wallet/records',
    label: 'Records',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M4 4h12l4 4v12H4z" />
        <path d="M14 4v6h6" />
      </svg>
    ),
  },
  {
    href: '/wallet/receipts',
    label: 'Receipts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M5 3h11l3 3v15l-3-2-3 2-3-2-3 2-2-2V3z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: '/wallet/assistant',
    label: 'Assistant',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0" />
      </svg>
    ),
  },
];

export function TabBar({ activeTab }: TabBarProps) {
  return (
    <nav
      className="grid grid-cols-5 bg-surface border-t border-line"
      aria-label="Wallet navigation"
    >
      {tabs.map(t => {
        const isActive = activeTab === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center min-h-tap py-2 text-xs',
              isActive ? 'text-ink font-semibold' : 'text-ink-soft',
            )}
          >
            {t.icon}
            <span className="mt-0.5">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
