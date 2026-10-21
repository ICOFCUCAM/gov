# Separation of powers in CivicOS — audit (read-only)

Date: 2026-10-20. Scope: `/home/user/gov/app/src`. Paths are relative to it unless stated.
"Read" = seen in code. "Inferred" = my conclusion, not directly seen.

## 0. Short answer

The platform has a **descriptive** branch model (the constitution templates,
`lib/gov/constitution.ts`) that already knows about legislature, judiciary,
oversight, crown, electoral and federal council. But the **operative** systems
(identity, permissions, the institution registry, the deployment profile,
directives, consoles) know only one kind of institution — a "ministry" — and
one kind of top user — the executive. Judicial isolation exists for casework
only, and it is undone by the fact that any administrator (an executive
function) controls accounts, the institution registry and the deployment
profile that names the judiciary. The legislature, the head of state and
independent bodies have no operative existence at all.

---

## 1. How form of state and branches are modelled today

### 1.1 SovereignProfile (`lib/api/types.ts`)
- `StateForm` = `republic | federation | monarchy | city-state | union | parliamentary` (717-723). No absolute monarchy, emirate, semi-presidential, theocratic/religious, confederation, devolved unitary, or mixed forms. "Parliamentary" is a form value, while "republic" means *presidential* republic (`constitution.ts` 292 label "Presidential Republic") — two different axes (head-of-state type vs executive-legislative relation) folded into one enum.
- One executive field `executiveTitle` (728) and one legislature string `legislatureName` (729).
- `constitution?: NationalConstitution` (746, defined 771-783): `headOfStateTitle`, `executiveSeat`, `chambers[]` (name, seats, role), `judicialApex`, `judicialTiers`, `emergencyDoctrine`, `source`. Nothing for: independent bodies, central bank, electoral body, audit institution, ombudsman, subnational governments, reserve powers, religious/customary authorities, head-of-state vs head-of-government split as an explicit flag.
- `deployment?: DeploymentProfile` (749).
- Default profile: `executiveTitle: 'Head of Government'` (`lib/data/store/state.ts` 174).

### 1.2 Constitution engine (`lib/gov/constitution.ts`)
- `BranchKey` = `executive | legislature | judiciary | oversight | crown | electoral | federal-council` (9-11). Branch bodies are display names only (`BranchBody {name, role}` 13).
- Templates per form (`templateFor`, 102 onward: parliamentary 104, monarchy 140, federation 181, city-state 221, union 251, republic/default 290). Fixed reference wording (e.g. monarchy "Prime Minister / Grand Vizier" 152/173, "Royal Court of Cassation" 147; one shared `oversight` block naming "Auditor-General, Ombudsman, Inspectorate" 39-47; `electoral` 48-56 — omitted for monarchy, 178).
- `constitutionFor()` overlays the nation's chambers, courts, head of state, emergency doctrine (68-100). Oversight/electoral/crown bodies cannot be overridden by the nation (only chambers and courts are overlaid).
- Consumers: `CommandShell.tsx` 283 (branch tabs), `BranchesView.tsx` 22, `BranchWorkspace.tsx` 30, `NationalShell.tsx` 101, `SetupWizard.tsx` 141/828, `/command` page 292, `lib/nation/offices.ts` 43, `lib/nation/registry.ts` 242.
- A **second, unrelated** branch model exists: `lib/gov/constitutional-governance.ts` 13-30 (`OPERATIONS | OVERSIGHT | JUDICIAL | CITIZEN_PROTECTION`, Interior app only). Two models of the same concept.

### 1.3 Offices (`lib/nation/offices.ts`)
- `nationOffices()` 41-59 derives headOfState / headOfGovernment / chambers / apexCourt. Head of state = `constitution.headOfStateTitle`, else for `republic` the head of government, else the template's authority chain rank 1 stripped of brackets (e.g. "Ceremonial President", "The Crown", for a federation "Federal Executive").
- `successionOrder()` 72-81: deputy, presiding officers, Chief Justice, Minister of Finance — i.e. succession *to the executive*; no head-of-state succession or regency.
- A **third** derivation: `lib/sovereign-identity.ts` `protocolOrder()` 21-40 ignores `constitution.headOfStateTitle` and, for every non-monarchy non-union form (parliamentary republics included), shows "Head of State / Government: {executiveTitle}" (39) — wrong for parliamentary republics, federations with a separate president, and city-states.

### 1.4 Presets (`lib/data/store/sovereign.ts`)
- `SOVEREIGN_PRESETS` 151-167: parliamentary republic, presidential republic, federation, constitutional monarchy, emirate (stateForm `monarchy`, legislature "Federal National Council" — a UAE-specific name, 162), city-state, union. No absolute monarchy, no semi-presidential.
- `applySovereignPreset()` 173-186 rebuilds `db.sovereign` from the preset plus a whitelist (iso3, regions, constitution, paymentRail, timeZone, emergency, foreignAffairs, map) (180-181). **It drops `deployment`, `languages`, `aiAssistant`, `aiAssistantModel`, `domain`, `seal`, and overwrites `stateName` with "Kingdom"/"Republic"…** (read). Consequence (inferred from `authorityFor` = `authorityIn(db.sovereign.deployment, key)`, sovereign.ts 18): applying a preset after setup un-names the judiciary, the data-protection authority and every register owner, which silently switches off judicial isolation (`engine.ts` 144), sends access-log retention confirmation to auditors (`roles.ts` 552-556) and returns law recording to whole-government administrators (`roles.ts` 559-572). This is a bug independent of the wider design question.
- Route: `app/api/sovereign/preset/route.ts` 7-8 uses `adminOnly` — any administrator, including one scoped to a single institution.

### 1.5 `platformLabel` (`components/features/cover/entry.ts` 122-125)
Only `monarchy` changes the label; emirate is detected by a regex on the state *name* (`/emirate/i`). Sultanates, principalities, grand duchies, the Holy See, federations of emirates get "Kingdom" or "Government" by accident of name.

### 1.6 Deployment profile (`lib/nation/deployment.ts`)
- `AuthorityKey` (10-13) / `AUTHORITIES` (31-47): 15 register keepers. `judiciary` and `dataProtection` are the only non-executive bodies. No legislature, audit institution, electoral body, central bank, ombudsman, head of state, or subnational governments.
- Each key maps to **one** institution id from the ministry registry (`authorities?: Partial<Record<AuthorityKey, string>>`, 20). A judiciary is therefore exactly one "ministry" record; a separate constitutional court, tribunals, or a religious court system cannot each be the judiciary.
- `jurisdiction.legalSystem` includes `religious | customary` (17) but nothing consumes it for institutions (inferred; no institutional effect found).
- Changed through `setSovereign()` (sovereign.ts 70-74) via `PUT /api/sovereign` with `adminOnly` (`app/api/sovereign/route.ts` 9) — **one administrator, no second official, no citation of law**, unlike `lib/law/policy-change.ts` used for other country rule sets.

### 1.7 Ministry registry (`/api/org`, `lib/data/store/ministries.ts`)
- `Ministry` (`types.ts` 536-548): id, name, `archetype`, status, departments, modules. **No branch / independence / legal-status attribute.**
- `ArchetypeKey` (517-520): sectoral only (HEALTH … TRADE, GENERIC). Courts can only be registered as JUSTICE ("Ministry of Justice … Courts coordination", ministries.ts 44) or GENERIC — the executive's justice ministry and the judiciary are the same kind of thing to the registry.
- Merge / deactivate / rename any institution: `ADMIN_ONLY` (`roles.ts` 123+, entry `/api/org/ministries/[^/]+/(merge|deactivate|activate|rename)`), and `deactivateMinistry` audits as `'operator'` (ministries.ts 126-130). An administrator can deactivate or merge the courts or the legislature.

### 1.8 Charters (`lib/institution/charters.ts`)
- `CharterKind = ministry | branch | agency | citizen | officer` (9). `BRANCH_CHARTERS` (41-46): fixed `presidency`, `judiciary`, `senate`, `assembly`. These are app/federation identities (used by `apps/AppHost.tsx` 155-304 to pick an app), **not linked to the ministry registry, the deployment profile or roles**. `services/constitutional-engine.ts` 61-66 reads `kind === 'branch'` only to print a fixed "Separation of powers: ok".

### 1.9 Branch pages
- `/gov/branches`, `/gov/branch/[key]` (console nav `lib/nav/console-nav.ts` 47-49). `BranchWorkspace.tsx` fills them from deterministic generators in `lib/gov/branches.ts` (`legislativePipeline` 24, `judicialDocket` 34, `chambersFor` 44, `committees`, `courtHierarchyFor` 75, …) marked `signal="sample"` (e.g. 314, 506). A judicial "case runtime" (`RuntimeQueue scope="jud:…" kind="judicial"`, 483) runs a browser-side store with the retired `shared/permissions/rbac.ts` roles (`RuntimeQueue.tsx` imports) — so the **executive console offers to drive court cases** (sample, but the framing is wrong).
- Public sites: `/assembly`, `/senate`, `/judiciary`, `/presidency`, `/courts/cause-list` (`app/(public)/…`). Chamber names follow the nation (`assembly/page.tsx` 11-14 via `nationOffices`); `/judiciary` metadata is fixed "Judicial Branch — Sovereign Courts" (judiciary/page.tsx 8). Real court data: `lib/courts/` (hearings, procedures) + public `causeList()`.
- There is no legislative record store (bills, sittings, votes, committee reports). Laws enter the laws register (`lib/law/register.ts`) through `lawRegister`, an executive-style register keeper; there is no step where a legislature enacts and a head of state assents.

### 1.10 Command Center "Constitutional status · Separation of powers"
`app/(command)/command/page.tsx` 288-317: cells per branch from `branchReadiness()` and an "INTACT / STRAINED" badge from `separationIntegrity()`. Both are generated: `branches.ts` 104-117 (seeded numbers, "Independence" score 108) and 120-130 (checks hard-coded `ok: true`, e.g. "Oversight independence … auditor-general autonomous" 126). Correctly tagged `SignalTag kind="sample"` (288), but it measures nothing; it should become a view of real configuration facts (see proposal G).

### 1.11 Directives (`lib/data/directives.ts`, `/api/directives`)
- `KINDS` = executive-order, policy, budget, instruction, declaration (21). `targets` are free strings (60), never checked against the registry or any independence attribute.
- Issuer: `directiveIssuer()` (`roles.ts` 428-430) returns the **requested** issuer for a whole-government official; `canSignDirective()` (437-443) lets any whole-government signatory/administrator sign any issuer's directive. So a whole-government executive official can draft **and sign** a directive in the name of the judiciary or legislature, and target courts or an electoral commission (read + inferred combination). Signed directives are published (`/api/public/directives`).

---

## 2. Does the permission model keep the branches apart?

`lib/auth/roles.ts` has four roles (8-15) and one scope bit: an institution id or none (`wholeGovernment = !s.institution`, 53).

| Question | Answer | Evidence |
|---|---|---|
| Can a whole-government official **act** on a court case? | No (casework engine only). | `caseActRefusal` 498-517: different institution refused; judicial wording 506-508. |
| Can they **read** a court case? | No (casework engine). Yes for normal cases of every other institution, including a legislature or an independent body registered as an institution. | `caseReadRefusal` 520-535: `judicial && !own` 523; normal cases open to whole government 525. |
| Is "judicial" robust? | Only one institution can be judicial, and only while `deployment.authorities.judiciary` is set. | `engine.ts` 144. Cleared by applying a preset (§1.4). |
| Court institution's **queue** (imported/connected cases, personal data) | Readable by whole government and every auditor; no judicial check. | `canReadInstitution` 358-361 + `fullView` 355; used by `app/api/org/ministries/[id]/queue/route.ts` 14. |
| Acting in the court institution's workspace (`/api/org/ministries/<court>/…`) | Allowed for whole government. | `ministryPermission` 276-280. |
| Cases list without a session (open auth mode) | All cases incl. judicial list views. | `app/api/cases/route.ts` 20 (`!s ||`). Only when `CIVICOS_AUTH=open`. |
| Can an executive **administrator** alter judges' access rights? | **Yes.** Any administrator creates accounts with any role and institution, changes another's role/institution, resets passwords and second steps, disables accounts. | `app/api/auth/officials/route.ts` 40-42; `createAccount` takes `input.institution` verbatim (`lib/auth/officials.ts` 273); `[id]/route.ts` 22-40. Directly contradicts directions 4.6 ("an administrator of the installation cannot alter a judge's … access rights"). One administrator can mint a court "Can sign" account, sign in as it and decide court cases (inferred from the above). |
| Can an administrator redefine who the judiciary / DPA is? | **Yes**, alone. | `PUT /api/sovereign` `adminOnly` (route 9) → `setSovereign` deployment merge (sovereign.ts 70-74). |
| Can an institution-scoped administrator (e.g. the court's own) change the whole nation? | **Yes**: `adminOnly` does not require whole government (260-262); `/api/sovereign`, `/api/org/ministries` (structure), accounts are `ADMIN_ONLY`. Only `/api/releases` uses `installationAdmin` (270-273). | |
| Directives to independent bodies | Unrestricted (§1.11). | |
| Access log / oversight | Administrators cannot read it (`canReadAccessLog` 537-541) — good. But readers are *auditors* (an account role administrators create and assign) and the DPA institution (which administrators name and staff). `confirmByOversight` (`lib/data/retention.ts` 189-200) compares the confirmer by **name string** with the two administrators (194), not by `personOf()` as dual control does elsewhere. Independence of oversight therefore rests entirely on administrators behaving. | |
| Auditor role | Global "reads every record" (ROLES 14) for whole-government auditors — no distinction between the executive's internal audit, the supreme audit institution, and parliamentary scrutiny. Court cases still closed to them (523). | |

Verdict: judicial isolation is real at the casework-engine layer; everything
around it (accounts, institution registry, deployment profile, directives,
ministry queue/workspace) is controlled by a single administrator role with
no branch boundary. The legislature and independent bodies have no
protection beyond "another institution".

---

## 3. Who the console treats as the top user

- `ExecutiveMenu` default `title = 'Head of Government'`, `sub = 'National Executive'` (`components/ui/ExecutiveMenu.tsx` 31-32); doc comment "Head-of-Government executive menu … cabinet session … war room" (20-28).
- `CommandShell.tsx` 198 / 208: the menu shows the signed-in official's name, falling back to `executiveTitle ?? 'Head of Government'`; the phone drawer (208) always shows `executiveTitle` + "Not signed in" even when someone is signed in (inferred bug, read line 208).
- `/command` 208: `ExecutiveMenu title={executiveTitle} sub="National Executive"`; 249: **"Welcome back, {executiveTitle}"** for whoever is looking.
- `/welcome` (`components/features/onboarding/Welcome.tsx` 94): "Good morning, {profile.executiveTitle}" to every official — a judge or a Speaker is greeted as the President. Destinations (71-74): Command Center, Situation Room, Cabinet Intelligence, Institutions Admin — all executive.
- `CabinetIntelligence.tsx` 311 ("Leader of the Nation"), `SituationRoom.tsx` 874, `NationalOverview.tsx` 264 ("Head of Government · National Executive").
- No page or home is chosen by the signed-in official's institution or branch (middleware has no institution gating of pages — inferred from `middleware.ts`, only API rules). There is no home for: a Speaker/Clerk of parliament, a Chief Justice / court administrator, a head of state distinct from the head of government (monarch, governor-general, parliamentary president), or the head of an independent body. The `presidency`/`judiciary`/`senate`/`assembly` apps under `/app/[domain]` exist as standing charters (charters.ts 41-46) but are not tied to accounts or the deployment profile.

---

## 4. Branch / independence attribute on institutions

None operative.
- `Ministry` has no such field (`types.ts` 536-548); `ArchetypeKey` is sectoral (517-520).
- `CharterKind 'branch'` exists only for four fixed app charters (charters.ts 9, 41-46) and is used for app dispatch (`AppHost.tsx` 155-304) and a constant "ok" check (`constitutional-engine.ts` 61-66).
- `BranchKey` in the constitution engine names branches but no institution record points to a branch.
- `roles.ts` never reads a branch; the only branch-like rule is `judicial` derived from one deployment key (`engine.ts` 144).
- `branchReadiness` "Independence" (branches.ts 108) is a seeded number.

---

## 5. Gaps and proposals (ranked)

All proposals extend existing systems (SovereignProfile/`NationalConstitution`,
`DeploymentProfile`/`AUTHORITIES`, the ministry registry, `roles.ts`,
`policy-change.ts`) — no parallel system. Items marked **[legal]** touch the
design of legal authority and should ship as configurable mechanisms with
the values left to the nation (or behind a legal review); items marked
**[platform]** are safe platform fixes.

### A. Fix the preset reset (bug) — [platform]
`applySovereignPreset` must keep `deployment` (and languages, AI choice, domain, seal, stateName) as it keeps `constitution` (sovereign.ts 180). Add a test that applying a preset after setup leaves `authorityFor('judiciary')` and `authorityFor('dataProtection')` unchanged. Consider refusing presets once setup is complete (they are a first-run template).

### B. Give every institution a constitutional standing — [platform mechanism; values legal]
Add to `Ministry` (registry, `/api/org`) an optional `standing`:
`'executive-ministry' | 'executive-agency' | 'independent-statutory' | 'independent-constitutional' | 'legislature' | 'judiciary' | 'head-of-state' | 'subnational' | 'customary-or-religious'`, plus `branch?: BranchKey` (reuse `lib/gov/constitution.ts`) and `basis?: Citation` (law register). Default for existing records: `executive-ministry` via `withDefaults()`. Set in setup/`/gov/configuration`, changed through `lib/law/policy-change.ts` (proposed by one, confirmed by another, citing the law) — never by one administrator. Display in the directory and `/gov/branches` from real records instead of templates. Make the setup step pre-fill from the constitution template's branch bodies (oversight/electoral/crown bodies become proposed institution records, labelled drafts).

### C. Make `roles.ts` read standing (the core of separation) — [platform mechanism]
Generalise the single `judicial` flag to "independent" institutions:
1. `CaseFacts.judicial` → `CaseFacts.independent` (true when the owner's standing is legislature, judiciary, independent-constitutional, or head-of-state); `caseReadRefusal`/`caseActRefusal` refuse outsiders and whole-government officials for those owners (keeps today's judicial wording).
2. `canReadInstitution` / `ministryPermission` / `canDownloadSiteArchive` / `canActForSite`: `fullView` and `wholeGovernment` stop at independent institutions (fixes the court queue gap, `queue/route.ts` 14).
3. Allow several judicial institutions (constitutional court, supreme court, tribunals, religious courts) by deriving `judicial` from standing rather than from one deployment key.
4. Add `api-permission-coverage`-style tests: no whole-government scope reaches an independent institution's records.

### D. Separate administration of independent institutions — [platform; directions 4.6 already agreed]
Today one administrator controls all accounts (officials routes) and the registry. Fix within `roles.ts`:
- Accounts whose institution is independent (or that would be moved into one) are created, re-roled, reset or disabled only by an administrator **of that institution** (institution-scoped administrator), or by a whole-government administrator **confirmed by** a signatory of that institution (four-eyes, `personOf()`).
- Whole-government administrators may not create institution-scoped accounts in an independent institution unilaterally; the bootstrap (first court administrator) uses a one-time code handed to the institution, like `lib/auth/setup-token.ts`.
- Merge / deactivate / rename / standing change of an independent institution: refused except through `policy-change.ts` with the institution's own confirmation.
- `adminOnly` routes that change the nation (`/api/sovereign`, `/api/sovereign/preset`, `/api/org/ministries`) require `installationAdmin` (whole government) **and** dual control for deployment-authority changes (move `deployment.authorities` changes onto `policy-change.ts`).
This is the change that turns 4.6 from casework-only into a real guarantee.

### E. Directives respect independence — [platform; recipients' list legal]
- `directiveIssuer`: whole-government officials issue only as the executive office (or an institution they are named for), never as another institution's id; `canSignDirective`: signing for an institution needs an account of that institution.
- Validate `targets` against the registry; refuse (or record as a *request/communication*, not an instruction) when a target's standing is independent. Add kinds `request`, `communication`, `referral` for inter-branch messages; referrals between institutions already exist as cases (`lib/casework/referral.ts`).

### F. Homes for every head, not just the executive — [platform]
- Replace the `executiveTitle` greetings (`/command` 249, `Welcome.tsx` 94, `ExecutiveMenu` defaults, `CommandShell` 208) with the signed-in official's own office, and the institution's head title when an account is the head.
- `/welcome` chooses destinations by the official's institution standing: legislature → its institution workspace + `/gov/branch/legislature` (real records once B/H exist); judiciary → court workspace + cause list; independent body → its workspace; executive → Command Center as today. The Command Center stays (preservation doctrine); it becomes the executive's home, not everyone's.
- Add office titles to `NationalConstitution`: `headOfGovernmentTitle` (alias of `executiveTitle`), `presidingOfficers[]` per chamber, `chiefJusticeTitle`, and use one derivation (`nationOffices`) everywhere — retire the divergent `protocolOrder()` logic (sovereign-identity.ts 21-40) in favour of `nationOffices()`.

### G. Make "Separation of powers" observed, not generated — [platform]
Rebuild the Command Center panel (page.tsx 288-317) and `separationIntegrity()` from configuration facts: each constitutional branch has a registered institution with that standing; judiciary isolated (C); no whole-government account inside an independent institution; independent institutions have their own administrator (D); data-protection authority named; access-log retention confirmation not by an administrator; no directive targeting an independent body. Each check `observed` with a link to the record; keep the sample readiness cells until real indicators exist, still marked.

### H. Head of state and state form — [legal: what powers exist is the nation's]
- Split the enum's two axes: keep `stateForm` (lock), add `NationalConstitution.headOfState: { kind: 'monarch' | 'elected-president' | 'governor-general' | 'collective' | 'none', title, separateFromGovernment: boolean }` and `executiveSystem: 'presidential' | 'parliamentary' | 'semi-presidential' | 'directorial' | 'absolute'`.
- Add presets: absolute monarchy, semi-presidential republic, federal monarchy / federation of emirates (fix the emirate preset's UAE-specific chamber name), principality/grand duchy. Derive `platformLabel` from a stored `style` (`kingdom | emirate | sultanate | principality | grand-duchy | republic | federation | union`) instead of a regex on the name.
- Head-of-state acts (assent, appointments, dissolution, pardons, reserve powers) as procedure packages owned by a `headOfState` authority — **[legal]**: whether each act is discretionary, advised or countersigned varies by constitution; ship as unapproved drafts like permit mappings.

### I. New authority keys for independent bodies — [legal]
Extend `AUTHORITIES` (deployment.ts 31-47) with `legislature` (and per-chamber), `supremeAudit`, `electoral`, `centralBank`, `ombudsman`, `anticorruption`, `humanRights`, `headOfState`, `constitutionalCourt` (optional, defaults to judiciary). Each is a named institution id, like today; each register joins `lib/data/register-owners.ts`. Which bodies exist and how independent they are is the nation's legal decision; the platform only offers the slots and enforces C/D once a body is named.

### J. Legislative records — [legal for procedure, platform for storage]
A bills/acts register owned by the `legislature` authority: bill versions, readings, votes, assent (by head of state, H), commencement — feeding `lib/law/register.ts` so an enacted version enters the laws register *from* the legislature instead of being typed in by an executive law-register official. Akoma Ntoso support already exists (`lib/law/akoma-ntoso.ts`). Stage names and quorum rules come from the nation's standing orders (procedure packages, approved by two officials of the legislature).

### K. Subnational and federal governments — [legal]
`standing: 'subnational'` plus `region` (from `regionList()`), with their own whole-subnational scope in `roles.ts` (a `jurisdiction?: region` on `Scope`): a state government's administrator administers its own institutions; the federal whole-government scope does not reach state-reserved registers. Which competences are reserved is constitutional and must be configured per nation (federations, devolved unitary states like UK/Spain, Bosnia-style entities).

### L. Oversight independence hardening — [platform]
- `confirmByOversight` compares persons (`personOf()`), not names (retention.ts 194).
- Distinguish the executive's internal auditor role from the supreme audit institution and parliamentary scrutiny: auditors scoped to an institution with standing `independent-constitutional` (or `legislature` for a public accounts committee) get read access with purpose and access-log entries, executive internal audit does not reach independent institutions (C).
- Changes to the DPA's identity go through D's dual control.

### M. Religious and customary authorities — [legal; directions §15 caution]
Only as institutions with `standing: 'customary-or-religious'` keeping registers the nation names (e.g. customary marriages, Sharia/personal-status courts as judicial institutions under C). No platform-defined powers; every procedure ships as a draft for the nation's approval and independent legal review, as for immigration/asylum.

### Which proposals must wait for the nation or a legal review
- Safe now (platform): A, C, D, E (mechanism), F, G, L, B's field and defaults.
- Need the nation's decision / legal review before values or powers ship: B's assignment of standing to real bodies, H's head-of-state acts and reserve powers, I's list of independent bodies and their independence, J's legislative procedure, K's reserved competences, M entirely. These follow the existing pattern: the platform provides slots and enforcement; mappings ship as unapproved drafts and a production installation refuses an unconfigured power (`lib/permits/authority.ts` precedent).

### Rule/doc touch points if implemented (per CLAUDE.md)
`route-lock.json` for any new page; `npm run build:openapi` for route changes; `docs/INTEGRATION_REGISTER.md` for placeholder bodies; `docs/GOVERNMENT_OPERATING_DIRECTIONS.md` (4.6, 8.2, 14, 15.5) and the register status; `withDefaults()` for new `Ministry`/profile fields; `console-nav.ts` tabs rather than new menu entries.
