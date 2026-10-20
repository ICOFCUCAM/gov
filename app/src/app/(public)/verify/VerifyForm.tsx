// The code form (server-rendered; a GET to /verify/check redirects to /verify/<code>).

const INK = '#0b1a2c';

export function VerifyForm({ label, button, value }: { label: string; button: string; value?: string }) {
  return (
    <form action="/verify/check" method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label className="block">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{label}</span>
        <input name="code" defaultValue={value} autoComplete="off" spellCheck={false} maxLength={20} required
          className="mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2.5 font-mono text-[16px] uppercase tracking-widest text-slate-900" />
      </label>
      <button type="submit" className="rounded-md px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: INK }}>{button}</button>
    </form>
  );
}
