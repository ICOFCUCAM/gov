// Public institution websites — the reference content records and how a
// nation's own content is laid over them. See ./types.ts for the model.

import type { SiteContent, SiteOverride } from './types';
import { agriculture } from './content/agriculture';
import { assembly } from './content/assembly';
import { communications } from './content/communications';
import { education } from './content/education';
import { emergency } from './content/emergency';
import { energy } from './content/energy';
import { environment } from './content/environment';
import { foreignAffairs } from './content/foreign-affairs';
import { health } from './content/health';
import { interior } from './content/interior';
import { judiciary } from './content/judiciary';
import { justice } from './content/justice';
import { labour } from './content/labour';
import { noc } from './content/noc';
import { police } from './content/police';
import { portal } from './content/portal';
import { presidency } from './content/presidency';
import { senate } from './content/senate';
import { trade } from './content/trade';
import { treasury } from './content/treasury';
import { transport } from './content/transport';

/** The reference record of every public institution site, by route segment. */
export const REFERENCE_SITES: Record<string, SiteContent> = {
  agriculture, assembly, communications, education, emergency, energy, environment,
  'foreign-affairs': foreignAffairs, health, interior, judiciary, justice, labour, noc, police,
  portal, presidency, senate, trade, transport, treasury,
};

export const SITE_IDS = Object.keys(REFERENCE_SITES);

/**
 * A site's content: its reference record with the nation's own content laid
 * over it. Each field the nation supplies replaces the reference field whole
 * (its own news list replaces the sample list, and so on); the institution
 * block merges key by key so a new name keeps the reference crest.
 */
export function siteContent(id: string, override?: SiteOverride | null): SiteContent {
  const base = REFERENCE_SITES[id];
  if (!base) throw new Error(`No public site "${id}"`);
  if (!override) return base;
  const merged: SiteContent = { ...base, ...override, id, institution: { ...base.institution, ...override.institution } };
  // A nation's own news or figures are no longer samples unless it says so.
  if (override.news && !override.newsSource) merged.newsSource = 'nation';
  if (override.statistics && !override.statisticsSource) merged.statisticsSource = 'nation';
  return merged;
}
