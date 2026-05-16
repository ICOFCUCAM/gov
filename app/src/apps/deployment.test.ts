import { describe, it, expect } from 'vitest';
import { deployableRoots, findDeployable, deploymentTopology, PLATFORM_ROOT } from './deployment';

describe('deployable federation topology', () => {
  it('institution is the deployment boundary; every root is isolated & unique', () => {
    const roots = deployableRoots();
    expect(roots.length).toBeGreaterThanOrEqual(13);
    const ids = roots.map(r => r.root);
    const domains = roots.map(r => r.domain);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(domains).size).toBe(domains.length);
    for (const r of roots) {
      expect(r.isolated).toBe(true);
      expect(r.subsystems.length).toBeGreaterThan(0); // subsystems live INSIDE the root
      expect(r.sharedServices).toContain('orchestration');
      expect(r.kind).not.toBe('platform');
    }
  });

  it('platform is a separate root limited to nervous-system responsibilities', () => {
    expect(PLATFORM_ROOT.kind).toBe('platform');
    expect(PLATFORM_ROOT.subsystems).toContain('national-command');
    expect(PLATFORM_ROOT.subsystems).not.toContain('hospital-network');
    const t = deploymentTopology();
    expect(t.boundary).toBe('institution');
    expect(t.totalRoots).toBe(deployableRoots().length + 1);
  });

  it('lookup by domain or root resolves the deployable unit', () => {
    expect(findDeployable('health')?.root).toBe('ministry-health');
    expect(findDeployable('treasury')?.domain).toBe('treasury');
    expect(findDeployable('parliament')?.root).toBe('legislature');
    expect(findDeployable('nonexistent')).toBeUndefined();
  });
});
