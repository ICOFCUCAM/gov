# CivicOS — Operational Failure Modes and Recovery (Companion 109)

This companion specifies common operational failure modes in CivicOS deployments and structured recovery approaches. It complements Companion 26 (failure case studies — strategic), Companion 05 (SLO and DR catalog), Companion 30 (crisis operations), Companion 02 (threat model), and Companion 78 (sovereign cybersecurity) by being specifically operational: what happens when things go wrong day-to-day and how operators recover.

The thesis: **strategic failure modes (Companion 26) get most attention; operational failure modes get less but matter daily**. Service outages, data corruption, capacity overruns, integration failures, performance degradation, deployment issues — these affect citizens routinely. Recovery discipline determines whether failures become crises or get absorbed.

The discipline: rapid detection; clear severity classification; pre-positioned runbooks; honest communication; post-mortem culture; structural fixes over hero responses; citizen impact prioritized; learning preserved.

---

## 1. Principles

1. **Rapid detection.** Faster detection = smaller impact.
2. **Clear severity classification.** Per Companion 05 tiers.
3. **Pre-positioned runbooks.** Per common failure modes.
4. **Honest communication.** Within 15 minutes for tier-0.
5. **Post-mortem culture.** Blameless; learning-focused.
6. **Structural fixes over hero responses.** Anti-firefighting-as-culture.
7. **Citizen impact prioritized.** Their experience matters most.
8. **Learning preserved.** In documentation and process.
9. **Anti-cover-up.** Honest acknowledgment.
10. **Constitutional officer notification.** For consequential failures.

---

## 2. Common operational failure modes

### 2.1 Service outage

- Citizens cannot access service.
- Tier-0: 99.99% availability commitment.
- Recovery: failover, root cause identification, restoration.

### 2.2 Performance degradation

- Service available but slow.
- Latency budgets per Companion 05 §2.
- Recovery: capacity scaling, query optimization, infrastructure tuning.

### 2.3 Data integrity issues

- Records inconsistent or corrupted.
- Audit Vault detection.
- Recovery: rollback, reconciliation, citizen notification.

### 2.4 Integration failures

- Cross-system data flows failing.
- CivicBus monitoring detects.
- Recovery: protocol troubleshooting, schema versioning resolution.

### 2.5 Capacity overruns

- Demand exceeds capacity.
- Often around predictable peaks (tax season, payday, election).
- Recovery: capacity expansion, demand shaping.

### 2.6 Deployment issues

- New version causing problems.
- Recovery: rollback to prior version.

### 2.7 Configuration errors

- Wrong settings causing problems.
- Recovery: configuration audit, correction.

### 2.8 Third-party failures

- Vendor or external dependency failure.
- Recovery: failover to alternative, vendor accountability.

### 2.9 Security incidents

- Per Companion 30 §7.
- Recovery: contain, investigate, remediate, report.

### 2.10 AI capability failures

- Decision class B+ capability errors.
- Recovery per Companion 10 §6 (reversibility).

---

## 3. Severity classification

Per Companion 05 tiers:

| Severity | Description | Response time |
|---|---|---|
| **SEV-0 (Critical)** | National-critical service down | Immediate; all hands |
| **SEV-1 (High)** | Significant service impact; many citizens affected | <15 minutes |
| **SEV-2 (Medium)** | Limited impact; some citizens affected | <1 hour |
| **SEV-3 (Low)** | Minor impact; few citizens affected | <4 hours |
| **SEV-4 (Informational)** | No citizen impact; needs attention | <24 hours |

### 3.1 Discipline

- Anti-severity-inflation (treating everything as SEV-0).
- Anti-severity-deflation (downplaying impact).
- Honest assessment.

### 3.2 Forbidden

- Coverup through severity reclassification.
- Politicized severity assessment.

---

## 4. Pre-positioned runbooks

Per Companion 05 §8:

### 4.1 Required runbooks

- Per tier-0 service failover.
- Per common failure pattern.
- Per integration failure pattern.
- Per security incident class.
- Per data integrity issue class.
- Per deployment rollback.
- Per capacity surge.

### 4.2 Runbook discipline

- Tested per Companion 05 §4.3.
- Updated when learnings emerge.
- Accessible to on-call operators.
- Clear authority designations.

### 4.3 Forbidden

- Runbooks that exist but aren't tested.
- Runbooks that haven't been updated for years.
- Runbooks inaccessible during incidents.

---

## 5. Detection

### 5.1 Mechanisms

- Continuous monitoring per Companion 11 §8.
- SLO budget tracking.
- Anomaly detection (per Companion 21 §3.7).
- Citizen complaint pattern recognition.
- Civil society reports.
- Whistleblower channels.

### 5.2 Discipline

- Multiple detection paths.
- Anti-single-point-of-detection.
- Honest assessment of detection gaps.

### 5.3 Forbidden

- Suppression of failure signals.
- Discriminatory detection (some failures noticed; others ignored).
- Use of detection for political purposes.

---

## 6. Initial response

### 6.1 Within first 15 minutes (SEV-0/1)

- Confirm incident.
- Notify on-call and incident commander.
- Begin runbook execution.
- Initial communication to constitutional officers.
- Initial communication to affected populations (where applicable).
- Begin diagnostics.

### 6.2 Within first hour

- Severity confirmed.
- Recovery in progress.
- Public communication if citizen-facing.
- Civil society and journalists informed for major incidents.

### 6.3 Discipline

- Anti-paralysis.
- Anti-rushed-action.
- Clear command structure.

### 6.4 Forbidden

- Hidden incident management.
- Delay in citizen communication for political reasons.
- Politicized incident response.

---

## 7. Recovery

### 7.1 Mechanisms

- Failover where applicable.
- Root cause identification.
- Containment of impact.
- Remediation.
- Verification of recovery.

### 7.2 Discipline

- Anti-hero-response culture.
- Anti-short-term-patches that become permanent.
- Structural fixes prioritized.

### 7.3 Forbidden

- Recovery that creates new problems.
- Pretextual recovery declaration.
- Suppression of remaining issues.

---

## 8. Communication

### 8.1 Internal

- Operations team coordination.
- Incident commander decisions.
- Constitutional officer notification.
- Sovereign Steering Committee for major incidents.

### 8.2 External

- Public status page.
- Affected citizen notifications.
- Civil society and journalism inform.
- International cooperation where applicable.

### 8.3 Discipline

- Honest communication.
- Plain language.
- Multilingual where appropriate.
- Anti-misleading-framing.

### 8.4 Forbidden

- Hidden incidents.
- Misleading public communication.
- Politicized framing.
- Suppression of failure communication.

---

## 9. Constitutional officer engagement

### 9.1 Required notifications

- Sovereign Trust Officer for invariant violations.
- Algorithmic Ombudsman for AI capability failures.
- DPA for data breaches.
- Auditor General for financial impact.
- Inspector General for misconduct-related failures.
- People's Editor for citizen-facing communication review.

### 9.2 Discipline

- Anti-delay in notification.
- Cooperation with officer investigation.
- Anti-cover-up.

### 9.3 Forbidden

- Hidden incidents from constitutional officers.
- Delayed notification for political reasons.
- Suppression of officer investigation.

---

## 10. Post-incident review

### 10.1 The principle

Per Companion 41 §4.4: blameless post-mortems focused on learning.

### 10.2 Mechanisms

- Within 30 days for SEV-0/1.
- Within 90 days for SEV-2.
- Documentation of findings.
- Root cause analysis.
- Recommended structural changes.
- Public summary for tier-0 incidents.

### 10.3 Discipline

- Blameless culture.
- Anti-scapegoating.
- Honest analysis.
- Structural focus.

### 10.4 Forbidden

- Politicized post-mortem.
- Scapegoating of individuals for systemic failures.
- Suppression of post-mortem findings.

---

## 11. Structural fixes

### 11.1 The principle

Same incident shouldn't recur. Structural fixes prioritized.

### 11.2 Mechanisms

- Post-mortem recommendations tracked.
- Implementation timelines.
- Verification of fixes.
- Civil society and constitutional officer follow-up.

### 11.3 Discipline

- Anti-permanent-firefighting-culture.
- Anti-fix-deferred-indefinitely.
- Honest accountability for fix implementation.

### 11.4 Forbidden

- Post-mortem recommendations ignored.
- Hidden tracking of fix implementation.
- Discriminatory enforcement of fix discipline.

---

## 12. Learning preservation

Per Companion 41:

### 12.1 Mechanisms

- Post-mortems preserved indefinitely.
- Learnings integrated into runbooks.
- Cross-team learning sessions.
- Civic Academy curriculum updates.

### 12.2 Discipline

- Anti-erasure of difficult learnings.
- Honest acknowledgment of patterns.
- Cross-sovereign learning sharing.

### 12.3 Forbidden

- Suppression of post-mortem records.
- Politicized rewriting of incident history.
- Discrimination in learning preservation.

---

## 13. Citizen impact prioritization

### 13.1 The principle

Citizens experiencing failure impact should be served well during recovery.

### 13.2 Mechanisms

- Affected citizen identification.
- Alternative service paths.
- Communication in their language and modality.
- Compensation where applicable.
- Apology and remedy per Companion 22 §11.

### 13.3 Discipline

- Anti-blame-of-citizens for state failures.
- Anti-burden-shift to citizens.
- Honest acknowledgment.

### 13.4 Forbidden

- Citizen impact ignored during recovery.
- Use of failure data for adverse decisions on affected citizens.
- Discriminatory impact mitigation.

---

## 14. Vendor accountability

### 14.1 The principle

Vendor-caused failures require vendor accountability.

### 14.2 Mechanisms

- Vendor failure documented.
- Contract enforcement.
- Penalties per contract terms.
- Vendor remediation tracked.
- Reputation tracking across sovereigns.

### 14.3 Discipline

- Anti-vendor-impunity.
- Anti-vendor-coverup.
- Honest assessment.

### 14.4 Forbidden

- Vendor failures hidden to protect commercial relationship.
- Vendor accountability waived for political reasons.
- Cooperative cover-up.

---

## 15. Cross-sovereign learning

### 15.1 Mechanisms

- Cross-sovereign incident sharing where appropriate.
- Cross-sovereign learning sessions.
- Multi-sovereign vendor accountability where applicable.

### 15.2 Discipline

- Anti-cross-sovereign-shaming.
- Honest sharing.
- Cultural sensitivity.

### 15.3 Forbidden

- Use of cross-sovereign learning for political purposes.
- Discrimination among sovereigns in learning exchange.

---

## 16. Forbidden in operational failure response

CivicOS will not:

- Permit suppression of failure signals.
- Allow politicized severity assessment.
- Permit runbooks that exist but aren't tested.
- Allow hidden incident management.
- Permit delay in citizen communication for political reasons.
- Allow politicized incident response.
- Permit recovery that creates new problems.
- Allow pretextual recovery declaration.
- Permit hidden incidents from public.
- Allow misleading public communication.
- Permit hidden incidents from constitutional officers.
- Allow scapegoating of individuals for systemic failures.
- Permit suppression of post-mortem findings.
- Allow post-mortem recommendations ignored.
- Permit suppression of post-mortem records.
- Allow politicized rewriting of incident history.
- Permit citizen impact ignored during recovery.
- Allow use of failure data for adverse decisions on affected citizens.
- Permit vendor failures hidden to protect commercial relationship.
- Allow vendor accountability waived for political reasons.

This list grows; it does not shrink.

---

## 17. KPIs

| KPI | Indicator |
|---|---|
| Mean time to detection | Decreasing |
| Mean time to recovery | Decreasing |
| Post-mortem completion rate | 100% for SEV-0/1 |
| Structural fix implementation rate | High |
| Citizen impact mitigation | Affected populations supported |
| Vendor accountability | Enforced per contracts |
| Cross-sovereign learning | Active sharing |
| Anti-cover-up | No documented suppression |

---

## 18. The operational failure response north star

Failures will happen. They are not avoidable. What's optional is whether they become crises or get absorbed. CivicOS supports operational failure response through rapid detection, clear severity classification, pre-positioned runbooks, honest communication, post-mortem culture, structural fixes, citizen impact prioritization, vendor accountability, and learning preservation.

When CivicOS becomes a tool of failure cover-up, scapegoating, political-instrumentalization-of-incidents, vendor impunity, or post-mortem suppression — it has failed at operational integrity. Capability without failure response discipline is not progress; it is the institutionalization of crises that should have been absorbed.

When the platform supports honest, disciplined, learning-focused operational failure response — it earns the trust that comes from knowing that when things go wrong, the state acknowledges, recovers, and learns.

The discipline is daily. The detection is rapid. The communication is honest. The post-mortem is blameless. The fixes are structural. The learning is preserved.

Operational failures are tests of platform integrity. Pass them well and trust grows. Fail them and trust corrodes. The discipline determines which.
