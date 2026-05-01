import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-10">
            <SidebarTrigger />
            {title && <h1 className="text-base font-semibold">{title}</h1>}
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
