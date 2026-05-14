# CivicOS — National Data Dictionary & Interoperability Profiles (Companion 07)

A condensed reference of the controlled vocabularies, identifiers, and interoperability profiles that hold the platform together. The full dictionary lives in the standards portal; this document is the engineering north star.

---

## 1. Identifiers

| Identifier | Domain | Format | Notes |
|---|---|---|---|
| CivicID | Person | Opaque, 12 alphanumeric, Luhn-checked | No embedded data |
| EntityID | Legal entity | Opaque, 14 alphanumeric | Used for businesses, NGOs, government bodies |
| RP-UID | Per relying party | UUID v4, deterministic per (CivicID, RP, purpose) | Pseudonymizes citizen across services |
| ParcelID | Land | <country>-<region>-<grid>-<seq> | Geographically meaningful |
| FacilityID | Health/Education | Opaque | National facility registry |
| TransactionID | Payments | UUID v7 | Time-ordered |
| EventID | CivicBus events | UUID v7 + producer prefix | Globally unique |
| DocumentID | Documents | URN with hash digest | Content-addressed |
| WorkflowInstanceID | Workflow | Temporal-issued | |

---

## 2. Core entities (selected schemas)

### 2.1 Person (Identity context)

```json
{
  "civicId": "K3F2-9P77-MX22",
  "names": {
    "given": ["..."],
    "family": "...",
    "preferred": "...",
    "scriptVariants": [{"script":"arab","value":"..."}]
  },
  "demographics": {
    "dateOfBirthApprox": "1990-04-XX",
    "gender": "X",
    "nationality": ["..."],
    "vulnerabilityFlags": []
  },
  "contacts": {
    "phones": [{"number":"+...","verified":true}],
    "addresses": [{"type":"residential","value":"...","geo":{"lat":...,"lng":...}}]
  },
  "credentials": [{"type":"NationalID","status":"active","issuedAt":"..."}],
  "lifecycle": {"status":"alive"},
  "consents": "managed in Consent context, referenced by URI"
}
```

### 2.2 Wallet credential (W3C VC)

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2","https://civicos.org/credentials/v1"],
  "type": ["VerifiableCredential","CivicID"],
  "issuer": "did:web:identity.gov.example",
  "validFrom": "...",
  "validUntil": "...",
  "credentialSubject": {"id":"did:civic:..","civicId":"...","photoHash":"..."},
  "credentialStatus": {"type":"BitstringStatusListEntry","statusListIndex":"...","statusListCredential":"..."},
  "proof": {"type":"DataIntegrityProof","cryptosuite":"ml-dsa-65","proofValue":"..."}
}
```

### 2.3 Payment instruction (ISO 20022 pacs.008 excerpt)

```xml
<FIToFICstmrCdtTrf>
  <GrpHdr>...</GrpHdr>
  <CdtTrfTxInf>
    <PmtId><EndToEndId>...</EndToEndId><UETR>...</UETR></PmtId>
    <IntrBkSttlmAmt Ccy="..."> ... </IntrBkSttlmAmt>
    <Dbtr><Nm>...</Nm><Id><PrvtId><Othr><Id>civic:...</Id></Othr></PrvtId></Id></Dbtr>
    <Cdtr>...</Cdtr>
    <Purp><Cd>GVEA</Cd></Purp>
  </CdtTrfTxInf>
</FIToFICstmrCdtTrf>
```

### 2.4 CivicBus event (CloudEvents)

```json
{
  "specversion":"1.0",
  "id":"01HK...",
  "source":"/civicos/tax/returns",
  "type":"tax.return.filed",
  "subject":"civic:K3F2-9P77-MX22",
  "time":"...",
  "datacontenttype":"application/json",
  "data":{"returnId":"...","period":"2025","grossIncome":...,"signatureRef":"..."}
}
```

---

## 3. Code lists (selected, controlled by national data dictionary)

- **Sex/Gender** — administrative gender code list (configurable per country).
- **Address types** — residential, business, postal, temporary, ancestral.
- **Civil status** — single, married, partnership, separated, divorced, widowed.
- **Occupation** — ISCO-08 derived national list.
- **Industry** — ISIC-derived national list.
- **Document types** — passport, mDL, ID card, refugee document, etc.
- **Currency** — ISO 4217 + national CBDC code if applicable.
- **Country** — ISO 3166-1 alpha-3.
- **Language** — BCP 47.

Code list governance: changes require gazette amendment + 6-month transition.

---

## 4. Interoperability profiles

### 4.1 Identity

- OpenID Connect Core + FAPI 2.0 baseline.
- mDoc / mDL ISO 18013-5 for offline.
- W3C DID + VC v2.

### 4.2 Payments

- ISO 20022 native; legacy ISO 8583 supported via translation gateway.
- Open banking: FAPI-aligned profiles for AISP/PISP.
- Mobile money: GSMA Mobile Money API.

### 4.3 Health

- HL7 FHIR R5 base; national IPS profile.
- IHE XDS for document exchange.
- SNOMED CT + LOINC + ICD-11.

### 4.4 Procurement

- OCDS 1.2 for publication.
- UBL for e-invoicing (PEPPOL-aligned).

### 4.5 Geospatial

- OGC API Features, OGC API Tiles, GeoJSON, GeoPackage.
- WGS84 default; national projected CRS for cadastre.

### 4.6 Identity exchange

- X-Road v7 wire compatibility for regional interop where partners use it.
- DGX (Data Governance Act) profiles where partners use them.

---

## 5. Service definition example (CivicBus)

```yaml
service:
  id: civic.id.attribute-share/v1
  owner: identity-authority
  description: Returns selected attributes for a CivicID with valid consent
  classification: restricted
  consent_required: true
  request:
    schema_ref: identity.attribute-share.request.v1.json
    examples: [...]
  response:
    schema_ref: identity.attribute-share.response.v1.json
  errors:
    - code: CONSENT_MISSING
    - code: SCOPE_DENIED
    - code: CITIZEN_NOT_FOUND
  sla:
    availability: 99.95
    p99_latency_ms: 600
  rate_limits:
    per_consumer_rps: 200
  audit:
    retention_days: 2555
  versioning:
    deprecated_at: null
    sunset_at: null
```

---

## 6. Consent artefact (national consent layer)

```json
{
  "consentId": "uuid",
  "dataPrincipal": "civic:K3F2-9P77-MX22",
  "dataConsumer": "did:web:bank.example",
  "purpose": {"code":"LOAN_KYC","description":"Loan application KYC"},
  "scope": ["identity.basic","income.declared.last_year"],
  "createdAt": "...",
  "validUntil": "...",
  "frequency": "single",
  "revocable": true,
  "audit": {"providedThrough":"civic-wallet","userAuthLevel":"L3"},
  "signature": {"alg":"...","value":"..."}
}
```

---

## 7. Data classification

- **Public** — gazette, statistics, OCDS.
- **Internal** — operational metrics.
- **Restricted** — personal data tied to identifiable citizens.
- **Sensitive** — health, biometric, religious, political.
- **Secret** — national security.

Each dataset must be tagged at creation; lineage propagates classification automatically.

---

## 8. Master data hierarchy

```
Person (CivicID) ── Household ── Address ── Parcel ── Locality ── District ── Region ── Country
Entity (EntityID) ── Branch ── Address ── ...
Facility (FacilityID) ── ServicePoint ── ...
Asset (AssetID) ── Component ── ...
```

Cross-context joins always go through the master data services, never directly across module databases.
