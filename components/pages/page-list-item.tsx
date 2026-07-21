"use client";

import Link from "next/link";
import { Globe, Pencil, Pause, Play, Unplug, Gamepad2, BarChart3 } from "lucide-react";
import { Twitter, Linkedin } from "@/components/shared/social-icons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PageSummary } from "@/types/page.types";

interface PageListItemProps {
  page: PageSummary;
  onEdit: (page: PageSummary) => void;
  onToggleStatus: (pageId: string) => void;
  onDisconnect: (pageId: string) => void;
}

export function PageListItem({
  page,
  onEdit,
  onToggleStatus,
  onDisconnect,
}: PageListItemProps) {
  const statusVariant = page.status.toLowerCase() as
    | "active"
    | "paused"
    | "disconnected";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-4 py-3.5 transition-all duration-200 hover:border-border hover:shadow-sm">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand overflow-hidden">
          {page.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.avatarUrl}
              alt={page.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : page.platform === "TWITTER" ? (
            <Twitter className="h-4.5 w-4.5 text-sky-500" />
          ) : page.platform === "LINKEDIN" ? (
            <Linkedin className="h-4.5 w-4.5 text-blue-600" />
          ) : (
            <Globe className="h-4.5 w-4.5" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-card border border-border shadow-xs">
          {page.platform === "TWITTER" ? (
            <Twitter className="h-2.5 w-2.5 text-sky-500 fill-sky-500" />
          ) : page.platform === "LINKEDIN" ? (
            <Linkedin className="h-2.5 w-2.5 text-blue-600 fill-blue-600" />
          ) : (
            <Globe className="h-2.5 w-2.5 text-brand" />
          )}
        </div>
      </div>

      {/* Name + Game */}
      <div className="min-w-0 w-44 shrink-0">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {page.name}
        </h3>
        <p className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {page.game ? (
            <span className="inline-flex items-center gap-1">
              <Gamepad2 className="h-3 w-3" />
              {page.game}
            </span>
          ) : page.platform === "TWITTER" ? (
            "Twitter Account"
          ) : page.platform === "LINKEDIN" ? (
            "LinkedIn Channel"
          ) : (
            "Facebook Page"
          )}
        </p>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={statusVariant} />
      </div>

      {/* Topic */}
      <div className="min-w-0 flex-1 hidden md:block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Topic
        </span>
        <p className="text-xs text-foreground truncate">{page.topic}</p>
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <span>
          <strong className="text-foreground">{page.postCount}</strong> posts
        </span>
        <span>
          Last:{" "}
          {page.lastPostedAt
            ? new Date(page.lastPostedAt).toLocaleDateString()
            : "Never"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 ml-auto">
        <Link
          href={`/pages/${page.id}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="View stats"
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </Link>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(page)}
          title="Edit page"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onToggleStatus(page.id)}
          title={page.status === "ACTIVE" ? "Pause" : "Resume"}
        >
          {page.status === "ACTIVE" ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDisconnect(page.id)}
          title="Disconnect"
          className="text-destructive hover:text-destructive"
        >
          <Unplug className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
