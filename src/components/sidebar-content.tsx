"use client";

import { Activity, CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buildWalletHref } from "@/lib/wallet-url";

const navigation = [
  {
    label: "Position Tracker",
    href: "/",
    icon: Activity,
  },
  {
    label: "Portfolio Calendar",
    href: "/portfolio-calendar",
    icon: CalendarDays,
  },
];

export function SidebarContent({
  walletAddress = "",
}: {
  walletAddress?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="flex items-center gap-1">
      {navigation.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={buildWalletHref(item.href, walletAddress)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-white/[0.045] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
              active &&
                "bg-violet-500/12 text-violet-200 ring-1 ring-violet-400/15",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
