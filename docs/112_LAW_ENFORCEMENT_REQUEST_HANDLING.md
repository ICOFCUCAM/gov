# CivicOS — Law Enforcement Request Handling (Companion 112)

This companion specifies how CivicOS handles requests for information from law enforcement agencies. It complements Companion 24 (security and rights balance, especially §3-5 on lawful intercept and watch lists), Companion 70 (police and corrections), Companion 21 (anti-corruption), and Companion 102 (fragile contexts) by being specifically about the operational practice of receiving, evaluating, and responding to law enforcement requests for data or other assistance.

The thesis: **law enforcement legitimately needs information for investigations, and CivicOS legitimately serves citizens by protecting against abuse of that access**. The balance is in process: requests properly authorized, narrow in scope, audited, with affected citizens notified where lawful. Done well, both legitimate investigation and citizen rights are served. Done badly, the platform becomes surveillance state in waiting.

The discipline: every request authorized at appropriate level; scope strictly bounded; technical constraints enforced; audit trail tamper-evident; Inspector General review; citizen notification per applicable law; aggregate reporting public; cross-border requests refused without local court order.

---

## 1. Principles

1. **Every request properly authorized.** Per applicable law.
2. **Scope strictly bounded.** Specific person, period, data type.
3. **Technical constraints enforced.** Not just policy.
4. **Audit trail tamper-evident.** Per Companion 24 §4.
5. **Inspector General review.** Every request.
6. **Citizen notification per applicable law.** After-fact disclosure where lawful.
7. **Aggregate reporting public.** Annual transparency.
8. **Cross-border requests refused without local court order.** Per Companion 24 §7.
9. **Anti-fishing-expedition.** Specific, not exploratory.
10. **Mass surveillance forbidden absolutely.** Per forbidden list.

---

## 2. Request types

| Type | Authority typically required | Scope |
|---|---|---|
| **Subscriber information** | Court order or equivalent | Identity, contact, account details |
| **Transactional records** | Court order | Records of past activity |
| **Real-time content** | Judicial warrant per Companion 24 §4 | Live communications, narrow |
| **Real-time location** | Judicial warrant | Live location, narrow |
| **Stored content** | Judicial warrant typically | Email, messages, files |
| **Health records** | Strict judicial process for criminal | Per Companion 38 §4 |
| **Financial records** | Court order or financial intelligence unit request | Per applicable law |
| **Mental health records** | Strictest scrutiny | Per Companion 38 §9 (often refused absent narrow exception) |
| **Neural data** | Forbidden absolutely | Per Companion 32 |

Each type has distinct authorization and scope requirements.

---

## 3. Request submission

### 3.1 Mechanisms

- Law enforcement submission portal.
- Authentication of requesting agency.
- Authentication of specific authorized officer.
- Authorization documents required (court order, warrant, statutory authority).
- Scope clearly specified.
- Time period specified.

### 3.2 Discipline

- Anti-informal-requests.
- All requests documented.
- Audit trail begins at submission.

### 3.3 Forbidden

- Informal channels for sensitive requests.
- Unauthenticated submissions.
- Vague scope.

---

## 4. Authorization verification

### 4.1 Mechanisms

- Court order or warrant cryptographically verified (Companion 24 §4).
- Issuing judge's signature authenticated.
- Expiration date checked.
- Scope verified against authorization.
- Cross-reference with revocation lists.

### 4.2 Discipline

- Cryptographic verification, not just policy.
- Anti-stale-warrant acceptance.
- Anti-scope-expansion beyond authorization.

### 4.3 Forbidden

- Acting on expired authorizations.
- Acting on improperly authorized requests.
- Scope expansion beyond authorization.

---

## 5. Quota and rate limiting

### 5.1 The principle

Hardware-enforced quotas prevent mass surveillance even with warrants.

### 5.2 Mechanisms

- Per-agency quotas.
- Per-officer quotas.
- Hardware-enforced caps.
- Anti-quota-circumvention.

### 5.3 Discipline

- Quotas not just policy.
- Quota expansion requires constitutional process.
- Independent oversight of quota use.

### 5.4 Forbidden

- Mass surveillance via aggregated narrow requests.
- Quota circumvention through informal channels.
- Quota expansion without constitutional process.

---

## 6. Technical execution

### 6.1 Mechanisms

- Specific data extraction per authorization.
- Cryptographic preservation of authenticity.
- Audit log of extraction.
- Chain of custody documented.
- Anti-cross-contamination with other data.

### 6.2 Discipline

- Anti-broader-extraction than authorized.
- Technical isolation of extraction process.
- Independent monitoring.

### 6.3 Forbidden

- Extraction beyond authorized scope.
- Use of extraction infrastructure for other purposes.
- Persistent extraction infrastructure absent warrant.

---

## 7. Audit trail

### 7.1 Mechanisms

- Every request logged.
- Every action logged.
- Every data access logged.
- Tamper-evident audit trail.
- Cross-replication for integrity.

### 7.2 Discipline

- Anti-audit-trail-tampering.
- Independent verification.
- Anti-suppression of audit findings.

### 7.3 Forbidden

- Audit trail bypass.
- Selective audit logging.
- Suppression of audit findings.

---

## 8. Inspector General review

### 8.1 Mechanisms

- Every request reviewed by Inspector General office.
- Pattern analysis.
- Anomaly detection.
- Public aggregate reporting.

### 8.2 Discipline

- Anti-Inspector-General-capture.
- Independent investigation authority.
- Public reporting of findings.

### 8.3 Forbidden

- Suppression of Inspector General investigation.
- Discrimination in Inspector General review.
- Use of Inspector General access for political purposes.

---

## 9. Citizen notification

### 9.1 The principle

Citizens whose data was accessed should be notified after the fact, where lawful and safe.

### 9.2 Mechanisms

- Statutory notification windows.
- Notification through Civic Wallet.
- Plain-language explanation.
- Citizen access to their own audit record.

### 9.3 Discipline

- Anti-permanent-secrecy of warrant use beyond necessity.
- Honest notification when window expires.
- Anti-discriminatory notification.

### 9.4 Forbidden

- Permanent secrecy beyond statutory necessity.
- Discriminatory notification.
- Use of notification for adverse decisions.

---

## 10. Cross-border requests

### 10.1 The principle

Per Companion 24 §7: foreign government requests require local court order.

### 10.2 Mechanisms

- Mutual Legal Assistance Treaty (MLAT) process.
- Refusal of unilateral foreign demands.
- Sovereign Trust Officer notification of cross-border demand attempts.
- Public reporting on cross-border request volumes.

### 10.3 Discipline

- Sovereign authority preserved.
- Anti-foreign-coercion.
- Anti-extraterritorial-jurisdiction enforcement.

### 10.4 Forbidden

- Foreign government data demands honored without local court order.
- Cross-border data flows exposing citizens to harm.
- Mass cross-border surveillance arrangements.

---

## 11. Refusal patterns

### 11.1 Grounds for refusal

- Authorization improper or expired.
- Scope exceeds authorization.
- Forbidden capability requested.
- Foreign demand without local court order.
- Mass surveillance pattern detected.
- Request would expose vulnerable person to harm.

### 11.2 Mechanisms

- Refusal documented.
- Refusal rationale provided to requester.
- Appeal mechanism available.
- Public aggregate refusal statistics.

### 11.3 Discipline

- Anti-rubber-stamp culture.
- Anti-pretextual-refusal.
- Honest assessment.

### 11.4 Forbidden

- Compliance with improper requests.
- Refusal of legitimate requests for political reasons.
- Pretextual refusal patterns.

---

## 12. Vulnerable population protections

### 12.1 Heightened scrutiny for

- Journalists and their sources.
- Civil society leaders.
- Legal aid attorneys and their clients.
- Religious counselors.
- Doctors and patients.
- Refugees and asylum seekers.
- LGBTQ+ in restrictive contexts.
- Children's data.
- Mental health data.
- Reproductive health data.
- Indigenous community data.

### 12.2 Discipline

- Strict authorization requirements.
- Anti-pretextual-targeting.
- Enhanced Inspector General review.

### 12.3 Forbidden

- Surveillance of journalists in lawful work (Companion 72).
- Surveillance of civil society in lawful work (Companion 74).
- Targeting based on protected characteristics.
- Use of vulnerable population data for surveillance.

---

## 13. Public reporting

### 13.1 Annual surveillance transparency report

Per Companion 24 §13.1:

- Number of warrants issued, by category.
- Number of warrants denied.
- Average warrant duration.
- Number of subjects affected.
- Compliance violations and consequences.
- Inspector General findings.

### 13.2 Discipline

- Aggregate but meaningful.
- Anti-misleading-summarization.
- Public availability.

### 13.3 Forbidden

- Suppression of transparency reporting.
- Misleading aggregation.
- Discriminatory disclosure.

---

## 14. Civil society and journalism standing

### 14.1 Mechanisms

- Civil society organizations engaged on systematic patterns.
- Journalists informed of aggregate trends.
- Civil society challenges to systematic problems.
- Whistleblower channels for misconduct.

### 14.2 Discipline

- Anti-suppression of civil society engagement.
- Anti-targeting of those engaging.

### 14.3 Forbidden

- Targeting civil society for engagement on surveillance.
- Suppression of journalism on surveillance patterns.
- Use of system to retaliate against critics.

---

## 15. Forbidden in law enforcement request handling

CivicOS will not:

- Permit informal channels for sensitive requests.
- Allow unauthenticated submissions.
- Permit acting on expired authorizations.
- Allow acting on improperly authorized requests.
- Permit scope expansion beyond authorization.
- Allow mass surveillance via aggregated narrow requests.
- Permit quota circumvention.
- Allow extraction beyond authorized scope.
- Permit persistent extraction infrastructure absent warrant.
- Allow audit trail bypass.
- Permit suppression of audit findings.
- Allow Inspector General suppression.
- Permit permanent secrecy beyond statutory necessity.
- Allow foreign government data demands honored without local court order.
- Permit mass cross-border surveillance.
- Allow compliance with improper requests.
- Permit refusal of legitimate requests for political reasons.
- Allow surveillance of journalists in lawful work.
- Permit surveillance of civil society in lawful work.
- Allow targeting based on protected characteristics.
- Permit suppression of transparency reporting.
- Allow targeting civil society for engagement on surveillance.

This list grows; it does not shrink.

---

## 16. KPIs

| KPI | Indicator |
|---|---|
| Authorization verification compliance | 100% |
| Improper requests refused | Active refusal |
| Audit trail integrity | Continuous |
| Inspector General coverage | All requests |
| Citizen notification compliance | Per statutory window |
| Cross-border refusal compliance | 100% without local court order |
| Anti-vulnerable-targeting | Decreasing complaints |
| Transparency reporting timeliness | Annual on schedule |
| Civil society engagement | Active |

---

## 17. The law enforcement request handling north star

Law enforcement legitimately needs information for investigations. CivicOS legitimately serves citizens by protecting against abuse of access. The balance is operational: requests properly authorized, narrow in scope, audited, with citizen notification where lawful, aggregate reporting public, cross-border refused without local court order.

When CivicOS becomes a tool of mass surveillance, political targeting, foreign coercion, vulnerable population surveillance, or systematic civil liberties violation — it has failed at the deepest test. Capability without law enforcement request discipline is not progress; it is the institutionalization of surveillance state.

When the platform supports legitimate investigation while preventing abuse — through authorization verification, scope enforcement, technical constraints, audit, Inspector General review, citizen notification, transparent reporting — it earns the right to be infrastructure for societies that take both safety and liberty seriously.

The discipline is daily. The authorization is verified. The scope is bounded. The audit is real. The Inspector General is independent. The citizen notification is honest. The reporting is transparent. The cross-border refusal is firm.

Surveillance is one of the deepest threats to citizens. The platform's response shapes whether citizens experience the state as their servant or their watcher. Anything less than the strictest discipline abandons citizens to surveillance dressed as law enforcement.
