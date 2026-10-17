// CSV as statistics offices publish it (RFC 4180): a header row, then rows;
// quoted fields may hold commas, quotes ("") and line breaks; comma, semicolon
// or tab separated (detected from the header); a UTF-8 byte-order mark is
// dropped. Returns one record per row keyed by the header names.

export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const sep = [',', ';', '\t'].map(c => [c, firstLine.split(c).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { quoted = true; i++; continue; }
    if (ch === sep) { row.push(field); field = ''; i++; continue; }
    if (ch === '\n' || ch === '\r') {
      row.push(field); field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += ch; i++;
  }
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const names = head.map(h => h.trim());
  return body.map(r => Object.fromEntries(names.map((n, j) => [n, (r[j] ?? '').trim()])));
}
