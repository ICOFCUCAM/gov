// lib/gov/education-public-institutions.ts
//
// Sovereign Education — public-institution registry. Pure & deterministic.
// Each branch represents a category of public-facing educational
// institution; the count is the number of independent public portals
// (universities, school networks, exam boards, civic-literacy centres,
// research consortia, AI-tutor mesh hubs, archives) that the Ministry
// coordinates without consolidating their voice.

export type EducationBranchTier = 'Tertiary' | 'Secondary' | 'Primary' | 'Specialist' | 'Research' | 'Civic' | 'Futurist';

export interface EducationPublicBranch {
  branch: string;
  tier: EducationBranchTier;
  publicSites: number;
  href: string;
  glyph: string;
  description: string;
  flagshipExamples: string[];
}

const BRANCHES: EducationPublicBranch[] = [
  {
    branch: 'Research Universities',
    tier: 'Tertiary',
    publicSites: 24,
    href: '/education',
    glyph: '✦',
    description: 'PhD-granting research-intensive universities. Each operates its own public portal with admissions, faculty directory, research output and open data.',
    flagshipExamples: ['Capital Research University', 'Coastal Sovereign University', 'Highland Polytechnic'],
  },
  {
    branch: 'Comprehensive Universities',
    tier: 'Tertiary',
    publicSites: 38,
    href: '/education',
    glyph: '◯',
    description: 'Comprehensive degree-granting universities. Combined teaching and applied research; each portal lists programmes, fees, scholarships and applications.',
    flagshipExamples: ['Northern Open University', 'Eastern People’s University'],
  },
  {
    branch: 'Technical & Vocational Colleges',
    tier: 'Tertiary',
    publicSites: 64,
    href: '/education',
    glyph: '⌗',
    description: 'TVET colleges, apprenticeship networks and skills colleges. Each branch publishes intake, accreditation, placement rates.',
    flagshipExamples: ['National TVET Council', 'Capital Technical Institute', 'Coastal Maritime College'],
  },
  {
    branch: 'Teacher Colleges',
    tier: 'Specialist',
    publicSites: 18,
    href: '/education',
    glyph: '✚',
    description: 'Teacher-training institutions. Each portal carries enrolment, qualification pathways, in-service training.',
    flagshipExamples: ['National Teacher College', 'Highland Teacher Institute'],
  },
  {
    branch: 'Primary School Networks',
    tier: 'Primary',
    publicSites: 68,
    href: '/education',
    glyph: '☷',
    description: 'Per-district primary networks. Each network coordinates its constituent schools with a public portal listing facilities, enrolment, school health.',
    flagshipExamples: ['Capital Primary Network', 'Northern Rural Primary Cluster'],
  },
  {
    branch: 'Secondary School Networks',
    tier: 'Secondary',
    publicSites: 42,
    href: '/education',
    glyph: '⌬',
    description: 'Per-district secondary networks. Each network publishes academic results, school directories, parent portals.',
    flagshipExamples: ['Capital Secondary Network', 'Coastal Secondary Cluster'],
  },
  {
    branch: 'Examination Boards',
    tier: 'Specialist',
    publicSites: 6,
    href: '/education',
    glyph: '⚖',
    description: 'National examination boards covering primary, secondary, professional and language examinations. Each board publishes results, integrity reports and registration windows.',
    flagshipExamples: ['Secondary Examinations Council', 'Primary Examinations Council', 'Professional Exams Board'],
  },
  {
    branch: 'Research Councils & Programmes',
    tier: 'Research',
    publicSites: 14,
    href: '/education',
    glyph: '◈',
    description: 'Sovereign research councils (climate, health, energy, agriculture, sovereign tech, constitutional law, history). Each council publishes funding cycles, grants and lineage.',
    flagshipExamples: ['National Climate Research Council', 'Sovereign Tech Council', 'Constitutional Law Lineage'],
  },
  {
    branch: 'Civilizational Memory Institutes',
    tier: 'Civic',
    publicSites: 9,
    href: '/education',
    glyph: '⌭',
    description: 'National archives, constitutional libraries, civic-education centres, intergenerational memory institutes. Each operates an open public portal with searchable collections.',
    flagshipExamples: ['National Archive', 'Constitutional Library', 'Civic Education Centre'],
  },
  {
    branch: 'AI Tutor Mesh Hubs',
    tier: 'Futurist',
    publicSites: 7,
    href: '/education',
    glyph: '↬',
    description: 'Regional hubs of the Sovereign Learner Twin mesh. Each hub publishes its model attestations, privacy doctrine, and pedagogical contributions — never used for cognitive profiling.',
    flagshipExamples: ['Capital AI Tutor Mesh Hub', 'Coastal Learner Twin Hub'],
  },
  {
    branch: 'Open Curriculum Forums',
    tier: 'Civic',
    publicSites: 5,
    href: '/education',
    glyph: '✎',
    description: 'Civilian-panel forums where new curriculum is publicly drafted and challenged before adoption. Each forum publishes proposals, drafts and pluralism reviews.',
    flagshipExamples: ['Pluralism Forum (Civics)', 'Pluralism Forum (Sciences)', 'Pluralism Forum (Languages)'],
  },
];

export function educationPublicInstitutions(): EducationPublicBranch[] {
  return BRANCHES;
}

export function totalEducationPublicSites(): number {
  return BRANCHES.reduce((s, b) => s + b.publicSites, 0);
}
