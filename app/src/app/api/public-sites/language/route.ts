// A visitor's language on the public sites: one of the nation's official
// languages (setup), kept in a cookie for a year, then back to the page they
// were on. Only a path on this platform is accepted as the way back.

import { NextRequest, NextResponse } from 'next/server';
import { nationLanguages } from '@/lib/nation/registry';
import { SITE_LANG_COOKIE } from '@/apps/_shared/public/site-props';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang') ?? '';
  const raw = req.nextUrl.searchParams.get('next') ?? '/';
  const next = /^\/(?![/\\])[^\s]*$/.test(raw) ? raw : '/';
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  if (nationLanguages().includes(lang)) {
    res.cookies.set(SITE_LANG_COOKIE, lang, { path: '/', maxAge: 365 * 86_400, sameSite: 'lax', httpOnly: true, secure: req.nextUrl.protocol === 'https:' });
  }
  return res;
}
