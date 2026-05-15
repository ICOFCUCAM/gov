# CivicOS — Sovereign Language Infrastructure Layer (Companion 148)

This companion specifies the **Sovereign Language Infrastructure Layer (SLIL)** — the architectural stratum across CivicOS where language, locale, script, voice, and translation are treated as first-class platform infrastructure rather than as a frontend translation feature. It complements and substantively extends Companion 22 (plain language, multilingual UI), Companion 36 (indigenous languages and protocols), Companion 51 (religious and cultural accommodation), Companion 117 (typography and script), Companion 132 (time and calendar plurality), Companion 138 (constitutional AI governance — including AI as citizen-facing language interface), and Companion 140 (multi-country interop including cross-language federation).

The thesis: **language is the operating substrate of statecraft — every law, every form, every notification, every contestation, every receipt, every workflow, every AI response, every voice prompt, every reporting indicator, every cross-border message lives in language — and a sovereign platform that treats multilingualism as a frontend skin imposes the dominant language at every layer it forgot to translate**. SLIL is therefore an architectural commitment: every layer of CivicOS is language-aware; every workflow is locale-aware; every database is Unicode-native; every AI is multilingual-trained or multilingual-served; every voice interface speaks the citizen's language; every legal document generates in the citizen's language with sovereign-validated terminology; every analytics dashboard aggregates across languages without erasing them. SLIL is the platform's commitment to make multilingual operation impossible to forget.

The discipline: language at every layer (storage, compute, workflow, AI, voice, document, analytics, search, notification, legal, cross-border); sovereign language inventory per deployment; sovereign-validated terminology registries per domain per language; AI translation Class B/C with human review on legal/medical/safety; multilingual voice for citizens with literacy constraints; cultural sensitivity per Companion 36 and 51; right-to-left and complex-script first-class per Companion 117; cross-sovereign cross-language federation; multilingual training data sovereignty; anti-dominant-language-imposition; anti-machine-translation-of-binding-legal-text-without-human-validation.

---

## 1. Principles

1. **Language is infrastructure.** Not a frontend skin.
2. **Every layer is language-aware.** Storage to UI to AI to voice.
3. **Sovereign language inventory.** Per deployment, formally registered.
4. **Sovereign-validated terminology.** Per domain, per language, per sovereign.
5. **AI translation under charter.** Per Companion 138; Class B/C; human review on binding text.
6. **Voice for all citizens.** Speech-to-text, text-to-speech, dialect-aware.
7. **Cultural sensitivity per linguistic community.** Per Companion 36 and 51.
8. **RTL and complex scripts first-class.** Per Companion 117.
9. **Cross-language federation.** Per Companion 140.
10. **Multilingual training data sovereignty.** Per Companion 139.
11. **Anti-dominant-language-imposition.** Throughout.
12. **No binding legal text via machine translation without human validation.**

---

## 2. The SLIL stratum

```
                       Sovereign Language Infrastructure Layer
       ┌──────────────────────────────────────────────────────────────────┐
       │                                                                  │
       │   PRESENTATION                                                   │
       │   - UI rendering per locale (ICU MessageFormat, CLDR)            │
       │   - RTL / complex scripts (Companion 117)                        │
       │   - Plain language (Companion 22)                                │
       │   - Accessibility (Companion 110)                                │
       │                                                                  │
       │   VOICE                                                          │
       │   - Speech-to-text per language and major dialects                │
       │   - Text-to-speech per language with natural prosody              │
       │   - IVR multilingual menus                                        │
       │   - Conversational AI multilingual (Class B/C)                    │
       │                                                                  │
       │   DOCUMENT                                                       │
       │   - Multilingual generation (forms, letters, decisions, receipts) │
       │   - Sovereign-validated terminology registry per language         │
       │   - Bilingual / parallel documents where legally required         │
       │   - PDF / HTML / structured (W3C VC) all locale-aware             │
       │                                                                  │
       │   AI ASSISTANT / NLP                                             │
       │   - Multilingual LLM serving per Decision Class                   │
       │   - Cross-lingual retrieval (multilingual embeddings)             │
       │   - Translation as a Class B service (advisory) by default        │
       │   - Cultural-context-aware response generation                    │
       │   - Terminology registry as authoritative                         │
       │                                                                  │
       │   WORKFLOW                                                       │
       │   - Locale-aware workflows (calendar, numbers, name order)        │
       │   - Per-step language preservation through cross-officer handoff  │
       │   - Anti-language-stripping in inter-system routing               │
       │                                                                  │
       │   ANALYTICS / REPORTING                                          │
       │   - Cross-language aggregation without translation collapse       │
       │   - Stratified-by-language KPIs                                   │
       │   - Anti-language-bias in metrics                                 │
       │                                                                  │
       │   SEARCH                                                         │
       │   - Multilingual indexing                                         │
       │   - Cross-lingual retrieval                                       │
       │   - Per-language tokenization (Chinese segmentation, Arabic stemming, │
       │     Bantu noun-class awareness, etc.)                             │
       │                                                                  │
       │   NOTIFICATION                                                   │
       │   - Citizen's preferred language honored                          │
       │   - Across channels (SMS, USSD, IVR, push, email, agent, walk-in) │
       │                                                                  │
       │   STORAGE / DATA MODEL                                           │
       │   - Unicode (UTF-8) native everywhere                             │
       │   - Per-field language tag where applicable                       │
       │   - Collation per language                                        │
       │   - Per-language indexing                                         │
       │   - Name and address formats per locale                           │
       │                                                                  │
       │   LEGAL / COMPLIANCE                                             │
       │   - Authoritative legal text in sovereign-decreed language(s)     │
       │   - Translation status declared per document                      │
       │   - Cross-language enforcement consistency                        │
       │   - Cross-sovereign legal-text federation                         │
       │                                                                  │
       │   CROSS-BORDER                                                   │
       │   - Real-time translation at inter-realm gateway (Companion 140)  │
       │   - Per-treaty terminology alignment                              │
       │   - Cultural context preservation                                 │
       │                                                                  │
       │   TRAINING / MODEL OPS                                           │
       │   - Multilingual training data sovereignty                        │
       │   - Per-language evaluation                                       │
       │   - Low-resource-language uplift programs                         │
       │   - Indigenous language community partnerships (Companion 36)     │
       │                                                                  │
       └──────────────────────────────────────────────────────────────────┘

       Cross-cutting governance:
       People's Editor (communication), Algorithmic Ombudsman (AI translation),
       Sovereign Trust Officer (language sovereignty), Future Generations
       Commissioner (language preservation), Civil society and indigenous
       nations engagement per Companion 74 and 36.
```

---

## 3. Sovereign language inventory

### 3.1 The registry

Every CivicOS sovereign deployment maintains a **Sovereign Language Inventory** — a formally signed, public artifact listing:

- **Official languages** of the sovereign (per constitution).
- **Regional / co-official languages** per sub-national arrangement.
- **Indigenous languages** per Companion 36; community-led inclusion.
- **Minority-protected languages** per international instruments (e.g., European Charter for Regional or Minority Languages, ILO 169 where applicable, UNDRIP-aligned per sovereign).
- **Working languages** of significant migrant or diaspora communities.
- **Sign languages** per sovereign.
- **Liturgical / heritage languages** where significant for service contexts.

Each entry includes:

- Language code (BCP 47).
- Script(s) (ISO 15924).
- Tier of service commitment (full, partial, on-request, emerging).
- Sovereign-validated terminology registry pointer.
- Speech corpus and ASR/TTS readiness.
- Civil society and indigenous community partners.
- Review cadence.

### 3.2 The discipline

- Inventory ratified per constitutional process per sovereign.
- No language quietly removed.
- New language addition by formal process with civil society engagement.
- Anti-tokenistic-inclusion (full-tier commitments mean what they say).

### 3.3 The growth path

For low-resource languages (especially indigenous and minority languages where digital infrastructure is thin):

- Civic Memory Archive (Companion 25) preserves corpus.
- Indigenous-community partnerships per Companion 36 lead corpus development.
- Sovereign-funded uplift programs (corpus collection, ASR/TTS training, terminology development).
- Cross-sovereign cooperation for shared low-resource languages.

### 3.4 Forbidden

- Removal of language tier without constitutional process.
- Discrimination across listed languages in service availability.
- Use of language inventory for surveillance.
- Imposition of dominant language at any layer where inventory commits to multilingual operation.

---

## 4. Storage and data model

### 4.1 Unicode native

- Every database field that holds human-language content stores in UTF-8.
- Every API serializes in UTF-8.
- Every log file is UTF-8.
- Every export is UTF-8.
- Anti-Latin-only-storage.
- Anti-encoding-mojibake.

### 4.2 Per-field language tagging

Fields that may hold content in multiple languages carry a language tag:

```
{
  "decision_text": {
    "en": "...",
    "sw": "...",
    "ar": "...",
    "_authoritative": "ar"
  }
}
```

The authoritative tag marks which language is legally binding (per sovereign legal regime). Translations are translations; the authoritative is the authoritative.

### 4.3 Collation per language

- Sorting respects language collation (Swedish ÅÄÖ at end, Spanish ñ position, Turkish dotless ı, German ß, Arabic alphabetical order, CJK stroke/radical/pinyin orderings).
- ICU collations applied per locale.
- Anti-ASCII-only-sort.

### 4.4 Name and address formats

- Name structure per culture (given/family/patronymic/matronymic/clan/honorifics per Companion 36 and 38).
- Address structure per locale.
- Phone number format per E.164 with local display variants.
- No "First Name / Last Name" enforced globally.

### 4.5 Forbidden in storage

- Storage encoding that drops non-Latin scripts.
- Global single-name field enforced.
- Sort orders that misrepresent languages.
- Address fields that exclude valid local formats.

---

## 5. UI rendering

### 5.1 ICU MessageFormat / CLDR

- All UI strings use ICU MessageFormat or equivalent.
- CLDR for number formats, date formats, plural rules, gender rules.
- Per-locale formatting throughout.

### 5.2 RTL and bi-directional text

- RTL languages (Arabic, Hebrew, Persian, Urdu, Pashto, N'Ko, Adlam, etc.) first-class.
- Bi-directional text handling per Unicode Bidirectional Algorithm.
- UI mirroring per RTL standards.
- Mixed-direction text rendered correctly.

### 5.3 Complex scripts

Per Companion 117:

- Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Sinhala.
- Amharic Fidel, Ge'ez.
- Arabic with contextual shaping.
- Chinese / Japanese / Korean ideographs with proper fonts.
- Tifinagh (Tamazight), N'Ko (West African languages), Vai (Liberia), Adlam (Fulani), Bamum (Cameroon), Mende Kikakui.
- Cherokee, Cree (Canadian Aboriginal Syllabics), Inuktitut.
- Burmese, Khmer, Thai, Lao with proper shaping.

### 5.4 Font infrastructure

- Sovereign-licensed font set covering all inventoried languages.
- Open-source font preferred (Noto, sovereign-developed open fonts).
- Per-script typography (Companion 117).

### 5.5 Plain language

Per Companion 22:

- Plain language in every locale.
- People's Editor review per Companion 28.
- Anti-jargon throughout.

### 5.6 Forbidden in UI

- RTL languages rendered as LTR.
- Complex scripts rendered as boxes / "tofu".
- Plural rules from one language imposed on others ("1 result" vs "results").
- Font substitution that misrepresents the language.

---

## 6. Voice systems

### 6.1 Speech-to-text (ASR)

- Per-language ASR models.
- Major-dialect coverage per language.
- Code-switching support (e.g., Swahili-English, Spanish-English, Hindi-English, Arabic-French, code-switched indigenous-with-colonial).
- Class B per Companion 138 (output text reviewable by citizen and officer).
- Privacy: per Companion 11; recordings not retained beyond purpose; citizen consent.

### 6.2 Text-to-speech (TTS)

- Per-language TTS with natural prosody.
- Multi-voice (gender, age) per language with citizen choice.
- Cultural prosody respected (e.g., Yoruba tonal, Mandarin tonal, Vietnamese tonal).
- Sign language interpretation video where applicable.

### 6.3 IVR multilingual

- Per-language IVR menus.
- DTMF and voice-recognition input.
- Anti-confusion in language switching.
- Per-region accent and dialect honored.

### 6.4 Conversational AI multilingual

- LLM-based citizen assistance multilingual per Decision Class.
- Class A for informational; Class B for advisory.
- Sovereign-validated terminology registry as authoritative reference.
- Anti-hallucination on policy and legal terms (retrieval-augmented from sovereign source).

### 6.5 Dialect and accent

- Major dialects within a language supported (Egyptian Arabic vs. Modern Standard Arabic vs. Maghrebi vs. Levantine; Brazilian vs. European Portuguese; American vs. British vs. Indian English; Beijing vs. Cantonese Mandarin; etc.).
- Dialect-aware ASR.
- Dialect-respectful TTS.

### 6.6 Discipline

- Voice systems are part of inclusion floor (Companion 22 §3, Companion 67).
- Per-language quality monitoring (Companion 138 tripwires).
- Civil society engagement on quality.

### 6.7 Forbidden in voice

- ASR/TTS available only in dominant language.
- Voice surveillance of citizens via service interaction.
- Use of voice biometric for citizen tracking without consent.
- Dialect erasure through prestige-dialect-only training.

---

## 7. Document generation

### 7.1 The principle

Citizen-facing documents (decisions, letters, certificates, receipts, forms, notices) generated in the citizen's preferred language by default.

### 7.2 Mechanisms

- Document templates with locale variants.
- Template variables filled from locale-aware data.
- Sovereign-validated terminology applied.
- Bilingual / parallel documents where legally required (e.g., Canadian English/French, Belgian Dutch/French/German, Swiss multiple, South African 11 languages).
- Plain language per People's Editor.
- Accessibility per Companion 110.

### 7.3 Authoritative-vs-translation

- Legally authoritative language declared per document.
- Translations marked as translations.
- If translation diverges from authoritative, authoritative governs.
- Translation quality assessed per sovereign requirements.

### 7.4 Forms

- Forms generated per locale.
- Field structure per culture (name, address).
- Input validation per locale (date formats, postal codes, phone numbers).
- Plural and gender forms per language.

### 7.5 Forbidden in document generation

- Citizen receives binding document in language they do not read.
- Machine translation of binding legal text without human validation.
- Terminology drift from sovereign registry.
- Inaccessibility (Companion 110).

---

## 8. Sovereign-validated terminology

### 8.1 The principle

Each sovereign maintains a **Terminology Registry** per language for government domains:

- Legal terms (criminal, civil, administrative, constitutional).
- Health terms (clinical, public health, mental health).
- Financial terms (tax, benefits, banking, debt).
- Educational terms.
- Land and property.
- Refugee and migration.
- Indigenous-domain terms (per community, per Companion 36).
- AI and digital service terms.
- Emergency and disaster terms.

### 8.2 Mechanisms

- Multidisciplinary terminology committees (linguists, domain experts, civil society, communities).
- Public terminology registry.
- Versioned with diff history.
- Cross-language equivalence tables.
- Cultural sensitivity reviewed.
- People's Editor oversight on citizen-facing terminology.

### 8.3 Use across SLIL

- AI assistants reference registry as authoritative.
- Document generation pulls from registry.
- Cross-border interop aligns terminology per treaty.
- Analytics aggregates using registry mapping.

### 8.4 Indigenous and minority languages

- Per Companion 36: communities lead in their language's terminology development.
- Anti-extractive: communities own their language work product.
- Cultural protocols respected.

### 8.5 Forbidden in terminology

- Imposed terminology without community/expert involvement.
- Extractive use of community-developed terminology.
- Suppression of dialect or community variants.
- Use of terminology for political reward.

---

## 9. Multilingual AI assistants

### 9.1 The architecture

```
                       Multilingual AI Assistant
              ┌─────────────────────────────────────┐
              │                                     │
              │   Citizen / Officer input           │
              │   (text or voice, any language)     │
              │                                     │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │   Language detection                │
              │   (BCP 47 tag, confidence)          │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │   Routing                           │
              │   - per-language LLM where mature   │
              │   - multilingual LLM where shared   │
              │   - retrieval over sovereign        │
              │     terminology registry + policy   │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │   Response generation               │
              │   - per Decision Class (Companion   │
              │     138)                            │
              │   - terminology-registry-grounded   │
              │   - cultural-context-aware          │
              │   - dialect-respectful              │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │   Output                            │
              │   - text or voice in citizen        │
              │     language                        │
              │   - receipt with model, version,    │
              │     decision class                  │
              │   - contestability per Companion 35 │
              └─────────────────────────────────────┘
```

### 9.2 Decision Class

- Citizen information assistance: Class A.
- Advisory (officer-decision): Class B.
- Automated within narrow rules: Class C, charter, restricted-domain prohibitions absolute.
- Restricted domain recommendation: Class D.

### 9.3 Multilingual training

Per Companion 138 §13.2 and §9 (training data provenance):

- Training data per language, with provenance.
- Sovereign-controlled training data for sovereign-deployed model.
- Indigenous-community-led training data for indigenous languages.
- Cross-sovereign cooperation for shared languages (e.g., Arabic across MENA, Spanish across Latin America, Swahili across East Africa, French across Francophone Africa).
- Anti-extractive: communities retain rights to their language data.

### 9.4 Per-language evaluation

- Quality metrics per language.
- Anti-dominant-language-bias (model's English performance does not vouch for its Yoruba performance).
- Tripwires per language (Companion 138 §7).
- Civil society and community evaluation.

### 9.5 Cross-lingual retrieval

- Multilingual embeddings index policy, terminology, FAQ.
- Citizen asks in their language; retrieval finds relevant content across all sovereign languages; response in citizen's language.

### 9.6 Forbidden in multilingual AI

- AI deployed only in dominant language while inventory commits to others.
- AI hallucination on legal/medical/safety terms (retrieval grounding mandatory).
- Per-language quality silently degraded.
- Surveillance of citizens via language-detection.

---

## 10. Workflows

### 10.1 Locale-aware

Every workflow:

- Knows citizen's preferred language.
- Preserves language across officer handoffs.
- Honors locale-specific date, number, calendar (Companion 132).
- Honors name and address formats.
- Honors religious/cultural calendar in scheduling (Companion 51).

### 10.2 Cross-officer handoff

When a case moves between officers (possibly different language preferences), the workflow:

- Maintains citizen-facing language for citizen-bound communication.
- Provides translation for officer-bound communication.
- Marks translations as translations.
- Records who translated and how (human / machine / human-validated machine).

### 10.3 Anti-language-stripping

A common anti-pattern: information enters in citizen's language and exits in dominant language through silent translation. SLIL forbids this. Original language preserved alongside any translation; authoritative status declared.

### 10.4 Forbidden in workflows

- Language stripping in routing.
- Loss of original language in records.
- Officer-side translation without flag to citizen.

---

## 11. Analytics and reporting

### 11.1 Cross-language aggregation

- Citizen feedback aggregated across languages without translation collapse (each comment retained in original).
- Topic modeling and aggregation use multilingual embeddings.
- Per-language stratification of indicators.

### 11.2 Per-language KPIs

- Service quality per language.
- Contestation rate per language.
- AI assistant satisfaction per language.
- Document generation accuracy per language.
- Voice system intelligibility per language.

### 11.3 Anti-language-bias

If aggregate KPIs hide per-language gaps, the stratification surfaces them. Anti-aggregation-that-obscures.

### 11.4 Forbidden in analytics

- Aggregate that erases per-language patterns.
- Translation that collapses linguistic context.
- Use of multilingual analytics for language discrimination.

---

## 12. Search

### 12.1 Multilingual indexing

- Per-language tokenizers (Chinese segmentation, Arabic stemming, Bantu noun-class handling, German compound splitting).
- Per-language stopwords.
- Per-script normalization.
- Multilingual embeddings for cross-lingual retrieval.

### 12.2 Citizen search

- Citizen queries in any inventory language.
- Results from any inventory language, presented in citizen's language by default.
- Authoritative-language original available.

### 12.3 Officer search

- Cross-language search across case files, policy, decisions.
- Translation provided; original always available.

### 12.4 Forbidden in search

- Search available only in dominant language.
- Translation collapse in results.
- Hiding non-dominant-language content from search.

---

## 13. Notifications

### 13.1 Per Companion 22 §4

- Citizen's preferred language honored.
- Across channels: SMS, USSD, IVR, push, email, agent, walk-in.
- Plain language.
- Accessibility.

### 13.2 Cross-channel consistency

Notification reaching citizen via SMS in Yoruba and IVR follow-up in English is a failure; cross-channel coherence is part of SLIL.

### 13.3 Forbidden in notifications

- Notification in language citizen does not read.
- Cross-channel inconsistency.
- Use of notification language for political messaging.

---

## 14. Legal and compliance

### 14.1 Authoritative language(s) per sovereign

- Each sovereign declares which languages are legally authoritative for which documents.
- Many sovereigns are multilingual at the legal level (Canada, Belgium, South Africa, India, Switzerland, many).
- Some are single-authoritative with translation provided.

### 14.2 Translation status

- Every legal document marks translation status (authoritative / official translation / advisory translation / machine translation with human validation pending).
- Citizens always informed which version governs.

### 14.3 Cross-language consistency

- Where multiple authoritative languages, parallel-text discipline.
- Where translation, sovereign-validated translator role.
- Inconsistency triggers review.

### 14.4 Cross-sovereign legal-text federation

Per Companion 140:

- Cross-border legal documents follow each sovereign's authoritative-language regime.
- Translation under treaty-defined terminology.
- Anti-extraterritorial-language-imposition.

### 14.5 Forbidden in legal/compliance

- Machine translation as authoritative legal text.
- Citizen-binding documents in language the citizen cannot read.
- Cross-language enforcement inconsistency.
- Use of legal-language regime for discrimination.

---

## 15. Cross-border cross-language federation

### 15.1 The pattern

A citizen of A traveling, working, or seeking service in B presents a credential or document in A's language. B's systems need to interpret it.

### 15.2 Mechanisms

- W3C VC with multilingual claim values.
- Per-treaty terminology alignment tables (Companion 140 §5).
- Real-time translation at inter-realm gateway for non-legal text.
- Sovereign-validated official translation for legal text.
- Cultural-context-aware translation (e.g., honorifics, kinship terms, customary land terms).

### 15.3 Anti-language-imperialism

Cross-sovereign cooperation does not impose one sovereign's language on another. Lingua francas (English, French, Arabic, Spanish, Portuguese, Russian, Mandarin in regional contexts) used pragmatically; sovereign-language interfaces preserved.

### 15.4 Forbidden in cross-border language

- Cross-border arrangement that imposes a dominant language on smaller sovereigns.
- Legal text exchanged without translation status declared.
- Use of cross-border channels for language imposition.

---

## 16. Multilingual training data sovereignty

Per Companion 139:

- Sovereign-collected language data remains sovereign-controlled.
- Indigenous and minority language data community-controlled per Companion 36.
- Anti-extractive ML training on sovereign citizen interactions.
- Open-source contribution to multilingual models for low-resource languages on sovereign-acceptable terms.

### 16.1 Cooperation patterns

- Cross-sovereign cooperation for shared languages (e.g., a Pan-African Swahili LLM coalition; Arabic LLM coalition; Spanish LLM coalition; Francophone LLM coalition).
- Indigenous-language coalitions where communities choose to cooperate across sovereigns.

### 16.2 Forbidden

- Sovereign citizen interactions used to train foreign-vendor models without consent.
- Indigenous-community language data extracted without community consent.
- Cooperation that subordinates sovereign language data authority.

---

## 17. Low-resource language uplift

### 17.1 The challenge

Many indigenous, minority, and even national languages have limited digital infrastructure — no large corpora, no high-quality ASR/TTS, no terminology registries, no multilingual model coverage.

### 17.2 Mechanisms

- Sovereign-funded corpus collection programs (with community consent and benefit).
- Community-led terminology development (per Companion 36).
- Open-source contribution and partnership.
- Cross-sovereign cooperation where languages span borders.
- Civic Memory Archive (Companion 25) preservation.
- Civil society linguistic organizations engagement.

### 17.3 Discipline

- Anti-extractive.
- Community-led.
- Long-term commitment.
- Anti-tokenistic.

### 17.4 Forbidden

- Corpus collection without community consent.
- Extractive use of community linguistic work.
- Discrimination based on language resource status.

---

## 18. Sign languages

### 18.1 The principle

Sign languages are full languages, not visualizations of spoken languages. Each sovereign has its own sign language(s) (ASL, BSL, LSF, ISL, JSL, KSL, Auslan, Libras, LSC, ISL India, ZSL — and dozens more, many independent of any spoken language).

### 18.2 Mechanisms

- Sign-language video interpretation for service interactions.
- Sign-language pre-recorded content for static information.
- Sign-language Deaf-community engagement.
- AI sign-language recognition/synthesis as Class A/B (advisory) only; human interpretation for binding.
- Accessibility per Companion 110.

### 18.3 Forbidden

- Sign-language excluded from inventory where Deaf community present.
- Sign-language treated as accessibility afterthought rather than language.
- AI sign-language interpretation as binding.

---

## 19. Cultural and religious calendar in language

Per Companion 51 and Companion 132:

- Date display per preferred calendar in citizen language.
- Religious-language considerations (e.g., Arabic for Muslim observances, Hebrew for Jewish, Sanskrit/regional for Hindu, Pali for Buddhist, Ge'ez for Ethiopian Orthodox, Coptic for Coptic Orthodox).
- Cultural anniversaries named appropriately per community.

---

## 20. People's Editor and language governance

Per Companion 28 §7:

- People's Editor reviews citizen-facing language across all sovereign languages.
- Standing to require revision.
- Civil society and community partnership.
- Multilingual editorial team.

### 20.1 Discipline

- Anti-dominant-language-skew in editorial.
- Editorial team representing language inventory.
- Plain language across all languages.

### 20.2 Forbidden

- Editorial only in dominant language.
- Suppression of community linguistic feedback.

---

## 21. Cross-references

- Companion 22 (plain language and multilingual UI).
- Companion 25 (Civic Memory Archive).
- Companion 26 (lifecycle).
- Companion 28 (constitutional officers including People's Editor).
- Companion 35 (contestability).
- Companion 36 (indigenous languages and protocols).
- Companion 51 (religious / family / cultural).
- Companion 67 (offline-first / IVR / USSD).
- Companion 74 (civil society).
- Companion 110 (accessibility).
- Companion 117 (typography and script).
- Companion 132 (calendar plurality).
- Companion 138 (constitutional AI governance).
- Companion 139 (sovereignty doctrine).
- Companion 140 (multi-country interop).
- Companion 142 (NCCC public communications).
- Companion 144 (Africa-first deployment).
- Companion 145 (regional playbooks).
- Companion 146 (ministry onboarding).
- Companion 147 (municipal digitization).

---

## 22. KPIs

| KPI | Indicator |
|---|---|
| Sovereign Language Inventory ratification | Per sovereign |
| Per-language service coverage | All inventory languages |
| Terminology registry coverage | All domains, all inventory languages |
| AI assistant per-language quality | Per-language eval |
| ASR/TTS per-language coverage | Inventory coverage |
| RTL and complex-script rendering | Across all UI |
| Document generation per language | Coverage |
| Cross-language case continuity | Anti-language-stripping audit |
| Cross-language analytics stratification | Per cycle |
| Multilingual search recall | Cross-lingual |
| Per-language notification compliance | 100% citizen preference |
| Legal authoritative-language compliance | 100% |
| Cross-sovereign cross-language federation | Per treaty |
| Indigenous-community-led language work | Per Companion 36 |
| Low-resource language uplift | Trending |
| Sign-language coverage | Per Deaf community |
| People's Editor multilingual reach | All languages |

---

## 23. Forbidden in Sovereign Language Infrastructure Layer

CivicOS will not:

- Permit removal of language tier without constitutional process.
- Allow language inventory commitments to remain unfulfilled at any layer.
- Permit dominant-language imposition at any layer where inventory commits otherwise.
- Allow storage encoding that drops non-Latin scripts.
- Permit Unicode-incompatibility anywhere in data plane.
- Allow RTL languages rendered as LTR.
- Permit complex scripts rendered as boxes / mojibake.
- Allow plural / gender rules from one language imposed on others.
- Permit ASR/TTS only in dominant language while inventory commits broader.
- Allow voice surveillance of citizens via service interaction.
- Permit dialect erasure via prestige-only training.
- Allow citizen-binding document in language the citizen cannot read.
- Permit machine translation of binding legal text without human validation.
- Allow terminology drift from sovereign registry.
- Permit AI hallucination on legal/medical/safety terms (retrieval grounding required).
- Allow per-language quality silently degraded.
- Permit language stripping in workflow routing.
- Allow aggregate analytics that erase per-language patterns.
- Permit search hiding non-dominant-language content.
- Allow notifications in language citizen does not read.
- Permit cross-channel notification inconsistency.
- Allow cross-border arrangement imposing dominant language on smaller sovereigns.
- Permit sovereign citizen interactions used to train foreign models without consent.
- Allow indigenous-community language data extracted without community consent.
- Permit sign-language treated as accessibility afterthought.
- Allow editorial only in dominant language.
- Permit imposed terminology without community/expert involvement.
- Allow extractive use of community-developed terminology.

This list grows; it does not shrink.

---

## 24. The Sovereign Language Infrastructure Layer north star

Language is the operating substrate of statecraft. Every law, every form, every notification, every contestation, every receipt, every workflow, every AI response, every voice prompt, every reporting indicator, every cross-border message lives in language. A sovereign platform that treats multilingualism as a frontend skin imposes the dominant language at every layer it forgot to translate. SLIL is the architectural commitment that no layer of CivicOS forgets — storage is Unicode-native; UI renders every script; workflows preserve language across handoffs; AI serves citizens in their languages with terminology grounded in sovereign-validated registries; voice systems speak every inventory language; documents generate per locale; analytics stratify per language; search retrieves across languages; notifications honor citizen preference; legal text declares authoritative language; cross-border cooperation respects each sovereign's languages.

When CivicOS becomes infrastructure where multilingualism is a tickbox at the UI layer while databases discard non-Latin scripts, where AI assistants hallucinate in indigenous languages because they were trained only on dominant ones, where voice systems work only for the literate in colonial languages, where citizen-binding documents are issued in languages citizens cannot read, where sovereign citizen interactions train foreign-vendor models without consent, where indigenous community language work is extracted without benefit — it has failed at the language discipline. Capability without SLIL is the institutionalization of linguistic imperialism through digital scale.

When the platform supports every inventory language at every layer, every script rendered correctly, every voice synthesized naturally, every document generated locally, every AI grounded in sovereign terminology, every workflow preserving language, every cross-border message respecting each sovereign's language regime, every indigenous community leading their own language work, every Deaf community served in their own sign language — it earns the right to be infrastructure for plural societies that speak in many languages and are governed in all of them.

The discipline is daily. The inventory is constitutional. The terminology is sovereign. The voice is dialect-aware. The AI is grounded. The workflow is language-preserving. The analytics stratifies. The legal text declares authority. The cross-border respects sovereignty. The communities lead.

Language is statecraft. The platform either serves it everywhere or imposes it somewhere. SLIL is the commitment that the platform serves it — at every layer, in every workflow, across every border, for every citizen, in every language the sovereign inventory promises. Anything less abandons citizens whose languages don't match the default to digital marginalization wearing infrastructure's costume.

The Sovereign Language Infrastructure Layer is the platform's promise that no citizen meets the state in a language they cannot speak — and that no language meets the state in an architecture that wasn't built for it.
