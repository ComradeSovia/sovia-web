import { logoutAdmin } from "@sovia/admin/actions";
import { isAdminAuthenticated } from "@sovia/admin/data/auth";
import { getAdminDatabaseStatus } from "@sovia/admin/data/music-admin";
import { AdminSidebar } from "@sovia/admin/ui/admin-sidebar";
import { Button } from "@sovia/shared/ui/shadcn/button";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 lg:h-screen lg:overflow-hidden">
      <div className="relative grid min-h-screen lg:h-screen lg:grid-cols-[16rem_minmax(0,1fr)]">
        <AdminSidebar databaseStatus={databaseStatus} />

        <div className="min-w-0 lg:h-screen lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>

        {authenticated ? (
          <form action={logoutAdmin} className="fixed bottom-4 left-4 z-50">
            <Button
              className="w-[calc(100vw-2rem)] border-zinc-700 bg-zinc-900 text-zinc-200 shadow-none hover:bg-zinc-800 hover:text-white sm:w-auto lg:w-56"
              size="sm"
              type="submit"
              variant="outline"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
