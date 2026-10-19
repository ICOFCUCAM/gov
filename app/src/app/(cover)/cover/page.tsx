import Link from 'next/link';

export const metadata = { title: 'Cover designs' };

const VERSIONS = [
  { href: '/cover/stack', n: 'A', name: 'Stack', tone: 'Dark · teal command palette', d: 'Split layout. An isometric governance stack — Constitution, Institutions, Humans — lights the layer your entry path lands in.' },
  { href: '/cover/boot', n: 'B', name: 'Boot', tone: 'Monochrome · black and white', d: 'The platform starts like an operating system: a kernel log verifies the constitutional root, then resolves into a giant wordmark and a login console.' },
  { href: '/cover/atlas', n: 'C', name: 'Atlas', tone: 'Light · stone and cobalt', d: 'Editorial and calm. A turning globe with federation arcs, sign-in above the fold, and the four principles beneath.' },
  { href: '/cover/doors', n: 'D', name: 'Doors', tone: 'Jewel tones · emerald, sapphire, amethyst', d: 'Three full-height entrances. Choose one and it opens to reveal sign-in while the others fold to spines.' },
  { href: '/cover/plaza', n: 'E', name: 'Plaza', current: true, tone: 'Night · ink, champagne light, polished gold', d: 'The capital at night from above: a polished gold-and-enamel seal at the centre, avenues of light radiating to every edge. Each way in is a road you choose.' },
];

// Comparison index for cover designs under evaluation. `/` serves the current choice.
export default function CoverIndexPage() {
  return (
    <main className="min-h-screen bg-[#0b0d12] px-4 py-12 font-sans text-[#e6e9ef] sm:px-8">
      <div className="mx-auto max-w-[980px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7d8698]">CivicOS · cover designs</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-tight sm:text-[2.6rem]">Choose the front door</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-[#9aa3b4]">
          Five complete cover pages. All share the same entry logic — Government to the Command Center,
          Citizen to the Civic Wallet, New institution to Institutions Admin. Only the design differs.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {VERSIONS.map(v => (
            <li key={v.href}>
              <Link href={v.href} className="group flex h-full flex-col rounded-[14px] border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.04]">
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[12px] text-[#7d8698]">{v.n}</span>
                  {v.current ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-[#9aa3b4]">Live at /</span> : null}
                </span>
                <span className="mt-4 text-[1.4rem] font-semibold tracking-tight">{v.name}</span>
                <span className="mt-1 text-[12.5px] text-[#7d8698]">{v.tone}</span>
                <span className="mt-3 flex-1 text-[14px] leading-relaxed text-[#aab2c0]">{v.d}</span>
                <span className="mt-5 text-[13px] text-white/70 group-hover:text-white">Open {v.name} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
