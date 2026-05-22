import { describe, it, expect } from 'vitest';
import { mergeScoreboard } from './AccountabilityScoreboard';
import type { ServiceSlaStat, AppealsStat, DirectiveStat, ConsentFootprintStat } from '@/lib/db/repos/institutions';

const sla = (over: Partial<ServiceSlaStat> & { charterId: string }): ServiceSlaStat => ({
  submitted: 0, acknowledged: 0, resolved: 0, open: 0, cancelled: 0,
  medianAckHours: null, medianResolveHours: null, p90ResolveHours: null, oldestOpenHours: null,
  rated: 0, avgSatisfaction: null, ...over,
});

describe('mergeScoreboard', () => {
  it('joins the four aggregates into one row per charter', () => {
    const rows = mergeScoreboard(
      [sla({ charterId: 'MIN-H', open: 3, medianResolveHours: 12 })],
      [{ charterId: 'MIN-H', filed: 5, admitted: 0, decided: 0, published: 0, pending: 2, withdrawn: 0, medianDecisionDays: 4, p90DecisionDays: null, oldestPendingDays: null } as AppealsStat],
      [{ charterId: 'MIN-H', signed: 4, effective: 3, inForce: 2, rescinded: 0, medianSignToEffectiveDays: null } as DirectiveStat],
      [
        { charterId: 'MIN-H', scope: 'health.records', active: 10, expiring30d: 0, revoked: 0 } as ConsentFootprintStat,
        { charterId: 'MIN-H', scope: 'tax.filings', active: 5, expiring30d: 0, revoked: 0 } as ConsentFootprintStat,
      ],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      charterId: 'MIN-H', slaOpen: 3, slaMedianResolveHours: 12,
      appealsPending: 2, appealsMedianDays: 4, directivesInForce: 2,
      consentActive: 15, // summed across scopes
    });
  });

  it('creates rows for charters present in only one source, with zero defaults', () => {
    const rows = mergeScoreboard(
      [sla({ charterId: 'A', open: 1 })],
      [],
      [{ charterId: 'B', signed: 1, effective: 0, inForce: 1, rescinded: 0, medianSignToEffectiveDays: null } as DirectiveStat],
      [],
    );
    const byId = Object.fromEntries(rows.map(r => [r.charterId, r]));
    expect(byId.A!.slaOpen).toBe(1);
    expect(byId.A!.directivesInForce).toBe(0);
    expect(byId.B!.directivesInForce).toBe(1);
    expect(byId.B!.slaOpen).toBe(0);
    expect(byId.B!.appealsMedianDays).toBeNull();
  });
});
