'use client';

// Public Site Editor (/admin/sites). Officials propose changes to a public
// institution site's content and design; a second, different official
// publishes them (lib/data/site-editorial.ts). Previews open the real site
// with the proposal applied, for signed-in officials only. Every version is
// kept and can be restored through the same review. Translations into the
// nation's languages go through the same review (SiteTranslations).

import * as React from 'react';
import Link from 'next/link';
import { api, type PublicSiteRow, type SiteEditView } from '@/lib/api/client';
import type { SiteChange } from '@/lib/data/site-editorial';
import type { SiteContent } from '@/lib/public-sites/types';
import { SiteTranslations } from './SiteTranslations';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';

type News = { title: string; summary: string; date: string };
type Fig = { value: string; label: string; sub: string };
type Prog = { title: string; body: string };
interface Draft {
  name: string; tagline: string; about: string;
  h1: string; h2: string; subhead: string;
  alertLabel: string; alertText: string;
  news: News[]; figures: Fig[]; programmes: Prog[];
  preset: string;
}

const fromContent = (c: SiteContent, preset: string): Draft => ({
  name: c.institution.name, tagline: c.institution.tagline, about: c.institution.about ?? '',
  h1: c.hero.headline[0], h2: c.hero.headline[1], subhead: c.hero.subhead,
  alertLabel: c.alert?.label ?? '', alertText: c.alert?.text ?? '',
  news: c.news.map(n => ({ title: n.title, summary: n.summary, date: n.date ?? '' })),
  figures: c.statistics.map(s => ({ ...s })),
  programmes: c.initiatives.map(i => ({ ...i })),
  preset,
});

/** Only the groups that differ from the current content go into the proposal. */
function changeOf(c: SiteContent, cur: Draft, d: Draft): SiteChange {
  const content: NonNullable<SiteChange['content']> = {};
  if (d.name !== cur.name || d.tagline !== cur.tagline || d.about !== cur.about) {
    content.institution = { ...c.institution, name: d.name.trim(), tagline: d.tagline.trim(), ...(d.about.trim() ? { about: d.about.trim() } : {}) };
  }
  if (d.h1 !== cur.h1 || d.h2 !== cur.h2 || d.subhead !== cur.subhead) content.hero = { ...c.hero, headline: [d.h1.trim(), d.h2.trim()], subhead: d.subhead.trim() };
  if ((d.alertLabel !== cur.alertLabel || d.alertText !== cur.alertText) && d.alertText.trim()) content.alert = { label: d.alertLabel.trim() || 'NOTICE', text: d.alertText.trim() };
  if (JSON.stringify(d.news) !== JSON.stringify(cur.news)) {
    content.news = d.news.filter(n => n.title.trim()).map(n => ({ title: n.title.trim(), summary: n.summary.trim(), ...(n.date.trim() ? { date: n.date.trim() } : {}) }));
    content.newsSource = 'nation';
  }
  if (JSON.stringify(d.figures) !== JSON.stringify(cur.figures)) {
    content.statistics = d.figures.filter(f => f.label.trim()).map(f => ({ value: f.value.trim(), label: f.label.trim(), sub: f.sub.trim() }));
    content.statisticsSource = 'nation';
  }
  if (JSON.stringify(d.programmes) !== JSON.stringify(cur.programmes)) content.initiatives = d.programmes.filter(p => p.title.trim()).map(p => ({ title: p.title.trim(), body: p.body.trim() }));
  return { ...(Object.keys(content).length ? { content } : {}), ...(d.preset !== cur.preset ? { preset: d.preset } : {}) };
}

const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '');

export function SiteEditor() {
  const [sites, setSites] = React.useState<PublicSiteRow[]>([]);
  const [siteId, setSiteId] = React.useState<string>('');
  const [view, setView] = React.useState<SiteEditView | null>(null);
  const [cur, setCur] = React.useState<Draft | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [by, setBy] = React.useState('');
  const [note, setNote] = React.useState('');
  const [reason, setReason] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const loadSites = React.useCallback(() => api.publicSites.list().then(r => { setSites(r.sites); setSiteId(id => id || (new URLSearchParams(window.location.search).get('site') ?? r.sites[0]?.siteId ?? '')); }), []);
  const loadSite = React.useCallback((id: string) => api.publicSites.editorial(id).then(v => {
    const d = fromContent(v.content, v.settings.preset ?? v.defaultPreset);
    setView(v); setCur(d); setDraft(d);
  }), []);
  React.useEffect(() => { void loadSites(); }, [loadSites]);
  React.useEffect(() => { if (siteId) void loadSite(siteId); }, [siteId, loadSite]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: label }); await Promise.all([loadSite(siteId), loadSites()]); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed' }); }
    finally { setBusy(false); }
  }

  const site = sites.find(s => s.siteId === siteId);
  const change = view && cur && draft ? changeOf(view.content, cur, draft) : {};
  const changed = Object.keys(change).length > 0;
  const pending = view?.editorial.proposals.filter(p => p.status === 'pending') ?? [];
  const decided = view?.editorial.proposals.filter(p => p.status !== 'pending').slice(0, 8) ?? [];
  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));
  const feedOwnsNews = view && view.settings.mode !== 'host' && view.settings.feed.items.length > 0;

  return (
    <OnboardingFrame right={<Link href="/sitemap" className="text-[12px] text-white/50 hover:text-[#f4e4bd]">All public sites ↗</Link>}>
      <div className="py-10">
        <Eyebrow>Public websites</Eyebrow>
        <h1 className="mt-3 text-[34px] font-extralight tracking-tight text-[#f3efe6]">Site editor</h1>
        <p className="mt-2 max-w-3xl text-[14px] font-light leading-relaxed text-white/55">
          Propose changes to a site&apos;s content or design. A second, different official publishes them; every step is written to the
          audit chain and every published version can be restored through the same review.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Field label="Your name (official)" hint="Recorded with every proposal and decision">
            <input className={inputCls} value={by} onChange={e => setBy(e.currentTarget.value)} placeholder="e.g. Director of Communications" />
          </Field>
          {msg ? <p className="self-end pb-3 text-[13px]" style={{ color: msg.ok ? CHAMPAGNE_HI : '#f1938f' }} role="status">{msg.text}</p> : null}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sites */}
          <nav aria-label="Public sites" className="space-y-1.5">
            {sites.map(s => (
              <button key={s.siteId} type="button" onClick={() => setSiteId(s.siteId)} aria-current={s.siteId === siteId ? 'page' : undefined}
                className="block w-full rounded-[3px] border px-3 py-2 text-left transition-colors"
                style={{ borderColor: s.siteId === siteId ? hair(0.5) : hair(0.1), background: s.siteId === siteId ? hair(0.08) : 'transparent' }}>
                <span className="block truncate text-[13.5px] font-light text-[#f3efe6]">{s.name}</span>
                <span className="mt-0.5 block font-mono text-[9.5px] tracking-[0.08em] text-white/40">/{s.siteId} · {s.mode}</span>
              </button>
            ))}
          </nav>

          {view && draft && cur && site ? (
            <div className="min-w-0 space-y-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-[22px] font-light text-[#f3efe6]">{site.name}</div>
                  <div className="mt-1 font-mono text-[10.5px] tracking-[0.06em] text-white/45">
                    {view.editorial.version === 0 ? 'Reference content (nothing published by the nation yet)' : `Version ${view.editorial.version} · published ${when(view.editorial.published?.at)} by ${view.editorial.published?.publishedBy}`}
                    {' · '}{view.settings.mode}{view.settings.website ? ` · ${view.settings.website}` : ''}
                  </div>
                </div>
                <Link href={`/${siteId}`} target="_blank" className={`${ghostBtn} py-2`}>View site ↗</Link>
              </div>

              <Section n="1" title="Name and opening">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Institution name"><input className={inputCls} value={draft.name} onChange={e => set({ name: e.currentTarget.value })} /></Field>
                  <Field label="Tagline"><input className={inputCls} value={draft.tagline} onChange={e => set({ tagline: e.currentTarget.value })} /></Field>
                  <Field label="About (footer)"><input className={inputCls} value={draft.about} onChange={e => set({ about: e.currentTarget.value })} placeholder="One sentence about the institution" /></Field>
                  <Field label="Design" hint={view.presets.find(p => p.id === draft.preset)?.description}>
                    <Select value={draft.preset} onChange={e => set({ preset: e.currentTarget.value })}>
                      {view.presets.map(p => <option key={p.id} value={p.id}>{p.label}{p.id === view.defaultPreset ? ' (default)' : ''}</option>)}
                    </Select>
                  </Field>
                  <Field label="Headline, first line"><input className={inputCls} value={draft.h1} onChange={e => set({ h1: e.currentTarget.value })} /></Field>
                  <Field label="Headline, second line"><input className={inputCls} value={draft.h2} onChange={e => set({ h2: e.currentTarget.value })} /></Field>
                </div>
                <div className="mt-4"><Field label="Subheading"><textarea rows={2} className={`${inputCls} resize-y`} value={draft.subhead} onChange={e => set({ subhead: e.currentTarget.value })} /></Field></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                  <Field label="Notice label"><input className={inputCls} value={draft.alertLabel} onChange={e => set({ alertLabel: e.currentTarget.value })} placeholder="PUBLIC ADVISORY" /></Field>
                  <Field label="Notice text"><input className={inputCls} value={draft.alertText} onChange={e => set({ alertText: e.currentTarget.value })} /></Field>
                </div>
              </Section>

              <Section n="2" title="News" aside={<span className="font-mono tracking-[0.12em]">{view.content.newsSource === 'sample' ? 'SAMPLE' : view.content.newsSource.toUpperCase()}</span>}>
                {feedOwnsNews ? <p className="mb-3 text-[12.5px] text-white/50">The news on the site comes from {view.settings.website} while its feed has items ({view.settings.mode} mode); what you publish here shows when the feed is empty or the site is hosted here.</p> : null}
                <ListEditor name="News" items={draft.news} empty={{ title: '', summary: '', date: '' }} onChange={news => set({ news })}
                  cols={[{ k: 'title', label: 'Title', w: '1.3fr' }, { k: 'summary', label: 'Summary', w: '1.6fr' }, { k: 'date', label: 'Date', w: '130px' }]} />
              </Section>

              <Section n="3" title="Figures" aside={<span className="font-mono tracking-[0.12em]">{view.content.statisticsSource === 'sample' ? 'SAMPLE' : 'PUBLISHED'}</span>}>
                <ListEditor name="Figure" items={draft.figures} empty={{ value: '', label: '', sub: '' }} onChange={figures => set({ figures })}
                  cols={[{ k: 'value', label: 'Value', w: '120px' }, { k: 'label', label: 'Label', w: '1fr' }, { k: 'sub', label: 'Detail', w: '1fr' }]} />
              </Section>

              <Section n="4" title="Programmes">
                <ListEditor name="Programme" items={draft.programmes} empty={{ title: '', body: '' }} onChange={programmes => set({ programmes })}
                  cols={[{ k: 'title', label: 'Title', w: '1fr' }, { k: 'body', label: 'Description', w: '2fr' }]} />
              </Section>

              <Section n="5" title="Propose">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <input className={inputCls} value={note} onChange={e => setNote(e.currentTarget.value)} placeholder="Note for the reviewer (why this change)" aria-label="Note for the reviewer" />
                  <button type="button" className={`${ghostBtn} py-2.5`} onClick={() => setDraft(cur)} disabled={!changed || busy}>Discard</button>
                  <button type="button" className={`${goldBtn} py-2.5`} style={goldStyle} disabled={!changed || !by.trim() || busy}
                    onClick={() => act('Proposed for review', () => api.publicSites.propose(siteId, { change, note, by }).then(() => setNote('')))}>
                    Propose for review
                  </button>
                </div>
                {changed ? <p className="mt-2 font-mono text-[10.5px] text-white/45">Changes: {[...Object.keys(change.content ?? {}), ...(change.preset !== undefined ? ['design'] : [])].join(', ')}</p> : null}
              </Section>

              <Section n="6" title="Awaiting review" aside={<span className="font-mono tracking-[0.12em]">{pending.length} PENDING</span>}>
                {pending.length === 0 ? <p className="text-[13px] text-white/45">Nothing waiting.</p> : (
                  <ul className="space-y-3">
                    {pending.map(p => (
                      <li key={p.id} className="rounded-[3px] border px-4 py-3" style={{ borderColor: hair(0.25) }}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[14px] text-[#f3efe6]">{p.summary.join(', ')}</span>
                          <span className="font-mono text-[10px] text-white/45">{p.id} · proposed by {p.proposedBy} · {when(p.proposedAt)}</span>
                        </div>
                        {p.note ? <p className="mt-1 text-[12.5px] text-white/55">{p.note}</p> : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Link href={`/${siteId}?preview=${p.id}`} target="_blank" className={`${ghostBtn} py-1.5`}>Preview ↗</Link>
                          <button type="button" className={`${goldBtn} py-1.5`} style={goldStyle} disabled={!by.trim() || busy}
                            onClick={() => act(`Version published`, () => api.publicSites.decide(siteId, p.id, { action: 'publish', by }))}>Publish</button>
                          <input className={`${inputCls} max-w-[260px] py-1.5`} placeholder="Reason to reject" aria-label="Reason to reject" value={reason[p.id] ?? ''} onChange={e => { const v = e.currentTarget.value; setReason(r => ({ ...r, [p.id]: v })); }} />
                          <button type="button" className={`${ghostBtn} py-1.5`} disabled={!by.trim() || busy}
                            onClick={() => act('Rejected', () => api.publicSites.decide(siteId, p.id, { action: 'reject', by, reason: reason[p.id] ?? '' }))}>Reject</button>
                          <button type="button" className="text-[12px] text-white/45 underline-offset-4 hover:text-[#f4e4bd] hover:underline" disabled={!by.trim() || busy}
                            onClick={() => act('Withdrawn', () => api.publicSites.decide(siteId, p.id, { action: 'withdraw', by }))}>Withdraw</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section n="7" title="Published versions">
                <ul className="space-y-2">
                  {view.editorial.versions.map(v => (
                    <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: hair(0.1) }}>
                      <span className="text-[13px] text-white/75">Version {v.version} · {when(v.at)} · proposed by {v.proposedBy}, published by {v.publishedBy}{v.note ? ` · ${v.note}` : ''}</span>
                      {v.version !== view.editorial.version ? (
                        <button type="button" className="text-[12px] underline-offset-4 hover:underline" style={{ color: CHAMPAGNE }} disabled={!by.trim() || busy}
                          onClick={() => act(`Restore of version ${v.version} proposed`, () => api.publicSites.propose(siteId, { restore: v.version, by }))}>Propose restoring</button>
                      ) : <span className="font-mono text-[10px]" style={{ color: CHAMPAGNE }}>CURRENT</span>}
                    </li>
                  ))}
                  <li className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] text-white/55">Version 0 · the platform&apos;s reference content</span>
                    {view.editorial.version !== 0 ? (
                      <button type="button" className="text-[12px] underline-offset-4 hover:underline" style={{ color: CHAMPAGNE }} disabled={!by.trim() || busy}
                        onClick={() => act('Restore of the reference content proposed', () => api.publicSites.propose(siteId, { restore: 0, by }))}>Propose restoring</button>
                    ) : <span className="font-mono text-[10px]" style={{ color: CHAMPAGNE }}>CURRENT</span>}
                  </li>
                </ul>
                {decided.length ? (
                  <div className="mt-5">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-white/40">DECIDED</div>
                    <ul className="mt-2 space-y-1">
                      {decided.map(p => <li key={p.id} className="text-[12px] text-white/50">{p.id} · {p.summary.join(', ')} · {p.status} by {p.decidedBy}{p.reason ? ` — ${p.reason}` : ''}</li>)}
                    </ul>
                  </div>
                ) : null}
              </Section>

              <SiteTranslations n="8" siteId={siteId} view={view} by={by} busy={busy} act={act} />
            </div>
          ) : <p className="text-[13px] text-white/45">Loading…</p>}
        </div>
      </div>
    </OnboardingFrame>
  );
}

/** Rows of text fields with add and remove. */
function ListEditor<T extends Record<string, string>>({ name, items, empty, cols, onChange }: {
  /** What one row is, for labels read by screen readers ("News", "Figure"). */
  name: string;
  items: T[]; empty: T; cols: { k: keyof T & string; label: string; w: string }[]; onChange: (items: T[]) => void;
}) {
  const grid = { gridTemplateColumns: `${cols.map(c => c.w).join(' ')} 32px` };
  return (
    <div className="space-y-2">
      <div className="hidden gap-2 font-mono text-[9.5px] tracking-[0.1em] text-white/40 sm:grid" style={grid}>
        {cols.map(c => <span key={c.k}>{c.label.toUpperCase()}</span>)}<span />
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 sm:grid" style={grid}>
          {cols.map(c => (
            <input key={c.k} className={`${inputCls} py-2`} aria-label={`${name} ${c.label.toLowerCase()} ${i + 1}`} value={it[c.k]}
              onChange={e => { const v = e.currentTarget.value; onChange(items.map((x, j) => (j === i ? { ...x, [c.k]: v } : x))); }} />
          ))}
          <button type="button" aria-label={`Remove ${name.toLowerCase()} ${i + 1}`} className="text-white/40 hover:text-[#f1938f]" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="text-[12px] underline-offset-4 hover:underline" style={{ color: CHAMPAGNE }} onClick={() => onChange([...items, { ...empty }])}>+ Add {name.toLowerCase()}</button>
    </div>
  );
}
