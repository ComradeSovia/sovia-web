"use client";

import {
  ArrowLeft,
  BarChart3,
  Eye,
  FileText,
  GitBranch,
  Globe2,
  LayoutDashboard,
  Link2,
  ListMusic,
  ListTodo,
  LogOut,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { deleteMusicWorkAction } from "../actions";
import {
  type AdminEditorStep,
  matchAdminEditorStep,
} from "./admin-editor-steps";
import { AdminConfirmForm } from "./admin-step-panels";

type AdminSidebarProps = {
  authenticated: boolean;
  databaseStatus: {
    ok: boolean;
    message: string;
  };
  logoutAction: () => Promise<void>;
};

type AdminNavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
};

type AdminFlowItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  index: number;
  label: string;
  active: boolean;
};

function AdminNavMenu({ items }: { items: AdminNavItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={item.active}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function AdminFlowMenu({ items }: { items: AdminFlowItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={item.active}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-sidebar-accent text-[0.65rem] text-sidebar-accent-foreground">
                {item.index}
              </span>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AdminSidebar({
  authenticated,
  databaseStatus,
  logoutAction,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStep = matchAdminEditorStep(searchParams.get("step"));
  const isContentEditor =
    pathname === "/admin/content/new" || pathname.startsWith("/admin/content/");
  const contentMatch = /^\/admin\/content\/([^/]+)$/.exec(pathname);
  const contentId =
    contentMatch?.[1] && contentMatch[1] !== "new"
      ? decodeURIComponent(contentMatch[1])
      : undefined;

  const getStepHref = (step: AdminEditorStep) => {
    const params = new URLSearchParams({ step });
    const todoId = searchParams.get("todoId");
    if (todoId) params.set("todoId", todoId);
    return `${pathname}?${params.toString()}`;
  };
  const title = isContentEditor ? "Content editor" : "Sovia Admin";
  const subtitle = isContentEditor ? "Structured record" : "control room";
  const basicItems: AdminFlowItem[] = [
    {
      active: currentStep === "metadata",
      href: getStepHref("metadata"),
      icon: SlidersHorizontal,
      index: 1,
      label: "Metadata",
    },
    {
      active: currentStep === "status",
      href: getStepHref("status"),
      icon: Eye,
      index: 2,
      label: "Status",
    },
    {
      active: currentStep === "from",
      href: getStepHref("from"),
      icon: GitBranch,
      index: 3,
      label: "From",
    },
    {
      active: currentStep === "lyrics",
      href: getStepHref("lyrics"),
      icon: ListMusic,
      index: 4,
      label: "Lyrics",
    },
    {
      active: currentStep === "description",
      href: getStepHref("description"),
      icon: FileText,
      index: 5,
      label: "Description",
    },
  ];
  const additionalItems: AdminFlowItem[] = [
    {
      active: currentStep === "related",
      href: getStepHref("related"),
      icon: Link2,
      index: 6,
      label: "Related",
    },
  ];
  const distributionItems: AdminFlowItem[] = [
    {
      active: currentStep === "youtube",
      href: getStepHref("youtube"),
      icon: Globe2,
      index: 7,
      label: "YouTube",
    },
    {
      active: currentStep === "bilibili",
      href: getStepHref("bilibili"),
      icon: Link2,
      index: 8,
      label: "BiliBili",
    },
    {
      active: currentStep === "vk",
      href: getStepHref("vk"),
      icon: Link2,
      index: 9,
      label: "VK Video",
    },
    {
      active: currentStep === "pixiv",
      href: getStepHref("pixiv"),
      icon: Link2,
      index: 10,
      label: "Pixiv",
    },
  ];
  const subtitleItems: AdminFlowItem[] = [
    {
      active: currentStep === "subtitles",
      href: getStepHref("subtitles"),
      icon: FileText,
      index: 11,
      label: "Subtitles",
    },
  ];
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-start gap-2">
          <SidebarTrigger className="mt-0.5" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-medium">{title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {subtitle}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!isContentEditor ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminNavMenu
                  items={[
                    {
                      active: pathname === "/admin",
                      href: "/admin",
                      icon: LayoutDashboard,
                      label: "Dashboard",
                    },
                    {
                      active: pathname.startsWith("/admin/actions"),
                      href: "/admin/actions",
                      icon: SlidersHorizontal,
                      label: "Actions",
                    },
                  ]}
                />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Content</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminNavMenu
                  items={[
                    {
                      active: pathname.startsWith("/admin/content"),
                      href: "/admin/content",
                      icon: ListMusic,
                      label: "Works",
                    },
                    {
                      active: pathname.startsWith("/admin/todo"),
                      href: "/admin/todo",
                      icon: ListTodo,
                      label: "Todo",
                    },
                    {
                      active: pathname.startsWith("/admin/analytics"),
                      href: "/admin/analytics",
                      icon: BarChart3,
                      label: "Analytics",
                    },
                  ]}
                />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminNavMenu
                  items={[
                    {
                      active: pathname.startsWith("/admin/prompts"),
                      href: "/admin/prompts",
                      icon: Sparkles,
                      label: "Prompts",
                    },
                    {
                      active: pathname.startsWith("/admin/yt-i18n"),
                      href: "/admin/yt-i18n",
                      icon: Globe2,
                      label: "YouTube i18n",
                    },
                  ]}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : isContentEditor ? (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Content">
                      <Link href="/admin/content">
                        <ArrowLeft />
                        <span>Content</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Prompts">
                      <Link href="/admin/prompts">
                        <Sparkles />
                        <span>Prompts</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Basic information</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminFlowMenu items={basicItems} />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Additional information</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminFlowMenu items={additionalItems} />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Distribution</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminFlowMenu items={distributionItems} />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Subtitles</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminFlowMenu items={subtitleItems} />
              </SidebarGroupContent>
            </SidebarGroup>
            {contentId ? (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel className="text-destructive">
                    Danger Zone
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <AdminConfirmForm
                          action={deleteMusicWorkAction}
                          className="w-full"
                          confirmLabel="Delete Content"
                          message={`Delete Content "${contentId}"? This permanently removes the Content record. A linked Todo will return to Proposed.`}
                          title="Delete Content?"
                        >
                          <input
                            name="contentId"
                            type="hidden"
                            value={contentId}
                          />
                          <SidebarMenuButton
                            asChild
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            tooltip="Delete Content"
                          >
                            <button type="submit">
                              <Trash2 />
                              <span>Delete Content</span>
                            </button>
                          </SidebarMenuButton>
                        </AdminConfirmForm>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            ) : null}
          </>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Content</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminNavMenu
                  items={[
                    {
                      active: pathname === "/admin/content",
                      href: "/admin/content",
                      icon: ListMusic,
                      label: "All content",
                    },
                    {
                      active: pathname === "/admin/content/new",
                      href: "/admin/content/new",
                      icon: Plus,
                      label: "Add music",
                    },
                  ]}
                />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Task</SidebarGroupLabel>
              <SidebarGroupContent>
                <AdminNavMenu
                  items={[
                    {
                      active: pathname === "/admin/content",
                      href: "/admin/content",
                      icon: FileText,
                      label: "Manage records",
                    },
                  ]}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        {!isContentEditor ? (
          <div className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <div className="font-medium text-foreground">
              {databaseStatus.ok ? "connection ready" : "connection offline"}
            </div>
            {databaseStatus.ok ? (
              <div className="mt-1 leading-relaxed">Database is reachable.</div>
            ) : (
              <>
                <div className="mt-1 leading-relaxed">
                  Database details are hidden.
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer select-none font-medium text-foreground">
                    Show details
                  </summary>
                  <div className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md border bg-sidebar-accent p-2 text-[0.7rem] leading-relaxed text-sidebar-accent-foreground">
                    {databaseStatus.message}
                  </div>
                </details>
              </>
            )}
          </div>
        ) : null}

        {authenticated ? (
          <form action={logoutAction}>
            <Button
              aria-label="Logout"
              className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0"
              size="sm"
              type="submit"
              variant="outline"
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">
                Logout
              </span>
            </Button>
          </form>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
