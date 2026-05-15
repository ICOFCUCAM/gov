# CivicOS — Digital and Physical Identity Interface (Companion 130)

This companion specifies how digital identity (CivicID, Civic Wallet) interfaces with physical documentation in everyday encounters. It complements Volume I §10 (CivicID), Companion 17 (Civic Wallet), Companion 22 §4 (right to a screen including printed receipts), Companion 124 (citizens who opt out of digital), and Companion 46 (accessibility) by being specifically about the digital-physical interface citizens experience daily.

The thesis: **most citizens experience identity through a mix of digital and physical artifacts — and the interface between them determines whether the platform serves them or fragments their experience**. Digital identity in Civic Wallet, physical ID cards, printed certificates, paper receipts, QR codes — all coexist. CivicOS commits to making the digital-physical interface coherent, dignified, accessible, and equally valid across modes.

The discipline: physical artifacts equivalent to digital; QR verification works offline; print options preserved; accessibility per Companion 46; multilingual physical and digital; signed cryptographic verifiability across modes; anti-discrimination by mode; civil society engagement on interface design.

---

## 1. Principles

1. **Physical equivalent to digital.** Equal validity.
2. **Offline verifiability.** QR works without network.
3. **Print options preserved.** Per inclusion floor.
4. **Accessibility universal.** Across modes.
5. **Multilingual across modes.** Tier 1 parity.
6. **Signed cryptographic verifiability.** Across digital and physical.
7. **Anti-discrimination by mode.** Same service quality.
8. **Civil society engagement on interface design.**
9. **Cultural appropriateness.**
10. **Citizen choice respected.** Digital or physical.

---

## 2. Identity artifact types

| Type | Description | Use cases |
|---|---|---|
| **Civic Wallet identity credential** | Digital identity in wallet | Online services, mobile-enabled verification |
| **Physical ID card** | Plastic or paper card | In-person verification, no-device contexts |
| **Printed certificate** | Birth, marriage, education, etc. | Legal proof, archival |
| **QR code on document** | Cryptographically signed | Verifiable offline |
| **Paper receipt** | Transaction confirmation | Records, evidence |
| **Letter from state** | Signed communication | Notifications, decisions |
| **Mobile driver's license (mDL)** | Digital DL standard | Travel, verification |
| **Diaspora wallet credential** | Identity abroad | Consular services |

Each artifact carries identity claims; verifiability across artifacts is key.

---

## 3. Equal validity

### 3.1 The principle

Citizens can use whichever mode they prefer for any service.

### 3.2 Mechanisms

- Service acceptance of all valid identity artifacts.
- No service requiring specific mode.
- Cross-mode verifiability through cryptographic signature.
- Anti-discrimination by chosen mode.

### 3.3 Discipline

- Anti-second-class status for any mode.
- Equivalent service quality.
- Cultural appropriateness in mode preference.

### 3.4 Forbidden

- Services that require specific identity mode.
- Discrimination against citizens using non-preferred mode.
- Use of mode choice for surveillance.

---

## 4. Offline verifiability

### 4.1 The principle

Identity artifacts verifiable offline through cryptographic signature.

### 4.2 Mechanisms

- QR codes on physical documents.
- Cryptographic signature from sovereign trust services.
- Offline verification tools available to officers and citizens.
- Selective disclosure where applicable.

### 4.3 Discipline

- Anti-network-dependency for verification.
- Anti-citizen-locked-out by connectivity.
- Cultural and contextual sensitivity.

### 4.4 Forbidden

- Services that require network connectivity for verification of citizens with physical artifacts.
- Discrimination against citizens in low-connectivity contexts.

---

## 5. Print options

### 5.1 The principle

Citizens can always obtain physical print of digital records.

### 5.2 Mechanisms

- Print kiosks in government offices.
- Print on demand at home with sufficient infrastructure.
- Postal delivery of significant documents.
- Anti-paywall for citizen prints of own documents.

### 5.3 Discipline

- Anti-pretextual-fees for printing.
- Quality of print sufficient for legal use.
- Cultural and accessibility appropriateness.

### 5.4 Forbidden

- Charging punitive fees for own-document printing.
- Discrimination in print access.
- Inability to obtain physical print of consequential documents.

---

## 6. Accessibility across modes

Per Companion 46:

### 6.1 Mechanisms

- Large print options.
- Braille where appropriate.
- Audio descriptions of visual content.
- Tactile features on physical documents where possible.
- Multi-modal verification.

### 6.2 Discipline

- Anti-mode-exclusion of disabled citizens.
- Accommodation requests fulfilled.
- Universal design across modes.

### 6.3 Forbidden

- Inaccessible identity artifacts.
- Discrimination based on accessibility need.
- Use of accessibility need for surveillance.

---

## 7. Multilingual across modes

Per Companion 25:

### 7.1 Mechanisms

- Physical documents in all Tier 1 languages.
- Digital wallet content multilingual.
- QR-encoded data multilingual.
- Cross-mode language consistency.

### 7.2 Discipline

- Anti-language-mode-discrimination.
- Cultural and dialectal appropriateness.
- Indigenous language coverage per Companion 36.

### 7.3 Forbidden

- Discrimination in language coverage across modes.
- Use of language choice as adverse signal.
- Suppression of minority language identity artifacts.

---

## 8. Cryptographic verifiability

### 8.1 The principle

Both digital and physical identity artifacts cryptographically signed and verifiable.

### 8.2 Mechanisms

- Sovereign trust services sign all artifacts.
- Per Companion 47: digital signature infrastructure.
- QR codes encode signed claims.
- Revocation lists distributed.
- Offline verification tooling.

### 8.3 Discipline

- Anti-impersonation cryptographically.
- Anti-vendor-lock-in of signing infrastructure.
- Sovereign key control.

### 8.4 Forbidden

- Unsigned consequential identity artifacts.
- Vendor-controlled signing infrastructure.
- Cross-border signing arrangements compromising sovereignty.

---

## 9. Anti-discrimination by mode

### 9.1 The principle

Citizens choosing physical or digital deserve equal service.

### 9.2 Mechanisms

- Officer training on all-mode service.
- Wait times equivalent across modes.
- Quality of service equivalent.
- Civil society monitoring.

### 9.3 Discipline

- Anti-digital-favoritism.
- Anti-physical-degradation.
- Cultural sensitivity.

### 9.4 Forbidden

- Faster service for digital users.
- Lower quality service for physical users.
- Use of mode choice for surveillance or adverse decisions.

---

## 10. Loss and replacement

### 10.1 The principle

When physical artifacts are lost or destroyed, replacement is accessible.

### 10.2 Mechanisms

- Digital wallet preserves identity even if physical lost.
- Replacement issuance through normal channels.
- Anti-fee-discrimination.
- Cultural and trauma-informed handling.

### 10.3 Discipline

- Anti-punitive-replacement-process.
- Trauma-informed for those who lost in disaster.
- Anti-discrimination in replacement.

### 10.4 Forbidden

- Punitive fees for replacement of lost artifacts.
- Discrimination based on circumstances of loss.
- Use of loss as adverse signal.

---

## 11. Wallet without device

### 11.1 The pattern

Some citizens don't have digital devices. They use physical identity primarily.

### 11.2 Mechanisms

- Physical ID card with cryptographic features.
- QR code on physical card.
- USSD wallet alternatives per Companion 17 §2.6.
- Agent assistance where applicable.

### 11.3 Discipline

- Per inclusion floor (Volume II Part 0 invariant 6).
- Equal service quality.
- Cultural and contextual sensitivity.

### 11.4 Forbidden

- Discrimination against citizens without digital devices.
- Pressure to acquire digital devices.
- Service degradation for non-device citizens.

---

## 12. Cross-border identity

Per Companion 15 §6:

### 12.1 Mechanisms

- Physical and digital identity recognized cross-border per treaty.
- mDL standard for travel.
- Cryptographic verification works internationally.
- Sovereign authority preserved.

### 12.2 Discipline

- Anti-cross-border-discrimination by mode.
- Sovereign authority over recognition.
- Civil liberties preserved across borders.

### 12.3 Forbidden

- Cross-border arrangements compromising sovereign identity authority.
- Use of cross-border verification for surveillance.
- Discrimination among citizens by mode in cross-border contexts.

---

## 13. Privacy across modes

### 13.1 The principle

Privacy floors apply across digital and physical modes.

### 13.2 Mechanisms

- Per-RP UID across modes where possible.
- Selective disclosure across modes (per Companion 17 §2.4).
- Anti-cross-mode-correlation without consent.

### 13.3 Discipline

- Anti-mode-correlation surveillance.
- Privacy preserved through QR codes (selective disclosure).
- Cultural and contextual sensitivity.

### 13.4 Forbidden

- Cross-mode correlation without consent.
- Surveillance through mode use patterns.
- Use of mode choice for adverse decisions.

---

## 14. Cultural appropriateness

Per Companion 25:

### 14.1 The principle

Identity artifact design and use respects cultural plurality.

### 14.2 Mechanisms

- Cultural symbols where appropriate.
- Naming conventions per culture (per Companion 25 §6.2).
- Religious accommodation per Companion 51.
- Indigenous community artifact design where applicable.

### 14.3 Discipline

- Anti-cultural-homogenization through identity design.
- Plurality respected.
- Anti-imposition.

### 14.4 Forbidden

- Cultural insensitivity in identity artifact design.
- Imposition of dominant culture norms.
- Discrimination through cultural artifact choices.

---

## 15. Forbidden in digital-physical identity interface

CivicOS will not:

- Permit services that require specific identity mode.
- Allow discrimination against citizens using non-preferred mode.
- Permit use of mode choice for surveillance.
- Allow services that require network connectivity for verification of citizens with physical artifacts.
- Permit charging punitive fees for own-document printing.
- Allow inaccessible identity artifacts.
- Permit discrimination in language coverage across modes.
- Allow unsigned consequential identity artifacts.
- Permit faster service for digital users than physical users.
- Allow punitive fees for replacement of lost artifacts.
- Permit discrimination against citizens without digital devices.
- Allow pressure to acquire digital devices.
- Permit cross-border arrangements compromising sovereign identity authority.
- Allow cross-mode correlation without consent.
- Permit use of mode choice for adverse decisions.
- Allow cultural insensitivity in identity artifact design.
- Permit imposition of dominant culture norms through identity artifacts.

This list grows; it does not shrink.

---

## 16. KPIs

| KPI | Indicator |
|---|---|
| Mode equivalence | Service quality stratified by mode |
| Offline verifiability | QR verification working |
| Print accessibility | Available across districts |
| Accessibility across modes | Universal design |
| Multilingual identity artifacts | Per language |
| Cryptographic signing coverage | 100% consequential |
| Anti-discrimination by mode | Decreasing complaints |
| Replacement accessibility | Reasonable for lost artifacts |
| Cross-border recognition | Per treaty |
| Privacy across modes | Per-RP UID functioning |

---

## 17. The digital-physical identity interface north star

Most citizens experience identity through a mix of digital and physical artifacts. CivicOS commits to making the digital-physical interface coherent, dignified, accessible, and equally valid across modes — through equal validity, offline verifiability, print options, accessibility, multilingual coverage, cryptographic verification, anti-discrimination, cultural appropriateness, and citizen choice.

When CivicOS becomes a tool of digital-pushing, physical-degradation, or mode-discrimination — it has failed at the inclusion floor and at multilingual parity. Capability without digital-physical interface discipline is not progress; it is the institutionalization of digital favoritism dressed as efficiency.

When the platform serves citizens equally across digital and physical modes — with full validity, offline verifiability, accessibility, and dignity — it earns the right to be infrastructure for societies where citizens choose how they engage.

The discipline is daily. The mode equivalence is real. The offline verifiability is structural. The accessibility is universal. The cultural appropriateness is honored. The citizen choice is respected.

Citizens shouldn't have to abandon physical artifacts to access platform services, nor should they be deprived of physical artifacts they want. Anything less abandons citizens whose preferences don't fit the platform's default to platform-mediated friction or exclusion.
