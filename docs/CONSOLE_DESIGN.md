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
| 4 | The nation accent as CSS variables from the root layout; teal kept as "information" | Next |
| 5 | Crisis as a mode (`data-mode="crisis"`), CRIT cells with weight and shape | Planned |
| 6 | Self-hosted Inter and JetBrains Mono (OFL) | Planned |
| 7 | Champagne in the console's authority moments (signing, constitutional desk, audit verification) | Planned |
| 8 | Accessibility layer: menu in the console, dark high-contrast, rem-based type, `<html lang/dir>` | Planned |
| 9 | Officer apps and the remaining raw hex values, with a scan | Planned |

## 3. National digital twin, phase 0

The review found a convincing picture of a twin with no twin data: the engines
run on generated values and nothing said so. Phase 0 makes figures honest
before connecting sources:

- `lib/twin/signal.ts`: every figure is observed, reported, modelled, sample
  or not connected, with its source; `SignalTag` marks the last three.
- The national snapshot no longer invents a population; the region count is the
  nation's own.
- The regional model covers all of the nation's regions.

Next: a durable store (register 1.1), then the twin core on the substrate
(entities, sources, time-stamped observations) and the first connector
(statistics office). Register §16 tracks each item.
