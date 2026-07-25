import { Waves } from "lucide-react";
import Link from "next/link";

import { SidebarContent } from "@/components/sidebar-content";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-sidebar/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between gap-4 px-5 sm:px-7 xl:px-10">
          <Link
            href="/"
            aria-label="KolamTuyul home"
            className="flex shrink-0 items-center gap-2.5 text-slate-100"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-violet-500 to-cyan-400 text-white shadow-[0_6px_20px_rgba(124,58,237,.25)]">
              <Waves className="size-[18px]" />
            </span>
            <span className="hidden font-semibold tracking-tight sm:inline">
              KolamTuyul
            </span>
          </Link>

          <SidebarContent />
        </div>
      </header>

      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
