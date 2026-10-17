'use client';

// Local mirror and offline logistics: the nation's registry mirror, what to
// fetch (with deltas), and physical media with its chain of custody.

import * as React from 'react';
import { api } from '@/lib/api/client';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { CustodyStep, MediaShipment, SyncManifest } from '@/lib/api/types';
import { ChamberNav, ChamberTabs, Chip, CopyValue, ErrorLine, Loading, Panel, PoweredBy, fmtBytes, fmtDateTime, useActor, useCenterTitle, useLink } from './ui';

export const CUSTODY: { step: CustodyStep; label: string; who: string }[] = [
  { step: 'sealed', label: 'Sealed', who: 'Publisher' },
  { step: 'handed-over', label: 'Handed over', who: 'Publisher' },
  { step: 'received', label: 'Received', who: 'Nation' },
  { step: 'seal-verified', label: 'Seal verified', who: 'Nation' },
];

export function CustodyChain({ s }: { s: MediaShipment }) {
  return (
    <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CUSTODY.map(c => {
        const e = s.chain.find(x => x.step === c.step);
        const bad = e?.ok === false;
        return (
          <li key={c.step} className="rounded-[2px] border px-3 py-2" style={{ borderColor: bad ? '#f1938f88' : e ? '#9be7c455' : hair(0.12), background: e ? (bad ? 'rgba(241,147,143,0.06)' : 'rgba(155,231,196,0.04)') : 'transparent' }}>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: bad ? '#f1938f' : e ? '#9be7c4' : 'rgba(243,239,230,0.4)' }}>{bad ? 'Seal mismatch' : c.label}</p>
            {e ? (
              <p className="mt-1 text-[12px] font-light text-white/70">{e.by}{e.to ? ` → ${e.to}` : ''}<span className="block font-mono text-[10px] text-white/40">{fmtDateTime(e.at)}{e.sealId ? ` · seal ${e.sealId}` : ''}</span>{e.note ? <span className="block text-[11px] text-white/45">{e.note}</span> : null}</p>
            ) : <p className="mt-1 text-[11.5px] font-light text-white/35">{c.who}</p>}
          </li>
        );
      })}
    </ol>
  );
}

type Data = Awaited<ReturnType<typeof api.updates.mirror>>;

export function MirrorCenter() {
  const { link, q } = useLink();
  const [d, setD] = React.useState<Data | null>(null);
  const [name, setName] = React.useState<string | undefined>();
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api.updates.mirror(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service')); }, [link]);
  React.useEffect(load, [load]);
  React.useEffect(() => { api.updates.chamber(link).then(r => setName(r.chamber.nation.name)).catch(() => undefined); }, [link]);
  const { nation } = useCenterTitle(name, true);
  return (
    <OnboardingFrame right={<ChamberNav q={q} active="mirror" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="mirror" />
        <Eyebrow>Update Center · mirror and offline delivery</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Releases inside {nation ? <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span> : 'your network'}
        </h1>
        <p className="mt-4 max-w-[70ch] text-[15px] font-light leading-relaxed text-white/55">Keep a local mirror of the registry, fetch only what it lacks — as deltas where you already hold the previous release — and receive releases on sealed physical media with a named chain of custody.</p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !d ? <Loading label="Checking your mirror…" /> : d.deliveryMode === 'saas' ? (
          <Panel className="mt-10 px-5 py-4"><p className="text-[14px] font-light text-white/65">Your platform is hosted by the publisher, so releases are applied from the publisher’s registry inside your maintenance windows. No local mirror or media is needed. If you move to your own data centre or another cloud (see Hosting), this page lets you set one up.</p></Panel>
        ) : (
          <>
            <Section n="01" title="Your mirror" aside={d.mirror ? `${d.mirror.kind === 'air-gapped' ? 'Air-gapped' : 'Connected'} · ${d.mirror.mirrored.length} releases held` : 'Not registered'}>
              <MirrorForm d={d} link={link} onDone={load} />
            </Section>
            <Section n="02" title="What to fetch" aside={d.manifest ? `${d.manifest.items.length} files · ${fmtBytes(d.manifest.transferBytes)} to transfer` : undefined}>
              {d.manifest ? <Manifest m={d.manifest} link={link} onDone={load} /> : null}
            </Section>
            <Section n="03" title="Physical media" aside="Sealed · handed over · received · seal verified">
              <Media d={d} link={link} onDone={load} />
            </Section>
          </>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function MirrorForm({ d, link, onDone }: { d: Data; link?: string; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const [url, setUrl] = React.useState(d.mirror?.registryUrl ?? '');
  const [kind, setKind] = React.useState(d.mirror?.kind ?? (d.deliveryMode === 'air-gapped' ? 'air-gapped' : 'connected'));
  const [err, setErr] = React.useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api.updates.mirrorAction({ action: 'register', registryUrl: url, kind, by: actor, link }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not register the mirror'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {d.mirror ? (
        <Panel className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-[13px] font-light text-white/65">
          <span className="min-w-0"><span className="text-white/40">Registry</span> <CopyValue value={d.mirror.registryUrl} label="registry address" /></span>
          <span><span className="text-white/40">Registered</span> {fmtDateTime(d.mirror.registeredAt)} by {d.mirror.registeredBy}</span>
          <span><span className="text-white/40">Last sync</span> {d.mirror.lastSync ? `${fmtDateTime(d.mirror.lastSync.at)} by ${d.mirror.lastSync.by} (${fmtBytes(d.mirror.lastSync.bytes)})` : 'never'}</span>
        </Panel>
      ) : null}
      <form onSubmit={save} className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_180px_auto]">
        <Field label="Your name"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="e.g. Platform operations" /></Field>
        <Field label="Mirror registry address"><input className={inputCls} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://registry.example.gov or oci://…" /></Field>
        <Field label="Network"><Select value={kind} onChange={e => setKind(e.target.value as 'connected' | 'air-gapped')}><option value="connected">Connected</option><option value="air-gapped">Air-gapped</option></Select></Field>
        <button type="submit" className={`${goldBtn} px-4 py-2.5 text-[13px]`} style={goldStyle}>{d.mirror ? 'Update' : 'Register mirror'}</button>
      </form>
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

function Manifest({ m, link, onDone }: { m: SyncManifest; link?: string; onDone: () => void }) {
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  const releases = [...new Map(m.items.map(i => [i.releaseId, i.version])).entries()];
  async function synced(id: string) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.mirrorAction({ action: 'sync', releaseIds: [id], by: actor, link }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not record the sync'); }
  }
  if (!m.items.length) return <p className="text-[13px] font-light text-[#9be7c4]">Your mirror holds every release you can receive.</p>;
  const pct = m.fullBytes ? Math.round((m.savedBytes / m.fullBytes) * 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        <Panel className="px-4 py-3"><p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Full files</p><p className="mt-1 text-[1.6rem] font-extralight text-white/80">{fmtBytes(m.fullBytes)}</p></Panel>
        <Panel className="px-4 py-3"><p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">To transfer</p><p className="mt-1 text-[1.6rem] font-extralight text-[#f3efe6]">{fmtBytes(m.transferBytes)}</p></Panel>
        <Panel className="px-4 py-3"><p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Saved by deltas</p><p className="mt-1 text-[1.6rem] font-extralight text-[#9be7c4]">{fmtBytes(m.savedBytes)} <span className="text-[14px]">({pct}%)</span></p></Panel>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-3 font-normal">Release</th><th className="py-2 pr-3 font-normal">File</th><th className="py-2 pr-3 font-normal">Full</th><th className="py-2 pr-3 font-normal">Fetch</th><th className="py-2 font-normal">Saving</th></tr></thead>
          <tbody>{m.items.map(i => (
            <tr key={i.artifactId} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3 font-mono text-[11.5px] text-[#f4e4bd]">{i.version}</td>
              <td className="py-2 pr-3 font-mono text-[11px] text-white/65">{i.delta ? <>{i.delta.filename}<span className="block text-white/35">delta from {i.delta.from}</span></> : i.filename}</td>
              <td className="py-2 pr-3 font-mono text-[11px] text-white/50">{fmtBytes(i.sizeBytes)}</td>
              <td className="py-2 pr-3 font-mono text-[11px] text-white/75">{fmtBytes(i.delta?.sizeBytes ?? i.sizeBytes)}</td>
              <td className="py-2 font-mono text-[11px] text-[#9be7c4]">{i.delta ? `−${fmtBytes(i.delta.savedBytes)}` : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a href={`/api/releases/mirror?download=1${link ? `&link=${encodeURIComponent(link)}` : ''}`} download className="text-[13px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>Download sync manifest ↓</a>
        <span className="text-[12px] font-light text-white/40">Mark a release once your mirror holds it:</span>
        {releases.map(([id, v]) => <button key={id} type="button" className={`${ghostBtn} py-1.5 text-[12px]`} onClick={() => synced(id)}>{v} synced</button>)}
      </div>
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

function Media({ d, link, onDone }: { d: Data; link?: string; onDone: () => void }) {
  const [actor] = useActor();
  const [seal, setSeal] = React.useState<Record<string, string>>({});
  const [note, setNote] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState<string | null>(null);
  async function step(mediaId: string, s: 'received' | 'seal-verified') {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.mirrorAction({ action: 'custody', mediaId, step: s, by: actor, sealId: seal[mediaId], note: note[mediaId], link }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not record the step'); }
  }
  if (!d.media.length) return <p className="text-[13px] font-light text-white/50">No media has been sent to you. The publisher seals media on request; each step will appear here.</p>;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {d.media.map(s => (
        <Panel key={s.mediaId} strong={s.state === 'handed-over' || s.state === 'received'} className="min-w-0 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-[11.5px] text-[#f4e4bd]">{s.mediaId}</span>
            <span className="min-w-0 flex-1 text-[13.5px] font-light text-white/70">{s.contents.length} files · {fmtBytes(s.contents.reduce((a, c) => a + c.sizeBytes, 0))}</span>
            {s.state === 'seal-broken' ? <Chip tone="#f1938f" solid>Do not use — seal mismatch</Chip> : s.state === 'seal-verified' ? <Chip tone="#9be7c4" solid>Verified · ready to load</Chip> : <Chip tone="#f4d58d">In custody</Chip>}
          </div>
          <CustodyChain s={s} />
          {s.state === 'handed-over' ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input aria-label="How it reached you" className={`${inputCls} min-w-[220px] flex-1 py-2 text-[13px]`} value={note[s.mediaId] ?? ''} onChange={e => setNote({ ...note, [s.mediaId]: e.target.value })} placeholder="How it reached you (if not handed to you in person)" />
              <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => step(s.mediaId, 'received')}>Record receipt</button>
            </div>
          ) : s.state === 'received' ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input aria-label="Seal number as read" className={`${inputCls} w-[220px] py-2 font-mono text-[13px]`} value={seal[s.mediaId] ?? ''} onChange={e => setSeal({ ...seal, [s.mediaId]: e.target.value })} placeholder="Seal number on the media" />
              <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => step(s.mediaId, 'seal-verified')}>Verify seal</button>
              <span className="text-[11.5px] text-white/40">Then verify each file’s checksum and signature before loading.</span>
            </div>
          ) : null}
        </Panel>
      ))}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

// ── Publisher console ─────────────────────────────────────────────────
export function PublisherMedia() {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.publisher.media>> | null>(null);
  const [rel, setRel] = React.useState<{ id: string; version: string; nationId?: string; channel: string; delivery: string[] }[]>([]);
  const [f, setF] = React.useState({ nationId: '', releaseIds: [] as string[], sealId: '' });
  const [to, setTo] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api.updates.publisher.media().then(r => { setD(r); setF(x => ({ ...x, nationId: x.nationId || r.nations[0]?.id || '' })); }).catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
    api.updates.publisher.overview().then(o => setRel(o.overview.releases.map(r => ({ id: r.id, version: r.version, nationId: r.nationId, channel: r.channel, delivery: r.delivery })))).catch(() => undefined);
  }, []);
  React.useEffect(load, [load]);
  if (!d) return <div className="min-h-[160px]"><ErrorLine>{err}</ErrorLine></div>;
  const names = Object.fromEntries(d.nations.map(n => [n.id, n.name]));
  const eligible = rel.filter(r => (r.channel === 'global' || r.nationId === f.nationId));
  async function act(body: Record<string, unknown>) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.mediaAction({ ...body, by: actor } as never); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Action failed'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {d.media.map(s => (
        <Panel key={s.mediaId} className="min-w-0 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-[11.5px] text-[#f4e4bd]">{s.mediaId}</span>
            <span className="text-[12px] text-[#d9c398]/80">{names[s.nationId] ?? s.nationId}</span>
            <span className="min-w-0 flex-1 text-[12.5px] font-light text-white/55">seal {s.sealId} · {s.contents.length} files</span>
            <Chip tone={s.state === 'seal-broken' ? '#f1938f' : s.state === 'seal-verified' ? '#9be7c4' : '#f4d58d'}>{s.state}</Chip>
          </div>
          <CustodyChain s={s} />
          {s.state === 'sealed' ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <input aria-label="Handed to" className={`${inputCls} min-w-[220px] flex-1 py-2 text-[13px]`} value={to[s.mediaId] ?? ''} onChange={e => setTo({ ...to, [s.mediaId]: e.target.value })} placeholder="Handed to (courier or the nation’s official)" />
              <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act({ action: 'hand-over', mediaId: s.mediaId, to: to[s.mediaId] })}>Record hand-over</button>
            </div>
          ) : null}
        </Panel>
      ))}
      {!d.media.length ? <p className="text-[13px] font-light text-white/50">No media shipped.</p> : null}
      {d.nations.length ? (
        <div className="flex flex-wrap items-end gap-3 rounded-[2px] border p-4" style={{ borderColor: hair(0.14) }}>
          <label className="grid gap-1 text-[11.5px] text-white/50">Nation
            <Select value={f.nationId} onChange={e => setF({ ...f, nationId: e.target.value, releaseIds: [] })} className="w-auto py-2 text-[13px]">{d.nations.map(n => <option key={n.id} value={n.id}>{n.name} ({n.deliveryMode})</option>)}</Select>
          </label>
          <div className="grid gap-1 text-[11.5px] text-white/50">Releases
            <div className="flex flex-wrap gap-3 py-2">{eligible.map(r => (
              <label key={r.id} className="flex items-center gap-1.5 font-mono text-[12px] text-white/70"><input type="checkbox" checked={f.releaseIds.includes(r.id)} onChange={e => setF({ ...f, releaseIds: e.target.checked ? [...f.releaseIds, r.id] : f.releaseIds.filter(x => x !== r.id) })} />{r.version}</label>
            ))}</div>
          </div>
          <label className="grid gap-1 text-[11.5px] text-white/50">Seal number
            <input className={`${inputCls} w-[160px] py-2 font-mono text-[13px]`} value={f.sealId} onChange={e => setF({ ...f, sealId: e.target.value })} placeholder="SEAL-…" />
          </label>
          <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => act({ action: 'seal', ...f })}>Write and seal</button>
        </div>
      ) : <p className="text-[12.5px] text-white/45">No self-hosted or air-gapped nations enrolled.</p>}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}
