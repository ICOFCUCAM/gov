// Go-live review M-12: /app/[domain] shows one institution's app, so the host
// loads each app on demand instead of bundling all of them into the route.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = readFileSync(join(process.cwd(), 'src', 'apps', 'AppHost.tsx'), 'utf8');

describe('the federated app host', () => {
  it('imports no institution app statically', () => {
    const staticApps = [...HOST.matchAll(/^import [^;]* from '(@\/apps\/[\w/-]+(?:App|Wall)|@\/components\/features\/BranchWorkspace)';$/gm)].map(m => m[1]);
    expect(staticApps).toEqual([]);
  });

  it('loads every app it renders through next/dynamic', () => {
    const lazy = [...HOST.matchAll(/^const (\w+) = dynamic\(\(\) => import\('([^']+)'\)/gm)].map(m => m[1]);
    expect(lazy.length).toBeGreaterThanOrEqual(24);
    for (const name of ['TreasuryApp', 'MinistryHealthApp', 'NocApp', 'PoliceCommandApp', 'SectorInstitutionApp', 'OfficerConsoleApp', 'CitizenWalletApp']) {
      expect(lazy).toContain(name);
      expect(HOST).toContain(`<${name} `);
    }
  });
});
