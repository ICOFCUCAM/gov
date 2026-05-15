# CivicOS — Civic AI Agents Acting on Behalf of Citizens (Companion 83)

This companion specifies how CivicOS supports AI agents that act on behalf of individual citizens — proactive personal civic agents in the wallet, delegated agents for specific tasks, and the broader emerging ecosystem of AI agents in civic life. It complements Companion 17 §3 (proactive wallet agent), Companion 10 §3 (charters), Vol II Parts 1-2 (era-by-era citizen-agent evolution), and Companion 32 (cognitive liberty) by going deep on the operational and ethical design of agents whose principal is the individual citizen.

The thesis: **AI agents acting on behalf of citizens carry distinctive promise and distinctive risk**. They can save citizens enormous time and friction in dealing with state services. They can also be corrupted into instruments that serve someone other than the citizen. CivicOS supports civic AI agents through citizen-controlled charters, granular delegation, transparency, reversibility, anti-cooptation, and clear principal-agent discipline.

The discipline: citizen as principal absolutely; granular consent for delegation; agent transparency to principal; reversibility of agent actions; budget caps on agent operations; anti-cooptation by state or commercial interests; agent identity verifiable; multi-agent ecosystem governance; cognitive liberty preserved (Companion 32).

---

## 1. Principles

1. **Citizen is principal absolutely.** Agent serves citizen, not state or commercial.
2. **Granular consent for delegation.** Per-action, per-scope, per-time.
3. **Agent transparency to principal.** Citizen sees what agent did and why.
4. **Reversibility of agent actions.** Citizen can undo within window.
5. **Budget caps on agent operations.** Compute, money, decisions, time.
6. **Anti-cooptation.** Agent cannot be turned against citizen by anyone.
7. **Agent identity verifiable.** Counterparts know they are dealing with citizen-agent.
8. **Multi-agent ecosystem governance.** Per Companion 18 §15.
9. **Cognitive liberty preserved.** Per Companion 32.
10. **Vulnerable users protected.** Children, elderly, disabled with special safeguards.

---

## 2. Civic agent types

### 2.1 Personal civic agent (in wallet)

- Built into Civic Wallet.
- Default agent for routine civic interactions.
- Citizen always sees and controls.

### 2.2 Delegated specialist agent

- Citizen delegates specific tasks (e.g., handling annual tax filing).
- Granular charter per delegation.
- Time-bounded.

### 2.3 Vulnerable user agent

- Trusted person delegation patterns.
- Family or caregiver delegation per citizen wishes.
- Special safeguards for children, elderly, disabled.

### 2.4 Business agent (Business Wallet)

- For legal entities; per Companion 17 §9.
- Different governance regime.

### 2.5 Forbidden agent types

- State agents acting on citizens (state acts directly, not through agents purporting to represent citizens).
- Commercial agents harvesting citizen data through purported representation.
- Surveillance agents disguised as helpful.

---

## 3. Charter for civic agent

Per Companion 10 §3 mechanics adapted to citizen-as-principal:

```yaml
charter:
  id: "CITIZEN-CHARTER-XXX-vN"
  principal: "Citizen [CivicID alias]"
  agent_class: "personal_civic"
  purpose: |
    What the agent is delegated to do, in citizen's own words
    (or pre-formulated options citizen selected).
  scope:
    permitted_actions: [list]
    excluded_actions: [list]
    relevant_state_systems: [list]
  budget:
    decisions_per_day: limit
    money_movement_authority: limit (often zero or strict)
    compute_units_per_month: limit
    side_effects_per_decision: declared
  reversibility:
    window_hours: standard
    citizen_override: always available
    full_state_restoration: true
  transparency:
    activity_log: citizen-visible
    rationale_per_action: citizen-readable
    counterpart_identification: agent identifies as acting for citizen
  kill_switch:
    citizen: always; one-tap pause
    Wallet Authority: emergency pause if agent malfunctioning
  sunset:
    expires: date; renewable by citizen
```

### 3.1 Discipline

- Citizen drafts charter (with helpful templates).
- Plain-language summary.
- Granular scope.
- Reasonable defaults; citizen can tighten.

### 3.2 Forbidden in charters

- State or commercial party as co-principal.
- Open-ended scope.
- Indefinite duration.
- Removal of citizen kill switch.
- Charter modification without citizen consent.

---

## 4. Agent transparency

### 4.1 The principle

The citizen sees everything the agent does and why.

### 4.2 Mechanisms

- Activity log in wallet.
- Plain-language summaries.
- Rationale per consequential action.
- Notification of significant actions.
- Periodic review prompts.

### 4.3 Discipline

- Anti-information-overload (intent-aware bundling).
- Citizen control over notification frequency.
- Anti-burying-information.

### 4.4 Forbidden

- Hidden agent actions.
- Misleading summaries.
- Information overload designed to obscure.

---

## 5. Reversibility

Per Companion 10 §6 adapted:

### 5.1 The principle

Agent decisions reversible within citizen-set windows.

### 5.2 Mechanisms

- Standard reversibility window per action class.
- Citizen can configure tighter or looser windows.
- Full state restoration on reversal.
- Counterparts notified of reversal.

### 5.3 Discipline

- Citizen-friendly reversal mechanics.
- Anti-cascading-effects from reversal.
- Anti-penalty for legitimate reversal.

### 5.4 Forbidden

- Irreversible agent actions absent explicit citizen consent at time of action.
- Counterparts that refuse to honor citizen reversal within window.
- Reversal that harms citizen.

---

## 6. Budget enforcement

### 6.1 The principle

Agent operates within citizen-set budgets.

### 6.2 Mechanisms

- Budget tracked per charter.
- Soft and hard limits.
- Citizen notified as budget approaches limit.
- Agent halts at limit until citizen authorizes more.

### 6.3 Discipline

- Anti-budget-circumvention.
- Anti-budget-coercion.
- Plain-language budget reporting.

### 6.4 Forbidden

- Budget circumvention through subdivision.
- Budget extension without citizen consent.
- Use of budget mechanisms to manipulate citizen.

---

## 7. Anti-cooptation

### 7.1 The principle

Agent cannot be turned against the citizen by state, commercial actor, or other party.

### 7.2 Mechanisms

- Agent identity cryptographically tied to citizen wallet.
- Agent code open or auditable.
- Agent training data and model verifiable.
- Anti-third-party-modification.
- Citizen-controlled keys.

### 7.3 Discipline

- Anti-vendor-coercion.
- Anti-state-coercion of citizen agents.
- Anti-commercial-takeover.

### 7.4 Forbidden

- State modification of citizen agents.
- Commercial parties hijacking citizen agents.
- Foreign coercion of citizen agent infrastructure.
- Use of citizen agents for surveillance.

---

## 8. Agent identity verification

### 8.1 The principle

Counterparts know they are dealing with citizen-agent, not impostor.

### 8.2 Mechanisms

- Agent presents verifiable credential confirming it acts for the citizen.
- Charter scope visible to counterpart.
- Cryptographic verification.
- Anti-impersonation.

### 8.3 Discipline

- Counterparts treat agents per their charter.
- Agents identify themselves as agents (per Companion 18 §15.2).
- Inter-agent protocols explicit.

### 8.4 Forbidden

- Agent impersonating citizen directly.
- Agent operating without charter visibility.
- Counterparts treating agents as if they had unlimited citizen authority.

---

## 9. Vulnerable user agents

### 9.1 The principle

Children, elderly, disabled citizens may benefit from agent support but require special safeguards.

### 9.2 Mechanisms

- Trusted person delegation patterns (parents, caregivers, guardians).
- Citizen retains override where capacity exists.
- Capacity assessments fair and accessible.
- Anti-coercion in delegation.
- Periodic review.

### 9.3 Discipline

- Best interests of vulnerable user.
- Anti-exploitation by trusted persons.
- Independent oversight where appropriate.

### 9.4 Forbidden

- Trusted person delegation absent capacity for choice.
- Use of agent against vulnerable user.
- Commercial exploitation of vulnerable user agents.

---

## 10. Multi-agent interactions

Per Companion 18 §15:

### 10.1 The pattern

Citizens have agents; businesses have agents; ministries have agents. Multi-agent interactions become routine.

### 10.2 Mechanisms

- Agent registry verification.
- Inter-agent protocols explicit.
- Audit of agent interactions.
- Anti-emergent-collusion monitoring.

### 10.3 Discipline

- Citizen agent always identifies its principal.
- Counterparty agents identify their principals.
- Inter-agent communications transparent.

### 10.4 Forbidden

- Covert agent coordination.
- Agents conspiring against citizens.
- Multi-agent ecosystems lacking governance.

---

## 11. Cognitive liberty

Per Companion 32:

### 11.1 The principle

Civic agents must not become tools for nudging citizens beyond their stated goals.

### 11.2 Mechanisms

- Agent serves citizen's stated goals.
- No persuasive optimization within agents.
- Cognitive liberty preserved structurally.
- Citizen can disagree with agent recommendations.

### 11.3 Discipline

- Anti-manipulation of citizen through agent.
- Plain language in agent suggestions.
- Symmetric framing of options.

### 11.4 Forbidden

- Agents using persuasive techniques on citizens.
- Agents directing citizens away from their stated goals.
- Agents serving commercial or state interests through manipulation.

---

## 12. Cross-sovereign agent interactions

### 12.1 The principle

Citizen agents may interact with services or other agents across sovereign borders.

### 12.2 Mechanisms

- Cross-sovereign mutual recognition under planetary protocols (Companion 15 §6).
- Agent identity portable.
- Sovereign opt-outs preserved.
- Anti-cross-border-coercion of citizen agents.

### 12.3 Discipline

- Sovereign authority over agent regulation.
- Citizen authority over agent operation.

### 12.4 Forbidden

- Cross-sovereign agent interactions exposing citizens to surveillance.
- Foreign coercion of citizen agents.

---

## 13. Forbidden in civic agents for citizens

CivicOS will not:

- Permit state or commercial party as co-principal of citizen agent.
- Allow open-ended agent scope.
- Permit hidden agent actions.
- Allow misleading summaries.
- Permit irreversible agent actions absent explicit consent.
- Allow budget circumvention.
- Permit state modification of citizen agents.
- Allow commercial parties hijacking citizen agents.
- Permit foreign coercion of citizen agent infrastructure.
- Allow use of citizen agents for surveillance.
- Permit agent impersonating citizen directly.
- Allow trusted person delegation absent capacity for choice.
- Permit commercial exploitation of vulnerable user agents.
- Allow covert agent coordination.
- Permit agents using persuasive techniques on citizens.
- Allow agents serving commercial or state interests through manipulation.

This list grows; it does not shrink.

---

## 14. KPIs

| KPI | Indicator |
|---|---|
| Citizen agent adoption | Active users; satisfaction |
| Charter compliance | 100% of agent actions within charter |
| Reversibility usage | Available; functioning |
| Anti-cooptation incidents | Zero |
| Vulnerable user safeguards | Implementation; outcomes |
| Multi-agent ecosystem health | Coordination patterns; emergent behavior monitoring |
| Cognitive liberty preservation | Audit |
| Cross-sovereign interactions | Citizen authority preserved |
| Citizen complaints about agents | Resolution |

---

## 15. The civic agents north star

Civic AI agents acting on behalf of citizens carry distinctive promise — saving time, reducing friction, enabling participation by those for whom navigating bureaucracy is otherwise prohibitive — and distinctive risk: corruption into instruments serving someone other than the citizen.

CivicOS supports civic agents through citizen-as-principal absolutely, granular charters, transparency, reversibility, budget enforcement, anti-cooptation, identity verification, vulnerable user safeguards, multi-agent governance, cognitive liberty preservation, cross-sovereign discipline.

When CivicOS becomes a tool for state-modified or commercially-captured citizen agents, surveillance through agents, manipulation of citizens through agents, or vulnerable user exploitation through agents — it has failed the citizen-as-principal commitment. Capability without principal-agent discipline is not progress; it is the institutionalization of agents that betray their principals.

When the platform supports civic agents serving citizens — through structural commitments to citizen authority, transparency, reversibility, anti-cooptation, and cognitive liberty — it earns the right to be infrastructure for societies in which AI assistance amplifies citizen agency rather than substituting for it.

The discipline is daily. The principal-agent relationship is structural. The citizen control is real. The transparency is honest. The cognitive liberty is preserved.

Civic agents are servants, not principals; helpers, not deciders; transparent, not opaque; reversible, not final; controlled, not autonomous beyond citizen will. Anything less abandons citizens to AI that serves someone else's interests through their nominal name.
