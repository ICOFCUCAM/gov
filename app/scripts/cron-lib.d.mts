// Types for scripts/cron-lib.mjs.
export function parseCron(expr: string): unknown;
export function cronMatches(expr: unknown, at: Date): boolean;
export function previousMatch(expr: unknown, at: Date): Date | null;
export function nextMatch(expr: unknown, at: Date): Date | null;
