import { describe, it, expect } from 'vitest';
import { TONE } from '@/components/features/SituationRoom';
import {
  severityTone, priorityTone,
  directiveStatusTone, dispatchStatusTone, consentStatusTone,
} from './tone';

describe('severityTone', () => {
  it('returns alert for national and major', () => {
    expect(severityTone('national')).toBe(TONE.alert);
    expect(severityTone('major')).toBe(TONE.alert);
  });
  it('returns warn for minor', () => {
    expect(severityTone('minor')).toBe(TONE.warn);
  });
  it('returns link for unknown values', () => {
    expect(severityTone('watch')).toBe(TONE.link);
    expect(severityTone('')).toBe(TONE.link);
  });
});

describe('priorityTone', () => {
  it('returns alert for critical and urgent', () => {
    expect(priorityTone('critical')).toBe(TONE.alert);
    expect(priorityTone('urgent')).toBe(TONE.alert);
  });
  it('returns warn for priority', () => {
    expect(priorityTone('priority')).toBe(TONE.warn);
  });
  it('returns link for routine and unknown', () => {
    expect(priorityTone('routine')).toBe(TONE.link);
    expect(priorityTone('')).toBe(TONE.link);
  });
});

describe('directiveStatusTone', () => {
  it('maps effective → ok, signed → link, rescinded → alert', () => {
    expect(directiveStatusTone('effective')).toBe(TONE.ok);
    expect(directiveStatusTone('signed')).toBe(TONE.link);
    expect(directiveStatusTone('rescinded')).toBe(TONE.alert);
  });
  it('falls back to warn for drafting/published/unknown', () => {
    expect(directiveStatusTone('drafting')).toBe(TONE.warn);
    expect(directiveStatusTone('published')).toBe(TONE.warn);
    expect(directiveStatusTone('')).toBe(TONE.warn);
  });
});

describe('dispatchStatusTone', () => {
  it('maps closed → ok, acknowledged → link, dispatched → warn', () => {
    expect(dispatchStatusTone('closed')).toBe(TONE.ok);
    expect(dispatchStatusTone('acknowledged')).toBe(TONE.link);
    expect(dispatchStatusTone('dispatched')).toBe(TONE.warn);
  });
  it('falls back to neutral for unknown', () => {
    expect(dispatchStatusTone('')).toBe(TONE.neutral);
  });
});

describe('consentStatusTone', () => {
  it('maps granted → ok, revoked → alert, expired → warn', () => {
    expect(consentStatusTone('granted')).toBe(TONE.ok);
    expect(consentStatusTone('revoked')).toBe(TONE.alert);
    expect(consentStatusTone('expired')).toBe(TONE.warn);
  });
  it('falls back to link for unknown', () => {
    expect(consentStatusTone('')).toBe(TONE.link);
  });
});
