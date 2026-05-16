export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#05070b] text-[#9fb2c4]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#1c2733] border-t-[#37c7d4]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5b6b7d]">
          Establishing secure channel…
        </span>
      </div>
    </div>
  );
}
