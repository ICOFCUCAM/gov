// The public wording of a bill's status and of a vote's result, in the
// visitor's language (siteMessages()); shared by the public bills pages.
import type { siteMessages } from '@/lib/nation/registry';
import type { PublicBill, VoteResult } from './register';

type Site = ReturnType<typeof siteMessages>;

export const billStatus = (t: Site, s: PublicBill['state']): string =>
  s === 'in-progress' ? t.billsStateInProgress : s === 'passed' ? t.billsStatePassed : s === 'assented' ? t.billsStateAssented
    : s === 'assent-withheld' ? t.billsStateWithheld : s === 'published' ? t.billsStatePublished : t.billsStateClosed;

export const voteWording = (t: Site, r: VoteResult): string => (r === 'carried' ? t.billsVoteCarried : r === 'negatived' ? t.billsVoteNegatived : t.billsVoteInquorate);
