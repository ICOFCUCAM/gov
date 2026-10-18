import { CommandShell } from '@/components/ui/CommandShell';
import { GLOSSARY } from '@/lib/nav/glossary';

export const metadata = { title: 'Glossary' };

// What the platform's technical words mean (lib/nav/glossary.ts).
export default function GlossaryPage() {
  return (
    <CommandShell active="help">
      <div className="mx-auto max-w-[1000px] text-[14px] text-ink">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-start text-[12px] text-ink-muted">
              <th scope="col" className="py-2 pe-3 text-start font-semibold">On screens</th>
              <th scope="col" className="pe-3 text-start font-semibold">What it means</th>
              <th scope="col" className="text-start font-semibold">Technical term</th>
            </tr>
          </thead>
          <tbody>
            {GLOSSARY.map(g => (
              <tr key={g.term} className="border-b border-line-soft align-top">
                <th scope="row" className="py-2 pe-3 text-start font-semibold">{g.plain}</th>
                <td className="py-2 pe-3 text-ink-soft">{g.meaning}</td>
                <td className="py-2 font-mono text-[12px] text-ink-muted">{g.term}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CommandShell>
  );
}
