"""The Health I4 requirements and dependency register (owner's direction 2026-10-21,
docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md: "finish the Health I4 requirements and
dependency register before claiming Health is the first complete institution").

The dependencies are written here, once; this script writes them to docs/requirements/health-i4.json and renders
docs/HEALTH_I4_DEPENDENCIES.md from that file. app/src/lib/requirements/health-i4.test.ts checks the JSON against
the requirements register, the form library and the test files (a dependency claims "built and proven" only with
an existing test file and test name) and that the page is the JSON's rendering.

Run from the repository root: python3 -I app/scripts/requirements/health_i4.py .
"""
import json
import os
import sys

STATUSES = ['not built', 'partial', 'built and proven']
LIB = 'app/src/lib/forms/library/catalogue-contracts'
FS = 'FIELD-SERIES-PARTS-05-07'


def ident(form_id):
    return f'{FS}:{form_id}@1'


MED = ['HLT-MED-%03d' % n for n in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 23, 24)]
T = lambda f, n: dict(file=f, name=n)  # noqa: E731

DEPENDENCIES = [
    dict(
        id='product-register', title='The regulated product register (Part 6 §5.2)',
        rows=['FC6-5.2-01', 'FC6-5.2-02', 'FC6-5.2-03', 'FC6-5.2-04', 'FC6-5.2-05', 'FC6-5.2-06', 'FC6-5.2-07', 'FC6-5.2-08', 'FC6-5.2-09',
              'FC6-5.2-11', 'FC6-5.2-12', 'FC6-5-02', 'FC6-12-07', 'FC6-13-04'],
        exists=[dict(what='References to authorised products are typed as a register the platform does not hold: recorded as given, check recorded as not performed; a binding rule blocks publication in production',
                     files=['app/src/lib/forms/contract.ts', 'app/src/lib/forms/rules.ts']),
                dict(what='The shape of a product record and the one public view of it (publicProductView())', files=['app/src/lib/health/products/public.ts'])],
        missing=['The register itself: a store holding product records by version, its one changing API, its entry in the register owners with its legal authority (medicinesRegulation)',
                 'Its effects, written only by the procedures below (no direct write route)',
                 'Status shown anywhere: today none is, by rule'],
        owner='medicinesRegulation', contracts=[ident(x) for x in MED],
        access=['Read by the medicines authority under caseReadRefusal(); every read of a record holding personal data (a qualified person, a reporter) in the access log',
                'Commercially confidential content (dossier, composition, assessment, findings) restricted to the regulator',
                'Everyone else: publicProductView() only (public check, lists, exports, the twin, exchange services)'],
        provenance=['A status derives only from the regulator\'s record (FC6-5.2-12), never from an import, inventory or procurement record (FC6-5.2-11)',
                    'Every change is a new version written by a procedure effect, with the sealed decision, the law version and the mapping version; earlier versions kept'],
        tests=dict(existing=[], planned=['Register-writes test: no file but the product procedures\' effects writes the register (lib/casework/register-writes.test.ts extended)',
                                         'Product register test: versions kept, status only from a sealed decision, no status from an import or inventory record']),
        gate='Joins lib/data/register-owners.ts with its owner and legal authority; the binding rule on medicines.registry.products stops failing; the batch-2 forms\' gates pass in production',
        status='not built'),
    dict(
        id='public-product-view', title='The public product check exposes only approved, publishable information',
        rows=['FC6-5.2-10', 'FC6-6.2-01', 'FC6-6.2-02'],
        exists=[dict(what='publicProductView(): only attributes recorded by an approved decision, listed in the nation\'s approved public information classification and of the public class; never the dossier, the assessment, findings or persons; enforcement only as approved and published notices',
                     files=['app/src/lib/health/products/public.ts', f'{LIB}/HLT-MED-024.json'])],
        missing=['The register it reads and the public check and exchange service that call it (product-register, exchange-product-status)',
                 'The nation\'s public information classification (HLT-MED-006 decision.public_disclosure ships empty), approved by two officials'],
        owner='medicinesRegulation', contracts=[ident('HLT-MED-024'), ident('HLT-MED-006')],
        access=['Public: the view only; the type has no field for anything never public'],
        provenance=['The view names its source: the regulator\'s record and its version, and the classification version'],
        tests=dict(existing=[T('app/src/lib/health/products/public.test.ts', 'never carries dossier content, personal data or unpublished enforcement records: %s'),
                             T('app/src/lib/health/products/public.test.ts', 'returns an attribute only when it is approved, public and listed'),
                             T('app/src/lib/health/products/public.test.ts', 'returns no attribute until the nation approves a classification that lists it'),
                             T('app/src/lib/health/products/public.test.ts', 'is the rule HLT-MED-024 names, and the I4 register and integration register point to it')],
                   planned=['Once the register exists: a scan of the public check, lists, exports and the exchange service like app/api/parcels/parcels-privacy.test.ts']),
        gate='Every output of the product register passes through publicProductView() (a scan test, as for parcels)',
        status='built and proven'),
] + [
    dict(id=f'procedure-{k}', title=f'Product procedure: {t}', rows=rows, exists=[dict(what='The contracts, as library drafts, each naming the stage it is intended for; the case engine, procedure packages and permit authority registry it will run on', files=[f'{LIB}/{c}.json' for c in cs] + ['app/src/lib/casework/engine.ts', 'app/src/lib/permits/authority.ts'])],
         missing=[f'The {t} procedure package (stages, decision steps under an approved permit mapping, effects on the product register), drafted by the medicines authority, tested and approved by a second official',
                  'Adoption of the contracts in that procedure version'],
         owner='medicinesRegulation', contracts=[ident(c) for c in cs],
         access=['Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority'],
         provenance=['Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason'],
         tests=dict(existing=[], planned=[f'Procedure test: runs {t} to a sealed decision with four eyes and writes the product register only through its effect']),
         gate='Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)', status='not built')
    for k, t, cs, rows in [
        ('marketing-authorisation', 'marketing authorisation', ['HLT-MED-001', 'HLT-MED-002', 'HLT-MED-003', 'HLT-MED-004', 'HLT-MED-005', 'HLT-MED-006'],
         ['HLT-MED-001', 'HLT-MED-002', 'HLT-MED-003', 'HLT-MED-004', 'HLT-MED-005', 'HLT-MED-006', 'CFG-MED-002']),
        ('variation', 'variation', ['HLT-MED-008'], ['HLT-MED-008']),
        ('renewal', 'renewal', ['HLT-MED-007'], ['HLT-MED-007']),
        ('suspension-withdrawal', 'suspension and withdrawal', ['HLT-MED-009'], ['HLT-MED-009']),
        ('recall', 'recall', ['HLT-MED-017', 'HLT-MED-018'], ['HLT-MED-017', 'HLT-MED-018', 'FC6-5.3-02', 'FC6-5.3-04']),
        ('device-registration', 'medical device registration', ['HLT-MED-019'], ['HLT-MED-019', 'CFG-MED-001']),
        ('import-and-controlled', 'import and controlled-medicine authorisation', ['HLT-MED-013', 'HLT-MED-014'], ['HLT-MED-013', 'HLT-MED-014']),
        ('safety-intake', 'safety reports and device incidents (signals for assessment, never findings)', ['HLT-MED-015', 'HLT-MED-020'], ['HLT-MED-015', 'HLT-MED-020', 'FC6-5.3-01']),
        ('inspection', 'good-practice inspection and corrective action', ['HLT-MED-011', 'HLT-MED-012'], ['HLT-MED-011', 'HLT-MED-012', 'CFG-MED-003']),
        ('reconsideration', 'reconsideration or appeal', ['HLT-MED-023'], ['HLT-MED-023']),
    ]
] + [
    dict(
        id='register-types', title='Organisations register types for manufacturers, importers and wholesalers',
        rows=['HLT-MED-010', 'FC6-5.2-04'],
        exists=[dict(what='The organisations register and its register types (health-facilities, pharmacies), changed only through organisation procedure effects; an administrator can add a register type',
                     files=['app/src/lib/organisations/register.ts', 'app/src/lib/organisations/procedures.ts'])],
        missing=['Register types for medicines manufacturers (sites), importers and wholesalers kept by medicinesRegulation, each with its permit type',
                 'The manufacturing-site registration procedure (HLT-MED-010) on that type'],
        owner='medicinesRegulation', contracts=[ident('HLT-MED-010'), ident('HLT-MED-013')],
        access=['publicOrganisation() on lists and the public check; representatives only under canReadOrganisation()'],
        provenance=['A standing changes only by the authority keeping that register type, through organisation procedure effects'],
        tests=dict(existing=[T('app/src/lib/organisations/register.test.ts', 'keeps every version, links sites and lets an administrator add a register type')],
                   planned=['Register-type test: manufacturer, importer and wholesaler standings kept by the medicines authority only']),
        gate='The register types exist with an approved permit mapping; HLT-MED-010 adopted in a procedure version', status='not built'),
    dict(
        id='exchange-product-status', title='Exchange service: product status',
        rows=['HLT-MED-024', 'FC6-12-10', 'FC6-9.2-01', 'FC6-9.2-02'],
        exists=[dict(what='Exchange services answer an outside caller only for a purpose approved for it, each integration approved by two officials; the shape the service may return (publicProductView())',
                     files=['app/src/lib/exchange/services.ts', 'app/src/lib/health/products/public.ts'])],
        missing=['A product.status service (versioned contract, purpose, permitted fields) reading the product register', 'Its approval for each caller by two officials'],
        owner='medicinesRegulation', contracts=[ident('HLT-MED-024')],
        access=['Approved integrations only, per purpose; the answer is publicProductView() of the record'],
        provenance=['Each answer from the regulator\'s record with a signed receipt (as the other services)'],
        tests=dict(existing=[], planned=['Service test: refuses a purpose not approved for it; returns only declared fields (lib/exchange/returns-contract.test.ts extended)']),
        gate='Declared in the service directory and in returns-contract.test.ts; HLT-MED-024\'s procedure-link gate passes (its exchange service exists)', status='not built'),
    dict(
        id='exchange-hx-005', title='Exchange service HX-005: recall notices and safety alerts',
        rows=['HX-005', 'FC6-5.3-02', 'FC6-9.2-01'],
        exists=[dict(what='The exchange layer and the event outbox (events after a restore voided; consumers re-read)', files=['app/src/lib/exchange/services.ts'])],
        missing=['An event or notice service from the medicines authority to authorised health institutions for published recalls and safety alerts', 'Its approval by two officials, per recipient'],
        owner='medicinesRegulation', contracts=[ident('HLT-MED-017'), ident('HLT-MED-018'), ident('HLT-MED-015')],
        access=['Only approved recipients; the notice carries the published wording, never grounds or reporters'],
        provenance=['Sent only after the recall decision is sealed and the notice published; each delivery receipted'],
        tests=dict(existing=[], planned=['Exchange test: a recall notice reaches only approved recipients and only after publication']),
        gate='Service approved by two officials; deviation no-recall-exchange removed from HLT-MED-017', status='not built'),
    dict(
        id='health-slots', title='The medicines, controlled-substances and public-health responsibility slots',
        rows=['FC6-1-05', 'FC6-1-02', 'FC6-5-02', 'S2-A.10-08', 'S2-A.10-09', 'FC6-11-01'],
        exists=[dict(what='Three optional slots, shipped empty, set like every slot (setup, /api/sovereign/authorities, authorityFor()), shown in Who is responsible and the setup hub; provisionalOwner() stands the health regulator (or the next slot) in for an empty one, marked provisional, refused as competent in production and never confirmable as the competent authority',
                     files=['app/src/lib/nation/deployment.ts', 'app/src/lib/forms/publication.ts', 'app/src/lib/onboarding/status.ts', 'app/src/components/features/ResponsibleAuthorities.tsx'])],
        missing=['The nation names its bodies (a country decision, not the platform\'s)', 'Permit types for product powers mapped to them (permit-mappings)'],
        owner='medicinesRegulation', contracts=[ident(x) for x in MED] + [ident('HLT-PH-015')],
        access=['An institution named here gets the domain authority of the slot; a stand-in acts only provisionally and never confirms its own competence'],
        provenance=['Who is responsible changes after setup only through /api/sovereign/authorities (cited, a different official confirms); every version kept'],
        tests=dict(existing=[T('app/src/lib/nation/health-slots.test.ts', 'are slots of the deployment profile, optional and shipped empty, set through the same profile check'),
                             T('app/src/lib/nation/health-slots.test.ts', 'stand in provisionally, down the chain, and say so'),
                             T('app/src/lib/nation/health-slots.test.ts', 'show the provisional owner on the publication and pass the competent-authority gate only outside production'),
                             T('app/src/lib/nation/health-slots.test.ts', 'never let anyone confirm a provisional owner as the competent authority'),
                             T('app/src/lib/nation/health-slots.test.ts', 'appear in the setup hub: provisional owners are not done in production')], planned=[]),
        gate='In production, no form passes the competent-authority gate on a provisional owner', status='built and proven'),
    dict(
        id='permit-mappings', title='Permit authority mappings for product powers',
        rows=['CFG-MED-002', 'CFG-MED-003', 'FC6-11-02', 'FC6-5.2-09'],
        exists=[dict(what='The permit authority registry: drafted by one administrator, approved by another, citing the law; a production installation refuses a power no approved mapping covers', files=['app/src/lib/permits/authority.ts', 'app/src/lib/permits/decisions.ts'])],
        missing=['Proposed (unapproved) mappings for marketing authorisation, variation, renewal, suspension and withdrawal, recall, device registration, import and controlled-medicine authorisation, naming the new slots', 'The procedure family classification of each decision step'],
        owner='medicinesRegulation', contracts=[ident(x) for x in ['HLT-MED-006', 'HLT-MED-007', 'HLT-MED-008', 'HLT-MED-009', 'HLT-MED-013', 'HLT-MED-014', 'HLT-MED-017', 'HLT-MED-019']],
        access=['Administrators draft and approve mappings; the power itself is exercised only by the mapped institution\'s signers'],
        provenance=['Every mapping version kept, citing the law; sealed decisions record the mapping version'],
        tests=dict(existing=[], planned=['Mapping test: product decisions refused in production until a mapping is approved (as lib/permits/cycle3-production.test.ts)']),
        gate='Every product decision step classified in lib/permits/decisions.ts', status='not built'),
    dict(
        id='forms-without-procedures', title='The batch-1 and batch-2 forms with no procedure link',
        rows=['HLT-FAC-001', 'HLT-FAC-004', 'HLT-FAC-006', 'HLT-FAC-007', 'HLT-FAC-009', 'HLT-LIC-007', 'HLT-LIC-008', 'HLT-LIC-010', 'HLT-PH-015'] + MED,
        exists=[dict(what='Each contract as a library draft naming the stage it is intended for; its procedure link computed from the package register (missing), failing the go-live gate',
                     files=['app/src/lib/forms/procedure-link.ts', 'app/src/lib/forms/publication.ts'])],
        missing=['The procedures named in the list below (forms_without_procedure in health-i4.json)'],
        owner='healthRegulation', contracts=[],
        access=['As each procedure\'s institution'], provenance=['Contracts are adopted only in a procedure version a second official approves'],
        tests=dict(existing=[T('app/src/lib/forms/procedure-link.test.ts', 'is missing for every batch-2 form and every batch-1 form without a procedure, and that fails the go-live gate'),
                             T('app/src/lib/forms/procedure-link.test.ts', 'needs no procedure where an exchange service answers, but needs that service')],
                   planned=['Each procedure\'s own test (see the procedure-* dependencies)']),
        gate='Procedure link approved for each (the go-live gate)', status='not built'),
    dict(
        id='batch-1-adoption', title='Adopting the linked batch-1 contracts into procedure versions (health.facility*, prof.*)',
        rows=['HLT-LIC-002', 'HLT-LIC-006', 'HLT-LIC-009', 'HLT-LIC-013', 'S2-A.10-01', 'S2-A.10-02', 'S2-A.10-03', 'S2-A.10-04', 'S2-A.10-05', 'S2-A.10-06', 'S2-A.10-07',
              'S2-A.3-03', 'S2-C.2-03', 'S2-C.2-04', 'S2-C.2-14', 'S2-C.2-22', 'S2-C.2-23', 'S2-C.2-24', 'S2-C.9-10', 'FC6-13-05', 'FC6-10-29',
              'HLT-INS-007', 'FCS6-intro-43', 'FCS6-intro-44', 'FCS6-intro-45', 'FCS6-intro-46', 'FCS6-intro-47', 'FCS6-intro-48'],
        exists=[dict(what='Reference procedures health.facility, health.facility-renewal, health.facility-suspension, health.facility-revocation, prof.registration, prof.renewal and prof.fitness (drafts), carrying the specification\'s forms; each linked batch-1 contract names its procedure, stage, step and document; once the procedure is in the register the link reads draft',
                     files=['app/src/lib/health/procedures.ts', 'app/src/lib/professions/procedures.ts', 'app/src/lib/forms/procedure-link.ts'])],
        missing=['A new version of each procedure carrying the batch contract, drafted by the regulator, tested and approved by a second official (link: approved)'],
        owner='healthRegulation', contracts=[],
        access=['Facility cases by the health regulator; professional cases by the regulator the professions register names'],
        provenance=['The case keeps the form, declaration and evidence-policy versions it was submitted under'],
        tests=dict(existing=[T('app/src/lib/forms/catalogue-contracts.test.ts', 'belongs to its reference procedure where one exists, else names the stage it waits for'),
                             T('app/src/lib/forms/procedure-link.test.ts', 'is draft for a linked batch-1 form once its reference procedure is in the register, until a version carries the contract'),
                             T('app/src/lib/health/procedures.test.ts', 'licenses a clinic after inspection of its registered premises, then takes its aggregate capacity return; no patient field exists')],
                   planned=['Adoption test per procedure: the new version carries the contract by identity and its link reads approved']),
        gate='Procedure link approved for each linked contract', status='partial'),
    dict(
        id='facility-register', title='The facility register\'s role: standings in the organisations register, premises in the national facility register',
        rows=['S2-A.3-02', 'S2-C.2-12', 'S2-C.2-07', 'S2-C.2-08', 'S2-C.2-43', 'S2-C.2-44', 'S2-C.2-45', 'S2-C.2-48'],
        exists=[dict(what='A facility\'s licence is a standing in the health-facilities (or pharmacies) register of the organisations register; its premises are published registered sites of the national facility register (lib/data/facilities.ts), checked against the map; the licensing procedure refuses premises that are not',
                     files=['app/src/lib/organisations/register.ts', 'app/src/lib/data/facilities.ts', 'app/src/lib/health/procedures.ts'])],
        missing=['Authorised services and verification date on the standing (S2-C.2-12)', 'Inspection and corrective-action status in the twin from records (S2-C.2-48)'],
        owner='healthRegulation', contracts=[ident(x) for x in ['HLT-FAC-001', 'HLT-FAC-002', 'HLT-FAC-005', 'HLT-FAC-006', 'HLT-FAC-007', 'HLT-FAC-010']],
        access=['publicOrganisation() on the public check; restricted sites generalised by viewFacility()'],
        provenance=['Sites recorded by the owning institution, published by a second official, versions kept; never seeded'],
        tests=dict(existing=[T('app/src/lib/health/procedures.test.ts', 'refuses premises that are not published registered sites, and the education authority cannot license a clinic'),
                             T('app/src/lib/data/facilities.test.ts', 'places a site from its position: region and district worked out from the map')],
                   planned=['Standing carries authorised services and the last verification date']),
        gate='The facility directory rows met from records', status='partial'),
    dict(
        id='public-health-statistics', title='The aggregate public-health return and its statistics exchange',
        rows=['HLT-PH-015', 'HX-009', 'S2-A.3-05', 'S2-C.2-10', 'S2-C.2-17', 'S2-C.2-49', 'FC6-4.3-04', 'FC6-4.3-05', 'FC6-4.3-06', 'FC6-4.3-07', 'FC6-4.3-09', 'FC6-4.2-09', 'FC6-4.2-10'],
        exists=[dict(what='Aggregate capacity returns of licensed facilities (versioned, marked reported, corrections as new versions, no patient field); HLT-PH-015\'s contract (counts by area and period, each count marked, small cells protected by the nation\'s threshold as a binding rule); owned by the publicHealth slot, provisionally the health regulator',
                     files=['app/src/lib/health/register.ts', 'app/src/app/api/health-regulation/route.ts', f'{LIB}/HLT-PH-015.json'])],
        missing=['The programme returns store (indicators and programmes the nation approves; none ships)', 'A statistics exchange (HX-009) to the authorised statistics service, approved by two officials', 'Small-cell suppression applied before any publication or exchange'],
        owner='publicHealth', contracts=[ident('HLT-PH-015')],
        access=['Counts only; no person anywhere; exchange only for an approved purpose'],
        provenance=['Each count marked counted, estimated, incomplete or not available; a missing report is never a zero; corrections kept as new versions'],
        tests=dict(existing=[T('app/src/app/api/health-regulation/route.test.ts', 'takes returns only from the health regulator, refuses anything that is not an aggregate count'),
                             T('app/src/lib/forms/catalogue-contracts.test.ts', 'keeps the public-health return to counts: no person, by area and period, small cells protected by the nation\'s threshold')],
                   planned=['Statistics exchange test: suppressed cells never leave; only an approved purpose']),
        gate='HX-009 approved by two officials; the programme returns procedure approved', status='partial'),
    dict(
        id='public-health-programmes', title='Public-health programme administration (administrative records and aggregates only)',
        rows=['S2-A.3-04', 'S2-C.2-05', 'S2-C.2-16', 'S2-C.2-50', 'HLT-PH-011', 'HLT-PH-014', 'CFG-PH-001', 'CFG-PH-002', 'CFG-PH-003', 'FC6-4-02',
              'FC6-4.2-01', 'FC6-4.2-02', 'FC6-4.2-03', 'FC6-4.2-04', 'FC6-4.2-05', 'FC6-4.2-07', 'FC6-4.2-08', 'FC6-4.2-11', 'FC6-4.3-02', 'FC6-4.3-03', 'FC6-4.3-08',
              'HLT-PUB-005', 'FCS6-intro-29', 'FCS6-intro-30', 'FCS6-intro-31', 'FCS6-intro-32', 'FCS6-intro-33', 'FCS6-intro-34', 'FCS6-intro-35'],
        exists=[dict(what='The binding scope: no individual case, contact, laboratory or vaccination record; the transitions register for a declared emergency', files=['docs/requirements/form-scope.json', 'app/src/lib/forms/scope.ts'])],
        missing=['Programme records (identifier, approved eligibility, coverage definition, budget reference, reporting period)', 'Contracts for HLT-PH-011 and HLT-PH-014 (a later batch the owner approves)', 'Intervention authority rules (CFG-PH-003), from the nation'],
        owner='publicHealth', contracts=[],
        access=['Programme administrators of the public-health authority; identifiable outbreak data never held (scope)'],
        provenance=['Reported, suspected, confirmed and modelled kept apart (FC6-4-02, gate FC6-12-06)'],
        tests=dict(existing=[], planned=['Programme register test; scope test that no individual public-health record can be drafted']),
        gate='Programme records built; contracts approved', status='not built'),
    dict(
        id='health-roles', title='Roles scoped by facility, jurisdiction, task and data classification',
        rows=['S2-C.2-33', 'S2-C.2-34', 'S2-C.2-35', 'S2-C.2-36', 'S2-C.2-37', 'S2-C.2-38', 'S2-C.2-40', 'S2-C.2-41', 'S2-C.2-42'],
        exists=[dict(what='One rule set: Administrator, Can sign, Officer, Auditor per institution; case permissions by institution, sensitivity and assignment', files=['app/src/lib/auth/roles.ts'])],
        missing=['Scoping by facility, jurisdiction and task (S2-C.2-42)'], owner='healthRegulation', contracts=[],
        access=['roles.ts is the only place that decides'], provenance=['Every act names the official and the office acted under'],
        tests=dict(existing=[], planned=['Role test: an inspector acts only on assigned facilities in their jurisdiction']),
        gate='S2-C.2-42 met', status='partial'),
    dict(
        id='health-access-and-audit', title='Health access control, exchange contracts, audit and recovery',
        rows=['FC6-intro-01', 'FC6-intro-04', 'FC6-1-07', 'FC6-1-10', 'FC6-9-02', 'FC6-9-03', 'FC6-9.1-01', 'FC6-9.1-02', 'FC6-9.1-03', 'FC6-9.1-04', 'FC6-9.1-05', 'FC6-9.1-07', 'FC6-9.1-08', 'FC6-9.1-09', 'FC6-9.1-10',
              'FC6-10-01', 'FC6-10-03', 'FC6-10-04', 'FC6-10-05', 'FC6-10-06', 'FC6-10-07', 'FC6-10-08', 'FC6-10-09', 'FC6-10-10', 'FC6-10-11', 'FC6-10-12', 'FC6-10-13', 'FC6-10-14',
              'FC6-10-15', 'FC6-10-16', 'FC6-10-17', 'FC6-10-18', 'FC6-10-19', 'FC6-10-21', 'FC6-10-22', 'FC6-10-23', 'FC6-10-24', 'FC6-10-25', 'FC6-10-28', 'FC6-10-30', 'FC6-10-31', 'FC6-10-32', 'FC6-10-33',
              'FC6-12-02', 'FC6-12-09', 'FC6-12-13', 'FC6-13-06', 'FC6-13-08', 'FC6-13-09', 'FC6-13-10', 'FCS6-intro-01', 'FCS6-intro-55', 'FCS6-intro-56', 'S2-A.3-01'],
        exists=[dict(what='The access log (every read of personal data), refusals logged, the audit chain, encrypted verified backups, exchange services approved per purpose', files=['app/src/lib/records/access-log.ts', 'app/src/lib/records/refusal-log.ts', 'app/src/lib/data/backups.ts', 'app/src/lib/exchange/services.ts'])],
        missing=['Purpose codes on every restricted health read (FC6-12-02)', 'Health record metadata on each health record type (FC6-10-03 … 14)'],
        owner='healthRegulation', contracts=[],
        access=['Administrators do not read the access log; reading it is logged'], provenance=['Audit chain and access log hashed; restore preserves them'],
        tests=dict(existing=[], planned=['Health access test: each restricted read carries a purpose and an access-log entry']),
        gate='FC6-12-02 and FC6-12-13 met for the health records', status='partial'),
    dict(
        id='health-department-functions', title='Department functions not yet represented (policy, logistics, budget, complaints, workforce counts)',
        rows=['S2-C.2-02', 'S2-C.2-06', 'S2-C.2-09', 'S2-C.2-11', 'S2-C.2-15', 'S2-C.2-46', 'S2-C.2-47'],
        exists=[dict(what='Complaint forms as library drafts (HLT-FAC-009, HLT-LIC-008) and the referral procedure template', files=['app/src/lib/casework/referral.ts'])],
        missing=['Supply-item records and logistics; budget, procurement and grants (plan I5); complaint intake procedures; workforce counts from the professions register'],
        owner='healthRegulation', contracts=[ident('HLT-FAC-009'), ident('HLT-LIC-008')],
        access=['Administrative records only'], provenance=['Counts derive from records, never typed'],
        tests=dict(existing=[], planned=['Complaint intake test; workforce count from the register']),
        gate='Each function has its record and procedure', status='not built'),
    dict(
        id='integration-controls', title='Form identity, procedure-link states and the exclusion boundary',
        rows=['FC6-intro-05', 'FC6-10-01'],
        exists=[dict(what='formIdentity() (catalogue + form ID + version) for every lookup, approval and publication; ambiguous bare IDs refused; procedure-link states computed from the package register; the HLT-MED-004 boundary and the thirteen other duplicate IDs held apart',
                     files=['app/src/lib/forms/identity.ts', 'app/src/lib/forms/procedure-link.ts', 'app/src/lib/forms/publication.ts', 'app/src/lib/forms/page-data.ts'])],
        missing=[], owner='healthRegulation', contracts=[ident('HLT-MED-004')],
        access=['Approvals are acts of signed-in officials bound to identity and contract hash'], provenance=['Approvals saved before identities were kept take the identity of the version they were given on'],
        tests=dict(existing=[T('app/src/lib/forms/catalogue-identity.test.ts', 'keeps the excluded entry blocked: no contract, never drafted, nothing to publish'),
                             T('app/src/lib/forms/catalogue-identity.test.ts', 'evaluates the allowed entry on its own: allowed, a contract draft, its procedure missing'),
                             T('app/src/lib/forms/catalogue-identity.test.ts', 'carries no patient-specific or dispensing field: the scope words and an explicit list'),
                             T('app/src/lib/forms/catalogue-identity.test.ts', 'cannot be substituted through an approval record: an act counts only for the identity it was given on'),
                             T('app/src/lib/forms/catalogue-identity.test.ts', 'a bare ID is refused with both candidates, never resolved to one: in the library, the page and the API'),
                             T('app/src/lib/forms/procedure-link.test.ts', 'moves draft → under review → approved only as the register changes')], planned=[]),
        gate='The identity and link checks run in every publication', status='built and proven'),
    dict(
        id='standalone-and-pilot', title='Standalone Institutional Edition, portable export and the pilot exit gate',
        rows=['S0-intro-04', 'S1-1-01', 'S1-1.1-13', 'S1-13-10', 'S2-B-03', 'S3-G-18', 'S5-D-02', 'S5-D-03', 'S5-L-01', 'S6-I-10', 'S6-I-11',
              'S6-I-14', 'S6-I-15', 'S6-I-16', 'S6-I-17', 'S6-I-18', 'S6-I-19', 'S6-I-20', 'S6-I-21', 'S6-K-15', 'S6-L-06'],
        exists=[dict(what='Installation modes, the deployment profile, backups and the constitutional profile', files=['app/src/lib/ops/mode.ts', 'app/src/lib/nation/deployment.ts'])],
        missing=['An Institutional Edition profile for the health institutions and its portable export', 'The pilot exit gate: authorised users complete the service with real records and verifiable audit evidence'],
        owner='healthRegulation', contracts=[], access=['As the installation'], provenance=['Record identity unchanged when federating later'],
        tests=dict(existing=[], planned=['Standalone test: the health services run without another institution online']),
        gate='S6-I-11 exit gate', status='not built'),
]

ACCEPTANCE = [
    dict(id='P2-03', row='S2-G-14', item='A health-facility licensing case cannot be approved by an account lacking the configured legal authority.', register_status='Proven', status='built and proven',
         tests=[T('app/src/lib/health/procedures.test.ts', 'refuses premises that are not published registered sites, and the education authority cannot license a clinic'),
                T('app/src/lib/permits/cycle3-production.test.ts', 'refuses a school registration, a facility licence and a professional registration until a mapping is approved')]),
    dict(id='P2-04', row='S2-G-15', item='The health ministry cannot search unrestricted patient records simply because it administers health facilities.', register_status='Partial', status='partial',
         tests=[T('app/src/app/api/health-regulation/route.test.ts', 'takes returns only from the health regulator, refuses anything that is not an aggregate count')]),
    dict(id='P2-11', row='S2-G-22', item='A public professional-licence verification endpoint excludes restricted personal and disciplinary information.', register_status='Proven', status='built and proven',
         tests=[T('app/src/app/api/registers/professionals/route.test.ts', 'answers one person by full name, narrowed by the number, never by the number alone, without the person reference, qualifications or (by default) conditions'),
                T('app/src/app/api/registers/professionals/route.test.ts', 'limits each caller and flags harvesting once')]),
]


def forms_without_procedure(repo):
    out = []
    d = os.path.join(repo, LIB)
    for f in sorted(os.listdir(d)):
        if not f.endswith('.json'):
            continue
        c = json.load(open(os.path.join(d, f), encoding='utf-8'))
        if not c['form_id'].startswith('HLT-'):
            continue
        lib = c['library']
        if lib.get('procedure'):
            continue
        no_case = any(x['id'] == 'no-case' for x in lib['deviations'])
        out.append(dict(identity=f'{c["catalogue"]["source"].split("/")[-1][:-3]}:{c["form_id"]}@{c["form_version"]}', batch=c['catalogue'].get('batch', 1),
                        title=lib['title'], owner=lib['owner'], stage=lib.get('intended'), procedure_required=not no_case,
                        answered_by=lib.get('exchange'), link='missing'))
    return out


def adoption(repo):
    out = []
    d = os.path.join(repo, LIB)
    for f in sorted(os.listdir(d)):
        if not f.endswith('.json'):
            continue
        c = json.load(open(os.path.join(d, f), encoding='utf-8'))
        if not c['form_id'].startswith('HLT-'):
            continue
        p = c['library'].get('procedure')
        if p:
            out.append(dict(identity=f'{c["catalogue"]["source"].split("/")[-1][:-3]}:{c["form_id"]}@{c["form_version"]}', title=c['library']['title'],
                            procedure=p['key'], stage=p['stage'], **({'step': p['action']} if p.get('action') else {}), **({'document': p['document']} if p.get('document') else {}),
                            link='draft once the procedure is in the register; approved only when a version carrying the contract is approved'))
    return out


def render(reg):
    deps = reg['dependencies']
    cnt = {s: sum(1 for d in deps if d['status'] == s) for s in STATUSES}
    md = ['# Health I4: requirements and dependency register', '',
          '_Generated from `docs/requirements/health-i4.json` by `python3 -I app/scripts/requirements/health_i4.py .`; '
          'checked by `app/src/lib/requirements/health-i4.test.ts`. Do not edit by hand._', '',
          'Owner\'s direction of 21 October 2026 (`docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md`): track I4 as a dependency, not a '
          'completed capability, and finish this register before Health is called the first complete institution. '
          '**Health is not complete.** This register lists what it depends on; a dependency is "built and proven" only where a named test in an '
          'existing file proves it (the test fails otherwise).', '',
          f'**Summary:** {len(deps)} dependencies: ' + ', '.join(f'{cnt[s]} {s}' for s in STATUSES) + '.', '',
          '| Dependency | Status | Owner slot | Requirement rows | Release gate |', '|---|---|---|---|---|']
    for d in deps:
        md.append(f'| `{d["id"]}`: {d["title"]} | {d["status"]} | `{d["owner"]}` | {len(d["rows"])} ({", ".join(d["rows"][:4])}{" …" if len(d["rows"]) > 4 else ""}) | {d["gate"]} |')
    for d in deps:
        md += ['', f'## `{d["id"]}`: {d["title"]}', '', f'**Status: {d["status"]}.** Owner slot `{d["owner"]}`.', '',
               '**Requirement rows:** ' + ', '.join(f'`{r}`' for r in d['rows']), '', '**What exists:**', '']
        md += [f'- {e["what"]} (' + ', '.join(f'`{x}`' for x in e['files']) + ')' for e in d['exists']]
        md += ['', '**What is missing:**', ''] + ([f'- {m}' for m in d['missing']] or ['- Nothing for this dependency.'])
        if d['contracts']:
            md += ['', '**Contracts that depend on it:** ' + ', '.join(f'`{c}`' for c in d['contracts'])]
        md += ['', '**Access controls:**', ''] + [f'- {a}' for a in d['access']]
        md += ['', '**Provenance:**', ''] + [f'- {p}' for p in d['provenance']]
        md += ['', '**Tests:**', ''] + [f'- `{t["file"]}` "{t["name"]}"' for t in d['tests']['existing']] + [f'- To write: {t}' for t in d['tests']['planned']]
        md += ['', f'**Release gate:** {d["gate"]}']
    f = reg['forms_without_procedure']
    md += ['', '## Forms with no procedure link', '',
           f'{len(f)} library contracts name no procedure: {sum(1 for x in f if x["batch"] == 1)} of batch 1 and {sum(1 for x in f if x["batch"] == 2)} of batch 2. '
           f'{sum(1 for x in f if not x["procedure_required"])} need none (an exchange service and the public check answer them); every other one is '
           '`missing` and fails its go-live gate until its procedure exists (`lib/forms/procedure-link.ts`). The stage each is intended for:', '',
           '| Form | Batch | Owner slot | Procedure required | Intended stage |', '|---|---|---|---|---|']
    for x in f:
        md.append(f'| `{x["identity"]}` {x["title"]} | {x["batch"]} | `{x["owner"]}` | {"yes" if x["procedure_required"] else "no (" + str(x["answered_by"] or "a service not built") + ")"} | {x["stage"]} |')
    a = reg['adoption']
    md += ['', '## Linked batch-1 contracts waiting for adoption', '',
           f'{len(a)} contracts name a reference procedure. Each is linked, not adopted: the nation adopts it in a new procedure version a second official approves.', '',
           '| Form | Procedure | Stage | Step or document |', '|---|---|---|---|']
    for x in a:
        md.append(f'| `{x["identity"]}` {x["title"]} | `{x["procedure"]}` | `{x["stage"]}` | {x.get("step") or ""}{" · " if x.get("step") and x.get("document") else ""}{x.get("document") or ""} |')
    md += ['', '## Acceptance rows for Health (`docs/INSTITUTIONAL_ACCEPTANCE.md` part 2)', '', '| Item | Row | Register status | Here | Proving tests |', '|---|---|---|---|---|']
    for x in reg['acceptance']:
        md.append(f'| {x["id"]}: {x["item"]} | `{x["row"]}` | {x["register_status"]} | {x["status"]} | ' + '; '.join(f'`{t["file"]}` "{t["name"]}"' for t in x['tests']) + ' |')
    return '\n'.join(md) + '\n'


def main(repo):
    reg = dict(
        about='The Health I4 requirements and dependency register (owner\'s direction 2026-10-21). Health is not complete; this lists what it depends on. '
              'Statuses: not built, partial, built and proven (only with an existing test file and test name).',
        health_complete=False, statuses=STATUSES, dependencies=DEPENDENCIES,
        forms_without_procedure=forms_without_procedure(repo), adoption=adoption(repo), acceptance=ACCEPTANCE)
    with open(os.path.join(repo, 'docs/requirements/health-i4.json'), 'w', encoding='utf-8') as fh:
        json.dump(reg, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    with open(os.path.join(repo, 'docs/HEALTH_I4_DEPENDENCIES.md'), 'w', encoding='utf-8') as fh:
        fh.write(render(reg))
    print('health i4:', len(DEPENDENCIES), 'dependencies', {s: sum(1 for d in DEPENDENCIES if d['status'] == s) for s in STATUSES})


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
