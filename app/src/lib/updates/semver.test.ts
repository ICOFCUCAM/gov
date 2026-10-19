import { describe, it, expect } from 'vitest';
import { compareVersions, parseVersion, isVersion, baseOf, bumpKind, gt } from './semver';

describe('semantic version ordering', () => {
  it('orders by major, minor, patch numerically (not as strings)', () => {
    const sorted = ['1.10.0', '1.2.0', '1.9.9', '2.0.0', '1.2.10', '1.2.2'].sort(compareVersions);
    expect(sorted).toEqual(['1.2.0', '1.2.2', '1.2.10', '1.9.9', '1.10.0', '2.0.0']);
  });

  it('puts pre-releases before their release, per semver precedence', () => {
    const sorted = ['1.0.0', '1.0.0-rc.1', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta.11', '1.0.0-beta.2', '1.0.0-beta'].sort(compareVersions);
    expect(sorted).toEqual(['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0']);
  });

  it('orders nation builds after their base and before the next global version', () => {
    const sorted = ['1.4.2', '1.4.1+sov.2', '1.4.1', '1.4.1+sov.10', '1.4.1+sov.1'].sort(compareVersions);
    expect(sorted).toEqual(['1.4.1', '1.4.1+sov.1', '1.4.1+sov.2', '1.4.1+sov.10', '1.4.2']);
    expect(gt('1.4.1+sov.1', '1.4.1')).toBe(true);
  });

  it('validates versions and finds the base of a nation build', () => {
    expect(isVersion('1.4.1')).toBe(true);
    expect(isVersion('v2.0.0')).toBe(true);
    expect(isVersion('1.4')).toBe(false);
    expect(isVersion('01.2.3')).toBe(false);
    expect(parseVersion('1.4.1+sov.3')?.build).toBe(3);
    expect(baseOf('1.4.1+sov.3')).toBe('1.4.1');
  });

  it('names the kind of step', () => {
    expect(bumpKind('1.4.0', '2.0.0')).toBe('major');
    expect(bumpKind('1.4.0', '1.5.0')).toBe('minor');
    expect(bumpKind('1.4.0', '1.4.1')).toBe('patch');
    expect(bumpKind('1.4.1', '1.4.1+sov.1')).toBe('nation-build');
    expect(bumpKind('1.4.1', '1.4.0')).toBe('downgrade');
  });
});
