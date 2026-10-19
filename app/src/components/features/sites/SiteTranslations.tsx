'use client';

// Translating a public site (part of the Site Editor, /admin/sites). Officials
// translate the site's text string by string, or download it as XLIFF 2.0 for
// a translation tool and upload the translated file back. Either way the
// translation is a proposal that a second official publishes, like any other
// change (lib/data/site-editorial.ts). A string's translation applies only
// while the English it was made from is unchanged; a site is published right
// to left only once every string is translated into a right-to-left language.

import * as React from 'react';
import Link from 'next/link';
import { api, type SiteEditView, type SiteTranslationString } from '@/lib/api/client';
import type { Coverage, TranslationEntries } from '@/lib/public-sites/translation';
import { Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';

const STATUS: Record<SiteTranslationString['status'], { label: string; color: string }> = {
  translated: { label: 'TRANSLATED', color: CHAMPAGNE },
  stale: { label: 'OUT OF DATE', color: '#f1b26f' },
  missing: { label: 'TO TRANSLATE', color: 'rgba(255,255,255,0.4)' },
};

export function SiteTranslations({ n, siteId, view, by, busy, act }: {
  n: string;
  siteId: string;
  view: SiteEditView;
  by: string;
  busy: boolean;
  /** Run an action with the editor's busy state and message, then reload. */
  act: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [locale, setLocale] = React.useState(view.nationLocale !== 'en' ? view.nationLocale : view.languages[0]?.code ?? '');
  const [strings, setStrings] = React.useState<SiteTranslationString[]>([]);
  const [cov, setCov] = React.useState<Coverage | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [onlyTodo, setOnlyTodo] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [upload, setUpload] = React.useState<{ ok: boolean; text: string; skipped?: { id: string; reason: string }[] } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(() => {
    if (!locale) return;
    void api.publicSites.translations(siteId, locale).then(r => {
      setStrings(r.strings); setCov(r.coverage);
      // Out-of-date translations start from the old wording, for the translator to revise.
      setDraft(Object.fromEntries(r.strings.map(s => [s.path, s.target])));
    }).catch(() => { setStrings([]); setCov(null); });
  }, [siteId, locale]);
  // Reload after every published version: the English or the translation may have changed.
  React.useEffect(() => { setUpload(null); load(); }, [load, view.editorial.version]);

  const lang = view.languages.find(l => l.code === locale);
  const byPath = new Map(strings.map(s => [s.path, s]));
  // What goes into the proposal: strings whose wording differs from what is published
  // (an out-of-date translation counts once the translator has revised it).
  const entries: TranslationEntries = {};
  for (const [path, target] of Object.entries(draft)) {
    const s = byPath.get(path);
    if (s && target.trim() !== s.target.trim()) entries[path] = { source: s.source, target: target.trim() };
  }
  const count = Object.keys(entries).length;
  const shown = onlyTodo ? strings.filter(s => s.status !== 'translated' || entries[s.path]) : strings;
  const isNation = locale === view.nationLocale;

  async function onFile(file: File) {
    setUpload(null);
    try {
      const r = await api.publicSites.importXliff(siteId, locale, await file.text());
      setDraft(d => ({ ...d, ...Object.fromEntries(Object.entries(r.entries).map(([p, e]) => [p, e.target])) }));
      setUpload({ ok: true, text: `${r.imported} strings read from ${file.name}${r.skipped.length ? `; ${r.skipped.length} left out` : ''}. Review them below, then propose.`, skipped: r.skipped });
    } catch (e) {
      setUpload({ ok: false, text: e instanceof Error ? e.message : 'The file could not be read' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Section n={n} title="Translation" aside={cov ? <span className="font-mono tracking-[0.12em]">{cov.translated}/{cov.total} · {locale.toUpperCase()}</span> : null}>
      <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
        <Field label="Language" hint={isNation ? 'The nation’s language: the public site shows this translation' : 'Not the nation’s language: prepared, not shown yet'}>
          <Select value={locale} onChange={e => setLocale(e.currentTarget.value)}>
            {view.languages.map(l => <option key={l.code} value={l.code}>{l.name} ({l.code}){l.code === view.nationLocale ? ' · nation' : ''}</option>)}
          </Select>
        </Field>
        <div className="self-end pb-1 text-[12.5px] leading-relaxed text-white/55">
          {cov ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: hair(0.12) }} aria-hidden>
                <div className="h-full" style={{ width: `${cov.total ? (cov.translated / cov.total) * 100 : 0}%`, background: CHAMPAGNE }} />
              </div>
              <p className="mt-2">
                {cov.translated} of {cov.total} strings translated
                {cov.stale.length ? ` · ${cov.stale.length} out of date (the English changed)` : ''}
                {cov.missing.length ? ` · ${cov.missing.length} to translate` : ''}.
                {' '}{lang?.dir === 'rtl'
                  ? (cov.complete ? 'Complete: the site reads right to left.' : 'The site turns right to left once every string is translated; until then untranslated text shows in English, left to right.')
                  : 'Untranslated text shows in English.'}
                {isNation ? <> Shown now: <span className="font-mono">lang=&quot;{view.language.lang}&quot; dir=&quot;{view.language.dir}&quot;</span>.</> : null}
              </p>
            </>
          ) : 'Loading…'}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a href={api.publicSites.xliffUrl(siteId, locale)} className={`${ghostBtn} py-2`} download>Download XLIFF</a>
        <label className={`${ghostBtn} cursor-pointer py-2`}>
          Upload translated XLIFF
          <input ref={fileRef} type="file" accept=".xlf,.xliff,application/xliff+xml,text/xml" className="sr-only"
            onChange={e => { const f = e.currentTarget.files?.[0]; if (f) void onFile(f); }} />
        </label>
        <label className="ms-auto flex items-center gap-2 text-[12px] text-white/55">
          <input type="checkbox" checked={onlyTodo} onChange={e => setOnlyTodo(e.currentTarget.checked)} /> Only what needs translating
        </label>
      </div>
      <p className="mt-2 text-[11.5px] text-white/40">XLIFF 2.0 opens in translation tools (memoQ, Trados, Phrase, OmegaT, Weblate). Keep every {'{placeholder}'} unchanged.</p>
      {upload ? (
        <div className="mt-3 text-[12.5px]" role="status" style={{ color: upload.ok ? CHAMPAGNE_HI : '#f1938f' }}>
          {upload.text}
          {upload.skipped?.length ? (
            <ul className="mt-1 space-y-0.5 text-white/50">
              {upload.skipped.slice(0, 12).map(s => <li key={s.id}><span className="font-mono">{byPath.get(s.id)?.label ?? s.id}</span> — {s.reason}</li>)}
              {upload.skipped.length > 12 ? <li>and {upload.skipped.length - 12} more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {shown.map(s => {
          const st = entries[s.path] ? { label: 'EDITED', color: CHAMPAGNE_HI } : STATUS[s.status];
          return (
            <div key={s.path} className="grid gap-2 border-b pb-3 sm:grid-cols-2" style={{ borderColor: hair(0.08) }}>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 font-mono text-[9.5px] tracking-[0.08em]">
                  <span className="text-white/40">{s.label.toUpperCase()}</span>
                  <span style={{ color: st.color }}>{st.label}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-white/80">{s.source}</p>
                {s.previousSource ? <p className="mt-1 text-[11.5px] text-white/40">Translated from: <span className="line-through">{s.previousSource}</span></p> : null}
              </div>
              <textarea rows={s.source.length > 90 ? 3 : 1} className={`${inputCls} resize-y py-2`} lang={locale} dir={lang?.dir ?? 'ltr'}
                aria-label={`${s.label}, ${lang?.name ?? locale}`} value={draft[s.path] ?? ''}
                onChange={e => { const v = e.currentTarget.value; setDraft(d => ({ ...d, [s.path]: v })); }} />
            </div>
          );
        })}
        {cov && shown.length === 0 ? <p className="text-[13px] text-white/45">Everything is translated.</p> : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input className={inputCls} value={note} onChange={e => setNote(e.currentTarget.value)} placeholder="Note for the reviewer (who translated, which tool)" aria-label="Note for the reviewer of the translation" />
        <button type="button" className={`${ghostBtn} py-2.5`} disabled={count === 0 || busy} onClick={() => { setUpload(null); load(); }}>Discard</button>
        <button type="button" className={`${goldBtn} py-2.5`} style={goldStyle} disabled={count === 0 || !by.trim() || busy}
          onClick={() => act(`Translation proposed (${count} strings)`, () => api.publicSites.propose(siteId, { change: { translation: { locale, entries } }, note, by }).then(() => { setNote(''); setUpload(null); load(); }))}>
          Propose translation{count ? ` (${count})` : ''}
        </button>
      </div>
      {isNation ? <p className="mt-2 text-[11.5px] text-white/40">After publishing, see it on <Link href={`/${siteId}`} target="_blank" className="underline-offset-2 hover:underline" style={{ color: CHAMPAGNE }}>the site ↗</Link>; a pending translation can be previewed from Awaiting review.</p> : null}
    </Section>
  );
}
