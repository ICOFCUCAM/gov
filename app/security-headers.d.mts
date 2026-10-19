// Types for security-headers.mjs (shared by next.config.mjs, the middleware and tests).
export interface Header { key: string; value: string }
export const DIRECTIVES: string[];
export function scriptSrc(nonce: string | null, isDev?: boolean): string;
export function contentSecurityPolicy(nonce: string | null, isDev?: boolean): string;
export const CSP: string;
export const HSTS: string;
export function pageHeaders(env?: Record<string, string | undefined>): Header[];
export function embedHeaders(env?: Record<string, string | undefined>): Header[];
