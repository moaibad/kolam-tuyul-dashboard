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
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="size-9 overflow-hidden rounded-xl shadow-[0_6px_18px_rgba(0,0,0,.22)] ring-1 ring-violet-300/20 transition-transform duration-200 group-hover:scale-[1.04]">
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
            <span className="hidden font-semibold tracking-[-0.02em] sm:inline">
              <span className="text-[#f0d5ff]">Kolam</span>
              <span className="text-[#c084fc]">Tuyul</span>
            </span>
          </Link>

          <SidebarContent />
        </div>
      </header>

      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
