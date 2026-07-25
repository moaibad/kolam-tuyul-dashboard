import { Search, ShieldCheck, WalletCards } from "lucide-react";

export function EmptyState() {
  return (
    <section className="relative grid min-h-[440px] place-items-center overflow-hidden rounded-3xl border border-white/[0.055] bg-card/55 px-6 py-16 text-center">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.055] blur-3xl" />
      <div className="relative max-w-md">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-violet-400/15 bg-violet-400/[0.07] text-violet-300 shadow-[0_0_50px_rgba(124,58,237,.12)]">
          <WalletCards className="size-7" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-50">
          Find your liquidity positions
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter any public EVM wallet address to view its Uniswap v3 and v4
          position dashboard.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
            <Search className="size-3" /> Public address only
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
            <ShieldCheck className="size-3" /> No wallet connection
          </span>
        </div>
      </div>
    </section>
  );
}
