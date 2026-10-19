import { describe, it, expect } from 'vitest';
import { answer } from './answer';
import { getMessages } from '@/lib/i18n';

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

  it('does not mistake words that merely contain a short keyword', () => {
    expect(answer('I did not get a reply')).toMatch(/I can help you find civic information/);
  });

  it('understands the nation\'s language and answers in it', () => {
    const sw = getMessages('sw'), fr = getMessages('fr'), ar = getMessages('ar'), yo = getMessages('yo');
    expect(answer('Ninawezaje kumhamisha mtoto wangu shule nyingine?', sw)).toBe(sw.assistant.answers.school);
    expect(answer('Nataka kulipa bili ya maji', sw)).toBe(sw.assistant.answers.pay);
    expect(answer('Comment payer ma facture ?', fr)).toBe(fr.assistant.answers.pay);
    expect(answer('mon impot', fr)).toBe(fr.assistant.answers.tax);
    expect(answer('Je veux contester une décision', fr)).toBe(fr.assistant.answers.contest);
    expect(answer('كيف أحجز موعدا مع الطبيب؟', ar)).toBe(ar.assistant.answers.health);
    expect(answer('Mo fẹ́ san owó iná', yo)).toBe(yo.assistant.answers.pay);
  });

  it('still understands English in another language, and answers in that language', () => {
    const sw = getMessages('sw');
    expect(answer('pay my water bill', sw)).toBe(sw.assistant.answers.pay);
    expect(answer('habari', sw)).toBe(sw.assistant.answers.fallback);
  });

  it('opens each language\'s sample conversation on the school answer', () => {
    for (const code of ['en', 'sw', 'fr', 'ar', 'yo'] as const) {
      const m = getMessages(code);
      expect(answer(m.assistant.sampleQuestion, m)).toBe(m.assistant.answers.school);
    }
  });
});
