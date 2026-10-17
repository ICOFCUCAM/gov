// Status colours shared by server and client components. Kept outside any
// 'use client' module: a server component cannot read values out of one
// (Next.js: "You cannot dot into a client module from a server component").
export const TONE: Record<string, string> = {
  alert: '#f1707a',
  warn: '#e0b341',
  ok: '#34d39c',
  neutral: '#6b7a90',
};
