# CivicOS — Public Infrastructure Digital Twins (Companion 143)

This companion specifies the architecture, operational discipline, and constitutional constraints for digital twins of public infrastructure — water, power, transport, telecommunications, sanitation, buildings, ports, airports, bridges, dams, irrigation, public housing, school estates, hospital estates, urban systems, agricultural systems, and ecological systems — deployed inside CivicOS to support planning, operation, maintenance, emergency response, climate adaptation, and intergenerational stewardship. It complements Companion 23 (sensors and IoT — base sensing layer), Companion 49 (sustainability and climate), Companion 134 (physical infrastructure resilience), Companion 142 (NCCCs), and the Master Blueprint §54 by going substantively deeper into twin architecture, governance, citizen access, and long-horizon discipline.

The thesis: **a digital twin of public infrastructure is a model of common wealth, and models of common wealth belong to the public** — operated by the sovereign, accessible to citizens and civil society, governed by the same constitutional discipline as the infrastructure itself, with restricted-domain prohibitions on surveillance, citizen profiling, and predictive policing absolute. Digital twins offer dramatic gains in planning, operation, and resilience; they also concentrate visibility into citizen movement, behavior, and life patterns. CivicOS therefore designs twins as public-purpose models with citizen-protective privacy architecture, civil society standing access, constitutional officer oversight, and the seven invariants binding their operation.

The discipline: twins as public-purpose models; sovereign-controlled; aggregated and privacy-preserved by design; no citizen-level surveillance through infrastructure twins; civil society standing access; constitutional officer oversight; open standards for twin data; cross-sovereign cooperation under treaty; AI assistance Class C/D under charter; long-horizon stewardship per Future Generations Commissioner; transparent public reporting; engineered replaceability; intergenerational maintenance.

---

## 1. Principles

1. **Twins are public-purpose models.** Of common wealth.
2. **Sovereign-controlled.** Per Companion 139 doctrine.
3. **Privacy-by-design.** Aggregated, differential-privacy-protected, no citizen-level surveillance.
4. **Civil society standing access.** Per Companion 74.
5. **Constitutional officer oversight.** Per Companion 28.
6. **Open standards.** OGC, INSPIRE, CityGML, IFC, LandInfra, Time-Series schemas.
7. **AI Class C/D under charter.** Per Companion 138.
8. **Long-horizon stewardship.** Per Future Generations Commissioner.
9. **Engineered replaceability.** Per Companion 14.
10. **Intergenerational maintenance.** Per Companion 41.

---

## 2. What a digital twin is

A digital twin is a continually-updated digital model of a physical system, fed by sensors, augmented by physics-based and AI-based simulation, queryable for planning and operation, traceable to authoritative source data, and operable for hypothetical scenarios.

### 2.1 What it is not

- A surveillance system.
- A citizen-profiling system.
- A predictive-policing system.
- A vendor-controlled black box.
- A static map.

### 2.2 What distinguishes a public-purpose twin

- Owned and operated by sovereign or sovereign-licensed entity.
- Citizen and civil society have standing access (with privacy protections).
- Subject to constitutional officer oversight.
- Bound by the seven invariants.
- Aggregated and privacy-preserved by design.
- Open-standard schemas.
- Replaceable.

---

## 3. Twin domains

| Domain | Twin content | Lead authority |
|---|---|---|
| **Water** | Reservoirs, rivers, aqueducts, treatment, distribution, leakage, quality | Water authority |
| **Power** | Generation, transmission, distribution, demand, storage, renewables, grid stability | Energy authority |
| **Transport** | Roads, rail, transit, ports, airports, bridges, signals, traffic flow | Transport authority |
| **Telecom** | Fiber, cell, IXPs, submarine cables, peering, congestion | Telecom regulator |
| **Sanitation** | Sewerage, treatment, solid waste, recycling | Sanitation authority |
| **Buildings** | Public housing, school estates, hospital estates, public buildings, energy and condition | Building/public works authorities |
| **Urban** | Land use, zoning, public space, mobility, air quality, noise | Municipal authorities |
| **Agriculture** | Soil moisture, irrigation, crop status, livestock health (aggregate), market | Agriculture authority |
| **Ecological** | Forests, wetlands, fisheries, biodiversity indicators, climate variables | Environment authority |
| **Coastal** | Sea level, erosion, coastal infrastructure | Coastal authority |
| **Disaster risk** | Hazard maps, exposure, vulnerability, climate projections | Disaster authority |

Each domain has its own twin, operated by the responsible authority, integrated via CivicBus and shared schemas.

---

## 4. Architecture

```
                          Public infrastructure digital twin (one domain)
        ┌──────────────────────────────────────────────────────────────────────┐
        │                                                                      │
        │   PHYSICAL                                                           │
        │   Reservoirs, pumps, valves, meters, sensors, weather stations,      │
        │   satellite feeds (per Companion 23)                                 │
        │                                                                      │
        │   ───────────────────────────────────────────────────────────        │
        │                                                                      │
        │   INGEST                                                             │
        │   - sensor edge gateways (attested)                                  │
        │   - protocol adapters (MQTT, OPC-UA, Modbus, SCADA)                 │
        │   - SatCom feeds                                                     │
        │   - Citizen-reported observations (privacy-preserved)                │
        │   - Civil society contribution channels                              │
        │                                                                      │
        │   ───────────────────────────────────────────────────────────        │
        │                                                                      │
        │   AUTHORITATIVE DATA                                                 │
        │   - canonical schemas (OGC, CityGML, INSPIRE, IFC, LandInfra, ...)  │
        │   - time-series store (per Companion 23)                            │
        │   - geometry store (3D, GIS)                                         │
        │   - asset registry (per asset: build, maintenance, lifecycle)        │
        │                                                                      │
        │   ───────────────────────────────────────────────────────────        │
        │                                                                      │
        │   SIMULATION LAYER                                                   │
        │   - physics-based models (hydrology, power flow, etc.)              │
        │   - AI surrogates for fast simulation (Class C/D)                    │
        │   - scenario engines (what-if planning)                              │
        │   - climate downscaling                                              │
        │                                                                      │
        │   ───────────────────────────────────────────────────────────        │
        │                                                                      │
        │   QUERY API                                                          │
        │   - planning queries (citizen, civil society, planner)               │
        │   - operational queries (operator)                                   │
        │   - emergency queries (NCCC)                                         │
        │   - cross-domain queries (multi-twin scenarios)                      │
        │                                                                      │
        │   ───────────────────────────────────────────────────────────        │
        │                                                                      │
        │   GOVERNANCE LAYER                                                   │
        │   - access control (citizen / planner / operator / officer)          │
        │   - privacy controls (differential privacy, aggregation, k-anon)     │
        │   - constitutional officer oversight                                 │
        │   - civil society standing access                                    │
        │   - audit and contestability                                         │
        │                                                                      │
        └──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Authoritative data

### 5.1 Schemas

- **Buildings**: IFC, CityGML, IndoorGML.
- **Infrastructure geometry**: OGC standards, LandInfra, INSPIRE.
- **Time series**: TimescaleDB / InfluxDB / OpenTSDB-compatible.
- **Sensor metadata**: SensorThings API (OGC).
- **Climate**: WMO, CMIP, ECMWF data formats.
- **Geospatial**: GeoJSON, OGC API Features, OGC API Records.
- **Asset registry**: per sovereign asset standard, harmonized.

### 5.2 Provenance

- Every data point has source, timestamp, quality.
- Sensor data lineage to physical asset.
- AI-derived data marked explicitly.

### 5.3 Quality

- Quality scoring per data source.
- Anomaly detection on input streams.
- Cross-source validation where possible.
- Human review for high-stakes inferences.

### 5.4 Discipline

- Anti-inference-as-fact.
- Honest about data gaps.
- Civil society audit access.

### 5.5 Forbidden

- Citizen-level surveillance data in twin (twins are about infrastructure, not citizens).
- Inferred citizen behavior linked to twin data.
- Suppression of data gaps.

---

## 6. Privacy-by-design

### 6.1 The principle

Infrastructure twins must aggregate. Citizen-level resolution is forbidden by default. Where citizen-level data is collected for billing or service (e.g., utility meters), it is segregated from the twin and not exposed in twin queries.

### 6.2 Mechanisms

- **Spatial aggregation**: smallest published unit is statistically robust (e.g., 100m grid, neighborhood) per privacy review.
- **Temporal aggregation**: smallest published interval is statistically robust.
- **Differential privacy**: applied to citizen-derived aggregates.
- **k-anonymity / l-diversity**: where applicable.
- **Segregation**: billing-grade citizen data not in twin.

### 6.3 Discipline

- Anti-re-identification.
- Honest about privacy floor.
- Citizen visibility into privacy guarantees.

### 6.4 Forbidden in twin privacy

- Citizen-level resolution in publicly queryable twin.
- Re-identification attack.
- Cross-linking twin to citizen-individual data.
- Use of twin for citizen profiling.

---

## 7. Access tiers

### 7.1 Public

- Aggregate views of infrastructure status.
- Citizen-facing dashboards (Companion 23 §11).
- Open data downloads under license (per Companion 31).
- Plain-language summaries.

### 7.2 Civil society standing

Per Companion 74:

- Civil society organizations with standing access to higher-resolution data subject to privacy review.
- Audit access to twin operations.
- Findings publishable.

### 7.3 Planner

- Authorized civil servants in planning roles.
- Higher resolution within privacy floor.
- Scenario engine access.

### 7.4 Operator

- Real-time operational data.
- Control authority per asset (in SCADA / operational context).
- Operational dashboards.

### 7.5 Constitutional officer

- Audit access across all tiers.
- Per Companion 28.

### 7.6 Discipline

- Anti-tier-creep (tiers don't grow silently).
- Anti-discrimination across civil society organizations.
- Audit of access.

### 7.7 Forbidden

- Tier-bypass.
- Public access removed without justification.
- Civil society standing revoked for political reasons.

---

## 8. Simulation discipline

### 8.1 Physics-based models

- Documented assumptions.
- Documented validation against real-world data.
- Uncertainty quantified.
- Open-source preferred.

### 8.2 AI surrogates

- Class C/D per Companion 138.
- Charter required.
- Validation against physics-based and real-world data.
- Drift monitoring.
- Replaceable by physics-based when surrogate fails.

### 8.3 Scenario engines

- For planning purposes (what-if).
- Citizens and civil society can submit scenarios for evaluation per scope.
- Scenario outcomes reported with uncertainty.

### 8.4 Forbidden in simulation

- Simulation results presented as certain.
- AI surrogate replacing physics-based for high-stakes without validation.
- Hidden simulation assumptions.

---

## 9. Cross-domain twin federation

### 9.1 The pattern

Many decisions require querying multiple twins — building twin + power twin + transport twin for an urban development; water twin + ecological twin for water allocation; climate twin + agriculture twin for adaptation.

### 9.2 Mechanisms

- CivicBus inter-twin queries.
- Shared schemas via Companion 07 data dictionary.
- Cross-twin scenario engines.
- Authority routing (each twin's operator decides on cross-twin query).

### 9.3 Discipline

- Anti-twin-monopolization.
- Anti-hidden-cross-link.
- Honest cross-domain inference.

### 9.4 Forbidden

- Cross-domain queries that enable citizen profiling.
- Cross-domain queries without per-twin governance.

---

## 10. Cross-sovereign twin federation

### 10.1 The pattern

Climate, water, transport, energy, and ecological systems frequently cross sovereign borders.

### 10.2 Per Companion 140

- Cross-border twin federation per treaty.
- Each sovereign keeps its own twin.
- Shared schemas via multilateral bodies (WMO, ECMWF, ICAO, IATA, etc.).
- Inter-realm gateway active.

### 10.3 Discipline

- Sovereign authority preserved.
- Anti-supranational-twin-monopoly.
- Honest about cross-border dependencies.

### 10.4 Forbidden

- Cross-sovereign twin federation without treaty.
- Foreign-controlled twin operating over sovereign infrastructure.
- Data extraction beyond treaty.

---

## 11. Constitutional officer oversight

### 11.1 Mechanisms

- Algorithmic Ombudsman reviews AI surrogates and charters.
- Sovereign Trust Officer reviews invariant compliance.
- People's Editor reviews citizen-facing twin communications.
- Future Generations Commissioner reviews long-horizon stewardship.
- Auditor General audits twin spending and operations.
- Inspector General investigates misuse.

### 11.2 Discipline

- Anti-officer-exclusion.
- Honest engagement.

### 11.3 Forbidden

- Twin operation without officer notification of major changes.
- Suppression of officer findings on twins.

---

## 12. Long-horizon stewardship

### 12.1 The principle

Twins are intergenerational artifacts. They model infrastructure that endures across generations and must be maintained across generations.

### 12.2 Per Companion 41 and Volume II Part 7

- 30-year reviews.
- Generational documentation.
- Civic Memory Archive integration (Companion 25).
- Future Generations Commissioner concurrence on major twin changes.

### 12.3 Discipline

- Anti-short-termism.
- Honest documentation for future generations.
- Lessons-learned integration.

### 12.4 Forbidden

- Twin abandonment without succession plan.
- Short-term-optimized twins that erode long-horizon value.

---

## 13. Citizen engagement

### 13.1 Mechanisms

- Citizen-facing dashboards per Companion 23.
- Plain-language summaries per Companion 22.
- Citizen reporting channel (e.g., pothole, leak, outage).
- Citizens' Assembly engagement on infrastructure planning per Companion 19.
- Participatory budgeting integration where applicable.

### 13.2 Discipline

- Anti-paternalism.
- Anti-exclusion.
- Cultural and linguistic accommodation.

### 13.3 Forbidden

- Citizen exclusion from twin access.
- Use of citizen reports for individual citizen profiling.
- Discrimination in citizen engagement.

---

## 14. Replaceability and exit

### 14.1 The principle

Per Companion 14 and Companion 139:

- Twin platform replaceable.
- Twin data portable in open schemas.
- Twin operator replaceable.
- Exit window published.

### 14.2 Mechanisms

- Source-available twin platform.
- Standard schemas.
- Data export tooling.
- Parallel-operation pilot for replacement.

### 14.3 Forbidden

- Twin lock-in.
- Vendor-controlled schemas.
- Exit-prevention through proprietary formats.

---

## 15. Sustainability and climate

### 15.1 Per Companion 49

- Twin operations themselves measured for energy and ecology.
- Twin-supported decisions assessed for sustainability.
- Climate adaptation core use case.

### 15.2 Discipline

- Anti-greenwashing via twin.
- Honest accounting.

### 15.3 Forbidden

- Use of twin to misrepresent climate or environmental status.
- Suppression of adverse environmental findings.

---

## 16. Cross-references

- Companion 07 (data dictionary).
- Companion 14 (open kernel and licensing).
- Companion 19 (Citizens' Assemblies).
- Companion 22 (plain language, multilingual).
- Companion 23 (sensors and IoT).
- Companion 25 (Civic Memory Archive).
- Companion 28 (constitutional officers).
- Companion 31 (transparency).
- Companion 41 (era reviews).
- Companion 49 (sustainability and climate).
- Companion 56 (KPIs).
- Companion 74 (civil society).
- Companion 100 (police interface — for transport/urban context, narrow).
- Companion 134 (physical infrastructure resilience).
- Companion 138 (constitutional AI governance).
- Companion 139 (sovereignty doctrine).
- Companion 140 (multi-country interop).
- Companion 142 (NCCCs).

---

## 17. KPIs

| KPI | Indicator |
|---|---|
| Twin coverage by domain | Published |
| Sensor coverage and uptime | Per twin |
| Authoritative data freshness | Per indicator |
| Privacy-by-design audit | Annual |
| Citizen access | Active per domain |
| Civil society standing access | Active |
| AI surrogate charter compliance | 100% |
| Cross-domain scenario engagement | Per use |
| Constitutional officer reviews | Per cycle |
| 30-year review schedule | On track |
| Exit drill | Annual per twin |
| Sustainability of twin operations | Per Companion 49 |

---

## 18. Forbidden in public infrastructure digital twins

CivicOS will not:

- Permit citizen-level resolution in publicly queryable twin.
- Allow citizen profiling through twin data.
- Permit twin operation outside sovereign control.
- Allow vendor-locked twin without exit and source escrow.
- Permit AI surrogate deployment without Class C/D charter.
- Allow simulation results presented as certain without uncertainty disclosure.
- Permit cross-domain queries enabling citizen profiling.
- Allow cross-sovereign twin federation without treaty.
- Permit foreign-controlled twin operating over sovereign infrastructure.
- Allow data extraction beyond treaty.
- Permit suppression of adverse environmental findings.
- Allow short-term twin optimization that erodes long-horizon value.
- Permit twin abandonment without succession.
- Allow citizen exclusion from twin access.
- Permit civil society standing revocation for political reasons.
- Allow tier-bypass or silent tier creep.

This list grows; it does not shrink.

---

## 19. The public infrastructure digital twin north star

Digital twins of public infrastructure are models of common wealth, and models of common wealth belong to the public. CivicOS deploys twins as public-purpose models — sovereign-controlled, privacy-preserved by design, civil-society-accessible, constitutional-officer-supervised, open-standard, replaceable, intergenerationally stewarded.

When CivicOS becomes infrastructure where twins are vendor-controlled, citizen-individual-resolved, used for citizen profiling, captured by short-termism, abandoned by successor governments, hidden from civil society, exploited for surveillance, or treated as proprietary — it has failed at the public-purpose discipline. Capability without twin discipline is the institutionalization of infrastructure surveillance hiding inside planning.

When the platform supports twins that are sovereign-owned, privacy-preserved, citizen-accessible, civil-society-engaged, officer-supervised, open-standard, replaceable, and long-horizon-stewarded — it earns the right to be infrastructure for governance that plans, operates, maintains, and adapts public infrastructure across generations.

The discipline is daily. The privacy is engineered. The access is real. The standards are open. The supervision is continuous. The horizon is generations.

Public infrastructure is common wealth. Its digital twin is its model. The model belongs to the public. The platform's job is to keep it so. Anything less is the privatization-by-software of the substrate citizens collectively own — and once privatized, the citizens lose the capacity to plan, maintain, or adapt what they paid for.
