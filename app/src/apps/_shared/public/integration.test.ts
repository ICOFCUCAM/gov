import { describe, it, expect, afterEach } from 'vitest';
import { siteSchemaData } from './integration';
import { applyNation } from '@/lib/nation/registry';

type Node = Record<string, unknown>;
const graph = (d: Record<string, unknown>) => d['@graph'] as Node[];

describe('schema.org markup for public sites', () => {
  afterEach(() => applyNation({ configured: false }));

  it('describes the institution in its government, the country it serves, its website and emergency number', () => {
    applyNation({ configured: true, stateName: 'Republic of Meridia' });
    const d = siteSchemaData({
      name: 'Police Command', description: 'Civil stability under the rule of law', url: 'https://gov.example/police', lang: 'sw',
      gateway: { mode: 'link', website: 'https://www.police.example.gov', host: 'police.example.gov' }, emergency: 'Emergency 999',
    });
    expect(d['@context']).toBe('https://schema.org');
    const [org, site] = graph(d) as [Node, Node];
    expect(org).toMatchObject({
      '@type': 'GovernmentOrganization', '@id': 'https://gov.example/police#organization', url: 'https://gov.example/police',
      name: 'Police Command', sameAs: ['https://www.police.example.gov'],
      areaServed: { '@type': 'Country', name: 'Republic of Meridia' },
      contactPoint: [{ '@type': 'ContactPoint', telephone: '999', contactType: 'emergency' }],
    });
    expect((org.parentOrganization as Node)['@type']).toBe('GovernmentOrganization');
    expect(site).toMatchObject({ '@type': 'WebSite', url: 'https://gov.example/police', inLanguage: 'sw', publisher: { '@id': 'https://gov.example/police#organization' } });
  });

  it('claims nothing it does not know: no nation before setup, no address outside a request, no number without one', () => {
    const [org, site] = graph(siteSchemaData({ name: 'Ministry of Health', description: 'For a Healthier Nation' })) as [Node, Node];
    expect(org).toEqual({ '@type': 'GovernmentOrganization', name: 'Ministry of Health', description: 'For a Healthier Nation' });
    expect(site).toEqual({ '@type': 'WebSite', name: 'Ministry of Health', publisher: { '@type': 'GovernmentOrganization', name: 'Ministry of Health' } });
  });
});
