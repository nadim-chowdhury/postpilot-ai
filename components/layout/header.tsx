"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { navConfig } from "@/config/nav";
import { useAppDispatch } from "@/store/hooks";
import { setMobileSidebarOpen } from "@/store/slices/ui.slice";

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  // Derive page title from nav config
  const allItems = navConfig.flatMap((g) => g.items);
  const currentItem = allItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
  const pageTitle = currentItem?.label ?? "Dashboard";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card px-4 sm:px-6 backdrop-blur-sm">
      {/* Left: Hamburger + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(setMobileSidebarOpen(true))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={`Switch to ${mounted && theme === "dark" ? "light" : "dark"} mode`}
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
