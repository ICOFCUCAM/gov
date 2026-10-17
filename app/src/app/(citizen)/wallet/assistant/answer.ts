// Deterministic, source-grounded civic answers. The assistant finds
// information; it never drafts binding decisions (decision-class A).
// Pure and unit-tested so the routing can't silently regress.
//
// Questions are understood in the nation's language and in English, and
// answered in the nation's language (lib/i18n `assistant`).
import { en, ASSISTANT_TOPICS, type Messages } from '@/lib/i18n/locales/en';

// Case- and accent-insensitive ("école" = "ecole"; Yorùbá tone marks dropped).
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Short Latin keywords must start a word ("id" matches "id card", not "did");
// longer ones and non-Latin scripts (Arabic attaches prefixes such as ال) match anywhere.
function mentions(q: string, keyword: string): boolean {
  const k = fold(keyword);
  if (k.length > 3 || !/^[a-z]+$/.test(k)) return q.includes(k);
  return new RegExp(`(^|[^a-z])${k}`).test(q);
}

export function answer(q: string, m: Messages = en): string {
  const s = fold(q);
  for (const topic of ASSISTANT_TOPICS) {
    const words = m === en ? en.assistant.keywords[topic] : [...m.assistant.keywords[topic], ...en.assistant.keywords[topic]];
    if (words.some(w => mentions(s, w))) return m.assistant.answers[topic];
  }
  return m.assistant.answers.fallback;
}
