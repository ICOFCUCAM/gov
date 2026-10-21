// The legislature's record changes only through its own routes (plan phase 7;
// guidance §2.3: "a ministry should not be able to rewrite the parliamentary
// journal or change a recorded vote"). Like lib/casework/register-writes.test.ts
// for the case-governed registers, this reads the source and fails when any
// file other than lib/legislature/* and the /api/legislature routes imports a
// function that changes the record, or touches its store.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC = resolve(__dirname, '../..');
const MODULE = 'lib/legislature/register';
const CHANGES = [
  'resetLegislature', 'draftProcedure', 'approveProcedure', 'withdrawProcedure', 'introduceBill', 'addText', 'recordStage', 'referToCommittee',
  'recordReport', 'proposeAmendment', 'decideAmendment', 'recordVote', 'passBill', 'recordAssent', 'recordCommencement', 'publishBill',
  'closeBill', 'certifyBill', 'transmitToLaws', 'proposeCorrection', 'confirmCorrection', 'withdrawCorrection',
];
const ALLOWED = (p: string) => p.startsWith('lib/legislature/') || p.startsWith('app/api/legislature/');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
const FILES = walk(SRC).map(p => ({ path: relative(SRC, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }));

describe('the legislature\'s record changes only through its own routes', () => {
  it('every changing export is listed (so a new one is classified)', () => {
    const text = readFileSync(join(SRC, `${MODULE}.ts`), 'utf8');
    const exported = [...text.matchAll(/^export\s+function\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]!);
    const reads = ['checkProcedure', 'listProcedures', 'activeProcedure', 'voteResult', 'listBills', 'recordDigest', 'certificationOf', 'publicBill', 'readsFullRecord', 'waitingLegislative'];
    expect(exported.filter(e => !CHANGES.includes(e) && !reads.includes(e)), 'classify each new export as a read or a change here').toEqual([]);
  });

  it('no other file imports a changing function or touches the store', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      if (ALLOWED(f.path) || f.path === 'lib/data/register-owners.ts') continue;
      if (/__civicosLegislature\b/.test(f.text)) bad.push(`${f.path} uses the store`);
      for (const m of f.text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]@\/lib\/legislature\/register['"]/g)) {
        for (const n of m[1]!.split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim())) if (CHANGES.includes(n)) bad.push(`${f.path} imports ${n}`);
      }
      if (/import\s+\*\s+as\s+\w+\s+from\s*['"]@\/lib\/legislature\/register['"]/.test(f.text)) bad.push(`${f.path} imports the module whole`);
    }
    expect(bad).toEqual([]);
  });
});
