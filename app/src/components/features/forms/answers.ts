// Answers as people read them (check-your-answers, receipts, the print form)
// and the conversions the inputs need: money typed in the currency's main
// unit and kept in minor units, choices shown by label. Identifiers, amounts
// and citations are wrapped by the components in <bdi dir="ltr"> so a
// right-to-left page never reverses them.

import { DOCUMENT_ANSWERS, CONTACT_METHODS, isEmpty, type FieldView, type Money, type Address, type Location, type PartyRef, type DateRange, type Quantity, type Contact } from '@/lib/forms/contract';

/** How many minor units a currency has (2 for most; 0 for some). */
export function fractionDigits(currency: string): number {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2; } catch { return 2; }
}
/** "1,250.50" → 125050 (for a currency with two decimals); null when it is not an amount. */
export function toMinor(text: string, currency: string): number | null {
  const t = text.replace(/[\s,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const d = fractionDigits(currency);
  const [whole, frac = ''] = t.split('.');
  if (frac.length > d) return null;
  return Number(whole) * 10 ** d + Number((frac + '0'.repeat(d)).slice(0, d) || 0);
}
export function moneyText(m: Money): string {
  const d = fractionDigits(m.currency);
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: m.currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(m.minor / 10 ** d); } catch { return `${m.currency} ${(m.minor / 10 ** d).toFixed(d)}`; }
}

const label = (f: Pick<FieldView, 'choices'>, v: string) => f.choices?.find(c => c.value === v)?.label ?? v;

/** An answer in words. */
export function answerText(f: FieldView, v: unknown): string {
  if (isEmpty(v)) return 'Not given';
  switch (f.type) {
    case 'boolean': return v === true ? 'Yes' : 'No';
    case 'choice': case 'enum': return Array.isArray(v) ? v.map(x => label(f, String(x))).join(', ') : label(f, String(v));
    case 'money': return moneyText(v as Money);
    case 'document': return [v].flat().map(x => DOCUMENT_ANSWERS.find(a => a.value === x)?.label ?? String(x)).join('; ');
    case 'address': { const a = v as Partial<Address>; return [a.line1, a.line2, a.locality, a.region, a.postcode].filter(Boolean).join(', '); }
    case 'point': { const p = v as { lng: number; lat: number }; return `Latitude ${p.lat}, longitude ${p.lng}`; }
    case 'location': {
      const l = v as Partial<Location>;
      if (l.kind === 'region') return `Region: ${l.region}`;
      if (l.kind === 'site') return `Registered site ${l.site}`;
      if (l.kind === 'point' && l.point) return `Latitude ${l.point.lat}, longitude ${l.point.lng}`;
      if (l.kind === 'address' && l.address) return [l.address.line1, l.address.line2, l.address.locality, l.address.region, l.address.postcode].filter(Boolean).join(', ');
      return l.text ?? '';
    }
    case 'party': return [v].flat().map(p => { const x = p as Partial<PartyRef>; return [x.name, x.ref ? `(${x.ref})` : ''].filter(Boolean).join(' '); }).join('; ');
    case 'dateRange': { const r = v as DateRange; return r.to ? `${r.from} to ${r.to}` : r.from; }
    case 'quantity': { const q = v as Quantity; return `${q.amount} ${q.unit}`; }
    case 'contact': { const c = v as Contact; return `${CONTACT_METHODS.find(m => m.key === c.method)?.label ?? c.method}${c.value ? `: ${c.value}` : ''}`; }
    case 'attestation': return 'Confirmed';
    case 'geometry': return 'Drawn on the map';
    case 'localizedText': return typeof v === 'string' ? v : Object.entries(v as Record<string, string>).map(([k, t]) => `${t} (${k})`).join(' · ');
    case 'group': {
      const rows = (Array.isArray(v) ? v : [v]) as Record<string, unknown>[];
      return rows.map(r => (f.items ?? []).filter(i => !isEmpty(r[i.key])).map(i => `${i.label}: ${answerText(i, r[i.key])}`).join('; ')).join(' | ');
    }
    default: return Array.isArray(v) ? v.join(', ') : String(v);
  }
}

/** Fields an applicant answers, grouped into pages: consecutive fields with the same section share a page; a field without one has its own. */
export function pagesOf(fields: FieldView[]): { title: string; fields: FieldView[] }[] {
  const out: { title: string; fields: FieldView[] }[] = [];
  for (const f of fields) {
    const last = out[out.length - 1];
    if (f.section && last && last.title === f.section) last.fields.push(f);
    else out.push({ title: f.section ?? f.label, fields: [f] });
  }
  return out;
}
