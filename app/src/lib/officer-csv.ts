// lib/officer-csv — shared CSV parsing for bulk officer onboarding.
//
// Lives outside the route file because Next.js App Router route modules
// may only export route handlers (GET/POST/…) and recognised config
// fields — any other named export fails the build with
// "X is not a valid Route export field".

export interface OfficerInputRow {
  email: string;
  name: string;
  charter_id: string;
  role: string;
  title?: string | null;
}

/** Parse a CSV string with the documented header row. Returns the row
 *  list, or `{ error }` when the header is malformed. Required columns:
 *  email, name, charter_id, role. `title` is optional. */
export function parseOfficerCsv(text: string): OfficerInputRow[] | { error: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { error: 'empty CSV' };
  const header = lines[0]!.split(',').map(c => c.trim().toLowerCase());
  const required = ['email', 'name', 'charter_id', 'role'];
  for (const k of required) {
    if (!header.includes(k)) return { error: `missing header column: ${k}` };
  }
  const idx = (k: string) => header.indexOf(k);
  const rows: OfficerInputRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',').map(c => c.trim());
    rows.push({
      email: cells[idx('email')] ?? '',
      name: cells[idx('name')] ?? '',
      charter_id: cells[idx('charter_id')] ?? '',
      role: cells[idx('role')] ?? '',
      title: idx('title') >= 0 ? (cells[idx('title')] ?? null) : null,
    });
  }
  return rows;
}
