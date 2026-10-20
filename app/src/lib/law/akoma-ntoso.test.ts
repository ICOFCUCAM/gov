import { describe, it, expect } from 'vitest';
import { readAkomaNtoso, readProvisionsCsv, toAkomaNtoso } from './akoma-ntoso';
import { checkProvisions } from './register';

const AKN = `<?xml version="1.0" encoding="UTF-8"?>
<akomaNtoso xmlns="http://docs.oasis-open.org/legaldocml/ns/akn/3.0">
  <act name="act">
    <meta><identification source="#x">
      <FRBRWork><FRBRthis value="/akn/md/act/2020/7"/><FRBRdate date="2020-03-01" name="adoption"/></FRBRWork>
      <FRBRExpression><FRBRlanguage language="eng"/></FRBRExpression>
    </identification></meta>
    <preface><p><docTitle>Civil Registration Act</docTitle></p></preface>
    <body>
      <chapter eId="chp_1"><num>I</num><heading>Births</heading>
        <section eId="chp_1__sec_1"><num>1.</num><heading>Duty</heading>
          <subsection eId="chp_1__sec_1__subsec_1"><num>(1)</num><content><p>Every birth shall be registered &amp; certified.</p></content></subsection>
        </section>
      </chapter>
    </body>
  </act>
</akomaNtoso>`;

describe('Akoma Ntoso and CSV', () => {
  it('reads the hierarchy of numbered units with their eIds, numbers, headings and text', () => {
    const r = readAkomaNtoso(AKN);
    if ('error' in r) throw new Error(r.error);
    expect(r.work).toMatchObject({ uri: '/akn/md/act/2020/7', date: '2020-03-01', title: 'Civil Registration Act', language: 'eng' });
    expect(r.provisions).toEqual([
      { eId: 'chp_1', num: 'I', heading: 'Births', text: 'Births' },
      { eId: 'chp_1__sec_1', num: '1', heading: 'Duty', text: 'Duty', parent: 'chp_1' },
      { eId: 'chp_1__sec_1__subsec_1', num: '(1)', text: 'Every birth shall be registered & certified.', parent: 'chp_1__sec_1' },
    ]);
    expect(checkProvisions(r.provisions)).not.toHaveProperty('error');
  });

  it('refuses declarations and documents that are not Akoma Ntoso', () => {
    expect(readAkomaNtoso('<!DOCTYPE x [<!ENTITY a "b">]><akomaNtoso/>')).toHaveProperty('error');
    expect(readAkomaNtoso('<html><body/></html>')).toHaveProperty('error');
    expect(readAkomaNtoso('<akomaNtoso><act><body><p>no units</p></body></act></akomaNtoso>')).toHaveProperty('error');
  });

  it('writes a version back as Akoma Ntoso that reads the same', () => {
    const r = readAkomaNtoso(AKN) as { provisions: Parameters<typeof toAkomaNtoso>[1]['provisions'] };
    const xml = toAkomaNtoso({ id: '/eli/md/act/2020/7', title: 'Civil Registration Act', type: 'act' }, { language: 'en', dates: { inForce: '2020-06-01' }, provisions: r.provisions });
    const again = readAkomaNtoso(xml);
    if ('error' in again) throw new Error(again.error);
    expect(again.provisions).toEqual(r.provisions);
    expect(again.work?.title).toBe('Civil Registration Act');
  });

  it('reads provisions from a CSV', () => {
    const r = readProvisionsCsv('eId,num,heading,text,parent\nart_1,1,Duty,Every birth shall be registered.,\nart_1__para_1,1(1),,Within 60 days.,art_1\n');
    if ('error' in r) throw new Error(r.error);
    expect(r.provisions[1]).toEqual({ eId: 'art_1__para_1', num: '1(1)', text: 'Within 60 days.', parent: 'art_1' });
    expect(readProvisionsCsv('a,b\n1,2\n')).toHaveProperty('error');
  });
});
