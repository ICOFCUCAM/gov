import { describe, it, expect } from 'vitest';
import { collect, render } from './metrics';
import { recordAudit } from '@/lib/data/store';

describe('Prometheus metrics', () => {
  it('renders the exposition format with help, type and escaped labels', () => {
    const text = render([{ name: 'x_total', help: 'X.', type: 'counter', samples: [{ labels: { a: 'q"z' }, value: 3 }, { value: NaN }] }]);
    expect(text).toBe('# HELP x_total X.\n# TYPE x_total counter\nx_total{a="q\\"z"} 3\nx_total 0\n');
  });

  it('reports memory, stores, audit chain, twin sources, facilities and recent problems', () => {
    recordAudit('Officer A', 'test.metrics', 'Test:1', 'ok');
    const names = collect().map(f => f.name);
    for (const n of ['civicos_process_memory_bytes', 'civicos_store_records', 'civicos_audit_entries', 'civicos_audit_chain_intact', 'civicos_twin_source_overdue', 'civicos_facilities', 'civicos_log_problems_last_hour', 'civicos_persistence_last_save_age_seconds']) expect(names).toContain(n);
    const audit = collect().find(f => f.name === 'civicos_audit_entries')!;
    expect(audit.samples[0]!.value).toBeGreaterThan(0);
    expect(render(collect())).toMatch(/^civicos_audit_chain_intact 1$/m);
  });
});
