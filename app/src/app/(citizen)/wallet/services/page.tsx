import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';

const lifeSituations = [
  { title: 'Having a child', sub: 'birth registration, child grant, vaccinations' },
  { title: 'Going to school', sub: 'enrollment, transfer, feeding' },
  { title: 'Lost a family member', sub: 'death registration, estate, support' },
  { title: 'Starting a business', sub: 'permits, registration, tax' },
  { title: 'Moving house', sub: 'address change, utilities' },
  { title: 'Older adult support', sub: 'pension, healthcare, accommodations' },
];

const ministries = [
  'Health',
  'Education',
  'Social protection',
  'Tax and revenue',
  'Land and property',
  'Justice and legal aid',
];

export default function ServicesPage() {
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Services</strong>
            <span />
          </>
        }
      >
        <div>
          <label htmlFor="q" className="sr-only">Search services</label>
          <input
            id="q"
            type="text"
            placeholder="What do you need?"
            className="w-full min-h-tap p-3 border border-line rounded-sm bg-surface"
          />
        </div>

        <section>
          <h3 className="font-semibold text-lg mb-2">Life situations</h3>
          <div className="grid grid-cols-2 gap-2">
            {lifeSituations.map(s => (
              <Link
                key={s.title}
                href="#"
                className="p-4 border border-line rounded-md bg-surface no-underline text-ink hover:bg-surface-2"
              >
                <strong>{s.title}</strong>
                <div className="text-sm text-ink-muted">{s.sub}</div>
              </Link>
            ))}
          </div>
        </section>

        <hr className="border-line" />

        <section>
          <h3 className="font-semibold text-lg mb-2">By ministry</h3>
          <ul className="space-y-2">
            {ministries.map(m => (
              <li key={m}>
                <Link href="#" className="text-link underline underline-offset-2">
                  {m}
                </Link>
              </li>
            ))}
            <li>
              <Link href="#" className="text-link underline underline-offset-2">
                All ministries (124)
              </Link>
            </li>
          </ul>
        </section>

        <hr className="border-line" />

        <section>
          <h3 className="font-semibold text-lg mb-2">In progress</h3>
          <ul className="space-y-2">
            <li>
              <Link href="#" className="text-link underline underline-offset-2">
                Child grant renewal — under review
              </Link>
            </li>
            <li>
              <Link href="#" className="text-link underline underline-offset-2">
                School transfer — waiting on the new school
              </Link>
            </li>
          </ul>
        </section>
      </PhoneShell>
    </main>
  );
}
