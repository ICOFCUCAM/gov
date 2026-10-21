# CivicOS: A constitution-neutral architecture for sovereign government

> **Status and provenance.** External architectural advice, received 2026-10-20 in answer to the
> separation-of-powers brief (an external AI review commissioned by the project owner), recorded
> here **verbatim and in full** at the owner's instruction: it is not to be summarised or
> discarded, and work on institutions, branches, offices, powers, relationships, transitions,
> emergencies and workspaces follows it. Citation markers from the original (source names such as
> "GOV.UK +1") are kept as they appeared. As the text itself says, its schema and matrices are
> architectural recommendations, not legal opinions; every national configuration needs legal
> validation. How it is being applied, measured against the code: the separation-of-powers audit
> and the plan in `docs/CONSTITUTIONAL_ARCHITECTURE_PLAN.md`.

---

## Executive recommendation

CivicOS should be designed as a configurable constitutional operating system, not as an executive-government application with additional branches attached.

The central architectural principle is:

**A country's constitution and valid laws define which institutions exist, which powers they possess, how those powers are exercised, and which relationships between institutions are lawful. CivicOS enforces that configuration without inventing, transferring or assuming authority.**

This matters because separation of powers does not look the same everywhere. The United States constitutionally separates three branches; Germany combines federalism with parliamentary government; the United Kingdom relies on a combination of statutes, constitutional conventions and prerogative powers; and the United Arab Emirates has federal authorities alongside the constituent emirates and their rulers.

National Archives
+3

CivicOS must support these differences without forcing them into one executive-centred hierarchy.

## The constitutional model

**Nation's constitutional and legal framework**
Constitution · Applicable laws · Recognized legal sources · Effective dates

**Constitutional configuration and authority registry**
Institutions · Offices · Powers · Appointment rules · Funding · Relationships · Limits

- **Legislative institutions** — Houses, chambers, committees, clerks and legislative records.
- **Judicial institutions** — Courts, tribunals, judicial administration and protected proceedings.
- **Executive institutions** — Head of state, government, ministries and administrative agencies.
- **Independent and territorial institutions** — Auditors, electoral bodies, regulators, constituent units and customary authorities.

**Constitution-aware authorization and audit**
Every action checked against the actor, institution, power, legal version, scope and required approvals.

The diagram represents a logical architecture, not a hierarchy of political authority. The judiciary, legislature, executive and independent bodies must not be children of a universal executive administrator in the authorization model.

I will use three labels throughout this answer:

- **Universal platform rule:** a safeguard that CivicOS should always implement.
- **Constitution-dependent rule:** a relationship or power that must be configured for the particular nation.
- **Legal review required:** a feature that must remain disabled until competent national authorities have established its lawful basis.

One crucial distinction: a system can faithfully implement the authority rules that a nation configures, but software cannot determine by itself whether that configuration is constitutionally legitimate. Initial installation, contested changes and constitutional amendments need an authoritative legal process.

---

## 1. Forms of state and government

### 1.1 The taxonomy CivicOS should support

Forms of state and forms of government are separate dimensions. A nation can simultaneously be a federation, a constitutional monarchy and a parliamentary democracy. A republic can be presidential and federal. A state can also recognize customary authorities without making those authorities a formal branch of the national government.

CivicOS should therefore use composable classifications, not a single dropdown such as `government_type = parliamentary`.

#### A. Republics and executive arrangements

| Form | Head of state | Head of government | How leaders are selected | Examples |
|---|---|---|---|---|
| Presidential republic | President | President, usually | President elected directly or indirectly under the constitution | United States, Brazil, Ghana |
| Parliamentary republic | Usually a president | Prime minister or equivalent | President elected directly, by parliament or an electoral body; government depends on parliamentary confidence | Germany, India, Ireland |
| Semi-presidential republic | President | Prime minister | President elected under constitutional rules; prime minister appointed through a process involving the president and parliamentary majority or confidence | France, Romania, Portugal |
| Directorial or collegial republic | A collective executive, or a ceremonial president alongside it | Collective executive or chair | Elected assembly selects an executive council; executive authority is exercised collectively | Switzerland |
| One-party republic | Varies: president, chair or collective office | Varies | Constitution and political system may give one party a privileged or exclusive governing role; formal selection rules vary | China, Vietnam, Cuba |

Important qualification: "one-party state" is a political-system classification, not a distinct form of head of state. A one-party state can have a president, a premier and a legislature with formally distinct institutions.

Switzerland is particularly important for CivicOS: its Federal Council has seven members and acts as a collective executive, with the president serving a rotating, primus-inter-pares role rather than as a US-style presidential executive.

Library of Congress
+1

#### B. Monarchies and traditional state structures

| Form | Head of state | Head of government | How leaders are selected | Examples |
|---|---|---|---|---|
| Constitutional parliamentary monarchy | Monarch | Prime minister | Monarch inherits the position under succession rules; government normally emerges from parliamentary confidence | United Kingdom, Sweden, Japan |
| Constitutional or dualist monarchy | Monarch | Prime minister or monarch, depending on the constitution | Inheritance for the monarch; appointment and executive powers depend on constitutional provisions | Jordan, Morocco, Thailand |
| Absolute or strongly executive monarchy | Monarch | Monarch or an appointed premier | Succession under dynastic, constitutional or customary rules; government appointed under the applicable system | Saudi Arabia, Brunei, Eswatini |
| Emirate | Emir | Emir or appointed prime minister | Hereditary, dynastic, elected or otherwise specified by local law | Qatar, Kuwait, United Arab Emirates (at the constituent-emirate level) |
| Sultanate | Sultan | Sultan or appointed prime minister | Succession and appointment rules vary | Oman, Brunei |
| Traditional kingdom within a modern state | National head of state remains the national head of state | National head of government remains the national head of government | Traditional ruler selected under recognized customary or statutory rules | Buganda Kingdom in Uganda; Zulu traditional leadership in South Africa |

An emirate or sultanate is not automatically an absolute monarchy. The title alone does not establish the extent of executive authority.

For a constitutional monarchy, CivicOS must distinguish the monarch's formal powers from powers exercised on ministerial advice or under constitutional convention. The UK's appointment, dissolution and assent arrangements illustrate why a title cannot determine the full legal authority of an office.

GOV.UK
+1

#### C. Territorial and union arrangements

| Form | Head of state | Head of government | How leadership works | Examples |
|---|---|---|---|---|
| Federation | One national head of state; constituent units may have their own heads | National head of government plus constituent-unit governments | Powers divided between federal and constituent constitutional levels | United States, Germany, United Arab Emirates |
| Confederation | Depends on the confederal treaty and member states | Depends on the common institutions | Member states retain primary sovereignty; common institutions exercise only delegated powers | Historical German Confederation; the early United States under the Articles of Confederation |
| Union of territories or polities | Varies | Varies | Shared or combined institutions under constitutional, statutory or treaty arrangements | Tanzania, United Kingdom |
| Devolved unitary state | One national head of state | National government plus devolved administrations | Sovereignty remains legally centred at national level, but some powers are devolved | United Kingdom |
| City-state | President, monarch or another office | Mayor, prime minister or equivalent | National and municipal functions may be combined | Singapore, Monaco, Vatican City |
| Associated or special-status territory | Depends on the legal arrangement | Depends on the legal arrangement | Authority is divided between a local government and another state or international framework | Examples vary by treaty and constitutional status |

Three important distinctions:

- The United Kingdom is a sovereign state with devolved administrations, not a federation in the same constitutional sense as Germany or the United States.
- The United Arab Emirates is expressly a federal state composed of seven emirates. Its Federal Supreme Council consists of the rulers of the emirates. See UAE Constitution Articles 1 and 45–49.

  UAE Legislation
  +1
- Tanzania is a union republic formed by the union of Tanganyika and Zanzibar, with union and non-union matters governed by its constitutional arrangement. Do not assume its structure is identical to a standard federation.

#### D. Religious, customary and hybrid arrangements

| Form | Head of state | Head of government | How leadership works | Examples |
|---|---|---|---|---|
| Theocratic state | Religious authority, monarch or other designated office | Religious leader or appointed civil government | Religious law or religious institutions have constitutionally or legally defined sovereign roles | Iran, Vatican City |
| Hybrid religious-civil system | President, monarch or other office | President, prime minister or equivalent | Civil institutions coexist with legally defined religious authorities or review mechanisms | Iran, Morocco |
| State recognizing customary authority | National head of state | National head of government | Elected or appointed national government coexists with recognized customary institutions | South Africa, Ghana, Uganda |
| Traditional authorities with limited statutory jurisdiction | National head of state | National head of government | Traditional leaders exercise specified cultural, customary, advisory or dispute-resolution functions | Varies by country and community |

These categories overlap. Theocratic status, recognition of religious law and the extent of judicial review are separate configuration dimensions.

CivicOS should not presume that a religious authority has jurisdiction over all citizens or that customary law automatically overrides national law. Jurisdiction, subject matter, personal scope, appeal routes and conflicts of law must be established by the applicable legal framework.

### 1.2 How to model the classification

A nation profile should support multiple values simultaneously:

```json
{
  "state_form": ["federal", "monarchical"],
  "government_form": ["parliamentary"],
  "territorial_structure": ["federal"],
  "political_system": ["multiparty"],
  "legal_traditions": ["civil_law", "customary_law"],
  "recognized_authority_types": [
    "constitutional",
    "statutory",
    "customary"
  ]
}
```

This is illustrative, not a claim about any particular country.

The profile should also store the effective dates and legal sources supporting these classifications. A change of government, a new monarch, a constitutional amendment or a change in territorial arrangements must not require a software rewrite.

---

## 2. Catalogue of branches and autonomous bodies

### 2.1 The common institution model

Every body in CivicOS should have a legal identity independent of its user accounts and parent organizational structure.

Minimum fields:

- Stable institution ID.
- Official name and translations.
- Institution type and branch or constitutional role.
- Establishing legal instrument and version.
- Effective-from and effective-to dates.
- Powers and jurisdiction.
- Independence classification and its legal basis.
- Appointment and dismissal procedures.
- Funding source and appropriation authority.
- Data ownership and record classification.
- Permitted instructions and prohibited interference.
- Reporting obligations and recipients.
- Relationships with other institutions.
- Transitional, acting-office and vacancy rules.

The following catalogue describes typical arrangements. Appointment, funding and dismissal details vary substantially, so the nation-specific legal mapping must control.

### 2.2 Executive institutions

| Body | Purpose and typical legal basis | Independence and leadership | Decisions, records and relationships |
|---|---|---|---|
| Head of state | Represents the state; constitutional, statutory or customary basis | May be elected, inherited or selected by an electoral body. Dismissal or removal follows constitutional rules. | Assent, appointments, treaties, formal promulgation or reserve powers where applicable. Keeps formal acts, appointments and state records. Must not receive powers beyond the configured constitution. |
| Head of government | Leads the government and coordinates executive policy | President, prime minister, premier, chancellor or equivalent. Selection and removal vary. | Government policy, cabinet coordination and executive appointments within legal authority. Keeps decisions, directives, policy records and coordination records. |
| Cabinet or council of ministers | Collective executive decision-making | Appointed under constitutional or statutory procedures; collective responsibility varies. | Regulations, executive policy, budget proposals and administrative decisions. Keeps minutes, submissions, decisions and action registers, with appropriate confidentiality. |
| Ministries | Administer assigned policy areas | Normally part of the executive, with statutory mandates and ministerial responsibilities. | Sector decisions, programmes, permits and administrative records. Ministerial direction is permitted only within legal authority. |
| Executive agencies | Deliver specialized public functions | Administrative, statutory or independently constituted depending on law. | Operational records, applications, inspections, licensing or service delivery within delegated powers. |
| Cabinet office or government secretariat | Coordinates government business and executive records | Usually administrative within the executive. | Cabinet agenda, submissions, directives, minutes and follow-up. Must not automatically gain access to court, parliamentary or independent-body records. |

The UK illustrates a parliamentary executive where the Prime Minister leads government and Parliament is institutionally separate from government. The US illustrates a presidential executive separately vested under Article II of its Constitution.

GOV.UK
+1

**CivicOS rule:** an executive administrator may manage executive users and executive configuration but must not become a global administrator with unrestricted authority over all national institutions.

### 2.3 Legislature

| Body | Purpose and typical legal basis | Appointment and independence | Decisions and records |
|---|---|---|---|
| Unicameral legislature | One chamber exercises national legislative functions | Members elected or selected under constitutional rules. Speaker chosen under chamber rules. | Bills, enacted laws, debates, votes, petitions, committee records and oversight proceedings. |
| Lower house | Commonly represents population or constituencies | Elected under constitutional and electoral law. | Legislation, confidence, budget approval and oversight where empowered. |
| Upper house, senate or council of states | Represents territorial units, reviewing functions or other constitutional interests | Elected, indirectly elected, appointed or mixed | Amendments, territorial consent, confirmations or review according to law. |
| Speaker or presiding officer | Presides over chamber proceedings | Elected or selected under chamber rules | Order of business, rulings, procedural decisions and authorized access to parliamentary records. |
| Clerk or secretary-general | Custodian of parliamentary procedure and records | Appointed under parliamentary rules or law | Official journal, bills, amendments, votes, committee records, archives and procedural metadata. |
| Parliamentary committees | Scrutinize legislation, expenditure and government conduct | Constituted by the chamber under its rules | Hearings, evidence, reports, summons and inquiries where authorized. |
| Parliamentary budget office | Provides independent fiscal analysis to the legislature | Statutory or administrative arrangement | Forecasts, costing, fiscal analysis and budget reports; not executive financial control. |
| Parliamentary ombudsman or commissioner | Handles complaints or scrutiny associated with Parliament | Depends on national law; do not confuse with a general national ombudsman | Complaints, inquiries, recommendations and reports within mandate. |

**What the platform must preserve**

- The clerk's recordkeeping authority.
- The distinction between draft bills, passed bills, assented laws and published law.
- Different access rights for members, committees, staff and the public.
- Parliamentary privilege and confidentiality where legally applicable.
- A chamber's control over its own proceedings.

A ministry should not be able to rewrite the parliamentary journal or change a recorded vote. Corrections must follow the chamber's authorized process and preserve the previous version.

### 2.4 Judiciary and justice institutions

| Body | Purpose and typical legal basis | Independence and leadership | Decisions and records |
|---|---|---|---|
| Supreme court | Highest appellate or constitutional judicial authority, depending on the country | Constitutional or statutory; appointment and removal follow judicial safeguards | Judgments, appeals, orders, opinions and precedents. |
| Constitutional court or council | Reviews constitutional validity of laws, institutions or disputes | Constitutional or statutory | Constitutional referrals, judgments, opinions and validity determinations. Some councils include non-judicial members. |
| High and lower courts | Hear civil, criminal, administrative or other cases | Judicial independence as provided by law | Filings, hearings, evidence, orders, judgments and appeals. |
| Tribunals | Decide specialized disputes | May be judicial, quasi-judicial or administrative | Specialized claims, hearings, rulings and review records. |
| Religious courts | Apply legally recognized religious jurisdiction | Jurisdiction and appointment vary by constitutional system | Religious or personal-law proceedings, orders and appeals within the granted jurisdiction. |
| Customary courts | Apply recognized customary law | Recognition and scope vary by law and community | Proceedings, customary findings, orders and referrals subject to applicable law. |
| Judicial service commission | Appoints, recommends, disciplines or manages judicial personnel where empowered | Often constitutionally or statutorily protected | Appointment files, recommendations, disciplinary proceedings and judicial-service records. |
| Court administration | Provides facilities, scheduling, staff, filing and record management | Administrative authority must not control judicial outcomes | Court calendars, filing services, case logistics, fees and court records under judicial rules. |
| Prosecution service | Conducts prosecutions and exercises charging powers | May be executive, independent or mixed | Charging decisions, prosecution files, disclosure, referrals and case outcomes. |
| Legal aid | Provides representation or assistance to eligible people | Statutory, administrative or independent | Eligibility, assignments, legal-service records and payments, protected by confidentiality. |

**Crucial boundary**

The judiciary's operational independence must be represented as a set of enforceable powers and restrictions, not merely a badge saying independent.

For example:

- The executive cannot amend a judgment.
- A court clerk may manage a filing under court procedure but cannot change the judge's decision.
- The judiciary may obtain evidence through lawful process, but not through unrestricted access to every agency database.
- Prosecutors may access and disclose material only under applicable legal authority and procedure.
- A judicial service commission may recommend or decide appointments only to the extent granted by law.

Variation: some systems place prosecutors within the executive; others provide constitutional or statutory independence. CivicOS must support both without assuming either is universal.

### 2.5 Independent constitutional and statutory bodies

| Body | Typical mandate | Common independence model | Key records and powers |
|---|---|---|---|
| Electoral commission | Elections, voter registration and electoral administration | Constitutional or statutory | Voter registers, candidate nominations, polling, results, complaints and recounts. |
| Auditor-general or supreme audit institution | Audits public accounts and expenditure | Constitutional or statutory | Audit plans, working papers, findings, evidence, reports and follow-up recommendations. |
| Central bank | Monetary policy, currency and financial stability | Statutory or constitutional, with varying independence | Policy decisions, supervisory records, monetary data and financial stability analysis. |
| Public service commission | Recruitment, discipline, promotion or public-service governance | Constitutional or statutory | Appointments, merit processes, disciplinary proceedings and appeals. |
| Anti-corruption commission | Investigates or prevents corruption | Constitutional or statutory | Complaints, investigations, evidence, referrals and public reports, subject to secrecy laws. |
| Human rights commission | Protects and monitors human rights | Constitutional or statutory | Complaints, investigations, recommendations and monitoring reports. |
| Ombudsman | Investigates maladministration and complaints | Statutory or constitutional | Complaints, inquiries, recommendations and case files. |
| Information or data-protection commissioner | Enforces access-to-information or data-protection law | Constitutional or statutory | Complaints, investigations, regulatory orders and compliance reports. |
| Competition authority | Protects competition and reviews conduct or mergers | Statutory or constitutional | Investigations, merger filings, decisions and enforcement records. |
| Sector regulators | Regulate energy, telecoms, finance, health professions, media or other sectors | Usually statutory; sometimes constitutional | Licences, inspections, enforcement decisions, sector data and appeals. |
| Statistics office | Produces official statistics | Statistical independence under law or institutional rules | Statistical releases, methods, census data, revisions and confidential microdata. |
| National boards and councils | Specialized governance, licensing or advisory functions | Depends on establishing instrument | Decisions, registers, standards, advice and regulatory records. |

Kenya provides a useful constitutional example: Articles 249–254 define objects, independence, funding, appointments, powers and reporting for commissions and independent offices. Article 249(2) states that covered commissions and independent offices are subject only to the Constitution and law, and not to direction or control by another person or authority.

Kenya Law Reform Commission (KLRC)
+2

This illustrates why `independence_level` alone is insufficient. CivicOS needs the actual legal permissions, restrictions, funding arrangements and appointment/removal processes.

**The auditor-general's special boundary**

The auditor-general ordinarily needs read access to records within audit scope and may need lawful powers to demand information. That does not ordinarily mean the auditor can edit the source transactions.

CivicOS should provide separate audit workpapers and findings. If an audit identifies an error, the auditor can recommend correction or refer the matter; the authorized source institution performs any lawful correction, preserving the original record and the audit trail.

### 2.6 Monarchy-specific institutions

| Institution or power | Purpose | CivicOS treatment |
|---|---|---|
| Royal court or household | Supports the monarch's constitutional, ceremonial or personal functions | Separate household administration from public sovereign functions, public finance and private personal records. |
| Privy council | Advises or formally participates in designated constitutional or executive acts | Model the council's actual legal powers, membership, advice and formal acts. |
| Council of state | Advises the head of state or performs constitutionally defined duties | Its existence and powers are country-specific; do not assume a universal role. |
| Succession body | Resolves or certifies succession questions where law provides | Restricted records, clear legal authority, succession events and effective dates. |
| Reserve powers | Exceptional powers of a monarch or head of state | Represent each power as a narrowly scoped, legally sourced capability with its own trigger, limits and audit requirements. |

In a parliamentary monarchy, many formal powers are exercised on ministerial advice or according to constitutional convention. In another monarchy, the monarch may exercise substantial direct executive authority. CivicOS must encode the applicable legal mechanism, not infer powers from the word "monarch."

Reserve powers require particular caution. They should not be presented as a generic emergency administrator role.

### 2.7 Subnational government and customary authority

| Body | Purpose | CivicOS treatment |
|---|---|---|
| States, provinces, regions or emirates | Exercise constitutionally or legally allocated territorial powers | Each territorial unit has its own authority scope, institutions, laws and records. |
| Devolved administrations | Exercise powers transferred by national law | Model devolved powers, reserved matters, legislative competence and any lawful override or dispute mechanisms. |
| Local government | Provides local services and exercises local statutory powers | Distinguish elected councils, mayors, administrative officers and local licensing authorities. |
| Traditional councils or kingdoms | Exercise recognized cultural, customary, advisory or legal functions | Define their legally recognized scope, community or territorial jurisdiction, records and relationship to state institutions. |

Territorial jurisdiction should be explicit in every relevant permission. A provincial official must not automatically gain authority over all other provinces simply because they belong to the same branch.

Customary authorities may need their own records and roles, but their powers must not be presumed to include coercive state powers or jurisdiction over people who fall outside their legally recognized scope.

### 2.8 Security and emergency bodies

| Body | Purpose | Essential safeguards |
|---|---|---|
| Armed forces command | Military command under constitutional and statutory authority | Record lawful command chains, command orders, delegated powers and applicable restrictions. |
| Police oversight body | Investigates complaints, misconduct or unlawful policing | Independent case files, protected evidence and restricted access to active investigations. |
| National security council | Coordinates security policy and advice | Membership, mandate, decision authority, secrecy classification and reporting must be defined by law. |
| Emergency management authority | Coordinates disaster or civil emergency response | Emergency powers, territorial scope, activation triggers, expiry and review must be explicit. |
| Intelligence oversight body | Reviews intelligence activities where established | Protected oversight access, legal-purpose restrictions and safeguards against unrestricted operational access. |

Civilian control is not a single universal software role. It is a set of legally defined appointment, command, authorization, legislative oversight, judicial review and reporting relationships.

CivicOS must distinguish lawful civilian command from political access to every intelligence record. The fact that an official can issue a valid strategic directive does not automatically entitle that official to browse operational sources or protected identities.

---

## 3. Relationships between powers

### 3.1 A relationship matrix for CivicOS

A conventional organizational chart is inadequate. CivicOS needs a typed, legally sourced relationship graph.

Each relationship should specify the actor institution, target institution, action, scope, legal source, conditions, effective dates and any approval or review requirement.

Legend:

- **C** — commonly present, but the exact scope still requires legal configuration.
- **V** — varies significantly by constitution.
- **P** — permitted only when the legal power and conditions are explicitly configured.
- **—** — not an inherent power; a specific legal basis is required.

| Actor | Appoint | Dismiss | Fund | Instruct | Review | Veto | Audit | Investigate | Dissolve | Impeach | Refer | Request information | Receive reports |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Head of state | V | V | — | V | V | V | — | — | V | — | P | P | C |
| Head of government | V | V | Propose/execute V | Executive scope C | Administrative V | — | — | — | V | — | P | C within executive scope | C |
| Cabinet | V | V | Propose/allocate V | Executive scope C | Administrative V | — | — | — | V | — | P | C within executive scope | C |
| Legislature | V | P | C through budget law or appropriation | — over independent decisions; P over executive administration by law | C | V | Commission or request C | P through authorized committees | V | V | C | P within legal authority | C |
| Judiciary | V for judicial appointments | P | Budget allocation/recommendation V | Judicial administration only within lawful authority | Judicial review C where competent | V | — as a general institutional function | P under judicial process | — | — | C | P by lawful process | P |
| Electoral commission | V internally | V internally | V | Electoral administration only | Electoral decisions within mandate | — | — | P | — | — | C | P | C |
| Auditor-general | V internally | V internally | Budget arrangements V | — | Audit findings and recommendations C | — | C | P within audit mandate | — | — | C within audit authority | P within audit authority | C |
| Ombudsman or human rights body | V internally | V internally | Budget arrangements V | — over other institutions' decisions, unless expressly empowered | Recommendations/review V | — | — | P | — | C | P | P | C |
| Constituent-unit government | V locally | V locally | Territorial budget powers V | Within allocated jurisdiction | Administrative or judicial review as law allows | V | V | P | — | P | P | P | C |
| Customary or religious authority | V internally or under customary law | V | V | Only within recognized authority | Within legally recognized jurisdiction | V | — | P | — | — | C | P | V |

This is a design matrix, not a declaration of legal powers. Even apparently common relationships require qualification. For example, an auditor may investigate or demand information under a statute, while an ombudsman may only recommend corrective action. A legislature may approve a budget without being entitled to direct the substantive decisions of a court or independent regulator.

### 3.2 Differences between presidential, parliamentary and monarchical systems

| Relationship | Presidential system | Parliamentary system | Monarchical system |
|---|---|---|---|
| Government formation | President normally heads executive government | Government typically depends on parliamentary confidence | Depends on whether the monarchy is parliamentary, dualist or executive |
| Appointment of ministers | President appoints, sometimes with legislative confirmation | Head of state formally appoints under the applicable process, commonly on prime-ministerial advice | Formal appointment may be by monarch, council or other authority under constitutional rules |
| Legislative oversight | Legislature oversees a separately elected executive | Parliament oversees government; executive may be drawn from the parliamentary majority | Depends on constitutional powers and political conventions |
| Dismissal of government | President's term and removal mechanisms usually constitutionally specified | No-confidence, resignation, dissolution or other constitutional processes | Monarch's formal role may be ministerially advised or involve personal discretion |
| Veto or assent | Presidential veto may apply | Formal assent may be required, often governed by convention | Royal assent may be formal or may have different legal consequences |
| Judicial review | Courts may review executive and legislative acts according to constitutional law | Courts may review acts under the country's constitutional arrangements | Depends on the legal system and the constitution's allocation of powers |
| Budget | Legislature appropriates; executive proposes and executes in different roles | Government generally proposes and parliament authorizes | Depends on constitutional and statutory arrangements |
| Dissolution | Usually constitutionally limited or unavailable to the executive | Often available under specified conditions | Monarch may exercise a formal dissolution power, commonly on advice in parliamentary systems |

The German Basic Law provides a concrete example of parliamentary mechanisms: Article 63 sets out the Chancellor's election; Article 65 addresses policy guidelines and ministerial responsibility; Article 67 establishes a constructive vote of no confidence; and Article 68 addresses a confidence vote and possible dissolution. These rules are specific to Germany and should not be generalized to all parliamentary states.

Gesetze im Internet
+1

### 3.3 How CivicOS should store each relationship

Every relationship needs a stable identity and a versioned legal basis.

Example:

```json
{
  "relationship_id": "rel-audit-001",
  "from_institution": "auditor_general",
  "to_institution": "tax_authority",
  "action": "request_information",
  "scope": {
    "record_types": ["tax_assessment", "payment_reconciliation"],
    "purpose": "statutory_financial_audit"
  },
  "legal_basis": {
    "instrument_id": "national_audit_act",
    "version_id": "version-2026-02",
    "provision_id": "section-18"
  },
  "conditions": [
    "authorized_audit",
    "scope_limited_to_audit"
  ],
  "approval_required": true,
  "effective_from": "2026-01-01",
  "effective_to": null,
  "status": "approved"
}
```

All identifiers and legal references here are illustrative.

The authorization engine should not merely ask, "Is this user an auditor?" It should ask:

- Is this person an authorized official of the institution?
- Does that institution have this particular legal power?
- Is the target institution and record type within scope?
- Is the purpose permitted?
- Is the relevant law and relationship version in force?
- Are required approvals satisfied?
- Is the operation permitted at this stage of the case or process?

A relationship that allows `request_information` must not automatically allow `read_all_records`, `modify_record` or `issue_decision`.

---

## 4. Lifecycle and edge cases

CivicOS must treat constitutional transitions as controlled legal events, not ordinary administrative updates.

### 4.1 Elections and transitions of power

The platform should maintain:

- Election calendar and legal basis.
- Electoral authority and its mandate.
- Results, certification, recounts and challenges.
- Official terms of office.
- Appointment, oath and assumption-of-office events where required.
- Authority-transfer records.
- Transitional restrictions on outgoing officials.
- Legal continuity of public records and services.

An election result should not automatically grant system privileges merely because a result was entered. The result must reach the legal status required by the constitution and electoral law.

When an officeholder changes, transfer the office's powers through a validated succession event. Preserve the former official's historical actions and restrict access according to the person's continuing legal duties.

### 4.2 Caretaker and interim governments

A caretaker government may have restricted powers, but the exact restrictions vary.

CivicOS should support an authority profile for the transitional period that can restrict:

- New appointments.
- Major contracts and long-term commitments.
- Certain regulations or policy changes.
- Extraordinary spending.
- Sensitive transfers of powers.

Only restrictions supported by the nation's law or valid constitutional convention should be enabled.

Routine services, urgent public safety functions and legally required decisions should continue. Do not freeze an entire government simply because the government is in caretaker status.

### 4.3 Coalition governments

A coalition agreement is not automatically a source of statutory authority.

Model:

- Coalition parties and agreement documents.
- Allocation of ministerial portfolios.
- Cabinet membership and appointment records.
- Collective decision procedures.
- Parliamentary confidence and voting records.
- Any legally binding coalition arrangements, distinguished from political commitments.

A coalition agreement can inform workflow and reporting, but must not override the constitution or law.

### 4.4 Votes of no confidence

Store the motion, legal requirements, votes, result, effective time and subsequent constitutional events.

Do not automatically dismiss a government merely because a motion was submitted. The motion must reach the legal state that triggers the applicable consequence.

In Germany, Article 67 requires the Bundestag to elect a successor when expressing no confidence in the Chancellor. That differs from systems where a no-confidence vote can trigger resignation or an election without the same constructive mechanism.

Gesetze im Internet
+1

### 4.5 Dissolution of parliament

The platform must verify:

- Who can request dissolution.
- Who has legal power to decide.
- Required advice or countersignature.
- Conditions and deadlines.
- Prohibitions during certain constitutional periods.
- Election deadlines and continuity arrangements.

Do not assume that the head of state, head of government or legislature can dissolve the legislature in every country.

### 4.6 Impeachment and removal

Keep the following as separate events:

1. Complaint or allegation.
2. Investigation or preliminary review.
3. Formal initiation of proceedings.
4. Legislative vote or other required decision.
5. Judicial or constitutional determination, if required.
6. Suspension, removal or other legal consequence.
7. Appeal or subsequent review.

A system must not equate an allegation with removal from office. It must also not allow an ordinary administrator to disable the officeholder's powers merely because an impeachment case exists.

### 4.7 Judicial review invalidating a law or decision

When a competent court issues a binding judgment, CivicOS must support:

- The judgment and its authoritative version.
- The provisions affected.
- The legal effect: invalidity, suspension, interpretation, remittal or other remedy.
- The effective date and territorial or personal scope.
- Whether the ruling is final, stayed or subject to further proceedings.
- The actions needed to implement the ruling.
- Historical decisions potentially affected by the ruling.

Do not automatically delete the invalidated law or reverse every historical decision. Legal consequences can differ depending on the remedy, finality, retroactivity and applicable procedural law.

Instead, flag affected workflows and records for authorized legal assessment. Block future use of a provision where the binding legal effect requires it.

### 4.8 States of emergency

An emergency is a legal status, not a universal super-administrator account.

The emergency configuration should define:

- The legally recognized trigger.
- Who may declare it.
- Required approval or countersignature.
- Geographic scope.
- Permitted exceptional powers.
- Non-derogable rights and other limits.
- Legislative or judicial oversight.
- Duration and renewal conditions.
- Automatic expiry and revocation.
- Required publication and reporting.
- Retrospective review and record preservation.

**Universal safeguard:** an emergency cannot silently remove auditability, make AI a legal decision-maker, or grant an official arbitrary access to every personal record.

The exact emergency powers and deadlines are country-dependent and require constitutional and human-rights review.

### 4.9 Monarchic succession

Model succession as a formal legal process with explicit evidence and effective dates.

Possible records include:

- The relevant succession law or constitutional provision.
- Succession event and trigger.
- Eligible succession candidates or legally relevant family relationships, under strict privacy controls.
- Determination by the designated authority.
- Regent or acting-sovereign appointment where applicable.
- Proclamation, oath and official assumption of office.
- Disputes and legal rulings.

CivicOS must not infer succession from family relationships or automatically grant sovereign powers to a person based on a name or birth record alone.

### 4.10 Suspension or capture of an independent body

This is one of the most important edge cases for a sovereign platform.

An executive official must not be able to silently remove an independent institution's permissions, appoint a replacement, transfer its records or alter its mandate.

Require:

- An explicit legal power to suspend, restructure or remove.
- The designated initiating and deciding authorities.
- Applicable hearings, reasons, approvals and review rights.
- Effective dates and the scope of the change.
- An independent audit event.
- Preservation of the institution's records and previous decisions.
- A controlled acting-authority or continuity arrangement where law permits.

If the legal basis is disputed, place the configuration change in a restricted review state rather than letting the highest-ranking system administrator decide the dispute.

### 4.11 Disputes between branches

CivicOS should support a constitutional-dispute case type with:

- Parties and disputed powers.
- Legal questions and provisions.
- Filing and referral rules.
- Interim measures where authorized.
- Hearing and evidence records.
- Final ruling and implementation actions.
- Separate compliance records for each institution.

The platform should not itself adjudicate constitutional disputes. It should preserve the lawful dispute-resolution process and implement the resulting binding decisions.

### 4.12 Devolution and recentralization

Changes to territorial powers require a versioned allocation of competence.

Record:

- The power or service affected.
- Previous and new responsible authorities.
- Geographic scope.
- Legal instrument and amendment.
- Effective date.
- Transfer of records, assets, staff or responsibilities where applicable.
- Transitional arrangements and disputes.

A recentralization cannot be implemented simply by changing an administrator field. The legal change must be established, and the resulting transfer must be auditable.

### 4.13 Conflicts of interest

Every legally consequential action should be checked against relevant conflict-of-interest rules where the system has reliable data and lawful authority to perform the check.

Examples include:

- A procurement officer acting on a contract involving a connected business.
- A judge or panel member with a legally disqualifying interest.
- A regulator deciding a case involving a former employer where restrictions apply.
- An official approving their own expense, appointment or disciplinary matter.

CivicOS should support declarations, recusal, reassignment and documented decisions. A conflict alert should not itself be treated as proof of wrongdoing.

---

## 5. What CivicOS must enforce in software

This is where the constitutional model becomes real.

The platform needs to enforce institutional authorization, not just user roles. A user being an administrator, minister or senior official must not grant powers that their institution does not possess.

### 5.1 Concrete enforcement rules

| Rule | Classification | Required implementation |
|---|---|---|
| Executive administrator cannot read judicial case files | Universal default; lawful exceptions depend on constitution and procedure | Separate judicial data domain, API authorization, case-level permissions and logged exceptions. |
| Executive cannot issue binding directives to an independent body | Constitution-dependent; default deny | Explicit relationship permitting an instruction, with scope and legal source. Otherwise allow only lawful requests or reporting relationships. |
| Auditor-general can read in-scope executive records but cannot alter source transactions | Universal integrity rule; scope of audit access depends on law | Read-only audit credentials, separate audit workpapers and source-side authorization. |
| Legislature's official records are kept under its own authorized clerk or custodian | Universal institutional-ownership principle; exact custodian depends on law | Separate legislative record ownership, version history and authorized correction procedures. |
| Court judgments cannot be changed by ministry officials | Universal integrity rule | Court-owned decisions, signed decision artifacts, restricted corrections and immutable history. |
| A minister cannot appoint or dismiss a regulator merely by being a minister | Constitution-dependent | Explicit appointment/dismissal power, legal basis, conditions and approval chain. |
| A regulator cannot issue decisions outside its statutory jurisdiction | Universal authorization rule | Validate institution, regulated activity, territory, subject matter and legal version. |
| No user can approve their own proposal when two distinct officials are required | Universal platform rule | Stable person identity, separation-of-duties checks, distinct approval events and independent authentication. |
| An emergency does not automatically remove all privacy controls | Universal platform rule | Narrow emergency capabilities, expiry, justification, independent review and full audit. |
| Every consequential decision cites its empowering law and version | Universal platform rule | Required legal references validated against the approved legal registry. |
| A legal amendment cannot silently rewrite historical decisions | Universal record-integrity rule | Versioned law references, effective dates and immutable decision provenance. |
| One branch cannot freely browse another branch's personal data | Universal default; specific lawful access may be configured | Data classification, purpose-based access, institution-specific authorization and read logging. |
| A body can correct its records only through its authorized procedures | Universal platform rule | Source-of-truth ownership, correction workflows and version history. |
| Independent bodies retain their own user administration within lawful limits | Universal institutional autonomy principle; external controls may be lawful | Separate institution administration, delegated role management and logged access changes. |
| Data export is controlled as carefully as viewing | Universal security rule | Export-specific authorization, scope limits, watermarking or manifests where appropriate, and audit records. |
| Public data is not automatically confidential, and confidential data is not automatically public | Universal classification principle | Explicit disclosure classifications and legal disclosure rules per record type. |

**Important distinction: independence does not mean isolation**

A judiciary may be independent in deciding cases while depending on a public budget, shared identity infrastructure or central payroll.

An auditor-general may be independent in auditing while reporting to the legislature and receiving an appropriation through it.

A central bank may be operationally independent in monetary policy while subject to statutory reporting and financial audit.

CivicOS should represent these relationships independently. Shared infrastructure must not become shared decision authority.

### 5.2 The authorization decision

For every consequential request, the authorization engine should evaluate something like:

```ts
type AuthorizationContext = {
  actorId: string;
  actorInstitutionId: string;
  activeOfficeId: string;
  targetInstitutionId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  purpose: string;
  jurisdictionId: string;
  legalBasisVersionIds: string[];
  relationshipVersionIds: string[];
  approvalEvidenceIds: string[];
  emergencyContextId?: string;
};

type AuthorizationResult = {
  permitted: boolean;
  reasonCode: string;
  policyVersionId: string;
  checkedAt: string;
  requiredApprovalsRemaining: number;
  auditEventRequired: true;
};
```

This is a proposed interface, not an assertion about your existing code.

The engine should evaluate at least:

1. Is the person authenticated and acting under a valid office or delegation?
2. Is the action within that office's permitted powers?
3. Does the institution possess the power?
4. Is the target record within the institution's jurisdiction?
5. Is the legal basis valid for the relevant time and circumstances?
6. Is the inter-institution relationship authorized?
7. Are required approvals complete and valid?
8. Is the operation blocked by suspension, recusal, expiry or a court order?
9. Is the purpose lawful and the data disclosure proportionate?
10. Can the operation be audited and attributed?

Do not rely on frontend guards. Every decision must be enforced at the server and data-access boundary, including background jobs, integrations and direct API calls.

### 5.3 Three distinct forms of administration

CivicOS should separate:

- **Platform operator:** operates software, infrastructure, upgrades and recovery.
- **National constitutional administrator or commissioning authority:** establishes the initial approved nation profile through the country's authorized legal process.
- **Institution administrator:** manages users, roles and local operations within the institution's lawful authority.

None should automatically inherit the powers of the others.

The platform operator must not have the ability to issue a court judgment or alter a national legal authority mapping merely because they control the deployment.

Likewise, the national configuration administrator should not automatically receive unrestricted access to all personal records.

### 5.4 Read access is also an exercise of power

Your existing policy that every personal-data read is logged should apply across branches.

Log:

- Who accessed the data.
- Which institution and office they were acting under.
- What record or data category was accessed.
- The declared purpose and applicable authority.
- When the access occurred and whether it succeeded.
- Which policy and relationship versions authorized it.
- Whether the access was exceptional or emergency-based.

Logs should be protected against alteration by ordinary administrators, and reading or exporting sensitive logs should itself be logged.

For exceptional access, require a reason and subsequent review where law permits. Do not treat an executive emergency declaration as blanket permission to browse judicial, electoral or intelligence records.

---

## 6. Home screens and roles per branch

CivicOS should provide a common interaction language but separate workspaces, permissions and data ownership.

Every workspace should display:

- The official's current office, institution and delegated powers.
- Their own pending work and approvals.
- Decisions and records within their lawful scope.
- Deadlines, escalations and review obligations.
- Relevant legal changes and configuration warnings.
- Audit alerts that they are authorized to see.
- A clear indication of what is blocked and why.

It should not display a nationwide feed of every sensitive record simply because the user is senior.

### 6.1 Executive workspaces

| Top official | Workspace should show | Must not automatically see |
|---|---|---|
| Head of state | Formal acts, appointments awaiting signature, constitutional deadlines, succession or emergency matters within the office's powers | Full judicial files, confidential legislative deliberations or unrelated personal records |
| Head of government | Government priorities, cabinet decisions, executive delivery, lawful directives, inter-ministry blockers | Independent-body case files or court records outside lawful access |
| Cabinet secretary or secretary to government | Cabinet agenda, approved minutes, submissions, decision follow-up and executive records | Parliamentary internal records or independent-body operational data without authority |
| Minister | Portfolio performance, decisions, permits and cases within the ministry's jurisdiction, statutory deadlines and appeals | Other ministries' restricted records or independent decisions outside the minister's legal powers |
| Permanent secretary or ministry administrative head | Budget execution, staffing, service delivery, procurement, workflow queues and compliance | Judicial deliberations, confidential legislative records or unrelated agency files |
| Agency director | Operational queues, staff assignments, service performance, authorized cases and exceptions | Records belonging to other agencies without an approved legal relationship |

A head of government dashboard should show aggregated national performance, but drill-down must respect the same underlying access rules as the source system.

### 6.2 Legislative workspaces

| Top official | Workspace should show | Must not automatically see |
|---|---|---|
| Speaker or presiding officer | Chamber business, votes, motions, procedural rulings, scheduling and authorized disciplinary matters | Private judicial deliberations or restricted executive case data |
| Clerk or secretary-general | Official bills, amendments, votes, minutes, legislative journal, archives and publication queues | Source records owned by other branches merely because they are referenced in a bill |
| Committee chair | Committee agenda, submissions, hearings, evidence, reports and lawful inquiry powers | Evidence outside the committee's mandate or confidential records beyond its authority |
| Parliamentary budget office head | Budget proposals, fiscal models, assumptions, projections and analysis | Confidential taxpayer-level records unless expressly authorized |
| Parliamentary ombudsman or commissioner | Complaints, assigned inquiries, case deadlines, findings and reporting obligations | Records unrelated to the office's statutory mandate |

The legislative clerk must be able to certify the authoritative parliamentary record without an executive official being able to overwrite it.

### 6.3 Judicial workspaces

| Top official | Workspace should show | Must not automatically see |
|---|---|---|
| Chief Justice or equivalent | Judicial administration, court capacity, authorized policy matters, vacancies and aggregate performance | Private merits deliberations or all active case files simply by virtue of being Chief Justice |
| Court president or chief judge | Court administration, assignment rules, scheduling, workload and authorized administrative reviews | Another judge's deliberations or protected case material outside lawful authority |
| Court registrar | Filing, service, deadlines, record completeness, orders awaiting administrative processing and authorized enforcement referrals | The power to alter a judgment or decide the merits of a case |
| Judicial service commission chair | Appointment, discipline, vacancies, eligibility and commission proceedings | Unrelated case files or protected deliberations outside the commission's mandate |
| Prosecutor-general or director of public prosecutions | Charging decisions, prosecution queues, evidence disclosure, deadlines and prosecutorial review | Judicial deliberations or unrelated confidential records outside lawful authority |
| Legal aid authority head | Eligibility queues, lawyer assignments, service quality, budgets and case deadlines | Opposing parties' privileged communications or unrelated court records |

For judges, the default home screen should be their assigned work and court administration. A chief justice's organizational seniority should not automatically grant unrestricted access to the substance of every judicial proceeding.

### 6.4 Independent-body workspaces

| Top official | Workspace should show | Must not automatically see |
|---|---|---|
| Auditor-general | Audit plan, engagements, evidence requests, findings, management responses, reporting deadlines and overdue recommendations | The ability to alter audited source transactions |
| Electoral commission chair | Electoral calendar, registration and polling readiness, results certification, complaints and operational risks | Unauthorized party, voter or intelligence data |
| Central bank governor | Monetary policy agenda, financial stability indicators, statutory reporting and authorized supervisory information | Unrestricted personal banking records unrelated to lawful duties |
| Public service commission chair | Recruitment and disciplinary proceedings, appointments, vacancies, appeals and statutory deadlines | Judicial deliberations or unrelated confidential personnel records |
| Anti-corruption commission head | Authorized investigation queues, evidence integrity, complaints, referral deadlines and oversight alerts | Unrestricted access to every police or tax record without legal basis |
| Human rights commission chair | Complaints, investigations, site visits, findings, referrals and reporting deadlines | Protected personal records outside the commission's mandate |
| Ombudsman | Complaints, investigations, response deadlines, recommendations and unresolved maladministration | Unrelated confidential government data |
| Data-protection commissioner | Complaints, investigations, data-breach reports, audit requests and compliance actions | The ability to silently alter an agency's underlying records |
| Competition authority chair | Merger reviews, investigations, market studies, deadlines and decisions | Commercial secrets outside the case's lawful scope |
| Statistics office head | Production calendar, methodology versions, quality issues, revisions and release approvals | Identifiable microdata unless authorized for a specific statistical purpose |
| Sector regulator head | Licensing, inspections, compliance, appeals, regulated-entity registers and sector performance | Unrelated regulator or agency files without lawful exchange authority |

### 6.5 Monarchy and customary-authority workspaces

| Top official | Workspace should show | Must not automatically see |
|---|---|---|
| Monarch's private secretary | Formal acts, audiences, correspondence, appointments and constitutional matters within the household's mandate | Confidential judicial, legislative or personal data outside lawful access |
| Privy council clerk | Council agenda, advice, formal proceedings, decisions and official instruments | Unrelated executive records merely because the council advises the sovereign |
| Succession body chair | Succession proceedings, applicable legal provisions, required evidence and formal determinations | Unrelated family or citizen records |
| State or provincial governor | Territorial responsibilities, local decisions, delegated powers, budget and lawful reporting | Other territories' restricted records |
| Traditional council secretary | Recognized customary proceedings, community records, referrals and legally authorized dispute-resolution matters | National personal data outside the authority's recognized jurisdiction |

These are example role names, not hardcoded CivicOS roles. Each nation should be able to rename the offices and define their actual authority.

### 6.6 Home-screen architecture

I recommend a shared workspace shell with configurable panels:

1. **My authority:** current office, permissions, delegations and restrictions.
2. **My work:** assigned cases, records and decisions.
3. **Awaiting my action:** approvals, signatures, reviews and deadlines.
4. **Institution status:** permitted operational metrics.
5. **Legal changes:** applicable amendments, effective dates and required procedure updates.
6. **Oversight:** relevant audit findings and compliance obligations.
7. **Exceptions:** blocked actions, missing legal mappings and unresolved conflicts.
8. **Public service:** publication and citizen-facing tasks where applicable.

The screen composition can be common. The data, actions and panels must be institution-specific.

---

## 7. Nation-neutral configuration schema

This is the most important implementation deliverable: a constitutional configuration model that can express different systems without requiring country-specific code.

I recommend a versioned constitutional configuration package, distinct from ordinary tenant settings, with legal-source references, approval records and an effective-date model.

The package should describe:

- Form of state and government.
- Institutions and their legally defined powers.
- Offices and appointment, succession and removal rules.
- Relationships between institutions.
- Funding and appropriation relationships.
- Record ownership and access policies.
- Emergency powers and limits.
- Legal-source versions and effective dates.
- The approved configuration version used for each consequential action.

### 7.1 Core schema

The following is JSONC-style configuration pseudocode. Comments and placeholder identifiers are illustrative; this is not a finalized JSON Schema or a claim that the listed authorities apply to a particular country.

```jsonc
{
  "schema_version": "1.0.0",
  "configuration_id": "nation-constitutional-profile",
  "jurisdiction": {
    "jurisdiction_id": "nation",
    "official_name": "Configured by the nation",
    "short_name": "Configured by the nation",
    "official_languages": ["configured-language"],
    "territorial_model": "configured",
    "constitutional_order": {
      "legal_source_id": "constitution",
      "version_id": "constitution-version",
      "effective_from": "YYYY-MM-DD"
    }
  },

  "state_classification": {
    "state_forms": [],
    "government_forms": [],
    "territorial_arrangements": [],
    "political_system_classifications": [],
    "recognized_legal_traditions": []
  },

  "configuration_governance": {
    "drafted_by": [],
    "legal_review_required": true,
    "approval_authorities": [],
    "independent_confirmation_required": true,
    "effective_from": null,
    "effective_to": null,
    "status": "draft",
    "supersedes_configuration_id": null
  },

  "legal_sources": [
    {
      "source_id": "constitution",
      "title": "Official constitutional instrument",
      "source_type": "constitution",
      "version_id": "version-001",
      "official_uri": null,
      "publication_reference": null,
      "digest": null,
      "adopted_at": null,
      "published_at": null,
      "effective_from": null,
      "effective_to": null,
      "status": "unverified"
    }
  ],

  "institutions": [
    {
      "institution_id": "institution-001",
      "official_name": "Nation-defined name",
      "localized_names": {},
      "institution_type": "configured",
      "branch_type": "configured",
      "parent_institution_id": null,
      "jurisdiction": {
        "territory_ids": [],
        "subject_matter_ids": [],
        "personal_scope": "configured"
      },

      "independence": {
        "level": "constitutional",
        "legal_basis_refs": [],
        "independence_guarantees": [],
        "permitted_external_directions": [],
        "prohibited_external_directions": []
      },

      "powers": [
        {
          "power_id": "power-001",
          "action": "configured_action",
          "resource_types": [],
          "scope": {},
          "conditions": [],
          "legal_basis_refs": [],
          "effective_from": null,
          "effective_to": null,
          "status": "draft"
        }
      ],

      "appointment_rules": [],
      "dismissal_rules": [],
      "funding_rules": [],
      "record_ownership": [],
      "access_policies": [],
      "reporting_obligations": [],
      "status": "draft"
    }
  ],

  "offices": [
    {
      "office_id": "office-001",
      "institution_id": "institution-001",
      "official_title": "Nation-defined title",
      "localized_titles": {},
      "office_type": "constitutional_office",
      "powers": [],
      "appointment_rule_id": "appointment-rule-001",
      "dismissal_rule_id": "dismissal-rule-001",
      "term_rule_id": "term-rule-001",
      "acting_office_rule_id": null,
      "succession_rule_id": null,
      "delegation_policy_id": null,
      "legal_basis_refs": [],
      "effective_from": null,
      "effective_to": null
    }
  ],

  "relationships": [
    {
      "relationship_id": "relationship-001",
      "from_institution_id": "institution-001",
      "to_institution_id": "institution-002",
      "relationship_type": "request_information",
      "scope": {
        "resource_types": [],
        "territory_ids": [],
        "purposes": []
      },
      "conditions": [],
      "approval_rule_id": null,
      "legal_basis_refs": [],
      "effective_from": null,
      "effective_to": null,
      "status": "draft"
    }
  ],

  "approval_rules": [
    {
      "rule_id": "approval-rule-001",
      "applies_to": [],
      "minimum_distinct_people": 2,
      "role_requirements": [],
      "separation_of_duties": [],
      "expiry_policy": {},
      "legal_basis_refs": [],
      "status": "draft"
    }
  ],

  "funding_rules": [
    {
      "funding_rule_id": "funding-001",
      "recipient_institution_id": "institution-001",
      "source_type": "appropriation",
      "appropriation_authority_id": "institution-002",
      "spending_authority_id": "institution-001",
      "audit_authority_ids": [],
      "legal_basis_refs": [],
      "effective_from": null,
      "effective_to": null
    }
  ],

  "emergency_provisions": [
    {
      "provision_id": "emergency-001",
      "emergency_type": "configured",
      "declaration_authorities": [],
      "required_approvals": [],
      "permitted_powers": [],
      "prohibited_powers": [],
      "territorial_scope": [],
      "maximum_duration": null,
      "renewal_rules": {},
      "oversight_authorities": [],
      "review_deadlines": {},
      "non_derogable_rules": [],
      "legal_basis_refs": [],
      "status": "draft"
    }
  ],

  "constitutional_dispute_rules": [],
  "transition_rules": [],
  "data_classification_profiles": [],
  "publication_rules": [],
  "audit_requirements": [],

  "activation": {
    "status": "not_approved",
    "legal_validation": "pending",
    "security_validation": "pending",
    "independent_review": "pending",
    "approved_by": [],
    "approved_at": null,
    "effective_from": null
  }
}
```

### 7.2 Important refinements to the schema

The schema above is the starting model. I would make the following design decisions before implementation.

1. **Independence should be multidimensional.** A body can be constitutionally independent in its decisions but rely on another institution for appropriations, premises or payroll. Do not reduce that to one independence boolean.

2. **Appointment, dismissal and funding need separate rules.** These relationships can have different actors, thresholds and conditions. A body that funds an institution is not automatically entitled to appoint its head or direct its decisions.

3. **Legal authority must be versioned.** A relationship must identify the precise law version and effective dates that support it. Historical decisions must retain the version used when they were made.

4. **Record ownership must be explicit.** A body may use shared infrastructure while remaining the authoritative owner of its records. Data access and record mutation should be separate capabilities.

5. **The schema must express prohibitions.** It is not enough to list permitted powers. Explicitly represent prohibited directions, forbidden data access, non-delegable powers and limits on emergency authority.

6. **Activation is a governed transition.** A draft constitutional profile must not silently become active. The system needs a legally authorized approval path, an immutable record of approval, validation and a controlled effective date.

### 7.3 Three contrasting nation profiles

These are abbreviated examples of how the model could represent the United Kingdom, United States and United Arab Emirates. They are illustrative architectural profiles, not complete legal mappings or authorization to activate a national installation.

#### A. United Kingdom

The UK is a useful example because its constitutional arrangements rely on statutes, constitutional conventions and prerogative powers, and because devolved administrations coexist with the UK Parliament and government.

GOV.UK
+2

```json
{
  "configuration_id": "uk-illustrative",
  "state_classification": {
    "state_forms": ["monarchy"],
    "government_forms": ["parliamentary"],
    "territorial_arrangements": [
      "unitary_state",
      "devolved_administration"
    ],
    "recognized_legal_traditions": [
      "common_law",
      "mixed_legal_systems"
    ]
  },
  "institutions": [
    {
      "institution_id": "uk-monarch",
      "official_name": "The Sovereign",
      "institution_type": "head_of_state",
      "branch_type": "constitutional",
      "independence": {
        "level": "constitutional",
        "legal_basis_refs": [
          "applicable_statutes",
          "constitutional_conventions",
          "applicable_prerogative_rules"
        ]
      },
      "powers": [
        {
          "power_id": "formal_appointment",
          "action": "appoint",
          "scope": {
            "office": "prime_minister",
            "conditions": [
              "applicable_constitutional_process"
            ]
          },
          "status": "requires_legal_mapping"
        }
      ]
    },
    {
      "institution_id": "uk-government",
      "official_name": "His Majesty's Government",
      "institution_type": "government",
      "branch_type": "executive",
      "independence": {
        "level": "constitutional",
        "legal_basis_refs": [
          "statutes",
          "constitutional_conventions"
        ]
      },
      "powers": [
        {
          "power_id": "executive_administration",
          "action": "administer",
          "scope": {
            "subject_matter": "lawfully_assigned_functions"
          },
          "status": "requires_legal_mapping"
        }
      ]
    },
    {
      "institution_id": "uk-parliament",
      "official_name": "Parliament of the United Kingdom",
      "institution_type": "legislature",
      "branch_type": "legislative",
      "status": "requires_legal_mapping"
    },
    {
      "institution_id": "uk-judiciary",
      "official_name": "United Kingdom judicial institutions",
      "institution_type": "judiciary",
      "branch_type": "judicial",
      "status": "requires_legal_mapping"
    }
  ],
  "relationships": [
    {
      "relationship_id": "uk-appointment",
      "from_institution_id": "uk-monarch",
      "to_institution_id": "uk-government",
      "relationship_type": "appoint",
      "scope": {
        "office": "prime_minister"
      },
      "conditions": [
        "validate_applicable_constitutional_conventions"
      ],
      "status": "requires_legal_mapping"
    }
  ],
  "activation": {
    "status": "not_approved",
    "legal_validation": "pending",
    "independent_review": "pending"
  }
}
```

Implementation warning: the UK's constituent legal systems, devolved competences, parliamentary conventions and statutory rules require substantially more detail than this example. A generic `unitary_state` label must not be used to erase devolution or differences in legal jurisdiction.

#### B. United States

The US is a presidential federal republic with three constitutionally established branches at the federal level and separately constituted state governments. The Constitution's Articles I–III establish Congress, the presidency and the federal judiciary; Article IV addresses relations among states and the federal system.

National Archives
+2

```json
{
  "configuration_id": "us-illustrative",
  "state_classification": {
    "state_forms": ["republic"],
    "government_forms": ["presidential"],
    "territorial_arrangements": ["federal"],
    "recognized_legal_traditions": ["common_law"]
  },
  "institutions": [
    {
      "institution_id": "us-president",
      "official_name": "President of the United States",
      "institution_type": "head_of_state_and_government",
      "branch_type": "executive",
      "independence": {
        "level": "constitutional",
        "legal_basis_refs": [
          "us_constitution_article_ii"
        ]
      }
    },
    {
      "institution_id": "us-congress",
      "official_name": "Congress of the United States",
      "institution_type": "bicameral_legislature",
      "branch_type": "legislative",
      "legal_basis_refs": [
        "us_constitution_article_i"
      ]
    },
    {
      "institution_id": "us-federal-courts",
      "official_name": "Federal Judiciary",
      "institution_type": "judiciary",
      "branch_type": "judicial",
      "legal_basis_refs": [
        "us_constitution_article_iii"
      ]
    },
    {
      "institution_id": "us-states",
      "official_name": "State governments",
      "institution_type": "constituent_units",
      "branch_type": "territorial",
      "legal_basis_refs": [
        "us_constitution_article_iv",
        "relevant_state_constitutions"
      ]
    }
  ],
  "relationships": [
    {
      "relationship_id": "us-appointments",
      "from_institution_id": "us-president",
      "to_institution_id": "us-senate",
      "relationship_type": "request_confirmation",
      "scope": {
        "appointment_categories": [
          "constitutionally_or_legally_covered_nominations"
        ]
      },
      "status": "requires_legal_mapping"
    },
    {
      "relationship_id": "us-judicial-review",
      "from_institution_id": "us-federal-courts",
      "to_institution_id": "us-president",
      "relationship_type": "judicial_review",
      "scope": {
        "matters": "within_jurisdiction"
      },
      "status": "requires_legal_mapping"
    }
  ],
  "activation": {
    "status": "not_approved",
    "legal_validation": "pending",
    "independent_review": "pending"
  }
}
```

The example deliberately avoids asserting that every presidential nomination requires Senate confirmation or that every dispute belongs to the federal courts. Those details must be represented by the applicable constitutional provisions, statutes, jurisdiction rules and exceptions.

#### C. United Arab Emirates

The UAE is expressly a federation of seven emirates. Its Constitution identifies five federal authorities in Article 45, and Articles 46–49 describe the Federal Supreme Council and its powers. Article 51 addresses the election of the federal President and Vice President by the Federal Supreme Council.

UAE Legislation
+1

```json
{
  "configuration_id": "uae-illustrative",
  "state_classification": {
    "state_forms": ["federation", "monarchy"],
    "government_forms": ["federal_constitutional_arrangement"],
    "territorial_arrangements": [
      "federal",
      "constituent_emirates"
    ],
    "recognized_legal_traditions": [
      "civil_law",
      "islamic_law"
    ]
  },
  "institutions": [
    {
      "institution_id": "uae-supreme-council",
      "official_name": "Federal Supreme Council",
      "institution_type": "federal_supreme_council",
      "branch_type": "federal_constitutional_authority",
      "legal_basis_refs": [
        "uae_constitution_articles_45_46_47_48_49"
      ]
    },
    {
      "institution_id": "uae-president",
      "official_name": "President of the UAE",
      "institution_type": "head_of_state",
      "branch_type": "federal_executive",
      "legal_basis_refs": [
        "uae_constitution_article_51",
        "applicable_presidential_powers"
      ]
    },
    {
      "institution_id": "uae-council-of-ministers",
      "official_name": "UAE Council of Ministers",
      "institution_type": "federal_government",
      "branch_type": "executive",
      "legal_basis_refs": [
        "uae_constitution_articles_45_58_59_60"
      ]
    },
    {
      "institution_id": "uae-federal-national-council",
      "official_name": "Federal National Council",
      "institution_type": "federal_legislative_body",
      "branch_type": "legislative",
      "legal_basis_refs": [
        "uae_constitution_article_45"
      ]
    },
    {
      "institution_id": "uae-federal-judiciary",
      "official_name": "Federal Judiciary",
      "institution_type": "judiciary",
      "branch_type": "judicial",
      "legal_basis_refs": [
        "uae_constitution_article_45"
      ]
    },
    {
      "institution_id": "uae-emirates",
      "official_name": "Constituent emirates",
      "institution_type": "constituent_units",
      "branch_type": "territorial",
      "legal_basis_refs": [
        "uae_constitution_articles_1_46"
      ]
    }
  ],
  "relationships": [
    {
      "relationship_id": "uae-president-election",
      "from_institution_id": "uae-supreme-council",
      "to_institution_id": "uae-president",
      "relationship_type": "elect",
      "legal_basis_refs": [
        "uae_constitution_article_51"
      ],
      "status": "requires_legal_mapping"
    },
    {
      "relationship_id": "uae-prime-minister-appointment",
      "from_institution_id": "uae-supreme-council",
      "to_institution_id": "uae-council-of-ministers",
      "relationship_type": "approve_appointment",
      "legal_basis_refs": [
        "uae_constitution_article_47"
      ],
      "status": "requires_legal_mapping"
    }
  ],
  "activation": {
    "status": "not_approved",
    "legal_validation": "pending",
    "independent_review": "pending"
  }
}
```

This profile is still only a structural illustration. A real UAE installation must map the federal and emirate-level powers, the federal judiciary's jurisdiction, the emirates' own institutions, and all relevant constitutional and statutory rules before enabling any consequential workflow.

### 7.4 Configuration approval and change control

The constitutional configuration should have a stricter lifecycle than an ordinary application setting.

Recommended lifecycle:

**Draft → Legal review → Institutional consultation where required → Security validation → Authorized approval → Scheduled activation → Active → Superseded**

For contested changes, include a `disputed` or `suspended_pending_review` state where appropriate.

Every approved change should retain:

- Previous and new versions.
- Exact legal instruments and provisions.
- Identity of the proposer and approving officials.
- Any required independent or institutional confirmations.
- Effective date and activation event.
- Affected powers, relationships and data-access policies.
- Migration and rollback constraints.
- A record of any constitutional or judicial review.

A two-person technical approval is not a substitute for the legally required constitutional amendment process. The approval workflow must reflect the actual process in that country.

---

## 8. Priorities and risks

My strongest recommendation is to build the constitutional model before expanding CivicOS further into individual institutions. Otherwise, each new branch will inherit assumptions from the existing executive-centric architecture.

### 8.1 What to build first

**01 — Constitutional registry and institution model**
Add nation-neutral institutions, offices, powers, jurisdiction, legal-source versions, appointment rules, independence classifications and record ownership. Do not start by building dozens of new dashboards.

**02 — Authority and relationship engine**
Implement typed relationships for appointing, dismissing, funding, directing, reviewing, auditing, investigating, referring and requesting information. Enforce them in the backend.

**03 — Independent institutional security boundaries**
Establish separate permissions and record ownership for the executive, legislature, judiciary, electoral bodies, audit institutions and other independent bodies. Test cross-branch access denial.

**04 — Constitutional lifecycle and transition workflows**
Support elections, appointments, vacancies, acting officeholders, caretaker governments, judicial review, emergency declarations and lawful institutional restructuring.

**05 — Branch-specific workspaces**
Replace the assumption of a single executive command centre with workspaces generated from institutional roles and lawful capabilities. Preserve a national overview where authorized, with restricted drill-down.

**06 — Country validation and independent review**
Test the model against at least three contrasting constitutional systems before declaring the architecture nation-neutral. Obtain legal review from the participating country's competent authorities.

### 8.2 The most dangerous design mistakes

| Mistake | Why it is dangerous | CivicOS safeguard |
|---|---|---|
| Assuming every nation has a president, prime minister and parliament | Excludes monarchies, collegial executives, one-chamber systems and other arrangements | Configurable office types and institution names; no mandatory executive template |
| Treating every institution as a ministry | Erases judicial, legislative and independent-body autonomy | Independent institution identities, record ownership and authorization boundaries |
| Treating independence as a boolean | Misses differences in appointment, funding, instructions and removal | Separate legal rules for each relationship |
| Assuming the head of state is the head of government | Incorrect for many parliamentary monarchies and republics | Model both offices independently, with configurable combinations |
| Assuming all courts belong to a ministry | Risks interference in judicial administration and case decisions | Court-owned case records and judicially controlled decision workflows |
| Treating all independent bodies identically | Central banks, auditors, election commissions and regulators have different mandates | Domain-specific powers and legal constraints |
| Giving the highest-ranking official unrestricted access | Converts hierarchy into blanket data access | Least privilege, purpose limitation, record-level authorization and read logging |
| Treating legal documents as the complete legal model | A document alone does not define jurisdiction, effective dates or operational consequences | Structured provisions, legal interpretations, authority mappings and versioned rules |
| Assuming customary or religious authority is automatically universal | Can exceed recognized personal, territorial or subject-matter jurisdiction | Explicit jurisdiction, recognition, appeal and conflict-of-law rules |
| Treating emergency powers as an override of every restriction | Creates an uncontrolled bypass of constitutional safeguards | Narrow, time-limited powers with legal triggers and review |
| Treating AI output as an official decision | Can create unaccountable or unlawful exercises of public power | AI may assist; legally material decisions require an authorized human decision-maker |
| Assuming a green CI run proves constitutional correctness | Tests can verify implementation of an incorrect legal configuration | Independent legal validation, scenario tests and controlled activation |

### 8.3 Where legal review is mandatory

Before enabling production operations, the country must validate the following:

- **Constitutional structure:** branches, institutions, office titles, jurisdiction and appointment processes.
- **Independent-body autonomy:** appointment, removal, funding, instructions, reporting and oversight powers.
- **Judicial administration:** case ownership, access restrictions, judicial review, prosecution and disclosure.
- **Elections and transitions:** certification, office assumption, caretaker rules, dissolution and succession.
- **Emergency powers:** declaration, permitted measures, expiry, oversight and non-derogable limits.
- **Customary and religious jurisdiction:** recognized authorities, applicable persons, subject matter, territorial scope and appeal routes.
- **Data-sharing authority:** each cross-institution service, its purpose, legal basis and permitted fields.
- **Public disclosure:** official registers, legislative records, judgments, personal data and protected proceedings.
- **Funding and audit:** appropriation, spending authority, reporting and audit access.
- **Constitutional configuration changes:** who can propose, approve, challenge and activate changes.

Where constitutional legitimacy or authority is disputed, CivicOS should not resolve the dispute by choosing the most senior administrator. It should preserve the status quo where legally appropriate, record the dispute, restrict the contested operation and direct the matter to the authorized legal process.

### 8.4 The three tests I would require before calling CivicOS constitution-neutral

**Test 1 — Structural portability.** Can the same software represent a presidential federation, a parliamentary constitutional monarchy and a federal monarchy with constituent rulers without country-specific code changes?

**Test 2 — Negative authorization.** Can you prove that a US-style executive cannot exercise a power belonging to Congress or the courts, that a UK-style minister cannot automatically direct an independent body, and that a UAE federal institution cannot automatically exercise powers reserved to a constituent emirate?

The exact legal test cases must be validated against the respective constitutions and statutes; these examples are test-design goals, not assertions that every action is forbidden in all circumstances.

**Test 3 — Transition safety.** Can the platform change officeholders, institutions, territorial powers and legal versions without losing records, silently transferring powers or changing the legal basis of historical decisions?

If these tests pass with documented legal mappings and independent review, CivicOS will have a much stronger claim to being a reusable national-government platform rather than a configurable ministry suite.

---

## Final architectural verdict

I would make the constitutional configuration and authorization graph the foundation of CivicOS.

Everything else—casework, registers, permits, payments, directives, public services, dashboards and the digital twin—should operate within that foundation.

The result should not be one giant government hierarchy. It should be a network of legally constituted institutions with explicit powers, bounded relationships, independent records and accountable human decision-makers.

The decisive design rule is:

**CivicOS must know not only who an official is, but which institution they represent, which office they hold, which law empowers the requested action, which version of that law applies, which other institutions may lawfully participate, and which restrictions remain in force.**

That is the difference between a government portal and a genuine constitutional operating system.

The constitutional examples and article references above are based on official constitutional sources where cited, but the schema and relationship matrices are architectural recommendations, not legal opinions. Before any country is activated, its competent legal authorities should validate the complete mapping against authoritative, current legal texts and applicable constitutional practice.
