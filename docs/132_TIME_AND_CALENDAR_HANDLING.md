# CivicOS — Time and Calendar Handling (Companion 132)

This companion specifies how CivicOS handles time, calendars, dates, and time-related operations across the plural calendar systems of the world. It complements Companion 25 §6.1 (multiple calendar systems), Companion 51 (religious affairs including holy days), Companion 36 (indigenous calendar traditions), and Companion 07 (data dictionary including date handling) by being specifically about operational practices for time and calendar.

The thesis: **time and calendar are not technical neutrals — they encode cultural and religious traditions, and digital infrastructure that imposes one calendar imposes one tradition**. CivicOS supports multiple calendar systems as first-class, handles religious holy days, respects indigenous calendar traditions, and maintains technical correctness across plural temporal frameworks.

The discipline: multiple calendar systems first-class; citizen choice of default calendar; religious holy days observed; indigenous calendar traditions respected; technical correctness across systems; daylight saving and time zones honest; historical date accuracy preserved; cross-sovereign time cooperation per applicable standards.

---

## 1. Principles

1. **Multiple calendar systems first-class.** Per Companion 25 §6.1.
2. **Citizen choice of default calendar.** Personal preference respected.
3. **Religious holy days observed.** In service availability.
4. **Indigenous calendar traditions respected.** Per Companion 36.
5. **Technical correctness across systems.** Anti-leap-year-bug.
6. **Daylight saving honest.** Where applicable.
7. **Time zones accurate.** Cross-region.
8. **Historical date accuracy preserved.** Anti-revisionism.
9. **Cross-sovereign time cooperation.** Per standards.
10. **Plain language temporal communication.** Per Companion 22 §6.

---

## 2. Calendar systems supported

| Calendar | Tradition | First-class support |
|---|---|---|
| **Gregorian** | International civil | Default for international |
| **Hijri (Islamic)** | Islamic tradition | Per applicable sovereigns |
| **Hebrew** | Jewish tradition | Per applicable sovereigns |
| **Persian (Solar Hijri)** | Iranian tradition | Per applicable sovereigns |
| **Ethiopian** | Ethiopian tradition | Per applicable sovereigns |
| **Coptic** | Coptic Christian | Per applicable sovereigns |
| **Buddhist** | Buddhist tradition | Per applicable sovereigns |
| **Chinese lunisolar** | Chinese tradition | Per applicable sovereigns |
| **Korean lunisolar** | Korean tradition | Per applicable sovereigns |
| **Vietnamese lunisolar** | Vietnamese tradition | Per applicable sovereigns |
| **Tibetan** | Tibetan tradition | Per applicable sovereigns |
| **Hindu** | Hindu tradition (multiple) | Per applicable sovereigns |
| **Indigenous calendars** | Per community traditions | Per Companion 36 |
| **Other** | Various traditional and minority | Per sovereign discretion |

Each is first-class where applicable, not afterthought.

---

## 3. Citizen calendar choice

### 3.1 Mechanisms

- Citizen wallet stores preferred calendar.
- Service interactions in preferred calendar.
- Date display per preference.
- Cross-calendar conversion automatic.
- Anti-imposition of any calendar.

### 3.2 Discipline

- Anti-dominant-calendar-imposition.
- Plurality of calendar choice.
- Cultural sensitivity.

### 3.3 Forbidden

- Forced use of single calendar.
- Discrimination based on calendar preference.
- Use of calendar choice for adverse decisions.

---

## 4. Religious holy days

Per Companion 51:

### 4.1 Mechanisms

- Religious calendars integrated into service availability.
- Sabbath observance accommodated.
- Major religious holidays observed in scheduling.
- Anti-discriminatory service availability across religious traditions.

### 4.2 Discipline

- Multi-religious accommodation.
- Anti-discrimination among religious traditions in holiday accommodation.
- Cultural and religious sensitivity.

### 4.3 Forbidden

- Discrimination among religious holy days.
- Suppression of religious calendar observance.
- Use of religious calendar preference for adverse decisions.

---

## 5. Indigenous calendar traditions

Per Companion 36:

### 5.1 The principle

Indigenous communities may have calendar traditions distinct from settler-colonial calendars.

### 5.2 Mechanisms

- Community calendar traditions respected.
- Community-determined service scheduling where applicable.
- Anti-imposition of dominant calendar.
- Cultural protocols around time respected.

### 5.3 Discipline

- Communities lead in their calendar practice.
- Anti-extractive-calendar-data.
- Cultural sensitivity.

### 5.4 Forbidden

- Imposition of dominant calendar on indigenous communities.
- Appropriation of indigenous calendar knowledge.
- Discrimination based on indigenous calendar use.

---

## 6. Technical correctness

### 6.1 The principle

Date and time handling technically correct across all systems.

### 6.2 Common pitfalls

- Leap year handling (Gregorian and other systems).
- Year boundaries varying by calendar.
- Time zone transitions.
- Daylight saving boundaries.
- Date-line crossings.
- Calendar transitions (e.g., Julian to Gregorian historical).
- Cross-calendar conversion accuracy.

### 6.3 Mechanisms

- Robust libraries for each calendar.
- Cross-calendar conversion tested.
- Edge case handling explicit.
- Documentation of calendar system specifics.

### 6.4 Discipline

- Anti-Gregorian-only-development.
- Multi-calendar testing.
- Honest about edge cases.

### 6.5 Forbidden

- Calendar bugs that affect citizen services.
- Calendar handling that imposes one tradition.
- Suppression of calendar correctness issues.

---

## 7. Time zones

### 7.1 Mechanisms

- IANA time zone database used.
- Cross-region time accurate.
- Time zone preference respected.
- Daylight saving honest where applicable.

### 7.2 Discipline

- Anti-time-zone-imperialism.
- Accurate cross-region time.
- Anti-confusion through ambiguous time display.

### 7.3 Forbidden

- Discrimination in time zone display.
- Use of time zone for surveillance.
- Misleading time display.

---

## 8. Historical dates

### 8.1 The principle

Historical dates preserved accurately, including calendar transitions.

### 8.2 Mechanisms

- Historical calendar transitions documented.
- Pre-modern dates per applicable calendar.
- Anti-revisionism in date records.
- Multi-perspective historical record.

### 8.3 Discipline

- Anti-erasure of historical calendar practices.
- Cultural and religious accuracy.
- Honest documentation.

### 8.4 Forbidden

- Politicized rewriting of historical dates.
- Suppression of calendar tradition history.
- Discrimination in historical record across calendar traditions.

---

## 9. Service availability and calendar

### 9.1 Mechanisms

- Service schedules accommodate religious and cultural calendar observances.
- Emergency services available across all calendars.
- Anti-discriminatory scheduling.

### 9.2 Discipline

- Per Companion 51: religious accommodation in service.
- Multi-cultural accommodation.
- Anti-favoritism of dominant calendar.

### 9.3 Forbidden

- Service unavailability discriminating against specific calendar traditions.
- Use of service scheduling for cultural homogenization.

---

## 10. Cross-sovereign time

### 10.1 Mechanisms

- ISO 8601 for technical exchange.
- UTC for cross-border coordination.
- Local time and calendar for citizen display.
- Cross-sovereign cooperation per standards bodies.

### 10.2 Discipline

- Sovereign authority over time zone.
- Cultural and religious time respected.
- Anti-time-imperialism.

### 10.3 Forbidden

- Cross-border arrangements compromising sovereign time/calendar authority.
- Use of time standards for political coercion.
- Discrimination in cross-border time handling.

---

## 11. Anniversaries and observances

### 11.1 Mechanisms

- National anniversaries per sovereign calendar.
- Religious observances per Companion 51.
- Indigenous community anniversaries per community.
- Cultural anniversaries respected.

### 11.2 Discipline

- Plurality of anniversaries.
- Anti-imposition of dominant culture anniversaries.
- Anti-erasure of contested historical events.

### 11.3 Forbidden

- Use of anniversary infrastructure for political reward.
- Suppression of community anniversaries.
- Discrimination in anniversary recognition.

---

## 12. Algorithmic systems and time

### 12.1 The principle

Algorithmic systems that depend on time must handle calendar plurality correctly.

### 12.2 Mechanisms

- Cross-calendar testing of algorithmic systems.
- Anti-Gregorian-only-algorithm.
- Cultural sensitivity in time-based features.

### 12.3 Discipline

- Anti-calendar-based-discrimination through algorithms.
- Honest about calendar handling in algorithms.

### 12.4 Forbidden

- Algorithmic discrimination based on calendar preference.
- Calendar bugs in algorithmic systems.
- Use of calendar data for surveillance.

---

## 13. Plain language temporal communication

Per Companion 22 §6:

### 13.1 The principle

Time and date communication clear in plain language.

### 13.2 Mechanisms

- Preferred calendar in citizen-facing communication.
- Clear date format per culture.
- Anti-ambiguous-date-display.
- Multi-language temporal expressions.

### 13.3 Discipline

- Anti-date-format-confusion.
- Cultural appropriateness.
- Clear scheduling.

### 13.4 Forbidden

- Confusing temporal communication.
- Discrimination through temporal display.
- Use of date communication for political purposes.

---

## 14. Forbidden in time and calendar handling

CivicOS will not:

- Permit forced use of single calendar.
- Allow discrimination based on calendar preference.
- Permit discrimination among religious holy days.
- Allow imposition of dominant calendar on indigenous communities.
- Permit appropriation of indigenous calendar knowledge.
- Allow calendar bugs that affect citizen services.
- Permit calendar handling that imposes one tradition.
- Allow discrimination in time zone display.
- Permit use of time zone for surveillance.
- Allow politicized rewriting of historical dates.
- Permit suppression of calendar tradition history.
- Allow service unavailability discriminating against specific calendar traditions.
- Permit cross-border arrangements compromising sovereign time/calendar authority.
- Allow use of anniversary infrastructure for political reward.
- Permit suppression of community anniversaries.
- Allow algorithmic discrimination based on calendar preference.
- Permit calendar bugs in algorithmic systems.
- Allow confusing temporal communication.

This list grows; it does not shrink.

---

## 15. KPIs

| KPI | Indicator |
|---|---|
| Multi-calendar support | All applicable systems |
| Citizen calendar choice respect | Per preference |
| Religious holy day accommodation | Coverage |
| Indigenous calendar respect | Community satisfaction |
| Technical correctness | Bug rate decreasing |
| Time zone accuracy | Audit |
| Historical date accuracy | Per preserved records |
| Cross-sovereign time cooperation | Standards aligned |
| Plain language temporal communication | Independent assessment |

---

## 16. The time and calendar handling north star

Time and calendar are not technical neutrals. CivicOS supports multiple calendar systems as first-class, religious holy days, indigenous calendar traditions, technical correctness across systems, accurate time zones, historical date preservation, cross-sovereign cooperation, and plain language temporal communication.

When CivicOS becomes a tool of calendar imperialism, religious calendar discrimination, indigenous calendar suppression, or technical incorrectness that affects citizens — it has failed at multilingual and multicultural commitment. Capability without temporal discipline is not progress; it is the institutionalization of dominant culture imposed through default temporal frameworks.

When the platform serves citizens across calendars with full respect — through citizen choice, religious observance, indigenous sovereignty, technical correctness, and plain communication — it earns the right to be infrastructure for plural societies that experience time through diverse traditions.

The discipline is daily. The calendar plurality is structural. The religious observance is real. The indigenous sovereignty is respected. The technical correctness is maintained.

Time is cultural. The platform's handling of time signals whether it respects cultural plurality or imposes dominant culture. Anything less abandons citizens whose temporal traditions don't match the default to platform-mediated cultural marginalization.
