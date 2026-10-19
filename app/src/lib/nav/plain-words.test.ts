import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Plain-language pass (register 15.7): phrases officials found technical were
// replaced on screen by the words in the glossary (lib/nav/glossary.ts). This
// keeps them from coming back in console text. Identifiers and comments may
// still use the technical names; only quoted text and JSX text are checked.
const RETIRED = [
  'National posture', 'Readiness posture', 'Regional posture', 'Whole-of-government posture', 'Emergency posture',
  'SLA compliance', 'SLA breaches', 'within SLA', 'SLA breaching', 'Queues breaching SLA',
  'Operations Ledger', 'Interoperability Fabric', 'interoperability fabric', 'incident runtime', 'operations runtime',
  'Awaiting institutional telemetry', 'Cascade integrity', 'Field actor', 'Throughput/hr', 'Cascade exposure',
  'Tenant provisioning', 'Lead vector', 'Cross-system latency', 'Mesh latency', 'orchestration layer',
];
// The glossary names the technical terms on purpose; the menu keeps earlier
// page names (`was`) so people still find them; the advisory prompt goes to
// the model, never to a screen.
const EXEMPT = [path.join('nav', 'glossary.ts'), path.join('nav', 'console-nav.ts'), path.join('ai', 'advisory', 'route.ts')];
const ROOTS = ['components', 'app', 'apps', 'services', 'lib'].map(d => path.join(__dirname, '..', '..', d));

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(tsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name) && !EXEMPT.some(x => p.endsWith(x)) ? [p] : [];
  });
}
/** Text a person can read: string literals and JSX text, without comments. */
const visible = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('console wording stays plain', () => {
  it('uses none of the retired technical phrases', () => {
    const hits: string[] = [];
    for (const f of ROOTS.flatMap(files)) {
      const text = visible(fs.readFileSync(f, 'utf8'));
      for (const r of RETIRED) if (text.includes(r)) hits.push(`${path.relative(path.join(__dirname, '..', '..'), f)}: ${r}`);
    }
    expect(hits).toEqual([]);
  });
});
