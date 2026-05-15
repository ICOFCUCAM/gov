import type { SovereignProfile, SovereignIdentity, ProtocolOffice } from '@/lib/api/types';

/**
 * Sovereign identity layer — resolves a configured profile into the
 * presentation identity used across the National Shell: insignia, theme
 * accent, formal style, writing direction, and the constitutional order
 * of precedence. Pure and global-state neutral: a republic, federation,
 * monarchy, emirate, city-state or union all resolve correctly from the
 * same profile fields without bespoke code.
 */

const RTL_LOCALES = new Set(['ar', 'fa', 'he', 'ur']);
const DEFAULT_ACCENT = '#1f2630';

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => !/^(of|the|and|de|al)$/i.test(w));
  const src = words.length ? words : name.trim().split(/\s+/);
  return src.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || 'SS';
}

function protocolOrder(p: SovereignProfile): ProtocolOffice[] {
  const presiding = `Presiding Officer, ${p.legislatureName}`;
  if (p.stateForm === 'monarchy') {
    return [
      { rank: 1, office: 'Head of State', holder: 'Sovereign' },
      { rank: 2, office: 'Head of Government', holder: p.executiveTitle },
      { rank: 3, office: 'Legislature', holder: presiding },
      { rank: 4, office: 'Judiciary', holder: 'Chief Justice' },
    ];
  }
  if (p.stateForm === 'union') {
    return [
      { rank: 1, office: 'Executive', holder: p.executiveTitle },
      { rank: 2, office: 'Council', holder: p.legislatureName },
      { rank: 3, office: 'Judiciary', holder: 'President, Court of Justice' },
    ];
  }
  return [
    { rank: 1, office: 'Head of State / Government', holder: p.executiveTitle },
    { rank: 2, office: 'Legislature', holder: presiding },
    { rank: 3, office: 'Judiciary', holder: 'Chief Justice' },
  ];
}

export function resolveIdentity(p: SovereignProfile): SovereignIdentity {
  const locale = p.locale || 'en';
  return {
    stateName: p.stateName,
    seal: (p.seal && p.seal.trim()) || initials(p.stateName),
    accent: (p.accent && /^#[0-9a-fA-F]{6}$/.test(p.accent) && p.accent) || DEFAULT_ACCENT,
    motto: p.motto?.trim() || '',
    locale,
    dir: RTL_LOCALES.has(locale.split('-')[0] ?? locale) ? 'rtl' : 'ltr',
    protocol: protocolOrder(p),
  };
}

// ── Shell language pack ──────────────────────────────────────────────
export interface ShellStrings {
  state: string;
  institutions: string;
  platform: string;
  search: string;
  activeIncidents: (n: number) => string;
  compose: string;
}

const EN: ShellStrings = {
  state: 'State',
  institutions: 'Institutions',
  platform: 'Platform',
  search: 'Search institutions…',
  activeIncidents: n => `${n} active incident${n === 1 ? '' : 's'}`,
  compose: '+ Compose an institution',
};

const PACKS: Record<string, ShellStrings> = {
  en: EN,
  fr: {
    state: 'État',
    institutions: 'Institutions',
    platform: 'Plateforme',
    search: 'Rechercher des institutions…',
    activeIncidents: n => `${n} incident${n === 1 ? '' : 's'} actif${n === 1 ? '' : 's'}`,
    compose: '+ Composer une institution',
  },
  ar: {
    state: 'الدولة',
    institutions: 'المؤسسات',
    platform: 'المنصة',
    search: 'البحث في المؤسسات…',
    activeIncidents: n => `${n} حادث نشط`,
    compose: '+ إنشاء مؤسسة',
  },
};

export function shellStrings(locale: string): ShellStrings {
  return PACKS[locale.split('-')[0] ?? locale] ?? EN;
}
