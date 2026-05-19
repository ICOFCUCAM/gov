// Deterministic, source-grounded civic answers. The assistant finds
// information; it never drafts binding decisions (decision-class A).
// Pure and unit-tested so the routing can't silently regress.
export function answer(q: string): string {
  const s = q.toLowerCase();
  if (s.includes('school') || s.includes('transfer')) return 'To transfer a child between counties: bring the current enrollment record, apply to the new school (directly or via your wallet), and the Ministry of Education confirms within 10 working days. Use "Start a transfer" below.';
  if (s.includes('permit') || s.includes('business')) return 'Permits are applied for in the wallet. Open Permits → Apply, describe the premises and purpose; most decisions are returned within the statutory window with a tracked reference.';
  if (s.includes('grant') || s.includes('benefit') || s.includes('child')) return 'Child grant eligibility is assessed automatically each cycle. You can see the next payment and contest any decision from its receipt.';
  if (s.includes('tax')) return 'Your tax draft is prepared for review — nothing is filed until you confirm. Open the draft from your wallet receipts.';
  if (s.includes('id') || s.includes('identity') || s.includes('address')) return 'Identity and address changes are handled under Identity. Selective disclosure lets you prove a fact without revealing the underlying record.';
  if (s.includes('appointment') || s.includes('doctor') || s.includes('health') || s.includes('vaccin')) return 'Health appointments and vaccinations are booked from your health portal; your care team is reachable there and replies arrive in your wallet inbox.';
  if (s.includes('document') || s.includes('verify') || s.includes('certificate')) return 'To verify a document, open Verify a document and scan or enter its code — the state confirms authenticity without storing a copy.';
  if (s.includes('complaint') || s.includes('contest') || s.includes('appeal') || s.includes('wrong')) return 'You can contest any decision from its receipt — your payment continues during review and contesting is never penalised. "Talk to a human officer" below logs a tracked request.';
  if (s.includes('pay') || s.includes('bill') || s.includes('fee')) return 'Bills and fees are paid under Payments; every payment produces a signed, permanent receipt you can later verify or contest.';
  return 'I can help you find civic information — schools, permits, grants, tax, identity, health, documents, payments. For a binding decision, use a case panel or talk to a human officer below.';
}
