// The console's menu in plain language (one source for the side menu, the tab
// bar on each page and the command palette). About thirty entries instead of
// seventy: related pages are tabs of one menu item. Every earlier page keeps
// its address; `was` keeps the earlier menu name so people (and the command
// palette) still find it. Labels are the words a ministry uses; technical
// names live in the glossary (lib/nav/glossary.ts).

export interface NavTab { label: string; href: string; was?: string }
export interface NavItem {
  key: string;
  icon: string;
  label: string;
  /** One plain sentence: what this page is for. */
  purpose: string;
  href: string;
  tabs: NavTab[];
  /** Pages that belong here but are reached by a pattern (e.g. one per branch). */
  match?: RegExp;
}
export interface NavSection { label: string; items: NavItem[] }

const tab = (label: string, href: string, was?: string): NavTab => ({ label, href, ...(was ? { was } : {}) });

export const CONSOLE_NAV: NavSection[] = [
  { label: 'My desk', items: [
    { key: 'work', icon: '☑', label: 'My work', href: '/gov/work', match: /^\/gov\/(items|cases)\//,
      purpose: 'Everything waiting on you and your colleagues: decisions, cases, requests and incidents.',
      tabs: [tab('Waiting on officials', '/gov/work', 'My work'), tab('My workspace', '/gov/workspace'), tab('Today', '/gov/home', 'Officer Home'), tab('Directives to me', '/gov/inbox', 'Directive inbox'),
        tab('Case work', '/gov/workbench', 'Officer Workbench'), tab('Citizen requests', '/gov/intake', 'Citizen Intake'), tab('Permits', '/console', 'Officer Console'),
        tab('Notifications', '/gov/alerts'), tab('Following', '/gov/watchlist', 'Watchlist'), tab('Load cases', '/gov/work/cases'), tab('Cases', '/gov/work/cases/open')] },
    { key: 'me', icon: '◉', label: 'My account', href: '/gov/me', purpose: 'Your profile, your signing key and your session.', tabs: [tab('Profile', '/gov/me')] },
  ]},
  { label: 'Decisions', items: [
    { key: 'cab', icon: '◆', label: 'Cabinet brief', href: '/gov',
      purpose: 'What needs a decision at cabinet level, and the daily brief.',
      tabs: [tab('Cabinet brief', '/gov', 'Cabinet Intelligence'), tab('Daily brief', '/gov/briefing', 'Briefing Chamber'), tab('Command centre', '/command', 'Sovereign Command Center')] },
    { key: 'dir', icon: '§', label: 'Directives', href: '/gov/directives',
      purpose: 'Orders and instructions: draft, sign, send and follow them through.',
      tabs: [tab('Directives', '/gov/directives', 'Directive Board'), tab('Dispatches', '/gov/dispatches', 'Dispatch Board'),
        tab('Escalations', '/gov/escalations', 'Escalation Floor'), tab('Constitutional review', '/gov/constitutional', 'Constitutional desk')] },
    { key: 'civil', icon: '❦', label: 'Registers', href: '/gov/civil',
      purpose: 'The people registered and their births, deaths and marriages, the organisations registered, licensed or accredited, the visas and permits granted, schools\' inspections, qualifications and returns, and regulated health professionals and facilities\' capacity, all recorded through decided cases.',
      tabs: [tab('Civil registry', '/gov/civil'), tab('Organisations', '/gov/organisations'), tab('Visas and permits', '/gov/immigration'), tab('Education', '/gov/education'), tab('Health regulation', '/gov/health-regulation')] },
    { key: 'law', icon: '¶', label: 'Laws', href: '/gov/law',
      purpose: 'The nation\'s laws as versioned texts that decisions cite, and the procedures that apply them.',
      tabs: [tab('Laws', '/gov/law'), tab('Procedures', '/gov/law/procedures'), tab('Permit authorities', '/gov/law/permit-authorities'), tab('Rates and tariffs', '/gov/law/rules'), tab('How laws relate', '/gov/law/relations')] },
    { key: 'branches', icon: '⚖', label: 'Branches of government', href: '/gov/branches', match: /^\/gov\/branch\//,
      purpose: 'The branches the constitution sets up, their mandates and how they check each other.',
      tabs: [tab('All branches', '/gov/branches', 'Branches of Government')] },
  ]},
  { label: 'National situation', items: [
    { key: 'sr', icon: '◎', label: 'Situation now', href: '/gov/situation-room',
      purpose: 'The state of the nation at this moment: incidents, pressures and how they spread.',
      tabs: [tab('Situation now', '/gov/situation-room', 'Situation Room'), tab('Whole of government', '/gov/shell', 'National Shell'),
        tab('Knock-on effects', '/gov/coordination', 'National Coordination'), tab('Live events', '/gov/live', 'Live Wall'),
        tab('Emergency screen', '/wall', 'NCCC Wall'), tab('Status history', '/gov/posture', 'Posture Board')] },
    { key: 'reg', icon: '◉', label: 'Regions', href: '/gov/regional', purpose: 'How each region is doing, side by side.', tabs: [tab('Regions', '/gov/regional', 'Regional Command')] },
    { key: 'fin', icon: '§', label: 'Public finances', href: '/gov/treasury', purpose: 'Revenue, spending, reserves and fiscal pressure.', tabs: [tab('Public finances', '/gov/treasury', 'Treasury Command'), tab('Tax', '/gov/tax'), tab('Customs', '/gov/customs')] },
    { key: 'sec', icon: '◈', label: 'Security & public order', href: '/gov/security', purpose: 'Threats, incidents and the readiness of security services.', tabs: [tab('Security & public order', '/gov/security', 'Security & Interior')] },
    { key: 'geo', icon: '◷', label: 'Foreign relations', href: '/gov/geopolitical', purpose: 'Pressure from outside the borders: partners, markets and frontiers.', tabs: [tab('Foreign relations', '/gov/geopolitical', 'Geopolitical Monitor')] },
    { key: 'sim', icon: '⟁', label: 'What-if scenarios', href: '/gov/simulation', purpose: 'Try a scenario and see its likely effect before deciding. Results are modelled, never facts.', tabs: [tab('What-if scenarios', '/gov/simulation', 'National Simulation')] },
  ]},
  { label: 'Ministries & agencies', items: [
    { key: 'min', icon: '▦', label: 'All ministries & agencies', href: '/ministries',
      purpose: 'Every institution: set them up, see their mandates, performance and services.',
      tabs: [tab('Ministries & agencies', '/ministries', 'Institutions Admin'), tab('Directory', '/gov/registry', 'Institutions Catalogue'),
        tab('Mandates', '/gov/charter', 'Charters'), tab('Performance', '/gov/accountability', 'Accountability'), tab('Service health', '/control', 'Ministry Control')] },
  ]},
  { label: 'Services', items: [
    { key: 'ops', icon: '⊞', label: 'Operations', href: '/ops', purpose: 'Day-to-day running of public services across institutions.',
      tabs: [tab('Operations', '/ops', 'Operations Centre'), tab('Operations record', '/gov/ledger', 'Operations Ledger')] },
    { key: 'sites', icon: '▤', label: 'Public websites', href: '/admin/sites', purpose: 'The ministries\' public websites: propose, review and publish changes.', tabs: [tab('Public websites', '/admin/sites', 'Site editor')] },
    { key: 'wal', icon: '◊', label: 'Citizen app preview', href: '/wallet', purpose: 'See the services as a citizen sees them.', tabs: [tab('Citizen app preview', '/wallet', 'Civic Wallet')] },
  ]},
  { label: 'National data', items: [
    { key: 'twin', icon: '◬', label: 'National data', href: '/gov/twin',
      purpose: 'The facts the government relies on, where each comes from and what was known when.',
      tabs: [tab('National data', '/gov/twin', 'National Twin'), tab('Sensor and system feeds', '/gov/telemetry', 'Telemetry Wall'),
        tab('Messages between institutions', '/gov/federation', 'Federation Stream'), tab('Activity across government', '/gov/global', 'Global feed'),
        tab('Sites', '/gov/sites'), tab('Capture a site', '/gov/sites/capture'), tab('Boundaries', '/gov/sites/boundaries'),
        tab('Land parcels', '/gov/sites/parcels'), tab('Sources that disagree', '/gov/twin/conflicts')] },
    { key: 'intg', icon: '⇄', label: 'Connected systems', href: '/integrations',
      purpose: 'Which outside systems may exchange data with the platform, and on what terms.',
      tabs: [tab('Connected systems', '/integrations', 'Interoperability'), tab('Links between institutions', '/gov/fabric', 'Interoperability Fabric'),
        tab('Data-sharing services', '/gov/exchange'), tab('Events sent out', '/gov/exchange/events'),
        tab('Automatic notifications', '/gov/webhooks', 'Federation Webhooks'), tab('Email and text messages', '/admin/messaging')] },
  ]},
  { label: 'Records & audit', items: [
    { key: 'aud', icon: '⛓', label: 'Audit record', href: '/audit',
      purpose: 'The tamper-evident record of every action, and the means to check it.',
      tabs: [tab('Audit record', '/audit', 'Oversight'), tab('Search the record', '/gov/audit', 'Audit Explorer'), tab('Activity', '/gov/activity', 'Activity Log'),
        tab('Signatures', '/gov/signatures', 'Signature Audit'), tab('Independent confirmations', '/gov/witnesses', 'Audit Witnesses'),
        tab('Check an exported record', '/gov/audit-replay', 'Audit Replay'), tab('Who read what', '/gov/access-log')] },
  ]},
  { label: 'People', items: [
    { key: 'staff', icon: '⚿', label: 'Staff', href: '/gov/officers', purpose: 'Officials, their roles and their accounts.',
      tabs: [tab('Staff', '/gov/officers', 'Officer Registry'), tab('Sign-in accounts', '/admin/officials', 'Official accounts'),
        tab('Add from a spreadsheet', '/gov/officers/bulk', 'Bulk Onboarding'), tab('Directory', '/gov/directory', 'Officer Directory')] },
  ]},
  { label: 'Set-up & platform', items: [
    { key: 'cfg', icon: '⚙', label: 'National settings', href: '/gov/configuration', purpose: 'The nation\'s profile, offices, regions and how work flows.',
      tabs: [tab('National settings', '/gov/configuration', 'Sovereign Configuration'), tab('Who is responsible', '/gov/configuration/responsible'), tab('Offices', '/gov/configuration/offices'), tab('Relationships', '/gov/configuration/relationships'), tab('Setup', '/setup'), tab('Onboarding', '/admin/onboarding'),
        tab('Workflows', '/gov/workflows', 'Workflow Catalogue')] },
    { key: 'upd', icon: '⬆', label: 'Updates', href: '/updates', purpose: 'New versions of the platform: what they change, and installing them safely.',
      tabs: [tab('Updates', '/updates', 'Update chamber'), tab('Publisher console', '/admin/releases')] },
    { key: 'plat', icon: '◫', label: 'Platform health', href: '/platform', purpose: 'Whether the platform itself is running well.',
      tabs: [tab('Platform health', '/platform', 'Platform Operations'), tab('System status', '/gov/substrate', 'Substrate Status'), tab('Scheduled tasks', '/gov/crons', 'Cron status')] },
    { key: 'dev', icon: '⌁', label: 'Developers', href: '/gov/map', purpose: 'For the engineers who connect and extend the platform.',
      tabs: [tab('System map', '/gov/map'), tab('Playground', '/gov/playground'), tab('API description', '/api/openapi'), tab('Developer guide', '/developers')] },
  ]},
  { label: 'Help', items: [
    { key: 'help', icon: '?', label: 'Help', href: '/gov/help', purpose: 'Keyboard shortcuts and what the platform\'s words mean.',
      tabs: [tab('Shortcuts', '/gov/help', 'Help'), tab('Glossary', '/gov/glossary')] },
  ]},
];

export const ALL_ITEMS = CONSOLE_NAV.flatMap(s => s.items.map(item => ({ section: s.label, item })));

/** The menu item and tab a page belongs to (exact tab match first, then the item's pattern, then the longest prefix). */
export function locate(pathname: string): { section: string; item: NavItem; tab?: NavTab } | null {
  const path = pathname.replace(/\/$/, '') || '/';
  for (const { section, item } of ALL_ITEMS) {
    const t = item.tabs.find(x => x.href === path);
    if (t) return { section, item, tab: t };
  }
  if (path === SEARCH_ITEM.href) return { section: 'My desk', item: SEARCH_ITEM, tab: SEARCH_ITEM.tabs[0] };
  for (const { section, item } of ALL_ITEMS) if (item.match?.test(path)) return { section, item };
  let best: { section: string; item: NavItem; tab?: NavTab; len: number } | null = null;
  for (const { section, item } of ALL_ITEMS) for (const t of item.tabs) {
    if (t.href !== '/gov' && path.startsWith(t.href + '/') && (!best || t.href.length > best.len)) best = { section, item, tab: t, len: t.href.length };
  }
  return best ? { section: best.section, item: best.item, tab: best.tab } : null;
}

/** Links in the console header rather than the side menu. */
export const HEADER_LINKS: NavTab[] = [tab('Search', '/gov/search', 'Search')];
const SEARCH_ITEM: NavItem = { key: 'search', icon: '⌕', label: 'Search', href: '/gov/search', purpose: 'Find any record by its name, reference or the person involved.', tabs: [tab('Search', '/gov/search')] };
