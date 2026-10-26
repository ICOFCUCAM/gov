// GET /api/social-protection — the social protection register
// (lib/social/register.ts; plan step I6) for the social protection authority's
// officials, and auditors with a purpose. Without a search: counts (claims by
// programme and state, payments, overpayments, reviews; no person) and the
// programmes with an approved rule in force (`social.<programme>`).
// ?claimant= (register or identity number) or ?claim=: the claimant, household
// versions, claims with every assessment (inputs, means, rule version and
// steps), payment instructions and overpayments; with &reproduce=<n>, the
// recalculation of a claim's assessment n from its recorded inputs and exact
// rule version (acceptance P2-07). A search states its purpose; every search
// and read, allowed or refused, is written to the access log. Changes only
// through decided social protection cases (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadSocial } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { listRules } from '@/lib/law/rules';
import { findSocial, socialCounts, reproduceAssessment, CLAIM_STATE_LABEL } from '@/lib/social/register';
import { SOCIAL_PROCEDURES } from '@/lib/social/procedures';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const claimant = q.get('claimant')?.trim() || undefined, claim = q.get('claim')?.trim() || undefined, purpose = q.get('purpose')?.trim() || undefined;
  const searching = !!claimant || !!claim;
  const authority = authorityFor('socialProtection');
  const s = await caseScope();
  if (s) {
    let why = canReadSocial(s, authority, purpose);
    if (!why && searching && !purpose) why = 'Say why you need this person\'s social protection records (purpose limitation)';
    if (searching || why) recordAccess({ ...accessBy(s), record: { register: 'social-protection', ...(claim ? { id: claim } : claimant ? { id: claimant } : { query: '(counts)' }) }, action: why ? 'refused' : 'view', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const programmes = listRules().filter(r => r.key.startsWith('social.') && r.state === 'approved' && r.effectiveFrom <= today && (!r.effectiveTo || today < r.effectiveTo))
    .map(r => ({ programme: r.key.slice('social.'.length), title: r.title, version: r.version, kind: r.kind, effectiveFrom: r.effectiveFrom }));
  const meta = { authority: authority ? { id: authority, name: getMinistry(authority)?.name ?? authority } : null, programmes, procedures: SOCIAL_PROCEDURES.map(p => ({ key: p.key, title: p.title })), labels: { states: CLAIM_STATE_LABEL } };
  if (!searching) return NextResponse.json({ ...meta, counts: socialCounts(), found: null });
  const found = findSocial({ claimant, claim });
  const n = Number(q.get('reproduce'));
  const reproduced = claim && Number.isInteger(n) && n > 0 ? reproduceAssessment(claim, n) : undefined;
  return NextResponse.json({ ...meta, counts: socialCounts(), found, ...(reproduced ? { reproduced } : {}) });
}
