"use client";

import {
  ArrowLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  ListMusic,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

type AdminSidebarProps = {
  databaseStatus: {
    ok: boolean;
    message: string;
  };
};

type SidebarLinkProps = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
};

function SidebarLink({ href, icon: Icon, label, active }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-zinc-800 text-zinc-50"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function SidebarAnchor({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-zinc-800 text-zinc-50"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
      }`}
    >
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </a>
  );
}

export function AdminSidebar({ databaseStatus }: AdminSidebarProps) {
  const pathname = usePathname();
  const isContentRoute = pathname.startsWith("/admin/content");
  const isContentEditor =
    pathname === "/admin/content/new" ||
    /^\/admin\/content\/[^/]+$/.test(pathname);

  return (
    <aside className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div>
        <div className="text-sm font-semibold text-zinc-300">Sovia Admin</div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-zinc-100">
          {isContentRoute ? "content studio" : "control room"}
        </div>
      </div>

      {!isContentRoute ? (
        <div className="mt-6 space-y-5">
          <div>
            <div className="px-3 text-xs font-medium text-zinc-500">
              Navigation
            </div>
            <nav className="mt-2 space-y-1">
              <SidebarLink
                href="/admin"
                icon={LayoutDashboard}
                label="Dashboard"
                active={pathname === "/admin"}
              />
              <SidebarLink
                href="/admin/content"
                icon={ListMusic}
                label="Content"
                active={pathname.startsWith("/admin/content")}
              />
            </nav>
          </div>
        </div>
      ) : isContentEditor ? (
        <div className="mt-6 space-y-5">
          <div>
            <Link
              href="/admin/content"
              className="flex items-center gap-2 px-3 text-sm font-medium text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Content
            </Link>
          </div>

          <div>
            <div className="px-3 text-xs font-medium text-zinc-500">Editor</div>
            <nav className="mt-2 space-y-1">
              <SidebarAnchor href="#details" label="Details" active />
              <SidebarAnchor href="#metadata" label="Metadata" />
              <SidebarAnchor href="#localization" label="Localization" />
              <SidebarAnchor href="#distribution" label="Distribution" />
              <SidebarAnchor href="#review" label="Review" />
            </nav>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div>
            <div className="px-3 text-xs font-medium text-zinc-500">
              Content
            </div>
            <nav className="mt-2 space-y-1">
              <SidebarLink
                href="/admin/content"
                icon={ListMusic}
                label="All content"
                active={pathname === "/admin/content"}
              />
              <SidebarLink
                href="/admin/content/new"
                icon={Plus}
                label="Add music"
                active={pathname === "/admin/content/new"}
              />
            </nav>
          </div>

          <div>
            <div className="px-3 text-xs font-medium text-zinc-500">Task</div>
            <nav className="mt-2 space-y-1">
              <SidebarLink
                href="/admin/content"
                icon={FileText}
                label="Manage records"
                active={pathname === "/admin/content"}
              />
            </nav>
          </div>
        </div>
      )}

      <div className="mt-auto hidden border-t border-zinc-800 pt-4 text-xs text-zinc-500 lg:block">
        <div className="text-zinc-300">
          {databaseStatus.ok ? "connection ready" : "connection offline"}
        </div>
        <div className="mt-2 normal-case leading-relaxed tracking-normal">
          {databaseStatus.message}
        </div>
      </div>
    </aside>
  );
}
