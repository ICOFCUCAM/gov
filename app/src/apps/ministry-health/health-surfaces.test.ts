// No patient or clinical field on any rendered health surface outside the
// health application (CLAUDE.md, Health: "no patient or clinical field
// anywhere, no national patient record; returns are aggregates"; audit B
// §6.5, acceptance P0-06). health-fields.test.ts scans the health
// application's source; this renders the other places a health ministry is
// shown and scans what reaches the screen:
//   - every health group of the ministry system console
//     (components/features/SubsystemConsole.tsx, /ministries/<id>/system/<group>),
//     in demo (figures shown) and production (folded, then opened)
//   - the health ministry's blueprint (group and system names on every
//     ministry page), its institution chain and the work kinds its queues use
// and scans the source of SubsystemConsole's health sections, so a field that
// renders only in some state (an opened row) is caught too.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/ministries/min-health/system/doctor', useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() }));

import { SubsystemConsole } from '@/components/features/SubsystemConsole';
import { GeneratedReveal } from '@/components/ui/Generated';
import { InstallationModeProvider } from '@/lib/ops/mode-context';
import type { InstallationMode } from '@/lib/ops/mode';
import { blueprintFor } from '@/lib/institution/blueprint';
import { chainDef } from '@/lib/gov/institution-chain';
import { workflowFor } from '@/lib/gov/runtime-workflow';

const FORBIDDEN: [string, RegExp][] = [
  ['patient', /(?<![a-z])patient/i],
  ['triage', /triage/i],
  ['diagnosis', /diagnos/i],
  ['clinical risk', /clinical risk/i],
  ['clinical record', /clinical record/i],
  ['clinical encounter', /clinical encounter/i],
  ['risk score or band', /risk[ -_]?(score|band)/i],
  ['health score', /health[ -_]?score/i],
  ['medical record', /medical record|\bMRN\b|\bEHR\b/i],
  ['vital signs', /vital[ -]?signs?|\bvitals\b/i],
  ['allergy', /allerg/i],
  ['complaint or condition', /chief ?complaint|presenting complaint/i],
  ['prescription for a person', /prescription(?!s? validation)/i],
  ['treatment plan', /treatment (plan|tracking|adherence)/i],
];

/**
 * What may carry a forbidden word on these surfaces, each with its reason;
 * removed before a text is checked.
 */
const ALLOWED: { token: RegExp; why: string }[] = [
  { token: /group === 'patient'|\/system\/patient|`\$\{id\}:patient`|:(patient|master-patient-index|longitudinal-ehr)\b/g, why: 'group keys (patient, master-patient-index, longitudinal-ehr) stay so /ministries/<id>/system/<key> and the work scopes keep working (preservation doctrine); labels and content are administrative' },
  { token: /\bTriaged\b/g, why: 'a stage of the generic approval work kind (requests sorted before review); no person or condition' },
  { token: /Prescription validation/g, why: 'a pharmaceutical system\'s name (the regulator checks prescribing rules); no prescription is shown' },
  { token: /no person's record|no person index|no record held/g, why: 'states that no such record is kept' },
];

const HEALTH = 'min-health';
const GROUPS = blueprintFor('HEALTH').map(g => g.key);

function found(text: string, where: string): string[] {
  const rest = ALLOWED.reduce((t, a) => t.replace(a.token, ''), text);
  return FORBIDDEN.filter(([, re]) => re.test(rest)).map(([name, re]) => `${where} (${name}): …${rest.slice(Math.max(0, rest.search(re) - 60), rest.search(re) + 60)}…`);
}

const render = (mode: InstallationMode, group: string, open = false) => {
  const el = h(SubsystemConsole, { id: HEALTH, group });
  return renderToStaticMarkup(h(InstallationModeProvider, { mode, children: open ? h(GeneratedReveal, null, el) : el }));
};
// Visible text and attribute values (titles, labels), without markup.
const text = (html: string) => html.replace(/<[^>]*\b(title|aria-label|placeholder)="([^"]*)"[^>]*>/g, ' $2 ').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

describe('rendered health surfaces carry no patient or clinical field', () => {
  it('every health group of the ministry system console, in demo, in production and opened as a simulation', () => {
    expect(GROUPS).toEqual(expect.arrayContaining(['doctor', 'patient', 'hospitals', 'lab', 'disease', 'pharma']));
    const hits: string[] = [];
    for (const group of GROUPS) {
      for (const [mode, open] of [['demo', false], ['production', false], ['production', true]] as const) {
        const html = render(mode, group, open);
        hits.push(...found(text(html), `${group} · ${mode}${open ? ' opened' : ''}`));
      }
    }
    expect(hits).toEqual([]);
  });

  it('the administrative panels replaced the person-level ones, keeping their places and links', () => {
    const doctor = text(render('demo', 'doctor'));
    for (const title of ['Workforce desk', 'Staffing by cadre', 'Attendances by acuity', 'Stock & laboratory turnaround', 'Referrals between facilities', 'Registration & licensing runtime']) expect(doctor).toContain(title);
    const access = text(render('demo', 'patient'));
    for (const title of ['Health Service Access', 'Portal usage — requests by service', 'Vaccination coverage', 'Public health advisories & programme coverage', 'Dispensing returns', 'Laboratory turnaround', 'Referrals between facilities']) expect(access).toContain(title);
    // Every group's link stays on the page.
    const html = render('demo', 'patient');
    for (const g of GROUPS) expect(html).toContain(`/ministries/${HEALTH}/system/${g}"`);
  });

  it('the source of SubsystemConsole\'s health sections names no such field (a row opened later included)', () => {
    const src = readFileSync(join(__dirname, '../../components/features/SubsystemConsole.tsx'), 'utf8');
    const sections = src.split(/\n(?=\s*if \(is[A-Za-z]+ && group === )/).filter(s => /^\s*if \(isHealth && group === /.test(s));
    expect(sections.length).toBeGreaterThanOrEqual(10);
    const hits = sections.flatMap(s => found(s.split('\n  }\n')[0]!, `SubsystemConsole ${s.match(/group === '([^']+)'/)?.[1]}`));
    // The imports name only administrative and aggregate engines for health.
    expect(src).not.toMatch(/\b(intakeQueue|prescriptions|labRequests|patientServices)\b/);
    expect(hits).toEqual([]);
  });

  it('the health blueprint, institution chain and the work kinds its queues use', () => {
    const hits: string[] = [];
    for (const g of blueprintFor('HEALTH')) hits.push(...found([g.name, g.purpose, ...g.systems.map(s => s.name)].join(' · '), `blueprint ${g.key}`));
    const c = chainDef('HEALTH');
    hits.push(...found(`${c.actorRole} ${c.recordNoun} ${c.facilityKind}`, 'institution chain HEALTH'));
    for (const kind of ['permit', 'approval', 'procurement', 'incident', 'case', 'lab'] as const) {
      const wf = workflowFor(kind);
      hits.push(...found(`${wf.label} ${wf.stages.join(' ')}`, `work kind ${kind}`));
    }
    expect(hits).toEqual([]);
  });

  it('every exception has a reason', () => {
    for (const a of ALLOWED) expect(a.why.length).toBeGreaterThan(20);
  });
});
