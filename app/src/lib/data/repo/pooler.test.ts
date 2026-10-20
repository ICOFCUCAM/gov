// Which connections are treated as a transaction-mode pooler (no prepared statements, no LISTEN).
import { describe, it, expect } from 'vitest';
import { transactionPooler } from './postgres';

describe('transaction pooler', () => {
  it('is recognised by the pooler port 6543 or by CIVICOS_PG_POOLER, never by the session port', () => {
    expect(transactionPooler('postgresql://u:p@aws-1-eu-central-1.pooler.supabase.com:6543/postgres', {})).toBe(true);
    expect(transactionPooler('postgresql://u:p@aws-1-eu-central-1.pooler.supabase.com:5432/postgres', {})).toBe(false);
    expect(transactionPooler('postgresql://u:p@db.local:5432/postgres', { CIVICOS_PG_POOLER: 'transaction' })).toBe(true);
    expect(transactionPooler('postgresql://u:p@pooler:6543/postgres', { CIVICOS_PG_POOLER: 'session' })).toBe(false);
    expect(transactionPooler('not a url', {})).toBe(false);
  });
});
