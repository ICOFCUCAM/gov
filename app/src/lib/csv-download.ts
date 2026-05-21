// lib/csv-download — tiny helper for "download as CSV" buttons.
//
// Centralises the createObjectURL → click → revokeObjectURL ceremony
// and CSV cell escaping so surfaces don't reinvent it each time.

/** Escape a single CSV cell: quote when it contains a comma, quote, or newline. */
export function csvCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from header + row data (each row escaped via csvCell). */
export function buildCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [
    header.map(csvCell).join(','),
    ...rows.map(r => r.map(csvCell).join(',')),
  ].join('\n');
}

/** Trigger a browser download of `csv` named `<basename>-YYYY-MM-DD.csv`. */
export function downloadCsv(basename: string, csv: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${basename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
