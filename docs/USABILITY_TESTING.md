# Workspace usability and screen-reader testing record

Plan step I10 (`docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md`), specification Part 6 §E ("automated testing supplemented by keyboard, screen-reader and human usability testing") and §K ("Keyboard and screen-reader testing completed", "WCAG 2.2 AA assessment performed"; acceptance P6-17, P6-18). Status: integration register §27.

This file is the record. It holds the protocol, the session template and every session held, in order, with its findings and their fixes. **Nothing is entered that did not happen.** A session run by a program is labelled *automated*; it is never counted as a session with people. Until a session with people is recorded here, acceptance P6-17 and P6-18 stay Partial.

## 1. What is checked automatically

These run in the test suite or in CI on every change. They are evidence that the shared parts behave; they are not a screen-reader session or an accessibility assessment.

| Check | What it proves | Where |
|---|---|---|
| Colour, type, spacing and focus tokens | Every text colour reads at 4.5:1 on every ground (the workspace ground included); one type scale in rem filling the specification's roles; spacing on a 4px base; 44px controls; keyboard focus at 3:1 on every ground (amber ring or the ink halo beside it) | `app/src/lib/theme/tokens.test.ts` |
| Scales in console code | The shared console components and every I2–I13 screen set text only through the type scale and space on the 4px scale; exceptions listed with reasons | `app/src/lib/theme/type-scale.test.ts` |
| Component states | Every state of the catalogue (`lib/ui/states.ts`) drawn on the console, light and workspace grounds with a word and a shape, never colour alone; every control, table, link and live region named; field errors tied to their field and linked from the error summary; state words and badges at 4.5:1 on their own fills; no invented "last update" | `app/src/components/ui/component-states.test.ts`, page `/gov/help/states` |
| Navigation by permission | The menu shows each kind of official exactly the pages the routes let them use, and every one of those | `app/src/lib/nav/console-nav-permission.test.ts` |
| Console accessibility audit | axe-core WCAG 2.0–2.2 A and AA rules, the skip link as the first Tab stop, the reading order of the accessibility tree (one main landmark, one h1 and it comes first in main, every navigation landmark named, no heading level skipped going down) and, on the gallery, a visible focus indicator on every control reached by Tab; desktop (1440×900) and phone (390×844) | `app/scripts/audit-console.mjs` (CI "console accessibility audit"), `npm run audit:console` |
| Public sites audit | The same for every public site, design and viewport | `app/scripts/audit-public-sites.mjs` |

What the automated checks cannot tell: whether a screen reader user can understand a page and finish a task, whether the words make sense to an official, whether keyboard-only work is practical at length, how the screens behave at 200–400% zoom with real content, and anything about pages outside the audited list.

## 2. Protocol for sessions with people

**Who.** Officials of the institution that will use the screens (a pilot institution, plan I4), by role: an officer, an official who can sign, an administrator and an auditor; at least two who use a screen reader daily, one who works by keyboard only, one who uses screen magnification, and one who reads the interface in a second official language where the nation has one. Participation is voluntary and recorded with the participant's consent; names are not recorded here (participants are P1, P2 …).

**Where.** A training installation (`CIVICOS_MODE=training`): fictional records only, nothing sent, paid, signed or issued for real. Never a production installation.

**Assistive technology.** NVDA with Firefox and with Chrome (Windows), JAWS with Chrome (Windows), VoiceOver with Safari (macOS and iOS), TalkBack with Chrome (Android); keyboard only; browser zoom at 200% and 400%; the platform's own text-size and high-contrast settings.

**Tasks** (each from the screen an official starts on, with no help unless stuck for three minutes):

1. Sign in and find the work waiting on you (`/gov/work`).
2. Open a case, read its legal basis and evidence, and propose a decision (`/gov/work/cases/open`).
3. As a second official, confirm (or refuse) another official's proposal; meet the refusal when trying to confirm your own.
4. Correct a form with a validation error, starting from the error summary.
5. Find a record in a register and read its history (for example `/gov/civil`, `/gov/organisations`).
6. Read a figure on a dashboard and say where it comes from and whether it is current (signal markers, "Not connected", "Out of date").
7. Meet a page you may not use and say what to do next (refusal wording, "Who is responsible").
8. Use the menu to reach a page by its plain name, on a desktop and on a phone.

**Measures.** Task completed (yes, with help, no); errors; time; the participant's own words about what was hard; for screen-reader users, whether each state (loading, refused, saved, failed) was announced and understood.

**Severity of a finding.** *Blocker*: the task cannot be completed. *Serious*: completed only with help or a workaround. *Moderate*: slows or confuses. *Minor*: cosmetic or wording.

**After the session.** Each finding gets a row in §4 with its fix (commit or register entry) or the reason it is not fixed; a blocker or serious finding is fixed or recorded in `docs/INTEGRATION_REGISTER.md` before the screens are called ready for that institution.

**Assessment.** A WCAG 2.2 AA assessment of the workspace screens is carried out by a qualified assessor, independent of the developers, against the same page list as the console audit plus every page the pilot uses; its report is attached here by reference.

## 3. Session template

Copy for each session.

```
### Session <n> — <date> — <automated | with people>
- Installation: <training | demo>, build <commit>, nation <ISO3>
- Facilitator: <name or role>; note-taker: <name or role>
- Participants: <P1 (role, assistive technology, device)> …
- Pages and tasks: <list>
- Results: <per task: completed / with help / not completed; time>
- Findings: <see §4, ids F-<n>.<k>>
- Notes: <what the participants said, in their words>
```

## 4. Sessions held

### Session 1 — 26 October 2026 — automated (no people)

- Installation: demo (`CIVICOS_MODE=demo`, `CIVICOS_AUTH=open`), production build of plan step I10, nation KEN.
- Run by: `app/scripts/audit-console.mjs` (axe-core 4.11, Chromium through Playwright 1.56), on the merged base before the change and on the change itself.
- Pages: the console audit's list, every I2–I13 screen and `/gov/help/states` included; desktop 1440×900 and phone 390×844.
- What it is: an automated check of rules and of the accessibility tree's reading order. **Not** a screen-reader session and **not** a WCAG assessment.

| Id | Finding (automated) | Where | Severity | Fix |
|---|---|---|---|---|
| F-1.1 | Two level-1 headings: the frame's page title and the screen's own title (a screen reader lists two page titles) | 24 pages: `/gov/law`, `/gov/law/procedures`, `/gov/civil`, `/gov/organisations`, `/gov/immigration`, `/gov/sites/boundaries`, `/gov/treasury/budget`, `/gov/treasury/procurement`, `/gov/cabinet-office`, `/gov/tax/services`, `/gov/identity`, `/gov/passports`, `/gov/labour`, `/gov/social-protection`, `/gov/land`, `/gov/building`, `/gov/local-government`, `/gov/transport`, `/gov/oversight`, `/gov/security/resilience`, `/gov/services`, `/gov/services/management`, `/gov/records`, `/gov/twin/indicators` | Moderate | Each screen's own title is now a level-2 heading under the frame's h1 (I10) |
| F-1.2 | Tables that scroll sideways on a phone could not be reached by keyboard (axe `scrollable-region-focusable`, WCAG 2.1.1) | `/gov/exchange/states`, `/gov/exchange/contract` (phone) | Serious | The scrolling region is focusable and named (I10); `DataTable` does the same for every table it draws |
| F-1.3 | The offline banner set ink on the warning fill (about 3.3:1 on the light ground) | `OfflineBanner` (citizen and officer shells) | Serious | Drawn as the shared offline state: ink on the surface with the warning edge, word and shape (I10; found by review of the shared components, not by the run) |
| F-1.4 | The "warn" status badge read 4.26:1 on its tinted fill | `Pill` everywhere | Serious | Fill lowered to 10%; `component-states.test.ts` holds every badge at 4.5:1 (I10) |
| F-1.5 | The amber focus ring alone read 1.6:1 against white | Every light page | Moderate | An ink halo between the element and the ring (3:1 on every ground, `tokens.test.ts`) (I10) |
| F-1.6 | Figure markers were 8px | `SignalTag` everywhere | Moderate | Raised to the scale's smallest step, 11px (I10) |

Results on the change: see §5.

## 5. Latest automated run

Automated, 26 October 2026, on the production build of plan step I10 (demo installation, nation KEN), `app/scripts/audit-console.mjs`:

| | Merged base (before) | Plan step I10 (after) |
|---|---|---|
| Pages × viewports | 69 × 2 (the gallery did not exist: 2 × "answered 404") | 69 × 2 |
| axe WCAG 2.2 A/AA violations | 2 (`scrollable-region-focusable`, phone) | 0 |
| Skip link | 0 failures | 0 failures |
| Reading order (one main, one h1 first in main, named navigation, no skipped level) | 48 failures (two h1s on 24 pages, desktop and phone) | 0 |
| Keyboard focus on the gallery (every control reached by Tab shows an outline or ring) | — | 0 failures |
| Best-practice findings (reported, not failing) | — | 95: content outside a landmark (`region`, 63, mostly the installation banners above the shell), duplicate landmark names (10), empty table headers (6), landmarks nested in the citizen shell (14), heading order (2) |

The best-practice findings are kept for a later pass; they are not WCAG failures. Each page's outline of landmarks and headings, as the accessibility tree presents it, is in the audit's JSON report (`--report`, `outlines`).

Also run on the same build: `app/scripts/smoke-console.mjs` (all console smoke checks passed, 85 pages × 2 viewports) and `npm run audit:sites` on a fresh server (no failures).

No session with people has been held. The next entry here is the first one, under the protocol in §2.
