# Owner's direction, 21 October 2026: health integration status and next steps

**Status.** Binding (owner). Kept word for word below. It governs form identity
(catalogue context), procedure links, institutional assignment, the public
product check and the Health I4 dependency register. Health is not to be
claimed the first complete institution before the Health I4 requirements and
dependency register is finished.

---

This is a sound correction for CivicOS. The key improvement is that scope validation now evaluates each form in its catalogue context rather than relying on the form ID alone.
I would record the current state as follows.
CivicOS — Health integration status
Duplicate-ID scope check corrected
The two `HLT-MED-004` entries are distinguished by their source catalogue. The excluded dispensing form remains excluded; the allowed information-request form is evaluated separately.
Medicines-regulator procedures: missing
No procedure has been invented or linked without evidence. All 21 forms remain without a verified procedure association.
Institution ownership: provisional
Forms are assigned to the health regulator because the national profile does not yet support a distinct medicines-authority role.
I4 dependencies: not built
The product register and public-check exchange service remain outstanding.
What I recommend next

1. Keep catalogue context in every form's identity. Use a composite identity such as `catalogue_id + form_id + version`. A bare form ID must never establish scope eligibility or uniquely identify a record.
2. Keep procedure links explicitly unresolved. Distinguish `missing`, `draft`, `under_review` and `approved`. Do not allow a form to pass its applicable go-live gate when a required procedure is missing.
3. Make the institutional assignment configurable. Treat the health regulator as the provisional owner, not proof that it is legally the competent medicines authority. Add a separate medicines-authority slot to the national profile when the country's governance model is established.
4. Track I4 as a dependency, not a completed capability. The product register and public-check exchange service need their own requirements, contracts, access controls, provenance rules, tests and release gates.
5. Preserve the exclusion boundary. The allowed information-request form must not inherit patient-specific dispensing fields or functionality simply because it shares `HLT-MED-004` with the excluded form.

Acceptance criterion: the integration test should prove that both catalogue entries can coexist, the excluded entry remains blocked, the allowed entry is independently evaluated, and neither can be silently substituted for the other.
One further distinction matters: a public product-check service should expose only approved, publishable product information. It should not expose confidential regulatory submissions, protected personal data or unpublished enforcement records.
The next logical milestone is to finish the Health I4 requirements and dependency register before claiming Health is the first complete institution.
