import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#05070b] px-6 text-[#c5d2df]">
      <div className="w-full max-w-md rounded-[3px] border border-[#1c2733] bg-[#0c0f14] p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#e0b341]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#e0b341]">
            Sector not found
          </span>
        </div>
        <h1 className="mt-3 text-lg font-semibold text-[#e6edf4]">No command surface at this route.</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7d8b9c]">
          The requested sector is not provisioned in this sovereign
          deployment. Return to the command center to navigate.
        </p>
        <Link href="/"
          className="mt-4 inline-block rounded-[3px] border border-[#37c7d4] px-3 py-1.5 text-[12px] font-medium text-[#37c7d4] no-underline transition-colors hover:bg-[#37c7d4]/10">
          Command center →
        </Link>
      </div>
    </div>
  );
}
