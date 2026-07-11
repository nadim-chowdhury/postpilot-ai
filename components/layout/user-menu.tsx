"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  collapsed: boolean;
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-2">
        <Spinner size="sm" />
      </div>
    );
  }

  const user = session?.user || {
    name: "Guest User",
    email: "not-signed-in@postpilot.ai",
    image: null as string | null,
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50",
        collapsed && "justify-center px-2",
      )}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || "User Avatar"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email || ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
