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
            className="flex shrink-0 items-center gap-2.5 text-slate-100 transition-colors hover:text-white"
          >
            <span className="size-9 overflow-hidden rounded-xl shadow-[0_6px_18px_rgba(0,0,0,.22)]">
              <picture>
                <source
                  srcSet="/brand/kolam-tuyul-logo.avif"
                  type="image/avif"
                />
                <img
                  src="/brand/kolam-tuyul-logo.png"
                  alt=""
                  width="36"
                  height="36"
                  className="size-9 object-cover"
                />
              </picture>
            </span>
            <span className="hidden text-sm font-semibold tracking-[-0.015em] sm:inline">
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
