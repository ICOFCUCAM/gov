import { describe, it, expect } from 'vitest';
import { aiAdvisory } from './advisory';

describe('shared AI advisory', () => {
  it('is deterministic and severity-coherent', () => {
    const sig = [
      { label: 'ICU occupancy', value: 92, adverse: true },
      { label: 'Response time', value: 70, adverse: true },
      { label: 'Staffing', value: 30, adverse: false },
    ];
    const a = aiAdvisory('Ministry of Health', sig);
    expect(a).toEqual(aiAdvisory('Ministry of Health', sig));
    expect(a.severity).toBe('critical');
    expect(a.recommended.length).toBeGreaterThan(0);
    expect(a.confidence).toBeGreaterThanOrEqual(40);
    expect(a.confidence).toBeLessThanOrEqual(99);

    const calm = aiAdvisory('X', [{ label: 'a', value: 10, adverse: true }]);
    expect(calm.severity).toBe('routine');
  });
});
