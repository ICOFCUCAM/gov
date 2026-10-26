'use client';

// Territory and infrastructure for the console (plan step I7): the land
// registry's dealings and disputes (lib/land), planning, building control and
// housing (lib/building, lib/housing), local and regional governments
// (lib/localgov) and transport (lib/transport). Each view reads its register
// through its own route and lists the cases of its procedures; cases move only
// through their own pages (/gov/cases/{id}). Parties, holders, keepers and
// applicants are never shown here: a parcel's rights are on its own record,
// for those who may see them.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { SignalTag } from '@/components/ui/SignalTag';

type Area = 'land' | 'building' | 'local' | 'transport';
interface CaseRow { id: string; ref: string; stage: string; package: { key: string }; source?: string }
interface ProcRow { key: string; title: string; versions: { version: number; state: string }[] }
type Json = Record<string, unknown> & { procedures?: ProcRow[] };

const TITLE: Record<Area, string> = {
  land: 'Land dealings and disputes', building: 'Planning, building control and housing', local: 'Local and regional government', transport: 'Transport registers',
};
const API: Record<Area, string> = { land: '/api/land', building: '/api/building', local: '/api/local-government', transport: '/api/transport' };
const INTRO: Record<Area, React.ReactNode> = {
  land: <>Transfers, leases, mortgages, easements, caveats and their discharge and corrections, each a case of the land registry the nation names under <Link className="underline" href="/gov/configuration/responsible#who-is-responsible">Who is responsible</Link>: lodged with its instrument, the parties verified, registered by two officials as a new version of the parcel, the earlier state kept. A dispute holds the interest it concerns until it is decided; nothing releases it on its own. Rights and holders are shown only on a parcel&rsquo;s own record, in <Link className="underline" href="/gov/sites/parcels">Land parcels</Link>.</>,
  building: <>Planning applications and building permits on registered parcels, decided against the nation&rsquo;s building control rules (adopted by two officials citing the law; the version on every decision). Planning permission, building approval, construction and occupancy are separate states. Housing programmes allocate homes only by their approved eligibility and priority rules, an official deciding with reasons.</>,
  local: <>Each regional or local government works its own council resolutions, budgets, service requests and complaints. Officials serving the whole government neither act on nor read them; the centre reads only under an approved <Link className="underline" href="/gov/configuration/relationships">relationship</Link>, every read in the access log.</>,
  transport: <>Vehicle registration, driving licences, permits for works in public roads and transport operator licences: four separate records, each kept by the body the nation names. Keepers and licence holders are never listed; medical fitness is only a sealed document&rsquo;s reference.</>,
};

const cell = 'border-t border-line px-2 py-1 align-top';
function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead><tr>{head.map(h => <th key={h} className="px-2 py-1 font-medium text-ink-muted">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cell}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
const sample = (x: { sample?: boolean }) => (x.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null);
const named = (x: unknown) => (x && typeof x === 'object' && 'name' in x ? String((x as { name: string }).name) : <span className="text-ink-muted">not named yet</span>);

export function TerritoryDesk({ area }: { area: Area }) {
  const [data, setData] = React.useState<Json | null>(null);
  const [cases, setCases] = React.useState<CaseRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [parcel, setParcel] = React.useState('');
  const [parcelView, setParcelView] = React.useState<Json | null>(null);

  React.useEffect(() => {
    void (async () => {
      const r = await fetch(API[area], { cache: 'no-store' });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) { setErr(j?.error ?? 'Could not read the register'); return; }
      setData(j);
      const keys: string[] = area === 'local'
        ? ((j.localGovernments ?? []) as { procedures: { key: string }[] }[]).flatMap(l => l.procedures.map(p => p.key))
        : ((j.procedures ?? []) as ProcRow[]).map(p => p.key);
      const out: CaseRow[] = [];
      for (const k of keys) {
        const c = await fetch(`/api/cases?procedure=${encodeURIComponent(k)}&limit=50`, { cache: 'no-store' });
        const cj = await c.json().catch(() => null);
        if (c.ok && cj?.cases) out.push(...cj.cases);
      }
      setCases(out);
    })();
  }, [area]);

  const lookParcel = async () => {
    const r = await fetch(`${API[area]}?parcel=${encodeURIComponent(parcel)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    setParcelView(r.ok ? j : { error: j?.error ?? 'Not found' });
  };

  const procs = (data?.procedures ?? []) as ProcRow[];
  const caseRows = cases.map(c => [<Link key="r" className="underline" href={`/gov/cases/${c.id}`}>{c.ref}</Link>, c.package.key, c.stage, sample({ sample: c.source === 'sample' })]);
  return (
    <div className="space-y-5 p-4">
      <h1 className="text-xl font-semibold">{TITLE[area]}</h1>
      <p className="max-w-3xl text-sm text-ink-muted">{INTRO[area]}</p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {data ? <AreaView area={area} data={data} /> : <p className="text-sm text-ink-muted">Reading the register…</p>}
      {area === 'land' || area === 'building' ? (
        <Section title="One parcel">
          <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void lookParcel(); }}>
            <label className="text-xs">Parcel (record number or national parcel id)<input className="mt-1 block rounded border border-line bg-surface px-2 py-1 text-sm" value={parcel} onChange={e => setParcel(e.currentTarget.value)} /></label>
            <button type="submit" className="rounded border border-line px-2 py-1 text-sm">Show</button>
          </form>
          {parcelView ? <ParcelView area={area} v={parcelView} /> : null}
        </Section>
      ) : null}
      {area !== 'local' ? (
        <Section title="Procedures" meta="reference drafts until two officials approve the nation's version">
          <Table head={['Procedure', 'Title', 'Versions']} empty="No procedure installed." rows={procs.map(p => [p.key, p.title, p.versions.length ? p.versions.map(v => `v${v.version} ${v.state}`).join(', ') : 'not drafted'])} />
        </Section>
      ) : null}
      <Section title="Cases" meta={`${cases.length} you may see`}>
        <Table head={['Case', 'Procedure', 'Stage', '']} empty="No case yet." rows={caseRows} />
      </Section>
    </div>
  );
}

function ParcelView({ area, v }: { area: Area; v: Json }) {
  if (v.error) return <p role="alert" className="text-sm text-alert">{String(v.error)}</p>;
  const p = v.parcel as { id: string; parcelId: string; version: number };
  if (area === 'land') {
    const held = (v.held ?? []) as { interest: string; case: string; since: string }[];
    return (
      <div className="space-y-2 text-sm">
        <p>Parcel <Link className="underline" href={`/gov/sites/parcels?parcel=${encodeURIComponent(p.id)}`}>{p.parcelId}</Link> · version {p.version} · {held.length ? <strong className="text-warn">{held.map(h => `${h.interest} held by ${h.case}`).join('; ')}</strong> : 'no interest held by a dispute'}</p>
        <Table head={['Transaction', 'Kind', 'Interest', 'Effective', 'Versions', 'Case', 'Parties']} empty="No registered transaction."
          rows={((v.transactions ?? []) as Record<string, unknown>[]).map(t => [String(t.number), String(t.kind), String(t.interest), String(t.effective), `${(t.versions as { before: number; after: number }).before} → ${(t.versions as { after: number }).after}`, String((t.case as { ref: string }).ref), t.partiesHidden ? 'shown only to those with need' : ((t.parties as { receiving: { holder: string }[] }).receiving.map(r => r.holder).join(', '))])} />
        <Table head={['Dispute', 'Kind', 'Interest', 'State', 'Outcome']} empty="No dispute."
          rows={((v.disputes ?? []) as Record<string, unknown>[]).map(d => [String(d.number), String(d.kind), String(d.interest), String(d.state), d.outcome ? String((d.outcome as { result: string }).result) : '—'])} />
      </div>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p>Parcel {p.parcelId} · version {p.version}</p>
      <Table head={['Planning decision', 'Use', 'Outcome', 'On parcel version', 'Rules']} empty="No planning decision."
        rows={((v.planning ?? []) as Record<string, unknown>[]).map(d => [String(d.number), String(d.proposedUse), String(d.outcome), String((d.parcel as { version: number }).version), `v${(d.rules as { version: number }).version}`])} />
      <PermitTable permits={(v.permits ?? []) as Permit[]} />
    </div>
  );
}

interface Permit { number: string; category: string; use: string; approvedDesign?: number; designs: unknown[]; permit: { state: string }; construction: { state: string }; occupancy: { state: string; certificate?: string }; inspections: string[]; sample?: boolean; case: { id: string; ref: string } }
function PermitTable({ permits }: { permits: Permit[] }) {
  return <Table head={['Permit', 'Category and use', 'Building approval', 'Construction', 'Occupancy', 'Design', 'Inspections', '']} empty="No building permit."
    rows={permits.map(x => [<Link key="c" className="underline" href={`/gov/cases/${x.case.id}`}>{x.number}</Link>, `${x.category} · ${x.use}`, x.permit.state, x.construction.state, `${x.occupancy.state}${x.occupancy.certificate ? ` (${x.occupancy.certificate})` : ''}`, x.approvedDesign ? `version ${x.approvedDesign} of ${x.designs.length} approved` : `${x.designs.length} submitted`, String(x.inspections.length), sample(x)])} />;
}

function AreaView({ area, data }: { area: Area; data: Json }) {
  if (area === 'land') {
    const c = data.counts as { transactions: number; disputes: number; held: number; referred: number };
    return (
      <Section title="Land registry" meta={<>Registry: {named(data.registry)} · cadastre: {named(data.cadastre)}</>}>
        <p className="text-sm">{c.transactions} registered transaction(s) · {c.disputes} dispute(s), {c.held} holding an interest, {c.referred} referred</p>
        <Table head={['Transaction', 'Kind', 'Parcel', 'Interest', 'Effective', 'Case', '']} empty="No registered transaction yet."
          rows={((data.transactions ?? []) as Record<string, unknown>[]).map(t => [String(t.number), String(t.kind), String((t.parcel as { parcelId: string }).parcelId), String(t.interest), String(t.effective), String((t.case as { ref: string }).ref), sample(t as { sample?: boolean })])} />
        <Table head={['Dispute', 'Kind', 'Parcel', 'Interest held', 'State']} empty="No dispute."
          rows={((data.disputes ?? []) as Record<string, unknown>[]).map(d => [String(d.number), String(d.kind), String((d.parcel as { parcelId: string }).parcelId), String(d.interest), String(d.state)])} />
      </Section>
    );
  }
  if (area === 'building') {
    const rules = data.rules as { version: number; categories: string[]; uses: string[]; checklists: { stage: string; items: string[] }[]; severities: string[] } | null;
    const c = data.counts as { planning: number; permits: number; permitted: number; underConstruction: number; stopped: number; occupancy: number; inspections: number; housing: { programmes: number; homes: number; available: number; applications: number; allocated: number; outOfOrder: number } };
    return (
      <>
        <Section title="Building control rules" meta={<>Authority: {named(data.buildingControl)}</>}>
          {rules ? <p className="text-sm">Version {rules.version}: categories {rules.categories.join(', ')} · uses {rules.uses.join(', ')} · inspection stages {rules.checklists.map(x => `${x.stage} (${x.items.length} items)`).join(', ')} · severities {rules.severities.join(', ')}</p>
            : <p className="text-sm text-ink-muted">No rules adopted: nothing is decided until two officials of the building control authority adopt them citing the law.</p>}
        </Section>
        <Section title="Planning decisions and permits" meta={`${c.planning} planning · ${c.permits} permits, ${c.permitted} approved, ${c.underConstruction} under construction, ${c.stopped} stopped, ${c.occupancy} occupancy certified · ${c.inspections} inspections`}>
          <Table head={['Planning decision', 'Parcel', 'Use', 'Outcome', 'Conditions', 'Rules']} empty="No planning decision yet."
            rows={((data.planning ?? []) as Record<string, unknown>[]).map(d => [String(d.number), `${(d.parcel as { parcelId: string; version: number }).parcelId} v${(d.parcel as { version: number }).version}`, String(d.proposedUse), String(d.outcome), String((d.conditions as string[]).length), `v${(d.rules as { version: number }).version}`])} />
          <PermitTable permits={(data.permits ?? []) as Permit[]} />
          <Table head={['Inspection', 'Permit', 'Stage', 'Inspector', 'Result', 'Findings', 'Reasons']} empty="No inspection yet."
            rows={((data.inspections ?? []) as Record<string, unknown>[]).map(i => [String(i.number), String(i.permit), String(i.stage), String((i.inspector as { name: string }).name), String(i.result), (i.findings as { item: string; observation: string; severity: string }[]).map(f => `${f.item}: ${f.observation} (${f.severity})`).join('; ') || '—', String(i.reasons)])} />
        </Section>
        <Section title="Housing programmes" meta={<>Authority: {named(data.housing)} · {c.housing.homes} homes, {c.housing.available} available · {c.housing.applications} applications, {c.housing.allocated} allocated{c.housing.outOfOrder ? `, ${c.housing.outOfOrder} out of priority order with reasons` : ''}</>}>
          <Table head={['Programme', 'Title', 'Terms', 'Criteria', 'Priority factors', 'Homes']} empty="No programme registered."
            rows={((data.programmes ?? []) as Record<string, unknown>[]).map(p => { const t = (p.terms as { n: number; eligibility: { label: string }[]; priority: { label: string; points: number }[] }[]).at(-1)!; return [String(p.number), String(p.title), `version ${t.n}`, t.eligibility.map(e => e.label).join('; '), t.priority.map(f => `${f.label} (${f.points})`).join('; '), `${(p.units as { state: string }[]).filter(u => u.state === 'available').length} of ${(p.units as unknown[]).length} available`]; })} />
        </Section>
      </>
    );
  }
  if (area === 'local') {
    const ls = (data.localGovernments ?? []) as { id: string; name: string; rules: { version: number; seats: number; quorum: { kind: string; value: number }; majority: string } | null; counts: { resolutions: number; budgets: number; requests: number; open: number }; procedures: { key: string; title: string; versions: { version: number; state: string }[] }[] }[];
    return (
      <Section title="Local governments" meta="institutions recorded as regional or local governments">
        <Table head={['Local government', 'Council rules', 'Resolutions', 'Budgets', 'Requests', 'Procedures']} empty="No institution is recorded as a regional or local government (its standing is set in the institution register)."
          rows={ls.map(l => [l.name, l.rules ? `v${l.rules.version}: ${l.rules.seats} seats, quorum ${l.rules.quorum.kind === 'count' ? l.rules.quorum.value : `${Math.round(l.rules.quorum.value * 100)}% of seats`}, ${l.rules.majority} majority` : 'none adopted', String(l.counts.resolutions), String(l.counts.budgets), `${l.counts.requests} (${l.counts.open} open)`, l.procedures.map(p => `${p.title.replace(/ \(.*\)$/, '')}: ${p.versions.length ? p.versions.map(v => v.state).join(', ') : 'not adopted'}`).join(' · ')])} />
      </Section>
    );
  }
  const b = data.bodies as Record<string, unknown>;
  const c = data.counts as { vehicles: number; licences: number; roadworks: number; operators: number };
  return (
    <Section title="Registers" meta={<>Vehicles and licences: {named(b.vehicleRegistration)} · roads: {named(b.roadAuthority)} · operators: {named(b.transportRegulator)}</>}>
      <p className="text-sm">{c.vehicles} vehicles registered · {c.licences} valid licences · {c.roadworks} road works permits · {c.operators} operators licensed</p>
      <Table head={['Vehicle', 'Mark', 'Category', 'Make', 'Keepers', 'Events']} empty="No vehicle registered yet."
        rows={((data.vehicles ?? []) as Record<string, unknown>[]).map(v => [String(v.number), String(v.mark), String(v.category), String(v.make), String(v.keepers), String(v.events)])} />
      <Table head={['Licence', 'Categories', 'Valid until', 'State']} empty="No licence issued yet."
        rows={((data.licences ?? []) as Record<string, unknown>[]).map(l => [String(l.number), (l.categories as string[]).join(', '), String(l.validUntil), String(l.state)])} />
      <Table head={['Road works', 'Road', 'Where', 'From', 'To', 'Closure']} empty="No road works permitted yet."
        rows={((data.roadworks ?? []) as Record<string, unknown>[]).map(r => [String(r.number), String(r.road), String((r.place as { district?: string; region?: string }).district ?? (r.place as { region?: string }).region ?? '—'), String((r.window as { from: string }).from), String((r.window as { to: string }).to), r.closure ? 'yes' : 'no'])} />
      <Table head={['Operator licence', 'Organisation', 'Class', 'Fleet', 'Areas']} empty="No operator licensed yet."
        rows={((data.operators ?? []) as Record<string, unknown>[]).map(o => [String(o.number), String(o.organisation), String(o.operatorClass), String((o.fleet as string[]).length), (o.areas as string[]).join(', ')])} />
    </Section>
  );
}
