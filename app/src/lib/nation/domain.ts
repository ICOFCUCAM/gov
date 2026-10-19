// The nation's own web domain (SovereignProfile.domain), entered in setup
// (section 2.1). The national twin mints its persistent identifiers under it
// (https://<domain>/id/<kind>/<code>, lib/twin/register.ts uriBase), and the
// /id/* resolver answers for them; until it is set they use the placeholder
// https://twin.invalid (or CIVICOS_PUBLIC_URL). Pure: runs in the browser
// (the setup wizard checks as the official types) and on the server
// (/api/sovereign refuses an invalid one).

/** Top-level names that never resolve publicly, refused as a nation's domain. */
const RESERVED = new Set(['invalid', 'localhost', 'local', 'test', 'internal', 'home', 'lan', 'corp']);

/**
 * The domain as stored (lower case, no scheme, path or trailing dot), '' to
 * clear it, or the reason it cannot be used. Accepts what officials paste:
 * "https://data.gov.ke/" becomes "data.gov.ke".
 */
export function normaliseDomain(input: unknown): { domain: string } | { error: string } {
  if (input === undefined || input === null) return { domain: '' };
  if (typeof input !== 'string') return { error: 'The domain is text, e.g. data.gov.ke' };
  let d = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\.$/, '');
  if (!d) return { domain: '' };
  if (/[/?#@\s]/.test(d)) return { error: 'Give the domain only, without a path, e.g. data.gov.ke' };
  if (/:\d*$/.test(d)) return { error: 'Give the domain without a port' };
  // Internationalised names are kept in their ASCII (punycode) form.
  try { d = new URL(`https://${d}`).hostname; } catch { return { error: 'This is not a domain name' }; }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d) || d.startsWith('[')) return { error: 'Give a domain name, not an IP address' };
  if (d.length > 253) return { error: 'A domain name is at most 253 characters' };
  const labels = d.split('.');
  if (labels.length < 2) return { error: 'Give a full domain with its top-level part, e.g. data.gov.ke' };
  if (labels.some(l => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return { error: 'Each part of a domain is letters, digits and hyphens (not at the start or end), up to 63 characters' };
  const tld = labels[labels.length - 1]!;
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(tld)) return { error: 'The top-level part of the domain is not valid' };
  if (RESERVED.has(tld)) return { error: `.${tld} never resolves publicly: give the nation's own public domain` };
  return { domain: d };
}

/** Where an entity's identifier would point under a domain (shown in setup as an example). */
export const identifierExample = (domain: string, iso3?: string): string => `https://${domain}/id/nation/${iso3 || 'XXX'}`;
