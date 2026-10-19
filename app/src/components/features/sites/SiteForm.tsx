'use client';

// Record one site for an institution (docs/FACILITY_REGISTER_REVIEW.md, the
// manual way). The position is given by any way the nation accepts (its
// facility policy; the others are hidden): a pin on the map, typed decimal
// degrees or degrees-minutes-seconds, this device's location, the location a
// photo carries, or coordinates from the national grid, gazetteer, land
// registry, imagery, a survey receiver or a text message, with what was given
// kept as the original. The position is checked as it changes (inside the
// nation and the region named, the region and district it falls in, possible
// duplicates). The site is recorded as proposed; a different official
// publishes it. Rules: lib/data/facilities.ts.

import * as React from 'react';
import { NationMap } from '@/components/map/NationMap';
import type { PointTileSource } from '@/lib/map/tile-loader';
import { nationRegions } from '@/lib/nation/registry';
import { readPhotoPosition } from '@/lib/geo/exif-gps';
import { useOfficial } from '@/lib/official';
import { parseCoordinates, toDms } from './coords';
import {
  LOCATION_BLOCKED, STATUS_WORD, btn, callApi, input, label, locationAllowed, sitePoints,
  type CaptureMethod, type FacilityStatus, type LocationCheck, type Site, type Vocabulary,
} from './shared';

/** The ways a single site can be placed from this form (files and feeds have their own paths). */
const FORM_METHODS: CaptureMethod[] = ['map-pin', 'typed', 'device-gps', 'photo-geotag', 'gnss-survey', 'national-grid', 'gazetteer', 'cadastre', 'imagery', 'sms-report'];
/** Plain names on screen where the register's own label is technical. */
const PLAIN: Partial<Record<CaptureMethod, string>> = { 'gnss-survey': 'Survey receiver', 'photo-geotag': 'Photo\'s location', 'device-gps': 'This device\'s location' };
/** Methods given as typed coordinates plus what was originally given. */
const ORIGINAL: Partial<Record<CaptureMethod, string>> = {
  'gnss-survey': 'As the receiver gave it (point id, file name)',
  'national-grid': 'Easting and northing as given (e.g. "E 257000 N 9857000, national grid")',
  gazetteer: 'The gazetteer entry it was matched to',
  cadastre: 'Parcel number',
  imagery: 'Imagery used (source and date)',
  'sms-report': 'The text message as received',
};

export const methodName = (key: CaptureMethod, vocab?: Vocabulary) => PLAIN[key] ?? vocab?.methods.find(m => m.key === key)?.label ?? key;

interface Position { lat: number; lng: number; accuracyM?: number; capturedAt?: string; original?: string }

export function SiteForm({ ministryId, ministryName, vocab, onRecorded, tiles }: {
  ministryId: string; ministryName?: string; vocab: Vocabulary; onRecorded?: (s: Site) => void;
  /** A national-scale register: the sites already recorded, read from vector tiles instead of vocab.sites. */
  tiles?: PointTileSource;
}) {
  const [official] = useOfficial();
  const uid = React.useId();
  const methods = FORM_METHODS.filter(m => vocab.policy.methods.includes(m));
  const blank = { name: '', localName: '', category: '', operator: '', code: '', status: 'operational' as FacilityStatus, region: '', note: '' };
  const [f, setF] = React.useState(blank);
  const [method, setMethod] = React.useState<CaptureMethod | ''>(methods[0] ?? '');
  const [typedFormat, setTypedFormat] = React.useState<'decimal' | 'dms'>('decimal');
  const [latText, setLatText] = React.useState('');
  const [lngText, setLngText] = React.useState('');
  const [dmsText, setDmsText] = React.useState('');
  const [original, setOriginal] = React.useState('');
  const [accuracy, setAccuracy] = React.useState('');
  const [pos, setPos] = React.useState<Position | null>(null);
  const [posNote, setPosNote] = React.useState('');
  const [locating, setLocating] = React.useState(false);
  const [check, setCheck] = React.useState<LocationCheck | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [different, setDifferent] = React.useState(false);
  const [outsideReason, setOutsideReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  // 3D readiness (optional): the building's outline as GeoJSON, its height and storeys; checked here, then on the server.
  const [building, setBuilding] = React.useState({ footprint: '', heightM: '', levels: '' });
  const footprintProblem = React.useMemo(() => {
    const t = building.footprint.trim();
    if (!t) return '';
    try {
      const j = JSON.parse(t) as { type?: string; geometry?: { type?: string }; coordinates?: unknown };
      const g = j.type === 'Feature' ? j.geometry : j;
      return g?.type === 'Polygon' ? '' : 'Paste a GeoJSON Polygon (or a Feature holding one).';
    } catch { return 'This is not valid GeoJSON.'; }
  }, [building.footprint]);
  const heightProblem = building.heightM.trim() && !(Number(building.heightM) >= 0.5 && Number(building.heightM) <= 1000) ? 'Between 0.5 and 1,000 metres.' : '';
  const levelsProblem = building.levels.trim() && !(Number.isInteger(Number(building.levels)) && Number(building.levels) >= 1 && Number(building.levels) <= 250) ? 'A whole number from 1 to 250.' : '';
  const cat = vocab.categories.find(c => c.key === f.category);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.currentTarget.value });

  React.useEffect(() => { if (method && !methods.includes(method)) setMethod(methods[0] ?? ''); }, [methods.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Typed coordinates become the position as they are typed.
  React.useEffect(() => {
    if (method === 'map-pin' || method === 'device-gps' || method === 'photo-geotag' || !method) return;
    if (method === 'typed' && typedFormat === 'dms') {
      if (!dmsText.trim()) { setPos(null); setPosNote(''); return; }
      const p = parseCoordinates(dmsText);
      if ('error' in p) { setPos(null); setPosNote(p.error); return; }
      setPos({ ...p, original: dmsText.trim() }); setPosNote(`Read as ${p.lat}, ${p.lng}`);
      return;
    }
    if (!latText.trim() || !lngText.trim()) { setPos(null); setPosNote(''); return; }
    const lat = Number(latText.replace(/[−]/g, '-').replace(',', '.')), lng = Number(lngText.replace(/[−]/g, '-').replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setPos(null); setPosNote('Latitude and longitude are numbers in decimal degrees, e.g. -1.28638 and 36.81724'); return; }
    const acc = Number(accuracy);
    setPos({ lat, lng, ...(Number.isFinite(acc) && acc > 0 ? { accuracyM: acc } : {}), ...(original.trim() ? { original: original.trim() } : {}) });
    setPosNote(`${toDms(lat, lng)}`);
  }, [method, typedFormat, latText, lngText, dmsText, original, accuracy]);

  // The live check, a moment after the position, category, region or name changes.
  React.useEffect(() => {
    if (!pos || !f.category) { setCheck(null); return; }
    let live = true;
    setChecking(true);
    const t = setTimeout(() => {
      callApi<LocationCheck>('/api/facilities/check', { lng: pos.lng, lat: pos.lat, category: f.category, region: f.region || undefined, name: f.name || undefined })
        .then(c => { if (live) setCheck(c); })
        .catch(e => { if (live) setCheck({ ok: false, errors: [(e as Error).message], warnings: [], place: { inside: false }, duplicates: [] }); })
        .finally(() => { if (live) setChecking(false); });
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [pos?.lat, pos?.lng, f.category, f.region, f.name]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { setDifferent(false); }, [check?.duplicates.map(d => d.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseMethod(m: CaptureMethod) {
    setMethod(m); setPos(null); setPosNote(''); setCheck(null); setOriginal(''); setAccuracy('');
  }

  function locate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setPosNote('This browser cannot give its location. Choose another way.'); return; }
    if (!locationAllowed()) { setPosNote(LOCATION_BLOCKED); return; }
    setLocating(true); setPosNote('Finding this device\'s location…');
    navigator.geolocation.getCurrentPosition(
      p => {
        setLocating(false);
        const acc = Math.round(p.coords.accuracy);
        setPos({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6, accuracyM: acc, capturedAt: new Date(p.timestamp).toISOString() });
        setPosNote(`Found to within ${acc} m${acc > 30 ? ': stand outside, away from buildings, and try again for a better reading' : ''}.`);
      },
      e => { setLocating(false); setPosNote(!locationAllowed() ? LOCATION_BLOCKED : e.code === 1 ? 'Location permission was refused. Allow it in the browser, or choose another way.' : 'The location could not be found. Try again outside, or choose another way.'); },
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 },
    );
  }

  async function onPhoto(file: File | undefined) {
    setPos(null); setCheck(null);
    if (!file) { setPosNote(''); return; }
    if (file.size > 40_000_000) { setPosNote('The photo is larger than 40 MB.'); return; }
    const p = readPhotoPosition(await file.arrayBuffer());
    if (!p) { setPosNote('This photo carries no location. Turn on location for the camera, take it again on site, or choose another way.'); return; }
    setPos({ lat: p.lat, lng: p.lng, accuracyM: p.accuracyM, capturedAt: p.takenAt, original: `Photo ${file.name.slice(0, 80)}` });
    setPosNote(`Read from the photo: ${p.lat}, ${p.lng}${p.accuracyM ? ` (within ${p.accuracyM} m)` : ''}${p.takenAt ? `, taken ${p.takenAt.slice(0, 16).replace('T', ' ')}` : ''}.`);
  }

  const outside = !!check && check.ok && !check.place.inside;
  const needTick = !!check?.duplicates.length;
  const ready = !!(f.name.trim() && cat && pos && method && check?.ok && (!needTick || different) && (!outside || outsideReason.trim()) && official);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every site is recorded under a person.' }); return; }
    if (!pos || !method || !cat) return;
    if (footprintProblem || heightProblem || levelsProblem) { setMsg({ ok: false, text: `Building: ${footprintProblem || heightProblem || levelsProblem}` }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await callApi<{ facility: Site; check: LocationCheck }>(`/api/org/ministries/${encodeURIComponent(ministryId)}/facilities`, {
        name: f.name, localName: f.localName || undefined, category: f.category, operator: f.operator || undefined,
        ids: f.code.trim() ? { [cat.scheme]: f.code.trim() } : {}, status: f.status,
        lng: pos.lng, lat: pos.lat, accuracyM: pos.accuracyM, method, capturedAt: pos.capturedAt, original: pos.original,
        region: f.region || undefined, note: f.note || undefined, outsideReason: outside ? outsideReason : undefined,
        confirmDuplicate: needTick ? different : undefined, by: official,
        ...(building.footprint.trim() ? { footprint: JSON.parse(building.footprint) } : {}),
        ...(building.heightM.trim() ? { heightM: Number(building.heightM) } : {}),
        ...(building.levels.trim() ? { levels: Number(building.levels) } : {}),
      });
      setMsg({ ok: true, text: `Recorded: ${r.facility.name} (${r.facility.id})${r.facility.place.region ? ` in ${r.facility.place.region}` : ''}. Another official publishes it.` });
      setF({ ...blank, category: f.category }); setPos(null); setLatText(''); setLngText(''); setDmsText(''); setOriginal(''); setAccuracy(''); setCheck(null); setOutsideReason(''); setPosNote(''); setBuilding({ footprint: '', heightM: '', levels: '' });
      onRecorded?.(r.facility);
    } catch (err) {
      const b = (err as Error & { body?: { check?: LocationCheck } }).body;
      if (b?.check) setCheck(b.check);
      setMsg({ ok: false, text: (err as Error).message });
    } finally { setBusy(false); }
  }

  if (!methods.length) return <p className="text-[13px] text-alert">The nation&rsquo;s policy accepts no way of placing a single site. An administrator can change it under &ldquo;How the nation runs its register&rdquo;.</p>;
  const warnings = (check?.warnings ?? []).filter(w => !(outsideReason.trim() && /needs a reason/.test(w)));
  const regions = nationRegions();

  return (
    <form onSubmit={submit} className="space-y-4 text-[14px]" aria-label={`Record a site${ministryName ? ` for ${ministryName}` : ''}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>Name of the site
          <input className={`${input} mt-1`} value={f.name} onChange={set('name')} required maxLength={160} placeholder="e.g. Kibera Health Centre" />
        </label>
        <label className={label}>Local or official name (optional)
          <input className={`${input} mt-1`} value={f.localName} onChange={set('localName')} maxLength={160} />
        </label>
        <label className={label}>What kind of site
          <select className={`${input} mt-1`} value={f.category} onChange={set('category')} required>
            <option value="">Choose</option>
            {vocab.categories.map(c => (
              <option key={c.key} value={c.key} disabled={c.rule.level === 'confidential'}>
                {c.glyph} {c.label}{c.rule.level === 'confidential' ? ' (confidential: kept outside this register)' : c.rule.level === 'restricted' ? ' (restricted)' : ''}
              </option>
            ))}
          </select>
          {cat?.rule.level === 'restricted' ? <span className="mt-1 block text-[12px] text-ink-muted">Restricted: its exact position is shown only to officials of the institution and the whole government; everyone else sees it generalised.</span> : null}
        </label>
        <label className={label}>{cat ? cat.scheme : 'Sector identifier'} (optional)
          <input className={`${input} mt-1`} value={f.code} onChange={set('code')} maxLength={80} disabled={!cat} placeholder={cat ? '' : 'Choose the kind of site first'} />
        </label>
        <label className={label}>Run by (if not the institution)
          <input className={`${input} mt-1`} value={f.operator} onChange={set('operator')} maxLength={160} />
        </label>
        <label className={label}>Status
          <select className={`${input} mt-1`} value={f.status} onChange={set('status')}>
            {vocab.statuses.map(s => <option key={s} value={s}>{STATUS_WORD[s]}</option>)}
          </select>
        </label>
        <label className={label}>Region it is in (optional; checked against the position)
          <input className={`${input} mt-1`} value={f.region} onChange={set('region')} list={`${uid}-regions`} maxLength={120} />
          <datalist id={`${uid}-regions`}>{regions.map(r => <option key={r} value={r} />)}</datalist>
        </label>
        <label className={label}>Note (optional)
          <input className={`${input} mt-1`} value={f.note} onChange={set('note')} maxLength={400} />
        </label>
      </div>

      <details className="rounded-[3px] border border-line p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink">The building, for 3D maps (optional)</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className={label}>Footprint: the outline on the ground as a GeoJSON Polygon (longitude, latitude)
            <textarea className={`${input} mt-1 font-mono text-[12px]`} rows={3} value={building.footprint} onChange={e => { const v = e.currentTarget.value; setBuilding(b => ({ ...b, footprint: v })); }}
              placeholder='{"type":"Polygon","coordinates":[[[36.8170,-1.2866],[36.8175,-1.2866],[36.8175,-1.2861],[36.8170,-1.2861],[36.8170,-1.2866]]]}' aria-invalid={!!footprintProblem} />
            {footprintProblem ? <span className="mt-1 block text-[12px] text-alert">{footprintProblem}</span> : <span className="mt-1 block text-[12px] text-ink-muted">Checked on the server: one ring that does not cross itself, at the site, at most 5 km².</span>}
          </label>
          <label className={label}>Height (metres)
            <input className={`${input} mt-1`} inputMode="decimal" value={building.heightM} onChange={e => { const v = e.currentTarget.value; setBuilding(b => ({ ...b, heightM: v })); }} aria-invalid={!!heightProblem} />
            {heightProblem ? <span className="mt-1 block text-[12px] text-alert">{heightProblem}</span> : null}
          </label>
          <label className={label}>Storeys above ground
            <input className={`${input} mt-1`} inputMode="numeric" value={building.levels} onChange={e => { const v = e.currentTarget.value; setBuilding(b => ({ ...b, levels: v })); }} aria-invalid={!!levelsProblem} />
            {levelsProblem ? <span className="mt-1 block text-[12px] text-alert">{levelsProblem}</span> : null}
          </label>
        </div>
      </details>

      <fieldset className="space-y-3 rounded-[3px] border border-line p-3">
        <legend className="px-1 text-[13px] font-semibold text-ink">Where it stands</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="How the position was found">
          {methods.map(m => (
            <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => chooseMethod(m)}
              className={`focus-ring rounded-[3px] border px-2.5 py-1.5 text-[13px] ${method === m ? 'border-ink bg-surface-2 font-semibold text-ink' : 'border-line text-ink-soft hover:bg-surface-2'}`}>
              {methodName(m, vocab)}
            </button>
          ))}
        </div>
        {method ? <p className="text-[12px] text-ink-muted">{vocab.methods.find(m => m.key === method)?.how}</p> : null}

        {method === 'map-pin' ? <p className="text-[13px] text-ink-soft">Click the map where the site stands. Zoom into the region first for a closer pin (open it from the map&rsquo;s list).</p> : null}

        {method === 'typed' ? (
          <div className="space-y-2">
            <div className="flex gap-3 text-[13px]">
              <label className="inline-flex items-center gap-1.5"><input type="radio" name={`${uid}-fmt`} checked={typedFormat === 'decimal'} onChange={() => setTypedFormat('decimal')} /> Decimal degrees</label>
              <label className="inline-flex items-center gap-1.5"><input type="radio" name={`${uid}-fmt`} checked={typedFormat === 'dms'} onChange={() => setTypedFormat('dms')} /> Degrees, minutes, seconds</label>
            </div>
            {typedFormat === 'dms' ? (
              <label className={label}>Position
                <input className={`${input} mt-1 font-mono`} value={dmsText} onChange={e => setDmsText(e.currentTarget.value)} placeholder={`1°17'11"S 36°49'2"E  or  -1 17 11, 36 49 2`} />
              </label>
            ) : null}
          </div>
        ) : null}

        {method && method !== 'map-pin' && method !== 'device-gps' && method !== 'photo-geotag' && !(method === 'typed' && typedFormat === 'dms') ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Latitude (decimal degrees)
              <input className={`${input} mt-1 font-mono`} value={latText} onChange={e => setLatText(e.currentTarget.value)} inputMode="decimal" placeholder="-1.28638" />
            </label>
            <label className={label}>Longitude (decimal degrees)
              <input className={`${input} mt-1 font-mono`} value={lngText} onChange={e => setLngText(e.currentTarget.value)} inputMode="decimal" placeholder="36.81724" />
            </label>
            {ORIGINAL[method] ? (
              <label className={label}>{ORIGINAL[method]}
                <input className={`${input} mt-1`} value={original} onChange={e => setOriginal(e.currentTarget.value)} maxLength={200} />
              </label>
            ) : null}
            {method !== 'typed' ? (
              <label className={label}>Accuracy in metres (optional)
                <input className={`${input} mt-1 font-mono`} value={accuracy} onChange={e => setAccuracy(e.currentTarget.value)} inputMode="decimal" />
              </label>
            ) : null}
          </div>
        ) : null}

        {method === 'device-gps' ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btn} onClick={locate} disabled={locating}>{locating ? 'Finding…' : 'Use this device\'s location'}</button>
            <span className="text-[12px] text-ink-muted">Only on site: the device&rsquo;s own position is recorded. For field work, the phone page keeps captures while offline.</span>
          </div>
        ) : null}

        {method === 'photo-geotag' ? (
          <label className={label}>A photo taken on site (JPEG)
            <input type="file" accept="image/jpeg" className="mt-1 block text-[13px]" onChange={e => void onPhoto(e.currentTarget.files?.[0])} />
            <span className="mt-1 block text-[12px] text-ink-muted">The location is read from the photo on this device; the photo itself is not uploaded.</span>
          </label>
        ) : null}

        {posNote ? <p className="text-[13px] text-ink-soft" aria-live="polite">{posNote}</p> : null}

        <NationMap
          title="Where the site stands"
          kind="reported"
          source="Sites declared by institutions; certified sites have been checked"
          compact
          maxHeight={420}
          points={tiles ? undefined : sitePoints(vocab.sites, vocab.categories)}
          pointTiles={tiles}
          cluster
          pointsLabel="Sites already in the register"
          onPick={method === 'map-pin' ? ({ lng, lat }) => { setPos({ lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }); setPosNote(`Pin at ${Math.round(lat * 1e5) / 1e5}, ${Math.round(lng * 1e5) / 1e5}: about 100 m accuracy.`); } : undefined}
          pin={pos ? { lng: pos.lng, lat: pos.lat, label: f.name || 'New site' } : null}
        />
      </fieldset>

      <section aria-live="polite" className="space-y-1.5 text-[13px]">
        {!pos ? <p className="text-ink-muted">Give a position to check it.</p>
          : !f.category ? <p className="text-ink-muted">Choose what kind of site it is to check the position.</p>
          : checking && !check ? <p className="text-ink-muted">Checking…</p>
          : check ? (
            <>
              {check.place.region ? (
                <p className={check.ok ? 'text-ok' : 'text-ink'}>
                  Falls in <strong>{check.place.region}</strong>{check.place.district ? <>, <strong>{check.place.district}</strong></> : null}.
                </p>
              ) : null}
              {check.errors.map(e => <p key={e} className="text-alert">Cannot record: {e}</p>)}
              {warnings.map(w => <p key={w} className="text-warn">Check: {w}</p>)}
              {needTick ? (
                <label className="flex items-start gap-2 text-ink">
                  <input type="checkbox" className="mt-1" checked={different} onChange={e => setDifferent(e.currentTarget.checked)} />
                  <span>This is a different site from {check.duplicates.map(d => `${d.name} (${d.metres} m away)`).join(', ')}</span>
                </label>
              ) : null}
              {outside ? (
                <label className={label}>Why the position is right although it is outside the boundary as drawn
                  <input className={`${input} mt-1`} value={outsideReason} onChange={e => setOutsideReason(e.currentTarget.value)} maxLength={400} placeholder="e.g. the jetty stands in the harbour" />
                </label>
              ) : null}
            </>
          ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={`${btn} border-ink`} disabled={busy || !ready}>{busy ? 'Recording…' : 'Record the site'}</button>
        {!official ? <span className="text-[12px] text-alert">Sign in or name the acting official first.</span> : <span className="text-[12px] text-ink-muted">Recorded as proposed by {official}; a different official publishes it.</span>}
      </div>
      {msg ? <p role="status" className={`text-[13px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
    </form>
  );
}
