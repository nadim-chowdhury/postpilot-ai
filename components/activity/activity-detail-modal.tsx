"use client";

import { useState } from "react";
import {
  X,
  Globe,
  FileText,
  Send,
  AlertTriangle,
  Clock,
  XCircle,
  CalendarClock,
  Settings,
  Unplug,
  Pencil,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivityEntry } from "@/actions/activity.actions";

interface ActivityDetailModalProps {
  activity: ActivityEntry | null;
  open: boolean;
  onClose: () => void;
}

const actionIcons: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  "page.connected": {
    icon: Globe,
    color: "text-emerald-500 bg-emerald-500/10",
    label: "Page Connected",
  },
  "page.disconnected": {
    icon: Unplug,
    color: "text-red-400 bg-red-400/10",
    label: "Page Disconnected",
  },
  "page.updated": {
    icon: Pencil,
    color: "text-blue-400 bg-blue-400/10",
    label: "Page Updated",
  },
  "page.paused": {
    icon: Settings,
    color: "text-amber-500 bg-amber-500/10",
    label: "Page Paused",
  },
  "page.resumed": {
    icon: Globe,
    color: "text-emerald-500 bg-emerald-500/10",
    label: "Page Resumed",
  },
  "post.created": {
    icon: FileText,
    color: "text-blue-400 bg-blue-400/10",
    label: "Post Created",
  },
  "post.published": {
    icon: Send,
    color: "text-emerald-500 bg-emerald-500/10",
    label: "Post Published",
  },
  "post.failed": {
    icon: AlertTriangle,
    color: "text-red-400 bg-red-400/10",
    label: "Post Failed",
  },
  "post.deleted": {
    icon: FileText,
    color: "text-zinc-400 bg-zinc-400/10",
    label: "Post Deleted",
  },
  "schedule.created": {
    icon: Clock,
    color: "text-violet-400 bg-violet-400/10",
    label: "Schedule Created",
  },
  "schedule.cancelled": {
    icon: XCircle,
    color: "text-amber-500 bg-amber-500/10",
    label: "Schedule Cancelled",
  },
  "schedule.updated": {
    icon: CalendarClock,
    color: "text-blue-400 bg-blue-400/10",
    label: "Schedule Updated",
  },
};

const defaultAction = {
  icon: CheckCircle,
  color: "text-muted-foreground bg-muted/20",
  label: "System Action",
};

export function ActivityDetailModal({
  activity,
  open,
  onClose,
}: ActivityDetailModalProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!open || !activity) return null;

  const {
    icon: Icon,
    color,
    label,
  } = actionIcons[activity.action] ?? defaultAction;

  // Format action title
  const metadata = activity.metadata || {};
  const name = (metadata.name as string) ?? (metadata.pageName as string) ?? "";
  const postTitle = (metadata.postTitle as string) ?? "";

  const renderDetails = () => {
    switch (activity.action) {
      case "page.connected":
      case "page.disconnected":
      case "page.updated":
      case "page.paused":
      case "page.resumed":
        return (
          <div className="space-y-3">
            <DetailRow label="Page Name" value={name || "N/A"} />
            <DetailRow
              label="Meta Page ID"
              value={activity.entityId}
              copyable
            />
          </div>
        );
      case "post.created":
      case "post.published":
      case "post.failed":
      case "post.deleted":
        return (
          <div className="space-y-3">
            {postTitle && <DetailRow label="Post Title" value={postTitle} />}
            {name && <DetailRow label="Target Page" value={name} />}
            <DetailRow label="Post ID" value={activity.entityId} copyable />
            {!!metadata.fbPostId && (
              <DetailRow
                label="Facebook Post ID"
                value={metadata.fbPostId as string}
                copyable
                link={`https://facebook.com/${metadata.fbPostId}`}
              />
            )}
            {!!metadata.error && (
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 mt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 block mb-1">
                  Error Details
                </span>
                <p className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all">
                  {metadata.error as string}
                </p>
              </div>
            )}
          </div>
        );
      case "schedule.created":
      case "schedule.cancelled":
      case "schedule.updated":
        return (
          <div className="space-y-3">
            {postTitle && <DetailRow label="Post Title" value={postTitle} />}
            {name && <DetailRow label="Target Page" value={name} />}
            <DetailRow label="Schedule ID" value={activity.entityId} copyable />
            {!!metadata.scheduledAt && (
              <DetailRow
                label="Scheduled Time"
                value={new Date(
                  metadata.scheduledAt as string,
                ).toLocaleString()}
              />
            )}
            {!!metadata.error && (
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 mt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400 block mb-1">
                  Error Details
                </span>
                <p className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all">
                  {metadata.error as string}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-3">
            <DetailRow label="Entity ID" value={activity.entityId} copyable />
            <DetailRow label="Entity Type" value={activity.entityType} />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl transition-all flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mt-0.5">
                {activity.entityType} Activity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Action description text */}
          <div className="rounded-lg bg-muted/20 border border-border/20 px-3.5 py-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-brand/70 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">
              {formatActionText(activity.action, activity.metadata)}
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Activity Information
            </h4>
            <div className="divide-y divide-border/20 border border-border/20 rounded-lg overflow-hidden bg-muted/5">
              <DetailRow label="Action Key" value={activity.action} />
              <DetailRow
                label="Timestamp"
                value={new Date(activity.createdAt).toLocaleString()}
              />
              <DetailRow
                label="Category"
                value={activity.entityType}
                className="capitalize"
              />
            </div>
          </div>

          {/* Conditional Metadata Details */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Metadata & Attributes
            </h4>
            <div className="border border-border/20 rounded-lg p-3 bg-muted/5">
              {renderDetails()}
            </div>
          </div>

          {/* Collapsible Raw JSON Data payload */}
          <div className="border border-border/20 rounded-lg bg-muted/5">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              <span>Raw Action Payload</span>
              {showRawJson ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showRawJson && (
              <div className="px-3 pb-3 border-t border-border/20 pt-2 animate-in fade-in duration-200">
                <pre className="text-[10px] font-mono text-muted-foreground bg-background/50 rounded p-2.5 overflow-x-auto max-h-48 border border-border/10">
                  {JSON.stringify(activity, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 p-4 bg-muted/10 flex justify-end shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close Details
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  copyable = false,
  link,
  className = "",
}: {
  label: string;
  value: string;
  copyable?: boolean;
  link?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 text-xs px-1 ${className}`}
    >
      <span className="font-medium text-muted-foreground/80 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline font-mono truncate flex items-center gap-1"
          >
            {value}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <span className="font-mono text-foreground break-all truncate max-w-[200px] sm:max-w-[240px]">
            {value}
          </span>
        )}
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-[10px] font-semibold px-1 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatActionText(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const name =
    (metadata?.name as string) ?? (metadata?.pageName as string) ?? "";
  const postTitle = (metadata?.postTitle as string) ?? "";

  switch (action) {
    case "page.connected":
      return `Page "${name}" was successfully linked to the account.`;
    case "page.disconnected":
      return `Page "${name}" was unlinked and disconnected.`;
    case "page.updated":
      return `Page settings for "${name}" were updated.`;
    case "page.paused":
      return `Autoposting schedule for "${name}" was paused.`;
    case "page.resumed":
      return `Autoposting schedule for "${name}" was resumed.`;
    case "post.created":
      return `A new post draft${name ? ` for page "${name}"` : ""} was created.`;
    case "post.published":
      return `Post${postTitle ? ` "${postTitle}"` : ""} was successfully published to Facebook page "${name}".`;
    case "post.failed":
      return `Failed to publish post${postTitle ? ` "${postTitle}"` : ""} to Facebook page "${name}".`;
    case "post.deleted":
      return `Post${postTitle ? ` "${postTitle}"` : ""} was deleted from the content pool.`;
    case "schedule.created":
      return `Post${postTitle ? ` "${postTitle}"` : ""} was scheduled to be published.`;
    case "schedule.cancelled":
      return `Scheduled queue release for${postTitle ? ` "${postTitle}"` : " post"} was cancelled.`;
    case "schedule.updated":
      return `Scheduled release date for${postTitle ? ` "${postTitle}"` : " post"} was adjusted.`;
    default:
      return action.replace(".", " — ");
  }
}
