// A ministry's own look on its CivicOS site (register 14.11): the colours and
// logo of its existing website, so the two read as one institution.
//
// The logo is uploaded into the platform — never hot-linked from the ministry's
// server — and served from /api/public-sites/<site>/logo. Only raster images
// (PNG, JPEG, WebP) up to 150 KB are accepted, checked by their bytes, not
// their name; SVG is refused because it can carry scripts. Colours go through
// accessibleTheme() like every theme colour, so text in them stays readable.
// A brand is part of the site's design: proposed by one official and published
// by another (lib/data/site-editorial.ts).

export type LogoType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface SiteBrand {
  /** The ministry's main colour (#rrggbb). */
  primary?: string;
  /** Its second colour (#rrggbb). */
  accent?: string;
  logo?: {
    type: LogoType;
    /** Base64 of the image bytes. */
    data: string;
    /** What the logo shows, for people who cannot see it. */
    alt: string;
  };
}

export const MAX_LOGO_BYTES = 150 * 1024;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** The image type its first bytes declare, if it is one the sites accept. */
export function sniffImage(bytes: Uint8Array): LogoType | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 && b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a) return 'image/png';
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return 'image/webp';
  return null;
}

export function logoBytes(data: string): Uint8Array | null {
  if (typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  return new Uint8Array(Buffer.from(data, 'base64'));
}

/** Why a brand cannot be used, or null. */
export function brandProblem(b: SiteBrand): string | null {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return 'The brand must be colours and a logo';
  const extra = Object.keys(b).filter(k => !['primary', 'accent', 'logo'].includes(k));
  if (extra.length) return `Unknown brand field "${extra[0]}"`;
  for (const k of ['primary', 'accent'] as const) {
    if (b[k] !== undefined && !HEX.test(String(b[k]))) return `The ${k === 'primary' ? 'main' : 'second'} colour must be a hex colour such as #1f5fad`;
  }
  if (b.logo !== undefined) {
    const { type, data, alt } = b.logo ?? ({} as NonNullable<SiteBrand['logo']>);
    const bytes = logoBytes(data);
    if (!bytes) return 'The logo is not a readable image';
    if (bytes.length > MAX_LOGO_BYTES) return `The logo is larger than ${MAX_LOGO_BYTES / 1024} KB`;
    const real = sniffImage(bytes);
    if (!real) return 'The logo must be a PNG, JPEG or WebP image (SVG is not accepted)';
    if (real !== type) return `The logo is a ${real.split('/')[1]!.toUpperCase()} file, not ${String(type).split('/')[1]?.toUpperCase() ?? 'what it says'}`;
    if (typeof alt !== 'string' || !alt.trim() || alt.length > 120) return 'Describe the logo in a few words (for people who cannot see it)';
  }
  return null;
}

/** A short fingerprint of the logo, so its address changes when the logo does (long browser caching stays correct). */
export function logoVersion(data: string): string {
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 7) h = Math.imul(h ^ data.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36) + data.length.toString(36);
}
