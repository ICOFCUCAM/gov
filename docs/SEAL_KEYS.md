# Seal keys

The state's decisions and certificates are sealed with a key held in key
custody (`lib/keys/custody.ts`, purpose `decision`: `CIVICOS_DECISION_KEY`,
Vault or a KMS). The seal key register (`lib/keys/seal-register.ts`, screen
National settings → Seal keys, `/gov/configuration/seal-keys`, API
`/api/seal-keys`) records which keys are the state's legitimate seals, over
time, and who approved each under which law. It is published as a trust list
(`GET /api/trust/keys`) so a certificate can be checked outside the platform.

## Owner's decision (21 October 2026)

- Replacing the seal key never invalidates earlier certificates. Each key is a
  batch with its own validity period.
- No parliamentary act is required for every new key. The nation's law names
  the authority that approves seal keys; that is recorded once in the country's
  seal-key rules, changed only through `lib/law/policy-change.ts` (proposed by
  an administrator citing the law, confirmed by a different official, every
  version kept). The authority is a slot of Who is responsible
  (`trustServices`, "Seal keys authority"), empty until the nation names one.
- At least two different officials who can sign at that authority approve
  every key (platform minimum; the rules may ask for more, never fewer), and
  neither may be the official who proposed it.
- Emergency revocation is fast (reported by one official, confirmed by a
  second at once, no waiting period) and reviewed afterwards by the named
  authority.
- A nation whose law demands it can require an enacted instrument of the
  legislature for each key (`legislatureResolution`, shipped off): the final
  approval then cites a law-register version that entered from the
  legislature's certified record.

## Life of a key

```
proposed ──approve × N──▶ approved ──first seal or presented now──▶ active ──next key activated──▶ retired
    │                                                                  │
    └─ withdrawn                          reported compromised ──confirm──▶ revoked (any approved key)
```

- **Proposed**: by an administrator or a signatory of the seal keys
  authority, citing the law from the laws register. Without a public key the
  proposal is the key the key provider presents now. A key that has already
  sealed decisions (an installation upgraded to this version) records
  `coversFrom`, the earliest of them: approving it covers those seals.
- **Approved**: when the rules' number of approvals is reached.
- **Active**: from the moment the provider presents it (at approval if it
  already does, otherwise at its first seal). Activation retires the previous
  key: its `validUntil` is the activation time. A retired key seals nothing
  and verifies what it sealed forever.
- **Historic**: a key that sealed before the register existed is registered
  afterwards with the period it sealed in (defaults from its decisions), by
  the same approval; it is recorded retired.
- **Compromised**: reported with the time from which the key is not trusted;
  the key seals nothing from the report. A second, different official confirms
  at once: the key is revoked. Seals made at or after the compromise time
  verify as "sealed after the key was reported compromised — not trusted";
  earlier ones stay valid. Nothing about a decision is changed or deleted. The
  authority reviews the compromise within the rules' period (default 30 days)
  and can only move the compromise time earlier. A revoked key can never be
  proposed again.

Every step is audited (`seal-key.*`) and kept in the key's history.

## What sealing does

`recordDecision()` signs, then asks the register (`sealKeyRefusal()`):

| Installation | Key not in the register | Proposed | Approved | Active | Retired | Reported compromised |
|---|---|---|---|---|---|---|
| production | refused | refused | becomes active, seals | seals | refused | refused |
| demo, training | trusted as a **sample** (recorded, marked) | refused | becomes active, seals | seals | refused (a retired sample key is trusted again as a new sample) | refused |

A refusal names the key and points to National settings → Seal keys. A
production installation upgraded to this version therefore seals no decision
(and signs no document through `/api/signatures`) until (1) the nation names
the seal keys authority under Who is responsible, (2) an official proposes the
key in use, citing the law, and (3) two officials who can sign at that
authority approve it. Decisions sealed before stay valid.

## Verification

`verifyDecision()` checks the hash, the signature against the key embedded in
the decision, and the register, judging the seal by a **tamper-evident time**:
the audit chain's `decision.seal` entry that `recordDecision()` wrote for that
record (`sealAuditTime()`). The hash chain fixes that entry's time and
position; it must name the record's hash and key, and its own hash must hold.
The times a record states for itself (`content.at`, `seal.at`) are display
only: whoever holds a stolen key can sign any time they like into a record, so
neither can prove a seal came before a compromise.

- The audit entry's time must fall within the validity of an approved record
  of that key and before any confirmed compromise time.
- No audit entry (a record that never went through `recordDecision()`, or a
  forgery, including one made under a genuine decision's id): **not trusted —
  no audit-chain record of this seal**. The one exception keeps the behaviour
  before the register: a key the register has never held, with a record dated
  before the register started, verifies as "Key not in the register (sealed
  before key registration)".
- A key not in the register is accepted only for a seal whose audit time is
  before the register started for that purpose (`since`), reported as "Key not
  in the register (sealed before key registration)".

`/verify/<code>` shows the key, its validity and legal basis, and the
fingerprint. Document signatures (`/api/signatures`) are timed the same way:
their `document.sign` entry names the signature id, its hash and key.

## Trust list format (`GET /api/trust/keys`)

Public, read-only, no sign-in; never names an official.

```json
{
  "format": "civicos.trust-list",
  "version": 1,
  "generatedAt": "2026-10-21T10:00:00.000Z",
  "since": { "decision": "2026-10-21T09:00:00.000Z" },
  "keys": [
    {
      "purpose": "decision",
      "keyId": "ed25519:0123456789abcdef",
      "fingerprint": "<SHA-256 hex of the DER SubjectPublicKeyInfo>",
      "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n…",
      "status": "active | approved | proposed | retired | revoked",
      "validFrom": "ISO time or null",
      "validUntil": "ISO time or null (in use)",
      "compromisedFrom": "ISO time or null",
      "compromiseReported": false,
      "historic": false,
      "sample": false,
      "approvedAt": "ISO time or null",
      "legalBasis": [{ "instrument": "/eli/…", "eId": "sec_12", "version": "…", "title": "…", "num": "12" }]
    }
  ]
}
```

To check a decision record outside the platform: recompute
`SHA-256(canonicalJson({ type: 'civicos.decision', v: 1, id, content }))`,
verify the Ed25519 signature with `seal.publicKeyPem`, compute the SHA-256 of
that key's DER SPKI and find it in the list for purpose `decision`. Outside
the platform the seal's time is the record's own claim; for a key the list
shows `revoked` (or a `compromisedFrom`), ask the issuing institution (or
`/verify/<code>`, which uses the audit chain's time) before relying on a seal
the record dates before the compromise. For other keys the claimed time must
lie within `validFrom`–`validUntil`; a seal before `since` with a key not in
the list predates the register.

## Limits (integration register 18.43)

- The seal's time is the platform's audit chain (tamper-evident, signed heads,
  anchored by `/api/cron/audit-anchor`), which an outside verifier cannot read;
  a qualified time-stamp (RFC 3161) from the nation's trust service on each
  seal would let anyone check it offline.
- The trust list is served by the platform; publishing it signed (ETSI TS 119
  612 style) or through the nation's qualified trust service, and keys held in
  an HSM, are for the nation's signature framework.
- Audit heads and exchange receipts can be registered and appear in the trust
  list; sealing is enforced for decisions only.
