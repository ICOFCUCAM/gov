// Public-site design presets. A preset is a sector's way of presenting an
// institution: its typefaces, shape, density and palette treatment, the
// header style, and which blocks appear in which order and variant. Every
// preset shows the whole content record (nothing a site holds is dropped);
// presets differ in emphasis and character, not in what citizens can reach.
//
// Shared foundations stay the same in every preset: the official banner,
// accessibility and language controls, the legal footer and sign-in links.
// "Civic Standard" is the original shared layout (PublicSiteShell), kept as a
// preset any institution may choose.

export type Sector = 'response' | 'chamber' | 'court' | 'executive' | 'service' | 'economy' | 'field' | 'care' | 'finance';

export type BlockId =
  | 'hero' | 'alert' | 'services' | 'featured' | 'figures' | 'news' | 'programmes' | 'contact' | 'shortcuts' | 'emergencyNumbers';

export interface BlockRef { block: BlockId; variant: string }

export interface PresetDesign {
  /** CSS font stacks; the typefaces are served from /fonts (design/fonts.css). */
  display: string;
  body: string;
  /** Headline treatment. */
  headingCase: 'normal' | 'upper';
  headingWeight: 600 | 700;
  /** Corner radius of cards and buttons, px. */
  radius: number;
  /** Vertical rhythm between sections, px. */
  gap: number;
  /** 'ministry': the institution's colours throughout; 'sober': neutral surfaces, colour for links and marks only. */
  palette: 'ministry' | 'sober';
  /** 'bar': crest left, menu right; 'masthead': centred crest and name above the menu. */
  header: 'bar' | 'masthead';
}

export interface Preset {
  id: string;
  label: string;
  sector: Sector | 'standard';
  description: string;
  design: PresetDesign;
  /** Rows top to bottom; an array is a row of blocks side by side. */
  layout: (BlockRef | BlockRef[])[];
  /** A design of its own drawn by the site's page (Health, Treasury) rather than composed from blocks. */
  bespoke?: boolean;
}

export const FONTS = {
  serif: "'Source Serif 4', 'Noto Naskh Arabic', Georgia, 'Times New Roman', serif",
  publicSans: "'Public Sans', 'Noto Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif",
  plex: "'IBM Plex Sans', 'Noto Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif",
  condensed: "'Barlow Condensed', 'Noto Sans Arabic', 'Arial Narrow', system-ui, sans-serif",
  sourceSans: "'Source Sans 3', 'Noto Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif",
  franklin: "'Libre Franklin', 'Noto Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif",
  system: "ui-sans-serif, system-ui, 'Noto Sans Arabic', -apple-system, 'Segoe UI', sans-serif",
} as const;

const b = (block: BlockId, variant: string): BlockRef => ({ block, variant });

export const PRESETS: Record<string, Preset> = {
  'civic-standard': {
    id: 'civic-standard', label: 'Civic Standard', sector: 'standard',
    description: 'The original shared layout: illustrated hero, task tiles, three feature cards, figures, news, programmes and locator side by side.',
    design: { display: FONTS.system, body: FONTS.system, headingCase: 'normal', headingWeight: 700, radius: 12, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [],
  },

  // Police, emergency services: the emergency route first, then reporting and alerts.
  'response-command': {
    id: 'response-command', label: 'Response — Command', sector: 'response',
    description: 'Emergency-first: a strong alert band, the emergency number and reporting up front, alerts as a timeline.',
    design: { display: FONTS.condensed, body: FONTS.publicSans, headingCase: 'upper', headingWeight: 700, radius: 6, gap: 36, palette: 'ministry', header: 'bar' },
    layout: [
      b('alert', 'band'), b('hero', 'response'), b('emergencyNumbers', 'strip'), b('services', 'tiles'),
      [b('news', 'timeline'), b('contact', 'panel')], b('featured', 'cards'), b('figures', 'band'),
      [b('programmes', 'list'), b('shortcuts', 'columns')],
    ],
  },
  'response-community': {
    id: 'response-community', label: 'Response — Community', sector: 'response',
    description: 'Calmer neighbourhood-service tone: reporting and finding help first, community programmes prominent.',
    design: { display: FONTS.publicSans, body: FONTS.publicSans, headingCase: 'normal', headingWeight: 700, radius: 14, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'response'), b('alert', 'bar'), b('services', 'cards'), b('featured', 'spotlight'),
      [b('contact', 'panel'), b('news', 'list')], b('emergencyNumbers', 'strip'), b('programmes', 'grid'), b('figures', 'cards'), b('shortcuts', 'strip'),
    ],
  },

  // Parliament chambers: the sitting, the bills and the members.
  'chamber-hansard': {
    id: 'chamber-hansard', label: 'Chamber — Hansard', sector: 'chamber',
    description: 'Parliamentary record: centred masthead, the current sitting first, business as a ruled list, figures as a ledger.',
    design: { display: FONTS.serif, body: FONTS.sourceSans, headingCase: 'normal', headingWeight: 600, radius: 2, gap: 44, palette: 'sober', header: 'masthead' },
    layout: [
      b('hero', 'chamber'), b('services', 'list'), [b('news', 'lead'), b('figures', 'ledger')],
      b('featured', 'cards'), [b('programmes', 'list'), b('contact', 'panel')], b('shortcuts', 'columns'),
    ],
  },
  'chamber-gallery': {
    id: 'chamber-gallery', label: 'Chamber — Public Gallery', sector: 'chamber',
    description: 'Open to the public: watch-live first, participation (petitions, find your member) as cards.',
    design: { display: FONTS.serif, body: FONTS.sourceSans, headingCase: 'normal', headingWeight: 700, radius: 10, gap: 40, palette: 'ministry', header: 'masthead' },
    layout: [
      b('hero', 'chamber'), b('services', 'cards'), b('featured', 'spotlight'), b('figures', 'band'),
      [b('news', 'list'), b('programmes', 'list'), b('contact', 'locator')], b('shortcuts', 'strip'),
    ],
  },

  // Courts and justice: sober, authoritative, decisions and access to justice.
  'court-registry': {
    id: 'court-registry', label: 'Court — Registry', sector: 'court',
    description: 'Sober and authoritative: a formal statement, court services as a register, judgments and notices as a ruled list.',
    design: { display: FONTS.serif, body: FONTS.sourceSans, headingCase: 'normal', headingWeight: 600, radius: 0, gap: 44, palette: 'sober', header: 'masthead' },
    layout: [
      b('hero', 'statement'), b('alert', 'bar'), b('services', 'list'), [b('news', 'lead'), b('contact', 'panel')],
      b('featured', 'cards'), b('figures', 'ledger'), [b('programmes', 'list'), b('shortcuts', 'columns')],
    ],
  },
  'court-access': {
    id: 'court-access', label: 'Court — Access to Justice', sector: 'court',
    description: 'Citizen-facing justice: what you can do first (file, find a court, legal aid), plain language, warmer shape.',
    design: { display: FONTS.serif, body: FONTS.publicSans, headingCase: 'normal', headingWeight: 700, radius: 10, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'search'), b('alert', 'bar'), b('services', 'cards'), b('featured', 'spotlight'),
      [b('contact', 'panel'), b('news', 'list')], b('figures', 'cards'), b('programmes', 'grid'), b('shortcuts', 'strip'),
    ],
  },

  // Head of state / government and national operations.
  'executive-state': {
    id: 'executive-state', label: 'Executive — State', sector: 'executive',
    description: 'Statesmanlike: centred crest and statement, decisions and briefings as a timeline, figures as a ledger.',
    design: { display: FONTS.serif, body: FONTS.franklin, headingCase: 'normal', headingWeight: 600, radius: 4, gap: 48, palette: 'sober', header: 'masthead' },
    layout: [
      b('hero', 'statement'), b('alert', 'bar'), b('featured', 'cards'), [b('news', 'timeline'), b('figures', 'ledger')],
      b('services', 'list'), [b('programmes', 'list'), b('contact', 'panel')], b('shortcuts', 'columns'),
    ],
  },
  'executive-briefing': {
    id: 'executive-briefing', label: 'Executive — Briefing Room', sector: 'executive',
    description: 'Operations and briefings first: a data-led opening, the latest briefing as lead story.',
    design: { display: FONTS.franklin, body: FONTS.franklin, headingCase: 'upper', headingWeight: 700, radius: 6, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'data'), b('alert', 'band'), b('news', 'lead'), b('services', 'tiles'), b('featured', 'cards'),
      [b('programmes', 'list'), b('contact', 'panel')], b('figures', 'band'), b('shortcuts', 'strip'),
    ],
  },

  // Service ministries and the citizen portal: tasks first.
  'service-desk': {
    id: 'service-desk', label: 'Service — Desk', sector: 'service',
    description: 'Task-first, plain and quick: "what do you need to do?" with the most used tasks, services as a clear list.',
    design: { display: FONTS.publicSans, body: FONTS.publicSans, headingCase: 'normal', headingWeight: 700, radius: 6, gap: 36, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'search'), b('alert', 'bar'), b('services', 'list'), b('featured', 'cards'),
      [b('news', 'list'), b('programmes', 'list'), b('contact', 'locator')], b('figures', 'cards'), b('shortcuts', 'strip'),
    ],
  },
  'service-journeys': {
    id: 'service-journeys', label: 'Service — Journeys', sector: 'service',
    description: 'Friendlier and visual: large service cards, a spotlight programme, softer shapes.',
    design: { display: FONTS.sourceSans, body: FONTS.sourceSans, headingCase: 'normal', headingWeight: 700, radius: 18, gap: 44, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'search'), b('services', 'cards'), b('alert', 'bar'), b('featured', 'spotlight'), b('programmes', 'grid'),
      [b('news', 'lead'), b('contact', 'panel')], b('figures', 'band'), b('shortcuts', 'columns'),
    ],
  },

  'service-registry': {
    id: 'service-registry', label: 'Service — Registry', sector: 'service',
    description: 'Civil registration and identity: a formal masthead, registers and certificates as a ruled list, offices beside notices.',
    design: { display: FONTS.serif, body: FONTS.publicSans, headingCase: 'normal', headingWeight: 600, radius: 3, gap: 40, palette: 'sober', header: 'masthead' },
    layout: [
      b('hero', 'search'), b('services', 'list'), b('alert', 'bar'), [b('contact', 'panel'), b('news', 'lead')],
      b('featured', 'cards'), b('figures', 'ledger'), [b('programmes', 'list'), b('shortcuts', 'columns')],
    ],
  },
  'service-consular': {
    id: 'service-consular', label: 'Service — Consular', sector: 'service',
    description: 'Travel and consular help: advisories as a band, passports and visas first, missions and contacts prominent.',
    design: { display: FONTS.serif, body: FONTS.sourceSans, headingCase: 'normal', headingWeight: 700, radius: 8, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'editorial'), b('alert', 'band'), b('services', 'cards'), [b('contact', 'panel'), b('news', 'timeline')],
      b('featured', 'spotlight'), b('programmes', 'grid'), b('figures', 'cards'), b('shortcuts', 'strip'),
    ],
  },
  'service-portal': {
    id: 'service-portal', label: 'Service — Citizen Portal', sector: 'service',
    description: 'The citizen\'s own front door: wallet and tasks first as large tiles, safeguards in the spotlight.',
    design: { display: FONTS.publicSans, body: FONTS.publicSans, headingCase: 'normal', headingWeight: 700, radius: 16, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'search'), b('services', 'tiles'), b('featured', 'spotlight'), b('alert', 'bar'),
      [b('news', 'list'), b('programmes', 'list'), b('contact', 'panel')], b('figures', 'band'), b('shortcuts', 'columns'),
    ],
  },

  // Economy, trade, energy and communications: figures lead.
  'economy-indicators': {
    id: 'economy-indicators', label: 'Economy — Indicators', sector: 'economy',
    description: 'Data-led: key figures beside the headline, a figures band, publications and data as shortcuts.',
    design: { display: FONTS.plex, body: FONTS.plex, headingCase: 'normal', headingWeight: 600, radius: 4, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'data'), b('alert', 'bar'), b('services', 'tiles'), b('figures', 'band'), b('featured', 'cards'),
      [b('news', 'lead'), b('programmes', 'list')], [b('contact', 'panel'), b('shortcuts', 'columns')],
    ],
  },
  'economy-investor': {
    id: 'economy-investor', label: 'Economy — Investor', sector: 'economy',
    description: 'Outward-facing: an editorial opening, opportunities and programmes as a grid, figures as a ledger.',
    design: { display: FONTS.plex, body: FONTS.plex, headingCase: 'upper', headingWeight: 600, radius: 0, gap: 44, palette: 'sober', header: 'bar' },
    layout: [
      b('hero', 'editorial'), b('services', 'list'), b('programmes', 'grid'), [b('figures', 'ledger'), b('news', 'list')],
      b('featured', 'spotlight'), b('alert', 'bar'), [b('contact', 'locator'), b('shortcuts', 'columns')],
    ],
  },

  'economy-grid': {
    id: 'economy-grid', label: 'Economy — Grid Status', sector: 'economy',
    description: 'Utilities: service status and outages first, figures as a band, connections and permits as a list.',
    design: { display: FONTS.condensed, body: FONTS.plex, headingCase: 'upper', headingWeight: 700, radius: 4, gap: 36, palette: 'ministry', header: 'bar' },
    layout: [
      b('alert', 'band'), b('hero', 'data'), b('services', 'list'), b('figures', 'band'),
      [b('news', 'timeline'), b('contact', 'locator')], b('featured', 'cards'), [b('programmes', 'list'), b('shortcuts', 'columns')],
    ],
  },

  // Land, environment, agriculture and transport: places and seasons.
  'field-landscape': {
    id: 'field-landscape', label: 'Field — Landscape', sector: 'field',
    description: 'Place-led: a wide editorial opening, seasonal advisories, programmes in the field as a grid, the map prominent.',
    design: { display: FONTS.franklin, body: FONTS.franklin, headingCase: 'normal', headingWeight: 700, radius: 12, gap: 44, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'editorial'), b('alert', 'bar'), b('services', 'tiles'), b('programmes', 'grid'),
      [b('contact', 'locator'), b('news', 'lead')], b('featured', 'spotlight'), b('figures', 'cards'), b('shortcuts', 'strip'),
    ],
  },
  'field-conservation': {
    id: 'field-conservation', label: 'Field — Conservation', sector: 'field',
    description: 'Stewardship: the spotlight campaign first, protected places and programmes as a grid, reporting close at hand.',
    design: { display: FONTS.serif, body: FONTS.franklin, headingCase: 'normal', headingWeight: 600, radius: 20, gap: 48, palette: 'ministry', header: 'masthead' },
    layout: [
      b('hero', 'editorial'), b('featured', 'spotlight'), b('services', 'cards'), b('alert', 'bar'), b('programmes', 'grid'),
      [b('news', 'lead'), b('contact', 'locator')], b('figures', 'ledger'), b('shortcuts', 'strip'),
    ],
  },
  'field-network': {
    id: 'field-network', label: 'Field — Network', sector: 'field',
    description: 'Network and logistics: live status and figures up front, services as a list, map and notices side by side.',
    design: { display: FONTS.franklin, body: FONTS.publicSans, headingCase: 'upper', headingWeight: 700, radius: 4, gap: 36, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'data'), b('alert', 'band'), b('services', 'list'), [b('contact', 'locator'), b('news', 'timeline')],
      b('featured', 'cards'), b('figures', 'band'), [b('programmes', 'list'), b('shortcuts', 'columns')],
    ],
  },

  // Health: care and finding help.
  'care-portal': {
    id: 'care-portal', label: 'Care — Ministry Portal', sector: 'care', bespoke: true,
    description: 'The Ministry of Health\'s own design: clinical light palette, task tiles, campaign and surveillance cards, facility finder.',
    design: { display: FONTS.system, body: FONTS.system, headingCase: 'normal', headingWeight: 700, radius: 16, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [],
  },
  'care-finder': {
    id: 'care-finder', label: 'Care — Finder', sector: 'care',
    description: 'Finding care first: topics beside the headline, large service cards, the facility finder beside the news.',
    design: { display: FONTS.sourceSans, body: FONTS.sourceSans, headingCase: 'normal', headingWeight: 700, radius: 16, gap: 40, palette: 'ministry', header: 'bar' },
    layout: [
      b('hero', 'search'), b('alert', 'bar'), b('services', 'cards'), b('featured', 'cards'),
      [b('contact', 'locator'), b('news', 'list')], b('programmes', 'grid'), b('figures', 'cards'), b('shortcuts', 'strip'),
    ],
  },

  // Treasury and finance.
  'finance-treasury': {
    id: 'finance-treasury', label: 'Finance — Treasury', sector: 'finance', bespoke: true,
    description: 'The Treasury\'s own design: warm white, navy and gold, the six pillars, live fiscal panels and the budget donut.',
    design: { display: FONTS.serif, body: FONTS.system, headingCase: 'upper', headingWeight: 700, radius: 6, gap: 32, palette: 'sober', header: 'bar' },
    layout: [],
  },
  'finance-ledger': {
    id: 'finance-ledger', label: 'Finance — Ledger', sector: 'finance',
    description: 'Public accounts: a formal masthead and statement, figures as a ledger beside the news, pillars as a grid.',
    design: { display: FONTS.serif, body: FONTS.plex, headingCase: 'normal', headingWeight: 600, radius: 2, gap: 44, palette: 'sober', header: 'masthead' },
    layout: [
      b('hero', 'statement'), b('services', 'list'), [b('figures', 'ledger'), b('news', 'lead')], b('featured', 'cards'),
      b('programmes', 'grid'), b('alert', 'bar'), [b('contact', 'panel'), b('shortcuts', 'columns')],
    ],
  },
};

/** Each institution's sector. */
export const SITE_SECTOR: Record<string, Sector> = {
  police: 'response', emergency: 'response',
  senate: 'chamber', assembly: 'chamber',
  judiciary: 'court', justice: 'court',
  presidency: 'executive', noc: 'executive',
  labour: 'service', interior: 'service', education: 'service', portal: 'service', 'foreign-affairs': 'service',
  trade: 'economy', energy: 'economy', communications: 'economy',
  agriculture: 'field', environment: 'field', transport: 'field',
  health: 'care', treasury: 'finance',
};

/** The preset each institution starts with; a nation can choose another for any site. */
export const DEFAULT_PRESET: Record<string, string> = {
  police: 'response-command', emergency: 'response-community',
  senate: 'chamber-hansard', assembly: 'chamber-gallery',
  judiciary: 'court-registry', justice: 'court-access',
  presidency: 'executive-state', noc: 'executive-briefing',
  labour: 'service-desk', interior: 'service-registry', education: 'service-journeys', portal: 'service-portal', 'foreign-affairs': 'service-consular',
  trade: 'economy-investor', energy: 'economy-grid', communications: 'economy-indicators',
  agriculture: 'field-landscape', environment: 'field-conservation', transport: 'field-network',
  health: 'care-portal', treasury: 'finance-treasury',
};

/** Presets a site may use: its sector's presets and Civic Standard. */
export function presetsFor(siteId: string): Preset[] {
  const sector = SITE_SECTOR[siteId];
  return Object.values(PRESETS).filter(p => p.sector === sector || p.sector === 'standard');
}
