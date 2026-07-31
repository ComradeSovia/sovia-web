import { logoutAdmin } from "@sovia/admin/actions";
import { isAdminAuthenticated } from "@sovia/admin/data/auth";
import { getAdminDatabaseStatus } from "@sovia/admin/data/music-admin";
import { AdminActionHost } from "@sovia/admin/ui/admin-action-host";
import { AdminSidebar } from "@sovia/admin/ui/admin-sidebar";
import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [databaseStatus, authenticated] = await Promise.all([
    getAdminDatabaseStatus(),
    isAdminAuthenticated(),
  ]);

  return (
    <main className="dark min-h-screen bg-background font-sans text-foreground">
      <TooltipProvider>
        <SidebarProvider>
          <AdminSidebar
            authenticated={authenticated}
            databaseStatus={databaseStatus}
            logoutAction={logoutAdmin}
          />

          <SidebarInset className="min-w-0 lg:h-screen lg:overflow-y-auto">
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
              <SidebarTrigger />
              <span className="text-sm font-medium">Admin</span>
            </div>
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
              {children}
            </div>
            <AdminActionHost enabled={authenticated} />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </main>
  );
}
