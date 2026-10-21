'use client';

// One question of a form (lib/forms/contract.ts), for every type of the
// contract: a visible label, the hint and the error tied to the input
// (aria-describedby), the error said in words (never colour alone), large
// touch targets, logical CSS so a right-to-left page mirrors correctly, and
// identifiers, amounts and positions kept left-to-right inside it.

import * as React from 'react';
import { CONTACT_METHODS, DOCUMENT_ANSWERS, LOCATION_KINDS, type FieldView, type Money, type Address, type Location, type PartyRef, type DateRange, type Quantity, type Contact } from '@/lib/forms/contract';
import { fractionDigits, toMinor } from './answers';

export const inputClass = 'mt-1 block w-full min-h-tap rounded-sm border-2 border-ink/60 bg-surface px-3 py-2 text-base text-ink focus-ring';
const small = 'mt-1 block w-full min-h-tap rounded-sm border-2 border-ink/60 bg-surface px-3 py-2 text-base text-ink focus-ring';
const choiceRow = 'flex min-h-tap items-start gap-3 py-1 text-base';
const box = 'mt-1 h-6 w-6 shrink-0 accent-current';

export interface FieldProps {
  f: FieldView;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  currency: string;
  regions?: string[];
  idPrefix?: string;
  disabled?: boolean;
  /** Shown when the field asks for evidence: the document it names. */
  evidence?: { purpose?: string; formats?: string[]; alternative?: string; requiredBy?: string };
}

const dataClassNote = (f: FieldView) => (f.dataClass === 'public' || f.dataClass === 'administrative' ? null : f.dataClass === 'special' ? 'special-category data' : f.dataClass === 'tax-confidential' ? 'tax-confidential' : `${f.dataClass} data`);

/** The label, hint and error of a question; the input goes inside. */
function Frame({ f, id, error, children, legend }: { f: FieldView; id: string; error?: string; children: React.ReactNode; legend?: boolean }) {
  const note = dataClassNote(f);
  const head = (
    <>
      <span className="block text-base font-semibold text-ink">{f.label}{!f.required ? <span className="font-normal text-ink-muted"> (optional)</span> : null}</span>
      {f.hint ? <span id={`${id}-hint`} className="mt-0.5 block text-sm text-ink-soft">{f.hint}</span> : null}
      {note ? <span className="mt-0.5 block text-xs text-ink-muted">Kept as {note}: only officials handling the case see it.</span> : null}
      {f.choicesProposed ? <span className="mt-0.5 block text-xs text-warn">The choices are proposed and not yet approved by the nation.</span> : null}
      {error ? <span id={`${id}-error`} className="mt-1 block text-sm font-semibold text-alert"><span className="sr-only">Error: </span><span aria-hidden="true">! </span>{error}</span> : null}
    </>
  );
  const cls = `block ${error ? 'border-s-4 border-alert ps-3' : ''}`;
  return legend
    ? <fieldset id={id} className={cls} aria-describedby={[f.hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}><legend className="mb-1">{head}</legend>{children}</fieldset>
    : <div id={id} className={cls}><label htmlFor={`${id}-input`}>{head}</label>{children}</div>;
}

const describedBy = (f: FieldView, id: string, error?: string) => [f.hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
const LTR = new Set(['identifierReference', 'registryReference', 'number', 'money', 'point', 'date', 'timestamp']);

export function FormField(p: FieldProps) {
  const { f, value, onChange, error, disabled } = p;
  const id = `${p.idPrefix ?? 'field'}-${f.key}`;
  const common = { id: `${id}-input`, disabled, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy(f, id, error), ...(LTR.has(f.type) ? { dir: 'ltr' as const } : {}) };
  const str = typeof value === 'string' ? value : '';
  switch (f.type) {
    case 'longtext':
      return <Frame f={f} id={id} error={error}><textarea {...common} className={`${inputClass} min-h-[8rem]`} value={str} maxLength={f.max ?? 20_000} onChange={e => onChange(e.target.value)} /></Frame>;
    case 'date':
      return <Frame f={f} id={id} error={error}><input {...common} type="date" className={`${small} max-w-xs`} value={str} onChange={e => onChange(e.target.value)} /></Frame>;
    case 'timestamp':
      return (
        <Frame f={f} id={id} error={error}>
          <div className="flex flex-wrap items-center gap-2">
            <input {...common} type="datetime-local" className={`${small} max-w-xs`} value={str ? str.slice(0, 16) : ''} onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />
            <button type="button" className="min-h-tap rounded-sm border border-line px-3 text-sm focus-ring" disabled={disabled} onClick={() => onChange(new Date().toISOString())}>Now</button>
          </div>
        </Frame>
      );
    case 'number':
      return <Frame f={f} id={id} error={error}><input {...common} type="text" inputMode="decimal" className={`${small} max-w-xs`} value={value === undefined || value === '' ? '' : String(value)} onChange={e => onChange(e.target.value === '' ? '' : Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value)} /></Frame>;
    case 'boolean':
      return (
        <Frame f={f} id={id} error={error} legend>
          {[['yes', 'Yes', true], ['no', 'No', false]].map(([k, l, v]) => (
            <label key={String(k)} className={choiceRow}><input type="radio" className={box} name={id} checked={value === v} disabled={disabled} onChange={() => onChange(v)} /> {String(l)}</label>
          ))}
        </Frame>
      );
    case 'choice': case 'enum': {
      const choices = f.choices ?? [];
      if (!choices.length) return <Frame f={f} id={id} error={error}><p className="mt-1 text-sm text-ink-muted">Not connected: no approved list of choices is in force yet{f.choicesFrom ? ` (${f.choicesFrom})` : ''}.</p></Frame>;
      if (f.multiple) {
        const list = Array.isArray(value) ? (value as string[]) : [];
        return (
          <Frame f={f} id={id} error={error} legend>
            <div className={choices.length > 8 ? 'grid gap-x-6 sm:grid-cols-2' : ''}>
              {choices.map(c => (
                <label key={c.value} className={choiceRow}>
                  <input type="checkbox" className={box} checked={list.includes(c.value)} disabled={disabled} onChange={e => onChange(e.target.checked ? [...list, c.value] : list.filter(x => x !== c.value))} /> {c.label}
                </label>
              ))}
            </div>
          </Frame>
        );
      }
      if (choices.length <= 7) return (
        <Frame f={f} id={id} error={error} legend>
          {choices.map(c => <label key={c.value} className={choiceRow}><input type="radio" className={box} name={id} checked={value === c.value} disabled={disabled} onChange={() => onChange(c.value)} /> {c.label}</label>)}
        </Frame>
      );
      return (
        <Frame f={f} id={id} error={error}>
          <select {...common} className={inputClass} value={str} onChange={e => onChange(e.target.value)}>
            <option value="">Choose</option>
            {choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Frame>
      );
    }
    case 'identifierReference': case 'registryReference':
      if (f.multiple) return <ListOfText {...p} id={id} />;
      return <Frame f={f} id={id} error={error}><input {...common} type="text" autoComplete="off" spellCheck={false} className={`${small} max-w-md font-mono`} value={str} onChange={e => onChange(e.target.value)} /></Frame>;
    case 'money': {
      const m = value as Partial<Money> | undefined;
      return <Frame f={f} id={id} error={error}><MoneyInput common={common} currency={m?.currency ?? p.currency} value={m} onChange={onChange} /></Frame>;
    }
    case 'document': {
      const ev = p.evidence;
      const answers = DOCUMENT_ANSWERS.filter(a => a.value !== 'alternative' || ev?.alternative);
      const current = f.multiple ? (Array.isArray(value) ? value[0] : value) : value;
      return (
        <Frame f={f} id={id} error={error} legend>
          {ev ? (
            <div className="mb-2 rounded-sm border border-line bg-surface-2 px-3 py-2 text-sm">
              {ev.purpose ? <p>{ev.purpose}</p> : null}
              {ev.formats?.length ? <p className="text-ink-soft">Accepted: {ev.formats.join(', ')}</p> : null}
              {ev.alternative ? <p className="text-ink-soft">Authorised alternative: {ev.alternative}</p> : null}
              {ev.requiredBy ? <p className="text-ink-soft">Required by <bdi dir="ltr">{ev.requiredBy}</bdi></p> : null}
            </div>
          ) : null}
          {answers.map(a => <label key={a.value} className={choiceRow}><input type="radio" className={box} name={id} checked={current === a.value} disabled={disabled} onChange={() => onChange(f.multiple ? [a.value] : a.value)} /> {a.label}</label>)}
        </Frame>
      );
    }
    case 'address':
      return <Frame f={f} id={id} error={error} legend><AddressInputs id={id} value={(value ?? {}) as Partial<Address>} regions={p.regions} onChange={onChange} disabled={disabled} /></Frame>;
    case 'point':
      return <Frame f={f} id={id} error={error} legend><PointInputs id={id} value={(value ?? {}) as Partial<{ lng: number; lat: number }>} onChange={onChange} disabled={disabled} /></Frame>;
    case 'location': {
      const l = (value ?? {}) as Partial<Location>;
      const kinds = LOCATION_KINDS.filter(k => (f.locationKinds ?? ['region', 'site', 'point', 'address', 'described']).includes(k.key));
      return (
        <Frame f={f} id={id} error={error} legend>
          {kinds.map(k => <label key={k.key} className={choiceRow}><input type="radio" className={box} name={`${id}-kind`} checked={l.kind === k.key} disabled={disabled} onChange={() => onChange({ kind: k.key })} /> {k.label}</label>)}
          <div className="mt-2 border-s-2 border-line ps-4">
            {l.kind === 'region' ? (
              <label className="block text-sm">Region<select className={inputClass} value={l.region ?? ''} disabled={disabled} onChange={e => onChange({ kind: 'region', region: e.target.value })}><option value="">Choose</option>{(p.regions ?? []).map(r => <option key={r} value={r}>{r}</option>)}</select></label>
            ) : l.kind === 'site' ? (
              <label className="block text-sm">Registered site id<input dir="ltr" className={`${small} font-mono`} value={l.site ?? ''} disabled={disabled} onChange={e => onChange({ kind: 'site', site: e.target.value })} /></label>
            ) : l.kind === 'point' ? (
              <PointInputs id={`${id}-pt`} value={l.point ?? {}} onChange={pt => onChange({ kind: 'point', point: pt })} disabled={disabled} />
            ) : l.kind === 'address' ? (
              <AddressInputs id={`${id}-ad`} value={l.address ?? {}} regions={p.regions} onChange={a => onChange({ kind: 'address', address: a })} disabled={disabled} />
            ) : l.kind === 'described' ? (
              <label className="block text-sm">Describe the place (landmarks, directions)<textarea className={`${inputClass} min-h-[5rem]`} value={l.text ?? ''} disabled={disabled} onChange={e => onChange({ kind: 'described', text: e.target.value })} /></label>
            ) : null}
          </div>
        </Frame>
      );
    }
    case 'party': {
      if (f.multiple) return <PartyList {...p} id={id} />;
      return <Frame f={f} id={id} error={error} legend><PartyInputs id={id} f={f} value={(value ?? {}) as Partial<PartyRef>} onChange={onChange} disabled={disabled} /></Frame>;
    }
    case 'dateRange': {
      const r = (value ?? {}) as Partial<DateRange>;
      return (
        <Frame f={f} id={id} error={error} legend>
          <div className="flex flex-wrap gap-4">
            <label className="block text-sm">From<input dir="ltr" type="date" className={small} value={r.from ?? ''} disabled={disabled} onChange={e => onChange({ ...r, from: e.target.value })} /></label>
            <label className="block text-sm">To{f.allowSingle ? ' (if it went on for a while)' : ''}<input dir="ltr" type="date" className={small} value={r.to ?? ''} disabled={disabled} onChange={e => onChange({ ...r, to: e.target.value || undefined })} /></label>
          </div>
        </Frame>
      );
    }
    case 'quantity': {
      const q = (value ?? {}) as Partial<Quantity>;
      return (
        <Frame f={f} id={id} error={error} legend>
          <div className="flex flex-wrap gap-3">
            <label className="block text-sm">Amount<input dir="ltr" inputMode="decimal" className={`${small} max-w-[10rem]`} value={q.amount ?? ''} disabled={disabled} onChange={e => onChange({ ...q, amount: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
            <label className="block text-sm">Unit{f.units?.length
              ? <select className={small} value={q.unit ?? ''} disabled={disabled} onChange={e => onChange({ ...q, unit: e.target.value })}><option value="">Choose</option>{f.units.map(u => <option key={u} value={u}>{u}</option>)}</select>
              : <input className={`${small} max-w-[8rem]`} value={q.unit ?? ''} disabled={disabled} onChange={e => onChange({ ...q, unit: e.target.value })} />}</label>
          </div>
        </Frame>
      );
    }
    case 'contact': {
      const c = (value ?? {}) as Partial<Contact>;
      const methods = CONTACT_METHODS.filter(m => (f.contactMethods ?? CONTACT_METHODS.map(x => x.key)).includes(m.key));
      return (
        <Frame f={f} id={id} error={error} legend>
          {methods.map(m => <label key={m.key} className={choiceRow}><input type="radio" className={box} name={id} checked={c.method === m.key} disabled={disabled} onChange={() => onChange({ method: m.key })} /> {m.label}</label>)}
          {c.method && c.method !== 'in-person' ? (
            <label className="mt-2 block border-s-2 border-line ps-4 text-sm">{c.method === 'email' ? 'Email address' : c.method === 'phone' ? 'Phone number, starting with +' : 'Postal address'}
              <input dir={c.method === 'post' ? undefined : 'ltr'} type={c.method === 'email' ? 'email' : c.method === 'phone' ? 'tel' : 'text'} autoComplete={c.method === 'email' ? 'email' : c.method === 'phone' ? 'tel' : 'street-address'} className={inputClass} value={c.value ?? ''} disabled={disabled} onChange={e => onChange({ ...c, value: e.target.value })} />
            </label>
          ) : null}
        </Frame>
      );
    }
    case 'attestation': {
      const a = f.attestation;
      const confirmed = (value as { confirmed?: string[] } | undefined)?.confirmed ?? [];
      return (
        <Frame f={f} id={id} error={error} legend>
          {(a?.statements ?? []).map(s => (
            <label key={s.key} className={choiceRow}>
              <input type="checkbox" className={box} checked={confirmed.includes(s.key)} disabled={disabled}
                onChange={e => onChange({ version: a!.version, confirmed: e.target.checked ? [...confirmed, s.key] : confirmed.filter(x => x !== s.key) })} />
              <span>{s.text}</span>
            </label>
          ))}
          <p className="mt-1 text-xs text-ink-muted">Wording version <bdi dir="ltr">{a?.version}</bdi>{a?.signature ? ' · confirmed as your signature once you are identified' : ''}</p>
        </Frame>
      );
    }
    case 'geometry': {
      const text = typeof value === 'object' && value ? ((value as { coordinates?: unknown }).coordinates ? JSON.stringify((value as { coordinates: unknown }).coordinates) : '') : '';
      return (
        <Frame f={f} id={id} error={error}>
          <textarea {...common} dir="ltr" className={`${inputClass} min-h-[5rem] font-mono text-sm`} placeholder="[[36.81, -1.28], [36.82, -1.28], [36.82, -1.29], [36.81, -1.28]]" defaultValue={text}
            onChange={e => { try { const c = JSON.parse(e.target.value) as unknown; const polygon = Array.isArray(c) && Array.isArray(c[0]) && c.length > 2; onChange(polygon ? { type: 'Polygon', coordinates: [c] } : Array.isArray(c) && typeof c[0] === 'number' ? { type: 'Point', coordinates: c } : { type: 'LineString', coordinates: c }); } catch { onChange({ type: 'Polygon', coordinates: null }); } }} />
          <span className="mt-1 block text-xs text-ink-muted">Positions as [longitude, latitude]; an area closes on its first corner.</span>
        </Frame>
      );
    }
    case 'group': return <GroupInputs {...p} id={id} />;
    case 'localizedText': default:
      return <Frame f={f} id={id} error={error}><input {...common} type="text" className={inputClass} value={typeof value === 'string' ? value : typeof value === 'object' && value ? Object.values(value as Record<string, string>)[0] ?? '' : ''} maxLength={f.max ?? 500} autoComplete={f.type === 'person' ? 'name' : undefined} onChange={e => onChange(e.target.value)} /></Frame>;
  }
}

function MoneyInput({ common, currency, value, onChange }: { common: Record<string, unknown>; currency: string; value?: Partial<Money>; onChange: (v: unknown) => void }) {
  const d = fractionDigits(currency);
  const [text, setText] = React.useState(value?.minor !== undefined ? (value.minor / 10 ** d).toFixed(d) : '');
  return (
    <div className="mt-1 flex max-w-xs items-stretch" dir="ltr">
      <span className="flex min-h-tap items-center rounded-s-sm border-2 border-e-0 border-ink/60 bg-surface-2 px-3 font-mono text-base">{currency}</span>
      <input {...common} inputMode="decimal" className="block w-full min-h-tap rounded-e-sm border-2 border-ink/60 bg-surface px-3 py-2 text-base focus-ring" value={text}
        onChange={e => { setText(e.target.value); const m = toMinor(e.target.value, currency); onChange(e.target.value === '' ? '' : m === null ? { minor: -1, currency } : { minor: m, currency }); }} />
    </div>
  );
}

function AddressInputs({ id, value, regions, onChange, disabled }: { id: string; value: Partial<Address>; regions?: string[]; onChange: (v: unknown) => void; disabled?: boolean }) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-3">
      <label htmlFor={`${id}-line1`} className="block text-sm">Building and street, or a landmark<input id={`${id}-line1`} autoComplete="address-line1" className={inputClass} value={value.line1 ?? ''} disabled={disabled} onChange={set('line1')} /></label>
      <label htmlFor={`${id}-line2`} className="block text-sm">Second line (optional)<input id={`${id}-line2`} autoComplete="address-line2" className={inputClass} value={value.line2 ?? ''} disabled={disabled} onChange={set('line2')} /></label>
      <label htmlFor={`${id}-locality`} className="block text-sm">Town, village or locality<input id={`${id}-locality`} autoComplete="address-level2" className={`${inputClass} max-w-md`} value={value.locality ?? ''} disabled={disabled} onChange={set('locality')} /></label>
      {regions?.length ? <label htmlFor={`${id}-region`} className="block text-sm">Region (optional)<select id={`${id}-region`} className={`${inputClass} max-w-md`} value={value.region ?? ''} disabled={disabled} onChange={set('region')}><option value="">Choose</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></label> : null}
      <label htmlFor={`${id}-postcode`} className="block text-sm">Postcode (if there is one)<input id={`${id}-postcode`} dir="ltr" autoComplete="postal-code" className={`${inputClass} max-w-[10rem]`} value={value.postcode ?? ''} disabled={disabled} onChange={set('postcode')} /></label>
    </div>
  );
}

function PointInputs({ id, value, onChange, disabled }: { id: string; value: Partial<{ lng: number | string; lat: number | string }>; onChange: (v: { lng: number | string; lat: number | string }) => void; disabled?: boolean }) {
  const [msg, setMsg] = React.useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-end gap-3" dir="ltr">
      <label htmlFor={`${id}-lat`} className="block text-sm">Latitude<input id={`${id}-lat`} inputMode="decimal" className={`${small} max-w-[11rem] font-mono`} value={value.lat ?? ''} disabled={disabled} onChange={e => onChange({ lng: value.lng ?? '', lat: e.target.value === '' ? '' : Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value })} /></label>
      <label htmlFor={`${id}-lng`} className="block text-sm">Longitude<input id={`${id}-lng`} inputMode="decimal" className={`${small} max-w-[11rem] font-mono`} value={value.lng ?? ''} disabled={disabled} onChange={e => onChange({ lat: value.lat ?? '', lng: e.target.value === '' ? '' : Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value })} /></label>
      <button type="button" className="min-h-tap rounded-sm border border-line px-3 text-sm focus-ring" disabled={disabled} onClick={() => {
        if (!('geolocation' in navigator)) { setMsg('This device cannot give its position: type it in.'); return; }
        navigator.geolocation.getCurrentPosition(pos => { onChange({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }); setMsg(`Position taken (accurate to about ${Math.round(pos.coords.accuracy)} m).`); }, () => setMsg('The position could not be taken: type it in.'));
      }}>Use this device&apos;s position</button>
      {msg ? <p role="status" className="w-full text-sm text-ink-soft">{msg}</p> : null}
    </div>
  );
}

function PartyInputs({ id, f, value, onChange, disabled }: { id: string; f: FieldView; value: Partial<PartyRef>; onChange: (v: unknown) => void; disabled?: boolean }) {
  const kinds = f.parties ?? ['person', 'organisation'];
  const kind = value.kind ?? (kinds.length === 1 ? kinds[0] : undefined);
  const word = (k: string) => (k === 'person' ? 'A person' : k === 'organisation' ? 'An organisation' : 'An institution');
  return (
    <div className="grid gap-3">
      {kinds.length > 1 ? kinds.map(k => <label key={k} className={choiceRow}><input type="radio" className={box} name={`${id}-kind`} checked={kind === k} disabled={disabled} onChange={() => onChange({ ...value, kind: k })} /> {word(k)}</label>) : null}
      <label htmlFor={`${id}-name`} className="block text-sm">{kind === 'organisation' ? 'Registered name' : kind === 'institution' ? 'Institution' : 'Full name, as written'}<input id={`${id}-name`} autoComplete={kind === 'person' ? 'name' : 'organization'} className={inputClass} value={value.name ?? ''} disabled={disabled} onChange={e => onChange({ ...value, kind, name: e.target.value })} /></label>
      <label htmlFor={`${id}-ref`} className="block text-sm">{kind === 'organisation' ? 'Registration number (if registered)' : 'Birth registration or identity number (if they have one)'}<input id={`${id}-ref`} dir="ltr" spellCheck={false} className={`${inputClass} max-w-md font-mono`} value={value.ref ?? ''} disabled={disabled} onChange={e => onChange({ ...value, kind, ref: e.target.value })} /></label>
    </div>
  );
}

function PartyList(p: FieldProps & { id: string }) {
  const list = Array.isArray(p.value) ? (p.value as Partial<PartyRef>[]) : [];
  const rows = list.length ? list : [{}];
  return (
    <Frame f={p.f} id={p.id} error={p.error} legend>
      {rows.map((r, i) => (
        <div key={i} className="mb-3 rounded-sm border border-line p-3">
          <p className="mb-2 text-sm font-semibold">{i + 1}</p>
          <PartyInputs id={`${p.id}-${i}`} f={p.f} value={r} disabled={p.disabled} onChange={v => { const next = [...rows]; next[i] = v as Partial<PartyRef>; p.onChange(next); }} />
          {rows.length > 1 ? <button type="button" className="mt-2 min-h-tap text-sm text-link underline focus-ring" onClick={() => p.onChange(rows.filter((_, j) => j !== i))}>Remove {i + 1}</button> : null}
        </div>
      ))}
      <button type="button" className="min-h-tap rounded-sm border border-line px-3 text-sm focus-ring" disabled={p.disabled} onClick={() => p.onChange([...rows, {}])}>Add another</button>
    </Frame>
  );
}

function ListOfText(p: FieldProps & { id: string }) {
  const list = Array.isArray(p.value) ? (p.value as string[]) : [];
  const rows = list.length ? list : [''];
  return (
    <Frame f={p.f} id={p.id} error={p.error} legend>
      {rows.map((r, i) => (
        <div key={i} className="mb-2 flex items-center gap-2">
          <input aria-label={`${p.f.label} ${i + 1}`} dir="ltr" className={`${inputClass} max-w-md font-mono`} value={r} disabled={p.disabled} onChange={e => { const next = [...rows]; next[i] = e.target.value; p.onChange(next.filter(Boolean)); }} />
          {rows.length > 1 ? <button type="button" className="min-h-tap text-sm text-link underline focus-ring" onClick={() => p.onChange(rows.filter((_, j) => j !== i))}>Remove</button> : null}
        </div>
      ))}
      <button type="button" className="min-h-tap rounded-sm border border-line px-3 text-sm focus-ring" disabled={p.disabled} onClick={() => p.onChange([...rows, ''])}>Add another</button>
    </Frame>
  );
}

function GroupInputs(p: FieldProps & { id: string }) {
  const items = p.f.items ?? [];
  const rows: Record<string, unknown>[] = p.f.multiple ? (Array.isArray(p.value) ? (p.value as Record<string, unknown>[]) : [{}]) : [((p.value && typeof p.value === 'object' && !Array.isArray(p.value) ? p.value : {}) as Record<string, unknown>)];
  const set = (i: number, k: string, v: unknown) => { const next = rows.map(r => ({ ...r })); next[i] = { ...next[i], [k]: v }; p.onChange(p.f.multiple ? next : next[0]); };
  return (
    <Frame f={p.f} id={p.id} error={p.error} legend>
      {rows.map((r, i) => (
        <div key={i} className={`mb-3 grid gap-4 ${p.f.multiple ? 'rounded-sm border border-line p-3' : ''}`}>
          {p.f.multiple ? <p className="text-sm font-semibold">{p.f.label} {i + 1}</p> : null}
          {items.map(it => <FormField key={it.key} f={it} value={r[it.key]} currency={p.currency} regions={p.regions} idPrefix={`${p.id}-${i}`} disabled={p.disabled} onChange={v => set(i, it.key, v)} />)}
          {p.f.multiple && rows.length > 1 ? <button type="button" className="min-h-tap justify-self-start text-sm text-link underline focus-ring" onClick={() => p.onChange(rows.filter((_, j) => j !== i))}>Remove {p.f.label.toLowerCase()} {i + 1}</button> : null}
        </div>
      ))}
      {p.f.multiple ? <button type="button" className="min-h-tap rounded-sm border border-line px-3 text-sm focus-ring" disabled={p.disabled} onClick={() => p.onChange([...rows, {}])}>Add another</button> : null}
    </Frame>
  );
}
