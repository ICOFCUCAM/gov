// The language a nation's release communication is written in: the
// installed nation uses the language chosen in setup (lib/nation/registry);
// other subscribed nations the one recorded at enrolment; English otherwise.
import type { SubscribedNation } from '@/lib/api/types';
import { nationLocale } from '@/lib/nation/registry';

export function nationLanguage(n: Pick<SubscribedNation, 'home' | 'language'>): string {
  return (n.home ? nationLocale() : n.language) || 'en';
}
