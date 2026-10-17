'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CHAMPAGNE, CHAMPAGNE_HI, hair, Corners } from '@/components/features/onboarding/Chrome';
import { useNationBrand } from '@/components/features/cover/entry';
import type {
  ChangeKind, DeliveryMode, DistributionRelease, FeatureRequestStage, FeatureRequestPriority,
  InstallState, PublisherKey, ReleaseArtifact, ReleaseSeverity,
} from '@/lib/api/types';

// Shared atoms of the Sovereign Update Center (nation chamber and publisher
// console), drawn in the night palette of the onboarding surfaces.

export const STATE_LABEL: Record<InstallState, string> = {
  available: 'Available', approved: 'Approved', scheduled: 'Scheduled', probation: 'On probation', installed: 'Installed', skipped: 'Skipped', 'rolled-back': 'Rolled back',
  'fallen-back': 'Rolled back automatically',
};
const STATE_TONE: Record<InstallState, string> = {
  available: '#d9c398', approved: '#9cc3ff', scheduled: '#c9b6ff', probation: '#f4d58d', installed: '#9be7c4', skipped: '#8a8f99', 'rolled-back': '#f1b36b',
  'fallen-back': '#f1938f',
};
export const SEVERITY_LABEL: Record<ReleaseSeverity, string> = { security: 'Security', critical: 'Critical', feature: 'Feature', maintenance: 'Maintenance' };
const SEVERITY_TONE: Record<ReleaseSeverity, string> = { security: '#f1938f', critical: '#f1b36b', feature: '#d9c398', maintenance: '#a5abb5' };
export const MODE_LABEL: Record<DeliveryMode, string> = { saas: 'Hosted (SaaS)', 'self-hosted': 'Self-hosted', 'air-gapped': 'Air-gapped' };
export const CHANGE_LABEL: Record<ChangeKind, string> = { security: 'Security', breaking: 'Breaking', feature: 'Features', fix: 'Fixes', deprecation: 'Deprecations' };
export const CHANGE_ORDER: ChangeKind[] = ['security', 'breaking', 'feature', 'fix', 'deprecation'];
const CHANGE_TONE: Record<ChangeKind, string> = { security: '#f1938f', breaking: '#f1b36b', feature: '#d9c398', fix: '#9be7c4', deprecation: '#a5abb5' };
export const STAGE_LABEL: Record<FeatureRequestStage, string> = {
  requested: 'Requested', 'under-review': 'Under review', scoped: 'Scoped', 'in-development': 'In development', ready: 'Ready', delivered: 'Delivered', declined: 'Declined',
};
export const STAGES: FeatureRequestStage[] = ['requested', 'under-review', 'scoped', 'in-development', 'ready', 'delivered'];
export const PRIORITY_LABEL: Record<FeatureRequestPriority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };

/** Hairline chip with a coloured dot: status at a glance, readable without colour. */
export function Chip({ tone, children, solid = false, title }: { tone: string; children: React.ReactNode; solid?: boolean; title?: string }) {
  return (
    <span title={title} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.18em]"
      style={{ borderColor: `${tone}${solid ? 'aa' : '55'}`, color: tone, background: solid ? `${tone}1f` : 'transparent' }}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {children}
    </span>
  );
}
export const StateChip = ({ state }: { state: InstallState }) => <Chip tone={STATE_TONE[state]} solid={state === 'installed'}>{STATE_LABEL[state]}</Chip>;
export const SeverityChip = ({ severity }: { severity: ReleaseSeverity }) => <Chip tone={SEVERITY_TONE[severity]} solid={severity === 'security' || severity === 'critical'}>{SEVERITY_LABEL[severity]}</Chip>;
const CHANGE_SINGULAR: Record<ChangeKind, string> = { security: 'Security', breaking: 'Breaking', feature: 'Feature', fix: 'Fix', deprecation: 'Deprecation' };
export const ChangeChip = ({ kind }: { kind: ChangeKind }) => <Chip tone={CHANGE_TONE[kind]}>{CHANGE_SINGULAR[kind]}</Chip>;
export function ChannelChip({ r, nationName }: { r: Pick<DistributionRelease, 'channel'>; nationName?: string }) {
  return r.channel === 'global'
    ? <Chip tone="#a9c7e8" title="Released to every nation">Global</Chip>
    : <Chip tone={CHAMPAGNE_HI} solid title="Built for this nation only">{nationName ? `For ${nationName}` : 'Nation build'}</Chip>;
}

/** The installed version, struck like a plate. */
export function VersionBadge({ version, label = 'Installed', size = 'lg' }: { version: string; label?: string; size?: 'lg' | 'sm' }) {
  const lg = size === 'lg';
  return (
    <span className={`relative inline-flex flex-col items-start rounded-[3px] border ${lg ? 'px-5 py-3.5' : 'px-3 py-1.5'}`}
      style={{ borderColor: hair(0.45), background: 'linear-gradient(160deg, rgba(255,248,230,0.06), rgba(255,248,230,0.01))', boxShadow: `inset 0 1px 0 rgba(255,240,210,0.08)` }}>
      {lg ? <Corners size={8} /> : null}
      <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: CHAMPAGNE }}>{label}</span>
      <span className={`${lg ? 'mt-1 text-[1.9rem]' : 'text-[15px]'} font-mono font-light tabular-nums leading-none tracking-[-0.02em] text-transparent bg-clip-text`}
        style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{version}</span>
    </span>
  );
}

/** A value with a copy button; long hashes are shortened on screen, copied whole. */
export function CopyValue({ value, short = false, label }: { value: string; short?: boolean; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const shown = short && value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <code title={value} className="min-w-0 truncate font-mono text-[11.5px] text-[#f3efe6]/80">{shown}</code>
      <button type="button" aria-label={`Copy ${label ?? 'value'}`}
        onClick={() => { void navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }); }}
        className="inline-grid h-6 w-[52px] shrink-0 place-items-center rounded-full border font-mono text-[9px] uppercase tracking-[0.16em] transition-colors hover:border-[#d9c398]/70 hover:text-[#f4e4bd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]"
        style={{ borderColor: hair(0.25), color: copied ? '#9be7c4' : 'rgba(243,239,230,0.55)' }}>
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </span>
  );
}

export function fmtBytes(n: number): string {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, v = n;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
}
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** Glass panel with registration corners. */
export function Panel({ children, className = '', strong = false, as: Tag = 'div' }: { children: React.ReactNode; className?: string; strong?: boolean; as?: 'div' | 'section' | 'aside' | 'li' }) {
  return (
    <Tag className={`relative rounded-[3px] border ${className}`}
      style={{ borderColor: hair(strong ? 0.35 : 0.14), background: 'linear-gradient(160deg, rgba(255,248,230,0.035), rgba(255,248,230,0.008))' }}>
      {strong ? <Corners size={10} /> : null}
      {children}
    </Tag>
  );
}

/** Artifacts with checksums, signatures and the nation's own download link. */
export function ArtifactTable({ artifacts, channelKey, downloadUrl }: { artifacts: ReleaseArtifact[]; channelKey?: string; downloadUrl?: (key: string, id: string) => string }) {
  if (!artifacts.length) return <p className="text-[13px] font-light text-white/45">Nothing to download for this delivery mode.</p>;
  return (
    <ul className="divide-y" style={{ borderColor: hair(0.1) }}>
      {artifacts.map(a => (
        <li key={a.id} className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto]" style={{ borderColor: hair(0.1) }}>
          <div className="min-w-0">
            <p className="text-[14px] font-light text-[#f3efe6]">{a.label}</p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-white/45" title={a.filename}>{a.filename}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{fmtBytes(a.sizeBytes)}{a.platform ? ` · ${a.platform}` : ''} · {a.signature.method === 'cosign' ? 'cosign' : 'GPG'} signed</p>
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="flex min-w-0 items-center gap-2"><span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/60">SHA-256</span><CopyValue value={a.sha256} short label={`SHA-256 of ${a.filename}`} /></p>
            {a.ref ? <p className="flex min-w-0 items-center gap-2"><span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/60">Ref</span><CopyValue value={a.ref} short label={`reference of ${a.filename}`} /></p> : null}
            <p className="flex min-w-0 items-center gap-2"><span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/60">Signer</span><code className="truncate font-mono text-[11px] text-white/55" title={a.signature.keyFingerprint}>{a.signature.keyFingerprint.slice(-19)}</code></p>
          </div>
          <div className="flex items-start md:justify-end">
            {channelKey && downloadUrl ? (
              <a href={downloadUrl(channelKey, a.id)} download
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[12.5px] text-[#f3efe6]/85 no-underline transition-colors hover:border-[#d9c398]/70 hover:text-[#f4e4bd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]"
                style={{ borderColor: hair(0.3) }}>
                <span aria-hidden>↓</span> Manifest
                <span className="rounded-full px-1.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#17120a]" style={{ background: CHAMPAGNE }}>Placeholder</span>
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Plain-language verification for government IT staff. */
export function VerifyGuide({ publisherKey, compact = false }: { publisherKey: PublisherKey; compact?: boolean }) {
  const steps = [
    { t: 'Check the publisher key', d: 'Obtain the publisher’s public key through a trusted channel (in person or from your contract pack) and compare its fingerprint with the one below. Only trust files signed by this key.', cmd: `gpg --show-keys ${publisherKey.gpgKey}` },
    { t: 'Check each file’s checksum', d: 'The SHA-256 checksum proves the file arrived exactly as published. A single changed byte gives a different checksum.', cmd: 'echo "<sha256>  <file>" | sha256sum --check' },
    { t: 'Check the signature on files', d: 'The detached .asc signature proves the file came from the publisher and was not replaced in transit.', cmd: 'gpg --verify <file>.asc <file>' },
    { t: 'Check container images and charts', d: 'Images and Helm charts are signed with Sigstore cosign and pinned by digest, so the registry cannot swap them.', cmd: `cosign verify --key ${publisherKey.cosignKey} <image>@sha256:<digest>` },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">Publisher signing key</span>
        <CopyValue value={publisherKey.fingerprint} label="publisher key fingerprint" />
        {publisherKey.demo ? <Chip tone="#a5abb5">Demonstration key</Chip> : null}
      </div>
      <ol className={`mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        {steps.map((s, i) => (
          <li key={s.t} className="min-w-0 rounded-[3px] border p-4" style={{ borderColor: hair(0.12) }}>
            <p className="flex items-baseline gap-3"><span className="font-mono text-[10px] tabular-nums" style={{ color: CHAMPAGNE }}>{String(i + 1).padStart(2, '0')}</span><span className="text-[14px] font-light text-[#f3efe6]">{s.t}</span></p>
            <p className="mt-1.5 text-[12.5px] font-light leading-relaxed text-white/50">{s.d}</p>
            <pre className="mt-3 overflow-x-auto rounded-[2px] bg-black/40 px-3 py-2 font-mono text-[11px] text-[#f4e4bd]/85">{s.cmd}</pre>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Remembers who is acting, so every decision carries a name. */
export function useActor(): [string, (v: string) => void] {
  const [actor, setActor] = React.useState('');
  React.useEffect(() => {
    try { setActor(localStorage.getItem('civicos.updates.actor') ?? ''); } catch { /* storage unavailable */ }
    // Every panel on the page shares one name: follow edits made elsewhere.
    const on = (e: Event) => setActor((e as CustomEvent<string>).detail);
    window.addEventListener('civicos-actor', on);
    return () => window.removeEventListener('civicos-actor', on);
  }, []);
  const set = React.useCallback((v: string) => {
    try { localStorage.setItem('civicos.updates.actor', v); } catch { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent('civicos-actor', { detail: v }));
  }, []);
  return [actor, set];
}

/** A nation's private link (?link=) carried through chamber navigation. */
export function useLink(): { link?: string; q: string } {
  const params = useSearchParams();
  const link = params.get('link') ?? undefined;
  return { link, q: link ? `?link=${encodeURIComponent(link)}` : '' };
}

/** Header title: "Update Center — {nation}" once a nation is installed. */
export function useCenterTitle(nationName?: string, home = true): { title: string; nation: string; configured: boolean } {
  const brand = useNationBrand();
  const nation = home ? (brand.configured ? brand.name : '') : (nationName ?? '');
  return { title: nation ? `Update Center — ${nation}` : 'Update Center', nation, configured: brand.configured };
}

type ChamberTab = 'chamber' | 'requests' | 'release' | 'security' | 'hosting' | 'mirror' | 'support' | 'assurance' | 'contract' | 'settings';
const chamberItems = (q: string) => [
  { href: `/updates${q}`, l: 'Chamber', k: 'chamber' },
  { href: `/updates/security${q}`, l: 'Security', k: 'security' },
  { href: `/updates/hosting${q}`, l: 'Hosting', k: 'hosting' },
  { href: `/updates/mirror${q}`, l: 'Mirror', k: 'mirror' },
  { href: `/updates/requests${q}`, l: 'Requests', k: 'requests' },
  { href: `/updates/support${q}`, l: 'Support', k: 'support' },
  { href: `/updates/assurance${q}`, l: 'Assurance', k: 'assurance' },
  { href: `/updates/contract${q}`, l: 'Contract', k: 'contract' },
  { href: `/updates/settings${q}`, l: 'Settings', k: 'settings' },
];

/** Header navigation (from extra-large screens up); smaller screens get ChamberTabs in the page body. */
export function ChamberNav({ q, active }: { q: string; active: ChamberTab }) {
  return (
    <nav aria-label="Update Center" className="hidden items-center gap-4 xl:flex">
      {chamberItems(q).map(i => (
        <Link key={i.k} href={i.href} aria-current={active === i.k ? 'page' : undefined}
          className={`uppercase transition-colors hover:text-[#f4e4bd] ${active === i.k ? 'text-[#f4e4bd]' : ''}`}>{i.l}</Link>
      ))}
    </nav>
  );
}

/** The same navigation as a tab row for phones and tablets. */
export function ChamberTabs({ q, active }: { q: string; active: ChamberTab }) {
  return (
    <nav aria-label="Update Center sections" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 xl:hidden">
      {chamberItems(q).map(i => (
        <Link key={i.k} href={i.href} aria-current={active === i.k ? 'page' : undefined}
          className="shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] no-underline"
          style={{ borderColor: active === i.k ? CHAMPAGNE : hair(0.2), color: active === i.k ? CHAMPAGNE_HI : 'rgba(243,239,230,0.6)' }}>{i.l}</Link>
      ))}
    </nav>
  );
}

export function PoweredBy() {
  return <p className="mt-14 text-center font-mono text-[9.5px] uppercase tracking-[0.3em] text-white/30">Powered by CivicOS</p>;
}

export function ErrorLine({ children }: { children: React.ReactNode }) {
  return children ? <p role="alert" className="text-[13px] font-light text-[#f1938f]">{children}</p> : null;
}

// Reserves a full viewport so the footer stays below the fold until the
// content arrives: no layout shift when it replaces the loader.
export function Loading({ label = 'Opening the update chamber…', minH = '100vh' }: { label?: string; minH?: number | string }) {
  return (
    <div className="grid place-items-center" style={{ minHeight: minH }}>
      <p className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#d9c398]/70">
        <span aria-hidden className="h-px w-10 animate-pulse bg-[#d9c398]/60" />{label}<span aria-hidden className="h-px w-10 animate-pulse bg-[#d9c398]/60" />
      </p>
    </div>
  );
}
