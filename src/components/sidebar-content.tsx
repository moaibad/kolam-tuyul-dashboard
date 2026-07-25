import { Activity, Layers3, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SidebarContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-20 items-center border-b border-white/6",
          compact ? "justify-center px-3" : "gap-3 px-5",
        )}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(124,58,237,.3)]">
          <Waves className="size-5" />
        </div>
        {!compact && (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight">KolamTuyul</span>
              <Badge className="border-violet-400/20 bg-violet-400/10 text-[10px] text-violet-200">
                MVP
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">LP intelligence</p>
          </div>
        )}
      </div>

      <nav className={cn("flex-1", compact ? "px-3 py-5" : "px-4 py-5")}>
        {!compact && (
          <p className="mb-3 px-2 text-[10px] font-semibold tracking-[0.18em] text-slate-600 uppercase">
            Workspace
          </p>
        )}
        <div className="relative">
          <div className="absolute inset-y-2 -left-4 w-0.5 rounded-full bg-violet-400" />
          <div
            className={cn(
              "flex items-center rounded-xl bg-violet-500/12 text-violet-100 ring-1 ring-violet-400/15",
              compact ? "size-11 justify-center" : "gap-3 px-3 py-3",
            )}
          >
            <Activity className="size-[18px] text-violet-300" />
            {!compact && (
              <span className="text-sm font-medium">Position Tracker</span>
            )}
          </div>
        </div>
      </nav>

      <div className={cn("border-t border-white/6", compact ? "p-3" : "p-4")}>
        <div
          className={cn(
            "flex items-center rounded-xl bg-white/[0.025] text-slate-400",
            compact ? "size-11 justify-center" : "gap-3 px-3 py-3",
          )}
        >
          <Layers3 className="size-4 text-cyan-300" />
          {!compact && (
            <div>
              <p className="text-xs font-medium text-slate-300">Robinhood Chain</p>
              <p className="mt-0.5 text-[10px] text-slate-600">Mainnet · Read only</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
