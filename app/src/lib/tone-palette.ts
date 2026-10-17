// Status colours shared by server and client components. Kept outside any
// 'use client' module: a server component cannot read values out of one
// (Next.js: "You cannot dot into a client module from a server component").
// The values live in the design tokens (lib/theme/tokens.ts).
import { STATUS } from '@/lib/theme/tokens';

export const TONE: Record<string, string> = { ...STATUS };
