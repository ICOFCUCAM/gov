import { WallPanel } from '@/components/ui/WallPanel';
import { Pill } from '@/components/ui/Pill';
import { ClassBanner } from '@/components/ui/ClassBanner';

export default function NcccWallPage() {
  return (
    <div className="bg-wall-bg text-wall-ink min-h-screen">
      <header className="px-6 py-3 border-b border-wall-line flex justify-between items-center gap-4 flex-wrap">
        <div>
          <strong className="text-warn">🟠 EMERGENCY</strong>
          <span className="text-wall-muted"> · National Flood Operations Center · Activation since 13 May 08:31 · Sunset 21 May 17:00</span>
        </div>
        <div className="text-wall-muted">Constitutional officers present: STO · Algorithmic Ombudsman · People's Editor</div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">

        <WallPanel title="Map">
          <div className="aspect-square bg-wall-bg border border-dashed border-wall-line rounded flex items-center justify-center text-wall-muted text-center text-sm p-4">
            Tana River basin · live
            <br />
            <span className="text-xs">topography · infrastructure · hazard · resources</span>
          </div>
          <p className="text-wall-muted text-sm mt-2">
            Aggregation floor: 1km grid · DP-ε disclosed · no citizen-individual layer
          </p>
        </WallPanel>

        <WallPanel title="Timeline">
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>08:14 — alert issued</li>
            <li>08:31 — NCCC activated</li>
            <li>09:05 — health desk online</li>
            <li>09:22 — first discharge confirmed</li>
            <li>09:34 — civil society briefed</li>
          </ul>
          <p className="text-wall-muted text-sm mt-2">Sunset clock: 7 days remaining · renewal requires Parliament confirmation</p>
        </WallPanel>

        <WallPanel title="Indicators">
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Hospital beds: <strong>67% available</strong></li>
            <li>Power coverage: <strong>89% on grid</strong></li>
            <li>Water in zone A: <Pill tone="warn">▼ 12% pressure</Pill></li>
            <li>Telecom load: nominal</li>
            <li>Refugee flow: +480 in 24h</li>
            <li>Hospitals: <Pill tone="ok">ALL OPERATIONAL</Pill></li>
          </ul>
          <p className="mt-2"><strong>Tripwires:</strong> <Pill tone="warn">1 amber (water pressure)</Pill></p>
        </WallPanel>

        <WallPanel title="Comms ticker">
          <div className="text-sm space-y-2">
            <p><strong>Public:</strong> "Flood advisory in force; see safety pages."</p>
            <p><strong>Inter-gov:</strong> "Mwanza region confirms 200 evacuees received."</p>
            <p><strong>Cross-sovereign:</strong> "Tanzania border coordination active."</p>
            <p><strong>Misinformation:</strong> "False video re. bridge collapse — debunked."</p>
          </div>
        </WallPanel>

        <WallPanel span="full">
          <div className="flex justify-between items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-wall-ink m-0">AI scenario panel</h3>
            <ClassBanner decisionClass="D" />
          </div>
          <p>
            Currently modeling: <strong>cyclone landfall +6h shift</strong> — surfacing 47 cascading indicators.{' '}
            <em>Officer approval required to base any decision on these scenarios.</em>{' '}
            AI does not decide. Humans sign per remit.
          </p>
        </WallPanel>

        <WallPanel span="full">
          <div className="flex justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold text-wall-ink m-0">Deliberation table — current options</h3>
            <Pill tone="warn">Awaiting authority sign-offs</Pill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-wall-muted text-left">
                <tr>
                  <th className="py-2 pr-3">Option</th>
                  <th className="py-2 pr-3">Lives-at-risk reduction</th>
                  <th className="py-2 pr-3">Cost (KES M)</th>
                  <th className="py-2 pr-3">People displaced</th>
                  <th className="py-2">Civil society note</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 pr-3">A — Pre-position 4 convoys to Kilifi</td>
                  <td className="py-1 pr-3">+14% ±6%</td>
                  <td className="py-1 pr-3">12</td>
                  <td className="py-1 pr-3">0</td>
                  <td className="py-1">—</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3">B — Evacuate vulnerable zone</td>
                  <td className="py-1 pr-3">+22% ±9%</td>
                  <td className="py-1 pr-3">24</td>
                  <td className="py-1 pr-3">~3,200</td>
                  <td className="py-1">Kibarani route disadvantages 2 communities — equity overlay attached</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3">C — Both, sequential</td>
                  <td className="py-1 pr-3">+28% ±10%</td>
                  <td className="py-1 pr-3">34</td>
                  <td className="py-1 pr-3">~3,200</td>
                  <td className="py-1">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-wall-muted text-sm mt-2">
            Each authority signs their own remit individually. There is no joint "approve" button.
          </p>
        </WallPanel>

        <WallPanel span="full" title="Invariant watch (live)">
          <div className="flex gap-3 flex-wrap">
            <Pill tone="ok">✓ Sovereignty of principal</Pill>
            <Pill tone="ok">✓ Contestability</Pill>
            <Pill tone="ok">✓ Auditability</Pill>
            <Pill tone="ok">✓ Replaceability / exit</Pill>
            <Pill tone="ok">✓ Constitutional supremacy</Pill>
            <Pill tone="ok">✓ Inclusion floor</Pill>
            <Pill tone="ok">✓ No superintelligent unilateralism</Pill>
          </div>
          <p className="text-wall-muted text-sm mt-2">
            Not on this wall: citizen-individual map layers · predictive citizen-behavior visualization · surveillance feeds.
            Per Companions 142, 154, 158.
          </p>
        </WallPanel>

      </main>
    </div>
  );
}
