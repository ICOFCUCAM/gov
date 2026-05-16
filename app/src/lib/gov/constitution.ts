// Sovereign Constitution Engine. Government topology is NOT hardcoded —
// it is derived from the configured constitutional form. The same
// CivicOS core resolves a presidential republic, parliamentary republic,
// monarchy, federation, city-state or supranational union from one
// abstraction. Pure; no React/DOM.

import type { StateForm } from '@/lib/api/types';

export type BranchKey =
  | 'executive' | 'legislature' | 'judiciary' | 'oversight'
  | 'crown' | 'electoral' | 'federal-council';

export interface BranchBody { name: string; role: string }
export interface BranchDef {
  key: BranchKey;
  name: string;
  mandate: string;
  bodies: BranchBody[];
  /** generic process engine this branch runs, if any */
  engine?: 'legislative' | 'judicial' | 'audit' | 'electoral' | 'none';
}
export interface Chamber { name: string; seats: number; role: string }
export interface ConstitutionModel {
  form: StateForm;
  label: string;
  executiveType: string;
  legislature: { structure: 'bicameral' | 'unicameral' | 'advisory' | 'none'; chambers: Chamber[] };
  judicialApex: string;
  judicialTiers: string[];
  regionNoun: string;
  authorityChain: { rank: number; office: string }[];
  selection: string;       // how power is conferred
  emergencyDoctrine: string;
  branches: BranchDef[];
}

const exec = (name: string, bodies: BranchBody[]): BranchDef =>
  ({ key: 'executive', name, mandate: 'Administration · enforcement · national operations', bodies, engine: 'none' });
const oversight: BranchDef = {
  key: 'oversight', name: 'Constitutional Oversight',
  mandate: 'Audit · integrity · constitutional safeguards', engine: 'audit',
  bodies: [
    { name: 'Auditor-General', role: 'Public-finance assurance' },
    { name: 'Ombudsman', role: 'Maladministration redress' },
    { name: 'Inspectorate', role: 'Anti-corruption enforcement' },
  ],
};
const electoral: BranchDef = {
  key: 'electoral', name: 'Electoral Authority',
  mandate: 'Mandate integrity · boundary · franchise', engine: 'electoral',
  bodies: [
    { name: 'Electoral Commission', role: 'Conduct of elections' },
    { name: 'Boundaries Authority', role: 'Constituency delimitation' },
    { name: 'Registration Bureau', role: 'Voter & candidate rolls' },
  ],
};
const judiciary = (apex: string, tiers: string[]): BranchDef => ({
  key: 'judiciary', name: 'Judiciary',
  mandate: 'Constitutional review · adjudication · rule of law', engine: 'judicial',
  bodies: tiers.map(t => ({ name: t, role: t === apex ? 'Apex jurisdiction' : 'Adjudication' })),
});

export function constitutionFor(form: StateForm): ConstitutionModel {
  switch (form) {
    case 'parliamentary':
      return {
        form, label: 'Parliamentary Republic', executiveType: 'Prime Minister (in Parliament)',
        legislature: { structure: 'bicameral', chambers: [
          { name: 'House of Representatives', seats: 350, role: 'Confidence chamber · government formation' },
          { name: 'Senate', seats: 80, role: 'Territorial review chamber' },
        ] },
        judicialApex: 'Constitutional Court',
        judicialTiers: ['Constitutional Court', 'Supreme Court', 'Courts of Appeal', 'Trial Courts'],
        regionNoun: 'region',
        authorityChain: [
          { rank: 1, office: 'Ceremonial President (Head of State)' },
          { rank: 2, office: 'Prime Minister (Head of Government)' },
          { rank: 3, office: 'Speaker of Parliament' },
          { rank: 4, office: 'Chief Justice' },
        ],
        selection: 'Government commands the confidence of the lower house; PM is parliamentary leader',
        emergencyDoctrine: 'Emergency requires parliamentary approval and is time-bound with mandatory renewal',
        branches: [
          { key: 'legislature', name: 'Parliament', mandate: 'Law-making · confidence · appropriation · oversight', engine: 'legislative',
            bodies: [
              { name: 'House of Representatives', role: 'Confidence & money bills' },
              { name: 'Senate', role: 'Territorial review' },
              { name: 'Standing Committees', role: 'Scrutiny & inquiry' },
              { name: 'Parliamentary Budget Office', role: 'Independent fiscal analysis' },
            ] },
          exec('Government (Cabinet)', [
            { name: 'Prime Minister', role: 'Head of Government' },
            { name: 'Cabinet', role: 'Collective responsibility' },
            { name: 'Ministries', role: 'Institutional delivery' },
            { name: 'Coalition Council', role: 'Confidence management' },
          ]),
          judiciary('Constitutional Court', ['Constitutional Court', 'Supreme Court', 'Courts of Appeal', 'Trial Courts']),
          oversight, electoral,
        ],
      };
    case 'monarchy':
      return {
        form, label: 'Constitutional Monarchy', executiveType: 'Monarch-in-Council / Prime Minister',
        legislature: { structure: 'bicameral', chambers: [
          { name: 'Elected Assembly', seats: 300, role: 'Representative chamber' },
          { name: 'Crown Council', seats: 60, role: 'Appointed review council' },
        ] },
        judicialApex: 'Royal Court of Cassation',
        judicialTiers: ['Royal Court of Cassation', 'Supreme Court', 'Appellate Courts', 'Provincial Courts'],
        regionNoun: 'province',
        authorityChain: [
          { rank: 1, office: 'The Crown (Sovereign)' },
          { rank: 2, office: 'Prime Minister / Grand Vizier' },
          { rank: 3, office: 'President of the Assembly' },
          { rank: 4, office: 'Chief Justice of the Royal Court' },
        ],
        selection: 'Hereditary Crown; government appointed by and accountable to the Crown and Assembly',
        emergencyDoctrine: 'Royal emergency decree, counter-signed and subject to Assembly ratification',
        branches: [
          { key: 'crown', name: 'The Crown & Royal Court', mandate: 'Sovereign authority · assent · succession', engine: 'none',
            bodies: [
              { name: 'The Sovereign', role: 'Head of State · royal assent' },
              { name: 'Crown Council', role: 'Advisory & regency' },
              { name: 'Royal Household', role: 'Court administration' },
              { name: 'Succession Board', role: 'Line of succession' },
            ] },
          { key: 'legislature', name: 'Assembly', mandate: 'Legislation · petition · appropriation', engine: 'legislative',
            bodies: [
              { name: 'Elected Assembly', role: 'Representative legislation' },
              { name: 'Crown Council', role: 'Appointed review' },
              { name: 'Committees', role: 'Scrutiny' },
            ] },
          exec('Government', [
            { name: 'Prime Minister / Grand Vizier', role: 'Head of Government' },
            { name: 'Council of Ministers', role: 'Administration' },
            { name: 'Ministries', role: 'Delivery' },
          ]),
          judiciary('Royal Court of Cassation', ['Royal Court of Cassation', 'Supreme Court', 'Appellate Courts', 'Provincial Courts']),
          oversight,
        ],
      };
    case 'federation':
      return {
        form, label: 'Federal Union', executiveType: 'Federal President / Federal Chancellor',
        legislature: { structure: 'bicameral', chambers: [
          { name: 'Federal House', seats: 435, role: 'Population chamber' },
          { name: 'Federal Senate', seats: 100, role: 'States chamber (equal representation)' },
        ] },
        judicialApex: 'Federal Constitutional Court',
        judicialTiers: ['Federal Constitutional Court', 'Federal Supreme Court', 'Circuit Courts of Appeal', 'Federal District Courts', 'State Courts'],
        regionNoun: 'state',
        authorityChain: [
          { rank: 1, office: 'Federal Executive' },
          { rank: 2, office: 'Federal Legislature (two chambers)' },
          { rank: 3, office: 'State Governors' },
          { rank: 4, office: 'Federal Constitutional Court' },
        ],
        selection: 'Federal and state mandates are separately conferred; powers are enumerated and reserved',
        emergencyDoctrine: 'Federal emergency is bounded by states’ reserved powers and judicial review',
        branches: [
          { key: 'legislature', name: 'Federal Legislature', mandate: 'Federal law · budget · treaties · oversight', engine: 'legislative',
            bodies: [
              { name: 'Federal House', role: 'Population representation' },
              { name: 'Federal Senate', role: 'State representation' },
              { name: 'Joint Committees', role: 'Reconciliation & scrutiny' },
            ] },
          exec('Federal Executive', [
            { name: 'Federal President / Chancellor', role: 'Federal Head of Government' },
            { name: 'Federal Cabinet', role: 'Federal administration' },
            { name: 'Federal Agencies', role: 'Enumerated powers' },
          ]),
          { key: 'federal-council', name: 'Council of States', mandate: 'Inter-governmental coordination · reserved powers',
            engine: 'none', bodies: [
              { name: 'Governors’ Council', role: 'State executives' },
              { name: 'State Legislatures', role: 'Reserved-power law-making' },
              { name: 'Fiscal Equalisation Board', role: 'Federal transfers' },
            ] },
          judiciary('Federal Constitutional Court', ['Federal Constitutional Court', 'Federal Supreme Court', 'Circuit Courts of Appeal', 'Federal District Courts', 'State Courts']),
          oversight, electoral,
        ],
      };
    case 'city-state':
      return {
        form, label: 'City-State', executiveType: 'Governing Mayor / Council Executive',
        legislature: { structure: 'unicameral', chambers: [
          { name: 'City Council', seats: 60, role: 'Unicameral legislative & municipal authority' },
        ] },
        judicialApex: 'Constitutional Tribunal',
        judicialTiers: ['Constitutional Tribunal', 'Supreme Court', 'District Courts'],
        regionNoun: 'district',
        authorityChain: [
          { rank: 1, office: 'Governing Mayor / Council Executive' },
          { rank: 2, office: 'City Council' },
          { rank: 3, office: 'Constitutional Tribunal' },
        ],
        selection: 'Single-tier sovereignty; executive accountable directly to the Council',
        emergencyDoctrine: 'Council-declared emergency, fixed term, no delegation beyond the city charter',
        branches: [
          { key: 'legislature', name: 'City Council', mandate: 'Legislation · budget · municipal oversight', engine: 'legislative',
            bodies: [
              { name: 'City Council', role: 'Unicameral legislature' },
              { name: 'Standing Committees', role: 'Portfolio scrutiny' },
            ] },
          exec('Council Executive', [
            { name: 'Governing Mayor', role: 'Executive authority' },
            { name: 'City Departments', role: 'Service delivery' },
          ]),
          judiciary('Constitutional Tribunal', ['Constitutional Tribunal', 'Supreme Court', 'District Courts']),
          oversight, electoral,
        ],
      };
    case 'union':
      return {
        form, label: 'Supranational Union', executiveType: 'Union Commission',
        legislature: { structure: 'bicameral', chambers: [
          { name: 'Union Parliament', seats: 705, role: 'Citizens’ chamber' },
          { name: 'Council of Member States', seats: 27, role: 'Member-state chamber' },
        ] },
        judicialApex: 'Court of Justice of the Union',
        judicialTiers: ['Court of Justice of the Union', 'General Court', 'Member-State Courts (referral)'],
        regionNoun: 'member state',
        authorityChain: [
          { rank: 1, office: 'Union Commission (Executive)' },
          { rank: 2, office: 'Council of Member States' },
          { rank: 3, office: 'Union Parliament' },
          { rank: 4, office: 'Court of Justice of the Union' },
        ],
        selection: 'Conferred competences; subsidiarity; member states retain residual sovereignty',
        emergencyDoctrine: 'Union acts only within conferred competence; member states hold emergency primacy',
        branches: [
          { key: 'legislature', name: 'Union Legislature', mandate: 'Co-decision · directives · budget', engine: 'legislative',
            bodies: [
              { name: 'Union Parliament', role: 'Citizens’ representation' },
              { name: 'Council of Member States', role: 'State representation' },
              { name: 'Conciliation Committee', role: 'Co-decision reconciliation' },
            ] },
          exec('Union Commission', [
            { name: 'Commission President', role: 'Executive coordination' },
            { name: 'Commissioners', role: 'Portfolio competence' },
            { name: 'Union Agencies', role: 'Conferred administration' },
          ]),
          { key: 'federal-council', name: 'Council of Member States', mandate: 'Inter-state coordination · subsidiarity',
            engine: 'none', bodies: [
              { name: 'Heads of Government', role: 'Strategic direction' },
              { name: 'Member-State Permanent Representatives', role: 'Negotiation' },
            ] },
          judiciary('Court of Justice of the Union', ['Court of Justice of the Union', 'General Court', 'Member-State Courts (referral)']),
          oversight,
        ],
      };
    case 'republic':
    default:
      return {
        form: 'republic', label: 'Presidential Republic', executiveType: 'Executive President',
        legislature: { structure: 'bicameral', chambers: [
          { name: 'National Assembly', seats: 350, role: 'Primary chamber' },
          { name: 'Senate', seats: 68, role: 'Territorial review chamber' },
        ] },
        judicialApex: 'Constitutional Court',
        judicialTiers: ['Constitutional Court', 'Supreme Court', 'Courts of Appeal', 'High Courts', 'Trial Courts'],
        regionNoun: 'province',
        authorityChain: [
          { rank: 1, office: 'Executive President (Head of State & Government)' },
          { rank: 2, office: 'Legislature' },
          { rank: 3, office: 'Provincial Governors' },
          { rank: 4, office: 'Chief Justice' },
        ],
        selection: 'Directly elected presidency; separate legislative mandate; fixed terms',
        emergencyDoctrine: 'Presidential emergency, legislative ratification within fixed period, judicial review',
        branches: [
          { key: 'legislature', name: 'Legislature', mandate: 'Law-making · appropriation · oversight', engine: 'legislative',
            bodies: [
              { name: 'National Assembly', role: 'Primary chamber' },
              { name: 'Senate', role: 'Territorial review' },
              { name: 'Standing Committees', role: 'Scrutiny & confirmation' },
              { name: 'Budget Office', role: 'Independent fiscal analysis' },
            ] },
          exec('Executive', [
            { name: 'Executive President', role: 'Head of State & Government' },
            { name: 'Cabinet', role: 'Coordination' },
            { name: 'Ministries', role: 'Institutional delivery' },
            { name: 'Independent Agencies', role: 'Statutory administration' },
          ]),
          judiciary('Constitutional Court', ['Constitutional Court', 'Supreme Court', 'Courts of Appeal', 'High Courts', 'Trial Courts']),
          oversight, electoral,
        ],
      };
  }
}

export function branchDef(form: StateForm, key: string): BranchDef | undefined {
  return constitutionFor(form).branches.find(b => b.key === key);
}
