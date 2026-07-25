"use client";

import { Menu } from "lucide-react";

import { SidebarContent } from "@/components/sidebar-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/6 bg-sidebar lg:block">
        <SidebarContent />
      </aside>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] border-r border-white/6 bg-sidebar md:block lg:hidden">
        <SidebarContent compact />
      </aside>

      <div className="w-screen min-w-0 max-w-full md:w-full md:pl-[72px] lg:pl-64">
        <div className="fixed top-4 left-4 z-40 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Open navigation"
                className="border-white/10 bg-[#19162b]/90 text-slate-100 backdrop-blur-xl"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[280px] border-white/8 bg-sidebar p-0"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                KolamTuyul dashboard navigation
              </SheetDescription>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  );
}
