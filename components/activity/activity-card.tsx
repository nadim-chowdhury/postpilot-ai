"use client";

import {
  Globe,
  FileText,
  Send,
  AlertTriangle,
  CheckCircle,
  Settings,
  Unplug,
  Pencil,
  Clock,
  XCircle,
  CalendarClock,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityEntry } from "@/actions/activity.actions";
import { Button } from "@/components/ui/button";

const actionIcons: Record<string, { icon: LucideIcon; color: string }> = {
  "page.connected": { icon: Globe, color: "text-emerald-500" },
  "page.disconnected": { icon: Unplug, color: "text-red-400" },
  "page.updated": { icon: Pencil, color: "text-blue-400" },
  "page.paused": { icon: Settings, color: "text-amber-500" },
  "page.resumed": { icon: Globe, color: "text-emerald-500" },
  "post.created": { icon: FileText, color: "text-blue-400" },
  "post.published": { icon: Send, color: "text-emerald-500" },
  "post.failed": { icon: AlertTriangle, color: "text-red-400" },
  "post.deleted": { icon: FileText, color: "text-zinc-400" },
  "schedule.created": { icon: Clock, color: "text-violet-400" },
  "schedule.cancelled": { icon: XCircle, color: "text-amber-500" },
  "schedule.updated": { icon: CalendarClock, color: "text-blue-400" },
};

const defaultAction = { icon: CheckCircle, color: "text-muted-foreground" };

interface ActivityCardProps {
  activity: ActivityEntry;
  onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const { icon: Icon, color } = actionIcons[activity.action] ?? defaultAction;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50 ${color}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {activity.entityType}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground mb-2 leading-relaxed">
        {formatAction(activity.action, activity.metadata)}
      </p>

      {/* Time */}
      <div className="text-[11px] text-muted-foreground/60 mb-3">
        {new Date(activity.createdAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      {/* Action */}
      <div className="mt-auto pt-3 border-t border-border/40">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground hover:bg-accent/80"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatAction(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const name =
    (metadata?.name as string) ?? (metadata?.pageName as string) ?? "";
  switch (action) {
    case "page.connected":
      return `Connected page "${name}"`;
    case "page.disconnected":
      return `Disconnected page "${name}"`;
    case "page.updated":
      return `Updated page "${name}"`;
    case "page.paused":
      return `Paused page "${name}"`;
    case "page.resumed":
      return `Resumed page "${name}"`;
    case "post.created":
      return name ? `Created post for "${name}"` : "Created a new post";
    case "post.published":
      return name ? `Published post to "${name}"` : "Published a post";
    case "post.failed":
      return name ? `Post failed for "${name}"` : "A post failed";
    case "post.deleted":
      return name ? `Deleted post from "${name}"` : "Deleted a post";
    case "schedule.created":
      return name ? `Scheduled post for "${name}"` : "Scheduled a post";
    case "schedule.cancelled":
      return name ? `Cancelled schedule for "${name}"` : "Cancelled a schedule";
    case "schedule.updated":
      return name ? `Updated schedule for "${name}"` : "Updated a schedule";
    default:
      return action.replace(".", " ");
  }
}
