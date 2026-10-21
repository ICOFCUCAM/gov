# Console design: one identity, distinct operations

Decided October 2026 from the console review (screenshot of the National
Situation Room, every shell and palette in the code). Status: register §15.

## 1. Decision

The front door's colours do not repaint the console. What runs across every
surface is the identity layer:

- the nation's seal, name and motto (CivicOS only before setup and as
  "Powered by CivicOS");
- one set of tokens for grounds and ink (`lib/theme/tokens.ts`);
- one typeface stack and one accessibility layer (rollout steps 6 and 8);
- champagne for constitutional authority only (seals, signatures, verified
  marks), always with a shape, never as a status chip.

What stays distinct:

- **Status colours** on a cool, low-chroma ground, always paired with a word or
  shape. Champagne (hue 40°) sits next to the warn amber (hue 43°), so gold
  chrome would read as warnings.
- **Crisis** is a mode: band, frame and label in red; the seal keeps the
  nation's colour (`ConsoleMark` draws a red frame around it, never a red seal).
- **Citizen surfaces** (wallet, login, legal, portal) stay light.
- **Public sites** keep their ministry presets and contrast guard.

## 2. Rollout (each step keeps every page, link, data source and action)

| Step | What | Status |
| --- | --- | --- |
| 1 | Tokens holding today's values; `TONE`, `PALETTE` and `globals.css` read or match them; contrast test | Done |
| 2 | Contrast fixes: console muted ink, `.sov` muted ink, neutral status, light warn, decision class C | Done |
| 3 | The nation's identity in the Command Center, Cabinet Intelligence, Situation Room, `CommandShell` and National Shell headers | Done |
| 4 | The nation's colour on its seal everywhere the console shows it (`sealTile()`); teal kept as "information" | Done (CSS variables for wider use when a page needs them) |
| 5 | Crisis as a mode (`data-mode="crisis"` on the console roots, red frame; the seal keeps its colour); status shapes beside colour in the Situation Room matrix (`TONE_SHAPE`) | Done |
| 6 | Self-hosted Inter and JetBrains Mono (OFL, `public/fonts`) | Done |
| 7 | Champagne in the console's authority moments: the signing dialog (hairline and seal); constitutional desk and audit verification next | Started |
| 8 | Accessibility layer: the menu in the CommandShell and Situation Room headers; text size enlarges the console (zoom, width compensated); high contrast lightens the console's greys. `<html lang>` stays English because console text is English | Done (rem-based type in components: later, with step 9) |
| 9 | Officer apps and the remaining raw hex values: `npm run scan:colours` (CI) fails if the count rises above 3,166; components move to tokens file by file | Started |

## 3. National digital twin, phase 0

The review found a convincing picture of a twin with no twin data: the engines
run on generated values and nothing said so. Phase 0 makes figures honest
before connecting sources:

- `lib/twin/signal.ts`: every figure is observed, reported, modelled, sample
  or not connected, with its source; `SignalTag` marks the last three.
- The national snapshot no longer invents a population; the region count is the
  nation's own.
- The regional model covers all of the nation's regions.
- Generated panels in production (step I0.1): a panel whose figures come from
  an engine or a model carries `SampleTag` in its header and wraps its body in
  `SampleFold` (`components/ui/SampleFold.tsx`): shown under Sample in demo and
  training, folded to "Not connected" (and not rendered) in production, like
  the agency apps' `SimulatedView`. A screen that reads real records stays
  outside the fold and folds only its generated panels (the interior record
  screens, `/health-ecosystem`, the ministry workspace).

Generated figures in production (step I0.1, October 2026): one rule,
`lib/twin/generated.ts`, read by every console surface through
`components/ui/Generated.tsx`. In demo and training a generated figure is
shown with its marker (Sample, or Simulation for scenarios); in production it
is not shown: `Panel signal="sample" | "simulated"` keeps its title and folds
its figures under "Not connected" (rendered only when an official opens it,
then marked Simulation), headline tiles go through `useTile()`, strips through
`GeneratedStrip`, single values through `GeneratedText`. The executive posture
(`executivePosture().generated`) and the agency apps' `SimulatedView` follow
the same rule. Records, observations and official statements are never
folded; where a register exists the screen reads it (bills and hearings on the
branch screens, the audit chain's verification and the access watches'
findings on /audit, the operations overview and incident register on /ops,
the ministry registry, the twin's population). A panel whose inputs are
generated is Sample, never Modelled. `components/ui/Generated.test.ts` checks
the rule and scans the console files for untagged panels and tiles.

Next: a durable store (register 1.1), then the twin core on the substrate
(entities, sources, time-stamped observations) and the first connector
(statistics office). Register §16 tracks each item.
