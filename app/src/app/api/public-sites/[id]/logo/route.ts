// A public site's published logo (its brand, lib/public-sites/brand.ts),
// served from the platform. Checked on upload to be a PNG, JPEG or WebP image;
// served with its own type, no sniffing and no scripts. The address carries a
// fingerprint of the logo (?v=), so browsers may keep it for a year.

import { NextRequest, NextResponse } from 'next/server';
import { SITE_IDS } from '@/lib/public-sites';
import { getSiteSettings } from '@/lib/data/site-settings';
import { logoBytes } from '@/lib/public-sites/brand';

export const dynamic = 'force-dynamic';

export function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const logo = SITE_IDS.includes(params.id) ? getSiteSettings(params.id).brand?.logo : undefined;
  const bytes = logo ? logoBytes(logo.data) : null;
  if (!logo || !bytes) return NextResponse.json({ error: 'No logo' }, { status: 404 });
  return new NextResponse(bytes, {
    headers: {
      'content-type': logo.type,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}
