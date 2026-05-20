import { describe, it, expect } from 'vitest';
import { justiceRecordsForensicsBoard, JUSTICE_RECORDS_SAFEGUARDS } from './justice-records-forensics';

describe('justice records, forensics & public portal engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(justiceRecordsForensicsBoard(4000 * 270)))
      .toEqual(JSON.stringify(justiceRecordsForensicsBoard(4000 * 270 + 1420)));
  });

  it('archive status reflects integrity threshold and seal rolls', () => {
    for (const a of justiceRecordsForensicsBoard(4000 * 322).records.archives) {
      if (a.integrityIdx < 70) expect(a.status).toBe('restoration');
      else expect(['sealed', 'live', 'review']).toContain(a.status);
      expect(['constitutional', 'supreme-rulings', 'criminal', 'civil', 'land-title', 'corporate-registry']).toContain(a.category);
      expect(a.recordsM).toBeGreaterThan(0);
    }
  });

  it('chain-of-custody transactions sort oldest-first; flagged or held items respect age', () => {
    const txs = justiceRecordsForensicsBoard(4000 * 411).records.custodyTransactions;
    for (let i = 1; i < txs.length; i++) {
      expect(txs[i - 1]!.ageHrs).toBeLessThanOrEqual(txs[i]!.ageHrs);
    }
    for (const t of txs) {
      expect(['in-transit', 'verified', 'held', 'flagged']).toContain(t.status);
      expect(['document', 'physical-evidence', 'digital-evidence', 'biometric-record', 'forensic-report']).toContain(t.artefact);
    }
  });

  it('all 7 forensic disciplines are represented across the lab network', () => {
    const disciplines = justiceRecordsForensicsBoard(4000 * 488).forensics.labs.map(l => l.discipline);
    const expected = ['DNA & biology', 'Toxicology', 'Ballistics', 'Digital & cyber', 'Document examination', 'Trace evidence', 'Forensic pathology'];
    for (const d of expected) expect(disciplines).toContain(d);
  });

  it('forensic labs carry valid accreditation status; capacity and examiners bounded', () => {
    for (const l of justiceRecordsForensicsBoard(4000 * 277).forensics.labs) {
      expect(['accredited', 'review', 'probation', 'suspended']).toContain(l.accreditationStatus);
      expect(l.examinersOnDuty).toBeGreaterThanOrEqual(12);
      expect(l.capacityUtilisationPct).toBeGreaterThan(0);
    }
  });

  it('all 6 legal filing categories tracked; acceptance + rejection bounded by filings', () => {
    const filings = justiceRecordsForensicsBoard(4000 * 533).portal.filings;
    expect(filings.map(f => f.category)).toEqual(['civil', 'criminal', 'family', 'commercial', 'administrative', 'constitutional']);
    for (const f of filings) {
      expect(f.acceptedToday + f.rejectedToday).toBeLessThanOrEqual(f.filedToday);
    }
  });

  it('civil complaints sorted by recency; older complaints reach later stages', () => {
    const cs = justiceRecordsForensicsBoard(4000 * 422).portal.complaints;
    for (let i = 1; i < cs.length; i++) {
      expect(cs[i - 1]!.ageDays).toBeLessThanOrEqual(cs[i]!.ageDays);
    }
    for (const c of cs) {
      if (c.ageDays > 120) expect(c.status).toBe('resolved');
      else if (c.ageDays > 60) expect(c.status).toBe('tribunal');
      else if (c.ageDays > 21) expect(c.status).toBe('mediation');
    }
  });

  it('rights petitions carry valid scope and status; portal availability high', () => {
    const b = justiceRecordsForensicsBoard(4000 * 305);
    for (const p of b.portal.rightsPetitions) {
      expect(['individual', 'class', 'institutional']).toContain(p.scope);
      expect(['docketed', 'scheduled', 'in-hearing', 'reserved', 'ruling-issued']).toContain(p.status);
    }
    expect(b.portal.portalAvailabilityPct).toBeGreaterThan(95);
  });

  it('safeguards prohibit evidence fabrication and counsel denial', () => {
    const b = justiceRecordsForensicsBoard(4000 * 244);
    expect(b.prohibited).toEqual(JUSTICE_RECORDS_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('evidence-fabrication');
    expect(b.prohibited).toContain('tampering-with-chain-of-custody');
    expect(b.prohibited).toContain('denial-of-counsel');
    expect(b.prohibited).toContain('rights-petition-suppression');
  });
});
