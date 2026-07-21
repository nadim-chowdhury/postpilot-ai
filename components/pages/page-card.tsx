"use client";

import Link from "next/link";
import { Globe, Pause, Play, Unplug, Pencil, Gamepad2, BarChart3 } from "lucide-react";
import { Twitter, Linkedin } from "@/components/shared/social-icons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PageSummary } from "@/types/page.types";

interface PageCardProps {
  page: PageSummary;
  onEdit: (page: PageSummary) => void;
  onToggleStatus: (pageId: string) => void;
  onDisconnect: (pageId: string) => void;
}

export function PageCard({
  page,
  onEdit,
  onToggleStatus,
  onDisconnect,
}: PageCardProps) {
  const statusVariant = page.status.toLowerCase() as
    | "active"
    | "paused"
    | "disconnected";

  return (
    <div className="group relative flex flex-col h-full rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
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
              <Twitter className="h-5 w-5 text-sky-500" />
            ) : page.platform === "LINKEDIN" ? (
              <Linkedin className="h-5 w-5 text-blue-600" />
            ) : (
              <Globe className="h-5 w-5" />
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

        {/* Info */}
        <div className="min-w-0 flex-1">
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
        <StatusBadge status={statusVariant} />
      </div>

      {/* Niche & Description */}
      <div className="mt-3.5 space-y-2 border-t border-border/40 pt-3.5 flex-1">
        <div>
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
            Target Topic / Niche
          </span>
          <p className="text-xs text-foreground font-medium leading-relaxed max-h-[60px] overflow-y-auto pr-1.5">
            {page.topic}
          </p>
        </div>

        {page.personaPrompt && (
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              AI Persona / Description
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto pr-1.5">
              {page.personaPrompt}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-muted-foreground">
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
      <div className="mt-4 flex items-center gap-1.5 border-t border-border/50 pt-3">
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
