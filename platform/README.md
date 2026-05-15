# CivicOS — Platform Prototypes

Deployable static prototypes of CivicOS surfaces, loadable in any modern browser. No build step required.

## Surfaces

- **`citizen-wallet/`** — citizen-facing wallet (smartphone-shaped). Renders home, receipt detail, contestation, services catalog, records, civic assistant. Implements the wireframes from Companion 152.
- **`officer-console/`** — civil servant console with AI Copilot. Implements Companion 153.
- **`ministry-control/`** — ministry control room (DG view). Implements Companion 156.
- **`nccc/`** — National Command and Coordination Center wall view. Implements Companion 154.

## Shared

- **`shared/civicos.css`** — design tokens, base components.
- **`shared/civicos.js`** — small helpers (no framework, no tracking).

## How to run

Open any HTML file directly in a browser, or serve with any static server:

```bash
cd platform
python3 -m http.server 8080
# then open http://localhost:8080/citizen-wallet/
```

## Doctrine alignment

These prototypes are illustrative implementations of the wireframes in Companions 152–157, governed by Companion 158 (human-led governance: AI assists; humans, institutions, constitutions govern).

- No tracking, no analytics, no third-party scripts.
- No engagement mechanics, no dark patterns.
- Plain language, multilingual scaffold (English baseline + locale framework).
- Accessibility-first (semantic HTML, ARIA, keyboard nav, large tap targets).
- Receipts and contestation visible on every decision surface.
- AI Copilot panels labeled with Decision Class.
- Human signature is the operative act for binding decisions.
