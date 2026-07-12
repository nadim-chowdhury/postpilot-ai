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

interface ActivityItemProps {
  activity: ActivityEntry;
  onClick?: () => void;
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const { icon: Icon, color } = actionIcons[activity.action] ?? defaultAction;

  const timeAgo = getRelativeTime(activity.createdAt);

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex gap-3 min-w-0 flex-1">
        {/* Icon */}
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/50 ${color}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">
            {formatAction(activity.action, activity.metadata)}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
            <span>{timeAgo}</span>
            <span>•</span>
            <span className="capitalize">{activity.entityType}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClick}
        className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent/80"
        title="View Details"
      >
        <Eye className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}

function formatAction(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const pageName =
    (metadata?.name as string) ?? (metadata?.pageName as string) ?? "";
  const postTitle = (metadata?.postTitle as string) ?? "";
  const postBody = (metadata?.postBody as string) ?? "";
  const platform = (metadata?.platform as string) ?? "";

  const platformLabel =
    platform === "TWITTER"
      ? "Twitter account"
      : platform === "LINKEDIN"
        ? "LinkedIn page"
        : "page";

  const postInfo =
    postTitle && postTitle !== "Untitled"
      ? `"${postTitle}"`
      : postBody
        ? `"${postBody.substring(0, 40)}${postBody.length > 40 ? "..." : ""}"`
        : "";

  const forPageStr = pageName ? ` for "${pageName}"` : "";
  const toPageStr = pageName ? ` to "${pageName}"` : "";
  const onPageStr = pageName ? ` on "${pageName}"` : "";
  const fromPageStr = pageName ? ` from "${pageName}"` : "";

  switch (action) {
    case "page.connected":
      return `Connected ${platformLabel} "${pageName}"`;
    case "page.disconnected":
      return `Disconnected ${platformLabel} "${pageName}"`;
    case "page.updated":
      return `Updated ${platformLabel} "${pageName}"`;
    case "page.paused":
      return `Paused ${platformLabel} "${pageName}"`;
    case "page.resumed":
      return `Resumed ${platformLabel} "${pageName}"`;
    case "post.created":
      return `Created post ${postInfo}${forPageStr}`;
    case "post.published":
      return `Published post ${postInfo}${toPageStr}`;
    case "post.failed":
      return `Post ${postInfo} failed${onPageStr}`;
    case "post.deleted":
      return `Deleted post ${postInfo}${fromPageStr}`;
    case "schedule.created":
      return `Scheduled post ${postInfo}${forPageStr}`;
    case "schedule.cancelled":
      return `Cancelled schedule for post ${postInfo}`;
    case "schedule.updated":
      return `Rescheduled post ${postInfo}${forPageStr}`;
    default:
      return action.replace(".", " — ");
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
