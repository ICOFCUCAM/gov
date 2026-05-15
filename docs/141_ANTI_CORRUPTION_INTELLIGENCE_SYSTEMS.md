# CivicOS — Anti-Corruption Intelligence Systems (Companion 141)

This companion specifies the technical architecture and operational discipline of CivicOS's anti-corruption intelligence systems — the graph-analytic, ledger-analytic, AI-assisted, and human-investigator-supported infrastructure that surfaces patterns of corruption while honoring constitutional discipline, due process, citizen privacy, and the absolute prohibition on citizen scoring or predictive policing of individuals. It complements Companion 21 (anti-corruption infrastructure overview), Companion 73 (financial integrity), Companion 47 (procurement and beneficial ownership), Companion 131 (whistleblower operations), and Companion 138 (constitutional AI governance) by being specifically about the intelligence-grade analytic systems — and equally about the constitutional boundaries those systems honor.

The thesis: **corruption is a pattern across actors, transactions, and time — and modern graph analytics, ledger analytics, and AI assistance can surface those patterns at a scale that human investigators cannot match alone; but the same techniques, deployed without constitutional discipline, become tools of authoritarian intelligence and political persecution**. CivicOS therefore deploys anti-corruption intelligence systems as Class C/D AI under charters, with the Algorithmic Ombudsman and Inspector General supervising, with civil society and parliament with standing access, with restricted-domain prohibitions absolute, and with citizen-level scoring forbidden. The systems surface patterns to investigators; investigators decide; courts decide; citizens contest; the line between corruption fighting and political persecution is operational, not rhetorical.

The discipline: anti-corruption intelligence as Class C/D AI under charter; pattern detection on transactions and ownership graphs not on citizen behavior; no citizen scoring; no predictive policing of individuals; whistleblower reports first-class input; beneficial ownership graphs central; bilateral and multilateral data exchange under treaty; due process in every investigation; investigator accountability per Companion 21; civil society standing access; Inspector General oversight; Algorithmic Ombudsman supervision; transparent aggregate reporting.

---

## 1. Principles

1. **Corruption is a pattern.** Across actors, transactions, time.
2. **Patterns are surfaceable.** With graph and ledger analytics, AI assistance.
3. **Patterns are not verdicts.** Human investigators, prosecutors, courts decide.
4. **Restricted-domain prohibitions absolute.** No citizen scoring. No predictive policing of individuals.
5. **Targets are transactions, contracts, ownership — not citizens.** Citizens emerge in investigation only when transactional patterns lead to them with cause.
6. **Whistleblower reports first-class input.** Per Companion 131.
7. **Beneficial ownership graphs central.** Per Companion 47.
8. **Constitutional supervision.** Inspector General, Algorithmic Ombudsman, parliament.
9. **Due process invariant.** Citizens have notice, counsel, contestation, appeal.
10. **Civil society standing.** Per Companion 74.

---

## 2. The system in one diagram

```
       INPUT SOURCES (treated as data, not verdicts)
       ┌────────────────────────────────────────────────────────────┐
       │                                                            │
       │   Public procurement (OCDS)     Beneficial ownership (OBO) │
       │   Public budget execution        Asset declarations         │
       │   Tax-treaty data (per treaty)   Sanctions lists             │
       │   Court records (public)         Customs (per treaty)       │
       │   Land registry                  Company registry            │
       │   Vehicle registry               Payment audit (CivicPay)    │
       │   Whistleblower reports          Civil society reports       │
       │   Investigative journalism       Cross-sovereign exchange    │
       │                                                            │
       └────────────────────────┬───────────────────────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │  Ingest + normalization            │
              │  - schema mapping (OCDS, OBO etc)  │
              │  - dedup, entity resolution        │
              │  - provenance tagged per source    │
              │  - quality scoring                  │
              └─────────────────┬──────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │  Graph store + ledger store        │
              │  - actor graph                      │
              │  - transaction ledger               │
              │  - ownership graph (BO)            │
              │  - contract graph (procurement)     │
              │  - asset graph                      │
              └─────────────────┬──────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │  Pattern detection (Class C/D AI)  │
              │  - structural patterns              │
              │  - temporal anomalies               │
              │  - relationship anomalies           │
              │  - peer-comparison anomalies        │
              │  - whistleblower-pattern matching   │
              │  - sanctions intersection           │
              └─────────────────┬──────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │  Case generation                   │
              │  - lead packaging                   │
              │  - corroboration                    │
              │  - human investigator triage        │
              │  - prioritization                   │
              └─────────────────┬──────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │  Human investigation               │
              │  - investigator authority           │
              │  - due process discipline           │
              │  - inter-agency cooperation         │
              │  - cross-sovereign per MLAT         │
              └─────────────────┬──────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │  Disposition                       │
              │  - prosecution / administrative     │
              │  - civil society findings           │
              │  - parliamentary findings           │
              │  - structural reform                │
              │  - public aggregate reporting       │
              └────────────────────────────────────┘

       Supervision (continuous):
       Inspector General, Algorithmic Ombudsman, parliament committee,
       civil society standing access, Auditor General.
```

---

## 3. Data sources

### 3.1 Public-by-design

These sources are public per CivicOS doctrine and form the spine of analytics:

- **Open Contracting Data (OCDS)** per Companion 47 §6 and §10.
- **Beneficial Ownership (Open Beneficial Ownership / OBO data model)** per Companion 47 §7.
- **Public budget execution** per Companion 47.
- **Asset declarations** by officials per Companion 21 §4.
- **Sanctions lists** (UN, OFAC, EU, sovereign).
- **Company registry** per sovereign open data.
- **Vehicle and land registry** per sovereign open data (subject to citizen privacy for individuals).
- **Court records** per sovereign open data.
- **Public meeting records** per Companion 13.

### 3.2 Authorized non-public

These sources require legal authority to access — investigator badge, court order, treaty:

- Tax data (per Companion 47 §11 and Companion 73).
- Banking transaction data (per FATF and sovereign law, with court authorization).
- Customs (per WCO data and treaty).
- Telecommunications metadata (per court authorization, narrowly).
- Cross-sovereign tax-treaty data.

### 3.3 Whistleblower input

Per Companion 131:

- Cryptographically anonymous submissions.
- Through accredited civil society intermediaries where applicable.
- Through Inspector General channel.
- Whistleblower reports treated as leads requiring corroboration, not verdicts.

### 3.4 Civil society and journalism

- Investigative journalism findings.
- Civil society audit publications.
- International civil society networks (OCCRP, ICIJ, etc.) per Companion 74.

### 3.5 Cross-sovereign exchange

Per Companion 140:

- MLAT-based exchange for specific cases.
- Standing tax-treaty data exchange.
- Multilateral sanctions list synchronization.

### 3.6 Forbidden sources

- Mass surveillance of citizens.
- Predictive behavioral profiling of citizens.
- Citizen scoring inputs from foreign vendors.
- Social media surveillance of dissidents.
- Bulk telecommunications collection.

---

## 4. Graph and ledger model

### 4.1 Entity types

- **Person** (natural person, with full due process protections).
- **Company** (legal entity, with BO chain).
- **Trust / foundation** (with BO chain).
- **Government office** (public official capacity).
- **Contract** (procurement, grant, license).
- **Transaction** (payment, transfer, in-kind).
- **Asset** (property, vehicle, financial instrument).
- **Public office** (role, with incumbents over time).
- **Sanctions designation**.
- **Investigative case** (open, closed, disposition).

### 4.2 Relationship types

- Owns (BO chain, with %).
- Controls (with mechanism: voting share, director seat, etc.).
- Employs.
- Is officer of.
- Is family member of (declared per asset declaration).
- Has contract with.
- Paid / received from.
- Is sanctioned by.
- Is investigated by.
- Holds asset.

### 4.3 Temporal tracking

- All relationships have validity windows.
- Historical record preserved.
- Pattern detection across time intervals.

### 4.4 Provenance

- Every fact has a source.
- Every source has a quality score (court record > company self-report > inferred).
- Inferred facts marked explicitly; not equivalent to verified facts.

### 4.5 Discipline

- Anti-inference-as-fact.
- Honest about uncertainty.
- Civil society access for verification.

### 4.6 Forbidden in graph model

- Storing data on protected attributes (religion, political affiliation, sexual orientation, etc.) of natural persons unless directly relevant to a specific corruption case and lawfully obtained.
- Citizen behavior profiling.
- Predictive scoring of natural persons.

---

## 5. Pattern detection

### 5.1 Structural patterns

- **Single-bid contracts** above threshold (procurement collusion signal).
- **Sole-source justifications** patterns by buyer or seller.
- **Beneficial ownership concealment**: chains of shell companies, no UBO, BO in opaque jurisdictions.
- **Bid pattern anomalies**: round numbers, just-under-threshold splits, identical wording across "competing" bids.
- **Award-amendment anomalies**: contracts amended substantially after award.
- **Officer-supplier links**: BO chain connecting decision-maker to supplier.
- **Family-network links**: declared family members appearing as suppliers/employees.
- **Revolving-door patterns**: officials moving to vendors within cooling-off violation window.
- **Sanctions intersection**: counterparties on sanctions lists.

### 5.2 Temporal anomalies

- **Spend acceleration before fiscal-year-end** beyond historical baseline.
- **Asset acquisition spikes** by officials.
- **Frequency spikes** in payment patterns.

### 5.3 Relationship anomalies

- **Unusual concentration**: one supplier with disproportionate share of contracts in one office.
- **Geographic anomaly**: contracts to entities far from delivery region without explanation.
- **Specialty anomaly**: contracts to suppliers outside their declared specialty.

### 5.4 Peer comparison

- Office or ministry whose spending pattern deviates strongly from peer offices on like work.
- Region whose project-cost-per-output exceeds peer regions without explanation.

### 5.5 Discipline

- Anti-false-positive-cascade: a pattern is a lead, not a verdict.
- Anti-stigma: leads do not become public until corroborated and through due process.
- Anti-political-targeting: pattern thresholds set by independent body, not by current government.

### 5.6 Forbidden in pattern detection

- Citizen scoring.
- Predictive policing of individuals.
- Detection patterns derived from protected attributes.
- Use of patterns to target political opposition.
- Public release of leads before due process.

---

## 6. Class C/D AI assistance

### 6.1 The decision class

Per Companion 138:

- Pattern detection AI in anti-corruption is **Class D** by default: it produces recommendations only; human investigators decide whether to investigate.
- Class C is permitted only for narrowly-defined automated flags (e.g., automatic flagging of OCDS records with single-bid-above-threshold for investigator queue).
- No anti-corruption AI is Class C or higher without parliament committee approval.

### 6.2 Charter constraints

- Specific patterns detected enumerated; pattern set is the action set ceiling.
- Inputs enumerated; new inputs require charter revision.
- Outputs limited to: investigator-queue lead packages with provenance and reasoning.
- No autonomous disclosure of leads beyond investigator queue.
- No autonomous action against any natural person.
- No model training on data improperly obtained.

### 6.3 Investigator support

The AI supports investigators by:

- Surfacing leads with provenance.
- Visualizing graph relationships.
- Summarizing patterns in plain language.
- Linking to source documents.
- Estimating priority (with explicit caveats).
- Supporting hypothesis testing on transaction data.

The AI does not:

- Decide who is corrupt.
- Replace investigator judgment.
- Bypass court process.
- Replace prosecutor discretion.

### 6.4 Deterministic recall

Per Companion 78:

- Every AI-assisted lead deterministically replayable.
- Reasoning preserved.
- Inputs preserved.
- Investigator notes preserved.
- Civil society audit access (anonymized where appropriate).

### 6.5 Discipline

- Anti-AI-verdict.
- Anti-mystified-recommendation.
- Honest about model limits.

### 6.6 Forbidden in AI assistance

- AI verdicts on natural persons.
- Hidden model behavior.
- Lead generation outside enumerated pattern set.
- Use of AI to launder political targeting.

---

## 7. Case management

### 7.1 The flow

```
       Lead generated → triaged by human → assigned to investigator
              │                                       │
              │                                       ▼
              │                              corroborated?
              │                                       │
              │                                ┌──────┴──────┐
              │                                │             │
              │                              yes            no
              │                                │             │
              │                                ▼             ▼
              │                       investigation open   close lead
              │                                │           with reason
              │                                ▼
              │                      due process discipline
              │                                │
              │                                ▼
              │                       disposition reached
              │                                │
              │     ┌──────────────────────────┼───────────────────────┐
              │     │                          │                       │
              ▼     ▼                          ▼                       ▼
       structural             criminal prosecution      civil/administrative
       reform feed-           per sovereign law         action per law
       back to system
```

### 7.2 Due process

Every investigation that affects a natural person honors:

- Notice (when investigation moves beyond intelligence gathering).
- Right to counsel.
- Right to contest evidence.
- Right to access exculpatory information.
- Right to appeal.
- Presumption of innocence in any public communication.
- Privacy of investigation until disposition (per sovereign law).

### 7.3 Inter-agency cooperation

- Anti-corruption agency.
- Inspector General.
- Auditor General.
- Tax authority.
- Financial intelligence unit (FIU).
- Police (per Companion 100).
- Prosecutor.
- Cross-sovereign per MLAT (Companion 140).

### 7.4 Discipline

- Anti-political-shielding.
- Anti-witch-hunt.
- Honest investigation.
- Independent prosecution.

### 7.5 Forbidden in case management

- Politically-driven investigation opening or closing.
- Suppression of cases.
- Public disclosure before due process.
- Use of investigation for political reward.

---

## 8. The whistleblower interface

### 8.1 The pattern

Per Companion 131:

- Whistleblower submission cryptographically anonymous.
- Submission may include structured data (entities, transactions, dates) that feeds graph.
- Anonymous reply channel for investigator-whistleblower communication.
- Anti-identification.
- Anti-retaliation.

### 8.2 Pattern matching from whistleblower input

- Whistleblower claim cross-referenced with public-data patterns.
- Corroboration sought from independent data.
- Whistleblower not the verdict; corroboration is the verdict-precursor.

### 8.3 Discipline

- Anti-coercion of whistleblower for additional disclosure.
- Material support per Companion 131.
- Cross-sector cooperation.

### 8.4 Forbidden

- Identification of whistleblower.
- Retaliation in any form.
- Use of whistleblower data for surveillance.

---

## 9. Beneficial ownership analytics

### 9.1 The centrality

Beneficial ownership chains are central to corruption analytics. Per Companion 47 §7:

- BO disclosure mandatory for entities contracting with state.
- BO chains traversed to ultimate natural person.
- BO data published in OBO format.
- Cross-sovereign BO exchange under treaty.

### 9.2 Pattern detection on BO

- BO concealment patterns (chains exceeding threshold, opaque jurisdictions, no UBO declared).
- BO change patterns (just before contract award; just after).
- BO overlap with officials, families of officials.
- BO overlap with sanctioned entities.

### 9.3 Discipline

- Honest BO data, with sovereign-validated disclosure.
- Cross-sovereign cooperation for offshore chains.
- Civil society and journalism access.

### 9.4 Forbidden in BO analytics

- BO data suppression.
- BO data manipulation for political reward.
- Use of BO data for non-corruption purposes without authorization.

---

## 10. Cross-sovereign exchange

### 10.1 The pattern

Corruption frequently crosses borders. Cross-sovereign cooperation is required for effective anti-corruption — and is also a vector for political abuse if uncontrolled.

### 10.2 Per Companion 140 (multi-country interop)

- MLAT-based exchange per case.
- Multilateral sanctions list synchronization.
- Beneficial ownership cross-exchange.
- Asset tracing across borders.
- Stolen Asset Recovery (StAR) cooperation per Companion 21.

### 10.3 Discipline

- Per Companion 139: sovereign authority preserved.
- Anti-political-persecution via cross-border channels.
- Refugee protection (anti-corruption is not a basis for refoulement of refugees per Companion 48).
- Honest disclosure of cross-border exchange.

### 10.4 Forbidden in cross-sovereign anti-corruption exchange

- Use of anti-corruption channels for political persecution.
- Refoulement of refugees.
- Mass data exchange beyond per-case scope.
- Compliance with foreign requests violating sovereign law.

---

## 11. Civil society and journalism

### 11.1 Standing access

Per Companion 74:

- Civil society organizations with standing access to OCDS, OBO, public budget data.
- Civil society audit findings published.
- Investigative journalism with source protection.
- International journalism networks.

### 11.2 Discipline

- Anti-targeting of civil society.
- Anti-targeting of journalists.
- Plurality of civil society engagement.
- Anti-cooptation.

### 11.3 Forbidden in civil society interface

- Surveillance of civil society.
- Targeting of journalists.
- Cooptation of civil society for political reward.
- Suppression of civil society findings.

---

## 12. Supervision

### 12.1 Inspector General

Per Companion 28 §4:

- Reviews case generation patterns.
- Investigates allegations of political targeting in anti-corruption.
- Investigates corruption in anti-corruption itself.
- Annual report on anti-corruption operations.

### 12.2 Algorithmic Ombudsman

Per Companion 28 §3:

- Reviews pattern detection charters.
- Audits AI assistance per cycle.
- Receives complaints about AI-assisted decisions.
- Annual report on AI in anti-corruption.

### 12.3 Auditor General

Per Companion 28 §5:

- Audits financial costs.
- Audits effectiveness (cases opened, dispositions, recoveries).
- Publishes audits.

### 12.4 Parliament

- Committee jurisdiction over anti-corruption agency.
- Charter approval for Class C/D AI.
- Annual hearings.

### 12.5 Civil society and citizen

- Standing access.
- Citizen contestability per Companion 35.
- Citizen complaints to Algorithmic Ombudsman.

---

## 13. Aggregate public reporting

### 13.1 Mechanisms

- Quarterly reports: cases opened, dispositions, recoveries, structural reforms.
- Annual reports: long-term pattern findings (de-identified to per-natural-person level).
- OCDS publication continuous.
- OBO publication continuous.
- AI charters and supervisory findings public.

### 13.2 Discipline

- Anti-misleading-aggregation.
- Anti-political-instrumentalization.
- Honest accounting.

### 13.3 Forbidden

- Suppression of aggregate reports.
- Misleading reports.
- Political use of reports.

---

## 14. Structural reform feedback

### 14.1 The principle

Anti-corruption intelligence feeds structural reform — not only case-by-case prosecution.

### 14.2 Mechanisms

- Pattern findings flow to procurement reform (Companion 47).
- BO disclosure improvements driven by gap findings.
- Officer training driven by patterns observed.
- Sovereign cooperation improvements driven by cross-border findings.

### 14.3 Discipline

- Anti-incremental-cosmetic-fix.
- Honest pattern recognition.
- Long-term reform commitment.

---

## 15. Cross-references

- Companion 21 (anti-corruption infrastructure).
- Companion 28 (constitutional officers).
- Companion 35 (contestability).
- Companion 47 (procurement and BO).
- Companion 48 (refugees).
- Companion 73 (financial integrity).
- Companion 74 (civil society).
- Companion 78 (deterministic recall).
- Companion 100 (police interface).
- Companion 131 (whistleblower operations).
- Companion 138 (constitutional AI governance).
- Companion 139 (digital sovereignty doctrine).
- Companion 140 (multi-country interop).

---

## 16. KPIs

| KPI | Indicator |
|---|---|
| OCDS coverage | 100% of in-scope procurement |
| OBO coverage | All contracting entities |
| Lead-to-case conversion | Median time; outcome |
| Investigator independence | Per Inspector General audit |
| Due process compliance | 100% |
| Political-targeting incidents | Zero (Inspector General finding) |
| AI charter compliance | 100% |
| Whistleblower input integration | Coverage |
| Cross-sovereign cooperation | Per MLAT cycles |
| Recoveries | Public amount |
| Structural reform feed-back | Per cycle |
| Civil society access | Active |
| Public reporting timeliness | Quarterly |

---

## 17. Forbidden in anti-corruption intelligence systems

CivicOS will not:

- Permit citizen scoring under any name.
- Allow predictive policing of individuals.
- Permit pattern detection inputs derived from protected attributes.
- Allow AI verdicts on natural persons.
- Permit case opening or closing for political reasons.
- Allow public disclosure of leads before due process.
- Permit suppression of cases.
- Allow use of anti-corruption channels for political persecution.
- Permit refoulement of refugees via anti-corruption cooperation.
- Allow mass data exchange beyond per-case scope.
- Permit surveillance of civil society or journalism.
- Allow targeting of whistleblowers.
- Permit BO data suppression or manipulation.
- Allow misleading aggregate reporting.
- Permit Class C/D AI deployment without charter and supervision.
- Allow anti-corruption intelligence to operate without Inspector General oversight.
- Permit cross-sovereign exchange that compromises sovereign authority.

This list grows; it does not shrink.

---

## 18. The anti-corruption intelligence north star

Corruption is a pattern across actors, transactions, and time. Modern analytics can surface those patterns at scale; CivicOS uses graph, ledger, and Class C/D AI assistance to do so. The line between corruption fighting and political persecution is operational: targets are transactions, contracts, ownership chains, not citizens; AI surfaces leads, humans investigate, courts decide; due process is invariant; civil society and parliament have standing; Inspector General and Algorithmic Ombudsman supervise; restricted-domain prohibitions on citizen scoring and predictive policing of individuals are absolute.

When CivicOS becomes an authoritarian intelligence system wearing anti-corruption's costume — citizens scored, dissidents profiled, political opposition targeted under corruption cover, cross-border channels used for political persecution, civil society surveilled, whistleblowers identified, BO data manipulated — it has failed at the discipline that distinguishes accountability from persecution. Capability without constitutional discipline is institutional corruption hiding behind corruption-fighting.

When the platform deploys anti-corruption intelligence under charters with Class D as default, with patterns on transactions rather than persons, with whistleblower channels protecting reporters, with civil society standing access, with Inspector General oversight, with parliament supervision, with cross-sovereign cooperation that preserves sovereign authority, and with restricted-domain prohibitions absolute — it earns the right to be infrastructure that genuinely fights corruption.

The discipline is daily. The line is operational. The patterns are surfaced. The decisions are human. The due process is invariant. The supervision is real.

Corruption deserves to be fought. Citizens deserve protection from intelligence systems that wear corruption-fighting's costume to do other work. The platform's job is to do both — fight corruption hard, and never become the persecution machine. Anything less abandons either accountability or due process, and a sovereign that abandons either has lost the right to call itself democratic.
