import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { charters } from '@/lib/charters/registry';

export default function MinistryControlPage() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="px-6 py-4 border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div>
            <strong>Ministry of Social Protection</strong>
            <span className="text-ink-muted">
              {' '}· Director General L. Mwakio · Tuesday 14 May 2026 · Daily standup at 09:30
            </span>
          </div>
          <nav className="flex gap-3 text-sm">
            <a href="#" className="underline underline-offset-2">Programs</a>
            <a href="#" className="underline underline-offset-2">Cabinet view</a>
            <a href="#" className="underline underline-offset-2">My day</a>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-lg font-semibold mt-0">Today's service</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Citizens served (rolling 7d): <strong>~98,400</strong></li>
              <li>Median time to decision: <strong>2.3 days</strong></li>
              <li>Contestation rate (Class B): <strong>1.4%</strong></li>
              <li>Contestation reversal rate: <strong>6.1%</strong></li>
              <li>Disbursements yesterday: <strong>KES 412M</strong> — all reconciled to Audit Vault</li>
            </ul>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mt-0">Equity stratification (last 30 days)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>By language: <Pill tone="ok">nominal</Pill> across 11 languages</li>
              <li>By district: <Pill tone="warn">2 amber</Pill></li>
              <li className="text-ink-muted ml-4">→ Tana Delta (▼9%) — investigation open</li>
              <li className="text-ink-muted ml-4">→ Garbatulla (▼7%) — root cause: data freshness</li>
              <li>By age band 65+: <Pill tone="warn">amber (▼12%)</Pill> — root cause analysis in flight</li>
            </ul>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-lg font-semibold mt-0">Open programs</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Child grant — steady</li>
              <li>Drought supplement — active</li>
              <li>Pension uplift Q3 — pilot</li>
              <li>Emergency disbursement (Tana NCCC) — sunset 21 May</li>
              <li>Disability accommodation review</li>
              <li>School-feeding alignment</li>
            </ul>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mt-0">Constitutional officer findings (live)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Algorithmic Ombudsman:</strong> CH-014 tripwire fire — automation halted, manual review</li>
              <li><strong>Auditor General:</strong> spot-check scheduled 15 May</li>
              <li><strong>Inspector General:</strong> 1 anonymous complaint about an agent — routine</li>
              <li><strong>People's Editor:</strong> revised plain-language template — awaiting deploy</li>
              <li><strong>Future Generations:</strong> 30-year review of child welfare in progress</li>
            </ul>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-lg font-semibold mt-0">Officer wellbeing (aggregate)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pace within ceiling: <strong>96%</strong></li>
              <li>Voluntary wellbeing pulse participation: <strong>78%</strong> · sentiment nominal</li>
              <li>4 officers above ceiling for 3+ days — <Pill tone="warn">⚐ supervisor action needed</Pill></li>
              <li>Rotation health: <Pill tone="ok">green</Pill></li>
            </ul>
            <p className="text-sm text-ink-muted mt-2">No individual officer data is drillable from this panel.</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mt-0">Civil society engagement</h3>
            <p>Active standing-access partners: <strong>12</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Disability Alliance — stratification by disability category <Pill>fulfillable</Pill></li>
              <li>Kenya Red Cross — emergency disbursement audit access <Pill>fulfillable</Pill></li>
              <li>Children's Rights Coalition — school-feeding review <Pill tone="warn">needs Education alignment</Pill></li>
            </ul>
            <p className="text-sm text-ink-muted mt-2">Next partnership meeting: 22 May.</p>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold mt-0">AI charters in your ministry</h3>
          <ul className="list-disc pl-5 space-y-1">
            {charters.map(c => {
              const tone =
                c.status === 'halted' ? 'alert' :
                c.status === 'amber'  ? 'warn'  :
                c.status === 'green'  ? 'ok'    : 'neutral';
              const label =
                c.status === 'halted' ? 'HALTED (tripwire fire)' :
                c.status.toUpperCase();
              return (
                <li key={c.id}>
                  <strong>{c.id} — {c.title}</strong>{' '}
                  (Class {c.decisionClass}) — <Pill tone={tone as 'alert'|'warn'|'ok'|'neutral'}>{label}</Pill>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-ink-muted mt-2">Renewals due Q3: 2 · Replacement drill scheduled 30 May (CH-017).</p>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mt-0">Citizen voice (aggregated, plain language)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>"It came on time this month, thank you." — Citizen, Mombasa</li>
            <li>"Why is it less than last month?" — Citizen, Garissa (5 similar today)</li>
            <li>"The Pokomo-language reminder helped my mother." — Citizen, Tana</li>
          </ul>
          <p className="text-sm text-ink-muted mt-2">
            Sample of 12 citizen comments today. <a href="#" className="text-link underline">Open civic voice</a>.
          </p>
        </Card>

        <p className="text-sm text-ink-muted text-center pt-2">
          What this room cannot show: individual citizen records · individual officer click data ·
          citizen political affiliations · officer political affiliations · any per-individual surveillance.
          Per Companion 156 and Companion 158.
        </p>
      </div>
    </main>
  );
}
