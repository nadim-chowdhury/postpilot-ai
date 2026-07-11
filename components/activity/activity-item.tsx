import {
  Globe,
  FileText,
  Send,
  AlertTriangle,
  CheckCircle,
  Settings,
  Unplug,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityEntry } from "@/actions/activity.actions";

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
};

const defaultAction = { icon: CheckCircle, color: "text-muted-foreground" };

interface ActivityItemProps {
  activity: ActivityEntry;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const { icon: Icon, color } = actionIcons[activity.action] ?? defaultAction;

  const timeAgo = getRelativeTime(activity.createdAt);

  return (
    <div className="flex gap-3 py-3">
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
  );
}

function formatAction(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const name = (metadata?.name as string) ?? "";

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
      return `Created a new post${name ? ` for "${name}"` : ""}`;
    case "post.published":
      return `Published a post${name ? ` to "${name}"` : ""}`;
    case "post.failed":
      return `Post failed${name ? ` on "${name}"` : ""}`;
    case "post.deleted":
      return `Deleted a post`;
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
