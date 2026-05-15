// CivicOS — small utilities.
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Locale-aware date formatter. Defaults to the citizen's preferred locale.
// No telemetry, no third-party calls.
export function formatDate(
  iso: string | Date,
  locale: string = 'en',
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return d.toDateString();
  }
}

export function formatMinor(amountMinor: number, currency: string = 'KES', locale: string = 'en'): string {
  return formatAmount(amountMinor / 100, currency, locale);
}

export function formatAmount(amount: number, currency: string = 'KES', locale: string = 'en'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
