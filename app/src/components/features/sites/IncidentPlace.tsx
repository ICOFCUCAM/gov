'use client';

// Where an institution's incident is happening (map plan phase 4). An official
// places it in a region, at a point (map pin, this device's location, typed
// coordinates) or at a registered site; the server checks it against the map
// and the register and works out the region and district. Placed incidents
// are drawn where they are in the Situation Room. Rules: lib/data/incident-places.ts.

import * as React from 'react';
import type { IncidentPlace as Place, MinistryIncident } from '@/lib/api/types';
import { api } from '@/lib/api/client';
import { NationMap } from '@/components/map/NationMap';
import { nationRegions } from '@/lib/nation/registry';
import { parseCoordinates } from './coords';
import { btn, input, label, locationAllowed, when } from './shared';

type How = 'region' | 'pin' | 'device' | 'typed' | 'site';
interface SiteRow { id: string; name: string; category: string; ownerId: string; place: { region?: string }; generalised?: boolean }

const LOCATION_BLOCKED = 'This page may not read the device\'s location. Choose another way.';

/** One line saying where an incident is. */
export function placeText(p: Place): string {
  const area = [p.district, p.region].filter(Boolean).join(', ');
  if (p.how === 'site') return `${p.facilityName ?? 'Registered site'}${area ? ` · ${area}` : ''}${p.generalised ? ' (position generalised)' : ''}`;
  if (p.how === 'point') return `${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)}${area ? ` · ${area}` : ''}`;
  return area || 'Region';
}

export function IncidentPlace({ ministryId, incident, official, onChange }: {
  ministryId: string;
  incident: MinistryIncident;
  official: string;
  onChange: (i: MinistryIncident) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [how, setHow] = React.useState<How>('region');
  const [region, setRegion] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [pos, setPos] = React.useState<{ lng: number; lat: number } | null>(null);
  const [typed, setTyped] = React.useState('');
  const [siteId, setSiteId] = React.useState('');
  const [sites, setSites] = React.useState<SiteRow[] | null>(null);
  const [note, setNote] = React.useState('');
  const [msg, setMsg] = React.useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const uid = React.useId().replace(/:/g, '');
  const regions = nationRegions();
  const p = incident.place;

  React.useEffect(() => {
    if (!open || how !== 'site' || sites) return;
    let live = true;
    fetch('/api/facilities').then(r => (r.ok ? r.json() : null)).then((j: { sites?: SiteRow[] } | null) => {
      if (!live) return;
      const all = j?.sites ?? [];
      // The institution's own sites first, then everyone else's.
      setSites([...all.filter(s => s.ownerId === ministryId), ...all.filter(s => s.ownerId !== ministryId)]);
    }).catch(() => live && setSites([]));
    return () => { live = false; };
  }, [open, how, sites, ministryId]);

  function choose(h: How) { setHow(h); setPos(null); setMsg(null); }

  function locate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !locationAllowed()) { setMsg({ tone: 'err', text: LOCATION_BLOCKED }); return; }
    setMsg({ tone: 'ok', text: 'Finding this device\'s location…' });
    navigator.geolocation.getCurrentPosition(
      g => { setPos({ lat: Math.round(g.coords.latitude * 1e6) / 1e6, lng: Math.round(g.coords.longitude * 1e6) / 1e6 }); setMsg({ tone: 'ok', text: `Found to within ${Math.round(g.coords.accuracy)} m.` }); },
      e => setMsg({ tone: 'err', text: e.code === 1 ? 'Location permission was refused. Allow it in the browser, or choose another way.' : 'The location could not be found. Choose another way.' }),
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 },
    );
  }

  function body(): Record<string, unknown> | string {
    const base = { by: official || undefined, note: note.trim() || undefined };
    if (how === 'region') return region ? { ...base, how: 'region', region, district: district.trim() || undefined } : 'Choose the region';
    if (how === 'site') return siteId ? { ...base, how: 'site', facilityId: siteId } : 'Choose the registered site';
    if (how === 'typed') {
      const c = parseCoordinates(typed);
      return 'error' in c ? c.error : { ...base, how: 'point', lng: c.lng, lat: c.lat, method: 'typed' };
    }
    if (!pos) return how === 'pin' ? 'Click the map where it is happening' : 'Find this device\'s location first';
    return { ...base, how: 'point', lng: pos.lng, lat: pos.lat, method: how === 'pin' ? 'map-pin' : 'device-gps' };
  }

  async function save() {
    const b = body();
    if (typeof b === 'string') { setMsg({ tone: 'err', text: b }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api.org.placeIncident(ministryId, incident.key, b);
      onChange(r.incident);
      setMsg({ tone: 'ok', text: `Placed: ${placeText(r.incident.place!)}${r.warnings.length ? ` · ${r.warnings.join(' · ')}` : ''}` });
      setOpen(false); setNote('');
    } catch (e) { setMsg({ tone: 'err', text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  async function clear() {
    setBusy(true); setMsg(null);
    try { const r = await api.org.clearIncidentPlace(ministryId, incident.key, official || undefined, note.trim() || undefined); onChange(r.incident); setMsg({ tone: 'ok', text: 'Place cleared; kept in the incident\'s history.' }); }
    catch (e) { setMsg({ tone: 'err', text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const ways: { k: How; l: string }[] = [
    { k: 'region', l: 'A region' }, { k: 'pin', l: 'Pin on the map' }, { k: 'device', l: 'This device\'s location' },
    { k: 'typed', l: 'Type coordinates' }, { k: 'site', l: 'A registered site' },
  ];

  return (
    <div className="mt-2 border-t border-line-soft pt-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-muted">Where:</span>
        {p ? <strong className="text-ink">{placeText(p)}</strong> : <span className="text-ink-muted">not placed — shown beside the institution on the national map</span>}
        {p ? <span className="text-[12px] text-ink-muted">recorded by {p.by}, {when(p.at)}{incident.placeHistory?.length ? ` · ${incident.placeHistory.length} earlier` : ''}</span> : null}
        <button type="button" className={btn} aria-expanded={open} aria-controls={`${uid}-form`} onClick={() => { setOpen(o => !o); setMsg(null); }}>{p ? 'Move' : 'Place on the map'}</button>
        {p ? <button type="button" className={btn} disabled={busy} onClick={clear}>Clear</button> : null}
      </div>
      {msg ? <p className={`mt-1 ${msg.tone === 'err' ? 'text-alert' : 'text-ink-soft'}`} role={msg.tone === 'err' ? 'alert' : 'status'}>{msg.text}</p> : null}
      {open ? (
        <div id={`${uid}-form`} className="mt-2 space-y-2 rounded-[3px] border border-line bg-surface p-2">
          <fieldset>
            <legend className={label}>How to place it</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ways.map(w => (
                <label key={w.k} className={`focus-within:ring-2 cursor-pointer rounded-[3px] border px-2 py-1 ${how === w.k ? 'border-ink bg-surface-2 font-semibold' : 'border-line'}`}>
                  <input type="radio" name={`${uid}-how`} className="sr-only" checked={how === w.k} onChange={() => choose(w.k)} />{w.l}
                </label>
              ))}
            </div>
          </fieldset>
          {how === 'region' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={label}>Region
                <select className={`${input} mt-1`} value={region} onChange={e => setRegion(e.target.value)}>
                  <option value="">Choose…</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className={label}>District (optional)
                <input className={`${input} mt-1`} value={district} onChange={e => setDistrict(e.target.value)} maxLength={120} />
              </label>
            </div>
          ) : null}
          {how === 'typed' ? (
            <label className={label}>Coordinates (decimal degrees or degrees-minutes-seconds)
              <input className={`${input} mt-1`} value={typed} onChange={e => setTyped(e.target.value)} placeholder="-1.28638, 36.81724" />
            </label>
          ) : null}
          {how === 'device' ? <button type="button" className={btn} onClick={locate}>Use this device&rsquo;s location</button> : null}
          {how === 'site' ? (
            <label className={label}>Registered site
              <select className={`${input} mt-1`} value={siteId} onChange={e => setSiteId(e.target.value)} disabled={!sites}>
                <option value="">{sites ? (sites.length ? 'Choose…' : 'No published sites in the register yet') : 'Loading the register…'}</option>
                {(sites ?? []).map(s => <option key={s.id} value={s.id}>{s.name}{s.place.region ? ` · ${s.place.region}` : ''}{s.ownerId === ministryId ? '' : ' (another institution)'}</option>)}
              </select>
            </label>
          ) : null}
          {how === 'pin' || how === 'device' ? (
            <NationMap title="Where the incident is" kind="reported" source="Placed by the institution" compact maxHeight={340}
              onPick={how === 'pin' ? ({ lng, lat }) => setPos({ lng: Math.round(lng * 1e5) / 1e5, lat: Math.round(lat * 1e5) / 1e5 }) : undefined}
              pin={pos ? { lng: pos.lng, lat: pos.lat, label: incident.label } : p?.lng != null && p.lat != null ? { lng: p.lng, lat: p.lat, label: `${incident.label} (now)` } : null} />
          ) : null}
          <label className={label}>Note (optional)
            <input className={`${input} mt-1`} value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. reported by the district office" />
          </label>
          <div className="flex gap-2">
            <button type="button" className={`${btn} bg-surface-2`} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save the place'}</button>
            <button type="button" className={btn} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
