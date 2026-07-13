"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Zap, PanelLeftClose, PanelLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar, setMobileSidebarOpen } from "@/store/slices/ui.slice";
import { navConfig } from "@/config/nav";
import { NavItem } from "./nav-item";
import { UserMenu } from "./user-menu";

export function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const mobileSidebarOpen = useAppSelector((state) => state.ui.mobileSidebarOpen);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    dispatch(setMobileSidebarOpen(false));
  }, [pathname, dispatch]);

  const sidebarContent = (
    <>
      {/* ── Logo ── */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border/50 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-foreground">
              PostPilot
            </span>
          )}
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => dispatch(setMobileSidebarOpen(false))}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navConfig.map((group, i) => (
          <div key={i}>
            {group.label && !collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="mx-auto mb-2 h-px w-6 bg-border/50" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border/50 px-3 py-3">
        <UserMenu collapsed={collapsed} />
      </div>

      {/* ── Collapse Toggle (desktop only) ── */}
      <div className="hidden md:block border-t border-border/50 px-3 py-2">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r border-border/50 bg-card transition-all duration-200",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => dispatch(setMobileSidebarOpen(false))}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-card shadow-2xl md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
