'use client';

// Capture a site in the field on a phone (/gov/sites/capture): choose the
// institution (remembered on this phone), the kind of site and its name, then
// capture the position from the phone's own location, waiting until it is
// good to 15 m or the official accepts the reading. A photo's location can be
// used instead. Without a connection the capture is kept on this phone and
// sent when it is back online (or on "Send now"); each kept capture shows its
// state, and refusals stay listed until dismissed. Everything goes only to
// this platform's own API (/api/org/ministries/{id}/facilities, field: true).

import * as React from 'react';
import Link from 'next/link';
import { ActingOfficial } from '@/components/ui/ActingOfficial';
import { useOfficial } from '@/lib/official';
import { readPhotoPosition } from '@/lib/geo/exif-gps';
import { LOCATION_BLOCKED, OfflineError, callApi, locationAllowed, type Category, type Institution, type LocationCheck, type Vocabulary } from './shared';

const QUEUE_KEY = 'civicos.sites.capture.queue';
const INST_KEY = 'civicos.sites.capture.ministry';
const VOCAB_KEY = 'civicos.sites.capture.vocabulary';
const GOOD_ENOUGH_M = 15;

interface Reading { lat: number; lng: number; accuracyM: number; at: string; method: 'device-gps' | 'photo-geotag' }
interface Body { name: string; category: string; lng: number; lat: number; accuracyM?: number; method: 'device-gps' | 'photo-geotag'; capturedAt?: string; note?: string; field: true; confirmDuplicate?: boolean; by?: string }
interface Queued { qid: string; ministryId: string; ministryName: string; body: Body; savedAt: string; state: 'waiting' | 'sending' | 'sent' | 'refused'; error?: string; siteId?: string; duplicate?: boolean }

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function write(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable or full */ }
}

const big = 'focus-ring min-h-12 w-full rounded-[4px] border border-line bg-surface px-3 py-3 text-[16px] text-ink';
const action = 'focus-ring min-h-12 w-full rounded-[4px] border px-4 py-3 text-[16px] font-semibold disabled:opacity-50';
const primary = `${action} border-ink bg-ink text-bg`;
const secondary = `${action} border-line text-ink hover:bg-surface-2`;

export function FieldCapture({ initialMinistry }: { initialMinistry?: string }) {
  const [official, setOfficial] = useOfficial();
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [accepts, setAccepts] = React.useState<string[]>(['device-gps', 'photo-geotag']);
  const [inst, setInst] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [name, setName] = React.useState('');
  const [note, setNote] = React.useState('');
  const [reading, setReading] = React.useState<Reading | null>(null);
  const [live, setLive] = React.useState<{ accuracyM: number } | null>(null);
  const [watching, setWatching] = React.useState(false);
  const [geoErr, setGeoErr] = React.useState('');
  const [photo, setPhoto] = React.useState<Reading | null>(null);
  const [photoNote, setPhotoNote] = React.useState('');
  const [queue, setQueue] = React.useState<Queued[]>([]);
  const [online, setOnline] = React.useState(true);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const watchId = React.useRef<number | null>(null);
  const best = React.useRef<Reading | null>(null);
  const flushing = React.useRef(false);

  // What this phone knows: the institutions and kinds of site (kept for offline use), the chosen institution, the kept captures.
  React.useEffect(() => {
    const cached = read<{ institutions: Institution[]; categories: Category[]; methods: string[] } | null>(VOCAB_KEY, null);
    if (cached) { setInstitutions(cached.institutions); setCategories(cached.categories); setAccepts(cached.methods); }
    setQueue(read<Queued[]>(QUEUE_KEY, []).map(q => (q.state === 'sending' ? { ...q, state: 'waiting' } : q)));
    setInst(initialMinistry || read<string>(INST_KEY, ''));
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    void Promise.all([
      callApi<{ ministries: Institution[] }>('/api/org/ministries'),
      callApi<Vocabulary>('/api/facilities?state=published&category=__none__'),
    ]).then(([m, v]) => {
      const insts = m.ministries.filter(x => x.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(x => ({ id: x.id, name: x.name, status: x.status }));
      const cats = v.categories.filter(c => c.rule.level !== 'confidential');
      setInstitutions(insts); setCategories(cats); setAccepts(v.policy.methods);
      write(VOCAB_KEY, { institutions: insts, categories: cats, methods: v.policy.methods });
    }).catch(() => { /* offline: the kept lists are used */ });
  }, [initialMinistry]);
  React.useEffect(() => { if (inst) write(INST_KEY, inst); }, [inst]);
  const saveQueue = React.useCallback((next: Queued[]) => { setQueue(next); write(QUEUE_KEY, next); }, []);

  const stopWatch = React.useCallback(() => {
    if (watchId.current != null && typeof navigator !== 'undefined' && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null; setWatching(false);
  }, []);
  React.useEffect(() => stopWatch, [stopWatch]);

  function capture() {
    setGeoErr(''); setReading(null); best.current = null; setLive(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoErr('This phone\'s browser cannot give its location.'); return; }
    if (!locationAllowed()) { setGeoErr(LOCATION_BLOCKED); return; }
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      p => {
        const r: Reading = { lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6, accuracyM: Math.round(p.coords.accuracy), at: new Date(p.timestamp).toISOString(), method: 'device-gps' };
        if (!best.current || r.accuracyM <= best.current.accuracyM) best.current = r;
        setLive({ accuracyM: r.accuracyM });
        if (r.accuracyM <= GOOD_ENOUGH_M) { setReading(best.current); stopWatch(); }
      },
      e => { stopWatch(); setGeoErr(!locationAllowed() ? LOCATION_BLOCKED : e.code === 1 ? 'Location permission was refused. Allow location for this site in the phone\'s settings.' : 'The location could not be found. Stand outside, away from buildings, and try again.'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 60_000 },
    );
  }
  function acceptReading() { if (best.current) setReading(best.current); stopWatch(); }

  async function onPhoto(file: File | undefined) {
    setPhoto(null); setPhotoNote('');
    if (!file) return;
    if (file.size > 40_000_000) { setPhotoNote('The photo is larger than 40 MB.'); return; }
    const p = readPhotoPosition(await file.arrayBuffer());
    if (!p) { setPhotoNote('This photo carries no location. Turn on location for the camera, or capture the position above.'); return; }
    setPhoto({ lat: p.lat, lng: p.lng, accuracyM: p.accuracyM ?? 15, at: p.takenAt ?? new Date().toISOString(), method: 'photo-geotag' });
    setPhotoNote(`The photo was taken at ${p.lat}, ${p.lng}${p.accuracyM ? ` (within ${p.accuracyM} m)` : ''}.`);
  }

  /** Send one capture; a network failure throws OfflineError, a refusal comes back as the server's words. */
  async function send(ministryId: string, body: Body): Promise<{ ok: true; id: string; region?: string } | { ok: false; error: string; duplicate: boolean }> {
    try {
      const r = await callApi<{ facility: { id: string; place: { region?: string } } }>(`/api/org/ministries/${encodeURIComponent(ministryId)}/facilities`, { ...body, by: official || body.by });
      return { ok: true, id: r.facility.id, region: r.facility.place.region };
    } catch (e) {
      if (e instanceof OfflineError) throw e;
      const check = (e as Error & { body?: { check?: LocationCheck } }).body?.check;
      return { ok: false, error: (e as Error).message, duplicate: !!check?.duplicates.length };
    }
  }

  const flush = React.useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let q = read<Queued[]>(QUEUE_KEY, []);
      for (const item of q.filter(x => x.state === 'waiting')) {
        q = q.map(x => (x.qid === item.qid ? { ...x, state: 'sending' } : x)); saveQueue(q);
        let next: Queued;
        try {
          const r = await send(item.ministryId, item.body);
          next = r.ok ? { ...item, state: 'sent', siteId: r.id, error: undefined } : { ...item, state: 'refused', error: r.error, duplicate: r.duplicate };
        } catch {
          q = q.map(x => (x.qid === item.qid ? { ...x, state: 'waiting' } : x)); saveQueue(q);
          setOnline(false);
          break;
        }
        q = q.map(x => (x.qid === item.qid ? next : x)); saveQueue(q);
      }
    } finally { flushing.current = false; }
  }, [saveQueue, official]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const on = () => { setOnline(true); void flush(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    if (navigator.onLine && read<Queued[]>(QUEUE_KEY, []).some(x => x.state === 'waiting')) void flush();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [flush]);

  const position = reading;
  const instName = institutions.find(m => m.id === inst)?.name ?? inst;
  const ready = !!(inst && category && name.trim() && position && official);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!official) { setMsg({ ok: false, text: 'Sign in or give your name first: every site is recorded under a person.' }); return; }
    if (!position || !inst) return;
    const body: Body = { name: name.trim(), category, lng: position.lng, lat: position.lat, accuracyM: position.accuracyM, method: position.method, capturedAt: position.at, note: note.trim() || undefined, field: true, by: official };
    const keep = () => {
      saveQueue([...read<Queued[]>(QUEUE_KEY, []), { qid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ministryId: inst, ministryName: instName, body, savedAt: new Date().toISOString(), state: 'waiting' }]);
      setMsg({ ok: true, text: `Saved on this phone — will send when online: ${body.name}.` });
      reset();
    };
    setMsg(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) { keep(); return; }
    setBusy(true);
    try {
      const r = await send(inst, body);
      if (r.ok) { setMsg({ ok: true, text: `Recorded: ${body.name} (${r.id})${r.region ? ` in ${r.region}` : ''}. Another official publishes it.` }); reset(); }
      else setMsg({ ok: false, text: r.error });
    } catch { setOnline(false); keep(); }
    finally { setBusy(false); }
  }
  function reset() { setName(''); setNote(''); setReading(null); setPhoto(null); setPhotoNote(''); setLive(null); best.current = null; }

  const waiting = queue.filter(q => q.state === 'waiting' || q.state === 'sending').length;
  const deviceOk = accepts.includes('device-gps'), photoOk = accepts.includes('photo-geotag');

  return (
    <div className="mx-auto w-full max-w-md space-y-5 text-[16px] text-ink">
      <header className="space-y-2">
        <h2 className="text-[22px] font-semibold tracking-tight">Capture a site</h2>
        <p className="text-[14px] text-ink-soft">Stand at the site&rsquo;s entrance. The phone records where it is; another official publishes it.</p>
        <p className={`text-[14px] ${online ? 'text-ok' : 'text-warn'}`} role="status">{online ? 'Online' : 'Offline: captures are kept on this phone'}{waiting ? ` · ${waiting} waiting to send` : ''}</p>
        <ActingOfficial name={official} onChange={setOfficial} label="Your name" />
      </header>

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-[14px] text-ink-soft">Institution
          <select className={`${big} mt-1`} value={inst} onChange={e => setInst(e.currentTarget.value)} required>
            <option value="">Choose your institution</option>
            {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            {inst && !institutions.some(m => m.id === inst) ? <option value={inst}>{inst}</option> : null}
          </select>
        </label>
        <label className="block text-[14px] text-ink-soft">What kind of site
          <select className={`${big} mt-1`} value={category} onChange={e => setCategory(e.currentTarget.value)} required>
            <option value="">Choose</option>
            {categories.map(c => <option key={c.key} value={c.key}>{c.glyph} {c.label}</option>)}
          </select>
        </label>
        <label className="block text-[14px] text-ink-soft">Name of the site
          <input className={`${big} mt-1`} value={name} onChange={e => setName(e.currentTarget.value)} required maxLength={160} autoComplete="off" />
        </label>

        <fieldset className="space-y-3 rounded-[4px] border border-line p-3">
          <legend className="px-1 text-[15px] font-semibold">Position</legend>
          {deviceOk ? (
            watching ? (
              <>
                <p className="text-[15px]" aria-live="polite">
                  {live ? <>Accurate to <strong className={live.accuracyM <= GOOD_ENOUGH_M ? 'text-ok' : 'text-warn'}>{live.accuracyM} m</strong> — waiting for {GOOD_ENOUGH_M} m or better</> : 'Finding the position…'}
                </p>
                <button type="button" className={secondary} onClick={acceptReading} disabled={!live}>Use this reading{live ? ` (${live.accuracyM} m)` : ''}</button>
                <button type="button" className={secondary} onClick={stopWatch}>Stop</button>
              </>
            ) : (
              <button type="button" className={reading ? secondary : primary} onClick={capture}>{reading ? 'Capture again' : 'Capture position'}</button>
            )
          ) : <p className="text-[14px] text-ink-muted">The nation does not accept a phone&rsquo;s own location; use a photo or the office form.</p>}
          {geoErr ? <p className="text-[14px] text-alert">{geoErr}</p> : null}
          {reading ? (
            <p className="text-[15px]" aria-live="polite">
              <span className="font-mono">{reading.lat}, {reading.lng}</span><br />
              <span className={reading.accuracyM <= GOOD_ENOUGH_M ? 'text-ok' : 'text-warn'}>Within {reading.accuracyM} m</span> · {reading.method === 'photo-geotag' ? 'from the photo' : 'from this phone'}
            </p>
          ) : null}

          {photoOk ? (
            <label className="block text-[14px] text-ink-soft">Photo of the site (optional)
              <input type="file" accept="image/jpeg" capture="environment" className="mt-1 block w-full text-[14px]" onChange={e => void onPhoto(e.currentTarget.files?.[0])} />
              <span className="mt-1 block text-[13px] text-ink-muted">Its location is read on this phone; the photo is not uploaded.</span>
            </label>
          ) : null}
          {photoNote ? <p className="text-[14px] text-ink-soft">{photoNote}</p> : null}
          {photo && reading?.method !== 'photo-geotag' ? (
            <button type="button" className={secondary} onClick={() => { stopWatch(); setReading(photo); }}>Use the photo&rsquo;s location</button>
          ) : null}
        </fieldset>

        <label className="block text-[14px] text-ink-soft">Note (optional)
          <textarea className={`${big} mt-1`} rows={2} value={note} onChange={e => setNote(e.currentTarget.value)} maxLength={400} />
        </label>

        <button type="submit" className={primary} disabled={busy || !ready}>{busy ? 'Sending…' : online ? 'Record the site' : 'Keep on this phone'}</button>
        {!official ? <p className="text-[14px] text-alert">Sign in or give your name first.</p> : null}
        {msg ? <p role="status" className={`text-[15px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
      </form>

      {queue.length ? (
        <section className="space-y-2" aria-labelledby="kept-h">
          <div className="flex items-center justify-between gap-2">
            <h3 id="kept-h" className="text-[17px] font-semibold">Kept on this phone</h3>
          </div>
          <button type="button" className={secondary} disabled={!waiting} onClick={() => { setOnline(navigator.onLine); void flush(); }}>Send now{waiting ? ` (${waiting})` : ''}</button>
          <ul className="space-y-2">
            {queue.map(q => (
              <li key={q.qid} className="rounded-[4px] border border-line p-3 text-[14px]">
                <p className="font-semibold">{q.body.name}</p>
                <p className="text-ink-muted">{q.ministryName} · {new Date(q.savedAt).toLocaleString()}</p>
                <p className={q.state === 'sent' ? 'text-ok' : q.state === 'refused' ? 'text-alert' : 'text-warn'}>
                  {q.state === 'waiting' ? 'Saved on this phone — will send when online' : q.state === 'sending' ? 'Sending…' : q.state === 'sent' ? `Sent: recorded as ${q.siteId}` : `Refused: ${q.error}`}
                </p>
                {q.state === 'refused' && q.duplicate ? (
                  <button type="button" className={`${secondary} mt-2`} onClick={() => { saveQueue(queue.map(x => (x.qid === q.qid ? { ...x, state: 'waiting', error: undefined, body: { ...x.body, confirmDuplicate: true } } : x))); void flush(); }}>
                    It is a different site: send again
                  </button>
                ) : null}
                {q.state === 'sent' || q.state === 'refused' ? (
                  <button type="button" className={`${secondary} mt-2`} onClick={() => saveQueue(queue.filter(x => x.qid !== q.qid))}>Dismiss</button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[14px] text-ink-soft">
        <Link href="/gov/sites" className="text-link underline">The register</Link>
        {inst ? <> · <Link href={`/gov/ministry/${encodeURIComponent(inst)}`} className="text-link underline">{instName}</Link></> : null}
      </p>
    </div>
  );
}
