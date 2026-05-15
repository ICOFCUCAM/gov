import { ConsoleShell } from '@/components/ui/ConsoleShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { Plain } from '@/components/ui/Plain';
import { SignDialog } from '@/components/features/SignDialog';

const queue = [
  {
    id: 'C-7842',
    name: 'Amina H. Mwangi',
    type: 'Child grant renewal',
    pills: [
      { tone: 'ok' as const, text: '⚑ verified' },
      { tone: 'neutral' as const, text: '✓ AI draft' },
    ],
    active: true,
  },
  { id: 'C-7843', name: 'J. Wambui', type: 'Address change', pills: [{ tone: 'neutral' as const, text: 'standard' }] },
  { id: 'C-7844', name: 'M. Kibet', type: 'Drought supplement', pills: [{ tone: 'warn' as const, text: '⚠ flagged for review' }] },
  { id: 'C-7845', name: 'Anonymous', type: 'Complaint about an agent', pills: [] },
];

export default function OfficerConsolePage() {
  return (
    <ConsoleShell
      topbar={
        <>
          <div>
            <strong>CivicOS Officer Console</strong>
            <span className="text-ink-muted">
              {' '}· K. Otieno · Social Protection, Nairobi · ⏱ 09:14 EAT
            </span>
          </div>
          <nav className="flex gap-3 text-sm">
            <a href="#" className="underline underline-offset-2">Queue 12</a>
            <a href="#" className="underline underline-offset-2">Today's work</a>
            <a href="#" className="underline underline-offset-2">Knowledge</a>
            <a href="#" className="underline underline-offset-2">My day</a>
            <a href="#" className="underline underline-offset-2">🔔 2</a>
            <a href="#" className="underline underline-offset-2">Help</a>
          </nav>
        </>
      }
      left={
        <Card>
          <h3 className="text-lg font-semibold">Queue</h3>
          <div className="space-y-2 mt-2">
            {queue.map(q => (
              <a
                key={q.id}
                href="#"
                className={`block p-3 border rounded-sm no-underline text-ink hover:bg-surface-2 ${
                  q.active ? 'border-class-b' : 'border-line'
                }`}
              >
                <strong>{q.id} · {q.name}</strong>
                <div className="text-sm text-ink-muted">{q.type}</div>
                <div className="flex gap-1 flex-wrap mt-1">
                  {q.pills.map(p => (
                    <Pill key={p.text} tone={p.tone}>{p.text}</Pill>
                  ))}
                </div>
              </a>
            ))}
            <p className="text-ink-muted text-sm">… 8 more</p>
          </div>
          <hr className="border-line my-3" />
          <div className="text-sm text-ink-muted space-y-1">
            <div>Load: 12 cases</div>
            <div>Today's pace: <Pill tone="ok">on track</Pill></div>
            <div>Next break: <strong>11:00</strong> (protected)</div>
          </div>
        </Card>
      }
      center={
        <Card>
          <div className="flex justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl font-semibold leading-tight">Case C-7842 — Amina Hassan Mwangi</h2>
              <div className="text-ink-muted">Child grant renewal · Submitted 14 May 09:02 · SLA 17 May</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary">Show full record</Button>
              <Button variant="secondary">Citizen contact</Button>
            </div>
          </div>

          <hr className="border-line my-4" />

          <h3 className="text-lg font-semibold">Citizen context (only what's needed for this decision)</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mother of two children, both registered</li>
            <li>Household income band 3 (last verified 14 mo ago — see how)</li>
            <li>In drought-eligible region</li>
            <li>One previous renewal, on time</li>
          </ul>
          <p className="text-sm text-ink-muted mt-1">
            No political, religious, or other protected attributes shown. Profile-style dossiers are not available.
          </p>
        </Card>
      }
      right={
        <>
          <CopilotPanel decisionClass="B">
            <h4 className="font-semibold mt-0">Eligibility summary</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Children verified (2) — civil registry link</li>
              <li>Income band confirmed — last verification 14 mo ago, slightly over the 12 mo policy refresh window. <em>Recommend re-verifying at next cycle.</em></li>
              <li>Drought supplement applies — Decree DRC-2026-04</li>
            </ul>

            <h4 className="font-semibold">Draft decision</h4>
            <p>
              <strong>APPROVE renewal at base rate + drought supplement (KES 2,400/month).</strong>{' '}
              Re-verification recommended at next cycle.
            </p>

            <h4 className="font-semibold">Where I'm uncertain</h4>
            <Plain>
              Income band verification is 14 months old, slightly past the 12 mo
              policy window. Two defensible paths: approve and flag for next
              cycle, or pause for fresh verification.
            </Plain>

            <div className="flex flex-wrap gap-2 mt-2">
              <Button>Use this draft</Button>
              <Button variant="secondary">Edit</Button>
              <Button variant="secondary">Reject</Button>
              <Button variant="ghost">See sources</Button>
            </div>
          </CopilotPanel>

          <Card>
            <h3 className="text-lg font-semibold">Your decision</h3>
            <div className="space-y-2 mt-2">
              {[
                'Approve renewal at base + drought (default from draft)',
                'Approve at base only',
                'Request income re-verification first',
                'Decline',
                'Refer to specialist',
              ].map((label, i) => (
                <label key={label} className="flex items-start gap-2 p-3 border border-line rounded-sm hover:bg-surface-2 cursor-pointer">
                  <input type="radio" name="decision" defaultChecked={i === 0} className="mt-1" />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <label htmlFor="notes-citizen" className="block font-medium mb-1">Notes for the citizen (on receipt)</label>
              <textarea
                id="notes-citizen"
                className="w-full min-h-[80px] p-3 border border-line rounded-sm bg-surface"
                placeholder="In plain language…"
              />
            </div>
            <div className="mt-3">
              <label htmlFor="notes-internal" className="block font-medium mb-1">Internal notes (not on receipt)</label>
              <textarea
                id="notes-internal"
                className="w-full min-h-[80px] p-3 border border-line rounded-sm bg-surface"
                placeholder="For audit and team handover"
              />
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <SignDialog
                decisionId="C-7842"
                officerName="K. Otieno"
                summary="APPROVE child grant renewal — base + drought supplement (KES 2,400/month)"
                decisionClass="B"
              />
              <Button variant="secondary">Save and return later</Button>
              <Button variant="secondary">Ask supervisor</Button>
              <Button variant="secondary">Refer to specialist</Button>
            </div>
          </Card>
        </>
      }
    />
  );
}
