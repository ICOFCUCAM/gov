// Status colours shared by server and client components. Kept outside any
// 'use client' module: a server component cannot read values out of one
// (Next.js: "You cannot dot into a client module from a server component").
// The values live in the design tokens (lib/theme/tokens.ts).
import { STATUS } from '@/lib/theme/tokens';

export const TONE: Record<string, string> = { ...STATUS };

/** A shape per status, so a status never relies on colour alone (WCAG 1.4.1). */
export const TONE_SHAPE: Record<string, string> = { alert: '▲', warn: '◆', neutral: '■', ok: '●' };
/** The status in words, for screen readers and tooltips. */
export const TONE_WORD: Record<string, string> = { alert: 'critical', warn: 'elevated', neutral: 'watch', ok: 'stable' };
