# CivicOS — Complete Government Form System (ChatGPT), field-contract series, parts 1 and 2 of 13, kept verbatim

**Provenance.** ChatGPT's answer to the forms catalogue request of 21 October
2026, pasted by the owner. This is the **field-contract series**: its own
13-part delivery plan (shown at the top), with machine-readable field
contracts. It is a different series from the catalogue parts 8–13 kept in
`PARTS-08-11.md` and `PARTS-12-13.md`, whose numbering and grouping differ.
Both series are kept and binding. Received from this series so far: parts 1
(shared building blocks) and 2 (executive government, finance, treasury,
budget and revenue).

**Status.** Binding, like `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`. Owner's
instruction: never summarised; every item measured against the work and its
gap closed stage by stage; forms may be built to a higher standard than this
text, never lower. Each item is a row of `docs/INSTITUTIONAL_REQUIREMENTS.md`.

**How the text was kept.** Every word is here in the order delivered. Removed
only the owner's one-word "next" prompt between parts.

---

CivicOS — Complete Government Form System
Delivery plan: 13 numbered parts. Each part will be self-contained enough for an engineering team to implement, and I will wait for you to request the next part before continuing. The catalogue will cover the institutions and internal administrative functions you listed, including operational forms—not just public applications.

The objective is not to create a giant collection of unrelated forms. It is to create a versioned, legally grounded form system in which every government service has its complete lifecycle, every field has a defined contract, and every institution can identify what remains to be configured before going live.

A necessary distinction: no global specification can enumerate every form that every sovereign state legally requires without knowing that country's laws, institutional mandates, and service inventory. CivicOS can, however, provide a comprehensive baseline catalogue, enforce a complete lifecycle for every configured service, and identify country-specific forms and legal decisions explicitly. We must never claim that a nation's catalogue is legally complete merely because it has installed CivicOS.
The 13-part delivery plan
01

Shared building blocks and machine contracts

Field groups, universal validation rules, evidence contracts, identity and representation, consent, payment, declarations, legal notices, multilingual behavior and data classifications.


02

Executive government, finance, treasury, budget and revenue

Presidency, Prime Minister's Office, Cabinet, finance ministries, treasury, budget offices and tax authorities.


03

Customs, central banking, business, investment and procurement

Customs, independent central banks, trade, industry, investment facilitation and public procurement.


04

Civil registration, identity and health administration

Births, deaths, civil-status events, identity services, health facilities, health regulation and health professions administration—without clinical or patient records.


05

Education, immigration, labour and social protection

School and qualification administration, visas and permits, employment regulation, benefits and social-support services.


06

Agriculture, water and professional licensing

Farms, livestock, fisheries, food-business administration, water permits and regulated professions.


07

Judiciary, prosecution, corrections, police, defence administration and emergency management

Independent court records, prosecution workflows, correctional administration, police intake and referral, civilian defence administration and emergency coordination.


08

Land, mapping, local government and transport

Cadastre, land interests, surveying, municipalities, roads, aviation and maritime services.


09

Energy, mining, environment, housing and public works

Utilities, extraction permits, environmental authorization, planning, building control and public infrastructure.


10

Foreign affairs, digital government, tourism, culture, youth and sports

Consular and diaspora services, communications and digital services, tourism operators, cultural grants, youth programmes and sports administration.


11

Legislature, elections, independent oversight, statistics and regulators

Parliament, elections, audit, ombudsman, privacy, human rights, anti-corruption, statistics, sector regulators and public service commissions.


12

Shared internal administration for every institution

Human resources, finance, internal procurement, assets, records, legal, ICT, communications, internal audit, planning and performance management.


13

Form design standard, governance, completeness and rollout

Accessibility, offline synchronization, print and scan, translation governance, version migration, quality measurement, legal review and the first-institution implementation plan.


Contract rules used throughout the series
These are the implementation rules that all 13 parts will follow.
Marker	Meaning
universal	Required behavior of CivicOS in every deployment.
country-configurable	A country must configure the value, authority, procedure or approved rule. CivicOS must not guess it.
legal-review-required	The country's authorized legal reviewer must approve the legal basis, effect or data-processing authority before activation.
conditional	A field or evidence item is required only when its stated condition is true.
not-applicable	A feature is deliberately excluded from this institution's authorized scope, not silently omitted.
Every catalogue entry will distinguish the form's data contract from the approved procedure package that governs its submission, validation, assessment, evidence, decisions, deadlines and appeals.

A form must not go live just because its JSON parses. Its package must have a lawful authority, a named owning institution, an approved values source, an assigned reviewer, an authorized decision-maker and tested access controls.
Part 1 — Shared building blocks and machine contracts
1.1 Canonical field-contract format
CivicOS should store reusable field groups as versioned definitions. A form references a group by immutable ID and version; it does not copy and silently modify the group's fields. A country may extend a group through a reviewed extension, but cannot change a universal security or data-minimisation rule.

The following is the canonical shape for field definitions. It is intended to be JSON-loadable, with the rule names resolved by CivicOS's validation engine rather than interpreted as arbitrary code.
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "example.service.application",
  "record_type": "example.service.case",
  "form_version": 1,
  "status": "draft",
  "institution_id": "configured-institution-id",
  "service_id": "configured-service-id",
  "procedure_package_id": "configured-procedure-package-id",
  "procedure_package_version": 1,
  "legal_basis": [],
  "fields": [
    {
      "id": "applicant.reference",
      "type": "identifier_reference",
      "required": true,
      "validation": [
        {
          "rule": "required",
          "params": {}
        }
      ],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {
        "en": "Application reference"
      },
      "hint": {
        "en": "Use the reference supplied by CivicOS."
      },
      "error_text": {
        "en": {
          "required": "Enter the application reference."
        }
      },
      "accessibility": {
        "autocomplete": "off",
        "sensitive_to_screen_reader": false
      },
      "country_decision": null
    }
  ]
}


Production rule: configured-institution-id and configured-service-id above are schema illustrations, not usable production identities. A real form cannot be activated until actual IDs, an approved package, the relevant legal basis and the language resources are bound. The same rule applies to every catalogue form in later parts.
Standard field types
Type	Stored representation	Example
text	Unicode string	Trading name
long_text	Unicode string with bounded length	Description of request
date	ISO 8601 calendar date or structured partial date where permitted	Date of event
number	Decimal with explicit precision and range	Number of employees
choice	Stable code from a versioned approved values source	Application category
boolean	true, false or an explicit unanswered state	Is this a renewal?
person	Reference to a person record or a purpose-limited embedded person structure	Applicant
organisation	Reference to an organization record or a purpose-limited embedded structure	Employer
place	Stable place reference or structured geographic location	Work site
identifier_reference	Issuer, identifier type, value or protected reference	Existing case number
registry_reference	Registry name, record ID and version/reference metadata	Registered company
localized_text	Language-tagged string or structured multilingual text	Local trading name
money	Amount, ISO currency code and source rule reference	Calculated application fee
document	Document metadata and a secure content reference	Supporting certificate
address	Structured address with country-specific extensions	Residence or service address
point	Latitude, longitude, coordinate reference system and accuracy metadata	Inspection location
Universal: store stable codes rather than translated labels; store timestamps in UTC and render in the configured local time zone; never infer a legal meaning from a label or an institution's name.

Country-configurable: accepted calendars, address conventions, identifier types, official languages, currency, legal deadlines and locally authorized code lists.

Legal review required: any rule that determines eligibility, legal status, entitlement, liability, an enforcement action, or the legal effect of a declaration.
1.2 Reusable field-group contracts
The groups below are the shared library. Later parts will reference them by ID, alongside service-specific fields. Each group's fields have explicit types, requirements, validation, data classes and evidence expectations. A group is not a blanket authorization to collect every field in it: a form must include only the fields needed for its particular decision.

The JSON uses the fields shape from the canonical contract. The top-level group_id identifies the reusable definition; version makes the contract immutable once approved.
Group 1 — Person identity and culturally inclusive names
ID: core.person.v1 · Classification: universal group, individually minimized

This group must not assume that a person has a first name, middle name and surname. It must support single names, multiple given names, patronymics, matronymics, family-name-first order, names in multiple scripts, and people whose legal names cannot be confidently segmented.
{
  "group_id": "core.person",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "person.record_ref",
      "type": "identifier_reference",
      "required": false,
      "validation": [{"rule": "reference_type_allowed", "params": {"types": ["person"]}}],
      "values_source": "civicos.registry.person",
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Existing person record"},
      "hint": {"en": "Use this if the person already has a CivicOS record."},
      "error_text": {"en": {"reference_type_allowed": "Select a person record."}}
    },
    {
      "id": "person.name_full",
      "type": "localized_text",
      "required": true,
      "validation": [{"rule": "required", "params": {}}, {"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [{"kind": "identity_evidence", "when": "if_required_by_the_approved_procedure"}],
      "label": {"en": "Name as you use or legally record it"},
      "hint": {"en": "Enter the full name in its original script where possible. Do not split a single name into first and last names."},
      "error_text": {"en": {"required": "Enter the person's name.", "length": "The name must be between 1 and 300 characters."}}
    },
    {
      "id": "person.name_components",
      "type": "localized_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": "civicos.person.name_component_types",
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Name components, if known"},
      "hint": {"en": "Add given names, family names, patronymics or other components only when known and useful."},
      "error_text": {"en": {"length": "Check the length of the name component."}}
    },
    {
      "id": "person.name_order",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.person.name_order.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "How the name is ordered"},
      "hint": {"en": "Choose the order only if it is known."},
      "error_text": {"en": {"value_in_source": "Choose an available option."}}
    },
    {
      "id": "person.transliterated_name",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [{"kind": "identity_evidence", "when": "if_transliteration_is_used_to_match_an_official_record"}],
      "label": {"en": "Name in Latin script, if applicable"},
      "hint": {"en": "Enter an existing official transliteration; do not invent one."},
      "error_text": {"en": {"length": "Check the transliterated name."}}
    },
    {
      "id": "person.date_of_birth",
      "type": "date",
      "required": false,
      "validation": [{"rule": "date_not_in_future", "params": {}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [{"kind": "identity_evidence", "when": "if_required_by_the_approved_procedure"}],
      "label": {"en": "Date of birth"},
      "hint": {"en": "Leave this blank if the date is not known and the procedure permits that."},
      "error_text": {"en": {"date_not_in_future": "The date cannot be in the future."}}
    },
    {
      "id": "person.preferred_contact_name",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 150}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Name to use when contacting you"},
      "hint": {"en": "You may enter a preferred name different from the legal record."},
      "error_text": {"en": {"length": "Check the name."}}
    }
  ],
  "accessibility": {
    "name_order_must_not_be_assumed": true,
    "original_script_supported": true,
    "transliteration_is_separate": true,
    "screen_reader_labels_required": true,
    "rtl_supported": true,
    "autofill_must_not_overwrite_original_script": true
  },
  "assisted_channel": {
    "officer_may_transcribe": true,
    "record_transcription_source": true,
    "identity_evidence_is_not_automatically_required": true
  },
  "country_decisions": [
    "Which civil-registration name fields are legally authoritative.",
    "Which transliteration standards and scripts are accepted by each connected register.",
    "Whether a specific service lawfully requires verified legal name rather than self-reported name."
  ]
}


The approved name-order source must include stable values such as given_family, family_given, single_name, unsegmented, and other_or_unknown. These are structural hints, not judgments about a person's identity.
Group 2 — Partial, estimated and uncertain dates of birth
A single date input is not sufficient for all populations. Where the law permits uncertain dates, the data model must preserve the difference between a known date, a month/year, a year only, an estimated date and an unknown date.
{
  "group_id": "core.birth_date",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "birth_date.precision",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.date.precision.v1",
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "How much of the date is known?"},
      "hint": {"en": "Choose the option that reflects the available information."},
      "error_text": {"en": {"value_in_source": "Choose an available date option."}}
    },
    {
      "id": "birth_date.exact_date",
      "type": "date",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "birth_date.precision", "equals": "exact"}}, {"rule": "date_not_in_future", "params": {}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [{"kind": "date_evidence", "when": "as_required_by_the_approved_procedure"}],
      "label": {"en": "Date of birth"},
      "hint": {"en": "Enter the full date only when it is known."},
      "error_text": {"en": {"required_if": "Enter the full date.", "date_not_in_future": "The date cannot be in the future."}}
    },
    {
      "id": "birth_date.year",
      "type": "number",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "birth_date.precision", "in": ["year_only", "estimated"]}}, {"rule": "integer_range", "params": {"min": 1800, "max": 2100}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [{"kind": "date_evidence", "when": "as_required_by_the_approved_procedure"}],
      "label": {"en": "Birth year"},
      "hint": {"en": "Enter the known or estimated year."},
      "error_text": {"en": {"integer_range": "Enter a valid four-digit year."}}
    },
    {
      "id": "birth_date.month",
      "type": "number",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "birth_date.precision", "in": ["month_year"]}}, {"rule": "integer_range", "params": {"min": 1, "max": 12}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Birth month"},
      "hint": {"en": "Enter the month only if it is known."},
      "error_text": {"en": {"integer_range": "Enter a month from 1 to 12."}}
    },
    {
      "id": "birth_date.estimated",
      "type": "boolean",
      "required": true,
      "validation": [{"rule": "must_match", "params": {"field": "birth_date.precision", "true_when": ["estimated"]}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Is this date estimated?"},
      "hint": {"en": "An estimated date must remain marked as estimated in the record."},
      "error_text": {"en": {"must_match": "The estimated-date answer must match the selected precision."}}
    },
    {
      "id": "birth_date.basis",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.date.estimation_basis.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Basis for the date"},
      "hint": {"en": "Select the source of the information, if known."},
      "error_text": {"en": {"value_in_source": "Choose an available option."}}
    }
  ],
  "accessibility": {
    "do_not_require_exact_date_when_precision_is_partial": true,
    "never_silently_convert_partial_date_to_exact_date": true,
    "calendar_input_must_allow_keyboard_entry": true,
    "locale_specific_display_with_iso_storage": true
  },
  "assisted_channel": {
    "officer_may_record_estimated_date": true,
    "officer_must_preserve_uncertainty": true,
    "record_source_of_estimate_when_collected": true
  },
  "country_decisions": [
    "Permitted date-precision options in each legal procedure.",
    "Minimum and maximum accepted years for the relevant register.",
    "Which evidence can establish or estimate a date of birth.",
    "Legal treatment of unknown dates in civil-registration and identity records."
  ]
}


The precision source must include exact, month_year, year_only, estimated, and unknown where those options are lawful for the service. The rules engine must reject inconsistent combinations—for example, an exact date without a full date, or a month value when the precision is unknown.
Group 3 — Address and place of contact
Addresses must work for formal street addresses, rural settlements, informal settlements, PO boxes, landmark-based directions and international addresses. A coordinate is not a substitute for a postal address, and a person must not be denied a service solely because their location lacks a conventional street address unless the governing law specifically requires one.
{
  "group_id": "core.address",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "address.country",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "iso.3166-1.alpha2.current",
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Country"},
      "hint": {"en": "Select the country for this address."},
      "error_text": {"en": {"value_in_source": "Select a country."}}
    },
    {
      "id": "address.kind",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.address.kind.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Address type"},
      "hint": {"en": "Choose the option that best describes the address."},
      "error_text": {"en": {"value_in_source": "Choose an address type."}}
    },
    {
      "id": "address.formatted",
      "type": "localized_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 500}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Address as written or normally used"},
      "hint": {"en": "Enter the address in the local format where possible."},
      "error_text": {"en": {"length": "Check the address length."}}
    },
    {
      "id": "address.building_or_plot",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 100}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Building, house or plot number"},
      "hint": {"en": "Leave blank if the place has no number."},
      "error_text": {"en": {"length": "Check the building or plot number."}}
    },
    {
      "id": "address.locality",
      "type": "localized_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 200}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Village, neighbourhood or locality"},
      "hint": {"en": "Use the name people locally recognize."},
      "error_text": {"en": {"length": "Check the locality name."}}
    },
    {
      "id": "address.administrative_area",
      "type": "registry_reference",
      "required": false,
      "validation": [{"rule": "reference_type_allowed", "params": {"types": ["administrative_area"]}}],
      "values_source": "civicos.registry.administrative_area",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "District or administrative area"},
      "hint": {"en": "Select the official area if one is registered."},
      "error_text": {"en": {"reference_type_allowed": "Select an available administrative area."}}
    },
    {
      "id": "address.postal_code",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 30}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Postal code"},
      "hint": {"en": "Leave blank if this address has no postal code."},
      "error_text": {"en": {"length": "Check the postal code."}}
    },
    {
      "id": "address.po_box",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 100}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "PO box"},
      "hint": {"en": "Enter a PO box if used for correspondence."},
      "error_text": {"en": {"length": "Check the PO box."}}
    },
    {
      "id": "address.landmark_directions",
      "type": "long_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 1000}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Directions or nearby landmark"},
      "hint": {"en": "Describe how someone can find the location."},
      "error_text": {"en": {"length": "Check the directions."}}
    },
    {
      "id": "address.point",
      "type": "point",
      "required": false,
      "validation": [{"rule": "coordinate_range", "params": {"latitude": [-90, 90], "longitude": [-180, 180]}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Location on map"},
      "hint": {"en": "Provide a location only when it is necessary for this service."},
      "error_text": {"en": {"coordinate_range": "Enter valid map coordinates."}}
    },
    {
      "id": "address.purpose",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.address.purpose.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "How will this address be used?"},
      "hint": {"en": "For example, residence, business premises or correspondence."},
      "error_text": {"en": {"value_in_source": "Select the address purpose."}}
    }
  ],
  "accessibility": {
    "support_international_address_order": true,
    "do_not_require_postal_code_unless_lawfully_required": true,
    "map_not_required_for_address_entry": true,
    "coordinate_reference_system_must_be_explicit": true,
    "rtl_supported": true
  },
  "assisted_channel": {
    "allow_landmark_and_verbal_directions": true,
    "officer_may_capture_point_when_necessary": true,
    "record_if_point_was_reported_or_observed": true
  },
  "country_decisions": [
    "National address schema and administrative-area hierarchy.",
    "Accepted coordinate reference systems and geocoding service, if any.",
    "Which services require a service, residence, premises or correspondence address.",
    "Legal circumstances in which a postal address or verified residence is mandatory."
  ]
}


Group 4 — Contact details and notification channels
{
  "group_id": "core.contact",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "contact.email",
      "type": "text",
      "required": false,
      "validation": [{"rule": "email_format", "params": {}}, {"rule": "length", "params": {"min": 3, "max": 254}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Email address"},
      "hint": {"en": "Enter an address you can access."},
      "error_text": {"en": {"email_format": "Enter an email address in a valid format."}}
    },
    {
      "id": "contact.phone",
      "type": "text",
      "required": false,
      "validation": [{"rule": "phone_format", "params": {"international_format": "E.164"}}, {"rule": "length", "params": {"min": 3, "max": 30}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Telephone number"},
      "hint": {"en": "Include the country code if you know it."},
      "error_text": {"en": {"phone_format": "Enter a telephone number in a recognized format."}}
    },
    {
      "id": "contact.preferred_channel",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.notification.channel.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Preferred way to contact you"},
      "hint": {"en": "Choose from the available contact methods."},
      "error_text": {"en": {"value_in_source": "Choose a contact method."}}
    },
    {
      "id": "contact.accessibility_safe_channel",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.notification.channel.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "A safe way to contact you, if different"},
      "hint": {"en": "Provide this only if it is important for safe communication."},
      "error_text": {"en": {"value_in_source": "Choose an available contact method."}}
    }
  ],
  "accessibility": {
    "email_and_phone_must_not_both_be_required_by_default": true,
    "verification_code_not_equivalent_to_legal_identity_proof": true,
    "never_send_sensitive_details_in_sms_by_default": true
  },
  "assisted_channel": {
    "officer_must_confirm_safe_channel_if_disclosed": true,
    "do_not_read_sensitive_contact_details_aloud_in_public": true
  },
  "country_decisions": [
    "Permitted notification channels and approved delivery providers.",
    "Whether a service legally requires a contact method.",
    "Applicable consent and communication rules for electronic notices."
  ]
}


Group 5 — Organisation and business entity
{
  "group_id": "core.organisation",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "organisation.registry_ref",
      "type": "registry_reference",
      "required": false,
      "validation": [{"rule": "reference_type_allowed", "params": {"types": ["legal_entity", "business"]}}],
      "values_source": "civicos.registry.organisation",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Registered organisation"},
      "hint": {"en": "Select an existing record if the organisation is registered."},
      "error_text": {"en": {"reference_type_allowed": "Select an organisation record."}}
    },
    {
      "id": "organisation.legal_name",
      "type": "localized_text",
      "required": true,
      "validation": [{"rule": "required", "params": {}}, {"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [{"kind": "registration_evidence", "when": "if_the_service_requires_an_existing_registered_entity"}],
      "label": {"en": "Legal name of the organisation"},
      "hint": {"en": "Enter the registered name if one exists."},
      "error_text": {"en": {"required": "Enter the organisation's name."}}
    },
    {
      "id": "organisation.trading_name",
      "type": "localized_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Trading or public name"},
      "hint": {"en": "Enter a trading name only if it differs from the legal name."},
      "error_text": {"en": {"length": "Check the trading name."}}
    },
    {
      "id": "organisation.legal_form",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.organisation.legal_form.v1",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "registration_evidence", "when": "if_the_legal_form_affects_the_decision"}],
      "label": {"en": "Legal form"},
      "hint": {"en": "Choose the registered legal form where applicable."},
      "error_text": {"en": {"value_in_source": "Choose a legal form."}}
    },
    {
      "id": "organisation.registration_identifier",
      "type": "identifier_reference",
      "required": false,
      "validation": [{"rule": "identifier_format_from_source", "params": {}}],
      "values_source": "civicos.organisation.identifier_types",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "registration_evidence", "when": "if_required_by_the_approved_procedure"}],
      "label": {"en": "Registration number"},
      "hint": {"en": "Enter the registration number from the relevant register."},
      "error_text": {"en": {"identifier_format_from_source": "Check the registration number."}}
    },
    {
      "id": "organisation.country_of_registration",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "iso.3166-1.alpha2.current",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Country of registration"},
      "hint": {"en": "Select the country where the organisation is registered."},
      "error_text": {"en": {"value_in_source": "Select a country."}}
    },
    {
      "id": "organisation.registered_address",
      "type": "address",
      "required": false,
      "validation": [],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Registered address"},
      "hint": {"en": "Provide this only if required for the service."},
      "error_text": {}
    }
  ],
  "accessibility": {
    "support_foreign_entities": true,
    "support_unregistered_entities_where_lawful": true,
    "do_not_assume_every_entity_has_a_company_number": true
  },
  "assisted_channel": {
    "officer_may_search_authorized_registry": true,
    "record_registry_used_for_verification": true
  },
  "country_decisions": [
    "Legal entity types recognized by the country.",
    "Which registration identifier and registry are authoritative for each service.",
    "Rules for foreign, informal, nonprofit, public and unregistered entities."
  ]
}


Group 6 — Representative, agent or legal guardian
This group establishes authority to act, not just the identity of the person acting. A person who helps complete a form does not automatically become a legal representative, and representation must not silently grant access to unrelated records.
{
  "group_id": "core.representation",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "representation.capacity",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.representation.capacity.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Why are you acting for this person or organisation?"},
      "hint": {"en": "Choose your legal or authorized role."},
      "error_text": {"en": {"value_in_source": "Choose your role."}}
    },
    {
      "id": "representation.represented_party",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "reference_exists", "params": {}}],
      "values_source": "civicos.registry.person_or_organisation",
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Person or organisation you represent"},
      "hint": {"en": "Select the person or organisation this request concerns."},
      "error_text": {"en": {"reference_exists": "Select a valid person or organisation."}}
    },
    {
      "id": "representation.actor",
      "type": "person",
      "required": true,
      "validation": [{"rule": "required", "params": {}}],
      "values_source": "civicos.registry.person",
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Your details"},
      "hint": {"en": "Enter your details as the person acting."},
      "error_text": {"en": {"required": "Enter your details."}}
    },
    {
      "id": "representation.authority_document",
      "type": "document",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "representation.capacity", "in": ["agent", "power_of_attorney", "legal_guardian", "court_appointed_representative"]}}],
      "values_source": null,
      "personal_data_class": "restricted",
      "evidence": [{"kind": "authority_to_act", "when": "when_the_approved_procedure_requires_documentary_authority"}],
      "label": {"en": "Evidence that you may act for them"},
      "hint": {"en": "Upload the relevant authorization only if required."},
      "error_text": {"en": {"required_if": "Provide the required evidence of authority."}}
    },
    {
      "id": "representation.scope",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.representation.scope.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "What are you authorized to do?"},
      "hint": {"en": "Choose only the actions covered by your authority."},
      "error_text": {"en": {"value_in_source": "Choose the permitted scope."}}
    },
    {
      "id": "representation.valid_until",
      "type": "date",
      "required": false,
      "validation": [{"rule": "date_not_before", "params": {"reference": "submission_date"}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Authority expiry date, if any"},
      "hint": {"en": "Enter the expiry date if the authorization has one."},
      "error_text": {"en": {"date_not_before": "Check the authority expiry date."}}
    }
  ],
  "accessibility": {
    "separate_actor_from_represented_party": true,
    "authority_scope_is_explicit": true,
    "expired_authority_must_not_be_silently_accepted": true
  },
  "assisted_channel": {
    "distinguish_form_assistance_from_legal_representation": true,
    "record_assisting_officer_separately": true,
    "do_not_collect_guardianship_details_without_legal_need": true
  },
  "country_decisions": [
    "Recognized forms of representation and guardianship.",
    "Evidence sufficient to establish authority for each service.",
    "Legal scope, duration, revocation and verification of authority.",
    "Rules for minors, persons requiring support and organizations represented by officers."
  ]
}


Group 7 — Identity evidence seen by an officer
Use this group when a procedure requires an officer to inspect identity evidence. It is not a universal requirement to scan an identity document, and it must not be used to make identity evidence mandatory for services where the law permits another route.
{
  "group_id": "core.identity_evidence_seen",
  "version": 1,
  "scope": "universal_when_required",
  "fields": [
    {
      "id": "identity_evidence.kind",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.identity.evidence_type.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Type of identity evidence seen"},
      "hint": {"en": "Select the type of evidence you actually inspected."},
      "error_text": {"en": {"value_in_source": "Select the evidence type."}}
    },
    {
      "id": "identity_evidence.issuer_country",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "iso.3166-1.alpha2.current",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Issuing country"},
      "hint": {"en": "Enter this if it appears on the evidence."},
      "error_text": {"en": {"value_in_source": "Select an issuing country."}}
    },
    {
      "id": "identity_evidence.document_type",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.identity.document_type.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Document type"},
      "hint": {"en": "Choose the document type."},
      "error_text": {"en": {"value_in_source": "Choose a document type."}}
    },
    {
      "id": "identity_evidence.reference_token",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 100}}],
      "values_source": null,
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Document reference, if needed"},
      "hint": {"en": "Enter only the reference required for this procedure."},
      "error_text": {"en": {"length": "Check the document reference."}}
    },
    {
      "id": "identity_evidence.method",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.identity.inspection_method.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "How was the evidence checked?"},
      "hint": {"en": "Record the method actually used."},
      "error_text": {"en": {"value_in_source": "Choose a verification method."}}
    },
    {
      "id": "identity_evidence.outcome",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.identity.inspection_outcome.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Outcome of the check"},
      "hint": {"en": "Record the observed outcome, not an unsupported conclusion."},
      "error_text": {"en": {"value_in_source": "Choose an outcome."}}
    },
    {
      "id": "identity_evidence.officer",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "actor_has_role", "params": {"role": "identity_evidence_recorder"}}],
      "values_source": "civicos.registry.authorized_officer",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Officer who checked the evidence"},
      "hint": {"en": "This is recorded automatically where possible."},
      "error_text": {"en": {"actor_has_role": "Only an authorized officer can record this check."}}
    }
  ],
  "accessibility": {
    "do_not_require_document_upload_when_visual_inspection_is_sufficient": true,
    "never_store_full_document_image_by_default": true,
    "identity_check_is_not_a_legal_decision": true
  },
  "assisted_channel": {
    "officer_identity_and_timestamp_are_audited": true,
    "record_only_observed_facts": true,
    "record_alternative_evidence_if_the_procedure_allows_it": true
  },
  "country_decisions": [
    "Accepted identity evidence by service and applicant category.",
    "Whether document numbers, scans or copies may be retained.",
    "Authorized verification methods and any applicable retention period."
  ]
}


Group 8 — Declaration, attestation and signature
A declaration must state what the person is asserting and its legal effect. A signature method must not imply a legal effect that the applicable law does not recognize.
{
  "group_id": "core.declaration_signature",
  "version": 1,
  "scope": "universal_when_the_procedure_requires_a_declaration",
  "fields": [
    {
      "id": "declaration.text_version",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "approved_content_version", "params": {}}],
      "values_source": "civicos.approved.declaration_texts",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Declaration being made"},
      "hint": {"en": "Read the declaration before confirming it."},
      "error_text": {"en": {"approved_content_version": "This declaration is not an approved version."}}
    },
    {
      "id": "declaration.confirmed",
      "type": "boolean",
      "required": true,
      "validation": [{"rule": "must_be_true", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "I confirm that the information I provided is accurate to the best of my knowledge"},
      "hint": {"en": "Select this only if you agree with the statement."},
      "error_text": {"en": {"must_be_true": "Confirm the declaration to continue."}}
    },
    {
      "id": "declaration.signing_method",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.signature.method.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "How will you sign?"},
      "hint": {"en": "Choose a method accepted for this procedure."},
      "error_text": {"en": {"value_in_source": "Choose an available signing method."}}
    },
    {
      "id": "declaration.signature_reference",
      "type": "document",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "declaration.signing_method", "in": ["digital_signature", "uploaded_signed_document"]}}],
      "values_source": null,
      "personal_data_class": "restricted",
      "evidence": [{"kind": "signature_evidence", "when": "as_required_by_the_approved_procedure"}],
      "label": {"en": "Signature evidence"},
      "hint": {"en": "Provide signature evidence only if required by the chosen method."},
      "error_text": {"en": {"required_if": "Provide the required signature evidence."}}
    },
    {
      "id": "declaration.signed_at",
      "type": "date",
      "required": true,
      "validation": [{"rule": "must_match_server_submission_date", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Date of declaration"},
      "hint": {"en": "The system records the submission date automatically."},
      "error_text": {"en": {"must_match_server_submission_date": "The declaration date must match the recorded submission date."}}
    }
  ],
  "accessibility": {
    "declaration_text_must_be_readable_before_confirmation": true,
    "signature_must_be_keyboard_accessible": true,
    "signature_image_must_not_be_the_only_supported_method": true
  },
  "assisted_channel": {
    "officer_may_record_or_witness_signature_only_when_authorized": true,
    "record_signing_method_and_witness_role": true,
    "never_sign_for_the_applicant_without_explicit_legal_authority": true
  },
  "country_decisions": [
    "Legal effect of each declaration type.",
    "Recognized signature methods and identity assurance levels.",
    "Whether witnessing, oath, notarization or a specific attestation is required.",
    "Legal consequences of knowingly false declarations and the approved wording that explains them."
  ]
}


Universal: the declaration text, its version, the actor, timestamp and signature method are immutable audit evidence after submission. If a person corrects a submission, the correction must create a traceable amendment or new version rather than overwrite the signed record.
Group 9 — Purpose-specific consent
Consent must not be used as a substitute for statutory authority. A government service may need to process information because the law requires it; that processing must cite its legal basis rather than pretending the person can withdraw a legally mandatory process through a consent checkbox.
{
  "group_id": "core.consent",
  "version": 1,
  "scope": "universal_when_consent_is_the_valid_basis",
  "fields": [
    {
      "id": "consent.purpose_code",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.consent.approved_purposes",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Purpose of consent"},
      "hint": {"en": "Each purpose must be explained separately."},
      "error_text": {"en": {"value_in_source": "Choose an approved purpose."}}
    },
    {
      "id": "consent.notice_version",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "approved_content_version", "params": {}}],
      "values_source": "civicos.approved.consent_notices",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Consent notice"},
      "hint": {"en": "The approved notice is displayed before the choice."},
      "error_text": {"en": {"approved_content_version": "The consent notice is not approved."}}
    },
    {
      "id": "consent.choice",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.consent.choice.v1",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Your choice"},
      "hint": {"en": "You can decline optional consent without losing unrelated services."},
      "error_text": {"en": {"value_in_source": "Choose whether to consent."}}
    },
    {
      "id": "consent.recorded_at",
      "type": "date",
      "required": true,
      "validation": [{"rule": "server_recorded_timestamp", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Date recorded"},
      "hint": {"en": "The system records the time automatically."},
      "error_text": {"en": {"server_recorded_timestamp": "The consent timestamp must be system-recorded."}}
    }
  ],
  "accessibility": {
    "consent_choices_must_be_equally_clear": true,
    "no_preselected_optional_consent": true,
    "each_purpose_has_separate_choice": true,
    "withdrawal_path_must_be_explained_where_withdrawal_is_permitted": true
  },
  "assisted_channel": {
    "officer_must_read_or_explain_notice_when_needed": true,
    "record_language_and_assistance_method": true,
    "officer_must_not_select_consent_on_behalf_of_applicant": true
  },
  "country_decisions": [
    "Which processing purposes may lawfully rely on consent.",
    "Which consent choices can be withdrawn and how withdrawal affects future processing.",
    "Rules for minors, guardians and persons requiring supported decision-making.",
    "Retention and audit requirements for consent evidence."
  ]
}


Group 10 — Fees and payments
A payment field must reference an approved tariff or calculation rule. The applicant cannot type the amount of a government fee. An officer cannot override a configured fee merely by editing the submitted form.
{
  "group_id": "core.payment",
  "version": 1,
  "scope": "universal_when_the_service_has_a_lawful_charge",
  "fields": [
    {
      "id": "payment.tariff_rule_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "approved_rule_active_at_calculation", "params": {}}],
      "values_source": "civicos.rules.approved_tariffs",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Applicable fee rule"},
      "hint": {"en": "CivicOS selects the approved rule for this service."},
      "error_text": {"en": {"approved_rule_active_at_calculation": "No approved fee rule applies. The service cannot collect a fee until the rule is configured."}}
    },
    {
      "id": "payment.calculated_amount",
      "type": "money",
      "required": true,
      "validation": [{"rule": "derived_from_approved_rule", "params": {}}, {"rule": "currency_matches_rule", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Calculated amount due"},
      "hint": {"en": "This amount is calculated from the approved fee rule."},
      "error_text": {"en": {"derived_from_approved_rule": "The amount must be calculated from the approved rule."}}
    },
    {
      "id": "payment.exemption_claim",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.payment.exemption_categories",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "exemption_evidence", "when": "when_the_applicant_claims_an_exemption_defined_by_law"}],
      "label": {"en": "Are you claiming a fee exemption?"},
      "hint": {"en": "Choose an exemption only if one applies to you."},
      "error_text": {"en": {"value_in_source": "Choose an available exemption category."}}
    },
    {
      "id": "payment.payment_method",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.payment.approved_methods",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Payment method"},
      "hint": {"en": "Choose an available method."},
      "error_text": {"en": {"value_in_source": "Choose a payment method."}}
    },
    {
      "id": "payment.transaction_ref",
      "type": "identifier_reference",
      "required": false,
      "validation": [{"rule": "reference_type_allowed", "params": {"types": ["payment_transaction"]}}],
      "values_source": "civicos.payments.transactions",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "payment_receipt", "when": "when_payment_is_required_and_the_transaction_is_completed"}],
      "label": {"en": "Payment reference"},
      "hint": {"en": "The payment system supplies this reference."},
      "error_text": {"en": {"reference_type_allowed": "Select a valid payment reference."}}
    }
  ],
  "accessibility": {
    "amount_and_currency_are_announced_together": true,
    "fee_rule_and_calculation_are_explainable": true,
    "payment_failure_does_not_erase_application": true
  },
  "assisted_channel": {
    "officer_cannot_type_or_override_fee": true,
    "cash_handling_requires_separate_authorized_receipt_workflow": true,
    "record_exemption_claim_and_decision_separately": true
  },
  "country_decisions": [
    "Lawful tariff schedule, currency, exemptions and calculation rules.",
    "Approved payment providers and methods.",
    "Whether payment is required before submission, before decision or before delivery.",
    "Refund, waiver, arrears and reconciliation rules."
  ]
}


Required system behavior: if there is no approved fee rule, CivicOS must show the configured service-unavailable reason and prevent fee collection. It must not assume a zero fee, invent a fee or silently bypass the missing rule.
Group 11 — Supporting evidence and document upload
{
  "group_id": "core.evidence_upload",
  "version": 1,
  "scope": "universal_when_evidence_is_required",
  "fields": [
    {
      "id": "evidence.requirement_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "evidence_requirement_in_approved_package", "params": {}}],
      "values_source": "civicos.procedure.evidence_requirements",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Required evidence item"},
      "hint": {"en": "Choose an evidence item required by this procedure."},
      "error_text": {"en": {"evidence_requirement_in_approved_package": "This evidence item is not in the approved procedure."}}
    },
    {
      "id": "evidence.document",
      "type": "document",
      "required": true,
      "validation": [{"rule": "file_type_allowlist", "params": {}}, {"rule": "file_size_limit_from_policy", "params": {}}, {"rule": "malware_scan_passed", "params": {}}, {"rule": "document_requirement_match", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "evidence_document", "when": "as_required_by_the_approved_procedure"}],
      "label": {"en": "Upload the requested document"},
      "hint": {"en": "Use one of the accepted file types and provide only the requested document."},
      "error_text": {"en": {"file_type_allowlist": "This file type is not accepted.", "file_size_limit_from_policy": "The file is larger than the permitted limit.", "malware_scan_passed": "The file could not be accepted safely.", "document_requirement_match": "Upload the document requested for this evidence item."}}
    },
    {
      "id": "evidence.issuer",
      "type": "text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 200}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Issuing authority, if known"},
      "hint": {"en": "Enter the issuing authority only if it helps verify the document."},
      "error_text": {"en": {"length": "Check the issuing authority."}}
    },
    {
      "id": "evidence.issued_date",
      "type": "date",
      "required": false,
      "validation": [{"rule": "date_not_in_future", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Issue date, if shown"},
      "hint": {"en": "Leave blank if the document does not show an issue date."},
      "error_text": {"en": {"date_not_in_future": "The issue date cannot be in the future."}}
    },
    {
      "id": "evidence.verification_status",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "officer_or_service_only", "params": {}}],
      "values_source": "civicos.evidence.verification_status.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Verification status"},
      "hint": {"en": "This status is recorded by the authorized reviewer or verification service."},
      "error_text": {"en": {"officer_or_service_only": "Applicants cannot set the verification status."}}
    }
  ],
  "accessibility": {
    "accepted_formats_and_limits_are_announced_before_upload": true,
    "upload_progress_is_announced": true,
    "keyboard_upload_and_camera_capture_supported_where_available": true,
    "document_content_is_not_exposed_in_error_logs": true
  },
  "assisted_channel": {
    "allow_authorized_officer_to_scan_paper_evidence": true,
    "record_capture_method_and_capturing_actor": true,
    "original_document_is_not_destroyed_by_scanning": true
  },
  "country_decisions": [
    "Evidence requirements, acceptable substitutes and legal basis for each service.",
    "Permitted file formats and upload-size limits based on approved security policy.",
    "Retention, redaction, access, authenticity and destruction rules for each document class.",
    "Which records may be verified through an authorized government exchange instead of an upload."
  ]
}


The platform must check file signatures, not just filename extensions; quarantine suspicious uploads; encrypt evidence at rest and in transit; and restrict access by case and purpose. File size limits are security-policy configuration, not a law that CivicOS invents. The evidence requirement itself must be traceable to an approved procedure and a cited legal authority.
Group 12 — Bank account for payments to the applicant
This group is only for services that lawfully pay money to an applicant or beneficiary. It must not be included on an ordinary licence, registration or permit form simply because CivicOS has a reusable bank-account component.
{
  "group_id": "core.payout_account",
  "version": 1,
  "scope": "country-configurable",
  "fields": [
    {
      "id": "payout.account_holder_name",
      "type": "localized_text",
      "required": true,
      "validation": [{"rule": "required", "params": {}}, {"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": null,
      "personal_data_class": "restricted",
      "evidence": [{"kind": "account_ownership_evidence", "when": "when_required_by_the_approved_payout_procedure"}],
      "label": {"en": "Name on the bank account"},
      "hint": {"en": "Enter the account holder's name as recorded by the financial institution."},
      "error_text": {"en": {"required": "Enter the account holder's name."}}
    },
    {
      "id": "payout.country",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "iso.3166-1.alpha2.current",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Country of the bank account"},
      "hint": {"en": "Select the country where the account is held."},
      "error_text": {"en": {"value_in_source": "Select a country."}}
    },
    {
      "id": "payout.account_identifier",
      "type": "text",
      "required": true,
      "validation": [{"rule": "bank_identifier_format_from_country_policy", "params": {}}, {"rule": "length", "params": {"min": 1, "max": 100}}],
      "values_source": "civicos.payments.bank_identifier_schemes",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "account_ownership_evidence", "when": "when_required_by_the_approved_payout_procedure"}],
      "label": {"en": "Bank account details"},
      "hint": {"en": "Enter the account identifier requested for this country and payment method."},
      "error_text": {"en": {"bank_identifier_format_from_country_policy": "Check the account details."}}
    },
    {
      "id": "payout.bank_identifier",
      "type": "text",
      "required": false,
      "validation": [{"rule": "bank_identifier_format_from_country_policy", "params": {}}],
      "values_source": "civicos.payments.bank_identifier_schemes",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Bank or branch identifier, if required"},
      "hint": {"en": "Enter this only if the selected payment scheme requires it."},
      "error_text": {"en": {"bank_identifier_format_from_country_policy": "Check the bank or branch identifier."}}
    },
    {
      "id": "payout.verification_status",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "officer_or_service_only", "params": {}}],
      "values_source": "civicos.payments.account_verification_status.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Account verification status"},
      "hint": {"en": "Recorded by the authorized payout or verification service."},
      "error_text": {"en": {"officer_or_service_only": "This status is assigned by an authorized reviewer or service."}}
    }
  ],
  "accessibility": {
    "account_number_must_not_be_echoed_in_full": true,
    "copy_and_paste_allowed": true,
    "account_details_must_not_appear_in_general_case_exports": true
  },
  "assisted_channel": {
    "mask_account_details_on_screen_and_prints": true,
    "record_verification_method": true,
    "do_not_require_a_bank_account_when_an_approved_alternative_exists": true
  },
  "country_decisions": [
    "Supported payout schemes and account identifier formats.",
    "Permitted payout destinations and third-party-account rules.",
    "Evidence needed to verify account ownership.",
    "Approved alternative payment methods for applicants without bank accounts."
  ]
}


Group 13 — Nationality and residence status
Use this group only where nationality or residence status is relevant to the service's lawful decision. A general application must not collect nationality merely because the country has an identity register.
{
  "group_id": "core.nationality_residence",
  "version": 1,
  "scope": "conditional",
  "fields": [
    {
      "id": "nationality.status",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.nationality.status.v1",
      "personal_data_class": "personal",
      "evidence": [{"kind": "nationality_evidence", "when": "when_nationality_is_a_legal_eligibility_or_registration_requirement"}],
      "label": {"en": "Nationality status"},
      "hint": {"en": "Choose the description that applies to you."},
      "error_text": {"en": {"value_in_source": "Choose a nationality status."}}
    },
    {
      "id": "nationality.country_codes",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "iso.3166-1.alpha2.current",
      "personal_data_class": "personal",
      "evidence": [{"kind": "nationality_evidence", "when": "when_country_of_nationality_must_be_established_for_this_service"}],
      "label": {"en": "Country or countries of nationality"},
      "hint": {"en": "Select only the nationality information required for this service."},
      "error_text": {"en": {"value_in_source": "Choose an available country."}}
    },
    {
      "id": "residence.status",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.residence.status.v1",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "residence_status_evidence", "when": "when_residence_status_is_relevant_to_the_lawful_decision"}],
      "label": {"en": "Residence status, if relevant"},
      "hint": {"en": "Answer only if the service asks about your right or status of residence."},
      "error_text": {"en": {"value_in_source": "Choose an available residence status."}}
    },
    {
      "id": "residence.permit_reference",
      "type": "identifier_reference",
      "required": false,
      "validation": [{"rule": "reference_type_allowed", "params": {"types": ["residence_permit"]}}],
      "values_source": "civicos.registry.immigration_permits",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "residence_status_evidence", "when": "when_a_valid_permit_reference_is_required"}],
      "label": {"en": "Existing residence permit reference"},
      "hint": {"en": "Use the existing reference if you have one and the service needs it."},
      "error_text": {"en": {"reference_type_allowed": "Select a valid permit reference."}}
    }
  ],
  "accessibility": {
    "nationality_is_not_inferred_from_name_or_language": true,
    "stateless_or_unknown_status_must_be_supported_where_lawful": true,
    "multiple_nationalities_supported_when_relevant": true
  },
  "assisted_channel": {
    "officer_may_verify_against_an_authorized_register": true,
    "record_verification_source_and_outcome": true
  },
  "country_decisions": [
    "Nationality and residence categories recognized for each service.",
    "Which services may lawfully ask for nationality or residence status.",
    "Accepted evidence and authoritative registers.",
    "How unknown, disputed, stateless or multiple-nationality cases are handled."
  ]
}


Nationality is not the same thing as citizenship eligibility, immigration status, birthplace or place of residence. CivicOS must store these as distinct concepts.
Group 14 — Disability and accessibility needs
This group is optional and purpose-limited. It should usually capture what accommodation a person requests, not a diagnosis or detailed medical history.
{
  "group_id": "core.accessibility_needs",
  "version": 1,
  "scope": "optional_purpose_limited",
  "fields": [
    {
      "id": "accessibility.accommodation_requested",
      "type": "boolean",
      "required": false,
      "validation": [],
      "values_source": null,
      "personal_data_class": "special",
      "evidence": [],
      "label": {"en": "Would an adjustment help you use this service?"},
      "hint": {"en": "You do not need to provide a diagnosis."},
      "error_text": {}
    },
    {
      "id": "accessibility.accommodation_types",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "accessibility.accommodation_requested", "equals": true}}, {"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.accessibility.accommodation_types.v1",
      "personal_data_class": "special",
      "evidence": [],
      "label": {"en": "What adjustment would help?"},
      "hint": {"en": "Choose only the adjustments relevant to this service."},
      "error_text": {"en": {"required_if": "Choose an adjustment or explain what would help."}}
    },
    {
      "id": "accessibility.adjustment_details",
      "type": "long_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 1000}}],
      "values_source": null,
      "personal_data_class": "special",
      "evidence": [],
      "label": {"en": "Tell us what would make this service accessible"},
      "hint": {"en": "Describe the adjustment, not your medical history."},
      "error_text": {"en": {"length": "Keep the description within the permitted length."}}
    }
  ],
  "accessibility": {
    "this_group_must_not_be_required_for_general_service_access": true,
    "no_diagnosis_required_by_default": true,
    "accommodation_must_not_lower_service_priority": true
  },
  "assisted_channel": {
    "officer_records_requested_adjustment_not_assumed_disability": true,
    "provide_accessible_alternative_channel": true
  },
  "country_decisions": [
    "Legal basis for processing special-category data where applicable.",
    "Accommodation options supported by each service.",
    "Who may access the request and when it must be deleted or reviewed."
  ]
}


Group 15 — Language preference and interpretation
{
  "group_id": "core.language_preference",
  "version": 1,
  "scope": "universal",
  "fields": [
    {
      "id": "language.interface",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.country.official_and_supported_languages",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Language for this service"},
      "hint": {"en": "Choose a language you can understand."},
      "error_text": {"en": {"value_in_source": "Choose an available language."}}
    },
    {
      "id": "language.correspondence",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.country.official_and_supported_languages",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Language for letters and notices"},
      "hint": {"en": "Choose this if you prefer a different language for correspondence."},
      "error_text": {"en": {"value_in_source": "Choose an available language."}}
    },
    {
      "id": "language.interpreter_needed",
      "type": "boolean",
      "required": false,
      "validation": [],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Would you like an interpreter?"},
      "hint": {"en": "This does not affect whether you can apply."},
      "error_text": {}
    },
    {
      "id": "language.interpreter_language",
      "type": "choice",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "language.interpreter_needed", "equals": true}}, {"rule": "value_in_source", "params": {}}],
      "values_source": "civicos.country.interpretation_languages",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Language for interpretation"},
      "hint": {"en": "Choose the language you need."},
      "error_text": {"en": {"required_if": "Choose an interpretation language."}}
    }
  ],
  "accessibility": {
    "language_must_not_be_inferred_from_nationality": true,
    "language_switch_preserves_form_progress": true,
    "rtl_layout_is_supported": true,
    "untranslated_required_content_blocks_publication": true
  },
  "assisted_channel": {
    "record_actual_interpretation_used_when_relevant": true,
    "do_not_treat_machine_translation_as_certified_interpretation": true
  },
  "country_decisions": [
    "Official languages, supported languages and languages available for legal notices.",
    "Entitlement to interpretation or translated documents.",
    "Which translations require certification for legally material proceedings."
  ]
}


Group 16 — Standard legal and privacy notices
Notices are versioned content components attached to the form and procedure package. They are not optional decorative paragraphs. The applicant must see the relevant notice before the action to which it applies.
{
  "group_id": "core.legal_notices",
  "version": 1,
  "scope": "universal",
  "notice_types": [
    {
      "id": "notice.service_purpose",
      "required": true,
      "content_source": "civicos.approved.service_purpose",
      "must_state": ["what_service_does", "what_the_applicant_is_requesting", "what_happens_next"],
      "publication_blockers": ["missing_approved_translation", "missing_service_owner"]
    },
    {
      "id": "notice.legal_basis",
      "required": true,
      "content_source": "civicos.approved.legal_basis",
      "must_state": ["law_title", "law_version_or_effective_date", "relevant_provision", "authority_granted", "scope_or_limit_of_authority"],
      "publication_blockers": ["missing_legal_reference", "missing_effective_version", "missing_authorized_reviewer"]
    },
    {
      "id": "notice.data_use",
      "required": true,
      "content_source": "civicos.approved.data_processing_notice",
      "must_state": ["data_collected", "purpose", "lawful_basis", "authorized_recipients_or_recipient_categories", "retention_rule", "data_subject_rights_and_contact"],
      "publication_blockers": ["unmapped_data_purpose", "unapproved_recipient_category", "missing_retention_rule"]
    },
    {
      "id": "notice.evidence",
      "required": true,
      "content_source": "civicos.procedure.evidence_requirements",
      "must_state": ["required_evidence", "why_each_item_is_required", "accepted_alternatives", "what_to_do_if_evidence_is_unavailable"],
      "publication_blockers": ["evidence_without_legal_or_procedural_basis"]
    },
    {
      "id": "notice.fees",
      "required": false,
      "content_source": "civicos.rules.approved_tariffs",
      "must_state": ["calculation_basis", "currency", "exemptions_or_waivers_if_applicable", "payment_timing", "refund_or_reconciliation_route"],
      "publication_blockers": ["fee_required_but_no_active_approved_tariff"]
    },
    {
      "id": "notice.decision_and_appeal",
      "required": true,
      "content_source": "civicos.procedure.approved_decision_and_review_rules",
      "must_state": ["decision_maker_or_authority", "possible_decision_types", "how_the_decision_is_communicated", "review_or_appeal_route_if_available", "applicable_deadline_from_approved_rule"],
      "publication_blockers": ["missing_decision_authority", "missing_approved_review_route_when_legally_required"]
    },
    {
      "id": "notice.save_and_return",
      "required": true,
      "content_source": "civicos.platform.approved_save_notice",
      "must_state": ["whether_progress_is_saved", "how_to_return", "session_expiry_behavior", "what_must_be_submitted_before_deadline_if_any"],
      "publication_blockers": ["save_behavior_not_defined"]
    },
    {
      "id": "notice.accessibility_and_assistance",
      "required": true,
      "content_source": "civicos.platform.approved_assistance_notice",
      "must_state": ["available_assisted_channels", "accessibility_support", "how_to_request_help", "alternative_submission_route_if_available"],
      "publication_blockers": ["assistance_route_not_configured"]
    }
  ],
  "universal_rules": {
    "notices_are_versioned": true,
    "notice_versions_are_snapshotted_at_submission": true,
    "legal_basis_must_resolve_to_approved_law_record": true,
    "deadlines_must_resolve_to_approved_rule": true,
    "translation_must_be_approved_for_publication": true,
    "notices_must_be_available_in_print_channel": true,
    "notices_must_be_keyboard_and_screen_reader_accessible": true
  },
  "country_decisions": [
    "Applicable data-protection law, notice wording and rights.",
    "Required statutory references, decision reasons and review or appeal information.",
    "Legally required retention periods and records-management rules.",
    "Official languages and translations that have legal status."
  ]
}


Important: required: false on the fee notice means it is not applicable when the service is free. It does not permit hiding the fee notice on a service that charges a fee.
1.3 Universal and country-specific rules for all groups
These rules are enforced by CivicOS rather than left to individual form designers.
Control	Classification	Enforced behavior
Stable field and group IDs	Universal	Never reuse an ID for a different meaning.
Immutable approved versions	Universal	Changes create a new version and approval record.
Rule-based validation	Universal	Only registered validation rules can execute. No arbitrary form-authored code.
Required field rationale	Universal	Every required field must have a recorded purpose and lawful/procedural basis.
Evidence traceability	Universal	Each required evidence item references an approved procedure requirement and legal basis or documented non-statutory authority where appropriate.
Official-language translations	Universal	Required labels, hints, errors and notices are complete and reviewed before publication.
Personal-data classification	Universal	Fields have an assigned class and enforcement policy. A class label alone does not grant access.
Fee calculation	Universal	Amounts come from active, approved rules; no applicant-entered government fees.
Cross-register verification	Country-configurable	Only approved exchange services and lawful purposes may be invoked.
Address and identifier formats	Country-configurable	Local formats are added through versioned code lists and rules.
Legal effect and evidentiary standards	Legal review required	The authorized national reviewer approves the relevant law, procedure and accepted evidence.
Retention and disclosure	Legal review required	The records owner and authorized privacy/legal reviewers approve retention, disclosure and access rules.
Standard values sources
These sources must themselves be versioned and maintained as governed records. They are not free-text configuration.
Source ID	Purpose
iso.3166-1.alpha2.current	Country codes based on ISO 3166-1 alpha-2.
civicos.person.name_order.v1	given_family, family_given, single_name, unsegmented, other_or_unknown.
civicos.date.precision.v1	exact, month_year, year_only, estimated, unknown.
civicos.address.kind.v1	street, rural, informal_settlement, landmark, po_box, care_of, international_other.
civicos.address.purpose.v1	residence, business_premises, correspondence, service_location, registered_office, other_approved.
civicos.notification.channel.v1	portal, email, sms, post, assisted_office, other_approved.
civicos.representation.capacity.v1	self, agent, power_of_attorney, legal_guardian, court_appointed_representative, organization_officer, other_approved.
civicos.consent.choice.v1	grant, decline, withdraw, not_applicable.
civicos.signature.method.v1	authenticated_portal_confirmation, approved_digital_signature, uploaded_signed_document, paper_signature, authorized_witnessed_mark, other_approved.
civicos.payment.approved_methods	Only payment methods enabled by the country's approved payment configuration.
civicos.accessibility.accommodation_types.v1	screen_reader_compatible_output, large_text, sign_language_support, interpreter, alternative_format, assisted_completion, step_free_or_accessible_appointment, other_requested_adjustment.
These are stable starting definitions, not a substitute for national configuration. For example, an ISO country code can identify a country; it cannot establish citizenship, residence rights, tax residency or eligibility for a benefit.
1.4 Evidence contract: the mandatory link to law
A reusable group cannot declare that a passport, bank statement, birth certificate or other document is legally required in every country. That requirement belongs to the country's approved procedure package.

Every activated form's evidence requirement must resolve to this record shape:
{
  "schema_version": "civicos.evidence-requirement.v1",
  "evidence_requirement_id": "approved-unique-id",
  "procedure_package_id": "approved-package-id",
  "procedure_package_version": 1,
  "evidence_type": "identity_evidence",
  "required_when_rule_id": "registered-rule-id",
  "legal_basis": {
    "law_record_id": "approved-law-record-id",
    "law_version_id": "approved-law-version-id",
    "provision_reference": "approved-provision-reference",
    "authority_type": "statutory_requirement"
  },
  "accepted_alternatives_source": "approved-evidence-alternatives-source",
  "verification_method_source": "approved-verification-methods-source",
  "retention_rule_id": "approved-retention-rule-id",
  "drafted_by": "authorized-official-id",
  "approved_by": "different-authorized-official-id",
  "status": "approved"
}


The IDs above illustrate the contract's required references; they are not valid national legal references. CivicOS must reject activation until every reference resolves to an actual approved record.

The authority_type must distinguish a statutory requirement from another lawful basis for requesting evidence, such as an approved evidentiary procedure. If the legal authority cannot be established, the evidence requirement cannot be activated.
1.5 The three submission channels
All three channels create the same underlying form submission and procedure case. The channels change the presentation and capture process, not the legal meaning of the fields.

Self-service

Phone-first, accessible digital application.
- Show one question per page when it reduces cognitive load; group genuinely simple related questions.
- Provide save-and-return, progress indication and a check-your-answers page.
- Show evidence requirements and applicable notices before final submission.
- On submission, freeze the submitted field values and the relevant form, package, law and notice versions.


Assisted at an office

An authorized officer helps the applicant complete the same contract.
- Record the officer's identity and the assistance role.
- Distinguish applicant-reported answers from information observed or verified by the officer.
- If identity evidence is inspected, record the evidence type, verification method and outcome.
- Do not treat an officer's assistance as representation, consent or a signature on behalf of the applicant.
- Offer an accessible private environment for restricted or special-category information.


Print and paper

The same fields, evidence requirements and declarations in a printable format.
- Include the form ID, version, language, page number and a unique submission or paper-pack reference.
- Print the legally approved declaration and relevant notice versions.
- Preserve stable field IDs in the form's print-to-data mapping.
- On scanning, store the original scan, the extraction result and any human correction as separate evidence.
- OCR output is a proposed transcription, never a verified fact until the required review is complete.


Additional channels: field capture, offline submission and USSD/SMS are enabled only when appropriate to the service. A short-message interface must not collect documents or sensitive details that its security model cannot safely handle. Offline capture must record the capture time, submitting actor, device or session provenance and synchronization state; conflicting submissions must be resolved through an explicit, auditable workflow, never by silently overwriting the record.
1.6 Data minimisation and access rules
Before a form can be approved, CivicOS must run a field-level minimisation review.

For every field, the package must answer:
1. What decision, action or statutory record requires this information?
2. Which legal provision or approved procedural requirement authorizes its collection?
3. Is it already available through an authorized register or exchange?
4. Can the purpose be achieved with less sensitive data?
5. Who can read it, for what purpose, and for how long?
6. What happens if the applicant cannot supply it?
7. Is the field necessary in all cases, or only under a registered condition?
A required field without a satisfactory answer must block approval. A special-category field requires stronger justification and narrower access. An exchange lookup must be denied unless both the requesting institution and the purpose are authorized. Logging a read is mandatory but does not make an otherwise unauthorized read lawful.
1.7 Standards alignment
CivicOS should use international standards where they fit the data problem, while leaving legal authority to the country:
- ISO 3166 for country codes; not as proof of nationality.
- ISO 19160 for address concepts and address interoperability; national address formats remain configurable.
- UN/CEFACT data models for relevant trade and business information exchange.
- WCO Data Model for customs and cross-border regulatory information.
- HL7 FHIR administrative resources only for applicable administrative interoperability, not clinical records.
- ICAO Doc 9303 for relevant machine-readable travel-document conventions.
- INSPIRE and applicable national geospatial standards for location and spatial data.
- WCAG 2.2 AA for form accessibility, combined with the national language and right-to-left requirements.
These standards guide field representation and exchange. They do not independently authorize a government to collect a field, request a document, share a record or make a decision.
1.8 Part 1 acceptance criteria
The shared form library is ready for the next implementation phase when:
- Every field type has a versioned schema and registered validation rules.
- Every reusable group has an immutable ID, version, multilingual labels, hints and error messages.
- Name, date, address and identity models support incomplete or culturally different records without inventing missing information.
- Every activated evidence requirement resolves to an approved legal basis or other documented lawful authority.
- Fees cannot be entered manually and cannot be collected without an active approved tariff.
- Consent cannot be substituted for statutory authority.
- Representative authority is separated from assistance and access rights.
- Print, self-service and assisted submissions preserve the same field and procedure semantics.
- Offline synchronization, scanning, audit and conflict resolution preserve original evidence.
- Special-category data is excluded unless a specific service has an approved need and access policy.
- All required translations and accessibility checks pass before publication.
Next: Part 2 — Executive government, finance, treasury, budget and revenue. It will catalogue the services and form lifecycles for the Presidency/Prime Minister's Office, Cabinet, Finance, Treasury, Budget and Revenue/Tax, with concrete form IDs and service-specific field contracts—not just references to the shared groups.


CivicOS — Complete Government Form System
Part 2 of 13 — Executive government, finance, treasury, budget and revenue
This part covers six institutional areas:
1. Presidency / Head of State and Prime Minister's Office
2. Cabinet Office and government coordination
3. Ministry of Finance
4. Treasury and public debt management
5. Budget Office and fiscal planning
6. Revenue and Tax Authority
The catalogue includes public, business, inter-institutional and internal forms. Each service is modelled as a complete lifecycle: application or initiation, amendments, review, decision, notification, review or appeal where applicable, and closure or periodic reporting.
Implementation rules for this part
- Universal: CivicOS's legal authority, workflow, audit, versioning, accessibility and data-minimisation controls apply to every form.
- Country-configurable: institutional boundaries, tax types, fiscal calendars, public offices, fee rules, forms of representation and official values are configured by each nation.
- Legal review required: legal powers, tax liabilities, statutory deadlines, budget authority, confidentiality rules, exemptions, appeal rights and the legal effect of declarations must be approved by the country's authorized officials.
- A catalogue entry is a baseline specification, not permission to activate a power that the institution does not legally possess.
- Forms for constitutional offices and executive offices must not grant the executive access to judicial, legislative or independent-institution records.
For readability, the detailed JSON contracts below use the canonical field shape from Part 1. A field's validation entries refer to named rules in CivicOS's validation registry. All referenced value sources, legal records and procedure packages must resolve to actual approved records before production activation.

2.1 Presidency / Head of State
Department A — Constitutional and official correspondence
Service: Official correspondence and petitions
Form ID	Form title	Submitter	Procedure stage	Main outcome
exec.presidency.correspondence.submit	Send an official petition or correspondence	Citizen, business, institution	Intake	Registered correspondence and routing
exec.presidency.correspondence.supplement	Add information to an existing petition	Original submitter or authorized representative	Further information	Updated case evidence
exec.presidency.correspondence.withdraw	Withdraw a petition	Original submitter or authorized representative	Withdrawal	Withdrawal recorded where permitted
exec.presidency.correspondence.complaint	Complain about the handling of a petition	Submitter	Complaint	Service complaint review
exec.presidency.correspondence.referral	Refer correspondence to the responsible authority	Authorized office officer	Referral	Referral to an authorized institution
exec.presidency.correspondence.decision	Record the official response or routing decision	Authorized officer	Decision	Response or referral approved
exec.presidency.correspondence.notice	Notify the submitter of the outcome	Authorized officer or notification service	Notification	Delivery record
Submission fields
- correspondence.subject: text, required; 5–200 characters; administrative.
- correspondence.message: long_text, required; 1–10,000 characters; personal if it identifies an individual or contains personal information.
- correspondence.topic: choice, required; source exec.presidency.correspondence_topics; administrative.
- correspondence.requested_outcome: long_text, optional; maximum 2,000 characters; personal where applicable.
- correspondence.related_case: identifier_reference, conditional; required only if the submitter refers to an existing case; administrative.
- correspondence.attachments: document, optional; each attachment must satisfy the approved file policy and be malware-scanned; classification follows the content.
- correspondence.contact: group core.contact, minimized to the channel needed for a response.
- correspondence.representative: group core.representation, only when acting for another party.
Evidence and legal basis: evidence is optional unless a specific, approved procedure requires it. The Presidency must not require proof of identity merely because a petition is addressed to the Head of State. Any restriction on submission, referral, public disclosure or retention requires an approved legal basis.

Country decisions: constitutional role and petition powers; subjects the Presidency may handle; routing rules; whether anonymous petitions are accepted; records retention; any special procedure for constitutional complaints.

Channels: self-service, assisted, print, postal intake; offline capture for authorized offices.
Service: Official acts and appointments register
This is an internal, legally controlled workflow, not a public application for the President to issue any desired act.
Form ID	Form title	Submitter	Procedure stage	Main outcome
exec.presidency.act.proposal	Propose an official act for review	Authorized institution	Proposal	Draft act registered
exec.presidency.act.legal_review	Record legal review of an official act	Authorized legal officer	Review	Legal review record
exec.presidency.act.approval	Record approval or refusal of an official act	Authorized constitutional office-holder or delegate	Decision	Approved, refused or returned act
exec.presidency.act.publication	Submit an approved act for publication	Authorized registry officer	Publication	Publication record
exec.presidency.act.correction	Correct a publication or clerical error	Authorized records officer	Amendment	Versioned correction
exec.presidency.act.withdrawal_request	Request withdrawal or revocation of an act	Authorized institution	Review	Revocation process initiated
exec.presidency.act.revocation_decision	Record a revocation decision	Legally authorized decision-maker	Decision	Revocation recorded if lawful
Specific fields
- act.kind: choice, required; exec.presidency.act_types; administrative.
- act.title: localized_text, required; maximum 300 characters; administrative.
- act.draft_document: document, required; restricted until publication where lawfully required.
- act.proposing_institution: registry_reference, required; source civicos.registry.institutions; administrative.
- act.legal_basis_refs: registry_reference, required; must resolve to approved law records and specific provisions; administrative.
- act.authority_check: choice, required; system-generated from the authority registry; administrative.
- act.legal_review_record: identifier_reference, required before approval; restricted.
- act.decision: choice, required at the decision stage; values approve, refuse, return_for_revision, not_applicable_under_law; restricted before publication.
- act.effective_date: date, conditionally required by the approved legal rule; administrative.
- act.publication_reference: identifier_reference, required when publication is legally required; administrative.
Validation and approval: no act proceeds unless the configured authority registry confirms the office's power and the applicable law version. Proposal and approval must be performed by distinct authorized people where the nation's approved control policy requires separation of duties. A draft, legal review, approval, signature and publication are distinct events.

Country decisions: constitutional instruments and act types; appointment powers; signature and countersignature rules; publication requirements; effective-date rules; revocation and correction powers.

Channels: authorized officer workspace and secure inter-institution exchange; no public self-service submission for official approval.
2.2 Prime Minister's Office and Cabinet Office
These are related but distinct functions. A country may combine them or place them in separate institutions. CivicOS must preserve the actual legal structure configured by the country rather than assuming a universal hierarchy.
Department A — Cabinet agenda and decisions
Form ID	Form title	Submitter	Procedure stage	Main outcome
exec.cabinet.agenda.propose	Propose an item for a Cabinet meeting	Authorized ministry or Cabinet officer	Proposal	Agenda item submitted
exec.cabinet.paper.submit	Submit a Cabinet paper	Authorized ministry	Submission	Paper registered for review
exec.cabinet.paper.revise	Revise a Cabinet paper	Submitting institution	Further information	New paper version
exec.cabinet.paper.legal_review	Record legal and authority review	Authorized legal officer	Review	Legal review completed or returned
exec.cabinet.paper.fiscal_review	Record fiscal implications review	Authorized finance officer	Review	Fiscal review completed or returned
exec.cabinet.agenda.approve	Approve the Cabinet agenda	Authorized Cabinet official	Approval	Agenda approved
exec.cabinet.decision.record	Record a Cabinet decision	Authorized Cabinet secretary	Decision recording	Decision record created
exec.cabinet.decision.correct	Correct a Cabinet decision record	Authorized Cabinet secretary	Amendment	Versioned correction
exec.cabinet.decision.action_assign	Assign an approved decision action	Authorized Cabinet officer	Implementation	Action assigned to a lawful owner
exec.cabinet.action.update	Report progress on a Cabinet action	Assigned institution	Monitoring	Progress record
exec.cabinet.action.close	Confirm completion of a Cabinet action	Assigned institution and authorized reviewer	Closure	Action closed or returned
exec.cabinet.decision.distribution	Record controlled distribution of a decision	Authorized Cabinet officer	Notification	Distribution audit record
Cabinet paper: full field contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "exec.cabinet.paper.submit",
  "record_type": "exec.cabinet.paper",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "paper.title",
      "type": "localized_text",
      "required": true,
      "validation": [{"rule": "required", "params": {}}, {"rule": "length", "params": {"min": 5, "max": 300}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Title of the Cabinet paper"},
      "hint": {"en": "Use a short title that states the matter requiring Cabinet consideration."},
      "error_text": {"en": {"required": "Enter a title.", "length": "Use between 5 and 300 characters."}}
    },
    {
      "id": "paper.sponsoring_institution",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "institution_active", "params": {}}, {"rule": "actor_authorized_for_institution", "params": {}}],
      "values_source": "civicos.registry.institutions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Sponsoring institution"},
      "hint": {"en": "Select the institution formally submitting the paper."},
      "error_text": {"en": {"institution_active": "Select an active institution.", "actor_authorized_for_institution": "You are not authorized to submit on behalf of this institution."}}
    },
    {
      "id": "paper.decision_requested",
      "type": "long_text",
      "required": true,
      "validation": [{"rule": "required", "params": {}}, {"rule": "length", "params": {"min": 20, "max": 5000}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Decision requested"},
      "hint": {"en": "State precisely what Cabinet is being asked to decide."},
      "error_text": {"en": {"required": "State the decision requested.", "length": "Use between 20 and 5,000 characters."}}
    },
    {
      "id": "paper.policy_context",
      "type": "long_text",
      "required": true,
      "validation": [{"rule": "length", "params": {"min": 20, "max": 10000}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Background and policy context"},
      "hint": {"en": "Explain the issue, options considered and intended public outcome."},
      "error_text": {"en": {"length": "Provide a sufficiently clear background within the allowed length."}}
    },
    {
      "id": "paper.legal_basis_refs",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "all_references_resolve_to_approved_law", "params": {}}],
      "values_source": "civicos.registry.law_provisions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Legal authority and constraints"},
      "hint": {"en": "Reference the approved laws and provisions relevant to the proposal."},
      "error_text": {"en": {"all_references_resolve_to_approved_law": "Every legal reference must resolve to an approved law and provision."}}
    },
    {
      "id": "paper.fiscal_impact",
      "type": "money",
      "required": false,
      "validation": [{"rule": "requires_approved_fiscal_estimate", "params": {}}],
      "values_source": "civicos.finance.approved_estimates",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Estimated fiscal impact"},
      "hint": {"en": "Use an approved fiscal estimate; do not enter an unsupported figure."},
      "error_text": {"en": {"requires_approved_fiscal_estimate": "Link an approved fiscal estimate or record that no estimate is applicable."}}
    },
    {
      "id": "paper.risk_and_alternatives",
      "type": "long_text",
      "required": true,
      "validation": [{"rule": "length", "params": {"min": 10, "max": 10000}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Risks and alternatives"},
      "hint": {"en": "Explain material risks and the principal alternatives considered."},
      "error_text": {"en": {"length": "Describe the material risks and alternatives."}}
    },
    {
      "id": "paper.supporting_documents",
      "type": "document",
      "required": false,
      "validation": [{"rule": "file_type_allowlist", "params": {}}, {"rule": "malware_scan_passed", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "supporting_paper", "when": "as_required_by_the_approved_cabinet_procedure"}],
      "label": {"en": "Supporting documents"},
      "hint": {"en": "Upload only documents relevant to the decision requested."},
      "error_text": {"en": {"file_type_allowlist": "This file type is not accepted.", "malware_scan_passed": "The file could not be accepted safely."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Cabinet paper types and required review paths.",
    "Which matters require legal, fiscal, human-rights or other impact review.",
    "Cabinet confidentiality classifications and publication rules.",
    "Who may sponsor papers and which office may approve the agenda."
  ]
}


Required procedure controls: a Cabinet decision is not the same as a statute, budget appropriation, executive order or administrative instruction. CivicOS must record its actual legal category, the authority of the decision-maker and the actions the decision lawfully authorizes. An assigned action must not override another institution's independence or exceed its statutory powers.
Department B — Government programme coordination
Form ID	Form title	Submitter	Procedure stage	Main outcome
exec.pmo.programme.propose	Propose a government programme	Authorized ministry	Proposal	Programme proposal
exec.pmo.programme.approve	Approve a programme plan	Authorized decision-maker	Decision	Approved or returned plan
exec.pmo.milestone.baseline	Register programme milestones	Programme owner	Planning	Approved milestone baseline
exec.pmo.milestone.update	Update milestone progress	Programme owner	Monitoring	Progress record
exec.pmo.risk.register	Register a programme delivery risk	Programme owner	Monitoring	Risk record
exec.pmo.issue.escalate	Escalate a delivery issue	Programme owner	Escalation	Issue assigned for resolution
exec.pmo.benefit.report	Report programme benefits	Responsible institution	Evaluation	Benefits evidence
exec.pmo.change.request	Request a programme baseline change	Programme owner	Change control	Approved, refused or returned change
exec.pmo.programme.close	Close a completed programme	Programme owner and authorized reviewer	Closure	Closure and lessons record
Specific fields
- programme.title: localized_text, required, 5–300 characters, administrative.
- programme.sponsor: registry_reference, required, source civicos.registry.authorized_offices, administrative.
- programme.objectives: long_text, required, 20–5,000 characters, administrative.
- programme.authority_refs: registry_reference, required; approved legal or Cabinet authority references, administrative.
- programme.budget_ref: registry_reference, conditional on programme funding; approved budget allocation, administrative.
- programme.milestones: structured repeated entries containing milestone.id (text, required), milestone.description (text, required), milestone.target_date (date, required if the approved plan requires a date), milestone.owner (registry_reference, required), and milestone.evidence_rule (identifier_reference, required).
- programme.baseline_version: number, system-generated, required; administrative.
- programme.change_reason: long_text, required for a baseline change; administrative.
- programme.reported_status: choice, required for progress reports; source exec.programme.status.v1; administrative.
- programme.evidence: document, conditional on the approved monitoring plan; classification follows the evidence.
Validation: the programme owner must be an authorized institutional office; financial figures must link to approved fiscal records; milestone changes must preserve the prior baseline; reported progress must be distinguished from independently verified completion.

Country decisions: national planning framework; Cabinet mandate; programme categories; fiscal and performance reporting cycles; who can approve a baseline and who verifies benefits.

2.3 Ministry of Finance
The Ministry of Finance's exact responsibilities differ across countries. CivicOS must configure whether fiscal policy, public debt, government accounting, financial-sector policy, revenue policy, public-private partnerships and state-owned enterprises belong to this ministry or to other authorities.
Department A — Fiscal policy and financial analysis
Form ID	Form title	Submitter	Procedure stage	Main outcome
finance.policy.proposal	Submit a fiscal policy proposal	Authorized ministry or finance officer	Proposal	Policy proposal
finance.policy.impact_assessment	Record fiscal impact assessment	Authorized fiscal analyst	Review	Impact assessment
finance.policy.consultation	Submit a fiscal-policy consultation response	Citizen, business, institution	Consultation	Consultation submission
finance.policy.consultation_summary	Publish or approve the consultation summary	Authorized officer	Review	Approved summary
finance.forecast.submit	Submit a macro-fiscal forecast	Authorized analyst or institution	Forecast cycle	Forecast record
finance.forecast.revise	Revise a forecast with supporting evidence	Authorized analyst	Amendment	Versioned forecast
finance.fiscal_risk.submit	Report a fiscal risk	Public institution or authorized analyst	Monitoring	Fiscal risk record
finance.fiscal_risk.review	Review and disposition a fiscal risk	Authorized reviewer	Review	Risk treatment record
finance.policy.decision	Record an authorized fiscal-policy decision	Authorized decision-maker	Decision	Approved decision
finance.policy.review_request	Request review of a policy-process decision	Eligible submitter under configured procedure	Review	Review case
Specific fields
- fiscal_policy.title: localized_text, required, 5–300 characters, administrative.
- fiscal_policy.objective: long_text, required, 20–5,000 characters, administrative.
- fiscal_policy.authority_refs: registry_reference, required; approved law or policy authority, administrative.
- fiscal_policy.baseline_period: choice, required; source civicos.finance.fiscal_periods, administrative.
- fiscal_policy.estimate_refs: registry_reference, conditional when estimates exist; approved forecast or budget records, administrative.
- fiscal_policy.assumptions: long_text, required for a forecast or impact assessment, administrative.
- fiscal_policy.uncertainty: long_text, required for a forecast, administrative.
- fiscal_policy.risk_refs: registry_reference, optional; linked risk records, administrative.
- fiscal_policy.consultation_response: long_text, required for a consultation submission, personal where identifiable.
- fiscal_policy.supporting_evidence: document, optional unless the approved procedure requires it, classification follows the content.
Country decisions: forecast methodology; fiscal reporting standards; official macroeconomic assumptions; fiscal-risk categories; consultation rights; publication rules and decision-review powers.
Department B — Public financial management and government accounting policy
Form ID	Form title	Submitter	Procedure stage	Main outcome
finance.accounting.standard_proposal	Propose an accounting-policy change	Authorized finance officer	Proposal	Proposed policy
finance.accounting.policy_review	Review an accounting-policy proposal	Authorized accounting reviewer	Review	Review record
finance.accounting.policy_approval	Approve an accounting-policy change	Authorized decision-maker	Decision	Approved policy version
finance.chart_of_accounts.change	Request a chart-of-accounts change	Authorized finance or accounting officer	Change control	Approved, refused or returned change
finance.reporting.instruction	Issue a financial reporting instruction	Authorized authority	Instruction	Versioned instruction
finance.reporting.submission	Submit an institutional financial report	Public institution	Reporting	Financial report received
finance.reporting.correction	Correct a submitted financial report	Submitting institution	Amendment	Corrected report with full history
finance.reporting.noncompliance	Report a financial reporting non-compliance	Authorized officer	Compliance	Compliance case
finance.reporting.exception_request	Request an authorized reporting exception	Public institution	Exception review	Exception decision
Specific fields
- accounting.policy_type: choice, required; source finance.accounting.policy_types; administrative.
- accounting.policy_version: number, system-controlled, required; administrative.
- accounting.standard_refs: registry_reference, required where an adopted standard is cited; source civicos.registry.accounting_standards; administrative.
- accounting.chart_change: structured entries with account_code (text, required), description (localized_text, required), change_type (choice, required), effective_period (registry_reference, required), and justification (long_text, required).
- accounting.reporting_period: registry_reference, required; approved fiscal period, administrative.
- accounting.reporting_entity: registry_reference, required; authorized institution, administrative.
- accounting.financial_data_ref: registry_reference, required; links to the approved financial dataset or report, administrative.
- accounting.correction_reason: long_text, required for corrections, administrative.
- accounting.exception_basis: registry_reference, required for exceptions; approved legal or policy provision, administrative.
- accounting.exception_end_date: date, required if the approved exception rule has an expiry, administrative.
Validation: no form may create or modify accounting codes directly in a live ledger. It creates a controlled change request, reviewed and approved separately. Financial records must preserve the original submission, the corrected version and the reason for the correction.

Country decisions: adopted accounting standards; chart-of-accounts structure; fiscal periods; financial-reporting entities; consolidation rules; exceptions and audit requirements.
Department C — Government grants and fiscal transfers
This service exists only where the Ministry of Finance has lawful authority to administer the relevant grants or transfers. It must not become a generic route to bypass the responsible sector ministry or local authority.
Form ID	Form title	Submitter	Procedure stage	Main outcome
finance.transfer.scheme.propose	Propose a grant or fiscal-transfer scheme	Authorized institution	Proposal	Scheme proposal
finance.transfer.scheme.approve	Approve a grant or transfer scheme	Authorized decision-maker	Decision	Approved scheme
finance.transfer.application	Apply for a grant or fiscal transfer	Eligible institution or applicant	Application	Application case
finance.transfer.progress_report	Submit a transfer-use progress report	Recipient	Monitoring	Progress record
finance.transfer.change_request	Request a change to approved funding use	Recipient	Amendment	Change decision
finance.transfer.claim	Submit a payment claim under an approved award	Recipient	Payment	Payment claim
finance.transfer.reconciliation	Reconcile funds received and spent	Recipient	Reconciliation	Reconciliation record
finance.transfer.surrender	Surrender unspent or ineligible funds	Recipient	Closure	Surrender record
finance.transfer.complaint	Complain about administration of a transfer	Eligible applicant or recipient	Complaint	Complaint case
finance.transfer.recovery_decision	Record an authorized recovery decision	Authorized officer	Decision	Recovery case or closure
Specific fields
- transfer.scheme_ref: registry_reference, required for applications; approved scheme, administrative.
- transfer.applicant: organisation, required unless an approved scheme allows another applicant type, administrative.
- transfer.legal_basis_refs: registry_reference, required, administrative.
- transfer.purpose: choice, required; scheme-specific approved categories, administrative.
- transfer.requested_amount: money, required; must be in the scheme's approved currency and within configured submission limits, administrative.
- transfer.requested_amount_basis: long_text, required, administrative.
- transfer.budget_allocation_ref: registry_reference, required before an award can be approved; administrative.
- transfer.eligibility_evidence: document, conditional on the approved scheme's evidence requirements, classification follows the evidence.
- transfer.declaration: group core.declaration_signature, required when the approved scheme requires attestation.
- transfer.bank_account: group core.payout_account, only if the transfer is paid to a bank account and this is authorized.
- transfer.progress: structured entries containing period_ref (registry_reference), amount_received (money), amount_spent (money), outputs_reported (long_text) and evidence_refs (registry_reference).
- transfer.recovery_basis: registry_reference, required for a recovery decision; approved legal provision and decision rule, administrative.
Country decisions: transfer schemes and eligibility; authorized funding purposes; award limits; payment schedules; evidence and reporting duties; recovery and appeal authority.
2.4 Treasury and Public Debt Management
Treasury controls must separate the authority to commit public money, the authority to authorize a payment, the authority to execute it and the authority to reconcile it. CivicOS must not combine these powers merely because an institution is small.
Department A — Payment authorization and cash management
Form ID	Form title	Submitter	Procedure stage	Main outcome
treasury.payment.instruction	Submit a payment instruction	Authorized spending institution	Payment initiation	Payment instruction
treasury.payment.supporting_evidence	Supply missing payment evidence	Submitting institution	Further information	Evidence attached
treasury.payment.verify	Record payment verification	Authorized treasury verifier	Verification	Verified or returned instruction
treasury.payment.approve	Approve or refuse a payment	Authorized payment approver	Decision	Approval or refusal
treasury.payment.execute	Record execution by the payment system	Authorized payment service	Execution	Execution result
treasury.payment.reject	Record a rejected or failed payment	Payment service or authorized officer	Exception	Exception case
treasury.payment.cancel_request	Request cancellation of a payment	Authorized spending institution	Cancellation request	Cancellation review
treasury.payment.refund	Request or record a refund	Authorized institution or payment service	Refund	Refund case
treasury.payment.reconcile	Reconcile payment against the treasury ledger	Authorized reconciliation officer	Reconciliation	Reconciled or disputed payment
treasury.payment.dispute	Dispute a payment or reconciliation result	Authorized institution	Dispute	Dispute case
treasury.payment.correction	Correct payment metadata	Authorized treasury officer	Amendment	Audited correction
Payment instruction: full field contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "treasury.payment.instruction",
  "record_type": "treasury.payment_instruction",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "payment_instruction.paying_entity",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "institution_active", "params": {}}, {"rule": "actor_authorized_for_institution", "params": {}}],
      "values_source": "civicos.registry.institutions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Paying institution"},
      "hint": {"en": "Select the institution authorized to make this payment."},
      "error_text": {"en": {"institution_active": "Select an active institution.", "actor_authorized_for_institution": "You are not authorized to submit payments for this institution."}}
    },
    {
      "id": "payment_instruction.payee",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "payee_type_allowed", "params": {}}],
      "values_source": "civicos.registry.approved_payees",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Payee"},
      "hint": {"en": "Select the payee linked to the approved obligation."},
      "error_text": {"en": {"payee_type_allowed": "Select an eligible payee record."}}
    },
    {
      "id": "payment_instruction.obligation_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "obligation_open_and_payable", "params": {}}],
      "values_source": "civicos.finance.approved_obligations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Approved obligation"},
      "hint": {"en": "Select the invoice, award, payroll batch or other approved obligation being paid."},
      "error_text": {"en": {"obligation_open_and_payable": "The obligation is not approved, payable or available for this payment."}}
    },
    {
      "id": "payment_instruction.budget_allocation_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "available_budget_covers_payment", "params": {}}],
      "values_source": "civicos.finance.approved_budget_allocations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Budget allocation"},
      "hint": {"en": "Select the approved allocation that funds the payment."},
      "error_text": {"en": {"available_budget_covers_payment": "The allocation is missing, inactive or insufficient."}}
    },
    {
      "id": "payment_instruction.amount",
      "type": "money",
      "required": true,
      "validation": [{"rule": "amount_matches_approved_obligation", "params": {}}, {"rule": "currency_matches_obligation", "params": {}}],
      "values_source": "civicos.finance.approved_obligations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Payment amount"},
      "hint": {"en": "The amount must match the approved obligation and any authorized partial-payment rule."},
      "error_text": {"en": {"amount_matches_approved_obligation": "The amount does not match the approved obligation.", "currency_matches_obligation": "The currency must match the obligation."}}
    },
    {
      "id": "payment_instruction.supporting_documents",
      "type": "document",
      "required": false,
      "validation": [{"rule": "evidence_requirements_satisfied", "params": {}}, {"rule": "malware_scan_passed", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "payment_support", "when": "as_required_by_the_approved_payment_procedure"}],
      "label": {"en": "Supporting payment documents"},
      "hint": {"en": "Attach only evidence required by the payment procedure."},
      "error_text": {"en": {"evidence_requirements_satisfied": "Required payment evidence is missing.", "malware_scan_passed": "The file could not be accepted safely."}}
    },
    {
      "id": "payment_instruction.payment_purpose",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "purpose_matches_obligation", "params": {}}],
      "values_source": "civicos.finance.payment_purposes",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Payment purpose"},
      "hint": {"en": "Select the purpose associated with the approved obligation."},
      "error_text": {"en": {"purpose_matches_obligation": "The selected purpose does not match the obligation."}}
    },
    {
      "id": "payment_instruction.requested_execution_date",
      "type": "date",
      "required": false,
      "validation": [{"rule": "date_allowed_by_treasury_calendar", "params": {}}],
      "values_source": "civicos.finance.treasury_calendar",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Requested payment date"},
      "hint": {"en": "Choose a date allowed by the treasury payment calendar."},
      "error_text": {"en": {"date_allowed_by_treasury_calendar": "Choose an allowed payment date."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Payment authorization thresholds and delegated approval limits.",
    "Permitted payment instruments, settlement systems and payment calendars.",
    "Required separation between instruction, approval, execution and reconciliation.",
    "Retention, audit and disclosure rules for treasury payment records."
  ]
}


Universal control: the submitting officer cannot approve their own instruction where separation of duties is required. An approval cannot be treated as proof that the payment was executed. An execution confirmation cannot be treated as reconciliation. Each stage has its own actor, timestamp, evidence and outcome.
Department B — Cash forecasting and liquidity
Form ID	Form title	Submitter	Procedure stage	Main outcome
treasury.cash_forecast.submit	Submit an institutional cash forecast	Public institution	Forecast cycle	Forecast received
treasury.cash_forecast.revise	Revise a cash forecast	Submitting institution	Amendment	Versioned forecast
treasury.cash_position.report	Report an authorized cash position	Treasury or authorized institution	Reporting	Cash position record
treasury.liquidity.shortfall	Report an expected liquidity shortfall	Treasury analyst	Exception	Shortfall case
treasury.liquidity.response	Propose a liquidity response	Authorized treasury officer	Response planning	Response proposal
treasury.cash_forecast.review	Review forecast assumptions and variance	Authorized reviewer	Review	Review record
treasury.cash_forecast.close	Close a forecasting period	Authorized treasury officer	Closure	Period closed
Specific fields
- cash_forecast.institution: registry_reference, required; authorized reporting institution.
- cash_forecast.period: registry_reference, required; configured fiscal period.
- cash_forecast.currency: choice, required; source civicos.finance.approved_currencies.
- cash_forecast.inflows: repeated entries with source_category (choice, required), expected_amount (money, required), expected_date (date, conditional if the forecast is date-specific), source_record_ref (registry_reference, conditional if based on an existing receivable).
- cash_forecast.outflows: equivalent structure using approved expenditure categories and payable references.
- cash_forecast.assumptions: long_text, required; administrative.
- cash_forecast.confidence_basis: choice, required; source civicos.finance.forecast_basis; administrative.
- cash_forecast.previous_version_ref: identifier_reference, required for a revision.
- cash_forecast.variance_explanation: long_text, required when variance exceeds a configured review threshold.
- cash_forecast.supporting_evidence: document, conditional under the approved reporting procedure.
Country decisions: treasury reporting entities; forecast horizons; approved cash categories; reconciliation frequency; variance thresholds and escalation authority.
Department C — Public debt and guarantees
Form ID	Form title	Submitter	Procedure stage	Main outcome
treasury.debt.proposal	Propose a borrowing transaction	Authorized debt-management officer	Proposal	Borrowing proposal
treasury.debt.legal_review	Record legal review of borrowing authority	Authorized legal reviewer	Review	Legal review record
treasury.debt.fiscal_review	Record debt sustainability and fiscal review	Authorized fiscal reviewer	Review	Fiscal review record
treasury.debt.approval	Approve or refuse a borrowing transaction	Legally authorized decision-maker	Decision	Decision record
treasury.debt.transaction.register	Register an executed debt transaction	Authorized debt officer	Registration	Debt record
treasury.debt.terms.amend	Register an amendment to debt terms	Authorized debt officer	Amendment	Versioned terms
treasury.debt.service.payment	Submit a debt-service payment instruction	Authorized debt officer	Payment	Payment instruction
treasury.debt.guarantee.application	Apply for a government guarantee	Eligible institution under national law	Application	Guarantee case
treasury.debt.guarantee.review	Record a guarantee risk review	Authorized reviewer	Review	Risk review record
treasury.debt.guarantee.decision	Approve or refuse a guarantee	Authorized decision-maker	Decision	Guarantee decision
treasury.debt.guarantee.call	Submit a claim under a government guarantee	Eligible beneficiary	Claim	Guarantee claim
treasury.debt.disclosure	Submit a required debt disclosure	Authorized reporting entity	Reporting	Disclosure record
treasury.debt.reconciliation	Reconcile debt balances and payments	Authorized debt accountant	Reconciliation	Reconciled or disputed balance
Specific fields
- debt.proposal_type: choice, required; source treasury.debt.instrument_types.
- debt.borrower: registry_reference, required; authorized borrower or government entity.
- debt.lender: registry_reference, required once identified; approved lender registry or controlled external-party record.
- debt.currency: choice, required; approved currency source.
- debt.principal: money, required for a transaction proposal; must use the configured currency and approved estimate source.
- debt.terms_document: document, required before transaction approval when terms are documented externally.
- debt.legal_authority: registry_reference, required; approved law, appropriation, borrowing limit or other applicable authority.
- debt.fiscal_risk_review: identifier_reference, required before approval when required by the procedure.
- debt.maturity_date: date, required when defined by the proposed instrument.
- debt.payment_schedule_ref: registry_reference, required for a registered debt instrument with scheduled payments.
- debt.guarantee_exposure: money, required for a guarantee proposal; source must be an approved exposure calculation.
- debt.guarantee_beneficiary: registry_reference, required.
- debt.disclosure_period: registry_reference, required for reporting.
- debt.balance_evidence: document, conditional on the approved reconciliation procedure.
Country decisions: borrowing powers and limits; parliamentary or other approvals; permitted instruments; debt disclosure standards; guarantee authority; risk-review requirements; treatment of contingent liabilities; public disclosure and confidentiality rules.

2.5 Budget Office and Fiscal Planning
Department A — Budget preparation and submission
Form ID	Form title	Submitter	Procedure stage	Main outcome
budget.circular.issue	Prepare and issue a budget call circular	Authorized budget officer	Planning	Approved circular
budget.ceiling.propose	Propose an institutional budget ceiling	Authorized budget analyst	Planning	Proposed ceiling
budget.ceiling.approve	Approve an institutional budget ceiling	Authorized decision-maker	Decision	Approved ceiling
budget.bid.submit	Submit an institutional budget request	Public institution	Submission	Budget bid
budget.bid.revise	Revise a budget request	Submitting institution	Amendment	Versioned bid
budget.bid.justification	Supply missing budget justification	Submitting institution	Further information	Additional evidence
budget.programme.costing	Submit programme costing	Public institution	Review	Costing record
budget.capital.project.submit	Submit a capital project for budget consideration	Authorized institution	Proposal	Capital project proposal
budget.capital.project.appraisal	Record capital-project appraisal	Authorized reviewer	Review	Appraisal record
budget.negotiation.record	Record a budget negotiation outcome	Authorized budget officer	Negotiation	Negotiation record
budget.allocation.propose	Propose a budget allocation	Authorized budget officer	Proposal	Allocation proposal
budget.allocation.approve	Approve a budget allocation	Authorized decision-maker	Decision	Approved allocation
budget.allocation.notify	Notify an institution of its approved allocation	Budget Office	Notification	Delivery record
budget.bid.withdraw	Withdraw a budget request	Submitting institution	Withdrawal	Withdrawal record
Institutional budget bid: full field contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "budget.bid.submit",
  "record_type": "budget.institutional_bid",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "budget_bid.institution",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "institution_active", "params": {}}, {"rule": "authorized_budget_submitter", "params": {}}],
      "values_source": "civicos.registry.institutions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Submitting institution"},
      "hint": {"en": "Select the institution authorized to submit this bid."},
      "error_text": {"en": {"institution_active": "Select an active institution.", "authorized_budget_submitter": "You are not authorized to submit a budget bid for this institution."}}
    },
    {
      "id": "budget_bid.fiscal_period",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "budget_period_open", "params": {}}],
      "values_source": "civicos.finance.budget_periods",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Budget period"},
      "hint": {"en": "Select an open budget period."},
      "error_text": {"en": {"budget_period_open": "The selected budget period is not open for submissions."}}
    },
    {
      "id": "budget_bid.ceiling_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "ceiling_active_for_institution_and_period", "params": {}}],
      "values_source": "civicos.finance.approved_budget_ceilings",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Approved budget ceiling"},
      "hint": {"en": "Select the ceiling that applies to this institution and period."},
      "error_text": {"en": {"ceiling_active_for_institution_and_period": "No applicable approved ceiling was found."}}
    },
    {
      "id": "budget_bid.programme_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "programme_belongs_to_institution", "params": {}}],
      "values_source": "civicos.finance.registered_programmes",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Programme or service"},
      "hint": {"en": "Select the programme for which funding is requested."},
      "error_text": {"en": {"programme_belongs_to_institution": "Select a programme owned by the submitting institution."}}
    },
    {
      "id": "budget_bid.objective",
      "type": "long_text",
      "required": true,
      "validation": [{"rule": "length", "params": {"min": 20, "max": 5000}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Purpose of the funding request"},
      "hint": {"en": "Explain the public service or result the funding will support."},
      "error_text": {"en": {"length": "Provide a clear explanation within the allowed length."}}
    },
    {
      "id": "budget_bid.requested_amount",
      "type": "money",
      "required": true,
      "validation": [{"rule": "currency_matches_budget_period", "params": {}}, {"rule": "within_authorized_submission_bounds", "params": {}}],
      "values_source": "civicos.finance.budget_parameters",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Total funding requested"},
      "hint": {"en": "Enter the amount requested in the budget's configured currency."},
      "error_text": {"en": {"currency_matches_budget_period": "Use the configured budget currency.", "within_authorized_submission_bounds": "The request is outside the permitted submission bounds."}}
    },
    {
      "id": "budget_bid.cost_breakdown",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "approved_costing_complete", "params": {}}],
      "values_source": "civicos.finance.cost_estimates",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Cost breakdown"},
      "hint": {"en": "Link the approved or submitted breakdown of the requested costs."},
      "error_text": {"en": {"approved_costing_complete": "Provide a complete cost breakdown."}}
    },
    {
      "id": "budget_bid.performance_targets",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "approved_indicators_resolve", "params": {}}],
      "values_source": "civicos.performance.approved_indicators",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Expected results"},
      "hint": {"en": "Link the indicators and targets approved for this programme."},
      "error_text": {"en": {"approved_indicators_resolve": "Select valid programme indicators and targets."}}
    },
    {
      "id": "budget_bid.justification_document",
      "type": "document",
      "required": false,
      "validation": [{"rule": "evidence_requirements_satisfied", "params": {}}, {"rule": "malware_scan_passed", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "budget_justification", "when": "as_required_by_the_approved_budget_procedure"}],
      "label": {"en": "Supporting budget documents"},
      "hint": {"en": "Attach the evidence required by the budget call circular."},
      "error_text": {"en": {"evidence_requirements_satisfied": "Required budget evidence is missing.", "malware_scan_passed": "The file could not be accepted safely."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Budget calendar and submission windows.",
    "Budget classifications and chart-of-accounts mapping.",
    "Institutional ceilings, permitted adjustments and approval authority.",
    "Required performance indicators and capital-project appraisal rules."
  ]
}


Universal controls: a bid must not be mistaken for an appropriation. Approval of a budget bid is not payment authorization. A budget ceiling, proposed request, approved allocation and enacted appropriation are distinct record types with separate legal states.
Department B — Budget execution and change control
Form ID	Form title	Submitter	Procedure stage	Main outcome
budget.execution.commitment	Register a proposed financial commitment	Authorized spending institution	Commitment	Commitment record
budget.execution.commitment.approve	Approve or refuse a commitment	Authorized officer	Decision	Commitment decision
budget.execution.reallocation.request	Request a budget reallocation	Public institution	Amendment	Reallocation request
budget.execution.reallocation.approve	Approve or refuse a reallocation	Authorized decision-maker	Decision	Reallocation decision
budget.execution.supplementary.request	Request supplementary funding	Public institution	Proposal	Supplementary request
budget.execution.virement	Request an authorized transfer between budget lines	Public institution	Amendment	Transfer decision
budget.execution.variance.report	Report a material budget variance	Public institution	Reporting	Variance record
budget.execution.underspend.report	Report expected underspending	Public institution	Reporting	Underspend record
budget.execution.overrun.report	Report a forecast or actual overrun	Public institution	Exception	Overrun case
budget.execution.year_end	Submit year-end budget closure information	Public institution	Closure	Year-end submission
budget.execution.correction	Correct a submitted execution report	Public institution	Amendment	Versioned correction
Specific fields
- execution.institution: registry_reference, required.
- execution.budget_allocation_ref: registry_reference, required; approved allocation.
- execution.budget_line_ref: registry_reference, required; approved budget line.
- execution.transaction_period: registry_reference, required; configured fiscal period.
- execution.change_type: choice, required for a change request; source budget.execution.change_types.
- execution.current_amount: money, required and system-derived from the approved ledger where available.
- execution.proposed_amount: money, required for a change request; must be within the legal and policy bounds.
- execution.reason: long_text, required for all changes and exceptions.
- execution.legal_authority_ref: registry_reference, required where the change requires a specific legal power or appropriation authority.
- execution.impact_refs: registry_reference, required for a material change; approved forecasts, programme records or commitments.
- execution.supporting_evidence: document, conditional on the approved procedure.
- execution.approval_record: identifier_reference, system-created after the decision stage.
Country decisions: permitted reallocation types; who can approve each type; whether supplementary appropriation requires legislative action; fiscal thresholds; year-end closure and carry-forward rules.
Department C — Public investment and capital budgeting
Form ID	Form title	Submitter	Procedure stage	Main outcome
budget.capital.concept	Submit a capital-project concept	Public institution	Proposal	Concept record
budget.capital.pre_feasibility	Submit a pre-feasibility assessment	Project owner	Appraisal	Pre-feasibility record
budget.capital.feasibility	Submit a feasibility assessment	Project owner	Appraisal	Feasibility record
budget.capital.environmental_clearance	Link required environmental authorization	Project owner	Clearance	Clearance record
budget.capital.land_readiness	Record land-access and acquisition readiness	Project owner	Readiness	Land-readiness record
budget.capital.procurement_strategy	Submit the procurement strategy	Project owner	Planning	Strategy record
budget.capital.appraisal_decision	Approve, refuse or return a project appraisal	Authorized decision-maker	Decision	Appraisal decision
budget.capital.change_request	Request a material project-baseline change	Project owner	Change control	Change decision
budget.capital.completion_report	Submit a capital-project completion report	Project owner	Closure	Completion record
budget.capital.benefits_review	Review realized project benefits	Authorized reviewer	Evaluation	Benefits assessment
Specific fields
- capital.project_title: localized_text, required.
- capital.sponsoring_institution: registry_reference, required.
- capital.project_location: place, required when the project is location-specific.
- capital.objectives: long_text, required.
- capital.legal_mandate_ref: registry_reference, required.
- capital.estimated_cost: money, required; approved costing record or supported estimate.
- capital.funding_sources: repeated entries with source_type (choice), source_ref (registry_reference), amount (money).
- capital.feasibility_ref: identifier_reference, required before final appraisal if the procedure requires feasibility.
- capital.environmental_authorization_ref: identifier_reference, conditionally required when environmental approval is legally necessary.
- capital.land_readiness_ref: identifier_reference, conditionally required for projects requiring land access.
- capital.procurement_strategy_ref: identifier_reference, conditionally required before procurement launch.
- capital.benefits_indicators: registry_reference, required for the approved monitoring plan.
- capital.change_reason: long_text, required for a baseline change.
- capital.completion_evidence: document, conditional on the approved closure procedure.
Country decisions: appraisal methodology; capital-project thresholds; environmental and land-clearance rules; public-private partnership approval; permitted funding models; benefits-evaluation requirements.
2.6 Revenue and Tax Authority
The Revenue/Tax Authority must have a separate configured service catalogue for each tax type that the country actually administers. CivicOS must not assume that every nation has VAT, corporate income tax, personal income tax, property tax, excise, withholding tax or a particular taxpayer identifier.

Tax is a legally consequential domain. Tax liabilities, rates, filing periods, exemptions, penalties, interest, thresholds, deadlines, records-retention periods and appeal rights must come from approved national rules. They must never be hard-coded as universal CivicOS constants.
Department A — Taxpayer registration and account maintenance
Complete service lifecycle
Form ID	Form title	Submitter	Procedure stage	Main outcome
taxpayer.registration.individual	Register as an individual taxpayer	Individual or authorized representative	Application	Taxpayer account created
taxpayer.registration.business	Register a business for tax	Business or authorized representative	Application	Business tax account created
taxpayer.registration.public_entity	Register a public entity for tax administration	Authorized public institution	Application	Tax account created where required
taxpayer.registration.nonresident	Register a non-resident taxpayer	Individual, business or authorized representative	Application	Non-resident tax account
taxpayer.registration.branch	Register a branch or permanent establishment	Business or authorized representative	Application	Linked tax registration
taxpayer.registration.amend	Amend a taxpayer registration	Taxpayer or authorized representative	Amendment	Versioned registration
taxpayer.details.change	Change taxpayer contact or address details	Taxpayer or authorized representative	Change of details	Updated details
taxpayer.obligation.add	Register for an additional tax obligation	Taxpayer or authorized representative	Application	Additional tax obligation
taxpayer.obligation.cancel	Request cancellation of a tax obligation	Taxpayer or authorized representative	Cancellation request	Cancellation review
taxpayer.registration.transfer	Request transfer to another responsible tax office	Taxpayer or authorized representative	Transfer	Transfer decision
taxpayer.certificate.request	Request a taxpayer registration certificate	Taxpayer or authorized representative	Certificate request	Certificate issued or refused
taxpayer.account.statement	Request a tax account statement	Taxpayer or authorized representative	Information request	Statement issued
taxpayer.registration.duplicate	Request a replacement registration certificate	Taxpayer or authorized representative	Replacement	Replacement certificate
taxpayer.registration.suspend_request	Request suspension where national law permits it	Taxpayer or authorized representative	Suspension request	Suspension decision
taxpayer.registration.reactivate_request	Request reactivation of a suspended registration	Taxpayer or authorized representative	Reactivation	Reactivation decision
taxpayer.registration.objection	Object to a registration decision	Eligible taxpayer or representative	Objection	Objection case
taxpayer.registration.appeal	Appeal an eligible registration decision	Eligible taxpayer or representative	Appeal	Appeal case
taxpayer.registration.withdraw	Withdraw a pending registration application	Applicant or representative	Withdrawal	Withdrawal recorded where permitted
taxpayer.registration.decision	Record the registration decision	Authorized tax officer	Decision	Approve, refuse or request further information
taxpayer.registration.inspection	Record a registration verification or inspection	Authorized tax officer	Verification	Verification record
taxpayer.registration.further_information	Request further registration information	Authorized tax officer	Further information	Formal information request
taxpayer.registration.referral	Refer a registration matter to an authorized unit	Authorized tax officer	Referral	Referral record
Taxpayer registration: full field contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "taxpayer.registration.business",
  "record_type": "taxpayer.registration_case",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "taxpayer.applicant_type",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "tax.country.approved_taxpayer_types",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Type of taxpayer"},
      "hint": {"en": "Choose the category that matches the registration being requested."},
      "error_text": {"en": {"value_in_source": "Choose an available taxpayer type."}}
    },
    {
      "id": "taxpayer.organisation",
      "type": "organisation",
      "required": true,
      "validation": [{"rule": "organisation_identity_consistent", "params": {}}],
      "values_source": "civicos.registry.organisation",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "legal_entity_registration", "when": "when_the_applicant_is_a_registered_legal_entity_and_the_procedure_requires_verification"}],
      "label": {"en": "Business or organisation"},
      "hint": {"en": "Select an existing organisation where possible, or provide the permitted registration details."},
      "error_text": {"en": {"organisation_identity_consistent": "Check the organisation details against the applicable registration record."}}
    },
    {
      "id": "taxpayer.trading_name",
      "type": "localized_text",
      "required": false,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 300}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Trading name"},
      "hint": {"en": "Enter this only if it differs from the legal name."},
      "error_text": {"en": {"length": "Check the trading name."}}
    },
    {
      "id": "taxpayer.registration_ref",
      "type": "identifier_reference",
      "required": false,
      "validation": [{"rule": "identifier_format_from_source", "params": {}}],
      "values_source": "tax.country.approved.business_identifiers",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "business_registration", "when": "when_a_business_registration_number_is_required"}],
      "label": {"en": "Business registration number"},
      "hint": {"en": "Enter the number issued by the responsible business registry."},
      "error_text": {"en": {"identifier_format_from_source": "Check the business registration number."}}
    },
    {
      "id": "taxpayer.business_activity",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "tax.country.approved.business_activity_codes",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Main business activity"},
      "hint": {"en": "Choose the activity that best describes the business."},
      "error_text": {"en": {"value_in_source": "Choose an available business activity."}}
    },
    {
      "id": "taxpayer.business_start_date",
      "type": "date",
      "required": true,
      "validation": [{"rule": "date_not_in_future", "params": {}}, {"rule": "date_allowed_by_registration_rule", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [{"kind": "business_activity_start", "when": "when_required_by_the_approved_registration_procedure"}],
      "label": {"en": "Date business activity started or is expected to start"},
      "hint": {"en": "Use the actual or expected date requested by the procedure."},
      "error_text": {"en": {"date_not_in_future": "Check the date.", "date_allowed_by_registration_rule": "The date does not meet the configured registration rule."}}
    },
    {
      "id": "taxpayer.registered_address",
      "type": "address",
      "required": true,
      "validation": [{"rule": "address_satisfies_service_policy", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [{"kind": "registered_address", "when": "when_the_address_must_be_verified_under_the_approved_procedure"}],
      "label": {"en": "Registered or principal business address"},
      "hint": {"en": "Provide the address required for this type of taxpayer."},
      "error_text": {"en": {"address_satisfies_service_policy": "Provide an address permitted for this registration."}}
    },
    {
      "id": "taxpayer.contact",
      "type": "contact",
      "required": true,
      "validation": [{"rule": "at_least_one_permitted_contact_method", "params": {}}],
      "values_source": null,
      "personal_data_class": "personal",
      "evidence": [],
      "label": {"en": "Contact details"},
      "hint": {"en": "Provide the contact method required by the approved procedure."},
      "error_text": {"en": {"at_least_one_permitted_contact_method": "Provide at least one permitted contact method."}}
    },
    {
      "id": "taxpayer.obligations_requested",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "obligations_available_for_taxpayer_type", "params": {}}],
      "values_source": "tax.country.approved.tax_obligations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Tax obligations requested"},
      "hint": {"en": "Select the tax registrations relevant to this business."},
      "error_text": {"en": {"obligations_available_for_taxpayer_type": "One or more selected obligations are not available for this taxpayer type."}}
    },
    {
      "id": "taxpayer.representative",
      "type": "person",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "taxpayer.acting_through_representative", "equals": true}}],
      "values_source": "civicos.registry.person",
      "personal_data_class": "personal",
      "evidence": [{"kind": "authority_to_act", "when": "when_a_representative_submits_the_registration"}],
      "label": {"en": "Authorized representative"},
      "hint": {"en": "Provide this only when someone is acting for the business."},
      "error_text": {"en": {"required_if": "Enter the representative's details."}}
    },
    {
      "id": "taxpayer.authority_evidence",
      "type": "document",
      "required": false,
      "validation": [{"rule": "required_if", "params": {"field": "taxpayer.acting_through_representative", "equals": true}}, {"rule": "evidence_requirement_in_approved_package", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "authority_to_act", "when": "when_required_by_the_approved_representation_rule"}],
      "label": {"en": "Evidence of authority to act"},
      "hint": {"en": "Provide the approved evidence of authority if required."},
      "error_text": {"en": {"required_if": "Provide the required evidence of authority.", "evidence_requirement_in_approved_package": "This evidence is not included in the approved procedure."}}
    },
    {
      "id": "taxpayer.declaration",
      "type": "boolean",
      "required": true,
      "validation": [{"rule": "must_be_true", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [{"kind": "applicant_declaration", "when": "as_required_by_the_approved_tax_registration_procedure"}],
      "label": {"en": "I confirm that the information provided is accurate to the best of my knowledge"},
      "hint": {"en": "Read the declaration and applicable notice before confirming."},
      "error_text": {"en": {"must_be_true": "Confirm the declaration to continue."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Taxpayer categories and authoritative business registration records.",
    "Tax obligations available to each taxpayer type.",
    "Registration timing, filing start dates and accepted business identifiers.",
    "Representation requirements, evidence and declaration wording.",
    "Taxpayer confidentiality, retention and appeal rules."
  ]
}


Internal registration forms
The following forms are available only to authorized tax officers and reviewers:
- taxpayer.registration.assessment — assess completeness and eligibility under the approved registration rule.
- taxpayer.registration.verification_record — record an authorized register lookup and its result.
- taxpayer.registration.inspection_checklist — record a legally authorized registration inspection.
- taxpayer.registration.further_information — issue a request for missing or inconsistent information.
- taxpayer.registration.decision_record — record the approved decision, rule versions, reasons and decision-maker.
- taxpayer.registration.referral_record — refer the case to an authorized specialist unit.
- taxpayer.registration.appeal_assessment — record the procedural assessment of an objection or appeal.
- taxpayer.registration.closure_record — close a withdrawn, refused, approved or otherwise completed case under the configured procedure.
Officer-only fields
- assessment.case_ref: identifier_reference, required; administrative.
- assessment.rule_refs: registry_reference, required; the exact approved rules applied; administrative.
- assessment.evidence_review: choice, required; source tax.evidence.review_outcomes; restricted.
- assessment.missing_items: choice, conditional on an incomplete application; source tax.registration.required_items; administrative.
- assessment.recommendation: choice, required; source tax.registration.recommendation_types; restricted.
- decision.legal_basis_refs: registry_reference, required; approved legal provisions; administrative.
- decision.outcome: choice, required; source tax.registration.decision_outcomes; restricted.
- decision.reason: long_text, required for refusal, conditional approval, or any other outcome for which reasons are required; restricted.
- decision.decision_maker: identifier_reference, required; authorized officer; administrative.
- decision.approval_event_ref: identifier_reference, required where a second approver is required; administrative.
A tax officer must not create a new taxpayer record by bypassing the approved registration workflow. The decision record must show whether the outcome was approved, refused, returned for information or otherwise disposed of under a lawful rule.
Department B — Periodic returns and tax declarations
A separate approved form and procedure package is required for each tax type and filing scenario. The following are the baseline services; each service is activated only if that tax exists in the country's law.
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.return.periodic.submit	Submit a periodic tax return	Taxpayer or authorized representative	Filing	Return received
tax.return.periodic.amend	Amend a previously submitted return	Taxpayer or authorized representative	Amendment	Versioned amended return
tax.return.periodic.nil	Submit a nil return where required	Taxpayer or authorized representative	Filing	Nil return recorded
tax.return.periodic.withdraw_request	Request withdrawal or invalidation of a return	Taxpayer or authorized representative	Review	Request assessed
tax.return.periodic.late_submission	Submit a late return	Taxpayer or authorized representative	Filing	Late return received and routed under approved rules
tax.return.periodic.further_information	Respond to a return query	Taxpayer or authorized representative	Further information	Response received
tax.return.periodic.officer_assessment	Record a return assessment	Authorized tax officer	Assessment	Assessment record
tax.return.periodic.correction	Correct an officer's clerical error	Authorized officer	Amendment	Audited correction
tax.return.periodic.decision	Record the return's assessed outcome	Authorized decision-maker	Decision	Assessment outcome
tax.return.periodic.notice	Issue a return receipt or assessment notice	Authorized service	Notification	Notice and delivery record
tax.return.periodic.objection	Object to an eligible assessment	Eligible taxpayer or representative	Objection	Objection case
tax.return.periodic.appeal	Appeal an eligible decision	Eligible taxpayer or representative	Appeal	Appeal case
Return submission contract
The following contract is the base for a configured periodic tax return. It is not a universal tax formula: the actual tax-specific financial fields and calculations must be added as named fields by the country's approved tax schema.
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "tax.return.periodic.submit",
  "record_type": "tax.return",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "tax_return.taxpayer_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "taxpayer_active_for_period", "params": {}}],
      "values_source": "tax.registry.taxpayer_accounts",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Taxpayer account"},
      "hint": {"en": "Select the account for which this return is being submitted."},
      "error_text": {"en": {"taxpayer_active_for_period": "The taxpayer account is not eligible for this filing period."}}
    },
    {
      "id": "tax_return.tax_type",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "tax_type_registered_for_account", "params": {}}],
      "values_source": "tax.country.approved_tax_types",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Type of tax return"},
      "hint": {"en": "Select a tax type registered for this taxpayer."},
      "error_text": {"en": {"tax_type_registered_for_account": "This taxpayer is not registered for the selected tax type."}}
    },
    {
      "id": "tax_return.period_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "filing_period_valid_for_tax_type", "params": {}}, {"rule": "filing_window_status_resolved", "params": {}}],
      "values_source": "tax.country.approved.filing_periods",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Filing period"},
      "hint": {"en": "Choose the period specified in your filing obligation."},
      "error_text": {"en": {"filing_period_valid_for_tax_type": "The period does not apply to this tax type.", "filing_window_status_resolved": "The filing period cannot be processed under the current approved rules."}}
    },
    {
      "id": "tax_return.schema_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "approved_tax_return_schema_active", "params": {}}],
      "values_source": "tax.country.approved.return_schemas",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Approved return schema"},
      "hint": {"en": "The system selects the form schema for this tax type and period."},
      "error_text": {"en": {"approved_tax_return_schema_active": "No approved return schema is available for this tax type and period."}}
    },
    {
      "id": "tax_return.tax_data",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "all_schema_fields_valid", "params": {}}, {"rule": "tax_calculation_rule_version_bound", "params": {}}],
      "values_source": "tax.country.approved.return_data_sets",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Return details"},
      "hint": {"en": "Complete the fields required by the approved return schema."},
      "error_text": {"en": {"all_schema_fields_valid": "One or more required return fields are missing or invalid.", "tax_calculation_rule_version_bound": "The return calculation rules are not correctly bound to this submission."}}
    },
    {
      "id": "tax_return.evidence_refs",
      "type": "registry_reference",
      "required": false,
      "validation": [{"rule": "evidence_requirements_satisfied", "params": {}}],
      "values_source": "tax.country.approved.return_evidence",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "tax_return_evidence", "when": "only_when_required_by_the_approved_tax_procedure"}],
      "label": {"en": "Supporting records"},
      "hint": {"en": "Attach or link only records required by the return procedure."},
      "error_text": {"en": {"evidence_requirements_satisfied": "Required supporting records are missing."}}
    },
    {
      "id": "tax_return.declaration",
      "type": "boolean",
      "required": true,
      "validation": [{"rule": "must_be_true", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [{"kind": "tax_return_declaration", "when": "as_required_by_the_approved_tax_law_and_procedure"}],
      "label": {"en": "I confirm the return declaration"},
      "hint": {"en": "Read the approved declaration and its legal effect before confirming."},
      "error_text": {"en": {"must_be_true": "Confirm the declaration to submit this return."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Tax types, filing obligations, return schemas and accounting bases.",
    "Tax periods, due dates, nil-return obligations and late-filing treatment.",
    "Tax calculation rules, rates, thresholds, exemptions, deductions and rounding.",
    "Required evidence, declaration wording and amendment rights.",
    "Taxpayer confidentiality and review or appeal procedures."
  ]
}


Engineering constraint: tax_return.tax_data is a reference to a validated, typed data object governed by schema_ref, not an unrestricted JSON bag. The approved schema must enumerate each actual tax field with its own type, required condition, validation, values source, data class and evidence rule. The engine must snapshot the schema and calculation-rule versions used for the return.
Tax-specific return schemas
The country activates only the schemas it legally uses.
Schema ID	Purpose	Typical specific data groups
tax.return_schema.personal_income	Individual income tax	Taxpayer account, approved income categories, approved deductions and credits, withholding references, calculation result
tax.return_schema.corporate_income	Corporate income tax	Entity account, accounting-period reference, approved income and adjustment categories, tax calculation
tax.return_schema.vat_or_sales_tax	VAT or sales tax where applicable	Tax period, approved taxable-supply categories, input-tax categories, adjustments, calculation result
tax.return_schema.withholding	Withholding tax where applicable	Withholding agent, payee references, payment category, gross base, approved rate rule, tax withheld
tax.return_schema.excise	Excise where applicable	Product category, licensed premises, approved quantity or value basis, applicable tax rule
tax.return_schema.property	Property tax where applicable	Property registry reference, assessment period, approved valuation reference, applicable rule
tax.return_schema.payroll	Payroll-related tax where applicable	Employer, payroll period, aggregate taxable amounts, withholding and remittance data
tax.return_schema.other	A nationally approved tax type not covered above	Country-approved schema with explicit fields and rules
These names are proposed stable IDs for the CivicOS catalogue. Their availability does not assert that the relevant tax exists in any particular country.
Department C — Tax payments, credits and refunds
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.payment.initiate	Start a tax payment	Taxpayer or authorized representative	Payment initiation	Payment instruction
tax.payment.external_reference	Submit an external payment reference	Taxpayer or authorized representative	Reconciliation	Payment matched or left unresolved
tax.payment.allocation_request	Request allocation of an unmatched payment	Taxpayer or authorized representative	Allocation review	Allocation decision
tax.payment.transfer_request	Request transfer of a credit between eligible tax accounts	Taxpayer or authorized representative	Credit transfer	Transfer decision
tax.refund.application	Apply for a tax refund	Eligible taxpayer or representative	Application	Refund claim
tax.refund.supporting_evidence	Supply refund evidence	Taxpayer or representative	Further information	Evidence received
tax.refund.assessment	Assess a refund claim	Authorized tax officer	Assessment	Assessment record
tax.refund.decision	Approve, refuse or adjust a refund claim	Authorized decision-maker	Decision	Refund decision
tax.refund.payment_instruction	Authorize an approved refund payment	Authorized officer	Payment	Payment instruction
tax.refund.reconciliation	Reconcile the refund payment	Authorized officer	Reconciliation	Reconciliation result
tax.credit.adjustment	Request or record a credit adjustment	Taxpayer or authorized officer	Amendment	Credit adjustment decision
tax.payment.reversal_request	Request a payment reversal where lawful	Taxpayer or authorized officer	Exception	Reversal review
tax.payment.dispute	Dispute a payment allocation or balance	Taxpayer or representative	Dispute	Dispute case
Specific fields
- tax_payment.taxpayer_ref: registry_reference, required; restricted.
- tax_payment.liability_ref: registry_reference, required where payment is against an assessed or declared liability; administrative.
- tax_payment.amount: money, required; must match the applicable liability or approved payment rule.
- tax_payment.currency: choice, required; approved currency source.
- tax_payment.payment_method: choice, required; approved methods only.
- tax_payment.provider_transaction_ref: identifier_reference, system-provided or conditionally entered for an external payment; administrative.
- tax_payment.allocation_basis: choice, required for allocation requests; source tax.payment.approved_allocation_bases.
- tax_refund.claimed_amount: money, required; subject to approved calculation and eligibility rules.
- tax_refund.claim_basis: choice, required; source tax.refund.approved_claim_bases.
- tax_refund.return_ref: registry_reference, conditional when the refund arises from a submitted return.
- tax_refund.payout_account: group core.payout_account, only when the approved refund method requires it.
- tax_refund.evidence_refs: registry_reference, conditional on the approved evidence rules.
- tax_refund.decision_reason: long_text, required for refusal or adjustment when reasons are required.
- tax_refund.payment_ref: identifier_reference, required after payment execution; administrative.
Country decisions: tax payment methods; credit allocation order; refund eligibility and timelines; offset rules; interest on refunds; reversal authority; alternative refund methods and appeal routes.
Department D — Tax compliance, audit and inspection
Tax compliance workflows must be grounded in the powers and safeguards of the national tax law. A risk indicator may help an authorized officer prioritize work where lawful, but CivicOS must not invent a risk score, infer wrongdoing from protected characteristics, or automatically make a legally material finding.
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.compliance.case.open	Open an authorized compliance case	Authorized tax officer	Case initiation	Case record
tax.compliance.scope.approve	Approve the scope of a compliance review	Authorized reviewer	Authorization	Scope decision
tax.compliance.information_request	Request tax information under an approved power	Authorized tax officer	Information request	Formal request issued
tax.compliance.information_response	Respond to a tax information request	Taxpayer or authorized representative	Response	Response recorded
tax.compliance.extension_request	Request an extension for an information response	Taxpayer or representative	Extension request	Extension decision
tax.compliance.extension_decision	Record an extension decision	Authorized officer	Decision	Approved, refused or modified extension
tax.compliance.inspection_plan	Record an authorized inspection plan	Authorized tax officer	Planning	Inspection plan
tax.compliance.inspection_checklist	Complete the inspection checklist	Authorized inspector	Inspection	Inspection observations
tax.compliance.evidence_register	Register evidence collected lawfully	Authorized officer	Evidence handling	Evidence register
tax.compliance.interview_record	Record an interview or meeting where permitted	Authorized officer	Investigation	Interview record
tax.compliance.findings_draft	Draft compliance findings for review	Authorized officer	Assessment	Draft findings
tax.compliance.taxpayer_response	Respond to proposed findings	Taxpayer or representative	Response	Response evidence
tax.compliance.findings_review	Review findings and taxpayer response	Authorized reviewer	Review	Review record
tax.compliance.assessment_decision	Record the authorized assessment decision	Authorized decision-maker	Decision	Assessment decision
tax.compliance.case_closure	Close a compliance case	Authorized officer	Closure	Closure record
tax.compliance.complaint	Complain about the conduct of a compliance officer	Eligible person or representative	Complaint	Independent or designated complaint review
tax.compliance.referral	Refer a matter to another authority where legally permitted	Authorized officer	Referral	Referral record
Inspection record: field contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "tax.compliance.inspection_checklist",
  "record_type": "tax.compliance_inspection",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "inspection.case_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "case_exists_and_is_open", "params": {}}],
      "values_source": "tax.compliance.authorized_cases",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Compliance case"},
      "hint": {"en": "Select the authorized case for this inspection."},
      "error_text": {"en": {"case_exists_and_is_open": "Select an open case authorized for this inspection."}}
    },
    {
      "id": "inspection.authority_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "inspection_power_valid_for_scope", "params": {}}],
      "values_source": "civicos.registry.approved_legal_authorities",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Legal authority for the inspection"},
      "hint": {"en": "Select the approved legal power and scope authorizing this inspection."},
      "error_text": {"en": {"inspection_power_valid_for_scope": "The authority does not authorize this inspection scope."}}
    },
    {
      "id": "inspection.location",
      "type": "address",
      "required": true,
      "validation": [{"rule": "location_within_authorized_scope", "params": {}}],
      "values_source": null,
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Inspection location"},
      "hint": {"en": "Record the location covered by the authorization."},
      "error_text": {"en": {"location_within_authorized_scope": "The location is outside the authorized scope."}}
    },
    {
      "id": "inspection.started_at",
      "type": "date",
      "required": true,
      "validation": [{"rule": "server_timestamp_recorded", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Inspection start date"},
      "hint": {"en": "The system records the inspection timestamp."},
      "error_text": {"en": {"server_timestamp_recorded": "The start timestamp must be system-recorded."}}
    },
    {
      "id": "inspection.inspector_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "actor_has_active_inspection_authority", "params": {}}],
      "values_source": "civicos.registry.authorized_officers",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Authorized inspector"},
      "hint": {"en": "The inspector's identity and authorization are recorded by the system."},
      "error_text": {"en": {"actor_has_active_inspection_authority": "The assigned officer is not authorized for this inspection."}}
    },
    {
      "id": "inspection.checklist_version",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "approved_checklist_version", "params": {}}],
      "values_source": "tax.compliance.approved_inspection_checklists",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Approved inspection checklist"},
      "hint": {"en": "Use the checklist approved for this inspection type."},
      "error_text": {"en": {"approved_checklist_version": "Select the approved checklist version."}}
    },
    {
      "id": "inspection.observations",
      "type": "long_text",
      "required": true,
      "validation": [{"rule": "length", "params": {"min": 1, "max": 20000}}],
      "values_source": null,
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Observed facts"},
      "hint": {"en": "Record what was observed. Separate observations from conclusions."},
      "error_text": {"en": {"length": "Record the observations within the allowed length."}}
    },
    {
      "id": "inspection.evidence_refs",
      "type": "registry_reference",
      "required": false,
      "validation": [{"rule": "evidence_chain_complete", "params": {}}],
      "values_source": "tax.compliance.evidence_register",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Evidence collected"},
      "hint": {"en": "Link evidence only if it was collected under the authorized procedure."},
      "error_text": {"en": {"evidence_chain_complete": "The evidence record is missing required chain-of-custody information."}}
    },
    {
      "id": "inspection.follow_up",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "value_in_source", "params": {}}],
      "values_source": "tax.compliance.inspection_follow_up.v1",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Recommended procedural next step"},
      "hint": {"en": "Select a next step, not a finding of liability."},
      "error_text": {"en": {"value_in_source": "Choose an available procedural next step."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Inspection powers, authorization scope and notice requirements.",
    "Permitted evidence collection and handling procedures.",
    "Required records, interview safeguards and review rights.",
    "Who may approve findings and who may make a tax assessment.",
    "Complaint and independent review routes."
  ]
}


Mandatory safeguard: an inspection record contains observations and evidence. It does not itself establish fraud, criminal conduct or tax liability. Those outcomes require the separate legally authorized process, the applicable decision rule, a responsible decision-maker and any required opportunity to respond.
Department E — Assessments, objections, appeals and disputes
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.assessment.notice	Issue an assessment notice	Authorized tax service	Notification	Assessment notice
tax.assessment.amendment	Request amendment of an assessment	Eligible taxpayer or representative	Amendment	Amendment case
tax.assessment.review_request	Request administrative review of an assessment	Eligible taxpayer or representative	Review	Review case
tax.objection.submit	Submit a formal tax objection	Eligible taxpayer or representative	Objection	Objection case
tax.objection.supplement	Add evidence to an objection	Objector or representative	Further information	Updated objection evidence
tax.objection.extension_request	Request an extension where permitted	Objector or representative	Extension request	Extension decision
tax.objection.assessment	Assess the procedural completeness of an objection	Authorized reviewer	Assessment	Completeness record
tax.objection.decision	Record the objection decision	Authorized decision-maker	Decision	Objection outcome
tax.appeal.submit	Submit an appeal to the designated authority	Eligible appellant or representative	Appeal	Appeal record
tax.appeal.transmit	Transmit an appeal to the authorized appellate body	Authorized tax officer	Referral	Transmission record
tax.appeal.response	Submit the authority's response to an appeal	Authorized representative of the authority	Response	Response record
tax.dispute.withdraw	Withdraw an objection or appeal where permitted	Eligible party or representative	Withdrawal	Withdrawal record
tax.dispute.settlement_proposal	Submit a settlement proposal where legally permitted	Eligible taxpayer or representative	Settlement	Proposal record
tax.dispute.settlement_review	Review a proposed settlement	Authorized reviewer	Review	Review record
tax.dispute.closure	Close a completed dispute	Authorized officer	Closure	Closure record
Specific fields
- dispute.taxpayer_ref: registry_reference, required; restricted.
- dispute.original_decision_ref: identifier_reference, required; links to the decision being challenged.
- dispute.grounds: long_text, required; 20–10,000 characters; restricted.
- dispute.requested_remedy: choice, required; source tax.country.approved.dispute_remedies.
- dispute.requested_amount: money, conditional where the challenge concerns a quantified liability or refund; restricted.
- dispute.evidence_refs: registry_reference, optional or conditional under the approved procedure.
- dispute.representation: group core.representation, if applicable.
- dispute.submission_date: system-recorded date and timestamp.
- dispute.timeliness_rule_ref: identifier_reference, required; resolves to the approved procedural deadline rule.
- dispute.extension_request_reason: long_text, required for an extension request.
- dispute.decision_outcome: choice, required at decision stage; source tax.country.approved.dispute_outcomes.
- dispute.decision_reasons: long_text, required where reasons are legally required.
- dispute.appeal_authority_ref: registry_reference, required when the appeal route is established.
- dispute.closure_basis: choice, required for closure; source tax.country.approved.dispute_closure_bases.
Country decisions: objection and appeal eligibility; deadlines and extension powers; independent appellate authority; settlement and compromise powers; suspension of collection during disputes; reasons, notice and representation requirements.

The application must never calculate an appeal deadline from a hard-coded number of days. It must use the active approved rule and the legally relevant event date. If that event date or rule is disputed, the case must be routed for authorized review.
Department F — Withholding agents and third-party reporting
This department is enabled only if the country imposes relevant withholding or third-party tax-reporting duties.
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.withholding.registration	Register as a withholding agent	Eligible business or institution	Application	Withholding-agent account
tax.withholding.details.amend	Amend withholding-agent details	Withholding agent or representative	Amendment	Updated registration
tax.withholding.return.submit	Submit a withholding return	Withholding agent or representative	Periodic filing	Return received
tax.withholding.return.amend	Amend a withholding return	Withholding agent or representative	Amendment	Versioned return
tax.withholding.payment	Submit a withholding remittance	Withholding agent or representative	Payment	Payment instruction
tax.withholding.certificate.issue	Issue a withholding certificate	Authorized withholding agent	Certificate	Certificate record
tax.withholding.statement.submit	Submit a required third-party statement	Authorized reporting entity	Reporting	Statement received
tax.withholding.statement.correct	Correct a third-party statement	Reporting entity	Amendment	Corrected statement
tax.withholding.discrepancy.response	Respond to a reporting discrepancy	Withholding agent or reporting entity	Further information	Response recorded
tax.withholding.discrepancy.decision	Record the discrepancy outcome	Authorized tax officer	Decision	Discrepancy resolved or referred
Specific fields
- withholding.agent_ref: registry_reference, required.
- withholding.tax_type: choice, required; approved tax types.
- withholding.period_ref: registry_reference, required; approved filing periods.
- withholding.payee_ref: registry_reference, conditionally required according to the approved reporting schema.
- withholding.payment_category: choice, required; approved categories.
- withholding.gross_base: money, required where the tax schema calculates withholding from a monetary base.
- withholding.rule_ref: identifier_reference, required; approved rule for the period.
- withholding.amount: money, derived from the applicable rule or explicitly entered only when the approved schema requires a reported amount.
- withholding.remittance_ref: identifier_reference, required when a payment has been executed.
- withholding.correction_reason: long_text, required for corrected submissions.
- withholding.supporting_evidence: document, conditional on the approved procedure.
Country decisions: withholding categories, reporting entities, payee-identification requirements, tax calculation rules, reporting periods, certificate requirements and confidentiality rules.
Department G — Taxpayer assistance, rulings and special tax treatment
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.assistance.enquiry	Ask a question about a tax obligation	Taxpayer, business or representative	Enquiry	Enquiry case
tax.assistance.guidance_request	Request guidance on a tax procedure	Taxpayer or authorized representative	Guidance	Guidance response
tax.ruling.request	Request a formal tax ruling where available	Eligible taxpayer or representative	Application	Ruling case
tax.ruling.further_information	Respond to a request for ruling information	Applicant or representative	Further information	Response recorded
tax.ruling.withdraw	Withdraw a pending ruling request	Applicant or representative	Withdrawal	Withdrawal recorded where permitted
tax.ruling.decision	Record a formal ruling	Authorized decision-maker	Decision	Ruling issued or refused
tax.ruling.reconsideration	Request reconsideration where permitted	Eligible applicant	Review	Reconsideration case
tax.incentive.application	Apply for a statutory tax incentive	Eligible taxpayer or representative	Application	Incentive case
tax.incentive.renewal	Renew an incentive where the law allows renewal	Eligible taxpayer or representative	Renewal	Renewal decision
tax.incentive.amendment	Request an amendment to an incentive record	Eligible taxpayer or representative	Amendment	Amendment decision
tax.incentive.compliance_report	Submit a required incentive-compliance report	Incentive holder	Reporting	Compliance report
tax.incentive.surrender	Surrender an incentive	Incentive holder	Surrender	Surrender recorded
tax.incentive.withdrawal	Withdraw a pending incentive application	Applicant or representative	Withdrawal	Withdrawal recorded where permitted
tax.incentive.decision	Record an incentive decision	Authorized decision-maker	Decision	Incentive granted, refused or returned
tax.incentive.review_request	Request review of an eligible incentive decision	Eligible applicant or holder	Review	Review case
Specific fields
- assistance.topic: choice, required; source tax.country.approved.assistance_topics.
- assistance.question: long_text, required; 10–10,000 characters.
- assistance.related_case_ref: identifier_reference, optional; required when the enquiry concerns an existing case.
- ruling.taxpayer_ref: registry_reference, required.
- ruling.tax_type: choice, required; approved tax types.
- ruling.question_presented: long_text, required; 50–20,000 characters.
- ruling.facts: long_text, required; factual statements supplied by the applicant, kept separate from officer conclusions.
- ruling.law_refs: registry_reference, required; approved legal provisions.
- ruling.supporting_documents: document, conditional on approved evidence requirements.
- incentive.scheme_ref: registry_reference, required; approved incentive scheme.
- incentive.eligibility_evidence: registry_reference, conditional on the approved scheme.
- incentive.requested_period: registry_reference, required; approved scheme period.
- incentive.requested_benefit: choice, required; approved benefit categories.
- incentive.decision_ref: identifier_reference, system-created at decision.
- incentive.compliance_report_ref: registry_reference, required for periodic compliance reports.
- incentive.surrender_reason: long_text, required for surrender.
Country decisions: whether formal rulings exist and who is bound by them; their publication and confidentiality rules; statutory incentive schemes; eligibility, duration, renewal, monitoring and revocation powers; review and appeal routes.
Department H — Tax debt, payment arrangements and recovery
These forms are available only to the extent permitted by national law. CivicOS must not infer a recovery power from an unpaid balance. A balance must be traceable to an approved liability and a valid procedural state.
Form ID	Form title	Submitter	Procedure stage	Main outcome
tax.debt.statement.request	Request a statement of tax debt	Taxpayer or authorized representative	Information request	Statement issued
tax.debt.payment_plan.request	Request a payment arrangement	Eligible taxpayer or representative	Application	Arrangement request
tax.debt.payment_plan.evidence	Supply evidence for a payment arrangement	Taxpayer or representative	Further information	Evidence received
tax.debt.payment_plan.decision	Approve, refuse or vary a payment arrangement	Authorized decision-maker	Decision	Arrangement decision
tax.debt.payment_plan.change_request	Request a change to an approved arrangement	Taxpayer or representative	Amendment	Change decision
tax.debt.payment_plan.default_review	Review an alleged payment-arrangement default	Authorized officer	Review	Review record
tax.debt.payment_plan.cancel_request	Request cancellation of a payment arrangement	Taxpayer or representative	Cancellation request	Cancellation decision
tax.debt.voluntary_disclosure	Disclose an omitted or corrected tax obligation voluntarily	Taxpayer or representative	Disclosure	Disclosure case
tax.debt.disclosure.assessment	Assess a voluntary disclosure	Authorized officer	Assessment	Assessment record
tax.debt.recovery.authorize	Record authorization for a lawful recovery action	Authorized decision-maker	Authorization	Authorization record
tax.debt.recovery.notice	Issue a recovery notice	Authorized tax service	Notification	Notice and delivery record
tax.debt.recovery.response	Respond to a recovery notice	Taxpayer or representative	Response	Response recorded
tax.debt.recovery.dispute	Dispute a recovery action	Eligible taxpayer or representative	Dispute	Dispute case
tax.debt.recovery.suspend_request	Request suspension of a recovery action where permitted	Eligible taxpayer or representative	Suspension request	Suspension decision
tax.debt.recovery.close	Close a recovery case	Authorized officer	Closure	Closure record
Specific fields
- debt.taxpayer_ref: registry_reference, required.
- debt.liability_refs: registry_reference, required; all liabilities must resolve to approved assessment or return records.
- debt.balance_ref: identifier_reference, required; approved balance calculation.
- debt.payment_plan.requested_schedule: structured entries containing due_date (date, required), amount (money, required) and currency (choice, required from approved currencies).
- debt.payment_plan.reason: long_text, required.
- debt.payment_plan.evidence_refs: registry_reference, conditional under the approved payment-arrangement rules.
- debt.voluntary_disclosure.period_refs: registry_reference, required.
- debt.voluntary_disclosure.description: long_text, required.
- debt.voluntary_disclosure.return_refs: registry_reference, conditional when amended returns are required.
- debt.recovery.authority_ref: registry_reference, required; approved legal power.
- debt.recovery.action_type: choice, required; source tax.country.approved.recovery_actions.
- debt.recovery.decision_ref: identifier_reference, required before execution of the authorized action.
- debt.recovery.suspension_basis: registry_reference, required for a suspension request.
- debt.recovery.closure_basis: choice, required at closure; approved closure categories.
Country decisions: tax debt calculation; statutory notices; payment arrangements; voluntary disclosure treatment; recovery powers and safeguards; suspension rules; interest and penalties; review rights; authorized recovery decision-makers.

2.7 Cross-cutting internal forms for these institutions
The forms below are used by the Presidency, Cabinet, Finance, Treasury, Budget and Revenue/Tax only where the institution's configured responsibilities require them. They supplement, but do not replace, the service-specific workflows above.
Form ID	Form title	Submitter	Procedure stage	Main outcome
exec.internal.assessment	Record an internal case assessment	Authorized officer	Assessment	Assessment record
exec.internal.inspection_checklist	Complete an authorized inspection checklist	Authorized inspector	Inspection	Inspection record
exec.internal.further_information	Request further information	Authorized officer	Further information	Formal request
exec.internal.decision_record	Record a legally authorized decision	Authorized decision-maker	Decision	Decision record
exec.internal.referral	Refer a case to an authorized institution or unit	Authorized officer	Referral	Referral record
exec.internal.notice_issue	Issue an approved notice	Authorized officer or service	Notification	Notice record
exec.internal.delivery_failure	Record a failed notice delivery	Authorized service	Exception	Delivery exception
exec.internal.objection_intake	Register an objection	Authorized intake officer	Intake	Objection case
exec.internal.appeal_transmission	Transmit an appeal through an authorized route	Authorized officer	Referral	Transmission record
exec.internal.correction_request	Request correction of a record	Authorized officer	Amendment	Correction case
exec.internal.correction_approval	Approve or refuse a record correction	Authorized reviewer	Decision	Correction decision
exec.internal.closure	Record case closure	Authorized officer	Closure	Closure record
These forms use a controlled set of specific internal fields:
- case_ref: identifier_reference, required; source is the owning institution's authorized case registry.
- action_type: choice, required; source is the owning procedure's approved action list.
- rule_refs: registry_reference, required for assessment and decision records; exact approved rules used.
- evidence_refs: registry_reference, conditional according to the procedure.
- observations: long_text, required for an inspection record; observed facts only.
- request_reason: long_text, required for a further-information request.
- requested_items: repeated entries with item_ref (identifier_reference), reason (long_text) and response_due_rule_ref (identifier_reference).
- decision_outcome: choice, required at decision stage; source is the service-specific approved outcomes.
- decision_reason: long_text, required when required by the law or decision procedure.
- decision_maker_ref: identifier_reference, system-resolved to an authorized person.
- approval_event_ref: identifier_reference, required when a second approver is mandated.
- referral_destination: registry_reference, required; must resolve to an institution or unit authorized to receive the referral.
- referral_authority_ref: registry_reference, required; approved legal or procedural authority for the exchange.
- closure_basis: choice, required; service-specific approved closure categories.
Universal control: these records must be bound to the actual service-specific procedure package. A generic internal form cannot be used to bypass the case's approved stages, skip mandatory legal review or issue a decision that the officer is not authorized to make.
2.8 Country configuration register for Part 2
Before any of these services can be activated, the country administrator and authorized legal reviewers must complete the following configuration records. These are required decisions, not fields that an engineer should guess.
Configuration ID	Required national decision	Required approver
country.exec.constitutional_authorities	Constitutional powers, authorized office-holders, official acts, signature and countersignature requirements	Authorized constitutional/legal authority
country.exec.cabinet_procedure	Cabinet paper types, agenda authority, decision recording, confidentiality and distribution rules	Authorized Cabinet authority
country.exec.programme_authority	Government programme approval, ownership, monitoring and baseline-change powers	Authorized planning authority
country.finance.fiscal_authority	Fiscal-policy powers, forecast ownership, accounting policy and fiscal reporting responsibilities	Authorized finance/legal authority
country.finance.transfer_rules	Grant and fiscal-transfer schemes, eligibility, funding purposes, payment and recovery rules	Authorized finance/legal authority
country.treasury.payment_controls	Payment instruments, delegation limits, approval separation, execution and reconciliation controls	Authorized treasury authority
country.treasury.debt_authority	Borrowing powers, debt limits, guarantee powers and approval requirements	Authorized debt-management/legal authority
country.budget.calendar	Fiscal year, budget calendar, submission windows and reporting periods	Authorized budget authority
country.budget.classifications	Chart of accounts, budget classifications, approved cost categories and reporting mappings	Authorized budget/accounting authority
country.budget.appropriation_rules	Appropriation authority, reallocations, supplementary funding, carry-forward and year-end rules	Authorized finance/legal authority
country.tax.registration	Taxpayer categories, registration identifiers, tax obligations and registration procedures	Authorized tax/legal authority
country.tax.return_schemas	Tax types in force, filing schemas, periods, calculation rules and declaration wording	Authorized tax/legal authority
country.tax.payment_refund	Payment methods, allocation, refunds, credit transfers and reconciliation rules	Authorized tax/treasury authority
country.tax.compliance_powers	Inspection powers, information requests, evidence rules, taxpayer safeguards and authorized officers	Authorized tax/legal authority
country.tax.disputes	Objections, appeals, deadlines, extensions, review bodies and settlement powers	Authorized tax/legal authority
country.tax.debt_recovery	Lawful debt recovery actions, notices, payment arrangements, suspension and review safeguards	Authorized tax/legal authority
country.exec.finance.retention	Retention schedules, confidentiality, publication, disclosure and access restrictions for all records in this part	Records owner and authorized legal/privacy reviewers
Each configuration record must itself be versioned, reviewed by a different authorized official from its proposer where required, and linked to the applicable law version. Changing a configuration must trigger an impact assessment for the affected forms and open procedure packages.
2.9 Completion gates for Part 2
An engineering team should not mark this part complete merely because all forms appear in the user interface.
Institutional authority

Every form is owned by a configured institution and bound to a verified authority record.


Procedure lifecycle

Every activated service has its applicable intake, assessment, evidence, decision, notification, correction, review and closure stages.


Financial integrity

Commitments, appropriations, payment instructions, execution, reconciliation, tax liabilities and refunds are distinct records.


Tax configuration

Every enabled tax type has a versioned schema, approved calculation rules, filing periods, required evidence and review route.


Legal decision trail

Every legally material decision records the authority, rule version, decision-maker, reasons where required, evidence and timestamp.


Separation of duties

The system enforces the configured separation between proposing, reviewing, approving, executing and reconciling.


Access restrictions

Taxpayer information, confidential Cabinet papers, debt records and payment details are accessible only for authorized purposes.


Accessibility and channels

All published forms pass the required language, right-to-left, keyboard, screen-reader, mobile and assisted-channel tests.


No fabricated production data

Production reports use sourced records; estimates and modelled figures are explicitly identified; missing integrations are not represented as live data.


2.10 What comes next
Part 3 of 13 — Customs, Central Bank, Trade, Industry, Investment and Public Procurement.

It will cover customs declarations and corrections, import/export permits and certificates, customs valuation and classification challenges, customs refunds and disputes, independent central-bank administrative services, business and investment facilitation, investment incentives, public procurement planning, tendering, supplier registration, bid evaluation, contract management, variations, complaints and procurement oversight.

The Central Bank will be treated as an independent institution wherever the national constitution or law establishes that independence. Its records and approval powers will not become subordinate to the Ministry of Finance merely because the institutions exchange financial data.
