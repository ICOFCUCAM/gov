import { describe, it, expect } from 'vitest';
import { answer } from './answer';

describe('civic assistant answer', () => {
  it('routes common intents to grounded replies', () => {
    expect(answer('How do I transfer my child to another school?')).toMatch(/Ministry of Education/);
    expect(answer('I want to start a business permit')).toMatch(/Permits/);
    expect(answer('When is my child grant paid?')).toMatch(/grant/i);
    expect(answer('my tax draft')).toMatch(/nothing is filed until you confirm/);
    expect(answer('change my address')).toMatch(/Selective disclosure/);
    expect(answer('book a doctor appointment')).toMatch(/health portal/);
    expect(answer('verify this certificate')).toMatch(/without storing a copy/);
    expect(answer('I want to appeal a wrong decision')).toMatch(/never penalised/);
    expect(answer('pay my water bill')).toMatch(/signed, permanent receipt/);
  });

  it('falls back helpfully and never drafts a decision', () => {
    const a = answer('hello there');
    expect(a).toMatch(/I can help you find civic information/);
    expect(a).toMatch(/talk to a human officer/);
  });

  it('is deterministic', () => {
    expect(answer('school transfer')).toBe(answer('SCHOOL TRANSFER'));
  });
});
