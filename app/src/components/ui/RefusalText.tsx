// A refusal or error message as text, with the places it names turned into
// links: "Who is responsible" goes to the setting that names the institution,
// so an official who meets the refusal can fix it (or find who can).

import Link from 'next/link';

const PLACES: { phrase: string; href: string }[] = [
  { phrase: 'Who is responsible', href: '/gov/configuration/responsible' },
];

export function RefusalText({ text }: { text: string }) {
  const hit = PLACES.map(p => ({ ...p, at: text.indexOf(p.phrase) })).find(p => p.at >= 0);
  if (!hit) return <>{text}</>;
  return (
    <>
      {text.slice(0, hit.at)}
      <Link href={hit.href} className="underline">{hit.phrase}</Link>
      {text.slice(hit.at + hit.phrase.length)}
    </>
  );
}
