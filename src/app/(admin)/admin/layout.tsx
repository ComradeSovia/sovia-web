import { logoutAdmin } from "@sovia/admin/actions";
import {
  getAdminAuthStatus,
  isAdminAuthenticated,
} from "@sovia/admin/data/auth";
import { getAdminDatabaseStatus } from "@sovia/admin/data/music-admin";
import { AdminActionHost } from "@sovia/admin/ui/admin-action-host";
import { AdminSidebar } from "@sovia/admin/ui/admin-sidebar";
import { AdminLogin } from "@sovia/admin/ui/login-form";
import { connection } from "next/server";
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
  // Admin pages depend on runtime authentication and database availability.
  await connection();

  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    const authStatus = getAdminAuthStatus();

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-4 py-5">
        {authStatus.enabled ? (
          <AdminLogin mode={authStatus.mode} />
        ) : (
          <p className="py-12 text-sm text-muted-foreground">
            Admin sign-in is currently unavailable.
          </p>
        )}
      </main>
    );
  }

  const databaseStatus = await getAdminDatabaseStatus();

  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
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
              {databaseStatus.ok ? (
                children
              ) : (
                <section aria-live="polite" className="rounded-lg border p-6">
                  <h1 className="text-xl font-semibold">
                    Database unavailable
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Database content and editing are temporarily unavailable.
                    Check the database connection, then reload this page to try
                    again.
                  </p>
                  <p className="mt-3 whitespace-pre-line break-words text-sm text-muted-foreground">
                    {databaseStatus.message}
                  </p>
                </section>
              )}
            </div>
            <AdminActionHost enabled={authenticated && databaseStatus.ok} />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </main>
  );
}
