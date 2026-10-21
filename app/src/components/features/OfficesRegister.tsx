'use client';

// Offices of state and who holds them (/gov/configuration/offices; plan
// phase 4, audit F, H). The nation records its offices: title, kind,
// institution, references to powers recorded elsewhere, term, acting and
// succession rules, legal basis and dates. During first-run setup they are
// saved directly; afterwards a change is proposed citing the law and a
// different official confirms it (/api/offices, lib/nation/office-register.ts).
// Until the nation records a head of government, the one shown is derived
// from the executive title set in setup. Holding an office grants no
// permission. Beside it, the state's classification (§1.2): forms of state
// and government, territorial arrangements, legal traditions and recognised
// authority types, derived from the form of state until the nation records it.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import type { Ministry, OfficeHolding, SovereignProfile, StateClassification } from '@/lib/api/types';
import type { OfficeView } from '@/lib/nation/office-register';
import { classificationOf, CLASSIFICATION_CHOICES, PLATFORM_STYLES } from '@/lib/nation/classification';

interface Version { values: { title: string; kind: string; institution?: string; effectiveFrom: string }; basis: { title?: string; instrument: string; num?: string; eId: string }[]; by: string; at: string; expiresAt?: string; confirmed?: { by: string }; outcome?: string }
type Office = OfficeView & { changes?: { pending?: Version; history?: Version[] }; confirmBy: { id: string; name: string } | null };
interface Data { offices: Office[]; holdings: OfficeHolding[]; kinds: { key: string; label: string }[]; setupRunning: boolean }

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const AXES: { key: keyof typeof CLASSIFICATION_CHOICES; label: string }[] = [
  { key: 'stateForms', label: 'Form of state' }, { key: 'governmentForms', label: 'Form of government' },
  { key: 'territorialArrangements', label: 'Territorial arrangement' }, { key: 'legalTraditions', label: 'Legal traditions' },
  { key: 'authorityTypes', label: 'Recognised types of authority' },
];
const STATUS: Record<OfficeView['status'], string> = { 'in-force': 'In force', ended: 'Ended', scheduled: 'Applies later', proposed: 'Proposed, not adopted' };

export function OfficesRegister() {
  const [data, setData] = React.useState<Data | null>(null);
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [accounts, setAccounts] = React.useState<{ id: string; name: string; office?: string; institution?: string }[]>([]);
  const [profile, setProfile] = React.useState<SovereignProfile | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', kind: 'head-of-state', institution: '', powers: '', termYears: '', acting: '', succession: '', effectiveFrom: '', instrument: '', eId: '' });
  const [link, setLink] = React.useState({ officeId: '', accountId: '', from: '', acting: false, reason: '' });

  const load = React.useCallback(async () => {
    const r = await fetch('/api/offices', { cache: 'no-store' });
    if (r.ok) setData((await r.json()) as Data);
  }, []);
  React.useEffect(() => {
    void load();
    api.org.ministries().then(m => setMinistries(m.ministries.filter(x => x.status === 'active'))).catch(() => undefined);
    api.sovereign.get().then(s => setProfile(s.sovereign)).catch(() => undefined);
    fetch('/api/auth/officials', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j?.accounts) setAccounts(j.accounts); }).catch(() => undefined);
  }, [load]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/offices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
      await load();
      setMsg(done);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  };

  const submit = () => {
    const setup = data?.setupRunning;
    const body: Record<string, unknown> = {
      op: setup ? 'record' : 'propose', title: form.title, kind: form.kind, institution: form.institution || undefined,
      powers: form.powers.split('\n').map(p => p.trim()).filter(Boolean),
      ...(form.termYears ? { term: { years: Number(form.termYears) } } : {}),
      ...(form.acting ? { acting: form.acting } : {}), ...(form.succession ? { succession: form.succession } : {}),
      ...(form.effectiveFrom ? { effectiveFrom: form.effectiveFrom } : {}),
      legalBasis: form.instrument ? [{ instrument: form.instrument.trim(), eId: form.eId.trim() }] : [],
    };
    void post(body, setup ? 'Recorded during setup.' : 'Proposed: a different official confirms it before it takes effect.');
  };

  const cites = (v: Version) => v.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ');
  const officeTitle = (id: string) => data?.offices.find(o => o.id === id)?.title ?? id;
  const kindLabel = (k: string) => data?.kinds.find(x => x.key === k)?.label ?? k;
  const recorded = (data?.offices ?? []).filter(o => !o.derived);
  const classification = profile ? classificationOf(profile) : null;

  return (
    <div className="space-y-6">
      <Section title="Offices of state" meta="records, not titles">
        <p className="mb-3 text-xs text-ink-muted">
          Each office belongs to an institution and refers to powers recorded elsewhere (who is responsible, permit authorities, procedures), which are enforced there.
          Holding an office grants no permission by itself: what an official may do comes from their role and institution.
          {data?.setupRunning ? ' During setup, offices are saved directly.' : ' Setup is complete, so a change is proposed citing the law and takes effect when a different official confirms it.'}
        </p>
        <ul className="space-y-2">
          {(data?.offices ?? []).map(o => (
            <li key={o.id} className="rounded border border-line p-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span><strong>{o.title}</strong> <span className="text-xs text-ink-muted">· {kindLabel(o.kind)}{o.institutionName ? ` · ${o.institutionName}` : ''}</span></span>
                <span className="text-xs text-ink-muted">{o.derived ? 'From the executive title set in setup (no record yet)' : `${STATUS[o.status]}${o.effectiveFrom ? ` · from ${o.effectiveFrom}` : ''}${o.effectiveTo ? ` to ${o.effectiveTo}` : ''}`}</span>
              </div>
              {o.powers.length ? <p className="mt-1 text-xs text-ink-muted">Powers (references): {o.powers.join('; ')}</p> : null}
              {o.term || o.acting || o.succession ? (
                <p className="mt-1 text-xs text-ink-muted">
                  {o.term?.years ? `Term ${o.term.years} years${o.term.limit ? `, at most ${o.term.limit}` : ''}. ` : ''}
                  {o.acting ? `Acting: ${o.acting}. ` : ''}{o.succession ? `Succession: ${o.succession}.` : ''}
                </p>
              ) : null}
              {o.basis?.length ? <p className="mt-1 text-xs text-ink-muted">Legal basis: {o.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}</p> : null}
              <p className="mt-1 text-xs text-ink-muted">Held by: {o.holders.length ? o.holders.map(h => `${h.acting ? 'acting ' : ''}${h.name} since ${h.from}`).join('; ') : 'nobody linked'}</p>
              {o.changes?.pending ? (
                <div className="mt-2 rounded border border-line p-2">
                  <p className="text-xs"><strong>Waiting for a second official:</strong> {o.changes.pending.values.title} from {o.changes.pending.values.effectiveFrom} · proposed by {o.changes.pending.by} · basis {cites(o.changes.pending)}{o.confirmBy ? ` · confirmed by ${o.confirmBy.name}` : ''}</p>
                  <div className="mt-1 flex gap-2">
                    <Button variant="primary" disabled={busy} onClick={() => void post({ op: 'confirm', id: o.id }, 'Confirmed.')}>Confirm</Button>
                    <Button disabled={busy} onClick={() => void post({ op: 'withdraw', id: o.id }, 'Withdrawn.')}>Withdraw</Button>
                  </div>
                </div>
              ) : null}
              {o.changes?.history?.length ? (
                <details className="mt-1 text-xs text-ink-muted">
                  <summary className="cursor-pointer">Earlier versions ({o.changes.history.length})</summary>
                  <ul className="mt-1 space-y-0.5">{[...o.changes.history].reverse().map((h, i) => <li key={i}>{h.outcome} · {h.values.title} · proposed by {h.by}{h.confirmed ? `, confirmed by ${h.confirmed.by}` : ''} · {h.at.slice(0, 10)}</li>)}</ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-sm font-semibold">{data?.setupRunning ? 'Record an office' : 'Propose an office'}</h3>
        <div className="mt-1 grid gap-2 md:grid-cols-2">
          <label className="text-sm">Official title<input className={field} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="text-sm">Kind of office
            <select className={field} value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
              {(data?.kinds ?? []).map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          <label className="text-sm">Institution
            <select className={field} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}>
              <option value="">Not named</option>
              {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Applies from (YYYY-MM-DD)<input className={field} value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} placeholder="today" /></label>
          <label className="text-sm md:col-span-2">Powers: one reference per line (recorded and enforced elsewhere)<textarea className={field} rows={2} value={form.powers} onChange={e => setForm(f => ({ ...f, powers: e.target.value }))} /></label>
          <label className="text-sm">Term in years<input className={field} inputMode="numeric" value={form.termYears} onChange={e => setForm(f => ({ ...f, termYears: e.target.value }))} /></label>
          <label className="text-sm">Who acts when it is vacant<input className={field} value={form.acting} onChange={e => setForm(f => ({ ...f, acting: e.target.value }))} /></label>
          <label className="text-sm md:col-span-2">How it passes on (succession)<input className={field} value={form.succession} onChange={e => setForm(f => ({ ...f, succession: e.target.value }))} /></label>
          <label className="text-sm">Legal basis: law (id from Laws){data?.setupRunning ? ' (optional in setup)' : ''}<input className={field} value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision (e.g. sec_3)<input className={field} value={form.eId} onChange={e => setForm(f => ({ ...f, eId: e.target.value }))} /></label>
        </div>
        <div className="mt-2"><Button variant="primary" disabled={busy || !form.title} onClick={submit}>{data?.setupRunning ? 'Record the office' : 'Propose the office'}</Button></div>
      </Section>

      <Section title="Who holds an office" meta="linked by one official, confirmed by another">
        <p className="mb-3 text-xs text-ink-muted">An administrator of the office&apos;s institution links an official; a different official confirms it. Ending a holding keeps it with its end date and reason. No permission follows from holding an office.</p>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
          <label className="text-sm">Office
            <select className={field} value={link.officeId} onChange={e => setLink(l => ({ ...l, officeId: e.target.value }))}>
              <option value="">Choose…</option>
              {recorded.filter(o => o.inForce).map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          <label className="text-sm">Official
            <select className={field} value={link.accountId} onChange={e => setLink(l => ({ ...l, accountId: e.target.value }))}>
              <option value="">Choose…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.office ? ` · ${a.office}` : ''}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-1 text-sm"><input type="checkbox" checked={link.acting} onChange={e => setLink(l => ({ ...l, acting: e.target.checked }))} />Acting</label>
          <div className="flex items-end"><Button variant="primary" disabled={busy || !link.officeId || !link.accountId} onClick={() => void post({ op: 'link', officeId: link.officeId, accountId: link.accountId, acting: link.acting }, 'Linked: a different official confirms it.')}>Link</Button></div>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {(data?.holdings ?? []).map(h => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-2 py-1">
              <span>{h.acting ? 'Acting ' : ''}{officeTitle(h.officeId)}: <strong>{h.holderName}</strong> <span className="text-xs text-ink-muted">· {h.state} · from {h.from}{h.to ? ` to ${h.to}` : ''} · linked by {h.proposedBy}{h.confirmedBy ? `, confirmed by ${h.confirmedBy}` : ''}{h.endReason ? ` · ${h.endReason}` : ''}</span></span>
              {h.state === 'waiting' ? (
                <span className="flex gap-2">
                  <Button variant="primary" disabled={busy} onClick={() => void post({ op: 'confirm-link', holding: h.id }, 'Confirmed.')}>Confirm</Button>
                  <Button disabled={busy} onClick={() => void post({ op: 'end-link', holding: h.id }, 'Withdrawn.')}>Withdraw</Button>
                </span>
              ) : h.state === 'active' ? (
                <Button disabled={busy} onClick={() => { const reason = window.prompt('Why does the holding end? (term ended, resignation, removal under the law)'); if (reason) void post({ op: 'end-link', holding: h.id, reason }, 'Ended.'); }}>End</Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <ClassificationPanel profile={profile} classification={classification} onSaved={p => setProfile(p)} />
      {msg ? <p role="status" className="text-xs text-ink-muted">{msg}</p> : null}
    </div>
  );
}

function ClassificationPanel({ profile, classification, onSaved }: { profile: SovereignProfile | null; classification: (StateClassification & { derived: boolean }) | null; onSaved: (p: SovereignProfile) => void }) {
  const [edit, setEdit] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!classification) return;
    setEdit({ ...Object.fromEntries(AXES.map(a => [a.key, classification[a.key].join(', ')])), style: classification.style ?? '', sources: (classification.sources ?? []).join('\n'), effectiveFrom: classification.effectiveFrom ?? '' });
  }, [classification]);
  if (!profile || !classification) return null;
  const save = async () => {
    setMsg(null);
    const c = {
      ...Object.fromEntries(AXES.map(a => [a.key, (edit[a.key] ?? '').split(',').map(x => x.trim()).filter(Boolean)])),
      ...(edit.style ? { style: edit.style } : {}),
      sources: (edit.sources ?? '').split('\n').map(x => x.trim()).filter(Boolean),
      ...(edit.effectiveFrom ? { effectiveFrom: edit.effectiveFrom } : {}),
    };
    try {
      const r = await api.sovereign.update({ constitution: { ...(profile.constitution ?? {}), classification: c as unknown as StateClassification } });
      onSaved(r.sovereign); setMsg('Saved.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); }
  };
  return (
    <Section title="Classification of the state" meta={classification.derived ? 'derived from the form of state' : 'recorded by the nation'}>
      <p className="mb-3 text-xs text-ink-muted">
        Several values on each axis (separate them with commas), with where they come from and from when. Until the nation records them they are derived from the form of state chosen in setup, and only what that form already says.
        The style sets how the platform names itself on the front door.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {AXES.map(a => (
          <label key={a.key} className="text-sm">{a.label}
            <input className={field} value={edit[a.key] ?? ''} onChange={e => setEdit(x => ({ ...x, [a.key]: e.target.value }))} placeholder={CLASSIFICATION_CHOICES[a.key].slice(0, 3).join(', ')} />
          </label>
        ))}
        <label className="text-sm">Style
          <select className={field} value={edit.style ?? ''} onChange={e => setEdit(x => ({ ...x, style: e.target.value }))}>
            {PLATFORM_STYLES.map(s => <option key={s.key} value={s.key}>{s.label} · {s.platform}</option>)}
          </select>
        </label>
        <label className="text-sm">Applies from (YYYY-MM-DD)<input className={field} value={edit.effectiveFrom ?? ''} onChange={e => setEdit(x => ({ ...x, effectiveFrom: e.target.value }))} /></label>
        <label className="text-sm md:col-span-2">Sources: one instrument per line<textarea className={field} rows={2} value={edit.sources ?? ''} onChange={e => setEdit(x => ({ ...x, sources: e.target.value }))} /></label>
      </div>
      <div className="mt-2 flex items-center gap-3"><Button variant="primary" onClick={() => void save()}>Save the classification</Button>{msg ? <span role="status" className="text-xs text-ink-muted">{msg}</span> : null}</div>
    </Section>
  );
}
