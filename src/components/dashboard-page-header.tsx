import type { ReactNode } from "react";

export function DashboardPageHeader({
  title,
  subtitle,
  titleAccessory,
  actions,
}: {
  title: string;
  subtitle: string;
  titleAccessory?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-white/[0.055] bg-[#11101e]/90">
      <div className="mx-auto flex min-h-20 min-w-0 max-w-[1800px] items-center justify-between gap-4 px-5 sm:px-7 xl:px-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-slate-50">
              {title}
            </h1>
            {titleAccessory}
          </div>
          <p className="mt-1 hidden text-xs text-slate-600 sm:block">
            {subtitle}
          </p>
        </div>
        {actions}
      </div>
    </header>
  );
}
