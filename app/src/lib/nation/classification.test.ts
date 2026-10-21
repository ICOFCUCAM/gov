// The composable classification of the state (plan phase 4; audit H): derived
// from the locked `stateForm` until the nation records it (only what that form
// says), checked when recorded, and the front-door platform label kept for
// every existing nation while a recorded style can now say sultanate,
// principality or grand duchy.
import { describe, it, expect } from 'vitest';
import { classificationOf, checkClassification, derivedStyle } from './classification';
import { platformLabel } from '@/components/features/cover/entry';
import type { SovereignProfile } from '@/lib/api/types';

const p = (x: Partial<SovereignProfile>) => ({ stateForm: 'republic', stateName: 'Republic of X', ...x }) as SovereignProfile;

describe('state classification', () => {
  it('derives defaults from stateForm, saying only what the form says', () => {
    expect(classificationOf(p({ stateForm: 'republic' }))).toMatchObject({ derived: true, stateForms: ['republic'], governmentForms: ['presidential'], territorialArrangements: [], legalTraditions: [], authorityTypes: [] });
    expect(classificationOf(p({ stateForm: 'parliamentary' }))).toMatchObject({ stateForms: ['republic'], governmentForms: ['parliamentary'] });
    expect(classificationOf(p({ stateForm: 'federation' }))).toMatchObject({ stateForms: ['federation'], territorialArrangements: ['federal'], governmentForms: [] });
    expect(classificationOf(p({ stateForm: 'monarchy', stateName: 'Kingdom of Y' }))).toMatchObject({ stateForms: ['monarchy'], style: 'kingdom' });
    expect(classificationOf(p({ stateForm: 'union' }))).toMatchObject({ stateForms: ['union'], territorialArrangements: ['union'] });
    // The legal system named in the deployment profile.
    expect(classificationOf(p({ deployment: { jurisdiction: { legalSystem: 'customary' } } }))).toMatchObject({ legalTraditions: ['customary_law'], authorityTypes: ['customary'] });
  });

  it('uses what the nation recorded, several values per axis, with sources and a date', () => {
    const c = checkClassification({ stateForms: ['monarchy', 'federation'], governmentForms: ['parliamentary'], territorialArrangements: ['federal'], legalTraditions: ['civil_law', 'customary_law'], authorityTypes: ['constitutional', 'statutory', 'customary'], style: 'emirate', sources: ['Constitution, art. 1'], effectiveFrom: '1971-12-02' });
    if ('error' in c) throw new Error(c.error);
    const r = classificationOf(p({ stateForm: 'monarchy', stateName: 'Federation', constitution: { classification: c } }));
    expect(r).toMatchObject({ derived: false, stateForms: ['monarchy', 'federation'], style: 'emirate', sources: ['Constitution, art. 1'], effectiveFrom: '1971-12-02' });
    expect(checkClassification({ stateForms: ['Not a key'] })).toMatchObject({ error: expect.stringMatching(/stateForms/) });
    expect(checkClassification({ stateForms: [], style: 'empire' })).toMatchObject({ error: expect.stringMatching(/style/) });
  });

  it('keeps platformLabel unchanged for existing nations and follows a recorded style', () => {
    expect(platformLabel('republic', 'Republic of Kenya')).toBe('Official Government Platform');
    expect(platformLabel('parliamentary', 'Federal Republic')).toBe('Official Government Platform');
    expect(platformLabel('federation', 'United States')).toBe('Official Government Platform');
    expect(platformLabel('city-state', 'Singapore')).toBe('Official Government Platform');
    expect(platformLabel('union', 'Union')).toBe('Official Government Platform');
    expect(platformLabel('monarchy', 'Kingdom of Norway')).toBe('Official Kingdom Platform');
    expect(platformLabel('monarchy', 'United Arab Emirates')).toBe('Official Emirate Platform');
    expect(platformLabel('monarchy', 'State of Qatar')).toBe('Official Kingdom Platform');
    expect(derivedStyle('monarchy', 'Emirate of Y')).toBe('emirate');
    // A recorded style replaces the name-based guess.
    expect(platformLabel('monarchy', 'Sultanate of Oman', 'sultanate')).toBe('Official Sultanate Platform');
    expect(platformLabel('monarchy', 'Luxembourg', 'grand-duchy')).toBe('Official Grand Duchy Platform');
    expect(platformLabel('monarchy', 'Monaco', 'principality')).toBe('Official Principality Platform');
    expect(platformLabel('monarchy', 'State of Qatar', 'emirate')).toBe('Official Emirate Platform');
  });
});
