"""Status knowledge base for the forms catalogue rows (docs/forms-catalogue/*.md), read against app/src on 21 Oct 2026.

Strict: *Met* only where the behaviour exists end to end (procedure, register, permission; a test where one
exists). Statuses as in rules.py plus *Legal review*: built only after a country's legal review as an unapproved
draft (plan step I11); *Platform rule stricter*: a binding CLAUDE.md rule decides more strictly and CivicOS will
not hold it (cited). Steps follow docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md §5 (I12 and I13 added for the
catalogue, 21 Oct 2026). Every catalogue form also carries 'I1-catalogue' (its field contract designed in the
form library at or above the catalogue's standard) in also_steps.

assess(row) -> dict(status, evidence, missing, step, also, basis, legal_review?)
"""
import re
import rules as KB

# ---------------------------------------------------------------- evidence shorthands (paths relative to app/src)
PARCEL = "lib/data/parcels.ts (cadastre authority from the nation's parcel policy; recorded by one official, published or amended by a different one; versions kept; outline checked, area computed, region from the boundary in force; rights with type, holder kind, holder, share, document; publicParcel() carries no rights); tests lib/data/parcels.test.ts, parcels-privacy.test.ts"
BOUND = "lib/data/boundaries.ts (versions loaded by the mapping agency, published by a different official, in force from a date); test lib/data/boundaries.test.ts"
FACIL = "lib/data/facilities.ts (sites recorded with how captured, checked against the map, published by a second official; viewFacility() generalises restricted sites); test lib/data/facilities.test.ts"
ORGLIC = "lib/organisations/register.ts setStanding() through lib/organisations/procedures.ts org.licence (a licence is a standing in a register type kept by its authority: conditions, validUntil, certificate, suspend, revoke, history kept; power from the approved permit authority mapping); tests lib/organisations/procedures.test.ts, register.test.ts"
PERMITMAP = "lib/permits/authority.ts proposed mappings (unapproved drafts) for this permit type; generic application lib/data/store/permits.ts createPermit()/decidePermit()"
POLICE = "lib/police/procedures.ts (incident intake, triage, classification citing the law, assignment, referral as a linked case, closure with reasons, reopening; no suspect or finding field); test lib/police/procedures.test.ts"
COURTS = "lib/courts/procedures.ts (filed, registry review, accepted/rejected, served, hearing, reserved, judgment, stay, appeal as a separate case, enforcement, archived; worked by the judiciary alone), lib/courts/hearings.ts (public cause list without parties); test lib/courts/procedures.test.ts"
LEGEV = "lib/legislature/register.ts (introduceBill, addText versions, referToCommittee, recordReport, proposeAmendment/decideAmendment, recordVote under the approved procedure's vote rules, passBill, certifyBill, recordAssent by the head of state's office, recordCommencement, publishBill, transmitToLaws, corrections confirmed by a different official; only the legislature's officials write); tests lib/legislature/register.test.ts, routes.test.ts, writes.test.ts"
CIVEV = "lib/civil/procedures.ts (civil.birth, civil.death, civil.marriage, civil.correction reference procedures), lib/civil/register.ts (changes only through procedure effects), certificates checked at /verify; tests lib/civil/procedures.test.ts, register.test.ts"
IMMEV = "lib/immigration/procedures.ts (immigration.visa, immigration.extension, immigration.revocation), lib/immigration/register.ts (visas and residence permits; canReadImmigration(); others learn status only through immigration.status); tests lib/immigration/procedures.test.ts, register.test.ts"
TAXEV = "lib/tax/procedures.ts (tax.registration, tax.return with amendments, assessment with the approved rule or entered with reasons, objection; four-eyes decisions), lib/tax/register.ts (taxpayers, returns, assessments, account ledger, reconcileTaxPayments); canReadTax(); tests lib/tax/procedures.test.ts, register.test.ts"
# Tax services (plan step I5, forms batch 6): reference procedures as drafts, every decision by two officials and classified under proposed, unapproved mappings; no rate, interest, penalty or period shipped.
TAX6EV = "lib/tax/procedures.ts (tax.registration-amendment, tax.amendment, tax.refund, tax.payment-plan, tax.payment-plan-review, tax.disclosure, tax.ruling, tax.compliance; nil and late returns in tax.return; objection admissibility and withdrawal), lib/tax/register.ts (amendRegistration versioned, decideRefund/instructRefund/reconcileRefundPayout once, recordPaymentPlan with instalment bills reconciled once, recordDisclosure, recordRuling), lib/permits/decisions.ts TAX_PERMITS; forms batch 6 (lib/forms/library/catalogue-contracts/tax.*.json, docs/FORMS_CONFORMANCE.md §14); tests lib/tax/services.test.ts, lib/forms/catalogue-contracts.test.ts"
TAX6WAIT = "Field contract in the form library (forms batch 6, lib/forms/library/catalogue-contracts/; docs/FORMS_CONFORMANCE.md §14), waiting for its procedure; test lib/forms/catalogue-contracts.test.ts"
CUSEV = "lib/customs/procedures.ts (customs.declaration: declaration, officer's channel with reasons, duty from the approved customs.tariff rule or entered with reasons, release decision), lib/customs/register.ts; customs.release exchange; tests lib/customs/procedures.test.ts, register.test.ts"
PHEV = "lib/health/programmes/register.ts and procedures.ts (programme register: eligibility cited, coverage with documented denominator, budget reference, reporting period, supply items; interventions under the nation's rules CFG-PH-003; aggregate returns with reported, suspected, confirmed and modelled kept apart; risk communications approved by two officials), lib/health/small-cells.ts; tests lib/health/programmes/programmes.test.ts, scope.test.ts"
COMPLAINTEV = "lib/health/complaints/procedures.ts (health.complaint, prof.complaint: intake, assessment by the assigned officer with reasons, referral into the licence's or registration's own case through refer(); complainant restricted, every read logged; no clinical field); test lib/health/complaints/complaints.test.ts"
HEALTHEV = "lib/health/procedures.ts (facility and pharmacy licence, renewal, suspension, revocation on the health-facilities and pharmacies registers; premises as registered sites; referrals), lib/health/register.ts (aggregate capacity returns, no patient field); tests lib/health/procedures.test.ts"
PROFEV = "lib/professions/procedures.ts (prof.registration, prof.renewal, prof.fitness), lib/professions/register.ts (each profession kept by its regulator; public check by full name, rate-limited, harvest watch; professional.standing exchange); tests lib/professions/*.test.ts"
EDUEV = "lib/education/procedures.ts (edu.inspection, edu.qualification, edu.qualification-correction, edu.qualification-revocation), schools as organisations with a standing in the schools register, aggregate returns, qualification.verify; tests lib/education/procedures.test.ts"
ACCEV = "lib/organisations/procedures.ts org.accreditation (higher-education accreditation as a standing kept by the accrediting body)"
OVSEV = KB.OVS + '; ' + KB.PIDEV
TRANSEV = KB.TRANS + "; emergencies recorded as legal events cited from the laws register, confirmed by a different person, lapsing at expiry (lib/transitions/events.ts, state.ts)"
INCID = "ministry incidents with recorded places (lib/data/incident-places.ts; test lib/data/incident-places.test.ts)"
# Territory and infrastructure (plan I7, forms batch 10): reference procedures as drafts owned by the slots the nation names (landRegistry,
# buildingControl, housing, vehicleRegistration, roadAuthority, transportRegulator; each local government its own); every decision by two
# officials under proposed, unapproved mappings (lib/permits/decisions.ts); nothing a law decides shipped.
LANDEV = "lib/land/procedures.ts (land.transfer, land.encumbrance, land.discharge, land.correction: lodge, verify against the register, register by two officials; land.dispute: registered disputes hold the interest until decided, a court order recorded or withdrawn), lib/data/parcels.ts applyRightsChange()/freezeInterest() (rights with references and rank, every version with its case, decision and effective date; rights only to their keepers, rightsKeepers()), lib/land/register.ts; tests lib/land/land.test.ts, app/api/parcels/parcels-privacy.test.ts"
BLDEV = "lib/building/procedures.ts (building.planning: validation on a published parcel, consultation, decision by two officials; building.permit: plans by version and digest, technical review, grant against one approved design, inspections as findings with reasons against the rules' checklist, stop-work citing the law and lifted by a second official, variations, occupancy only after a passing final inspection), lib/building/register.ts (building control rules adopted through lib/law/policy-change.ts, version recorded on each decision); test lib/building/building.test.ts"
HOUEV = "lib/housing/procedures.ts (housing.programme with terms approved by two officials citing the law; housing.application: criteria met or not with evidence, points from the terms in force, allocation by two officials with reasons, an out-of-order allocation recorded), lib/housing/register.ts; test lib/building/building.test.ts"
LGEV = "lib/localgov/procedures.ts (lg.resolution, lg.budget, lg.service, lg.complaint templates adopted by each local government as its own, standing subnational), lib/localgov/register.ts (council rules through policy-change.ts, quorum and majority checked on the version in force; budgets in whole minor units; requests with places from the map); whole government reaches only under an approved relationship (roles.ts Boundaries.subnational); test lib/localgov/localgov.test.ts"
TRNEV = "lib/transport/procedures.ts (transport.vehicle-registration, transport.vehicle-transfer, transport.driving-licence, transport.road-works, transport.operator-licence; checks, decisions by two officials), lib/transport/register.ts (vehicles and keepers with history, licences with medical fitness only as a sealed document reference, road works with place and period, operators of the organisations register); test lib/transport/transport.test.ts"
B10 = "; library contract of batch 10 (app/src/lib/forms/library/catalogue-contracts/; docs/FORMS_CONFORMANCE.md §18)"
B10MISS = "Adoption by the nation: the body named for its slot, its procedure approved by a second official, its decision mapping approved"
DELEG = "lib/records/delegations.ts (who may act for whom, for which procedures, until when; granted by the verifying official, revocable, expiring, audited without names); test lib/records/delegations.test.ts"
RET = "lib/data/retention.ts (rules proposed by one administrator, confirmed by another, legal basis recorded; legal hold respected; sweep audited with counts); tests lib/data/retention.test.ts, retention-oversight.test.ts"
UPD = "lib/data/updates.ts decide() (named person per step, audit chain), lib/data/change-control.ts (four-eyes), lib/data/readiness.ts (preflight, UAT sign-off); tests lib/data/updates.test.ts, change-control.test.ts, readiness.test.ts"
INTAPP = "proposeIntegrationApproval()/confirmIntegrationApproval() (an integration, its scopes and purposes approved by two officials); test lib/data/integration-approval.test.ts"
SEAL = "lib/keys/seal-register.ts (which keys are an institution's seals over time, approved; seal judged by its audit-chain time), decision key signing (lib/records/decisions.ts); tests lib/keys/seal-register.test.ts, lib/records/decisions.test.ts"
AIEV = "AI is advisory only and off unless the nation opts in (SovereignProfile.aiAssistant); /api/ai/advisory refuses when off, callers fall back to rule-based advisories; no AI path calls lib/casework/engine.ts act() or a register's changing function (CLAUDE.md 'AI never makes a legally material decision'); test app/api/ai/advisory/route.test.ts"
AIMISS = "No test proves that no AI output can reach act(), a register change or a publication; no register of AI features (owner, permitted inputs, output classification, evaluation, human review, audit policy)"
A11Y = "Public sites: npm run audit:sites (axe WCAG A/AA on every site, design and viewport), logical CSS and right-to-left, self-hosted fonts; console tokens at 4.5:1 (lib/theme/tokens.test.ts)"
A11YMISS = "No form renderer for self-service, assisted and print channels with WCAG 2.2 AA tests, save-and-resume and check-your-answers (plan I1, I10)"
PROV = KB.TWIN + "; SignalKind record/observed/reported/modelled/sample/simulated/unavailable (lib/twin/signal.ts); production folds generated panels to Not connected (" + KB.FOLD + ")"
PROVMISS = "No 'verified', 'estimated', 'provisional' or 'revised' kind (docs/INTEGRATION_REGISTER.md 20.68); indicator definitions exist (lib/indicators/: numerator, denominator, period, coverage, method version; values Record, Sample or Not connected) — plan I3"
CFGEV = "Configuration through the platform's approved records: laws register (" + KB.LAW + "), rules (" + KB.RULESX + "), procedure packages drafted, tested and approved by two officials (lib/casework/packages.ts), permit authority mappings (lib/permits/authority.ts), who is responsible (lib/nation/deployment.ts authorityFor()), country rule sets through lib/law/policy-change.ts"
LEGALREV = "Directions §15 and plan §4: built only after the judiciary's and the country's legal review, as unapproved drafts (step I11)"
POLRULE = "CLAUDE.md Police: 'intake and referral only: classification cites the law, no field records a suspect or a finding' (" + POLICE + ")"
CLINRULE = "CLAUDE.md Health: 'no patient or clinical field anywhere, no national patient record'; returns are aggregates (lib/health/register.ts; tests apps/ministry-health/health-fields.test.ts, health-surfaces.test.ts)"
STUDRULE = "CLAUDE.md Education: 'Returns carry aggregate counts only; there is no student record system'; qualifications recorded, corrected and revoked only through education cases, checked through qualification.verify (" + EDUEV + ")"
CLASSRULE = "Catalogue Part 11 §3.3 (binding): an installation not accredited for a classification level must not store that class; CivicOS holds no classification scheme, no accreditation level and no intelligence content"
NOTHOLD = "CivicOS will hold only approved metadata or a reference to the record in an accredited external system"

FINEV = "lib/finance/register.ts and procedures.ts (budget.circular, budget.ceiling, budget.bid, budget.appropriation, budget.revision, finance.commitment, treasury.payee-account, treasury.payment separated by person at every stage and approved by two officials with the tier from the approved rule, treasury.cash-forecast; appropriation balances computed, never stored); tests lib/finance/finance.test.ts"
CABEV = "lib/cabinet/register.ts and procedures.ts (cabinet.decision: legal and fiscal reviews by different officials, quorum and vote under the Cabinet rules the nation adopts, a decision authenticated by a second official, corrections as versions, distribution and disclosure, the action register with requests to independent institutions; exec.correspondence restricted); directives with required responses (lib/data/directives.ts); tests lib/cabinet/cabinet.test.ts"
PROCEV = "lib/procurement/register.ts and procedures.ts (each institution's plans, tenders, bids sealed until two committee members open them, declarations of interest, evaluation with reasons and no deciding score, award by officials who did not evaluate, standstill, complaints to the independent review body, contracts, variations and payment certifications; OCDS release); tests lib/procurement/procurement.test.ts"
E8LINK = '; the library contract of forms batch 8 linked to the procedure by identity (docs/FORMS_CONFORMANCE.md §16)'
E8WAIT = "Field contract in the form library (forms batch 8; docs/FORMS_CONFORMANCE.md §16), waiting for its procedure; test lib/forms/catalogue-contracts.test.ts"

# ---------------------------------------------------------------- domains
# key: (sector, step, built, evidence, default form status)
D = {
    'form-lib': ('Form library (building blocks)', 'I1', True, KB.FIELDSPEC + "; documents lib/records/documents.ts; declarations and evidence as procedure package requirements", 'Partial'),
    'platform': ('Platform architecture', 'Throughout', True, KB.ENGINE + '; ' + KB.ROLES + '; ' + KB.INST + '; ' + KB.LAW + '; ' + KB.EXCH + '; ' + KB.AUDIT + '; ' + KB.BACKUP, 'Partial'),
    'democracy': ('Democratic institutions (general)', 'I8', True, LEGEV + '; ' + KB.INST + '; ' + KB.RELS, 'Not yet'),
    'presidency': ('Presidency and head of state', 'I5', True, CABEV + "; laws register; office register", 'Not yet'),
    'cabinet': ('Prime Minister\'s Office and Cabinet', 'I5', True, CABEV, 'Not yet'),
    'finance': ('Ministry of Finance', 'I5', False, KB.SCREENS, 'Not yet'),
    'treasury': ('Treasury and public debt', 'I5', True, FINEV + "; bills and receipts " + KB.PAY, 'Not yet'),
    'budget': ('Budget office', 'I5', True, FINEV, 'Not yet'),
    'tax': ('Revenue and tax', 'I5', True, TAXEV, 'Not yet'),
    'exec-internal': ('Executive and finance internal forms', 'I5', True, KB.ENGINE + "; " + KB.DECIS + "; " + KB.REFERRAL, 'Partial'),
    'customs': ('Customs', 'I5', True, CUSEV, 'Not yet'),
    'centralbank': ('Central bank', 'I5', False, "Plan §4: central bank operations lower priority; its public registers and independence in I5 (" + KB.INST + ")", 'Lower priority'),
    'trade': ('Trade and industry', 'I5', False, KB.SCREENS, 'Not yet'),
    'investment': ('Investment facilitation', 'I5', False, KB.SCREENS, 'Not yet'),
    'procurement': ('Public procurement', 'I5', True, PROCEV, 'Not yet'),
    'exchange': ('Cross-institution exchange', 'I9', True, KB.EXCH, 'Not yet'),
    'civil': ('Civil registration', 'I6', True, CIVEV, 'Not yet'),
    'identity': ('National identity', 'I6', False, "person.verify exchange (lib/exchange/services.ts) answers a match against the civil register; no identity credential register", 'Not yet'),
    'immigration': ('Immigration', 'I6', True, IMMEV, 'Not yet'),
    'passports': ('Passports and travel documents', 'I6', False, KB.ABSENT, 'Not yet'),
    'citizenship': ('Citizenship', 'I6', False, KB.ABSENT, 'Not yet'),
    'portal': ('Public portal and workspaces', 'I13', False, "Citizen wallet (/wallet; demo and training only until the identity provider is connected), institution case queues (lib/casework/view.ts)", 'Not yet'),
    'courts': ('Courts', 'I11', True, COURTS, 'Not yet'),
    'judicial-independence': ('Judicial independence', 'I11', True, COURTS + "; " + KB.ROLES + " (courts' cases closed to every other institution)", 'Not yet'),
    'prosecution': ('Prosecution', 'I11', False, LEGALREV, 'Legal review'),
    'police': ('Police', 'I11', True, POLICE, 'Legal review'),
    'custody': ('Custody, corrections and supervision', 'I11', False, LEGALREV, 'Legal review'),
    'legalaid': ('Legal aid', 'I11', False, KB.ABSENT, 'Not yet'),
    'justice-oversight': ('Justice oversight and complaints', 'I8', False, KB.ABSENT, 'Not yet'),
    'patients': ('Patient and clinical administration', '—', False, CLINRULE, 'Platform rule stricter'),
    'health-reg': ('Health regulation', 'I4', True, HEALTHEV + "; " + PROFEV, 'Not yet'),
    'public-health': ('Public health', 'I4', True, "Programme administration and aggregates only (" + PHEV + "); " + CLINRULE, 'Not yet'),
    'medicines': ('Medicines and devices regulation', 'I4', False, KB.ABSENT + "; pharmacies licensed in the health regulator's register (" + HEALTHEV + ")", 'Not yet'),
    'health-finance': ('Health financing', 'I6', False, KB.ABSENT, 'Not yet'),
    'social-care': ('Social care', 'I6', False, KB.SCREENS, 'Not yet'),
    'schools': ('Schools', 'I6', True, EDUEV, 'Not yet'),
    'students': ('Student records', '—', False, STUDRULE, 'Platform rule stricter'),
    'exams': ('Examinations', 'I6', False, KB.ABSENT + "; results enter as qualification records (" + EDUEV + ")", 'Not yet'),
    'credentials': ('Qualifications and credentials', 'I6', True, EDUEV, 'Not yet'),
    'higher-ed': ('Higher education', 'I6', True, ACCEV + "; " + EDUEV, 'Not yet'),
    'accreditation': ('Accreditation', 'I6', True, ACCEV, 'Not yet'),
    'vocational': ('Vocational education and skills', 'I6', False, KB.ABSENT, 'Not yet'),
    'student-finance': ('Scholarships and student finance', 'I6', False, KB.ABSENT, 'Not yet'),
    'research': ('Research administration', 'I6', False, KB.ABSENT, 'Not yet'),
    'agriculture': ('Agriculture', 'I6', False, KB.SCREENS, 'Not yet'),
    'land': ('Land and cadastre', 'I7', True, PARCEL, 'Not yet'),
    'community-land': ('Community land and resettlement', 'I7', False, PARCEL + " (holder kinds; no community-rights procedure)", 'Not yet'),
    'environment': ('Environment', 'I7', False, KB.SCREENS + "; " + PERMITMAP, 'Not yet'),
    'water': ('Water', 'I6', False, KB.SCREENS, 'Not yet'),
    'energy': ('Energy', 'I7', False, KB.SCREENS, 'Not yet'),
    'mining': ('Mining', 'I7', False, KB.SCREENS, 'Not yet'),
    'forestry': ('Forestry', 'I7', False, KB.ABSENT, 'Not yet'),
    'fisheries': ('Fisheries', 'I6', False, KB.ABSENT, 'Not yet'),
    'biodiversity': ('Biodiversity and protected areas', 'I7', False, KB.ABSENT + "; restricted sites generalised by viewFacility() (" + FACIL + ")", 'Not yet'),
    'spatial': ('Spatial evidence and field inspections', 'I7', True, PARCEL + "; " + BOUND + "; " + FACIL, 'Not yet'),
    'natres': ('Natural resources (general)', 'I7', False, KB.SCREENS, 'Not yet'),
    'transport': ('Transport', 'I7', False, KB.SCREENS + "; " + PERMITMAP, 'Not yet'),
    'maritime': ('Maritime', 'I7', False, KB.ABSENT, 'Not yet'),
    'aviation': ('Aviation', 'I7', False, KB.ABSENT, 'Not yet'),
    'infrastructure': ('Infrastructure and urban development', 'I7', False, KB.SCREENS + "; " + PERMITMAP, 'Not yet'),
    'emergency': ('Emergency calls, dispatch, fire and rescue', 'I7', False, INCID, 'Not yet'),
    'civil-protection': ('Civil protection and disaster management', 'I7', False, TRANSEV + "; " + INCID, 'Not yet'),
    'recovery': ('Disaster recovery and relief', 'I7', False, KB.ABSENT, 'Not yet'),
    'fire': ('Fire safety', 'I7', False, KB.ABSENT, 'Not yet'),
    'defence': ('Defence administration', 'I11', False, "Plan §4: defence beyond civilian administration lower priority; anything operational out of scope", 'Lower priority'),
    'intelligence': ('Intelligence governance', 'I12', False, "Plan §4 (national security lower priority); " + CLASSRULE, 'Lower priority'),
    'classified': ('Classified information', 'I12', False, CLASSRULE, 'Not yet'),
    'cyber': ('Cybersecurity incident management', 'I12', False, "CivicOS's own: security advisories (lib/data/advisories.ts), key compromise procedure, access watch (lib/records/access-watch.ts); no national cyber incident register", 'Not yet'),
    'critical-infra': ('Critical infrastructure resilience', 'I12', False, KB.ABSENT, 'Not yet'),
    'natsec-directives': ('National security directives', 'I12', False, KB.DIRECT, 'Not yet'),
    'legislature': ('Legislature', 'I8', True, LEGEV, 'Not yet'),
    'elections': ('Elections', 'I11', False, "Plan §4: electoral results lower priority; legal review first", 'Lower priority'),
    'parties': ('Political parties and campaign finance', 'I11', False, "Plan §4 (electoral); a party register could be an organisations register type (lib/organisations/register.ts)", 'Lower priority'),
    'const-offices': ('Constitutional offices and independent institutions', 'I8', True, KB.OFFICES + "; " + KB.INST + "; " + TRANSEV, 'Not yet'),
    'participation': ('Public participation and information access', 'I8', False, KB.ABSENT, 'Not yet'),
    'digital-services': ('Citizen and business digital services', 'I13', False, "Citizen wallet (/wallet: apply for a permit, pay, sign, check a document; demo and training only), /verify, delegations (" + DELEG + ")", 'Not yet'),
    'gov-workflow': ('Whole-of-government workflow', 'I9', True, KB.REFERRAL + "; " + KB.RELS + "; " + KB.DIRECT, 'Not yet'),
    'records': ('Records, documents and digital trust', 'I13', True, KB.DOCS + "; " + KB.CERT + "; " + RET + "; " + SEAL, 'Not yet'),
    'statistics': ('Official statistics', 'I8', False, PROV, 'Not yet'),
    'service-gov': ('Service governance and performance', 'I13', False, UPD + "; " + KB.REGOWN, 'Not yet'),
    'interop': ('Interoperability', 'I9', True, KB.EXCH, 'Not yet'),
    # supplement, parts 14-22
    'labour': ('Labour and employment', 'I6', False, KB.SCREENS, 'Not yet'),
    'social-protection': ('Social protection and social services', 'I6', False, KB.SCREENS, 'Not yet'),
    'foreign': ('Foreign affairs, consular and diaspora', 'I6', False, KB.SCREENS, 'Not yet'),
    'culture': ('Tourism, culture, youth and sports', 'I6', False, KB.SCREENS, 'Not yet'),
    'professions-other': ('Professional licensing outside health', 'I6', True, PROFEV + ' (a profession is configured by its regulator; the reference procedures are written for health professions)', 'Not yet'),
    'local-gov': ('Local and regional government', 'I7', False, "Subnational institutions (standing 'subnational', Boundaries.subnational; " + KB.INST + "); municipal onboarding (lib/data/store/permits.ts onboardMunicipality())", 'Not yet'),
    'housing': ('Housing, planning and building control', 'I7', False, KB.SCREENS + '; ' + PERMITMAP + ' (building-permit)', 'Not yet'),
    'internal-admin': ('Shared internal administration', 'I2', True, KB.ADMIN + '; ' + KB.DEPTS + '; ' + KB.WORKSPACE, 'Not yet'),
    'form-gov': ('Form design and governance', 'I1', True, "Procedure packages drafted by one official, tested, approved by another (lib/casework/packages.ts; test lib/casework/packages.test.ts); change control and releases (" + UPD + ")", 'Not yet'),
}

# Plan I7: the territory and infrastructure records exist (procedures, registers, decisions classified).
D['land'] = ('Land and cadastre', 'I7', True, PARCEL + '; ' + LANDEV, 'Not yet')
D['housing'] = ('Housing, planning and building control', 'I7', True, BLDEV + '; ' + HOUEV, 'Not yet')
D['local-gov'] = ('Local and regional government', 'I7', True, LGEV, 'Not yet')
D['transport'] = ('Transport', 'I7', True, TRNEV, 'Not yet')

# (tag, part) -> [(section regex on the top section or 'sub', domain)] first match; tag = file tag
def _m(*pairs):
    return [(re.compile(a), b) for a, b in pairs]

SECTION_DOMAIN = {
    ('FLD-01-02', 0): _m(('.', 'form-lib')),
    ('SUP', 0): _m(('.', 'form-gov')), ('SUP', 14): _m(('.', 'labour')), ('SUP', 15): _m(('.', 'social-protection')), ('SUP', 16): _m(('.', 'foreign')),
    ('SUP', 17): _m(('.', 'culture')), ('SUP', 18): _m(('.', 'professions-other')), ('SUP', 19): _m(('.', 'local-gov')), ('SUP', 20): _m(('.', 'housing')),
    ('SUP', 21): _m(('.', 'internal-admin')), ('SUP', 22): _m(('.', 'form-gov')),
    ('SUP', 5): _m(('.', 'courts')), ('SUP', 6): _m(('.', 'health-reg')), ('SUP', 7): _m(('.', 'schools')), ('SUP', 8): _m(('.', 'natres')),
    ('SUP', 9): _m(('.', 'transport')), ('SUP', 10): _m(('.', 'civil-protection')), ('SUP', 11): _m(('.', 'classified')), ('SUP', 12): _m(('.', 'democracy')),
    ('SUP', 13): _m(('^[123]$', 'form-gov'), ('.', 'platform')),
    ('FLD-01-02', 1): _m(('^1\\.7$', 'platform'), ('.', 'form-lib')),
    ('FLD-01-02', 2): _m(('^2\\.1$', 'presidency'), ('^2\\.2$', 'cabinet'), ('^2\\.3$', 'finance'), ('^2\\.4$', 'treasury'), ('^2\\.5$', 'budget'),
                         ('^2\\.6$', 'tax'), ('^2\\.7$', 'exec-internal'), ('.', 'finance')),
    ('FLD-03-04', 3): _m(('^3\\.1$', 'customs'), ('^3\\.2$', 'centralbank'), ('^3\\.3$', 'trade'), ('^3\\.4$', 'investment'), ('^3\\.5$', 'procurement'),
                         ('^3\\.6$', 'exchange'), ('.', 'customs')),
    ('FLD-03-04', 4): _m(('^1$', 'civil'), ('^2$', 'civil'), ('^3$', 'identity'), ('^4$', 'immigration'), ('^5$', 'passports'), ('^6$', 'citizenship'),
                         ('^7$', 'portal'), ('^8$', 'form-lib'), ('.', 'civil')),
    ('FLD-05-07', 5): _m(('^2$', 'courts'), ('^3$', 'judicial-independence'), ('^4$', 'prosecution'), ('^5$', 'police'), ('^6$', 'custody'), ('^7$', 'custody'),
                         ('^8$', 'legalaid'), ('^9$', 'justice-oversight'), ('^10$', 'exchange'), ('^11$', 'platform'), ('.', 'courts')),
    ('FLD-05-07', 6): _m(('^2$', 'patients'), ('^3$', 'patients'), ('^4$', 'public-health'), ('^5$', 'medicines'), ('^6$', 'health-reg'), ('^7$', 'health-finance'),
                         ('^8$', 'social-care'), ('.', 'health-reg')),
    ('FLD-05-07', 7): _m(('^2$', 'schools'), ('^3$', 'exams'), ('^4$', 'credentials'), ('^5$', 'higher-ed'), ('^6$', 'accreditation'), ('^7$', 'vocational'),
                         ('^8$', 'student-finance'), ('^9$', 'research'), ('.', 'schools')),
    ('CAT-08-11', 8): _m(('^2$', 'agriculture'), ('^3$', 'land'), ('^4$', 'community-land'), ('^5$', 'environment'), ('^6$', 'water'), ('^7$', 'energy'),
                         ('^8$', 'mining'), ('^10$', 'spatial'), ('^11$', 'exchange'), ('.', 'natres')),
    ('CAT-08-11', 9): _m(('^1$', 'transport'), ('^10$', 'portal'), ('.', 'transport')),
    ('CAT-08-11', 10): _m(('^5$', 'police'), ('^4$', 'emergency'), ('^6$', 'civil-protection'), ('^7$', 'civil-protection'), ('^8$', 'recovery'), ('^9$', 'recovery'),
                          ('.', 'civil-protection')),
    ('CAT-08-11', 11): _m(('^3$', 'classified'), ('^4$', 'classified'), ('^5$', 'cyber'), ('^6$', 'critical-infra'), ('^7$', 'defence'), ('^8$', 'natsec-directives'),
                          ('^10$', 'platform'), ('.', 'classified')),
    ('CAT-12-13', 12): _m(('^4$', 'legislature'), ('^5$', 'elections'), ('^6$', 'parties'), ('^7$', 'const-offices'), ('^8$', 'participation'), ('.', 'democracy')),
    ('CAT-12-13', 13): _m(('^3$', 'digital-services'), ('^4$', 'gov-workflow'), ('^5$', 'digital-services'), ('^6$', 'records'), ('^7$', 'records'),
                          ('^8$', 'statistics'), ('^9$', 'service-gov'), ('^10$', 'interop'), ('.', 'platform')),
}

# sub-sections that refine (tag, part, sub) -> domain
SUB_DOMAIN = {
    ('CAT-08-11', 8, '9.1'): 'forestry', ('CAT-08-11', 8, '9.2'): 'fisheries', ('CAT-08-11', 8, '9.3'): 'biodiversity',
    ('CAT-08-11', 9, '2.4'): 'maritime', ('CAT-08-11', 9, '2.5'): 'aviation', ('CAT-08-11', 9, '2.6'): 'infrastructure',
    ('CAT-08-11', 10, '2.1'): 'police', ('CAT-08-11', 10, '2.2'): 'emergency', ('CAT-08-11', 10, '2.3'): 'civil-protection',
    ('CAT-08-11', 10, '2.4'): 'recovery', ('CAT-08-11', 10, '2.5'): 'fire', ('CAT-08-11', 10, '4.1'): 'emergency', ('CAT-08-11', 10, '4.2'): 'emergency',
    ('CAT-08-11', 11, '2.1'): 'defence', ('CAT-08-11', 11, '2.2'): 'intelligence', ('CAT-08-11', 11, '2.3'): 'cyber', ('CAT-08-11', 11, '2.4'): 'critical-infra',
    ('CAT-12-13', 12, '2.1'): 'legislature', ('CAT-12-13', 12, '2.2'): 'elections', ('CAT-12-13', 12, '2.3'): 'parties',
    ('CAT-12-13', 12, '2.4'): 'const-offices', ('CAT-12-13', 12, '2.5'): 'participation',
    ('CAT-12-13', 13, '2.1'): 'digital-services', ('CAT-12-13', 13, '2.2'): 'gov-workflow', ('CAT-12-13', 13, '2.3'): 'records',
    ('CAT-12-13', 13, '2.4'): 'statistics', ('CAT-12-13', 13, '2.5'): 'service-gov',
    ('FLD-05-07', 6, '4.3'): 'public-health',
}

# catalogue ID prefix -> domain (overrides the section for ID rows: registers, configuration, exchanges, forms)
PREFIX_DOMAIN = [
    (r'^LAB-EMP', 'labour'), (r'^SOC-BEN', 'social-protection'), (r'^FOR-(CON|DIP)', 'foreign'), (r'^TCS-', 'culture'), (r'^LIC-PRO', 'professions-other'),
    (r'^LRG-', 'local-gov'), (r'^HPC-', 'housing'), (r'^ADM-', 'internal-admin'), (r'^FGS-', 'form-gov'),
    (r'^JUS-(CASE|FIL|EVD|DEC|APP)', 'courts'), (r'^JUS-LEG', 'legalaid'), (r'^HLT-(ENC|REF|CARE)', 'patients'), (r'^HLT-PUB', 'public-health'), (r'^HLT-INS', 'health-reg'),
    (r'^EDU-(STD|ENR|ATT|ADM)', 'students'), (r'^EDU-CER', 'credentials'), (r'^EDU-FAC', 'schools'), (r'^AGR-(LIC|SUB)', 'agriculture'), (r'^ENV-INS', 'environment'),
    (r'^WAT-USE', 'water'), (r'^ENE-', 'energy'), (r'^NAT-EXT', 'mining'), (r'^TRN-(LIC|INC)', 'transport'), (r'^SAF-(INC|CASE)', 'police'), (r'^SAF-(OPS|RES)', 'emergency'),
    (r'^SAF-(DIS|INV)', 'civil-protection'), (r'^SAF-FIR', 'fire'), (r'^SAF-REC', 'recovery'), (r'^DEF-', 'defence'), (r'^SEC-INC', 'classified'), (r'^SEC-OVS', 'intelligence'),
    (r'^CIP-', 'critical-infra'), (r'^LEG-', 'legislature'), (r'^ELE-', 'elections'), (r'^POL-REG', 'parties'), (r'^IND-APP', 'const-offices'), (r'^ACC-CMP', 'participation'),
    (r'^DGV-(SVC|REP)', 'digital-services'), (r'^DGV-IDN', 'identity'), (r'^DGV-(DOC|REC)', 'records'), (r'^DGV-STA', 'statistics'), (r'^DGV-INT', 'interop'),
    (r'^AGR-', 'agriculture'), (r'^LND-REG', 'land'), (r'^LND-COM', 'community-land'), (r'^ENV-', 'environment'), (r'^WAT-', 'water'),
    (r'^NRG-', 'energy'), (r'^MIN-', 'mining'), (r'^FOR-', 'forestry'), (r'^FIS-', 'fisheries'), (r'^BIO-', 'biodiversity'), (r'^NRE-INS', 'spatial'),
    (r'^TRN-MAR', 'maritime'), (r'^TRN-AVI', 'aviation'), (r'^TRN-INF', 'infrastructure'), (r'^TRN-', 'transport'),
    (r'^SAFE-POL', 'police'), (r'^SAFE-EMS', 'emergency'), (r'^SAFE-DIS', 'civil-protection'), (r'^SAFE-REC', 'recovery'), (r'^SAFE-FIR', 'fire'),
    (r'^SEC-DEF', 'defence'), (r'^SEC-INT', 'intelligence'), (r'^SEC-CYB', 'cyber'), (r'^SEC-INF', 'critical-infra'),
    (r'^DEM-LEG', 'legislature'), (r'^DEM-ELC', 'elections'), (r'^DEM-POL', 'parties'), (r'^DEM-CON', 'const-offices'), (r'^DEM-PUB', 'participation'),
    (r'^GOV-SVC', 'digital-services'), (r'^GOV-WF', 'gov-workflow'), (r'^GOV-REC', 'records'), (r'^GOV-STA', 'statistics'), (r'^GOV-GOV', 'service-gov'),
    (r'^INT-GOV', 'interop'),
    (r'^REG-TRN', 'transport'), (r'^REG-INF', 'infrastructure'), (r'^REG-SAFE-00[23]$', 'police'), (r'^REG-SAFE-01[3]$', 'justice-oversight'),
    (r'^REG-SAFE-00[45]$', 'emergency'), (r'^REG-SAFE-01[02]$', 'recovery'), (r'^REG-SAFE', 'civil-protection'),
    (r'^REG-SEC-00[12]$', 'defence'), (r'^REG-SEC-00[345]$', 'intelligence'), (r'^REG-SEC-006$', 'classified'), (r'^REG-SEC-00[789]$|^REG-SEC-010$', 'cyber'),
    (r'^REG-SEC-01[123]$', 'critical-infra'), (r'^REG-SEC-01[45]$', 'const-offices'), (r'^REG-SEC-016$', 'natsec-directives'),
    (r'^REG-DEM-00[123]$', 'legislature'), (r'^REG-DEM-00[45678]$', 'elections'), (r'^REG-DEM-01[0]$|^REG-DEM-009$', 'parties'),
    (r'^REG-DEM-01[125]$', 'const-offices'), (r'^REG-DEM-01[346]$', 'participation'),
    (r'^CFG-AGR', 'agriculture'), (r'^CFG-LND-00[45]', 'community-land'), (r'^CFG-LND', 'land'), (r'^CFG-ENV', 'environment'), (r'^CFG-WAT', 'water'),
    (r'^CFG-NRG', 'energy'), (r'^CFG-MIN', 'mining'), (r'^CFG-FOR', 'forestry'), (r'^CFG-FIS', 'fisheries'), (r'^CFG-BIO', 'biodiversity'),
    (r'^CFG-INS', 'spatial'), (r'^CFG-NRE', 'exchange'), (r'^CFG-TRN-006', 'maritime'), (r'^CFG-TRN-007', 'aviation'), (r'^CFG-TRN', 'transport'),
    (r'^CFG-INF', 'infrastructure'), (r'^CFG-SAFE-00[4567]$', 'police'), (r'^CFG-SAFE', 'civil-protection'),
    (r'^CFG-SEC-00[18]$', 'defence'), (r'^CFG-SEC-00[2456]$', 'intelligence'), (r'^CFG-SEC-00[3]$|^CFG-SEC-01[34]$', 'classified'),
    (r'^CFG-SEC-009$|^CFG-SEC-010$|^CFG-SEC-018$', 'cyber'), (r'^CFG-SEC-01[12]$', 'critical-infra'), (r'^CFG-SEC', 'platform'),
    (r'^CFG-DEM-00[123]$', 'legislature'), (r'^CFG-DEM-00[45678]$', 'elections'), (r'^CFG-DEM-009$|^CFG-DEM-010$', 'parties'),
    (r'^CFG-DEM-01[12]$', 'const-offices'), (r'^CFG-DEM-01[34]$', 'participation'), (r'^CFG-DEM', 'platform'), (r'^CFG-GOV', 'platform'),
    (r'^CFG-CIV', 'civil'), (r'^CFG-IDN', 'identity'), (r'^CFG-IMM', 'immigration'), (r'^CFG-PAS', 'passports'), (r'^CFG-NAT', 'citizenship'),
    (r'^CFG-INT|^CFG-EX|^CFG-HX|^CFG-JEX', 'exchange'),
    (r'^CIV-', 'civil'), (r'^IDN-', 'identity'), (r'^IMM-', 'immigration'), (r'^PAS-', 'passports'), (r'^NAT-', 'citizenship'),
    (r'^JUS-CRT', 'courts'), (r'^JUS-IND', 'judicial-independence'), (r'^JUS-PRO', 'prosecution'), (r'^JUS-INV', 'police'), (r'^JUS-CUS|^JUS-COR|^JUS-SUP', 'custody'),
    (r'^JUS-LGL', 'legalaid'), (r'^JUS-OVS', 'justice-oversight'), (r'^CFG-JUS', 'courts'), (r'^CFG-PRO', 'prosecution'), (r'^CFG-CUS|^CFG-SUP', 'custody'),
    (r'^CFG-LGL', 'legalaid'), (r'^CFG-OVS', 'justice-oversight'),
    (r'^HLT-PAT|^HLT-ADM|^HLT-CLI', 'patients'), (r'^HLT-PH', 'public-health'), (r'^HLT-MED', 'medicines'), (r'^HLT-LIC|^HLT-FAC', 'health-reg'),
    (r'^HLT-FIN', 'health-finance'), (r'^HLT-SOC', 'social-care'), (r'^CFG-HLT', 'health-reg'), (r'^CFG-PH', 'public-health'), (r'^CFG-MED', 'medicines'),
    (r'^CFG-LIC', 'health-reg'), (r'^CFG-FIN', 'health-finance'), (r'^CFG-SOC', 'social-care'),
    (r'^EDU-SCH', 'schools'), (r'^EDU-STU', 'students'), (r'^EDU-EXM', 'exams'), (r'^EDU-CRE', 'credentials'), (r'^EDU-UNI', 'higher-ed'),
    (r'^EDU-ACC', 'accreditation'), (r'^EDU-VOC', 'vocational'), (r'^EDU-FIN', 'student-finance'), (r'^EDU-RES', 'research'),
    (r'^CFG-EDU', 'schools'), (r'^CFG-EXM', 'exams'), (r'^CFG-CRE', 'credentials'), (r'^CFG-UNI', 'higher-ed'), (r'^CFG-ACC', 'accreditation'),
    (r'^CFG-VOC', 'vocational'), (r'^CFG-RES', 'research'), (r'^CFG-AI', 'platform'), (r'^CFG-DAT|^CFG-SEC', 'platform'),
    (r'^EX-NRE', 'exchange'), (r'^EX-EDU|^HX-|^JX-', 'exchange'),
    (r'^exec\.presidency', 'presidency'), (r'^exec\.(cabinet|pmo)', 'cabinet'), (r'^exec\.internal', 'exec-internal'), (r'^finance\.', 'finance'),
    (r'^treasury\.', 'treasury'), (r'^budget\.', 'budget'), (r'^(tax|taxpayer)\.', 'tax'), (r'^customs\.', 'customs'), (r'^centralbank\.', 'centralbank'),
    (r'^(industry|trade)\.', 'trade'), (r'^investment\.', 'investment'), (r'^procurement\.', 'procurement'), (r'^exchange\.', 'exchange'),
    (r'^core\.|^civicos\.|^iso\.', 'form-lib'), (r'^country\.', None),
]
PREFIX_DOMAIN = [(re.compile(a), b) for a, b in PREFIX_DOMAIN]

COUNTRY_PREFIX = [(r'^country\.(exec)', 'presidency'), (r'^country\.finance', 'finance'), (r'^country\.treasury', 'treasury'), (r'^country\.budget', 'budget'),
                  (r'^country\.tax', 'tax'), (r'^country\.customs', 'customs'), (r'^country\.centralbank', 'centralbank'), (r'^country\.(industry|trade)', 'trade'),
                  (r'^country\.investment', 'investment'), (r'^country\.procurement', 'procurement'), (r'^country\.interinstitutional', 'exchange')]
COUNTRY_PREFIX = [(re.compile(a), b) for a, b in COUNTRY_PREFIX]


# supplement IDs that recur from the 13 parts with another meaning (see the register's collision table)
SUP_DOMAIN = {'EDU-RES-005': 'students', 'HLT-MED-004': 'patients'}


def domain_of(row):
    cid = row.get('catalogue_id') or ''
    if row['tag'] == 'SUP' and SUP_DOMAIN.get(cid or row.get('contract_id') or ''):
        return SUP_DOMAIN[cid or row.get('contract_id')]
    if cid:
        for rx, d in PREFIX_DOMAIN:
            if rx.search(cid):
                if d is None:
                    for rx2, d2 in COUNTRY_PREFIX:
                        if rx2.search(cid):
                            return d2
                    return 'platform'
                return d
    if row['tag'] == 'FLD-05-07' and row['part'] == 6 and row['top'] == '4' and re.search(r'aggregate', row['text'], re.I):
        return 'public-health'
    d = SUB_DOMAIN.get((row['tag'], row['part'], row['section']))
    if d:
        return d
    for rx, d in SECTION_DOMAIN.get((row['tag'], row['part']), []):
        if rx.search(row['top']):
            return d
    return 'platform'


# ---------------------------------------------------------------- per-ID verdicts (status, evidence, missing, step or None for the domain's)
ID = []


def I(rx, status, ev, miss='', step=None, also='', lr=False, tag=None):
    """tag None: the rows of the 13 parts; tag 'SUP': the supplement's rows (some IDs recur there with another meaning)."""
    ID.append((re.compile(rx), status, ev, miss, step, also, lr, tag))


# Land (catalogue Part 8 §3)
# Plan I7: the forms the land and transport procedures carry (batch 10), before the earlier land rules.
I(r'^LND-REG-0(05|07|08|09|10|11|12|16|17|20|21|22)$', 'Partial', LANDEV + B10, B10MISS + '; the nation\'s tenure types and instrument kinds (CFG-LND-001, CFG-LND-003)', 'I7')
I(r'^TRN-(VEH-00[12]|DRV-001)$', 'Partial', TRNEV + B10, B10MISS + '; the nation\'s vehicle and licence categories (CFG-TRN-002, CFG-TRN-003)', 'I7')
I(r'^TRN-ROAD-002$', 'Partial', TRNEV + B10, B10MISS + '; the road register and closure powers (CFG-TRN-005)', 'I7')
I(r'^TRN-OPS-001$', 'Partial', TRNEV + '; ' + ORGLIC + B10, B10MISS + '; the nation\'s operator classes (CFG-TRN-004)', 'I7')
I(r'^REG-TRN-00[123]$', 'Partial', TRNEV, 'Restrictions, inspections and compliance events as records; the register owner and legal authority recorded by the nation', 'I7')
I(r'^LND-REG-001$', 'Partial', PARCEL, 'No application by a person: a parcel is recorded by the cadastre authority\'s official, not opened as an applicant\'s case with evidence and a decision record')
I(r'^LND-REG-003$', 'Partial', PARCEL + ' (survey method, accuracy, survey date, surveyor and plan reference on each parcel version)', 'A survey submission as its own record with coordinates, precision evidence and the submitting surveyor\'s licence')
I(r'^LND-REG-006$', 'Partial', PARCEL + '; land-title mapping proposed (' + PERMITMAP + ')', 'Title registration procedure (application, objection period, decision citing the law, certificate)')
I(r'^LND-REG-01[56]$', 'Partial', PARCEL + ' (amend → confirm-amend by a different official; every version kept)', 'A correction case with grounds, evidence and a decision citing the law; geometry and rights corrected as separate legal events')
I(r'^LND-REG-018$', 'Partial', PARCEL + ' (public view through publicParcel(); rights only under canSeeParcelRights())', 'A search request with entitlement and disclosure assessment, logged')
# Licences that fit the organisations register's standing pattern
I(r'^(NRG-LIC-00[1-9]|MIN-LIC-00[124-9]|FOR-LIC-00[124]|FIS-LIC-00[13]|FIS-LIC-012|TRN-OPS-00[1-58]|TRN-MAR-004|TRN-AVI-00[16]|EDU-VOC-001|TRN-INF-006)$', 'Partial', ORGLIC,
  'The sector\'s licence register type, its approved authority mapping and the sector fields (scope, conditions, reporting obligations) are not configured; no sector procedure package')
I(r'^(ENV-PER-001|ENV-PER-010)$', 'Partial', PERMITMAP, 'Environmental permit procedure (screening, assessment, consultation, conditions) and its register')
I(r'^TRN-VEH-001$', 'Partial', PERMITMAP + ' (vehicle-registration)', 'Vehicle register and its procedure')
I(r'^TRN-INF-002$', 'Partial', PERMITMAP + ' (building-permit)', 'Building permit procedure, conditions, inspections and register')
# Police (catalogue Part 10 §2.1)
I(r'^SAFE-POL-001$', 'Met', POLICE, '', '—')
I(r'^SAFE-POL-01[02]$', 'Met', POLICE + '; ' + KB.REFERRAL, '', '—')
I(r'^SAFE-POL-00[2569]$|^SAFE-POL-011$', 'Partial', POLICE, 'Beyond intake (formal case, investigation, assigned unit, missing-person response, proposed closure for review) only after legal review', 'I11')
I(r'^SAFE-POL-00[347]$', 'Legal review', POLRULE + '; ' + LEGALREV, 'Statements and identification records belong to an investigation: kept out until a legal review sets their safeguards', 'I11', lr=True)
I(r'^SAFE-POL-01[456789]$', 'Legal review', POLRULE + '; ' + LEGALREV, 'Use of force, seizure, warrants, arrest and detention, custody release and evidence to prosecution: none is recorded; each needs its own legal basis, safeguards and independent review before any draft', 'I11', lr=True)
I(r'^SAFE-POL-013$', 'Not yet', KB.ABSENT, 'Complaints against officers with separation from the subject (plan I11 police extensions)', 'I11', 'I8')
I(r'^SAFE-POL-020$', 'Not yet', KB.ACCESS, 'A disclosure decision record with purpose and authority', 'I11')
I(r'^JUS-INV-00[1239]$', 'Partial', POLICE + '; ' + KB.REFERRAL, 'Investigation referral and evidence transfer between police, prosecution and courts', 'I11')
I(r'^JUS-INV-00[45678]$|^JUS-INV-010$', 'Legal review', POLRULE + '; ' + LEGALREV, 'Warrants, searches, seizures and restricted court records: legal review first', 'I11', lr=True)
I(r'^REG-SAFE-002$', 'Partial', POLICE, 'Only incidents (intake and referral) are held; parties, evidence and investigation events need legal review', 'I11', lr=True)
I(r'^REG-SAFE-003$', 'Legal review', POLRULE + '; ' + LEGALREV, 'No evidence or custody register', 'I11', lr=True)
I(r'^CFG-SAFE-00[456]$', 'Legal review', POLRULE + '; ' + LEGALREV, 'Configuration for powers CivicOS does not hold', 'I11', lr=True)
I(r'^REG-SAFE-001$', 'Partial', INCID + '; ' + POLICE, 'One public incident register across services with disposition')
# Emergencies
I(r'^SAFE-DIS-00[67]$|^SAFE-DIS-018$', 'Partial', TRANSEV, 'Declaration scope, measures tied to an emergency powers register, publication, extension as a new authorised event')
I(r'^REG-SAFE-008$', 'Partial', TRANSEV, 'Geographic scope and review events per measure')
I(r'^SAFE-EMS-009$', 'Not yet', 'Referral pattern exists (' + KB.REFERRAL + '); ' + CLINRULE, 'Emergency medical referral without any clinical field')
# Defence / intelligence
I(r'^SEC-INT-00[34]$', 'Legal review', CLASSRULE + '; ' + NOTHOLD + '; owner\'s direction 2026-10-21 §1 (intelligence products and oversight records: legal review)', 'Intelligence assessments and products: never their content in CivicOS; approved metadata or a reference only, after legal review', 'I12', lr=True)
I(r'^SEC-INT-01[26]$', 'Legal review', CLASSRULE + "; owner's direction 2026-10-21 §1 (intelligence oversight records: legal review)", 'Oversight inspection and access-audit records of intelligence bodies: metadata only, after legal review', 'I12', lr=True)
I(r'^DEM-ELC-00[3-6]$', 'Legal review', "Plan §4 and the owner's direction 2026-10-21 §1 (voter registration: legal review first; held under the electoral body alone)", 'Voter registration, correction, transfer and review hold personal data under the electoral body alone; legal review before any build', 'I11', lr=True)
I(r'^SEC-INT-013$', 'Lower priority', "Plan §4", 'Protected disclosure handled by an independent body (plan I8 whistleblower reports with protected identity)', 'I12', 'I8')
I(r'^SEC-CYB-007$', 'Not yet', KB.ABSENT, 'Data breach notification to the data protection authority (plan I8)', 'I8', 'I12')
# Legislature (catalogue Part 12 §2.1)
I(r'^DEM-LEG-00[1348]$|^DEM-LEG-01[2457]$|^DEM-LEG-020$', 'Met', LEGEV, '', '—')
I(r'^DEM-LEG-002$', 'Partial', LEGEV + ' (text versions)', 'Supporting documents attached to a bill version')
I(r'^DEM-LEG-008$', 'Not yet', LEGEV, 'Motions as records with decision tracking', 'I8')
I(r'^DEM-LEG-011$', 'Partial', LEGEV + ' (stages with notes)', 'Agenda, transcript and proceedings record', 'I8')
I(r'^DEM-LEG-017$', 'Partial', LEGEV + ' (recordReport: committee, recommendation, summary)', 'Adoption history of the report', 'I8')
I(r'^REG-DEM-001$', 'Partial', LEGEV + '; laws register (' + KB.LAW + ')', 'Links to later amendment, repeal and judicial review')
I(r'^REG-DEM-002$', 'Partial', LEGEV, 'Sessions, motions, debates as records', 'I8')
I(r'^CFG-DEM-00[123]$', 'Country decision', LEGEV + ' (stages, vote rules, assent and publication from the procedure two of its officials approve; reference ships unapproved)', '', '—')
# Constitutional offices
I(r'^DEM-CON-00[67]$|^DEM-CON-009$', 'Partial', KB.OFFICES, 'Nomination, eligibility, hearing and recommendation kept apart from the decision; appointment instrument', 'I8')
I(r'^DEM-CON-003$', 'Partial', TRANSEV + ' (a declared interest recuses at once, CaseFacts.recused)', 'Declaration as a record with review', 'I8')
I(r'^DEM-CON-010$', 'Partial', TRANSEV + ' (impeachment stages run in order by the institution named for each)', 'Removal and suspension proceedings per office', 'I8')
# Independent oversight (plan I8): the accountability forms of batch 7, linked to their procedures, and the findings register.
I(r'^DEM-CON-01[2348]$|^DEM-CON-019$|^DEM-PUB-009$', 'Partial', OVSEV + '; library contract of batch 7 (app/src/lib/forms/library/catalogue-contracts/)', 'Adoption by the nation: the body named for its slot, its procedure approved by a second official, its decision mapping approved', 'I8')
I(r'^DEM-CON-020$', 'Partial', KB.OVS + ' (respondToFinding(): beside the finding, never changing it); library contract of batch 7', 'Adoption by the nation: whether its law obliges a response, and how it is published', 'I8')
I(r'^REG-DEM-015$', 'Met', KB.OVS + ' (findings, the institution concerned, responses and follow-up; lib/oversight/register.ts)', '', '—')
I(r'^REG-DEM-012$', 'Met', KB.INST + '; relationships ' + KB.RELS, '', '—')
I(r'^REG-DEM-011$', 'Partial', KB.OFFICES, 'Nominations and recommendations', 'I8')
I(r'^CFG-DEM-012$', 'Country decision', KB.INST + ' (terms through lib/law/policy-change.ts)', '', '—')
# Digital government (Part 13)
I(r'^GOV-SVC-017$|^GOV-REC-005$', 'Met', KB.CERT, '', '—')
I(r'^GOV-SVC-016$', 'Partial', KB.CERT, 'A certificate request case with entitlement check and reasoned refusal')
I(r'^GOV-SVC-014$', 'Partial', DELEG, 'Granted by the represented person or business themselves; scope per service')
I(r'^GOV-SVC-00[46]$', 'Partial', 'Citizen wallet applies for a permit routed by type to the institution keeping that register (lib/data/store/permits.ts permitHolders()); demo and training only', 'Routing for every service through the service catalogue; production citizen accounts through the identity provider')
I(r'^GOV-SVC-010$', 'Partial', KB.DOCS + ' (documents added to a case)', 'Applicant-side submission of further information')
I(r'^GOV-WF-001$', 'Met', KB.REFERRAL, '', '—')
I(r'^GOV-WF-00[235]$', 'Partial', KB.REFERRAL + '; ' + KB.RELS + ' (request_information relationships, readRelationship())', 'Scoped request, consultation and handover records with acceptance')
I(r'^GOV-WF-00[78]$', 'Partial', KB.DIRECT, 'Required responses and outstanding actions (plan I5)', 'I5')
I(r'^GOV-WF-01[12]$', 'Partial', KB.RELS, 'Agreement signatories and validity as agreement records')
I(r'^GOV-WF-014$|^GOV-GOV-00[78]$', 'Met', INTAPP + '; ' + KB.EXCH, '', '—')
I(r'^GOV-REC-00[34]$', 'Partial', SEAL, 'A signature request workflow; a qualified signature provider (integration register)')
I(r'^GOV-REC-00[67]$', 'Partial', KB.DOCS, 'Classification and access policy per record class; reissue linked to the corrected version')
I(r'^GOV-REC-008$|^GOV-REC-011$', 'Partial', RET, 'Retention schedules per record class with archival and disposal certificates')
I(r'^GOV-REC-012$', 'Partial', RET + ' (legal holds on documents and cases are respected)', 'A legal hold request with scope, who authorised it and its release')
I(r'^GOV-REC-01[67]$', 'Partial', KB.TWIN + '; case-import and parcel loads audited with the file\'s SHA-256 (lib/data/case-import.ts)', 'Custody history per record; migration approval by two officials')
I(r'^GOV-STA-00[12]$', 'Partial', KB.TWIN + ' (sources registered, runs observed by a named official, rows refused with reasons)', 'A statistical programme with scope and owner; quality findings', 'I8', 'I3')
I(r'^GOV-STA-013$', 'Partial', 'Aggregate returns: health capacity (lib/health/register.ts), education (lib/education/register.ts)', 'A consolidated national reporting return', 'I3')
I(r'^GOV-STA-006$', 'Partial', PROV + '; lib/indicators/register.ts (official indicator definitions by version, drafted by one official and approved per institution by another; tests lib/indicators/register.test.ts)', 'The statistics authority\'s methodology approval as a form and procedure of the statistics slot (docs/INTEGRATION_REGISTER.md 20.69)', 'I3')
I(r'^DEM-PUB-010$', 'Not yet', PROV + '; approved indicator definitions (lib/indicators/)', 'A public institution performance report from approved indicators with explanatory notes (no public indicator release yet, 20.69)', 'I3')
I(r'^GOV-GOV-002$', 'Partial', KB.REGOWN, 'Service owners for services (the service catalogue, I13)')
I(r'^GOV-GOV-005$', 'Partial', 'lib/data/status.ts (status page, incidents) and lib/data/support.ts (P1–P4 tickets)', 'Disruption reports per government service')
I(r'^GOV-GOV-006$', 'Partial', UPD, 'Change requests for a government service (not only the platform)')
I(r'^GOV-GOV-011$', 'Met', UPD, '', '—')
I(r'^GOV-GOV-012$', 'Partial', UPD, 'A signed readiness declaration per service across the six gates')
I(r'^GOV-GOV-013$', 'Partial', KB.BACKUP + '; docs/DISASTER_RECOVERY.md drill', 'An exercise report record with corrective actions')
I(r'^INT-GOV-015$', 'Met', KB.BACKUP, '', '—')
I(r'^INT-GOV-00[12]$', 'Partial', 'person.verify and organisation.standing exchange services (lib/exchange/services.ts); organisations register (lib/organisations/register.ts)', 'The national identity provider integration (integration register)')
I(r'^INT-GOV-00[3456]$', 'Partial', KB.PAY + '; messaging alert() queues deliveries (no provider); ' + SEAL + '; ' + KB.DOCS, 'Connected providers (docs/INTEGRATION_REGISTER.md)')
I(r'^INT-GOV-008$', 'Partial', BOUND + '; ' + FACIL + '; ' + PARCEL, 'Address register (plan I7)')
I(r'^INT-GOV-0(09|1[01234])$', 'Partial', RET + '; ' + KB.EXCH + '; lib/events (outbox); ' + KB.AUDIT + '; lib/data/status.ts', 'Archive transfer; event envelope (plan I9); per-service health checks')
# Field series Part 2 (tax)
I(r'^taxpayer\.registration\.(submit|application|decision_record|verification_record|assessment|further_information|closure_record)$', 'Partial', TAXEV,
  'The catalogue field contract (classes, conditional fields, evidence policy) and stages beyond the reference procedure')
I(r'^taxpayer\.(registration\.(amend|transfer|suspend_request|reactivate_request)|details\.change|obligation\.(add|cancel))$', 'Partial', TAX6EV + ' (batch 3\'s change forms linked to tax.registration-amendment)', 'The nation\'s obligation, suspension and office-assignment rules (country.tax.registration, binding, shipped unset)')
I(r'^tax\.return\.periodic\.(submit|officer_assessment|decision)$', 'Partial', TAXEV + '; ' + TAX6EV, 'Typed per-tax schemas (tax.return_schema.*, the nation\'s); its approved filing and calculation rules')
I(r'^tax\.return\.periodic\.(nil|late_submission|further_information)$', 'Partial', TAXEV + '; ' + TAX6EV, 'Typed per-tax schemas; the nation\'s nil-return and late-filing rules (binding, shipped unset)')
I(r'^tax\.return\.periodic\.(amend|correction)$|^tax\.assessment\.(amendment|review_request)$', 'Partial', TAX6EV, 'Typed per-tax schemas; the nation\'s amendment rights and periods (binding, shipped unset)')
I(r'^tax\.return\.periodic\.notice$|^tax\.assessment\.notice$', 'Partial', TAXEV + '; ' + TAX6EV, 'Delivery records from a connected messaging or postal provider (integration register); due dates as approved rules')
I(r'^tax\.return\.periodic\.objection$|^tax\.objection\.(submit|supplement|extension_request|assessment|decision)$|^tax\.dispute\.(withdraw|closure)$', 'Partial', TAXEV + '; ' + TAX6EV, 'The nation\'s dispute periods, remedies and outcomes (country.tax.disputes, shipped unset); a separate extension decision step')
I(r'^tax\.return\.periodic\.(withdraw_request|appeal)$|^tax\.appeal\.(submit|transmit|response)$|^tax\.dispute\.settlement_(proposal|review)$', 'Not yet', TAX6WAIT, 'A procedure for this service (return withdrawal; appeal transmission to the body the law names by a referral case; settlement where the law permits)')
I(r'^tax\.payment\.(initiate|external_reference)$', 'Partial', TAXEV + '; ' + KB.PAY + '; ' + TAX6WAIT, 'Payment initiation by the taxpayer through a connected provider')
I(r'^tax\.payment\.(allocation_request|transfer_request|reversal_request|dispute)$|^tax\.credit\.adjustment$', 'Not yet', TAX6WAIT, 'An allocation, credit transfer, reversal and payment-dispute procedure decided by two officials under the nation\'s allocation rules')
I(r'^tax\.refund\.(application|supporting_evidence|assessment|decision|payment_instruction|reconciliation)$', 'Partial', TAX6EV, 'A treasury payout rail (the payout confirmation is recorded by an official; integration register); the nation\'s refund rules and interest (shipped unset)')
I(r'^tax\.compliance\.(case\.open|scope\.approve|information_request|information_response|inspection_plan|evidence_register|interview_record|findings_draft|taxpayer_response|findings_review|assessment_decision|case_closure)$', 'Partial', TAX6EV, 'The nation\'s compliance powers and checklists (country.tax.compliance_powers, shipped unset); an evidence-custody register')
I(r'^tax\.compliance\.inspection_checklist$', 'Partial', TAX6EV + ' (tax.compliance authorised stage; the catalogue\'s own contract in the library)', 'The catalogue contract attached to a tax.compliance version the nation approves')
I(r'^tax\.compliance\.(extension_request|extension_decision|complaint|referral)$', 'Not yet', TAX6WAIT, 'An extension decision step; a conduct-complaint route to the body the nation names; a referral case for tax compliance')
I(r'^tax\.withholding\.(registration|details\.amend|return\.submit|return\.amend|discrepancy\.(response|decision))$', 'Partial', TAX6EV, 'Typed withholding schemas and rules (Department F country decisions, shipped unset)')
I(r'^tax\.withholding\.(payment|certificate\.issue|statement\.(submit|correct))$', 'Not yet', TAX6WAIT + '; payments as bills reconciled once (' + KB.PAY + ')', 'Third-party reporting and certificates (matching statements against returns)')
I(r'^tax\.ruling\.(request|further_information|withdraw|decision|reconsideration)$', 'Partial', TAX6EV, 'Whether rulings exist, who they bind and their publication (Department G country decisions, shipped unset)')
I(r'^tax\.(assistance\.(enquiry|guidance_request)|incentive\.[a-z_]+)$', 'Not yet', TAX6WAIT, 'An enquiry service; a statutory incentive procedure and register (schemes are the nation\'s)')
I(r'^tax\.debt\.(payment_plan\.(request|evidence|decision|change_request|default_review|cancel_request)|voluntary_disclosure|disclosure\.assessment)$', 'Partial', TAX6EV, 'The nation\'s arrangement terms, disclosure treatment and interest (approved rules, shipped unset)')
I(r'^tax\.debt\.(statement\.request|recovery\.[a-z_]+)$', 'Not yet', TAX6WAIT, 'A debt statement drawn from account(); a recovery procedure only for the powers the nation\'s law gives (none inferred from a balance)')
# Field series Part 3 (customs)
I(r'^customs\.(import\.declaration\.submit|declaration\.(completeness|inspection|release_decision|release_notice|receipt))$', 'Partial', CUSEV, 'The catalogue\'s declaration contract (WCO data model mapping) and stages')
I(r'^exchange\.', 'Partial', KB.EXCH, 'This exchange service is not defined', None, 'I9')
# Field series Part 4 (civil, immigration)
I(r'^CIV-(BTH-00[24]|DEA-00[24]|MAR-001|REC-001|REC-01[034])$', 'Met', CIVEV, '', '—')
I(r'^CIV-(BTH-005|DEA-005|MAR-004|REC-004)$', 'Partial', CIVEV + '; ' + KB.CERT, 'A certificate request case by an entitled person')
I(r'^CIV-MAR-002$', 'Partial', CIVEV + ' (civil.correction)', 'Amendment specific to marriage records')
I(r'^IDN-VER-00[12]$', 'Partial', 'person.verify exchange (lib/exchange/services.ts; purposes approved per caller by two officials, minimum answer)', 'Identity register and the configured response vocabulary')
I(r'^IMM-VIS-00[178]$|^IMM-RES-00[13]$|^IMM-RES-016$', 'Partial', IMMEV, 'The catalogue\'s field contract and stages')
I(r'^IMM-VIS-01[13]$|^IMM-RES-018$', 'Partial', IMMEV + '; immigration.status exchange', 'Review case and purpose-limited response per catalogue')
# Field series Part 5 (courts)
I(r'^JUS-CRT-00[12]$|^JUS-CRT-01[3568]$|^JUS-CRT-02[03]$', 'Met', COURTS, '', '—')
I(r'^JUS-CRT-0(0[3-9]|1[0247]|19|2[124])$', 'Partial', COURTS, 'The step exists in the reference procedure; the catalogue\'s separate filing record with its field contract does not', 'I11')
I(r'^JUS-IND-00[12]$', 'Partial', COURTS + '; recusal (' + KB.TRANS + ')', 'Recorded assignment method (plan I11)', 'I11')
# Field series Part 6 (health)
I(r'^HLT-LIC-00[1345]$|^HLT-LIC-01[124]$', 'Met', PROFEV, '', '—')
I(r'^HLT-LIC-00[2678]$|^HLT-LIC-01[03]$|^HLT-LIC-009$', 'Partial', PROFEV, 'The catalogue step as its own record (qualification check, continuing education, good-standing certificate, conduct complaint and investigation, restoration)', 'I4')
I(r'^HLT-FAC-009$|^HLT-LIC-008$', 'Partial', COMPLAINTEV, 'Adoption by the nation: a version of the complaint procedure approved by a second official; its complaint kinds and relationships (configured lists, none ship)', 'I4')
I(r'^HLT-FAC-00[2358]$|^HLT-FAC-010$', 'Met', HEALTHEV, '', '—')
I(r'^HLT-FAC-00[14679]$', 'Partial', HEALTHEV, 'Establishment approval, corrective action plans, variations, closure notices and safety concerns as records', 'I4')
I(r'^HLT-PH-015$', 'Partial', 'Programme returns (' + PHEV + '): counts by area and period, small cells suppressed by the nation\'s rule', 'Adoption by the nation (the return procedure approved, programmes established); the statistics exchange HX-009', 'I4')
I(r'^HLT-PH-00[1-9]$|^HLT-PH-01[02368]$|^HLT-PH-017$', 'Platform rule stricter', CLINRULE, 'Individual case, contact, laboratory and vaccination data stay in the health authority\'s own systems; CivicOS holds aggregates and the administrative decision records only', '—')
I(r'^HLT-PH-01[14]$', 'Partial', PHEV, 'Adoption by the nation: the procedure versions approved by a second official, the mappings public-health-programme and public-health-communication approved, its audiences, channels and breakdowns configured', 'I4')
I(r'^HLT-MED-016$|^HLT-MED-02[12]$', 'Platform rule stricter', CLINRULE, 'Adverse reaction reports and clinical trial safety data carry patient data: CivicOS holds only the regulator\'s administrative decision (authorisation, its conditions) without patient fields', '—')
I(r'^HLT-FIN-0(0[6-9]|1[0-2])$', 'Platform rule stricter', CLINRULE, 'Service claims carry diagnoses and treatments: CivicOS holds no claim; coverage registration and payments to providers by aggregate only', '—')
I(r'^HLT-SOC-00[27]$|^HLT-SOC-008$', 'Platform rule stricter', CLINRULE, 'Care needs assessments and individual care plans are clinical or care records: held by the care provider, not CivicOS; the support decision is held without care details', '—')
# Field series Part 7 (education)
I(r'^EDU-SCH-00[1-4]$|^EDU-SCH-008$', 'Partial', EDUEV + '; ' + ORGLIC, 'School establishment approval and profile amendment as their own steps')
I(r'^EDU-SCH-005$', 'Met', EDUEV + ' (edu.inspection)', '', '—')
I(r'^EDU-CRE-00[1]$|^EDU-CRE-00[5678]$|^EDU-VOC-017$', 'Met', EDUEV + '; qualification.verify', '', '—')
I(r'^EDU-CRE-00[234]$|^EDU-CRE-014$', 'Partial', EDUEV, 'Certificate issuance, replacement and lost-certificate declarations as records')
I(r'^EDU-ACC-00[1-6]$|^EDU-ACC-01[24]$|^EDU-UNI-001$', 'Partial', ACCEV, 'Evidence submission, site visit and conditions monitoring as records')
I(r'^EDU-UNI-0(0[4-9]|1[0-3]|1[5-9]|2[0-4])$', 'Platform rule stricter', STUDRULE, 'Admissions, matriculation, module registration, progression, transcripts, fees and theses are the institution\'s own student records; CivicOS holds the award (qualification) and aggregates only', '—')
I(r'^EDU-UNI-014$', 'Partial', EDUEV + ' (edu.qualification)', 'Award approval recorded by the awarding institution')
I(r'^EDU-EXM-00[2347]$|^EDU-EXM-01[01]$', 'Platform rule stricter', STUDRULE, 'Candidate-level registration, attendance and marks are the examination body\'s own records; results enter CivicOS only as qualification records', '—')
I(r'^EDU-VOC-00[3789]$|^EDU-VOC-01[12]$', 'Platform rule stricter', STUDRULE, 'Learner enrolment and training records are the provider\'s; the skills certificate enters as a qualification record', '—')
I(r'^EDU-VOC-010$', 'Partial', EDUEV + ' (edu.qualification)', 'Skills certificate as a qualification record of the skills authority')

# ---------------------------------------------------------------- supplement (parts 14-22, Stage B contracts for parts 5-13)
RESTR = "Restricted personal data (supplement header): built only as restricted fields under the owning institution's read rule, every read in the access log (" + KB.ACCESS + "); medical content only as a sealed document reference, never a clinical field"
# Executive office, Cabinet, treasury and budget (plan step I5, forms batch 8): the forms the I5 procedures carry, and the rest as library drafts.
I(r'^(exec\.cabinet\.action\.close|exec\.cabinet\.action\.update|exec\.cabinet\.decision\.action_assign|exec\.cabinet\.decision\.correct|exec\.cabinet\.decision\.distribution|exec\.cabinet\.decision\.record|exec\.cabinet\.paper\.fiscal_review|exec\.cabinet\.paper\.legal_review|exec\.cabinet\.paper\.revise|exec\.presidency\.correspondence\.decision|exec\.presidency\.correspondence\.notice|exec\.presidency\.correspondence\.referral|exec\.presidency\.correspondence\.submit|exec\.presidency\.correspondence\.supplement|exec\.presidency\.correspondence\.withdraw)$', 'Partial', CABEV + E8LINK, "Adoption by the nation: the office named for the cabinetOffice slot, its Cabinet rules (policy-change.ts), the procedure approved by a second official and its decision mapping approved", 'I5')
I(r'^(budget\.allocation\.approve|budget\.allocation\.notify|budget\.allocation\.propose|budget\.bid\.justification|budget\.bid\.revise|budget\.bid\.withdraw|budget\.ceiling\.approve|budget\.ceiling\.propose|budget\.circular\.issue|budget\.execution\.commitment|budget\.execution\.commitment\.approve|budget\.execution\.reallocation\.approve|budget\.execution\.reallocation\.request|budget\.execution\.supplementary\.request|budget\.execution\.virement|budget\.negotiation\.record|budget\.programme\.costing|treasury\.cash_forecast\.close|treasury\.cash_forecast\.review|treasury\.cash_forecast\.revise|treasury\.cash_forecast\.submit|treasury\.payment\.approve|treasury\.payment\.cancel_request|treasury\.payment\.execute|treasury\.payment\.reconcile|treasury\.payment\.reject|treasury\.payment\.supporting_evidence|treasury\.payment\.verify)$', 'Partial', FINEV + E8LINK, "Adoption by the nation: the finance authority named, its approved rules (payment approval tiers, calendars, thresholds), the procedure approved by a second official and its decision mapping approved", 'I5')
I(r'^(budget\.execution\.correction|budget\.execution\.overrun\.report|budget\.execution\.underspend\.report|budget\.execution\.variance\.report|budget\.execution\.year_end|exec\.cabinet\.agenda\.approve|exec\.cabinet\.agenda\.propose|exec\.presidency\.correspondence\.complaint|treasury\.cash_position\.report|treasury\.liquidity\.response|treasury\.liquidity\.shortfall|treasury\.payment\.correction|treasury\.payment\.dispute|treasury\.payment\.refund)$', 'Not yet', E8WAIT, "A procedure for this service (none is built yet)", 'I5')
# Internal administration (supplement Part 21, plan I2): the forms the adm.* procedures carry, and the rest as library drafts (forms batch 5)
I(r'^ADM-PRC-01[89]$|^ADM-PRC-020$', 'Partial', PROCEV + '; the library contract (forms batch 5) linked to the institution\'s procurement procedure by identity (plan step I5)', "The institution's adopted procedure version (proc.<template>.<institution>) approved by a second official; the nation's method thresholds (procurement.method-thresholds, binding, shipped unset)", 'I5', tag='SUP')
I(r'^ADM-(HR-001|PAY-01[123]|ICT-030|GOV-039|GOV-040|HR-010|LEG-027)$', 'Partial', KB.ADMIN + '; the library contract (forms batch 5) linked to the procedure by identity', "The institution's adopted procedure version carrying the contract, approved by a second official; the nation's grades, rates, limits and schedules", 'I2', tag='SUP')
I(r'^ADM-', 'Not yet', 'Library contract (forms batch 5); ' + KB.DEPTS + '; ' + KB.WORKSPACE, "The institution's procedure for this form (none is built yet)", 'I2', tag='SUP')
I(r'^(HLT-PAT-001|HLT-ENC-002|HLT-REF-003|HLT-MED-004|HLT-CARE-008)$', 'Platform rule stricter', CLINRULE, 'CivicOS holds no patient, encounter, referral, dispensing or care-plan record on a named person', '—', tag='SUP')
I(r'^HLT-PUB-005$', 'Partial', 'Aggregate returns only (lib/health/register.ts); ' + CLINRULE, 'A public-health incident as an aggregate count, never a case on a person', 'I4', tag='SUP')
I(r'^HLT-FAC-006$', 'Met', HEALTHEV, '', '—', tag='SUP')
I(r'^HLT-INS-007$', 'Partial', HEALTHEV + ' (inspection stage of the licence procedures)', 'Inspection findings recorded under an assigned inspector\'s account (plan I4)', 'I4', tag='SUP')
I(r'^(EDU-STD-001|EDU-ADM-002|EDU-ENR-003|EDU-ATT-004|EDU-RES-005)$', 'Platform rule stricter', STUDRULE, 'No registration, admission, enrolment, attendance or result record on a named student; attendance as aggregate returns only', '—', tag='SUP')
I(r'^EDU-CER-006$', 'Met', EDUEV + ' (edu.qualification; qualification.verify)', '', '—', tag='SUP')
I(r'^EDU-FAC-007$', 'Partial', EDUEV + '; ' + ORGLIC + ' (schools register)', 'Education institutions beyond schools as register types', tag='SUP')
I(r'^EDU-ACC-008$', 'Partial', ACCEV, 'Programme accreditation (institution accreditation exists)', tag='SUP')
I(r'^(JUS-PRO-006|JUS-COR-008)$', 'Legal review', LEGALREV + '; never a police field (' + POLRULE + ')', 'Suspect references and custody admission records: the country\'s legal review first; drafts only', 'I11', lr=True, tag='SUP')
I(r'^(JUS-CASE-001|JUS-DEC-004|JUS-APP-005)$', 'Met', COURTS + ' (case registration, sealed judgment citing the law, appeal as a separate case)', '', '—', tag='SUP')
I(r'^(JUS-FIL-002|JUS-EVD-003)$', 'Partial', COURTS + ' (documents on the court case)', 'Filings and evidence submissions as their own records with the contract\'s fields; chain-of-custody reference only after legal review', 'I11', tag='SUP')
I(r'^(SEC-INT-006|SEC-OVS-007)$', 'Legal review', CLASSRULE + '; ' + NOTHOLD, 'The platform is not an intelligence repository: product and oversight metadata only after legal review', 'I12', lr=True, tag='SUP')
I(r'^DEF-OPS-002$', 'Platform rule stricter', 'Plan §4: anything operational is out of scope', 'No operational task authorisation is held', '—', tag='SUP')
I(r'^ELE-REG-004$', 'Legal review', 'Plan §4 (electoral, legal review first); the voter register is held under the electoral body alone', 'Voter registration holds personal data under the electoral body alone; legal review before any build', 'I11', lr=True, tag='SUP')
I(r'^(LEG-BIL-001|LEG-VOT-003)$', 'Met', LEGEV, '', '—', tag='SUP')
I(r'^IND-APP-009$', 'Partial', KB.OFFICES, 'Appointment record with nomination and recommendation', 'I8', tag='SUP')
I(r'^(DGV-INT-008|DGV-INT-009)$', 'Met', INTAPP + '; ' + KB.EXCH, '', '—', tag='SUP')
I(r'^DGV-IDN-002$', 'Partial', 'person.verify exchange (lib/exchange/services.ts)', 'Identity provider integration', tag='SUP')
I(r'^DGV-REP-003$', 'Partial', DELEG, 'Granted by the represented person or business', tag='SUP')
I(r'^DGV-DOC-004$', 'Partial', KB.CERT + '; ' + SEAL, 'Issuance as its own request', tag='SUP')
I(r'^DGV-STA-006$', 'Partial', KB.TWIN, 'Statistical submissions per programme', 'I8', 'I3', tag='SUP')
I(r'^DGV-SVC-001$', 'Partial', 'Citizen wallet permit application routed by type (demo and training only)', 'Service catalogue routing (I13)', tag='SUP')
# Plan I7: the supplement's housing, planning, building control and local government forms the I7 procedures carry (batch 10).
I(r'^HPC-HOU-00[1-4]$', 'Partial', HOUEV + B10, B10MISS + '; the programme\'s terms approved by two officials citing the law', 'I7', tag='SUP')
I(r'^HPC-(PLN-009|PLN-01[23]|BLD-01[4-9]|BLD-020)$', 'Partial', BLDEV + B10, B10MISS + '; the building control rules adopted by two officials citing the law (CFG-INF-001)', 'I7', tag='SUP')
I(r'^LRG-(ORG-00[45]|FIN-008|SVC-01[34])$', 'Partial', LGEV + B10, 'Adoption by each local government: its procedures approved by a second official of its own, its council rules adopted', 'I7', tag='SUP')
I(r'^TRN-VEH-001$', 'Partial', TRNEV + B10, B10MISS, 'I7', tag='SUP')
I(r'^(SAF-INC-001|SAF-CASE-002)$', 'Partial', POLICE + '; ' + INCID, 'One incident report across services; beyond intake only after legal review', 'I7', 'I11', tag='SUP')
I(r'^(AGR-LIC-001|TRN-OPS-005|TRN-AVI-007|NAT-EXT-008)$', 'Partial', ORGLIC, 'The sector\'s licence register type, approved mapping and fields', tag='SUP')
I(r'^LND-REG-003$', 'Partial', PARCEL, 'Registration or amendment as an applicant\'s case with evidence and decision', tag='SUP')
I(r'^(ENV-PER-004|TRN-VEH-001)$', 'Partial', PERMITMAP, 'Sector procedure and register', tag='SUP')
I(r'^LIC-PRO-0(0[27]|1[025]|12)$', 'Partial', PROFEV, 'A non-health profession configured with its regulator; reference procedures written for health professions', tag='SUP')
I(r'^LIC-PRO-01[89]$', 'Partial', ACCEV, 'Training institution and programme accreditation for the profession', tag='SUP')
I(r'^LRG-ORG-001$', 'Partial', D['local-gov'][3] if False else "Subnational institutions (standing 'subnational'; " + KB.INST + ")", 'Registration as a procedure with its establishing law', tag='SUP')
I(r'^LRG-ORG-002$', 'Partial', BOUND, 'A boundary change proposal citing the law', tag='SUP')
I(r'^LRG-ORG-003$', 'Partial', KB.OFFICES, 'Local office-holders on the office register', tag='SUP')
I(r'^HPC-BLD-014$', 'Partial', PERMITMAP + ' (building-permit)', 'Building permit procedure and register', tag='SUP')
I(r'^LAB-EMP-007$', 'Partial', PERMITMAP + ' (work-permit: immigration lead, labour consulted)', 'The labour side of the referral', tag='SUP')
I(r'^(ADM-REC-02[56])$', 'Partial', RET + '; ' + KB.DOCS, 'Classification and retention review per record class', tag='SUP')
I(r'^ADM-ICT-0(29|30)$', 'Partial', KB.ROLES + '; accounts and roles (lib/auth/officials.ts), account changes (lib/auth/account-changes.ts), second sign-in step', 'Access request and privileged access approval as records with two officials', tag='SUP')
I(r'^ADM-ICT-031$', 'Partial', UPD, 'Change requests for an institution\'s own ICT', tag='SUP')
I(r'^ADM-ICT-032$', 'Not yet', D['cyber'][3], 'Institution cyber incident report (plan I12)', 'I12', tag='SUP')
I(r'^ADM-HR-009$', 'Partial', TRANSEV + ' (declared interest recuses at once)', 'A declaration record for staff', tag='SUP')
I(r'^ADM-GOV-039$', 'Partial', TRANSEV + ' (delegation); ' + DELEG, 'Delegation of authority record within the institution', tag='SUP')
I(r'^FGS-STD-0(0[1269]|1[456])$', 'Partial', D['form-gov'][3], 'A form registry with form definitions and versions (I1), not only procedure packages', 'I1', tag='SUP')
I(r'^FGS-STD-003$', 'Partial', KB.LAW + '; ' + KB.MAPPING, 'Verification of the legal basis per form', 'I1', tag='SUP')
I(r'^FGS-STD-011$', 'Partial', 'Public-site translations reviewed with the English they were made from, XLIFF 2.0 (lib/public-sites/translation.ts)', 'Form labels, hints and errors translated under the same review', 'I1', tag='SUP')
I(r'^(SOC-BEN-01[056]|SOC-BEN-021|LAB-EMP-010|FOR-CON-00[2]|FOR-CON-013)$', 'Not yet', RESTR, 'The record does not exist; when built, its restricted fields follow the rule cited', tag='SUP')

# ---------------------------------------------------------------- text rules (any row): (tag/part filter regex on 'TAG:part', text regex, status, ev, miss, step, also, needs_built, legal_review)
TX = []


def T(scope, rx, status, ev, miss='', step=None, also='', built=False, lr=False, forms=False, doms=None):
    TX.append((re.compile(scope) if scope else None, re.compile(rx, re.I), status, ev, miss, step, also, built, lr, forms, doms))


# never held / legal review
T(r'CAT-08-11:10', r'arrest|detention|use-of-force|use of force|warrant|chain of custody|Evidence ID|police\.(evidence|custody|force)', 'Legal review',
  POLRULE + '; ' + LEGALREV, 'CivicOS records none of it: no arrest, detention, custody, use-of-force, warrant or evidence record; each needs legal review and independent safeguards before a draft', 'I11', lr=True, forms=True)
T(r'CAT-08-11:10', r'custody|seiz|evidence item|forensic|Integrity information|Custody events|Examination record|Final disposition|Collection details|Dispute or limitation|Access restrictions|investigation', 'Legal review',
  POLRULE + '; ' + LEGALREV, 'CivicOS records no evidence, custody or investigation record; each needs legal review and independent safeguards before a draft', 'I11', lr=True, forms=True, doms=('police',))
T(r'FLD-05-07:5', r'prosecut|custody|detention|sentence|parole|probation|inmate|prison', 'Legal review', LEGALREV, 'Prosecution, custody, corrections and supervision records: legal review first; courts stay the judiciary\'s alone; police stays intake and referral', 'I11', lr=True, forms=True)
T(r'FLD-05-07:6', r'patient|clinical|diagnos|medication|prescri|allerg|laborator|imaging|treatment|care plan|discharge|admission|encounter|medical record|health record|case investigation|contact (tracing|investigation)|vaccination record|immuni[sz]ation record', 'Platform rule stricter',
  CLINRULE, 'CivicOS holds no patient or clinical field; facilities, professionals, medicines and aggregate returns only', '—', forms=True)
# Part 6 §4.2's individual case record (a case reference, onset and specimen dates, an investigation of a case): never held; the
# programme register keeps aggregates and administrative decisions only (lib/health/programmes/register.ts, scope.test.ts).
T(r'FLD-05-07:6', r'^(Case reference|Event dates|Investigation|Evidence references) —', 'Platform rule stricter',
  CLINRULE + '; docs/requirements/form-scope.json (HLT-PH-001 … 010, 012, 013, 016 … 018 excluded); test lib/health/programmes/scope.test.ts',
  'Individual case, contact, laboratory and vaccination data stay in the health authority\'s own systems; CivicOS holds aggregates and the administrative decision records only', '—', doms=('public-health',))
T(r'FLD-05-07:7', r'student record|enrol|attendance|transcript|learner record|individual student|student particulars|progression|matriculat|module registration|academic record', 'Platform rule stricter', STUDRULE, 'No student record system; qualifications through cases and aggregates only', '—', forms=True)
T(r'FLD-03-04:4', r'biometric', 'Legal review', 'No biometric field exists anywhere in lib/; directions §15 (safeguards and independent legal review before any biometric or risk-scoring capability)', 'CivicOS holds no biometric template or match; any biometric step needs the country\'s law, a reviewed security design and legal review', 'I11', lr=True, forms=True)
T(r'FLD-03-04:3', r'supervis(ory|ed entit)|confidential supervisory', 'Lower priority', "Plan §4 (central bank operations); the central bank is an independent institution (" + KB.INST + "): whole-government scope stops at it (roles.ts reaches())", 'Supervisory records stay in the bank\'s own systems unless separately authorised; legal review of what CivicOS may hold', 'I5', lr=True, forms=True)
T(r'CAT-08-11:11', r'intelligence (content|source|collection)|raw intelligence|source identities|collection methods|not accredited|accredit|classified (operational|content|production data)|cross-classification|cross-domain', 'Platform rule stricter',
  CLASSRULE + '; ' + NOTHOLD, 'The installation\'s accreditation level and permitted data classes are not declared; until they are, CivicOS holds no classified content (plan I12)', 'I12', lr=True, forms=True)
T(r'CAT-08-11:11', r'military (action|operations|targeting)|weapons|covert|operational command', 'Platform rule stricter', "Plan §4: anything operational is out of scope; CivicOS has no operational defence function", '', '—', forms=True)
T(r'CAT-08-11:10', r'surveillance|interception|location tracking|facial recognition|biometric', 'Platform rule stricter', 'No surveillance, interception, location tracking or biometric function exists in lib/ (police is intake and referral only, CLAUDE.md); directions §15', '', '—', forms=True)
T(r'CAT-12-13:12', r'^(Protect whistleblower and complainant identities|Keep independent review cases inaccessible|independent_body\.case\.manage|Privacy: Voter, donor, whistleblower|Independent oversight: Findings cannot)', 'Met', OVSEV, '', '—')
T(r'CAT-12-13:12', r'^(The investigation workflow should record|A recommendation is not automatically|A finding should not be silently rewritten|Keep independent institutions\' records under)', 'Met', OVSEV, '', '—')
T(r'CAT-12-13:12', r'online voting|electronic (voting|ballot)|ballot secrecy|marked ballot', 'Platform rule stricter', 'CivicOS records no vote of any voter and is no electronic voting system (plan §4: electoral results after legal review)', '', '—', forms=True)
T(r'', r'risk score|credibility score|risk scoring', 'Platform rule stricter', 'CLAUDE.md: no risk score (immigration, customs: "never a score"); AI never makes a legally material decision; no risk score exists in lib/', '', '—', forms=True)
# permissions
T(r'', r'^police\.(evidence|custody|force)', 'Legal review', POLRULE, 'No such power is held', 'I11', lr=True)
T(r'', r'permission identifiers|technical permissions|map them to (its )?authori[sz]ed offices|map them to authorized offices', 'Platform rule stricter',
  "CLAUDE.md: one rule set lib/auth/roles.ts decides permissions (never a second place); holding an office grants no permission (roles.ts never reads offices); powers come from the institution's responsibility (authorityFor(), approved permit mappings) and the case package step", 'Task-level permission names are expressed as package steps and roles.ts rules, mapped to institutions and roles, never to offices; attribute scoping by facility, jurisdiction and task is plan I2', 'I2')
# AI
T(r'', r'\bAI\b|artificial intelligence|model-generated|machine learning|AI-generated', 'Partial', AIEV, AIMISS, 'Throughout')
# two officials
T(r'', r'^(?!.{180}).*(two-person|dual control|distinct authori[sz]ed (individuals|people)|different authori[sz]ed (official|people|person)|propose-and-confirm|proposer and confirmer|cannot propose and confirm|self-approval|separation of duties|four-eyes)', 'Met' , KB.DUAL, '', '—', built=True)
# accessibility
T(r'', r'WCAG|\baccessib(le|ility)\b|screen[- ]reader|keyboard|right-to-left|mobile', 'Partial', A11Y, A11YMISS, 'I1', 'I10')
T(r'', r'external fonts|third-party resources|outside (font|service)', 'Met', 'CLAUDE.md: typefaces self-hosted, never load fonts or scripts from an outside service; npm run audit:sites fails on any request leaving the platform', '', '—')
# production data
T(r'', r'(sample|simulated|fictitious|invented|fabricated|demo|training)\b.*\b(production|live)\b|\b(production|live)\b.*\b(sample|simulated|fictitious|fabricated|invented|demo|training)', 'Met',
  KB.MODE + '; ' + KB.FOLD, '', '—')
# provenance labels
T(r'', r'\b(observed|modell?ed|estimated|provisional|reported)\b.*\b(verified|modell?ed|estimated|observed|forecast)\b|provenance label|stale', 'Partial', PROV, PROVMISS, 'I3')
# audit chain
T(r'', r'tamper-evident|audit chain|audit trail|audit event', 'Partial', KB.AUDIT + '; ' + KB.ACCESS, 'The platform chain records the built registers\' actions; this domain\'s records do not exist yet', None, built=True)
# fees and tariffs
T(r'', r'tariff|fee schedule|approved (rule|rules) .*(fee|royalt|amount)|fees? (cannot|must not) be entered|hardcoded amounts|royalt|subsid', 'Partial', KB.RULESX + '; ' + KB.PAY, 'The domain\'s rules and bills do not exist yet', None, built=True)
# access log
T(r'', r'log (restricted|access)|restricted (record|data)[- ]read|access (is|are) logged|restricted reads|Logging a read|logged', 'Partial', KB.ACCESS, 'Every read of this domain\'s personal data once its records exist', None, built=True)
# exchanges
T(r'', r'exchange|lawful purpose|purpose-limited|data scope|information-sharing|onward-disclosure|integration', 'Partial', KB.EXCH + '; ' + INTAPP, 'The domain\'s exchange services are not defined', None, 'I9', built=True)
# backups
T(r'', r'backup|restor|disaster recovery|rollback', 'Partial', KB.BACKUP + '; ' + UPD, 'Recovery tested for this domain\'s records once they exist', None, built=True)
# versions / never overwrite
T(r'', r'never (silently )?overwrite|preserv\w* (the )?(original|earlier|previous|prior)|linked (correction|version|event)|new (record )?version|versioned event|silently (overwritten|altering|replacing)', 'Partial', 'Registers built on the platform keep every version and change only through procedure effects (' + KB.WRITES + '); ' + KB.AUDIT, 'This domain\'s register does not exist yet', None, built=True)
# legal basis on decisions
T(r'', r'legal basis|rule[- ]set version|rule version|law version|legal provision|applicable (law|rule) version', 'Partial', KB.DECIS + '; ' + KB.LAW + '; ' + KB.MAPPING, 'The domain\'s procedures do not exist yet', None, built=True)
# independence
T(r'', r'separation of powers|(independent|constitutional(ly independent)?) (institutions?|bodies|body) (must )?(retain|keep|control)|executive (workflow )?administrators? (must|should|cannot)|universal override|government-wide administrator|undifferentiated executive hierarchy|single (undifferentiated )?command hierarchy|subordinate (department|to)|as subordinate|not be (placed|collapsed)', 'Met', KB.INST + '; ' + KB.ROLES + "; whole-government scope stops at independent institutions (reaches()); relationships (" + KB.RELS + ")", '', '—')
# country configuration
T(r'', r'(country|nation|jurisdiction) (must|should) (configure|define|map|complete|confirm|explicitly)|must be configured|country-configurable|Country decisions?:|country configuration|configured by (each|the) (country|nation)|Before (any|enabling|activation)|remain inactive', 'Country decision', CFGEV, '', None)
# offline
T(r'', r'offline|manual (fallback|dispatch|execution)|synchroni[sz]', 'Not yet', 'No offline capture or synchronisation in lib/', 'Offline capture with provenance and conflict review, never silent overwrite (plan I6 fieldwork; emergency continuity I7)', None)
# notifications
T(r'', r'\b(notify|notification|notice|alert)s?\b.*\b(deliver|channel|recipient|sent|issued?)|\b(deliver|send)\w* .*\b(notices?|notifications?|alerts?)\b', 'Partial', 'lib/data/comms.ts alert() queues deliveries (no provider); case notices as procedure steps', 'A connected notification provider with delivery records (integration register)', None, built=True)
# retention
T(r'', r'retention|legal hold|archiv|disposal|destruction', 'Partial', RET + '; ' + KB.DOCS, 'Retention schedules per record class with archival transfer', None, built=True)


def built(dom):
    return D[dom][2]


def assess(row):
    dom = domain_of(row)
    sector, step, is_built, dev, form_status = D[dom]
    cid = row.get('catalogue_id') or ''
    text = row['text']
    lead = row.get('lead') or ''
    scope_key = f"{row['tag']}:{row['part']}"
    out = None
    if cid:
        for rx, st, ev, miss, stp, also, lr, tg in ID:
            if (tg or '') != ('SUP' if row['tag'] == 'SUP' else '') and not (tg == '*'):
                continue
            if rx.search(cid):
                out = dict(status=st, evidence=ev, missing=miss, step=stp or step, also=also, basis='catalogue-id', legal_review=lr)
                break
    if out is None:
        for sc, rx, st, ev, miss, stp, also, needs_built, lr, forms, doms in TX:
            if sc and not sc.search(scope_key):
                continue
            if doms and dom not in doms:
                continue
            if (cid or row['kind'] in ('contract', 'contract-field', 'contract-key', 'field-spec')) and not forms:
                continue
            if not (rx.search(text) or (lead and rx.search(lead) and st in ('Partial', 'Platform rule stricter', 'Legal review') and 'AI' in lead)):
                continue
            if needs_built and not is_built and st == 'Met':
                st, miss = 'Partial', f'The platform rule applies; the {sector} records do not exist yet'
            if needs_built and is_built and st == 'Partial' and 'do not exist yet' in miss:
                miss = 'Applies to the built records; not verified line by line for this catalogue item'
            s2 = stp if stp is not None else step
            if st == 'Country decision':
                s2 = '—' if is_built else step
                if not is_built:
                    miss = f'The {sector} records and procedures do not exist, so there is nothing yet to configure'
            if st in ('Met',) and s2 is None:
                s2 = '—'
            out = dict(status=st, evidence=ev, missing=miss, step=s2, also=also, basis='text', legal_review=lr)
            break
    if out is None:
        k = row['kind']
        if cid and re.match(r'^(CFG-|country\.)', cid):
            out = dict(status='Country decision', evidence=CFGEV, missing='' if is_built else f'The {sector} records and procedures do not exist, so there is nothing yet to configure',
                       step='—' if is_built else step, also='', basis='configuration')
        elif cid and re.match(r'^(EX-|HX-|JX-|INT-)', cid):
            out = dict(status='Not yet', evidence=KB.EXCH + ' (the framework)', missing='This exchange service is not defined; its sending register ' + ('exists' if is_built else 'does not exist'),
                       step=step, also='I9', basis='exchange')
        elif cid and cid.startswith('REG-'):
            out = dict(status='Partial' if is_built else form_status if form_status in ('Lower priority', 'Platform rule stricter', 'Legal review') else 'Not yet', evidence=dev,
                       missing=f'The register as the catalogue defines it (owner in lib/data/register-owners.ts, one changing API, versioned events)', step=step, also='', basis='register')
        elif cid:
            out = dict(status=form_status, evidence=dev, missing=('' if form_status == 'Platform rule stricter' else
                       f'Procedure package, field contract and record for this {"item" if dom == "form-lib" else "form"}' + ('' if is_built else f'; no {sector} records exist')),
                       step=step, also='', basis='domain', legal_review=form_status == 'Legal review')
        elif k == 'permission':
            out = dict(status='Partial', evidence=KB.ROLES + '; package steps name the role needed', missing='Task-level scoping (plan I2); the domain\'s procedures', step='I2', also=step if step not in ('I2', '—') else '', basis='permission')
        else:
            st = form_status if form_status in ('Lower priority', 'Platform rule stricter', 'Legal review') else ('Partial' if is_built else 'Not yet')
            out = dict(status=st, evidence=dev, missing=('' if st == 'Platform rule stricter' else
                       ('The requirement as stated is not built for this domain beyond the cited records' if is_built else f'No {sector} records or procedures exist')),
                       step=step, also='', basis='domain', legal_review=st == 'Legal review')
    # forms: the catalogue field contract (I1-catalogue) beside the sector step
    also = [x for x in (out.get('also') or '').split(',') if x]
    if cid and row['kind'] == 'catalogue' and not re.match(r'^(CFG-|country\.|REG-|EX-|HX-|JX-|INT-|civicos\.|iso\.)', cid):
        if 'I1-catalogue' not in also:
            also.append('I1-catalogue')
    if out['step'] in also:
        also.remove(out['step'])
    out['also'] = ','.join(also)
    out['sector'] = sector
    out['domain'] = dom
    if out['status'] in ('Met', 'Platform rule stricter', 'Country decision') and not out['step']:
        out['step'] = '—'
    if out['status'] not in ('Met', 'Platform rule stricter', 'Country decision') and out['step'] == '—':
        out['step'] = step if step != '—' else 'I11'
    return out
